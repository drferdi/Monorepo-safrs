"use client";

import { ArrowDownToLine, ArrowRight, Check, ChevronDown, CircleHelp, Menu, Maximize2, Minimize2, PanelRight, Command, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { createDraft, type ModeId } from "../lib/drafts";
import { initialWorkspace, newEncounter, newId, restoreWorkspace, storageKey, workspaceReducer, type Encounter, type Message, type Patient } from "../lib/workspace";
import { intentGroups } from "../lib/studio";
import { Composer } from "./composer";
import { Dialog } from "./dialog";
import { ContextForm, EncounterForm, ListForm, PatientForm, SearchDialog, SettingsForm } from "./forms";
import { downloadText, MessageCard } from "./message-card";
import { Sidebar, type DialogName } from "./sidebar";
import { PixelLoader } from "./pixel-loader";
import { Scribe } from "./scribe";
import { ClinicalPanel } from "./clinical-panel";
import { CommandPalette } from "./command-palette";
import { TemplateLibrary } from "./template-library";
import { WorkQueue } from "./work-queue";
import { createPersonalDraft, freshReview, saveLocalWorkspace } from "../lib/workflow";
import { modes } from "../lib/drafts";
import { KnowledgeDialog } from "./knowledge-dialog";
import { miraMessage } from "../lib/mira/presentation";
import type { MiraAnalysis } from "../lib/mira/contract";
import { composerCase, composerUsesMira, composerMiraMessages } from "../lib/mira/composer";
import { requestMiraAnalysis } from "../lib/mira/client";
import { ThinkingCard } from "./thinking-card";

const subscribeMobile = (callback: () => void) => { const media = window.matchMedia("(max-width: 760px)"); media.addEventListener("change", callback); return () => media.removeEventListener("change", callback); };
const getMobile = () => window.matchMedia("(max-width: 760px)").matches;
const getServerMobile = () => false;
const subscribeCompact = (callback: () => void) => { const media = window.matchMedia("(max-width: 1200px)"); media.addEventListener("change", callback); return () => media.removeEventListener("change", callback); };
const getCompact = () => window.matchMedia("(max-width: 1200px)").matches;

export function WorkspaceApp() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobile = useSyncExternalStore(subscribeMobile, getMobile, getServerMobile);
  const [focusMode, setFocusMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const compact = useSyncExternalStore(subscribeCompact, getCompact, getServerMobile);
  const navigationOpen = !focusMode && (mobile ? mobileNavOpen : sidebarOpen);
  const toggleNavigation = useCallback(() => { if (mobile) setMobileNavOpen((v) => !v); else setSidebarOpen((v) => !v); }, [mobile]);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [dialogId, setDialogId] = useState<string | undefined>();
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<ModeId>("question");
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  // The question being analysed: shown at once as the user's message, saved only with its answer.
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const pendingText = useRef<string | null>(null);
  const analysisController = useRef<AbortController | null>(null);
  const [storageError, setStorageError] = useState("");
  const [restoring, setRestoring] = useState(true);
  const [toast, setToast] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const hydrated = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const conversationInner = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const encounter = state.encounters.find((e) => e.id === state.activeEncounterId);
  const patient = state.patients.find((p) => p.id === encounter?.patientId);
  const hasMessages = Boolean(encounter?.messages.length) || pendingQuestion !== null;
  const context = encounter?.context ?? "";
  const intent = intentGroups.find((item) => item.modes.includes(mode))!;
  const editedEncounter = state.encounters.find((e) => e.id === dialogId);
  const selectedTemplate = state.templates?.find((item) => `template:${item.id}` === templateKey);
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
  const templateControls = <div className="template-shortcuts"><button className="text-button" onClick={() => openDialog("knowledge")}>Referensi penyakit</button><button className="text-button" onClick={() => { changeMode("question"); requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(".composer textarea")?.focus()); }}>Analisis kasus</button><button className="text-button" onClick={() => openDialog("templates")}>Templat dan favorit</button><button className="text-button" aria-pressed={state.favorites?.includes(selectedTemplate ? `template:${selectedTemplate.id}` : `mode:${mode}`) ?? false} onClick={() => dispatch({ type: "favorite.toggle", key: selectedTemplate ? `template:${selectedTemplate.id}` : `mode:${mode}` })}>☆ Favoritkan pilihan</button>{selectedTemplate && <span className="selected-template">{selectedTemplate.name}<button aria-label="Lepas templat pribadi" onClick={() => setTemplateKey(null)}>×</button></span>}{state.favorites?.slice(0, 4).map((key) => { const name = key.startsWith("mode:") ? modes.find((item) => `mode:${item.id}` === key)?.label : state.templates?.find((item) => `template:${item.id}` === key)?.name; return name ? <button key={key} className="action-chip" onClick={() => chooseTemplate(key)}>★ {name}</button> : null; })}</div>;

  const notify = useCallback((text: string) => { if (toastTimer.current) clearTimeout(toastTimer.current); setToast(text); toastTimer.current = setTimeout(() => setToast(""), 4500); }, []);
  useEffect(() => { try { dispatch({ type: "restore", state: restoreWorkspace(localStorage.getItem(storageKey)) }); } catch { queueMicrotask(() => notify("Penyimpanan browser tidak tersedia. Perubahan hanya bertahan selama sesi ini.")); } finally { queueMicrotask(() => setRestoring(false)); } }, [notify]);
  useEffect(() => { if (!hydrated.current) { hydrated.current = true; return; } const error = saveLocalWorkspace(state, (raw) => localStorage.setItem(storageKey, raw)); queueMicrotask(() => { setStorageError(error ?? ""); if (error) notify(error); }); }, [state, notify]);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  useEffect(() => () => analysisController.current?.abort(), []);
  useEffect(() => { stickToBottom.current = true; end.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" }); }, [encounter?.messages.length, pendingQuestion]);
  // Like a chat: a growing answer keeps the view at the bottom unless the reader has scrolled up.
  useEffect(() => {
    const inner = conversationInner.current, box = conversation.current;
    if (!inner || !box) return;
    const observer = new ResizeObserver(() => { if (stickToBottom.current) box.scrollTop = box.scrollHeight; });
    observer.observe(inner);
    return () => observer.disconnect();
  }, [hasMessages]);
  useEffect(() => { const handler = (e: KeyboardEvent) => { if (dialog || (mobile && mobileNavOpen)) return; if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") { e.preventDefault(); setDialog("commands"); } if ((e.metaKey || e.ctrlKey) && e.key === "/") { e.preventDefault(); setDialog("search"); } if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); dispatch({ type: "encounter.select", id: null }); setPrompt(""); changeMode("question"); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); }, [dialog, mobile, mobileNavOpen, changeMode]);

  function openDialog(name: DialogName, id?: string) { if (analysisController.current) cancelAnalysis(); setDialog(name); setDialogId(id); }
  function closeDialog() { setDialog(null); setDialogId(undefined); setConfirmClear(false); }
  function selectEncounter(id: string) { dispatch({ type: "encounter.select", id }); setPrompt(""); changeMode("question"); if (mobile) setMobileNavOpen(false); closeDialog(); }
  function startNew(patientId?: string) {
    if (patientId) dispatch({ type: "encounter.add", encounter: newEncounter(patientId) }); else dispatch({ type: "encounter.select", id: null });
    setPrompt(""); changeMode("question"); if (mobile) setMobileNavOpen(false);
  }
  function savePatient(p: Patient) { const exists = state.patients.some((item) => item.id === p.id); dispatch({ type: exists ? "patient.edit" : "patient.add", patient: p }); if (!exists) { dispatch({ type: "encounter.add", encounter: newEncounter(p.id) }); setPrompt(""); } closeDialog(); notify(exists ? "Detail Patient tersimpan." : "Patient dibuat. Encounter pertama siap digunakan."); }
  function updatePrompt(value: string) { setPrompt(value); setAnalysisError(""); }
  async function analyzeMain(text: string, selectedMode: ModeId, current: Encounter) {
    if (analysisController.current) return;
    const controller = new AbortController(); analysisController.current = controller;
    setBusy(true); setAnalysisError(""); pendingText.current = text.trim(); setPendingQuestion(text.trim()); setPrompt("");
    // The home composer gives way to the chat composer; keep typing where the reader is.
    requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(".chat-composer textarea")?.focus());
    try {
      const analysis = await requestMiraAnalysis(composerCase(text, current.context, patient), { synthetic: true, signal: controller.signal });
      if (controller.signal.aborted || analysisController.current !== controller) return;
      if (!encounter) dispatch({ type: "encounter.add", encounter: { ...current, title: text.trim().slice(0, 48) } });
      dispatch({ type: "message.add", encounterId: current.id, messages: composerMiraMessages(analysis, text, selectedMode, state.reviewDefaults) });
      dispatch({ type: "encounter.select", id: current.id });
    } catch (error) {
      if (!controller.signal.aborted) { setAnalysisError(error instanceof Error ? error.message : "Analisis belum tersedia. Keluhan tetap tersedia."); setPrompt(text); }
    } finally {
      if (analysisController.current === controller) { analysisController.current = null; setBusy(false); setPendingQuestion(null); pendingText.current = null; }
    }
  }
  function generate(text = prompt, selectedMode = mode, useTemplate = true) {
    if (busy || analysisController.current || !text.trim()) return;
    const current: Encounter = encounter ?? newEncounter();
    let content: string;
    const personal = useTemplate && selectedTemplate?.mode === selectedMode ? selectedTemplate : undefined;
    if (composerUsesMira(selectedMode, !!personal)) { void analyzeMain(text, selectedMode, current); return; }
    try { content = personal ? createPersonalDraft(personal, text, current.context) : createDraft({ mode: selectedMode, prompt: text, context: current.context, ...state.settings, patient }); } catch (error) { notify(error instanceof Error ? error.message : "Draf tidak dapat diformat."); return; }
    setBusy(true);
    if (!encounter) dispatch({ type: "encounter.add", encounter: { ...current, title: text.trim().slice(0, 48) } });
    const messages: Message[] = [{ id: newId(), role: "user", content: text.trim(), mode: selectedMode, createdAt: new Date().toISOString() }, { id: newId(), role: "assistant", content, originalContent: content, reviewStatus: "draft", reviewItems: freshReview(state.reviewDefaults), ...(personal ? { templateSnapshot: { ...personal, sections: [...personal.sections] } } : {}), sourceText: [`Input\n${text}`, personal && `Templat saat dibuat\n${JSON.stringify(personal, null, 2)}`, current.context && `Konteks Encounter\n${current.context}`, patient && `Patient\n${patient.name}\n${patient.age}\n${patient.sex}\nCatatan Patient\n${patient.notes}`, `Preferensi format\n${state.settings.specialty} · ${state.settings.model} · ${state.settings.language}\n${state.settings.instructions}`].filter(Boolean).join("\n\n"), mode: selectedMode, createdAt: new Date().toISOString() }];
    dispatch({ type: "message.add", encounterId: current.id, messages });
    setPrompt(""); setBusy(false);
  }

  function saveMiraAnalysis(analysis: MiraAnalysis) {
    const current = encounter ?? newEncounter();
    if (!encounter) dispatch({ type: "encounter.add", encounter: { ...current, title: `Analisis kasus · ${analysis.case.chiefComplaint.slice(0, 40)}` } });
    dispatch({ type: "message.add", encounterId: current.id, messages: [miraMessage(analysis, state.reviewDefaults)] });
    changeMode("ddx"); closeDialog(); notify("Analisis ditambahkan sebagai draf untuk ditinjau.");
  }

  if (restoring) return <main className="system-loading" aria-busy="true"><PixelLoader label="Sedang membuka workspace…"/><p>Membuka workspace…</p></main>;

  return <div className={`app-shell ${sidebarOpen ? "" : "sidebar-collapsed"} ${focusMode ? "focus-mode" : ""}`}>
    {dialog === "knowledge" && <KnowledgeDialog initialTab={dialogId} onClose={closeDialog} onSave={saveMiraAnalysis}/>}
    {dialog === "templates" && <TemplateLibrary state={state} dispatch={dispatch} onChoose={chooseTemplate} onClose={closeDialog}/>}
    {dialog === "queue" && <WorkQueue state={state} dispatch={dispatch} onClose={closeDialog} onSelect={(id) => { selectEncounter(id); requestAnimationFrame(() => document.querySelectorAll(".assistant-message").item(document.querySelectorAll(".assistant-message").length - 1)?.scrollIntoView({ block: "nearest" })); }}/ >}
    <Sidebar state={state} open={navigationOpen} mobile={mobile} onToggle={toggleNavigation} onDialog={openDialog} onNew={startNew} onSelect={selectEncounter} onToast={notify}/>
    <main className={`main-canvas ${hasMessages ? "chat-view" : "home-view"}`} inert={mobile && navigationOpen} aria-hidden={mobile && navigationOpen}>
      {storageError && <div className="storage-warning" role="alert">{storageError}</div>}
      <header className="canvas-header"><div className="header-left"><button className="icon-button expand-sidebar" aria-label="Buka navigasi" onClick={() => { setFocusMode(false); setSidebarOpen(true); setMobileNavOpen(true); }}><Menu size={19}/></button>{hasMessages && <><span className="header-patient">{patient?.name ?? "Workspace Clinical"}</span><span className="header-divider">/</span><button className="encounter-title" onClick={() => openDialog("encounter", encounter?.id)}><span>{encounter?.title}</span><ChevronDown size={12}/></button></>}</div><div className="header-right"><button className="icon-button" aria-label="Buka Command Center" title="Command Center · Ctrl / ⌘ J" onClick={() => openDialog("commands")}><Command size={16}/></button><button className="icon-button" aria-label={focusMode ? "Keluar Focus Mode" : "Aktifkan Focus Mode"} aria-pressed={focusMode} title="Focus Mode" onClick={() => { setMobileNavOpen(false); setFocusMode((value) => !value); }}>{focusMode ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}</button><button className="icon-button" aria-label="Konteks dan Timeline" title="Konteks dan Timeline" aria-pressed={!focusMode && !compact && panelOpen} onClick={() => { if (compact || focusMode) openDialog("clinical"); else setPanelOpen((value) => !value); }}><PanelRight size={17}/></button>{hasMessages && <button className="button export-encounter" onClick={() => downloadText(encounter?.messages.map((m) => m.content).join("\n\n---\n\n") ?? "", "encounter.md")}><ArrowDownToLine size={14}/> Ekspor</button>}<button className="upgrade-button" onClick={() => openDialog("upgrade")}><Sparkles size={15} fill="currentColor"/>Berlangganan</button></div></header>
      <div className="workspace-body">
        {!hasMessages ? <div className="home-content"><div className="home-heading-row"><div className="workspace-eyebrow"><span className="local-dot"/> RUANG KERJA KLINIS</div></div><div className="home-headline" aria-live="polite" aria-atomic="true"><div key={intent.id} className="headline-transition"><h1>{intent.headline}</h1><p>{intent.description}</p></div></div><Composer templateControls={templateControls} prompt={prompt} onPrompt={updatePrompt} mode={mode} onMode={changeMode} settings={state.settings} onModel={(model) => dispatch({ type: "settings.save", settings: { ...state.settings, model } })} context={context} onContext={() => openDialog("context")} onSettings={() => openDialog("settings")} onScribe={() => openDialog("scribe")} onSubmit={() => generate()} busy={busy} miraEnabled={composerUsesMira(mode, !!selectedTemplate)} analysisError={analysisError} onCancelAnalysis={cancelAnalysis}/></div> : <>
          <div className="conversation" ref={conversation} onScroll={(event) => { const box = event.currentTarget; stickToBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80; }} aria-label="Percakapan Encounter"><div className="conversation-inner" ref={conversationInner}>{encounter?.messages.map((message) => <MessageCard encounterId={encounter.id} dispatch={dispatch} key={message.id} message={message} onEdit={(content) => dispatch({ type: "message.edit", encounterId: encounter.id, messageId: message.id, content })} onToast={notify} onReuse={updatePrompt} onReview={(status) => dispatch({ type: "message.review", encounterId: encounter.id, messageId: message.id, status })}/>)}{pendingQuestion !== null && <><div className="user-message"><div>{pendingQuestion}</div></div><ThinkingCard onCancel={cancelAnalysis}/></>}<div ref={end}/></div></div>
          <div className="chat-composer"><Composer templateControls={templateControls} prompt={prompt} onPrompt={updatePrompt} mode={mode} onMode={changeMode} settings={state.settings} onModel={(model) => dispatch({ type: "settings.save", settings: { ...state.settings, model } })} context={context} onContext={() => openDialog("context")} onSettings={() => openDialog("settings")} onScribe={() => openDialog("scribe")} onSubmit={() => generate()} busy={busy} miraEnabled={composerUsesMira(mode, !!selectedTemplate)} analysisError={analysisError} onCancelAnalysis={cancelAnalysis}/><p className="composer-hint">{composerUsesMira(mode, !!selectedTemplate) ? "" : "Format lokal, siap untuk ditinjau. "}<button onClick={() => openDialog("account")}>Tentang workspace ini</button></p></div>
        </>}
      </div>
      {!hasMessages && <div className="home-bottom"><footer className="site-footer"><span>Sentrapedia · workspace Clinical 0.1</span><div>{["Ketentuan layanan", "Kebijakan privasi", "Perjanjian kerja sama", "Keselamatan", "Preferensi cookie"].map((label) => <button key={label} onClick={() => { setDialogId(label); setDialog("legal"); }}>{label}</button>)}</div></footer></div>}
    </main>
    {!compact && panelOpen && !focusMode && <aside className="clinical-panel"><ClinicalPanel state={state} encounter={encounter} patient={patient} onSelect={selectEncounter} onContext={() => openDialog("context")} onPatient={() => openDialog("patient", patient?.id)} onClose={() => setPanelOpen(false)}/></aside>}
    {dialog === "clinical" && <Dialog title="Clinical Cockpit" onClose={closeDialog}><ClinicalPanel state={state} encounter={encounter} patient={patient} onSelect={selectEncounter} onContext={() => openDialog("context")} onPatient={() => openDialog("patient", patient?.id)}/></Dialog>}
    {dialog === "commands" && <CommandPalette onKnowledge={(tab) => openDialog("knowledge", tab)} onQueue={() => openDialog("queue")} onTemplates={() => openDialog("templates")} state={state} onClose={closeDialog} onEncounter={selectEncounter} onPatient={(id) => openDialog("patient", id)} onMode={(next) => { changeMode(next); closeDialog(); requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('.composer textarea')?.focus()); }} onNew={() => { startNew(); closeDialog(); }} onFocus={() => { setFocusMode((value) => !value); setMobileNavOpen(false); closeDialog(); }} onContext={() => openDialog("context")}/>}
    {toast && <div className="toast" role="status"><Check size={15}/><span>{toast}</span><button aria-label="Tutup notifikasi" onClick={() => setToast("")}><X size={14}/></button></div>}

    {dialog === "patient" && <PatientForm key={dialogId ?? "new"} patient={state.patients.find((p) => p.id === dialogId)} onSave={savePatient} onDelete={(id) => { dispatch({ type: "patient.delete", id }); closeDialog(); notify("Patient lokal dan Encounter terkait dihapus."); }} onClose={closeDialog}/>}
    {dialog === "list" && <ListForm key={dialogId ?? "new"} list={state.lists.find((l) => l.id === dialogId)} state={state} dispatch={dispatch} onClose={closeDialog}/>}
    {dialog === "settings" && <SettingsForm settings={state.settings} onSave={(settings) => { dispatch({ type: "settings.save", settings }); closeDialog(); notify("Preferensi Agent tersimpan."); }} onClose={closeDialog}/>}
    {dialog === "search" && <SearchDialog state={state} onSelect={selectEncounter} onPatient={(id) => openDialog("patient", id)} onClose={closeDialog}/>}
    {dialog === "context" && <ContextForm context={context} onSave={(text) => { if (encounter) dispatch({ type: "encounter.update", id: encounter.id, updates: { context: text } }); else if (text.trim()) dispatch({ type: "encounter.add", encounter: { ...newEncounter(), context: text } }); closeDialog(); notify(text ? "Konteks ditambahkan ke Encounter ini." : "Konteks Encounter dikosongkan."); }} onClose={closeDialog}/>}
    {dialog === "scribe" && <Scribe language={state.settings.language} onClose={closeDialog} onGenerate={(transcript) => { setMode("scribe"); generate(transcript, "scribe", false); closeDialog(); }}/ >}
    {dialog === "encounter" && editedEncounter && <EncounterForm key={editedEncounter.id} encounter={editedEncounter} patients={state.patients} onSave={(updates) => { dispatch({ type: "encounter.update", id: editedEncounter.id, updates }); closeDialog(); notify("Detail Encounter tersimpan."); }} onDelete={() => { dispatch({ type: "encounter.delete", id: editedEncounter.id }); closeDialog(); notify("Encounter lokal dihapus."); }} onClose={closeDialog}/>}
    {dialog === "upgrade" && <Dialog title="Ruang untuk pemikiran Clinical" subtitle="Workspace lokal mencakup seluruh alur pembuatan draf." onClose={closeDialog}><div className="plan-card"><div><span className="plan-label">WORKSPACE ANDA</span><h3>Sentrapedia Lite <span>Lokal</span></h3><p>Patient, Encounter, dan draf dokumen lokal tanpa batas.</p></div><ul>{["14 template Clinical dan administrasi", "Draf yang dapat diedit, checklist, dan ekspor Markdown", "Berkas konteks dan Scribing berbasis transkrip", "Preferensi Specialty dan format"].map((item) => <li key={item}><Check size={15}/>{item}</li>)}</ul></div><div className="notice"><CircleHelp size={17}/><span>Referensi penyakit tersedia secara lokal. Analisis kasus memerlukan koneksi layanan. Sinkronisasi, kutipan PNPK dan langganan belum tersedia. Tidak ada pembayaran di sini.</span></div><div className="dialog-footer"><button className="button primary" onClick={closeDialog}>Lanjutkan dengan workspace lokal <ArrowRight size={15}/></button></div></Dialog>}
    {dialog === "account" && <Dialog title="Workspace Clinical Anda" subtitle="Sentrapedia · workspace Clinical" onClose={closeDialog}><div className="account-profile"><span className="avatar large">FI</span><div><strong>Workspace Sentrapedia</strong><p>Sesi lokal · Lite</p></div></div><div className="notice"><ShieldCheck size={18}/><span>Browser menyimpan workspace di perangkat ini tanpa enkripsi atau sinkronisasi antarperangkat. Gunakan data fiktif saja.</span></div><dl className="workspace-stats"><div><dt>Patient</dt><dd>{state.patients.length}</dd></div><div><dt>Encounter</dt><dd>{state.encounters.length}</dd></div><div><dt>Daftar Patient</dt><dd>{state.lists.length}</dd></div></dl><div className="integration-note"><strong>Koneksi backend</strong><p>Referensi penyakit tersedia; analisis kasus menggunakan layanan lokal yang dikonfigurasi. Kutipan pedoman, penyimpanan Patient aman, authentication, transkripsi audio cloud, integrasi EHR, dan billing belum terhubung.</p></div>{confirmClear ? <div className="form-warning"><p>Hapus semua Patient, Encounter, daftar, dan draf lokal? Ekspor draf yang ingin disimpan terlebih dahulu.</p><button className="button danger" onClick={() => { dispatch({ type: "clear" }); setPrompt(""); closeDialog(); notify("Workspace lokal dikosongkan."); }}>Hapus semua data lokal</button></div> : <div className="dialog-footer"><button className="button danger-ghost push-left" onClick={() => setConfirmClear(true)}><Trash2 size={14}/> Hapus data lokal</button><button className="button" onClick={() => downloadText(JSON.stringify(state, null, 2), "workspace-backup.json")}><ArrowDownToLine size={14}/> Ekspor backup</button></div>}</Dialog>}
    {dialog === "legal" && <Dialog title={dialogId ?? "Informasi workspace"} subtitle="Workspace pengembangan lokal" onClose={closeDialog}><div className="legal-content"><ShieldCheck size={28}/><h3>Dibangun untuk menjelajahi alur kerja Anda.</h3><p>Sentrapedia adalah workspace mandiri untuk pengembangan. Layanan Clinical, langganan, dan perjanjian layanan produksi belum tersedia.</p><p>Data Patient dan Encounter disimpan dalam local storage browser ini. Tidak ada analytics atau cookie iklan. Pengenalan suara dapat memakai layanan speech penyedia browser saat diaktifkan.</p><p>Gunakan informasi fiktif saja. Draf lokal mempertahankan teks yang diberikan; tinjauan Clinician dan integrasi AI/Evidence diperlukan untuk penggunaan Clinical.</p></div><div className="dialog-footer"><button className="button primary" onClick={closeDialog}>Mengerti</button></div></Dialog>}
  </div>;
}
