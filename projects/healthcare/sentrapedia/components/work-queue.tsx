"use client";

import { useState } from "react";
import { Pin } from "lucide-react";
import { newId, type Encounter, type Workspace, type WorkspaceAction } from "../lib/workspace";
import { queueItems, workLabels, type WorkStatus } from "../lib/workflow";
import { encounterTitle } from "../lib/nav-format";
import { Dialog } from "./dialog";

export function WorkQueue({ state, dispatch, onSelect, onClose }: { state: Workspace; dispatch: (action: WorkspaceAction) => void; onSelect: (id: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [patient, setPatient] = useState("all");
  const items = queueItems(state, query, patient);
  function update(encounter: Encounter, updates: Partial<Pick<Encounter, "workStatus" | "pinned" | "tasks">>) { dispatch({ type: "queue.update", encounterId: encounter.id, updates, at: new Date().toISOString() }); }
  return <Dialog title="Antrean kerja" subtitle="Status pekerjaan manual per Encounter, terpisah dari status dokumen dan penilaian klinis." wide onClose={onClose}>
    <div className="queue-filters"><label>Cari<input aria-label="Cari antrean" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Encounter, Patient, atau tugas…"/></label><label>Patient<select aria-label="Filter Patient antrean" value={patient} onChange={(event) => setPatient(event.target.value)}><option value="all">Semua Patient</option><option value="unlinked">Tidak terkait Patient</option>{state.patients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
    <div className="queue-columns">{(Object.keys(workLabels) as WorkStatus[]).map((status) => <section key={status}><h3>{workLabels[status]} <span>{items.filter((e) => (e.workStatus ?? "active") === status).length}</span></h3>{items.filter((e) => (e.workStatus ?? "active") === status).map((encounter) => <QueueCard key={encounter.id} encounter={encounter} patientName={state.patients.find((p) => p.id === encounter.patientId)?.name ?? "Tidak terkait Patient"} onUpdate={(updates) => update(encounter, updates)} onSelect={() => onSelect(encounter.id)}/>)}{!items.some((e) => (e.workStatus ?? "active") === status) && <p className="panel-empty">Belum ada pekerjaan.</p>}</section>)}</div>
  </Dialog>;
}
function QueueCard({ encounter, patientName, onUpdate, onSelect }: { encounter: Encounter; patientName: string; onUpdate: (updates: Partial<Pick<Encounter, "workStatus" | "pinned" | "tasks">>) => void; onSelect: () => void }) {
  const [task, setTask] = useState("");
  const tasks = encounter.tasks ?? [];
  const drafts = encounter.messages.filter((m) => m.role === "assistant");
  const last = drafts.at(-1);
  return <article className="queue-card"><header><button className="text-button" onClick={onSelect}>{encounterTitle(encounter)}</button><button className="icon-button" aria-label={`Sematkan ${encounter.title}`} aria-pressed={encounter.pinned ?? false} onClick={() => onUpdate({ pinned: !encounter.pinned })}><Pin size={15} fill={encounter.pinned ? "currentColor" : "none"}/></button></header><p>{patientName}</p><small>{new Date(encounter.updatedAt ?? encounter.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</small><p>{drafts.length} draf · {last ? last.reviewStatus === "final" ? "Final" : last.reviewStatus === "reviewed" ? "Ditinjau" : "Draf" : "Belum ada dokumen"}</p><label>Status pekerjaan<select aria-label={`Status pekerjaan ${encounter.title}`} value={encounter.workStatus ?? "active"} onChange={(event) => onUpdate({ workStatus: event.target.value as WorkStatus })}>{Object.entries(workLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><div className="queue-tasks">{tasks.map((item) => <div key={item.id}><label><input type="checkbox" checked={item.done} onChange={() => onUpdate({ tasks: tasks.map((t) => t.id === item.id ? { ...t, done: !t.done } : t) })}/>{item.text}</label><button className="text-button" aria-label={`Hapus tugas ${item.text}`} onClick={() => onUpdate({ tasks: tasks.filter((t) => t.id !== item.id) })}>×</button></div>)}</div><form onSubmit={(event) => { event.preventDefault(); if (!task.trim() || tasks.length >= 50) return; onUpdate({ tasks: [...tasks, { id: newId(), text: task.trim(), done: false }] }); setTask(""); }}><input aria-label={`Tugas baru ${encounter.title}`} value={task} maxLength={300} onChange={(event) => setTask(event.target.value)} placeholder="Tindak lanjut manual…"/><button className="text-button" disabled={!task.trim() || tasks.length >= 50}>Tambah tugas</button></form></article>;
}
