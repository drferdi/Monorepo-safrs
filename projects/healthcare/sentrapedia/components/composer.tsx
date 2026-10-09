"use client";

import { ArrowUp, AudioLines, Square, ChevronDown, CircleHelp, ClipboardList, FileText, FileUp, FlaskConical, ListChecks, Mic, Search, Send, SlidersHorizontal, Stethoscope } from "lucide-react";
import { PixelLoader } from "./pixel-loader";
import { useId, useState, type ReactNode } from "react";
import { modes, type ModeId } from "../lib/drafts";
import { intentGroups } from "../lib/studio";
import type { Settings } from "../lib/workspace";

interface Props { prompt: string; onPrompt: (value: string) => void; mode: ModeId; onMode: (mode: ModeId) => void; settings: Settings; onModel: (model: Settings["model"]) => void; context: string; onContext: () => void; onSettings: () => void; onScribe: () => void; onSubmit: () => void; busy: boolean; miraEnabled?: boolean; analysisError?: string; onCancelAnalysis?: () => void; templateControls?: ReactNode }
const icons = { question: CircleHelp, ddx: Search, ap: ClipboardList, clinic: ClipboardList, hpi: FileText, telephone: FileText, chronic: Stethoscope, handoff: ClipboardList, tasks: ListChecks, avs: FileText, education: FileText, referral: FileText, authorization: FileText, scribe: AudioLines, workup: FlaskConical, refer: Send };

export function IntentTabs({ mode, onMode }: { mode: ModeId; onMode: (mode: ModeId) => void }) {
  const group = intentGroups.find((item) => item.modes.includes(mode))!;
  return <div className="intent-groups" role="group" aria-label="Tujuan kerja">{intentGroups.map((item) => <button key={item.id} type="button" aria-pressed={group.id === item.id} onClick={() => onMode(item.modes[0])}>{item.label}</button>)}</div>;
}

export function Composer(props: Props) {
  const [slashClosed, setSlashClosed] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const pickerId = useId();
  const group = intentGroups.find((item) => item.modes.includes(props.mode))!;
  const command = props.prompt.match(/^\/([^\s]*)$/);
  const matches = command ? modes.filter((item) => `${item.id} ${item.label}`.toLowerCase().includes(command[1].toLowerCase())) : [];
  const slashOpen = Boolean(command && !slashClosed);
  function chooseMode(id: ModeId) { props.onMode(id); props.onPrompt(props.prompt.replace(/^\/[^\s]*\s?/, "")); setSlashClosed(true); }

  const mode = modes.find((m) => m.id === props.mode)!;
  return <div className="composer-area"><IntentTabs mode={props.mode} onMode={props.onMode}/><form className={`composer ${props.busy ? "is-busy" : ""}`} aria-busy={props.busy} onSubmit={(event) => { event.preventDefault(); if (slashOpen) { if (matches[slashIndex]) chooseMode(matches[slashIndex].id); } else props.onSubmit(); }}>
    <textarea aria-label="Pertanyaan atau catatan Clinical" placeholder={mode.placeholder} value={props.prompt} onChange={(e) => { props.onPrompt(e.target.value); setSlashClosed(false); setSlashIndex(0); }} aria-controls={slashOpen ? pickerId : undefined} aria-activedescendant={slashOpen && matches[slashIndex] ? `${pickerId}-${matches[slashIndex].id}` : undefined} rows={2} maxLength={30000} onKeyDown={(e) => { if (e.nativeEvent.isComposing) return; if (slashOpen) { if (e.key === "Escape") { e.preventDefault(); setSlashClosed(true); return; } if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const next = Math.max(0, Math.min(matches.length - 1, slashIndex + (e.key === "ArrowDown" ? 1 : -1))); setSlashIndex(next); document.getElementById(`${pickerId}-${matches[next]?.id}`)?.scrollIntoView({ block: "nearest" }); return; } if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (matches[slashIndex]) chooseMode(matches[slashIndex].id); return; } } if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (props.prompt.trim()) props.onSubmit(); } }}/>
    <div className="composer-toolbar"><div className="composer-tools-left"><button type="button" className="button primary scribe-button" onClick={props.onScribe}><AudioLines size={16}/><span>Voice mode</span></button><button type="button" className={`button context-button ${props.context ? "has-context" : ""}`} aria-label={props.context ? "Konteks ditambahkan" : "Tambah Konteks"} onClick={props.onContext}><FileUp size={15}/><span>{props.context ? "Konteks ditambahkan" : "Tambah Konteks"}</span>{props.context && <span className="context-dot"/>}</button></div><div className="composer-tools-right">
      <div className="model-select"><select aria-label="Format" value={props.settings.model} onChange={(e) => props.onModel(e.target.value as Settings["model"])}><option value="Standard">Standar</option><option>Extended</option></select><ChevronDown size={11}/></div>
      <button type="button" className="button square" aria-label="Pengaturan Agent" title="Pengaturan Agent" onClick={props.onSettings}><SlidersHorizontal size={15}/></button>
      <button type="button" className="button square mic-button" aria-label="Dikte catatan" title="Dikte catatan" onClick={props.onScribe}><Mic size={16}/></button>
      {props.busy && props.miraEnabled ? <button type="button" className="button square send-button" aria-label="Hentikan analisis" title="Hentikan analisis" onClick={props.onCancelAnalysis}><Square size={13} fill="currentColor"/></button> : <button className="button square send-button" aria-label={props.miraEnabled ? "Analisis kasus" : "Buat draf"} title={props.miraEnabled ? "Analisis langsung · Enter" : "Buat draf · Enter"} disabled={!props.prompt.trim() || props.busy}>{props.busy ? <PixelLoader label="Sedang menyusun draf…"/> : <ArrowUp size={18}/>}</button>}
    </div></div>
  </form>
    {props.miraEnabled && props.analysisError && <div className="composer-analysis"><p className="form-warning" role="alert">{props.analysisError}</p></div>}
    {slashOpen && <div className="slash-picker" id={pickerId} role="listbox" aria-label="Pilih templat">{matches.map((item, index) => <div role="option" aria-selected={slashIndex === index} id={`${pickerId}-${item.id}`} key={item.id}><button type="button" onClick={() => chooseMode(item.id)}><strong>{item.label}</strong><span>/{item.id}</span></button></div>)}{!matches.length && <p>Tidak ada templat yang cocok.</p>}</div>}
    {props.templateControls}
    <div className="intent-modes" role="group" aria-label="Jenis dokumen">{modes.filter((item) => group.modes.includes(item.id)).map((item) => { const Icon = icons[item.id]; return <button type="button" className={`action-chip ${props.mode === item.id ? "active" : ""}`} key={item.id} onClick={() => props.onMode(item.id)} title={item.description} aria-pressed={props.mode === item.id}><Icon size={14}/>{item.label}</button>; })}<span className="slash-hint">Ketik / untuk templat</span></div>
  </div>;
}
