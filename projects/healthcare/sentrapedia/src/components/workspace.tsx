"use client";

import { Check, CircleAlert, X } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore, type ComponentProps, type ReactNode } from "react";
import { createDraft, modes, type ModeId } from "../lib/drafts";
import { initialWorkspace, newEncounter, workspaceReducer, type Encounter, type Message, type Patient } from "../lib/workspace";
import { localDraftMessages, shortcutFor } from "../lib/workspace-session";
import { downloadName, headlineFor } from "../lib/studio";
import { insertTemplate } from "../lib/clinical-templates";
import { reviewedText } from "../lib/normal-exam";
import { compactQuery, mobileQuery } from "../lib/layout";
import { Composer } from "./composer";
import { Dialog } from "./dialog";
import { downloadText } from "./message-card";
import { Sidebar, type DialogName } from "./sidebar";
import { PixelLoader } from "./pixel-loader";
import { DocumentPane, type PaneTools } from "./document-pane";
import { EncounterOverview } from "./encounter-overview";
import { CommandPalette } from "./command-palette";
import { TemplateLibrary } from "./template-library";
import { WorkQueue } from "./work-queue";
import { createPersonalDraft } from "../lib/workflow";
import { KnowledgeDialog } from "./knowledge-dialog";
import { diagnosisContent, aadiMessage, pcareCopies } from "../lib/aadi/presentation";
import { paneDocuments } from "../lib/document-pane";
import type { AadiAnalysis } from "../lib/aadi/contract";
import { caseFieldKeys, composerCase, patientHints, composerUsesAadi, composerAadiMessages, emptyCaseFields, readCaseFields, type CaseFieldKey, type CaseFields } from "../lib/aadi/composer";
import { requestAadiAnalysis } from "../lib/aadi/client";
import { missingMinimum } from "../lib/soap";
import { smooth } from "./smooth";
import { useMediaQuery, useToast, useWorkspacePersistence } from "./workspace-hooks";
import { ChatComposer, Conversation, HomeFooter, HomeView, WorkspaceHeader } from "./workspace-views";
import { WorkspaceDialogs } from "./workspace-forms";
import { workspaceStorageKeys } from "../lib/workspace-storage";

// What Enter will do after a next step: a local draft, or an AADI analysis of the prefilled text.
function stepToast(mode: ModeId): string {
  const label = modes.find((m) => m.id === mode)?.label;
  if (mode === "referral") return "Draf surat rujukan siap di kolom. Lengkapi penerima dan permintaan, lalu tekan Enter.";
  return composerUsesAadi(mode, false) ? `Mode ${label} siap dengan teks kasus. Tekan Enter untuk menjalankan analisis AADI.` : `Mode ${label} siap dengan data kasus. Lengkapi, lalu tekan Enter.`;
}

const visitKey = "sentrapedia-visit";
const noSubscription = () => () => {};
interface PaneState { open: boolean; activeId: string | "overview"; seen: number }
function readVisit(): number { try { return Number(sessionStorage.getItem(visitKey)) || 0; } catch { return 0; } }

export function WorkspaceApp({ principalId, onSignOut, userButton }: { principalId: string; onSignOut?: () => void; userButton?: ReactNode }) {
  return <WorkspaceState key={principalId} principalId={principalId} onSignOut={onSignOut} userButton={userButton}/>;
}

function WorkspaceState({ principalId, onSignOut, userButton }: { principalId: string; onSignOut?: () => void; userButton?: ReactNode }) {
  const storageKeys = workspaceStorageKeys(principalId);
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobile = useMediaQuery(mobileQuery);
  const [focusMode, setFocusMode] = useState(false);
  // The headline rotates once per tab session: read once on the client, counted in an effect; the server shows the first.
  const [seen] = useState<{ visit: number | null }>({ visit: null });
  const visit = useSyncExternalStore(noSubscription, () => seen.visit ??= readVisit(), () => 0);
  useEffect(() => { try { sessionStorage.setItem(visitKey, String(visit + 1)); } catch { /* storage unavailable: the first headline stays */ } }, [visit]);
  const compact = useMediaQuery(compactQuery);
  const navigationOpen = !focusMode && (mobile ? mobileNavOpen : sidebarOpen);
  const toggleNavigation = useCallback(() => { if (mobile) setMobileNavOpen((v) => !v); else smooth(() => setSidebarOpen((v) => !v)); }, [mobile]);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [dialogId, setDialogId] = useState<string | undefined>();
  // The sheet renders only below 1200 px: widening past it must not leave the flag set (shortcuts stay off while a dialog is "open").
  if (!compact && dialog === "document") { setDialog(null); setDialogId(undefined); }
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<ModeId>("question");
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The analysis case strip: values read from the text refill as the text changes, until the doctor edits that field.
  const [caseFields, setCaseFields] = useState<CaseFields>(emptyCaseFields);
  const [manualFields, setManualFields] = useState<CaseFieldKey[]>([]);
  const resetCaseFields = useCallback(() => { setCaseFields(emptyCaseFields()); setManualFields([]); }, []);
  const [analysisError, setAnalysisError] = useState("");
  // Set when an analysis was held back for missing minimum data; the composer then names what is missing.
  const [minimumBlocked, setMinimumBlocked] = useState(false);
  // The question being analysed: shown at once as the user's message, saved only with its answer.
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const pendingText = useRef<string | null>(null);
  const analysisController = useRef<AbortController | null>(null);
  const { toast, toastError, notify, dismiss: dismissToast } = useToast();
  const { storageError, unreadable, setUnreadable, restoring, allowSave } = useWorkspacePersistence(state, dispatch, notify, storageKeys);
  const encounter = state.encounters.find((e) => e.id === state.activeEncounterId);
  const patient = state.patients.find((p) => p.id === encounter?.patientId);
  const hasMessages = Boolean(encounter?.messages.length) || pendingQuestion !== null;
  const context = encounter?.context ?? "";
  const selectedTemplate = state.templates?.find((item) => `template:${item.id}` === templateKey);
  // The document pane, remembered per encounter: it opens on the newest document whenever one arrives (spec 4).
  const [panes, setPanes] = useState(() => new Map<string, PaneState>());
  const documents = paneDocuments(encounter);
  const storedPane = encounter && panes.get(encounter.id);
  // Unsaved edits by message id; a document that arrives while the open one has one gets its tab but not the pane.
  const [drafts, setDrafts] = useState(() => new Map<string, string>());
  const pane: PaneState = storedPane && (documents.length <= storedPane.seen || drafts.has(storedPane.activeId)) ? storedPane : { open: documents.length > 0, activeId: documents.at(-1)?.id ?? "overview", seen: documents.length };
  const split = !compact && pane.open && documents.length > 0;
  const setPane = (change: Partial<Omit<PaneState, "seen">>) => { const id = encounter?.id; if (id) setPanes((map) => new Map(map).set(id, { ...pane, ...change, seen: documents.length })); };
  // Recording the pane with each draft change pins the open document while it is edited.
  const setDraft = (id: string, text: string | null) => { setDrafts((map) => { const next = new Map(map); if (text === null) next.delete(id); else next.set(id, text); return next; }); setPane({}); };
  const cancelAnalysis = useCallback(() => {
    analysisController.current?.abort();
    analysisController.current = null;
    // A cancelled question goes back into the composer, whatever cancelled it.
    if (pendingText.current) setPrompt(pendingText.current);
    pendingText.current = null;
    setBusy(false); setAnalysisError(""); setPendingQuestion(null);
  }, []);
  const changeMode = useCallback((next: ModeId) => { cancelAnalysis(); setMode(next); setTemplateKey(null); }, [cancelAnalysis]);
  function chooseTemplate(key: string) { cancelAnalysis(); if (key.startsWith("mode:")) changeMode(key.slice(5) as ModeId); else { const item = state.templates?.find((t) => `template:${t.id}` === key); if (!item) return; setMode(item.mode); setTemplateKey(key); } closeDialog(); }

  useEffect(() => () => analysisController.current?.abort(), []);
  useEffect(() => { const handler = (e: KeyboardEvent) => { const shortcut = shortcutFor(e, Boolean(dialog) || (mobile && mobileNavOpen)); if (!shortcut) return; e.preventDefault(); if (shortcut === "new") { dispatch({ type: "encounter.select", id: null }); setPrompt(""); changeMode("question"); } else setDialog(shortcut); }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [dialog, mobile, mobileNavOpen, changeMode]);

  // One dialog replacing another cross-fades; a first dialog fades in through CSS.
  function openDialog(name: DialogName, id?: string) { if (analysisController.current) cancelAnalysis(); const open = () => { setDialog(name); setDialogId(id); }; if (dialog) smooth(open); else open(); }
  function hideDialog() { setDialog(null); setDialogId(undefined); }
  function closeDialog() { if (dialog) smooth(hideDialog); else hideDialog(); }
  // Below 1200 px the pane is a sheet; opening it leaves a running analysis alone.
  function openDocument(id?: string) {
    setPane({ open: true, ...(id && { activeId: id }) });
    if (compact) { const open = () => { setDialog("document"); setDialogId(undefined); }; if (dialog) smooth(open); else open(); }
  }
  function selectEncounter(id: string) { dispatch({ type: "encounter.select", id }); setPrompt(""); resetCaseFields(); changeMode("question"); if (mobile) setMobileNavOpen(false); closeDialog(); }
  function startNew(patientId?: string) {
    if (patientId) dispatch({ type: "encounter.add", encounter: newEncounter(patientId) }); else dispatch({ type: "encounter.select", id: null });
    setPrompt(""); resetCaseFields(); changeMode("question"); if (mobile) setMobileNavOpen(false);
  }
  function savePatient(p: Patient) { const exists = state.patients.some((item) => item.id === p.id); dispatch({ type: exists ? "patient.edit" : "patient.add", patient: p }); if (!exists) { dispatch({ type: "encounter.add", encounter: newEncounter(p.id) }); setPrompt(""); } closeDialog(); notify(exists ? "Detail Pasien tersimpan." : "Pasien dibuat. Encounter pertama siap digunakan."); }
  function updatePrompt(value: string) {
    setPrompt(value); setAnalysisError("");
    const found = readCaseFields(value);
    setCaseFields((fields) => { const next = { ...fields }; for (const key of caseFieldKeys) if (!manualFields.includes(key)) next[key] = found[key] ?? ""; return next; });
  }
  // A next step from a draft (design D4's referral letter, generalised by the Puskesmas flow): the composer in that mode
  // with the case filled in; nothing is sent until the doctor presses Enter.
  function startStep(next: ModeId, text: string) {
    changeMode(next); updatePrompt(text);
    requestAnimationFrame(() => { const box = document.querySelector<HTMLTextAreaElement>(".chat-composer textarea"); box?.focus(); box?.setSelectionRange(text.length, text.length); });
    notify(stepToast(next));
  }
  // A failed analysis can still become the local SOAP note (Puskesmas flow, decision 3): offered next to "Coba lagi",
  // never automatic; the draft's source records why AADI did not answer.
  function fallbackDraft() {
    if (!prompt.trim() || busy) return;
    const reason = analysisError; setAnalysisError("");
    generate(prompt, "clinic", false, true, reason);
    // Like an answered analysis, the next case starts with an empty strip.
    resetCaseFields();
    notify("Draf SOAP lokal disusun tanpa analisis AADI. Lengkapi dan verifikasi oleh klinisi.");
  }
  function editCaseField(key: CaseFieldKey, value: string) { setCaseFields((fields) => ({ ...fields, [key]: value })); setManualFields((keys) => keys.includes(key) ? keys : [...keys, key]); }
  async function analyzeMain(text: string, selectedMode: ModeId, current: Encounter) {
    if (analysisController.current) return;
    const controller = new AbortController(); analysisController.current = controller;
    setBusy(true); setAnalysisError(""); setMinimumBlocked(false); pendingText.current = text.trim(); setPendingQuestion(text.trim()); setPrompt("");
    // The home composer gives way to the chat composer; keep typing where the reader is.
    requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(".chat-composer textarea")?.focus());
    try {
      const analysis = await requestAadiAnalysis(composerCase(text, current.context, patient, caseFields), { signal: controller.signal });
      if (controller.signal.aborted || analysisController.current !== controller) return;
      if (!encounter) dispatch({ type: "encounter.add", encounter: { ...current, title: text.trim().slice(0, 48) } });
      dispatch({ type: "message.add", encounterId: current.id, messages: composerAadiMessages(analysis, text, selectedMode, state.reviewDefaults) });
      resetCaseFields();
      dispatch({ type: "encounter.select", id: current.id });
    } catch (error) {
      if (!controller.signal.aborted) { setAnalysisError(error instanceof Error ? error.message : "Analisis belum tersedia. Keluhan tetap tersedia."); setPrompt(text); }
    } finally {
      if (analysisController.current === controller) { analysisController.current = null; setBusy(false); setPendingQuestion(null); pendingText.current = null; }
    }
  }
  function generate(text = prompt, selectedMode = mode, useTemplate = true, local = false, fallback?: string) {
    if (busy || analysisController.current || !text.trim()) return;
    const current: Encounter = encounter ?? newEncounter();
    let content: string;
    const personal = useTemplate && selectedTemplate?.mode === selectedMode ? selectedTemplate : undefined;
    if (!local && composerUsesAadi(selectedMode, !!personal)) {
      if (missingMinimum(text, caseFields, patientHints(patient), selectedMode).length) { setMinimumBlocked(true); return; }
      void analyzeMain(text, selectedMode, current); return;
    }
    try { content = personal ? createPersonalDraft(personal, text, current.context) : createDraft({ mode: selectedMode, prompt: text, context: current.context, ...state.settings, patient, caseFields: readCaseFields(text) }); } catch (error) { notify(error instanceof Error ? error.message : "Draf tidak dapat diformat.", "error"); return; }
    setBusy(true);
    if (!encounter) dispatch({ type: "encounter.add", encounter: { ...current, title: text.trim().slice(0, 48) } });
    const messages = localDraftMessages({ text, content, mode: selectedMode, context: current.context, patient, settings: state.settings, reviewDefaults: state.reviewDefaults, personal, fallback });
    dispatch({ type: "message.add", encounterId: current.id, messages });
    setPrompt(""); setBusy(false);
  }

  function saveAadiAnalysis(analysis: AadiAnalysis) {
    const current = encounter ?? newEncounter();
    if (!encounter) dispatch({ type: "encounter.add", encounter: { ...current, title: `Analisis kasus · ${analysis.case.chiefComplaint.slice(0, 40)}` } });
    dispatch({ type: "message.add", encounterId: current.id, messages: [aadiMessage(analysis, state.reviewDefaults)] });
    changeMode("ddx"); closeDialog(); notify("Analisis ditambahkan sebagai draf untuk ditinjau.");
  }

  const output = (m: Message) => reviewedText(diagnosisContent(m), m.reviewStatus);
  const paneTools: PaneTools = {
    onCopy: async (m) => { try { await navigator.clipboard.writeText(output(m)); notify("Dokumen disalin."); } catch { notify("Clipboard tidak tersedia. Gunakan Edit untuk memilih dan menyalin teks.", "error"); } },
    onDownload: (m) => downloadText(output(m), downloadName(encounter?.title ?? "dokumen", m.createdAt)),
    onPrint: () => window.print(),
    pcare: (m) => pcareCopies(m, output(m)),
  };
  const overviewActions = {
    onContext: () => openDialog("context"),
    onPatient: () => patient ? openDialog("patient", patient.id) : openDialog("encounter", encounter?.id),
    onSelect: (id: string) => { if (id !== encounter?.id) selectEncounter(id); },
    onMakeTasks: (text: string) => generate(text, "tasks", false),
  };
  const paneFor = (onClose: () => void) => encounter && <DocumentPane encounter={encounter} activeId={pane.activeId} onActive={(activeId) => setPane({ activeId })} overview={<EncounterOverview state={state} encounter={encounter} patient={patient} {...overviewActions}/>} tools={paneTools} onClose={onClose} dispatch={dispatch} onToast={notify} drafts={drafts} onDraft={setDraft}/>;
  const composerProps: ComponentProps<typeof Composer> = { prompt, onPrompt: updatePrompt, mode, onMode: changeMode, settings: state.settings, onModel: (model) => dispatch({ type: "settings.save", settings: { ...state.settings, model } }), context, onContext: () => openDialog("context"), onScribe: () => openDialog("scribe"), encounter, patientName: patient?.name, templates: state.templates ?? [], favorites: state.favorites ?? [], templateKey, onTemplate: chooseTemplate, onSubmit: () => generate(), busy, aadiEnabled: composerUsesAadi(mode, !!selectedTemplate), analysisError, onCancelAnalysis: cancelAnalysis, onFallback: fallbackDraft,
    minimumMissing: minimumBlocked && prompt.trim() ? missingMinimum(prompt, caseFields, patientHints(patient), mode) : [],
    caseFields, autoFields: caseFieldKeys.filter((key) => caseFields[key] && !manualFields.includes(key)), onCaseField: editCaseField, ...patientHints(patient) };

  if (restoring) return <main className="system-loading" aria-busy="true"><PixelLoader label="Sedang membuka workspace…"/><p>Membuka workspace…</p></main>;

  return <div className={`app-shell ${sidebarOpen ? "" : "sidebar-collapsed"} ${focusMode ? "focus-mode" : ""}`}>
    {dialog === "knowledge" && <KnowledgeDialog initialTab={dialogId} onClose={closeDialog} onSave={saveAadiAnalysis}/>}
    {dialog === "templates" && <TemplateLibrary state={state} dispatch={dispatch} onChoose={chooseTemplate} onInsert={(next, text) => { chooseTemplate(`mode:${next}`); updatePrompt(insertTemplate(prompt, text)); }} onClose={closeDialog}/>}
    {dialog === "queue" && <WorkQueue state={state} dispatch={dispatch} onClose={closeDialog} onSelect={(id) => { selectEncounter(id); requestAnimationFrame(() => document.querySelectorAll(".assistant-message").item(document.querySelectorAll(".assistant-message").length - 1)?.scrollIntoView({ block: "nearest" })); }}/ >}
    <Sidebar state={state} open={navigationOpen} mobile={mobile} onToggle={toggleNavigation} onDialog={openDialog} onNew={startNew} onSelect={selectEncounter} onToast={notify} onSignOut={onSignOut} userButton={userButton}/>
    <main className={`main-canvas ${hasMessages ? "chat-view" : "home-view"}`} inert={mobile && navigationOpen} aria-hidden={mobile && navigationOpen}>
      {storageError && <div className="storage-warning" role="alert">{storageError}</div>}
      <WorkspaceHeader hasMessages={hasMessages} name={state.settings.name ?? ""} patientName={patient?.name} encounterTitle={encounter?.title} focusMode={focusMode}
        onExpand={() => { const expand = () => { setFocusMode(false); setSidebarOpen(true); setMobileNavOpen(true); }; if (mobile) expand(); else smooth(expand); }}
        onEncounter={() => openDialog("encounter", encounter?.id)}
        onCommands={() => openDialog("commands")}
        onFocus={() => smooth(() => { setMobileNavOpen(false); setFocusMode((value) => !value); })}
        onExport={() => downloadText(encounter?.messages.map((m) => reviewedText(diagnosisContent(m), m.reviewStatus)).join("\n\n---\n\n") ?? "", downloadName(encounter?.title ?? "encounter"))}
        documentCount={documents.length} paneOpen={compact ? dialog === "document" : split} onPane={() => compact ? openDocument() : smooth(() => setPane({ open: !split }))}
        onUpgrade={() => openDialog("upgrade")}/>
      <div className="workspace-body" data-split={split || undefined}>
        {!hasMessages ? <HomeView name={state.settings.name ?? ""} headline={headlineFor(visit)} pill="Layanan primer" composer={composerProps}/> : <>
          <div className="chat-column">
            <Conversation encounter={encounter} pendingQuestion={pendingQuestion} dispatch={dispatch} onToast={notify} onReuse={updatePrompt} onStep={startStep} onCancel={cancelAnalysis} onOpenDocument={openDocument}/>
            <ChatComposer composer={composerProps}/>
          </div>
          {split && paneFor(() => smooth(() => setPane({ open: false })))}
        </>}
      </div>
      {!hasMessages && <HomeFooter onLegal={(label) => { setDialogId(label); setDialog("legal"); }}/>}
    </main>
    {compact && dialog === "document" && <Dialog title="Dokumen encounter" className="document-sheet" onClose={closeDialog}>{paneFor(closeDialog)}</Dialog>}
    {dialog === "commands" && <CommandPalette onKnowledge={(tab) => openDialog("knowledge", tab)} onQueue={() => openDialog("queue")} onTemplates={() => openDialog("templates")} state={state} onClose={closeDialog} onEncounter={selectEncounter} onPatient={(id) => openDialog("patient", id)} onMode={(next) => { changeMode(next); closeDialog(); requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('.composer textarea')?.focus()); }} onNew={() => { startNew(); closeDialog(); }} onFocus={() => smooth(() => { setFocusMode((value) => !value); setMobileNavOpen(false); hideDialog(); })} onContext={() => openDialog("context")}/>}
    {toast && <div className={`toast ${toastError ? "is-error" : ""}`} role={toastError ? "alert" : "status"}>{toastError ? <CircleAlert size={15}/> : <Check size={15}/>}<span>{toast}</span><button aria-label="Tutup notifikasi" onClick={dismissToast}><X size={14}/></button></div>}

    <WorkspaceDialogs storageKeys={storageKeys} onStorageReset={allowSave} dialog={dialog} dialogId={dialogId} state={state} dispatch={dispatch} context={context} encounter={encounter} unreadable={unreadable} onClose={closeDialog} notify={notify} onSavePatient={savePatient} onOpen={openDialog} onSelect={selectEncounter}
      onScribe={(transcript) => { setMode("scribe"); generate(transcript, "scribe", false); closeDialog(); }} onPromptReset={() => setPrompt("")} onUnreadableCleared={() => setUnreadable(null)}/>
  </div>;
}
