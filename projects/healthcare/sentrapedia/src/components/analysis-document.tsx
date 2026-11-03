"use client";

import type { ReactNode } from "react";
import type { Message } from "../lib/workspace";
import { analysisView, type AnalysisView } from "../lib/aadi/analysis-view";
import { therapyCheckTitle } from "../lib/aadi/presentation";
import { GuidelineCitations } from "./guideline-citations";

const stepVerb = { question: "Tanyakan", exam: "Periksa", test: "Pemeriksaan penunjang" } as const;
const focusTitle = { workup: "Pemeriksaan penunjang", icd10: "Kode ICD-10", refer: "Rujukan" } as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="analysis-section" aria-label={title}><h3>{title}</h3>{children}</section>;
}
const Lines = ({ items }: { items: string[] }) => items.length > 0 ? <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : null;

function Focus({ view }: { view: AnalysisView }) {
  if (view.focus === "workup") {
    const tests = view.nextSteps.filter((s) => s.kind === "test");
    return <Section title={focusTitle.workup}>{tests.length ? <ul>{tests.map((s, index) => <li key={index}><strong>{s.item}</strong> · {s.indication ?? "indikasi belum dituliskan"} · {s.reason}</li>)}</ul> : <p>AADI belum mengusulkan pemeriksaan penunjang.</p>}</Section>;
  }
  if (view.focus === "icd10") return <Section title={focusTitle.icd10}>{view.tiers.map((tier) => tier.items.length > 0 && <div key={tier.key}><h4>{tier.title}</h4><ul>{tier.items.map((d) => <li key={d.icd10}><code>{d.icd10}</code> {d.label}</li>)}</ul></div>)}</Section>;
  if (view.focus === "refer") return <Section title={focusTitle.refer}>{view.therapy?.disposition ? <p><strong>Keputusan:</strong> {view.therapy.disposition}</p> : <p>Disposisi belum dapat ditetapkan dari data yang ada.</p>}<Lines items={view.tiers[0].items.map((d) => `Diagnosis kerja: ${d.label} (${d.icd10})`)}/></Section>;
  return null;
}

/** The analysis in Glass's shape, read from the stored engine result; therapy only as the evidence gate lets it through. */
export function AnalysisDocument({ message, citePrefix }: { message: Message; citePrefix: string }) {
  const view = analysisView(message);
  if (!view) return null;
  const therapy = view.therapy;
  return <div className="analysis-document">
    <Focus view={view}/>
    <Section title="Pembahasan kasus">
      <Lines items={view.discussion.facts}/>
      {view.discussion.missing.length > 0 && <><h4>Data yang perlu dilengkapi</h4><Lines items={view.discussion.missing}/></>}
      {view.discussion.note && <p className="analysis-note">{view.discussion.note}</p>}
    </Section>
    {view.tiers.map((tier) => <Section key={tier.key} title={tier.title}>
      {tier.items.length ? <ul className="analysis-diagnoses">{tier.items.map((d) => <li key={d.icd10}>
        <p><strong>{d.label}</strong> · {d.icd10} · {d.status}</p>
        {d.supporting.length > 0 && <><h4>Mendukung</h4><Lines items={d.supporting}/></>}
        {d.opposing.length > 0 && <><h4>Menyangkal</h4><Lines items={d.opposing}/></>}
      </li>)}</ul> : <p>Tidak ada kandidat pada tingkat ini.</p>}
    </Section>)}
    <Section title="Langkah diagnostik berikutnya">
      {view.nextSteps.length ? <ul>{view.nextSteps.map((s, index) => <li key={index}><strong>{stepVerb[s.kind]}:</strong> {s.item} — {s.reason}{s.indication ? ` (indikasi: ${s.indication})` : ""}</li>)}</ul> : <p>AADI belum mengusulkan langkah berikutnya.</p>}
    </Section>
    <Section title="Rencana tata laksana">
      {therapy?.disposition && <p><strong>Disposisi:</strong> {therapy.disposition}</p>}
      {therapy?.removed ? <p className="analysis-note">Terapi tidak ditampilkan: {therapy.removed}</p> : therapy?.lines.length ? <>
        <p>Usulan terapi untuk {therapy.forDiagnosis}:</p>
        <ul className="analysis-regimen">{therapy.lines.map((line, index) => <li key={index} data-gate={line.status}>{line.text}{line.status !== "verified" && <span className="analysis-gate-tag">{therapyCheckTitle}</span>}</li>)}</ul>
        {therapy.interactions.length > 0 && <><h4>DDI</h4><Lines items={therapy.interactions}/></>}
        {therapy.contraindications.length > 0 && <><h4>Kontraindikasi</h4><Lines items={therapy.contraindications}/></>}
      </> : <p>Belum ada usulan terapi dari AADI untuk kasus ini.</p>}
    </Section>
    <Section title="Edukasi dan tindak lanjut"><Lines items={view.education}/></Section>
    <GuidelineCitations items={view.citations} idPrefix={citePrefix}/>
  </div>;
}
