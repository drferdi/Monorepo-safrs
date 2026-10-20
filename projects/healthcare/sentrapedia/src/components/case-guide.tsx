"use client";

import { Check, Plus, Stethoscope, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";
import type { ModeId } from "../lib/drafts";
import type { CaseFields } from "../lib/aadi/composer";
import { missingField } from "../lib/clinical-templates";
import { examEntries, examFlags, examGroupLabel, examPatient, missingPregnancyLines } from "../lib/normal-exam";
import { caseGuide, soapView, type GuideKey } from "../lib/soap";

const hints: Partial<Record<GuideKey, string>> = { vitals: "Contoh: TD 120/80, N 88, RR 20, S 36,8, SpO2 98", age: "Contoh: Usia: 45 atau Usia: 8 bulan", sex: "laki-laki atau perempuan" };
const pregnancyHints = { Hamil: "Contoh: Hamil: 32 minggu", Nifas: "Contoh: Nifas: hari ke-3" };

/** Puskesmas flow: which case items the typed text already holds, under the composer box (which keeps its own design).
 *  A filled item is a mark; a missing one is a chip that inserts its label after the text. Behind a toggle, the same
 *  text as S/O/A/P; the view sends and saves nothing, and the SOAP note itself is the local draft Enter makes.
 *  In the SOAP mode it also names the normal exam template the draft will use, and every mode flags typed values
 *  outside the reference ranges (normal-exam.ts; shown here only, never written). */
export function CaseGuide({ prompt, mode, fields, patientAge, patientSex, onInsert, onMode }: { prompt: string; mode: ModeId; fields: CaseFields; patientAge?: string; patientSex?: "M" | "F"; onInsert: (skeleton: string) => void; onMode: (mode: ModeId) => void }) {
  const [soapOpen, setSoapOpen] = useState(false);
  const id = useId();
  const clinic = mode === "clinic";
  const patient = examPatient(prompt, fields, { age: patientAge, sex: patientSex });
  // In the SOAP mode the template completes the exam, so the doctor is not asked to write a normal one.
  const items = caseGuide(prompt, fields, { patientAge, patientSex }, mode).map((item) => clinic && patient && item.key === "examination" ? { ...item, filled: true } : item);
  if (!items.length || !prompt.trim()) return null;
  const flags = patient ? examFlags(prompt, fields, patient) : [];
  // Hamil and Nifas are offered for a P patient unless she is known to be under 10.
  const female = (fields.sex ? fields.sex === "F" : patientSex === "F") && (!patient || patient.months >= 120);
  const template = patient ? `Templat normal: ${examGroupLabel(patient)}` : "Templat normal menunggu usia dan jenis kelamin";
  // The count is plain text, not a live region: it changes on every keystroke.
  return <div className="case-guide" role="group" aria-label="Kelengkapan kasus">
    <span className="case-guide-count">Kelengkapan kasus: {items.filter((item) => item.filled).length} dari {items.length}</span>
    {items.map((item) => item.filled
      ? <span key={item.key} className="case-guide-item" data-filled>{item.label}<Check size={12} role="img" aria-label="terisi"/></span>
      : <button key={item.key} type="button" className="action-chip case-guide-item" aria-label={`Sisipkan ${item.label}`} title={hints[item.key] ?? "Ketik setelah label"} onClick={() => onInsert(item.skeleton)}><Plus size={12} aria-hidden="true"/>{item.label}</button>)}
    {/* Not counted: they choose the template, and only a P patient can need them. */}
    {clinic && female && missingPregnancyLines(prompt).map((label) => <button key={label} type="button" className="action-chip case-guide-item" data-optional aria-label={`Sisipkan ${label}`} title={pregnancyHints[label]} onClick={() => onInsert(`${label}: `)}><Plus size={12} aria-hidden="true"/>{label}</button>)}
    <button type="button" className="text-button" aria-expanded={soapOpen} aria-controls={`${id}-soap`} onClick={() => setSoapOpen(!soapOpen)}>{soapOpen ? "Sembunyikan susunan SOAP" : "Susunan SOAP"}</button>
    {clinic && <p className="exam-template" data-ready={patient ? true : undefined} title="Pemeriksaan yang tidak ditulis diisi dari templat ini saat draf disusun, bertanda otomatis normal."><Stethoscope size={13} aria-hidden="true"/>{template}</p>}
    {flags.length > 0 && <ul className="exam-flags" aria-label="Nilai di luar rentang rujukan">{flags.map((flag) => <li key={flag}><TriangleAlert size={12} aria-hidden="true"/>{flag}</li>)}</ul>}
    {soapOpen && <div id={`${id}-soap`} className="soap-view" role="region" aria-label="Susunan SOAP">
      {soapView(prompt, fields).map((row) => <div key={row.key} className="soap-row" data-empty={row.text === missingField || undefined}><strong>{row.label}</strong><span>{row.text}{clinic && row.key === "O" && patient && <>{examEntries(prompt, patient).map((entry) => <small key={entry} className="soap-entry">{entry}</small>)}<small className="soap-note">Baris pemeriksaan lain dari templat normal {examGroupLabel(patient)}</small></>}</span></div>)}
      <p className="panel-caption">Disusun lokal dari teks yang diketik; bukan interpretasi klinis.</p>
      {mode !== "clinic" && <button type="button" className="button" onClick={() => onMode("clinic")}>Gunakan mode Catatan Klinis (SOAP)</button>}
    </div>}
  </div>;
}
