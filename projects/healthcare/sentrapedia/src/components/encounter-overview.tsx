"use client";

import { ArrowUpRight, FileText } from "lucide-react";
import type { ReactNode } from "react";
import { storedCase, taskDraftFrom } from "../lib/aadi/presentation";
import { contextFacts, encounterTimeline, workspaceDate } from "../lib/studio";
import type { Encounter, Patient, Workspace } from "../lib/workspace";
import { PatientAvatar } from "./patient-avatar";

const block = (title: string, children: ReactNode, action?: ReactNode) => <section className="overview-block" aria-label={title}>
  <div className="panel-section-heading"><h3>{title}</h3>{action}</div>{children}
</section>;

// The pane's first tab: the encounter's documents in time, the facts the doctor wrote, the patient, and the engine's next steps as a task draft.
export function EncounterOverview({ state, encounter, patient, onContext, onPatient, onSelect, onMakeTasks, syncState = "off" }: { state: Workspace; encounter: Encounter; patient?: Patient; onContext: () => void; onPatient: () => void; onSelect: (id: string) => void; onMakeTasks: (text: string) => void; syncState?: "off" | "ready" }) {
  const timeline = encounterTimeline(state.encounters, encounter);
  const facts = contextFacts(encounter.context, patient?.notes ?? "").filter((fact) => fact.values.length);
  // The newest analysis with a stored case feeds the task draft.
  const latest = [...encounter.messages].reverse().map((message) => message.role === "assistant" ? storedCase(message) : null).find(Boolean);
  const draft = latest ? taskDraftFrom(latest.result) : "";
  const details = patient && [patient.age && `${patient.age} tahun`, patient.sex !== "Not specified" && patient.sex].filter(Boolean).join(" · ");
  return <div className="encounter-overview">
    {block("Timeline", <>
      <p className="panel-caption">{patient ? "Hanya Encounter Pasien ini." : "Encounter tanpa Pasien ditampilkan terpisah."} Waktu penyimpanan dalam WIB.</p>
      <ol className="encounter-timeline">{timeline.map((item) => { const documents = item.messages.filter((message) => message.role === "assistant"); return <li key={item.id} className={item.id === encounter.id ? "current" : ""}><button type="button" className="timeline-encounter" aria-current={item.id === encounter.id ? "true" : undefined} onClick={() => onSelect(item.id)}><small>{workspaceDate(item.createdAt)}</small><strong>{item.title}</strong><span>{documents.length} dokumen {item.id === encounter.id && "· Aktif"}</span></button>{documents.map((document) => <div className="timeline-document" key={document.id}><FileText size={13}/><div><span>{document.content.split("\n")[0].replace(/^#+\s*/, "")}</span><small>{workspaceDate(document.createdAt)} · {document.reviewStatus === "final" ? "Final" : document.reviewStatus === "reviewed" ? "Ditinjau" : "Draf"}</small></div></div>)}</li>; })}</ol>
    </>)}
    {block("Ringkasan sumber", <>
      <p className="panel-caption">Dari label pada konteks dan catatan Pasien.</p>
      {facts.length ? <dl className="context-facts">{facts.map((fact) => <div key={fact.key}><dt>{fact.label}</dt><dd>{fact.values.map((value) => <div key={value.source}><p>{value.text}</p><small>{value.source}</small></div>)}</dd></div>)}</dl> : <p className="panel-empty">Belum ada konteks.</p>}
      {!!encounter.context && <details className="context-original"><summary>Konteks Encounter asli</summary><pre>{encounter.context}</pre></details>}
      {!!patient?.notes && <details className="context-original"><summary>Catatan Pasien asli</summary><pre>{patient.notes}</pre></details>}
    </>, <button type="button" className="text-button" onClick={onContext}>Edit konteks <ArrowUpRight size={13}/></button>)}
    {block("Pasien", patient
      ? <div className="patient-summary"><span className="patient-symbol"><PatientAvatar sex={patient.sex} size={22}/></span><div><strong>{patient.name}</strong>{details && <small>{details}</small>}</div></div>
      : <p className="panel-empty">Encounter ini belum terhubung dengan Pasien.</p>,
    <button type="button" className="text-button" onClick={onPatient}>{patient ? "Edit detail Pasien" : "Hubungkan Pasien"} <ArrowUpRight size={13}/></button>)}
    {block("Daftar tugas", draft
      ? <ul className="task-draft">{draft.split("\n").map((line) => <li key={line}>{line}</li>)}</ul>
      : <p className="panel-empty">Belum ada tugas</p>,
    draft ? <button type="button" className="button" onClick={() => onMakeTasks(draft)}>Buat</button> : undefined)}
    <footer className="panel-footnote"><span className="local-dot"/> Tersimpan di browser{syncState === "ready" && " · Sinkronisasi server aktif"}</footer>
  </div>;
}
