"use client";

import { Activity, ArrowUp, AudioLines, Check, ChevronDown, Mic, Paperclip, Square } from "lucide-react";
import { PixelLoader } from "./pixel-loader";
import { ChipRow } from "./chip-row";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { modes, type ModeId } from "../lib/drafts";
import { composerPlaceholder } from "../lib/studio";
import { modeCategories } from "../lib/clinical-templates";
import { modelLabel } from "../lib/ui-labels";
import { emptyCaseFields, invalidCaseField, type CaseFieldKey, type CaseFields } from "../lib/aadi/composer";
import { insertSection } from "../lib/soap";
import type { PersonalTemplate } from "../lib/workflow";
import type { Encounter, Settings } from "../lib/workspace";
import { useDictation } from "./use-dictation";
import { CaseGuide } from "./case-guide";

interface Props { prompt: string; onPrompt: (value: string) => void; mode: ModeId; onMode: (mode: ModeId) => void; settings: Settings; onModel: (model: Settings["model"]) => void; context: string; onContext: () => void; onScribe: () => void; encounter?: Pick<Encounter, "messages">; patientName?: string; templates: PersonalTemplate[]; favorites: string[]; templateKey: string | null; onTemplate: (key: string) => void; onSubmit: () => void; busy: boolean; aadiEnabled?: boolean; analysisError?: string; onCancelAnalysis?: () => void; onFallback?: () => void; caseFields?: CaseFields; autoFields?: CaseFieldKey[]; onCaseField?: (key: CaseFieldKey, value: string) => void; patientAge?: string; patientSex?: "M" | "F"; minimumMissing?: string[] }

const modeLabel = (id: ModeId) => modes.find((item) => item.id === id)!.label;

/** The `/` picker's rows for what follows the slash: favourites first when any exist, then every mode (in the order of Chief's template pack), then personal templates. */
function slashGroups(query: string, templates: PersonalTemplate[], favorites: string[]) {
  const needle = query.toLowerCase();
  const all = [
    ...[...new Set(modeCategories.flatMap((group) => group.modes))].map((id) => ({ key: `mode:${id}`, label: modeLabel(id), hint: `/${id}`, search: `${id} ${modeLabel(id)}` })),
    ...templates.map((item) => ({ key: `template:${item.id}`, label: item.name, hint: "", search: item.name })),
  ].filter((option) => option.search.toLowerCase().includes(needle));
  return [
    { label: "Favorit", options: favorites.flatMap((key) => all.filter((option) => option.key === key)) },
    { label: "Mode", options: all.filter((option) => option.key.startsWith("mode:")) },
    { label: "Templat pribadi", options: all.filter((option) => option.key.startsWith("template:")) },
  ].filter((group) => group.options.length);
}

// Age, sex and vitals for an analysis (Gaffer, 2026-10-20): each field is optional; a value read from the text is
// marked, so the doctor checks it before sending, and an unreadable value is flagged and not sent.
const caseFieldInputs: { key: Exclude<CaseFieldKey, "sex">; label: string; hint: string; unit?: string }[] = [
  { key: "age", label: "Usia", hint: "th" },
  { key: "bp", label: "TD", hint: "120/80", unit: "mmHg" },
  { key: "heartRate", label: "Nadi", hint: "x/mnt" },
  { key: "temperature", label: "Suhu", hint: "°C" },
  { key: "respiratoryRate", label: "RR", hint: "x/mnt" },
  { key: "spo2", label: "SpO₂", hint: "%" },
];
function CaseStrip({ fields, auto, onField, patientAge, patientSex }: { fields: CaseFields; auto: CaseFieldKey[]; onField: (key: CaseFieldKey, value: string) => void; patientAge?: string; patientSex?: "M" | "F" }) {
  const read = "Dibaca dari teks · periksa sebelum mengirim";
  const sexLabel = { M: "L", F: "P" } as const;
  const field = (key: CaseFieldKey, label: string, control: ReactNode) => <label key={key} className="case-field" data-auto={auto.includes(key) || undefined} title={auto.includes(key) ? read : undefined}><span>{label}</span>{control}</label>;
  return <div className="case-strip" role="group" aria-label="Usia, jenis kelamin, dan tanda vital">
    {field("sex", "L/P", <select aria-label="Jenis kelamin" value={fields.sex} onChange={(e) => onField("sex", e.target.value)}><option value="">{patientSex ? `${sexLabel[patientSex]} (pasien)` : "—"}</option><option value="M">L</option><option value="F">P</option></select>)}
    {caseFieldInputs.map(({ key, label, hint, unit }) => field(key, label, <input aria-label={unit ? `${label} (${unit})` : label} inputMode={key === "bp" ? "text" : "decimal"} placeholder={key === "age" && patientAge ? patientAge : hint} value={fields[key]} aria-invalid={invalidCaseField(key, fields[key]) || undefined} onChange={(e) => onField(key, e.target.value)}/>))}
  </div>;
}

export function Composer(props: Props) {
  const [slashClosed, setSlashClosed] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const pickerId = useId();
  const command = props.prompt.match(/^\/([^\s]*)$/);
  const groups = command ? slashGroups(command[1], props.templates, props.favorites) : [];
  const options = groups.flatMap((group) => group.options);
  const slashOpen = Boolean(command && !slashClosed);
  const current = props.templateKey ?? `mode:${props.mode}`;
  // Dictation adds each phrase to what is already written; switching mode never clears the text.
  const dictation = useDictation(props.settings.language, (text) => props.onPrompt(`${props.prompt}${props.prompt && !/\s$/.test(props.prompt) ? " " : ""}${text}`));
  function choose(key: string) { if (key.startsWith("mode:")) props.onMode(key.slice(5) as ModeId); else props.onTemplate(key); props.onPrompt(props.prompt.replace(/^\/[^\s]*\s?/, "")); setSlashClosed(true); }
  // The case strip stays out of the composer until a value is read from the text, the minimum data is missing, or the
  // doctor opens it (Gaffer, 2026-10-20: "kamu rusakkan desain kolom text user").
  const [stripOpen, setStripOpen] = useState(false);
  const hasStrip = Boolean(props.aadiEnabled && props.caseFields && props.onCaseField);
  const showStrip = hasStrip && (stripOpen || !!props.autoFields?.length || !!props.minimumMissing?.length || Object.values(props.caseFields ?? {}).some(Boolean));
  // A guide chip or a mode chip changes the text and leaves the caret after it.
  const box = useRef<HTMLTextAreaElement>(null);
  const place = (caret: number) => requestAnimationFrame(() => { box.current?.focus(); box.current?.setSelectionRange(caret, caret); });
  const insert = (skeleton: string) => { const next = insertSection(props.prompt, skeleton); props.onPrompt(next); place(next.length); };
  // A mode chip opens the mode's sentence in the composer and waits; only Enter or the send button ever submits.
  const chip = (id: ModeId) => { const opening = `${modes.find((item) => item.id === id)!.opening}\n`; props.onMode(id); props.onPrompt(opening); place(opening.length); };
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;
    if (slashOpen) {
      if (e.key === "Escape") { e.preventDefault(); setSlashClosed(true); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const next = Math.max(0, Math.min(options.length - 1, slashIndex + (e.key === "ArrowDown" ? 1 : -1))); setSlashIndex(next); document.getElementById(`${pickerId}-${next}`)?.scrollIntoView({ block: "nearest" }); return; }
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (options[slashIndex]) choose(options[slashIndex].key); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (props.prompt.trim()) props.onSubmit(); }
  }

  return <div className="composer-area"><form className={`composer ${props.busy ? "is-busy" : ""}`} aria-busy={props.busy} onSubmit={(event) => { event.preventDefault(); if (slashOpen) { if (options[slashIndex]) choose(options[slashIndex].key); } else props.onSubmit(); }}>
    <textarea ref={box} aria-label="Pertanyaan atau catatan klinis" placeholder={composerPlaceholder(props.mode)} value={props.prompt} onChange={(e) => { props.onPrompt(e.target.value); setSlashClosed(false); setSlashIndex(0); }} aria-controls={slashOpen ? pickerId : undefined} aria-activedescendant={slashOpen && options[slashIndex] ? `${pickerId}-${slashIndex}` : undefined} rows={2} maxLength={30000} onKeyDown={onKeyDown}/>
    {showStrip && props.caseFields && props.onCaseField && <CaseStrip fields={props.caseFields} auto={props.autoFields ?? []} onField={props.onCaseField} patientAge={props.patientAge} patientSex={props.patientSex}/>}
    <CaseGuide prompt={props.prompt} mode={props.mode} fields={props.caseFields ?? emptyCaseFields()} patientAge={props.patientAge} patientSex={props.patientSex} onInsert={insert} onText={(next, caret) => { props.onPrompt(next); if (caret !== undefined) place(caret); }} onMode={props.onMode}/>
    <div className="composer-toolbar"><div className="composer-tools-left">
      <button type="button" className="button primary" onClick={props.onScribe}><AudioLines size={15}/>Mulai Scribe</button>
      <button type="button" className={`button ${props.context ? "has-context" : ""}`} onClick={props.onContext}><Paperclip size={15}/>{props.context ? "Ubah Konteks" : "Tambah Konteks"}</button>
      <span className="context-status" role="status">{dictation.recording ? <span key="listening" className="listening">Mendengarkan…</span> : <span key="summary">{props.patientName ?? "Tanpa pasien"} · {props.context ? "konteks terisi" : "belum ada konteks"}</span>}</span>
    </div><div className="composer-tools-right">
      <div className="model-select"><select aria-label="Format keluaran" value={props.settings.model} onChange={(e) => props.onModel(e.target.value as Settings["model"])}><option value="Standard">{modelLabel("Standard")}</option><option value="Extended">{modelLabel("Extended")}</option></select><ChevronDown size={11}/></div>
      {hasStrip && <button type="button" className="icon-tool" aria-pressed={showStrip} aria-label="Usia dan tanda vital" title="Usia dan tanda vital" onClick={() => setStripOpen(!showStrip)}><Activity size={16}/></button>}
      <button type="button" className="icon-tool mic-button" data-state={dictation.recording ? "listening" : "idle"} aria-pressed={dictation.recording} disabled={dictation.starting} aria-label={dictation.recording ? "Hentikan dikte" : "Dikte ke kolom teks"} title={dictation.recording ? "Mendengarkan · klik untuk berhenti" : "Dikte ke kolom teks (layanan speech browser)"} onClick={dictation.toggle}><Mic size={16}/></button>
      {props.busy && props.aadiEnabled ? <button type="button" className="button square send-button" aria-label="Hentikan analisis" title="Hentikan analisis" onClick={props.onCancelAnalysis}><Square size={13} fill="currentColor"/></button> : <button className="button square send-button" aria-label={props.aadiEnabled ? "Analisis kasus" : "Buat draf"} title={props.aadiEnabled ? "Analisis langsung · Enter" : "Buat draf · Enter"} disabled={!props.prompt.trim() || props.busy}>{props.busy ? <PixelLoader label="Sedang menyusun draf…"/> : <ArrowUp size={18}/>}</button>}
    </div></div>
  </form>
    <ChipRow encounter={props.encounter} mode={props.mode} busy={props.busy} onChip={chip}/>
    {dictation.error &&<div className="composer-analysis"><p className="form-warning" role="alert">{dictation.error}</p></div>}
    {!!props.minimumMissing?.length && <div className="composer-analysis"><p className="form-warning" role="alert">Analisis belum dijalankan. Lengkapi data minimal: {props.minimumMissing.join(", ")}.</p></div>}
    {props.aadiEnabled && props.analysisError && <div className="composer-analysis"><p className="form-warning" role="alert">{props.analysisError} {props.prompt.trim() && !props.busy && <><button type="button" className="text-button" onClick={props.onSubmit}>Coba lagi</button> {props.onFallback && <button type="button" className="text-button" onClick={props.onFallback}>Susun draf SOAP lokal</button>}</>}</p></div>}
    {/* Options are the rows themselves: focus stays in the textarea, which points at the active row. */}
    {slashOpen && <div className="slash-picker" id={pickerId} role="listbox" aria-label="Pilih templat">{groups.map((group, g) => <div key={group.label} role="group" aria-label={group.label}><span className="slash-label" aria-hidden="true">{group.label}</span>{group.options.map((item, i) => { const at = groups.slice(0, g).reduce((n, earlier) => n + earlier.options.length, 0) + i; return <div role="option" aria-selected={slashIndex === at} id={`${pickerId}-${at}`} key={`${group.label}-${item.key}`} onPointerDown={(event) => event.preventDefault()} onClick={() => choose(item.key)}><strong>{item.label}</strong>{item.key === current ? <Check size={14} aria-label="dipakai"/> : item.hint && <span>{item.hint}</span>}</div>; })}</div>)}{!options.length && <p>Tidak ada templat yang cocok.</p>}</div>}
  </div>;
}
