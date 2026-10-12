import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { icdNameMatch } from "./icd-name-match.mjs";

const [base, label] = process.argv.slice(2);
if (!base || !label) throw new Error("usage: node scripts/eval-theoracle-pipeline.mjs http://127.0.0.1:<port> <legacy|targeted>");
const dir = path.resolve("docs/verification/theoracle-eval-2026-10-11");
const { queries } = JSON.parse(readFileSync(path.join(dir, "eval-set.json"), "utf8"));
const { labels } = JSON.parse(readFileSync(path.join(dir, "gold-icd10.json"), "utf8"));
const names = new Map(JSON.parse(readFileSync(path.resolve("mira/service/data/icd10.json"), "utf8")).icd10.map(e => [e.kode, e.nama_en]));
const DOSE_STRENGTH = /(\d+(?:[.,]\d+)?)\s*(mcg|mg|g|iu|ml)\b/gi;
const pct = (values, p) => { const s = [...values].sort((a, b) => a - b); return s.length ? Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))]) : null; };
const rows = [];
for (const item of queries.filter(q => q.gold?.length && !q.term)) {
  const caseData = { demographics: { ageYears: null, sex: "unknown" }, chiefComplaint: item.query, anamnesis: {}, vitals: {}, physicalExam: [], results: [], currentMedications: [], knownConditions: [], allergies: [], facilityCapabilities: [] };
  const started = performance.now();
  const response = await fetch(`${base}/api/mira`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ case: caseData, synthetic: true }) });
  const ms = Math.round(performance.now() - started);
  const body = await response.json().catch(() => null);
  if (!response.ok || !body) { rows.push({ id: item.id, ok: false, status: response.status, code: body?.error?.code ?? null, ms }); console.error(`${item.id} ${ms} ms FAIL ${response.status} ${body?.error?.code ?? ""}`); if (body?.error?.code === "BUDGET_EXHAUSTED") break; continue; }
  const likely = body.result.differential.likely[0] ?? null;
  const gate = body.evidenceGate ?? null;
  const evidence = [...(body.therapyGrounding?.evidence ?? []), ...(body.grounding?.evidence ?? [])];
  const passages = evidence.map(e => e.text.toLowerCase());
  // Raw model doses: from the gate report (it records what the model wrote) or, without a gate report, from the result.
  const written = gate ? gate.drugs : (body.result.therapy?.regimen ?? []).map(r => ({ drug: r.drug, dose: r.dose, status: null }));
  const supported = written.filter(d => d.dose && [...d.dose.matchAll(DOSE_STRENGTH)].every(m => passages.some(p => p.includes(m[1]))));
  // Compact record of what the gate verified, for the manual same-disease / same-population check.
  const verifiedEvidence = gate ? gate.drugs.filter(d => d.status === "verified").map(d => ({ drug: d.drug, dose: d.dose, passages: d.evidenceIds.map(id => { const e = evidence.find(x => x.evidenceId === id); return e ? { id, title: e.source.title, text: e.text.slice(0, 600) } : { id }; }) })) : [];
  rows.push({
    id: item.id, ok: true, ms, path: body.pipeline?.path ?? null, stages: body.pipeline?.stages ?? [],
    // icdValid: the full code or its 3-character category exists in the list. icdNameMatch: approximate lexical overlap between
    // the label and the official name (scripts/icd-name-match.mjs), not a check that the code is right.
    icd10: likely?.icd10 ?? null, diagnosis: likely?.label ?? null, icdValid: !!likely && names.has(likely.icd10) || !!likely && names.has(likely.icd10.slice(0, 3)),
    icdNameMatch: !!likely && icdNameMatch(likely.icd10, likely.label, names),
    icdCorrect: !!likely && (labels[item.id] ?? []).includes(likely.icd10.slice(0, 3)),
    therapyRetrieved: (body.pipeline?.stages ?? []).some(s => s.stage === "retrieve_tx" && s.ok), drugsWritten: written.length, dosesWritten: written.filter(d => d.dose).length,
    dosesSupported: supported.length, verified: gate ? gate.drugs.filter(d => d.status === "verified").length : null,
    doseRemoved: gate ? gate.drugs.filter(d => d.status === "doseRemoved").length : null, removed: gate ? gate.drugs.filter(d => d.status === "removed").length : null,
    displayedDoses: (body.result.therapy?.regimen ?? []).filter(r => r.dose).length, costUsd: body.result.meta.costUsd, verifiedEvidence,
  });
  console.error(`${item.id} ${ms} ms ${likely?.icd10 ?? "-"}`);
}
const done = rows.filter(r => r.ok);
const stageMs = name => done.flatMap(r => r.stages.filter(s => s.stage === name).map(s => s.ms));
const sum = key => done.reduce((n, r) => n + (r[key] ?? 0), 0);
const summary = {
  label, measuredAt: new Date().toISOString(), cases: rows.length, ok: done.length,
  latencyMs: { p50: pct(done.map(r => r.ms), 0.5), p95: pct(done.map(r => r.ms), 0.95), stages: Object.fromEntries(["retrieve_dx", "mira_dx", "retrieve_tx", "mira_tx", "gate"].map(s => [s, { p50: pct(stageMs(s), 0.5), p95: pct(stageMs(s), 0.95) }])) },
  icd10: { valid: done.length ? done.filter(r => r.icdValid).length / done.length : null, nameMatch: done.length ? done.filter(r => r.icdNameMatch).length / done.length : null, correctTop1VsDraftGold: done.length ? done.filter(r => r.icdCorrect).length / done.length : null },
  dose: { written: sum("dosesWritten"), supportedByPassages: sum("dosesSupported"), supportedRate: sum("dosesWritten") ? sum("dosesSupported") / sum("dosesWritten") : null, displayed: sum("displayedDoses"), verified: sum("verified"), doseRemoved: sum("doseRemoved"), removed: sum("removed") },
  retrievalSuccess: label === "targeted" && done.length ? done.filter(r => r.therapyRetrieved).length / done.length : null,
  costUsd: Math.round(sum("costUsd") * 10000) / 10000,
};
writeFileSync(path.join(dir, `pipeline-2026-10-11-${label}.json`), JSON.stringify({ summary, rows }, null, 2));
console.log(JSON.stringify(summary, null, 2));
