"use client";

import { ArrowUpRight, Clock3, FileText, PanelRightClose } from "lucide-react";
import { PatientAvatar } from "./patient-avatar";
import { useState } from "react";
import { contextFacts, encounterTimeline, workspaceDate } from "../lib/studio";
import type { Encounter, Patient, Workspace } from "../lib/workspace";

interface Props { state: Workspace; encounter?: Encounter; patient?: Patient; onSelect: (id: string) => void; onContext: () => void; onPatient: () => void; onClose?: () => void }
export function ClinicalPanel({ state, encounter, patient, onSelect, onContext, onPatient, onClose }: Props) {
  const [view, setView] = useState<"context" | "timeline">("context");
  const timeline = encounterTimeline(state.encounters, encounter);
  const facts = contextFacts(encounter?.context ?? "", patient?.notes ?? "").filter((fact) => fact.values.length);
  return <section className="clinical-panel-content" aria-label="Konteks dan Timeline">
    <header className="clinical-panel-header"><span>CLINICAL COCKPIT</span>{onClose && <button className="icon-button" aria-label="Tutup panel konteks" onClick={onClose}><PanelRightClose size={16}/></button>}</header>
    <div className="patient-summary"><span className="patient-symbol"><PatientAvatar sex={patient?.sex} size={22}/></span><div><strong>{patient?.name ?? "Encounter tanpa Pasien"}</strong><small>{patient ? [patient.age && `${patient.age} tahun`, patient.sex !== "Not specified" && patient.sex].filter(Boolean).join(" · ") : "Hubungkan melalui detail Encounter"}</small></div></div>
    <div className="panel-tabs" role="group" aria-label="Tampilan panel"><button aria-pressed={view === "context"} onClick={() => setView("context")}>Konteks</button><button aria-pressed={view === "timeline"} onClick={() => setView("timeline")}>Timeline <span>{timeline.length}</span></button></div>
    <div className="panel-scroll" key={view}>{view === "context" ? <>
      <div className="panel-section-heading"><h2>Ringkasan sumber</h2><button className="text-button" onClick={onContext}>Edit konteks <ArrowUpRight size={13}/></button></div>
      <p className="panel-caption">Dari label pada konteks dan catatan Pasien.</p>
      {facts.length ? <dl className="context-facts">{facts.map((fact) => <div key={fact.key}><dt>{fact.label}</dt><dd>{fact.values.map((value) => <div key={value.source}><p>{value.text}</p><small>{value.source}</small></div>)}</dd></div>)}</dl> : <p className="panel-empty">Belum ada konteks. Tambahkan lewat Edit konteks.</p>}
      {!!encounter?.context && <details className="context-original"><summary>Konteks Encounter asli</summary><pre>{encounter.context}</pre></details>}
      {patient && <>{patient.notes && <details className="context-original"><summary>Catatan Pasien asli</summary><pre>{patient.notes}</pre></details>}<button className="button panel-wide-button" onClick={onPatient}>Edit detail Pasien <ArrowUpRight size={13}/></button></>}
    </> : <>
      <div className="panel-section-heading"><h2>Riwayat Encounter</h2><Clock3 size={14}/></div><p className="panel-caption">{patient ? "Hanya Encounter Pasien ini." : "Encounter tanpa Pasien ditampilkan terpisah."} Waktu penyimpanan dalam WIB.</p>
      {timeline.length === 0 && <p className="panel-empty">Pilih atau buat Encounter untuk melihat riwayat.</p>}
      <ol className="encounter-timeline">{timeline.map((item) => { const documents = item.messages.filter((message) => message.role === "assistant"); return <li key={item.id} className={item.id === encounter?.id ? "current" : ""}><button className="timeline-encounter" aria-current={item.id === encounter?.id ? "true" : undefined} onClick={() => onSelect(item.id)}><small>{workspaceDate(item.createdAt)}</small><strong>{item.title}</strong><span>{documents.length} dokumen {item.id === encounter?.id && "· Aktif"}</span></button>{documents.map((document) => <div className="timeline-document" key={document.id}><FileText size={13}/><div><span>{document.content.split("\n")[0].replace(/^#+\s*/, "")}</span><small>{workspaceDate(document.createdAt)} · {document.reviewStatus === "final" ? "Final" : document.reviewStatus === "reviewed" ? "Ditinjau" : "Draf"}</small></div></div>)}</li>; })}</ol>
    </>}</div><footer className="panel-footnote"><span className="local-dot"/> Tersimpan di browser · Data fiktif</footer>
  </section>;
}
