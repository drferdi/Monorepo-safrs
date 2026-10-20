"use client";

import { Check, Plus } from "lucide-react";
import { useId, useState } from "react";
import type { ModeId } from "../lib/drafts";
import type { CaseFields } from "../lib/aadi/composer";
import { missingField } from "../lib/clinical-templates";
import { caseGuide, soapView, type GuideKey } from "../lib/soap";

const hints: Partial<Record<GuideKey, string>> = { vitals: "Contoh: TD 120/80, N 88, RR 20, S 36,8, SpO2 98", age: "Contoh: Usia: 45", sex: "laki-laki atau perempuan" };

/** Puskesmas flow: which case items the typed text already holds, under the composer box (which keeps its own design).
 *  A filled item is a mark; a missing one is a chip that inserts its label after the text. Behind a toggle, the same
 *  text as S/O/A/P; the view sends and saves nothing, and the SOAP note itself is the local draft Enter makes. */
export function CaseGuide({ prompt, mode, fields, patientAge, patientSex, onInsert, onMode }: { prompt: string; mode: ModeId; fields: CaseFields; patientAge?: string; patientSex?: "M" | "F"; onInsert: (skeleton: string) => void; onMode: (mode: ModeId) => void }) {
  const [soapOpen, setSoapOpen] = useState(false);
  const id = useId();
  const items = caseGuide(prompt, fields, { patientAge, patientSex }, mode);
  if (!items.length || !prompt.trim()) return null;
  // The count is plain text, not a live region: it changes on every keystroke.
  return <div className="case-guide" role="group" aria-label="Kelengkapan kasus">
    <span className="case-guide-count">Kelengkapan kasus: {items.filter((item) => item.filled).length} dari {items.length}</span>
    {items.map((item) => item.filled
      ? <span key={item.key} className="case-guide-item" data-filled>{item.label}<Check size={12} role="img" aria-label="terisi"/></span>
      : <button key={item.key} type="button" className="action-chip case-guide-item" aria-label={`Sisipkan ${item.label}`} title={hints[item.key] ?? "Ketik setelah label"} onClick={() => onInsert(item.skeleton)}><Plus size={12} aria-hidden="true"/>{item.label}</button>)}
    <button type="button" className="text-button" aria-expanded={soapOpen} aria-controls={`${id}-soap`} onClick={() => setSoapOpen(!soapOpen)}>{soapOpen ? "Sembunyikan susunan SOAP" : "Susunan SOAP"}</button>
    {soapOpen && <div id={`${id}-soap`} className="soap-view" role="region" aria-label="Susunan SOAP">
      {soapView(prompt, fields).map((row) => <div key={row.key} className="soap-row" data-empty={row.text === missingField || undefined}><strong>{row.label}</strong><span>{row.text}</span></div>)}
      <p className="panel-caption">Disusun lokal dari teks yang diketik; bukan interpretasi klinis.</p>
      {mode !== "clinic" && <button type="button" className="button" onClick={() => onMode("clinic")}>Gunakan mode Catatan Klinis (SOAP)</button>}
    </div>}
  </div>;
}
