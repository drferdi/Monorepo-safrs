"use client";

import { ArrowUp, ChevronDown, Mic, Paperclip, Square } from "lucide-react";
import { PixelLoader } from "./pixel-loader";
import { useId, useState } from "react";
import { modes, type ModeId } from "../lib/drafts";
import { composerPlaceholder, intentGroups } from "../lib/studio";
import { modelLabel } from "../lib/ui-labels";
import type { PersonalTemplate } from "../lib/workflow";
import type { Settings } from "../lib/workspace";
import { useDictation } from "./use-dictation";

interface Props { prompt: string; onPrompt: (value: string) => void; mode: ModeId; onMode: (mode: ModeId) => void; settings: Settings; onModel: (model: Settings["model"]) => void; context: string; onContext: () => void; patientName?: string; templates: PersonalTemplate[]; favorites: string[]; templateKey: string | null; onTemplate: (key: string) => void; onSubmit: () => void; busy: boolean; miraEnabled?: boolean; analysisError?: string; onCancelAnalysis?: () => void }

export function IntentTabs({ mode, onMode }: { mode: ModeId; onMode: (mode: ModeId) => void }) {
  const group = intentGroups.find((item) => item.modes.includes(mode))!;
  return <div className="intent-groups" role="group" aria-label="Tujuan kerja">{intentGroups.map((item) => <button key={item.id} type="button" aria-pressed={group.id === item.id} onClick={() => onMode(item.modes[0])}>{item.label}</button>)}</div>;
}

const modeLabel = (id: ModeId) => modes.find((item) => item.id === id)!.label;

/** One picker for every template: favourites first, then each category's modes, then personal templates. */
function ModePicker({ mode, templates, favorites, templateKey, onTemplate }: Pick<Props, "mode" | "templates" | "favorites" | "templateKey" | "onTemplate">) {
  const name = (key: string) => key.startsWith("mode:") ? modes.find((item) => `mode:${item.id}` === key)?.label : templates.find((item) => `template:${item.id}` === key)?.name;
  const favourites = favorites.filter((key) => name(key));
  return <label className="composer-mode"><span>{templateKey ? "Templat:" : "Mode:"}</span><select aria-label="Mode atau templat" value={templateKey ?? `mode:${mode}`} onChange={(event) => onTemplate(event.target.value)}>
    {favourites.length > 0 && <optgroup label="Favorit">{favourites.map((key) => <option key={`favorite-${key}`} value={key}>★ {name(key)}</option>)}</optgroup>}
    {intentGroups.map((group) => <optgroup key={group.id} label={group.label}>{group.modes.map((id) => <option key={id} value={`mode:${id}`}>{modeLabel(id)}</option>)}</optgroup>)}
    {templates.length > 0 && <optgroup label="Templat pribadi">{templates.map((item) => <option key={item.id} value={`template:${item.id}`}>{item.name}</option>)}</optgroup>}
  </select><ChevronDown size={13}/></label>;
}

export function Composer(props: Props) {
  const [slashClosed, setSlashClosed] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const pickerId = useId();
  const quickId = useId();
  const group = intentGroups.find((item) => item.modes.includes(props.mode))!;
  const command = props.prompt.match(/^\/([^\s]*)$/);
  const matches = command ? modes.filter((item) => `${item.id} ${item.label}`.toLowerCase().includes(command[1].toLowerCase())) : [];
  const slashOpen = Boolean(command && !slashClosed);
  // Dictation adds each phrase to what is already written; switching mode never clears the text.
  const dictation = useDictation(props.settings.language, (text) => props.onPrompt(`${props.prompt}${props.prompt && !/\s$/.test(props.prompt) ? " " : ""}${text}`));
  function chooseMode(id: ModeId) { props.onMode(id); props.onPrompt(props.prompt.replace(/^\/[^\s]*\s?/, "")); setSlashClosed(true); }

  return <div className="composer-area"><IntentTabs mode={props.mode} onMode={props.onMode}/><form className={`composer ${props.busy ? "is-busy" : ""}`} aria-busy={props.busy} onSubmit={(event) => { event.preventDefault(); if (slashOpen) { if (matches[slashIndex]) chooseMode(matches[slashIndex].id); } else props.onSubmit(); }}>
    <ModePicker mode={props.mode} templates={props.templates} favorites={props.favorites} templateKey={props.templateKey} onTemplate={props.onTemplate}/>
    <textarea aria-label="Pertanyaan atau catatan klinis" placeholder={composerPlaceholder(props.mode)} value={props.prompt} onChange={(e) => { props.onPrompt(e.target.value); setSlashClosed(false); setSlashIndex(0); }} aria-controls={slashOpen ? pickerId : undefined} aria-activedescendant={slashOpen && matches[slashIndex] ? `${pickerId}-${matches[slashIndex].id}` : undefined} rows={2} maxLength={30000} onKeyDown={(e) => { if (e.nativeEvent.isComposing) return; if (slashOpen) { if (e.key === "Escape") { e.preventDefault(); setSlashClosed(true); return; } if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const next = Math.max(0, Math.min(matches.length - 1, slashIndex + (e.key === "ArrowDown" ? 1 : -1))); setSlashIndex(next); document.getElementById(`${pickerId}-${matches[next]?.id}`)?.scrollIntoView({ block: "nearest" }); return; } if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (matches[slashIndex]) chooseMode(matches[slashIndex].id); return; } } if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (props.prompt.trim()) props.onSubmit(); } }}/>
    <div className="composer-toolbar"><div className="composer-tools-left">
      <button type="button" className="icon-tool mic-button" data-state={dictation.recording ? "listening" : "idle"} aria-pressed={dictation.recording} disabled={dictation.starting} aria-label={dictation.recording ? "Hentikan dikte" : "Dikte ke kolom teks"} title={dictation.recording ? "Mendengarkan · klik untuk berhenti" : "Dikte ke kolom teks (layanan speech browser)"} onClick={dictation.toggle}><Mic size={16}/></button>
      <button type="button" className={`icon-tool context-button ${props.context ? "has-context" : ""}`} aria-label={props.context ? "Ubah konteks encounter" : "Tambah konteks"} title={props.context ? "Ubah konteks encounter" : "Tambah konteks"} onClick={props.onContext}><Paperclip size={16}/></button>
      <span className="context-status" role="status">{dictation.recording ? <span className="listening">Mendengarkan…</span> : <>{props.patientName ?? "Tanpa pasien"} · {props.context ? "konteks terisi" : "belum ada konteks"}</>}</span>
    </div><div className="composer-tools-right">
      <div className="model-select"><select aria-label="Format keluaran" value={props.settings.model} onChange={(e) => props.onModel(e.target.value as Settings["model"])}><option value="Standard">{modelLabel("Standard")}</option><option value="Extended">{modelLabel("Extended")}</option></select><ChevronDown size={11}/></div>
      {props.busy && props.miraEnabled ? <button type="button" className="button square send-button" aria-label="Hentikan analisis" title="Hentikan analisis" onClick={props.onCancelAnalysis}><Square size={13} fill="currentColor"/></button> : <button className="button square send-button" aria-label={props.miraEnabled ? "Analisis kasus" : "Buat draf"} title={props.miraEnabled ? "Analisis langsung · Enter" : "Buat draf · Enter"} disabled={!props.prompt.trim() || props.busy}>{props.busy ? <PixelLoader label="Sedang menyusun draf…"/> : <ArrowUp size={18}/>}</button>}
    </div></div>
  </form>
    {dictation.error && <div className="composer-analysis"><p className="form-warning" role="alert">{dictation.error}</p></div>}
    {props.miraEnabled && props.analysisError && <div className="composer-analysis"><p className="form-warning" role="alert">{props.analysisError}</p></div>}
    {slashOpen && <div className="slash-picker" id={pickerId} role="listbox" aria-label="Pilih templat">{matches.map((item, index) => <div role="option" aria-selected={slashIndex === index} id={`${pickerId}-${item.id}`} key={item.id}><button type="button" onClick={() => chooseMode(item.id)}><strong>{item.label}</strong><span>/{item.id}</span></button></div>)}{!matches.length && <p>Tidak ada templat yang cocok.</p>}</div>}
    <div className="quick-actions"><span className="quick-label" id={quickId}>TINDAKAN CEPAT</span><div className="intent-modes" role="group" aria-labelledby={quickId}>{group.quick.map((id) => { const item = modes.find((entry) => entry.id === id)!; return <button type="button" className={`action-chip ${props.mode === id ? "active" : ""}`} key={id} onClick={() => props.onMode(id)} title={item.description} aria-pressed={props.mode === id}>{item.label}</button>; })}</div></div>
  </div>;
}
