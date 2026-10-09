"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { modes, type ModeId } from "../lib/drafts";
import type { Workspace } from "../lib/workspace";
import { Dialog } from "./dialog";

interface Props { state: Workspace; onClose: () => void; onEncounter: (id: string) => void; onPatient: (id: string) => void; onMode: (mode: ModeId) => void; onNew: () => void; onFocus: () => void; onContext: () => void; onQueue: () => void; onTemplates: () => void; onKnowledge: (tab?: string) => void }
export function CommandPalette(props: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const commands = [
    { id: "queue", category: "Aksi", label: "Antrean kerja", run: props.onQueue },
    { id: "templates", category: "Aksi", label: "Templat dan favorit", run: props.onTemplates },
    { id: "oracle", category: "Pustaka Klinis", label: "Cari penyakit", run: () => props.onKnowledge() },
    { id: "mira", category: "Analisis", label: "Analisis kasus", run: () => props.onKnowledge("mira") },
    { id: "new", category: "Aksi", label: "Encounter baru", run: props.onNew },
    { id: "focus", category: "Aksi", label: "Ubah Focus Mode", run: props.onFocus },
    { id: "context", category: "Aksi", label: "Edit konteks Encounter", run: props.onContext },
    ...modes.map((mode) => ({ id: `mode-${mode.id}`, category: "Template", label: mode.label, run: () => props.onMode(mode.id) })),
    ...props.state.patients.map((patient) => ({ id: `patient-${patient.id}`, category: "Patient", label: patient.name, run: () => props.onPatient(patient.id) })),
    ...props.state.encounters.map((encounter) => ({ id: `encounter-${encounter.id}`, category: "Encounter", label: encounter.title, run: () => props.onEncounter(encounter.id) })),
  ].filter((command) => `${command.category} ${command.label}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <Dialog title="Command Center" subtitle="Cari aksi, template, Patient, atau Encounter." onClose={props.onClose}>
    <div className="command-search"><Search size={17}/><input ref={input} aria-label="Cari perintah" role="combobox" aria-expanded="true" aria-controls={`${id}-results`} aria-activedescendant={commands[selected] ? `${id}-${commands[selected].id}` : undefined} value={query} placeholder="Apa yang ingin dikerjakan?" onChange={(event) => { setQuery(event.target.value); setSelected(0); }} onKeyDown={(event) => { if (event.nativeEvent.isComposing) return; if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const next = Math.max(0, Math.min(commands.length - 1, selected + (event.key === "ArrowDown" ? 1 : -1))); setSelected(next); document.getElementById(`${id}-${commands[next]?.id}`)?.scrollIntoView({ block: "nearest" }); } if (event.key === "Enter" && commands[selected]) { event.preventDefault(); commands[selected].run(); } }}/></div>
    <div className="command-results" role="listbox" aria-label="Hasil perintah" id={`${id}-results`}>{commands.map((command, index) => <div role="option" aria-selected={selected === index} id={`${id}-${command.id}`} key={command.id}><button onClick={command.run} onFocus={() => setSelected(index)}><span><small>{command.category}</small>{command.label}</span><ArrowUpRight size={14}/></button></div>)}{commands.length === 0 && <p className="panel-empty">Tidak ada perintah yang cocok.</p>}</div>
    <footer className="command-footer"><span>↑ ↓ Pilih · Enter Buka · Esc Tutup</span><kbd>Ctrl / ⌘ J</kbd></footer>
  </Dialog>;
}
