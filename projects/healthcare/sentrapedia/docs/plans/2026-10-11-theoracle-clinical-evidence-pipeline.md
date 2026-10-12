# TheOracle Clinical Evidence Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One UI request runs Diagnosis → Targeted vector retrieval → Therapy → Clinical evidence gate → Final response, with the current path kept behind a flag, and measured on the existing evaluation set.

**Architecture:** The Next.js gateway (`src/lib/mira/gateway.ts`) orchestrates five timed, logged stages. MIRA's step skips therapy on request (`omitTherapy`); a new MIRA endpoint `/v1/therapy/step` writes therapy for a given diagnosis from a bundle retrieved for that diagnosis. A pure TypeScript gate verifies indication, dose and contraindication against the passages and blanks or removes what it cannot verify. The gate runs on both paths.

**Tech Stack:** Next.js 16 / TypeScript (vitest), Python 3.12 FastAPI MIRA service (pytest via `npm run test:mira`), local EmbeddingGemma retriever, OpenRouter `google/gemini-2.5-flash` for the paid evaluation.

**Spec:** `docs/specs/2026-10-11-theoracle-clinical-evidence-pipeline.md` (commit `6be425a5`, approved by Gaffer, paid run approved with a cap of $18.30).

All paths below are relative to `projects/healthcare/sentrapedia/` in the worktree
`D:\DEV\monorepo.worktrees\oracle-vector-only` (branch `feat/sentrapedia-dify-theoracle`).

## Global Constraints

- Flag: `MIRA_TARGETED_THERAPY` (`"true"` enables the targeted path; anything else = current path).
- MIRA capability string for the new endpoint: `theoracle-targeted-therapy-v1`.
- Stage names (exact): `retrieve_dx`, `mira_dx`, `retrieve_tx`, `mira_tx`, `gate`.
- Retrieval stage timeout: 5000 ms each. Gateway timeout with the flag on: `(2 × stepDeadlineS + gatewayMarginS) × 1000` ms.
- Log line per stage: `console.info(JSON.stringify({ event: "mira.stage", traceId, stage, ms, ok, code }))`; never case text.
- Response stays `{ result, traceId, createdAt, grounding }`; new fields are optional: `therapyGrounding`, `evidenceGate`, `pipeline`. `result` must still pass `validResult` (response schema, `additionalProperties: false`).
- Unverified dose → `dose: ""`, rendered "dosis: cek pedoman". Unverified indication → drug removed. Unverified contraindication/interaction → string suffixed " (belum terverifikasi)".
- If therapy retrieval fails, MIRA's therapy endpoint is not called.
- Evidence bundles: at most 6 passages (`validTheOracleGrounding`).
- No new dependencies. No `@ts-ignore`, `eslint-disable`, implicit `any`.
- Python files changed under `mira/service/` must have `packagedSha256` updated in `mira/SOURCE.json`; files whose packaged hash then differs from `sourceSha256` must be in the allowlist in `mira/service/tests/test_packaging.py`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and carry the SAFRS tier, e.g. `(R2)`.

## Review Focus

- Diagnosis step returns an empty `differential.likely` → no therapy stage, no crash, `pipeline.stages` shows no `retrieve_tx` (Task 4 test).
- Drug written in English spelling (Amoxicillin) while the passage is Indonesian (amoksisilin 500 mg) → verified, not removed (Task 1 test).
- Dose written `3x500mg`, passage says `500 mg 3 kali sehari` → verified; passage only states `250 mg` → dose blanked (Task 1 test).
- MIRA does not advertise `theoracle-targeted-therapy-v1` while the flag is on → current path runs, gate still applied, log line `TARGETED_UNAVAILABLE` (Task 4 test).
- A saved draft created before this change (no `evidenceGate`, no `therapyGrounding`) → renders exactly as before (Task 5 test).

---

### Task 1: Clinical evidence gate (pure function)

**Files:**
- Create: `src/lib/theoracle-evidence-gate.ts`
- Test: `tests/theoracle-evidence-gate.test.ts`

**Interfaces:**
- Consumes: `MiraTherapy` from `src/lib/mira/contract.ts`; `TheOracleGroundingBundle` from `src/lib/theoracle-grounding-types.ts`.
- Produces:
  - `type GateStatus = "verified" | "doseRemoved" | "removed"`
  - `interface GateDrug { drug: string; dose: string; status: GateStatus; evidenceIds: string[] }` (`dose` = what the model wrote)
  - `interface EvidenceGateReport { forDiagnosis: { icd10: string; label: string }; therapyRemoved: boolean; reason: string; drugs: GateDrug[] }`
  - `function gateTherapy(therapy: MiraTherapy, bundle: TheOracleGroundingBundle | undefined, diagnosis: { icd10: string; label: string } | undefined): { therapy: MiraTherapy | undefined; report: EvidenceGateReport }`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { gateTherapy } from "../src/lib/theoracle-evidence-gate";
import { THEORACLE_GROUNDING_CAPABILITY, type TheOracleGroundingBundle } from "../src/lib/theoracle-grounding-types";
import type { MiraTherapy } from "../src/lib/mira/contract";

const bundle = (...texts: string[]): TheOracleGroundingBundle => ({
  version: THEORACLE_GROUNDING_CAPABILITY,
  corpus: { name: "TheOracle", indexSha256: "a".repeat(64), embeddingModel: { id: "m/x", revision: "e".repeat(40), dtype: "fp32", dims: 3 }, retrievedAt: "2026-10-11T00:00:00.000Z", reviewProvenance: "fixture" },
  queryDigest: "b".repeat(64),
  evidence: texts.map((text, i) => ({ evidenceId: `E${i + 1}`, text, retrievalRank: i + 1, similarity: 0.5, source: { title: `doc${i + 1}.pdf`, docSource: "uji", origin: "fixture", textSha256: "c".repeat(64) } })),
});
const therapy = (regimen: MiraTherapy["regimen"], extra: Partial<MiraTherapy> = {}): MiraTherapy => ({ forDiagnosis: { icd10: "J18.9", label: "Pneumonia" }, regimen, interactions: [], contraindications: [], ...extra });
const drug = (name: string, dose: string) => ({ drug: name, dose, route: "PO", duration: "5 hari", note: "" });
const pneumonia = { icd10: "J18.9", label: "Pneumonia" };

describe("clinical evidence gate", () => {
  it("verifies an English-spelled drug and its strength against an Indonesian passage", () => {
    const { therapy: out, report } = gateTherapy(therapy([drug("Amoxicillin", "3x500mg")]), bundle("Pneumonia: amoksisilin 500 mg 3 kali sehari selama 5 hari."), pneumonia);
    expect(out?.regimen[0].dose).toBe("3x500mg");
    expect(report.drugs).toEqual([{ drug: "Amoxicillin", dose: "3x500mg", status: "verified", evidenceIds: ["E1"] }]);
  });
  it("blanks a dose whose strength is not in a passage naming the drug", () => {
    const { therapy: out, report } = gateTherapy(therapy([drug("Amoxicillin", "3x500mg")]), bundle("Amoksisilin 250 mg untuk anak."), pneumonia);
    expect(out?.regimen[0]).toMatchObject({ drug: "Amoxicillin", dose: "" });
    expect(report.drugs[0].status).toBe("doseRemoved");
  });
  it("removes a drug that no passage names, and its contraindications", () => {
    const { therapy: out, report } = gateTherapy(therapy([drug("Amoxicillin", "3x500mg"), drug("Levofloxacin", "1x750mg")], { contraindications: ["Levofloxacin: anak", "Amoxicillin: alergi penisilin"] }), bundle("Amoksisilin 500 mg. Kontraindikasi amoksisilin: alergi penisilin."), pneumonia);
    expect(out?.regimen.map(r => r.drug)).toEqual(["Amoxicillin"]);
    expect(out?.contraindications).toEqual(["Amoxicillin: alergi penisilin"]);
    expect(report.drugs[1]).toMatchObject({ drug: "Levofloxacin", status: "removed" });
  });
  it("marks a contraindication no passage supports", () => {
    const { therapy: out } = gateTherapy(therapy([drug("Paracetamol", "3x500mg")], { contraindications: ["Paracetamol: gangguan hati berat"], interactions: ["Paracetamol dengan warfarin: INR naik"] }), bundle("Parasetamol 500 mg bila demam."), pneumonia);
    expect(out?.contraindications).toEqual(["Paracetamol: gangguan hati berat (belum terverifikasi)"]);
    expect(out?.interactions).toEqual(["Paracetamol dengan warfarin: INR naik (belum terverifikasi)"]);
  });
  it("removes therapy written for another diagnosis category", () => {
    const { therapy: out, report } = gateTherapy(therapy([drug("Amoxicillin", "3x500mg")], { forDiagnosis: { icd10: "J02.9", label: "Pharyngitis" } }), bundle("Amoksisilin 500 mg."), pneumonia);
    expect(out).toBeUndefined();
    expect(report).toMatchObject({ therapyRemoved: true, reason: "Terapi ditulis untuk diagnosis lain (J02.9), bukan J18.9." });
  });
  it("removes all therapy when there is no evidence bundle", () => {
    const { therapy: out, report } = gateTherapy(therapy([drug("Amoxicillin", "3x500mg")]), undefined, pneumonia);
    expect(out).toBeUndefined();
    expect(report).toMatchObject({ therapyRemoved: true, reason: "Referensi TheOracle untuk terapi tidak tersedia; dosis tidak ditampilkan." });
  });
  it("accepts a gram strength written as gram", () => {
    const { report } = gateTherapy(therapy([drug("Ceftriaxone", "1x2g")]), bundle("Seftriakson 2 gram IV dosis tunggal."), pneumonia);
    expect(report.drugs[0].status).toBe("verified");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/theoracle-evidence-gate.test.ts`
Expected: FAIL, cannot resolve `../src/lib/theoracle-evidence-gate`.

- [ ] **Step 3: Write the implementation**

```ts
import type { MiraTherapy } from "./mira/contract";
import type { TheOracleGroundingBundle } from "./theoracle-grounding-types";

export type GateStatus = "verified" | "doseRemoved" | "removed";
export interface GateDrug { drug: string; dose: string; status: GateStatus; evidenceIds: string[] }
export interface EvidenceGateReport { forDiagnosis: { icd10: string; label: string }; therapyRemoved: boolean; reason: string; drugs: GateDrug[] }

const UNVERIFIED = " (belum terverifikasi)";
const UNIT: Record<string, string> = { mg: "(?:mg|miligram)", mcg: "(?:mcg|µg|mikrogram)", "µg": "(?:mcg|µg|mikrogram)", g: "(?:g|gram)", iu: "(?:iu|ui|unit)", ml: "(?:ml|mililiter)" };
const SAFETY_TERM = /kontraindikasi|interaksi|hindari|jangan diberikan/;

// English and Indonesian spellings of generic names converge: amoxicillin and amoksisilin -> amoksisilin.
function spell(word: string): string {
  return word.replace(/ph/g, "f").replace(/th/g, "t").replace(/x/g, "ks").replace(/c(?=[eiy])/g, "s").replace(/c/g, "k").replace(/y/g, "i").replace(/(.)\1+/g, "$1").replace(/(.{4,})e$/, "$1");
}
const tokens = (text: string) => text.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z]+/).filter(Boolean).map(spell);
const names = (drug: string) => tokens(drug).filter(word => word.length >= 4);
const mentions = (passage: string[], drug: string) => { const wanted = names(drug); return wanted.length > 0 && wanted.every(word => passage.includes(word)); };
const strengths = (dose: string) => [...dose.toLowerCase().matchAll(/(\d+(?:[.,]\d+)?)\s*(mcg|µg|mg|g|iu|ml)\b/g)].map(m => new RegExp(`(?<![\\d.,])${m[1].replace(/[.,]/, "[.,]")}\\s*${UNIT[m[2]]}\\b`, "i"));

export function gateTherapy(therapy: MiraTherapy, bundle: TheOracleGroundingBundle | undefined, diagnosis: { icd10: string; label: string } | undefined): { therapy: MiraTherapy | undefined; report: EvidenceGateReport } {
  const forDiagnosis = therapy.forDiagnosis;
  const removed = (reason: string) => ({ therapy: undefined, report: { forDiagnosis, therapyRemoved: true, reason, drugs: therapy.regimen.map((r): GateDrug => ({ drug: r.drug, dose: r.dose, status: "removed", evidenceIds: [] })) } });
  if (!bundle?.evidence.length) return removed("Referensi TheOracle untuk terapi tidak tersedia; dosis tidak ditampilkan.");
  if (!diagnosis || forDiagnosis.icd10.trim().toUpperCase().slice(0, 3) !== diagnosis.icd10.trim().toUpperCase().slice(0, 3)) return removed(`Terapi ditulis untuk diagnosis lain (${forDiagnosis.icd10}), bukan ${diagnosis?.icd10 ?? "diagnosis kerja"}.`);
  const passages = bundle.evidence.map(item => ({ id: item.evidenceId, text: item.text, words: tokens(item.text) }));
  const drugs = therapy.regimen.map((r): GateDrug => {
    const naming = passages.filter(p => mentions(p.words, r.drug));
    if (!naming.length) return { drug: r.drug, dose: r.dose, status: "removed", evidenceIds: [] };
    const patterns = strengths(r.dose);
    const dosing = patterns.length ? naming.filter(p => patterns.every(pattern => pattern.test(p.text))) : [];
    return dosing.length ? { drug: r.drug, dose: r.dose, status: "verified", evidenceIds: dosing.map(p => p.id) } : { drug: r.drug, dose: r.dose, status: "doseRemoved", evidenceIds: naming.map(p => p.id) };
  });
  const kept = therapy.regimen.filter((_, i) => drugs[i].status !== "removed");
  const safety = (items: string[]) => items.flatMap(item => {
    const drug = kept.find(r => mentions(tokens(item), r.drug));
    if (!drug) return [];
    const supported = passages.some(p => mentions(p.words, drug.drug) && SAFETY_TERM.test(p.text.toLowerCase()));
    return [supported ? item : item + UNVERIFIED];
  });
  const gated: MiraTherapy = { forDiagnosis, regimen: kept.map(r => drugs[therapy.regimen.indexOf(r)].status === "verified" ? r : { ...r, dose: "" }), interactions: safety(therapy.interactions), contraindications: safety(therapy.contraindications) };
  const reason = kept.length ? "" : "Tidak ada obat yang indikasinya terverifikasi di TheOracle.";
  return { therapy: kept.length ? gated : undefined, report: { forDiagnosis, therapyRemoved: !kept.length, reason, drugs } };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/theoracle-evidence-gate.test.ts`
Expected: 7 passed. Then `npx tsc --noEmit` (0) and `npx eslint src/lib/theoracle-evidence-gate.ts tests/theoracle-evidence-gate.test.ts` (0).

- [ ] **Step 5: Commit**

```bash
git add src/lib/theoracle-evidence-gate.ts tests/theoracle-evidence-gate.test.ts
git commit -m "feat(sentrapedia): clinical evidence gate for therapy doses (R2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Targeted therapy retrieval

**Files:**
- Modify: `src/lib/theoracle-grounding.ts` (add an export after `retrieveTheOracleGrounding`; reuse `loaded`, `loadIndex`, `localEmbedder`, `evidenceText`, `sourceTriggersMiraPrivacy`, `freezeBundle`, `DOSE`, `REVIEW_PROVENANCE`)
- Modify: `scripts/benchmark-theoracle-grounding.mjs` (targeted dose recall)
- Test: `tests/theoracle-grounding.test.ts`

**Interfaces:**
- Produces: `retrieveTheOracleTherapyGrounding(caseData: CaseState, diagnosis: { icd10: string; label: string }, options?: RetrieveOptions): Promise<TheOracleGroundingBundle>`; throws `TheOracleGroundingError` (`THEORACLE_NO_MATCH`, `THEORACLE_UNAVAILABLE`) like the existing function.

- [ ] **Step 1: Write the failing test** (append inside the existing `describe` in `tests/theoracle-grounding.test.ts`; import `retrieveTheOracleTherapyGrounding` next to `retrieveTheOracleGrounding`)

```ts
  it("retrieves therapy for a diagnosis: dose passages first, then others, with patient context in the query", async () => {
    const calls: string[] = [];
    const embedder = async () => async (text: string) => { calls.push(text); return Float32Array.from([0, 0, 1]); };
    const bundle = await retrieveTheOracleTherapyGrounding({ ...caseFor("batuk"), demographics: { ageYears: 30, sex: "F", pregnant: true }, currentMedications: ["warfarin"] }, { icd10: "J18.9", label: "Pneumonia" }, { indexDir: fixtureIndex(), embedder });
    expect(validTheOracleGrounding(bundle)).toBe(true);
    expect(calls).toEqual(["task: search result | query: Pneumonia (J18.9)\npenatalaksanaan terapi dosis obat\n30 tahun, perempuan, hamil\nObat rutin: warfarin"]);
    expect(bundle.evidence.map(item => item.evidenceId)).toEqual(["D1", "A2", "A1", "B1"]);
  });
```

Why this order (query vector `[0,0,1]`, ties keep fixture order): dose pass takes D1 (D2 has a dose but trips the privacy guard) and A2; the other pass takes A1, skips A3 (third Pneumonia passage, cap 2) and C1 (privacy), takes B1.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/theoracle-grounding.test.ts`
Expected: FAIL, `retrieveTheOracleTherapyGrounding` is not exported.

- [ ] **Step 3: Implement**

```ts
const THERAPY_DOSE_EVIDENCE = 4;

function therapyQuery(caseData: CaseState, diagnosis: { icd10: string; label: string }): string {
  const { ageYears, sex, pregnant } = caseData.demographics;
  const patient = [ageYears === null ? "" : `${ageYears} tahun`, sex === "M" ? "laki-laki" : sex === "F" ? "perempuan" : "", pregnant ? "hamil" : ""].filter(Boolean).join(", ");
  return [
    `${diagnosis.label} (${diagnosis.icd10})`,
    THERAPY_QUERY.trim(),
    patient,
    caseData.knownConditions.length ? `Kondisi: ${caseData.knownConditions.join(", ")}` : "",
    caseData.currentMedications.length ? `Obat rutin: ${caseData.currentMedications.join(", ")}` : "",
  ].filter(Boolean).join("\n");
}

// Therapy is retrieved for the diagnosis the diagnosis step chose, so its treatment and dose passages reach the therapy step.
export async function retrieveTheOracleTherapyGrounding(caseData: CaseState, diagnosis: { icd10: string; label: string }, options: RetrieveOptions = {}): Promise<TheOracleGroundingBundle> {
  const query = therapyQuery(caseData, diagnosis);
  const indexDir = options.indexDir ?? path.join(process.cwd(), "theoracle", "index");
  const modelDir = options.modelDir ?? path.join(process.cwd(), "theoracle", "model");
  if (!loaded.has(indexDir)) loaded.set(indexDir, loadIndex(indexDir, modelDir, options.embedder ?? localEmbedder).catch(error => { loaded.delete(indexDir); throw error; }));
  const { manifest, chunks, vectors, embed } = await loaded.get(indexDir)!;
  let q: Float32Array;
  try { q = await embed(manifest.prefixes.query + query); } catch { throw unavailable("Embedding lokal TheOracle gagal. Analisis tidak dijalankan."); }
  const dims = manifest.model.dims;
  const scores = new Float32Array(chunks.length);
  for (let i = 0; i < chunks.length; i++) { let s = 0; const offset = i * dims; for (let k = 0; k < dims; k++) s += q[k] * vectors[offset + k]; scores[i] = s; }
  const ranked = [...scores.keys()].sort((a, b) => scores[b] - scores[a]);
  const selected: Omit<TheOracleGroundingEvidence, "retrievalRank">[] = [];
  const perDocument = new Map<string, number>();
  for (const wantDose of [true, false]) {
    for (const i of ranked) {
      if (selected.length >= (wantDose ? THERAPY_DOSE_EVIDENCE : MAX_EVIDENCE)) break;
      const chunk = chunks[i];
      if (DOSE.test(chunk.text) !== wantDose || (perDocument.get(chunk.title) ?? 0) >= MAX_PER_DOCUMENT) continue;
      const item = { evidenceId: chunk.id, text: evidenceText(chunk.text), similarity: Math.round(scores[i] * 10_000) / 10_000, source: { title: chunk.title, docSource: chunk.docSource, origin: chunk.origin, textSha256: chunk.textSha256 } };
      if (!item.text || sourceTriggersMiraPrivacy(item)) continue;
      perDocument.set(chunk.title, (perDocument.get(chunk.title) ?? 0) + 1);
      selected.push(item);
    }
  }
  if (!selected.length) throw new TheOracleGroundingError("THEORACLE_NO_MATCH", "TheOracle tidak menemukan referensi terapi untuk diagnosis ini.");
  return freezeBundle({
    version: THEORACLE_GROUNDING_CAPABILITY,
    corpus: { name: "TheOracle", indexSha256: manifest.indexSha256, embeddingModel: { id: manifest.model.id, revision: manifest.model.revision, dtype: manifest.model.dtype, dims }, retrievedAt: (options.now ?? (() => new Date()))().toISOString(), reviewProvenance: REVIEW_PROVENANCE },
    queryDigest: sha256(query),
    evidence: selected.map((item, index) => ({ ...item, retrievalRank: index + 1 })),
  });
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/theoracle-grounding.test.ts` → all pass (9). `npx tsc --noEmit` → 0. `npx eslint src/lib/theoracle-grounding.ts tests/theoracle-grounding.test.ts` → 0.

- [ ] **Step 5: Benchmark the targeted retrieval** — in `scripts/benchmark-theoracle-grounding.mjs`:
  - import `retrieveTheOracleTherapyGrounding` from the compiled module next to `retrieveTheOracleGrounding`;
  - inside the dose-recall block, after `doseRows.push(...)`, add a targeted measurement with the gold disease taken from the first gold title:

```js
      const label = item.gold[0].replace(/\.\w+$/, "").replace(/-\d{4}$/, "").replaceAll("-", " ");
      const tick2 = performance.now();
      const targeted = await retrieveTheOracleTherapyGrounding(caseFor(item.query), { icd10: "", label }, { indexDir });
      targetedLatency.push(performance.now() - tick2);
      const tdose = targeted.evidence.filter(e => DOSE.test(e.text));
      targetedRows.push({ id: item.id, label, hit: tdose.some(e => item.gold.includes(e.source.title) || stems.some(stem => e.text.toLowerCase().includes(stem))), doseTitles: tdose.map(e => e.source.title) });
```

  - declare `const targetedRows = [], targetedLatency = [];` next to `doseRows`;
  - in the output add `targetedDoseRecall: { hits, total, rate, latencyMs: { median: pct(targetedLatency, 0.5), p95: pct(targetedLatency, 0.95) }, rows: targetedRows }` computed like `doseRecall`.
  - `caseFor` in the script lacks `demographics`; change it to `({ demographics: { ageYears: null, sex: "unknown" }, chiefComplaint: complaint, anamnesis: {}, physicalExam: [], results: [], currentMedications: [], knownConditions: [] })`.

Run: `node scripts/benchmark-theoracle-grounding.mjs > docs/verification/theoracle-eval-2026-10-11/dose-recall-targeted.json`
Expected: exit 0, `indexUnchanged: true`, `targetedDoseRecall.rate` reported (compare with 0.754 complaint + treatment, 0.508 complaint-only). Record the number in the commit message.

- [ ] **Step 6: Commit**

```bash
git add src/lib/theoracle-grounding.ts tests/theoracle-grounding.test.ts scripts/benchmark-theoracle-grounding.mjs docs/verification/theoracle-eval-2026-10-11/dose-recall-targeted.json
git commit -m "feat(sentrapedia): TheOracle therapy retrieval targeted at the diagnosis (R2)" -m "Targeted dose recall <rate> (complaint+treatment 0.754, complaint 0.508)." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: MIRA — `omitTherapy` and `/v1/therapy/step`

**Files:**
- Modify: `mira/service/contract/mira-step-request.schema.json` (add `"omitTherapy": { "type": "boolean" }` under `properties`)
- Modify: `mira/service/contract.py` (therapy request/response validators)
- Modify: `mira/service/prompts.py` (add `targeted_therapy_messages`)
- Modify: `mira/service/engine.py` (`run(..., omit_therapy)`, `_fast_assessment(..., therapy)`, new `run_therapy`)
- Modify: `mira/service/app.py` (shared handler, new route, capability)
- Modify: `mira/SOURCE.json`, `mira/service/tests/test_packaging.py`
- Test: `mira/service/tests/test_step_api.py`

**Interfaces:**
- Consumes: existing `StepEngine._race`, `THERAPY_RESPONSE_FORMAT`, `_complete_therapy`, `postchecks.resolve_code`, `postchecks.icd_codes`.
- Produces:
  - HTTP `POST /v1/therapy/step`, request `{contractVersion: "1", traceId, case, diagnosis: {icd10, label}, grounding}` (grounding required), response `{contractVersion: "1", status: "ok", therapy, meta}` or `{contractVersion: "1", status: "unavailable", error: {code, message}, meta}`.
  - Step request accepts `omitTherapy: true` → response has no `therapy` and no therapy calls are made.
  - `/healthz` `capabilities` includes `"theoracle-targeted-therapy-v1"`.

- [ ] **Step 1: Write the failing tests** (append to `mira/service/tests/test_step_api.py`; `fast_outputs`, `diagnosis_part`, `workup_part`, `therapy_part`, `theoracle_grounding`, `audit_lines` already exist in that file)

```python
THERAPY = "/v1/therapy/step"


def therapy_request(example_request: dict, **overrides) -> dict:
    return {"contractVersion": "1", "traceId": "t-therapy", "case": example_request["case"],
            "diagnosis": {"icd10": "K35.8", "label": "Acute appendicitis"}, "grounding": theoracle_grounding(), **overrides}


def test_step_can_omit_therapy(make_client, example_request):
    client, fake = make_client(fast_outputs([completion(diagnosis_part(), "gpt-4o")], [completion(workup_part(), "gpt-4o")]),
                               fast_assessment=True, fast_therapy=True)
    body = post(client, {**example_request, "omitTherapy": True}).json()
    assert body["status"] == "ok"
    assert "therapy" not in body
    assert [c["response_format"]["json_schema"]["name"] for c in fake.calls].count("step_therapy") == 0


def test_therapy_step_writes_therapy_for_the_given_diagnosis(make_client, example_request, settings):
    client, fake = make_client([completion(therapy_part(), "gpt-4o")] * FAST_COPIES, fast_assessment=True, fast_therapy=True)
    response = client.post(THERAPY, content=json.dumps(therapy_request(example_request)), headers=AUTH)
    body = response.json()
    assert response.status_code == 200
    assert body["status"] == "ok"
    assert body["therapy"]["forDiagnosis"]["icd10"] == "K35.8"
    assert body["meta"]["costUsd"] > 0
    user = fake.calls[0]["messages"][1]["content"]
    assert "Diagnosis to treat: Acute appendicitis (K35.8)" in user
    assert "THEORACLE_QUOTE" in user
    [record] = audit_lines(settings)
    assert {c["role"] for c in record["calls"]} == {"therapy"}


def test_therapy_step_requires_grounding_and_diagnosis(make_client, example_request):
    client, fake = make_client([])
    for missing in ("grounding", "diagnosis"):
        request = therapy_request(example_request)
        del request[missing]
        assert client.post(THERAPY, content=json.dumps(request), headers=AUTH).status_code == 400
    assert fake.calls == []


def test_therapy_step_failure_is_unavailable(make_client, example_request):
    client, _ = make_client([RuntimeError("down")] * FAST_COPIES, fast_assessment=True, fast_therapy=True)
    body = client.post(THERAPY, content=json.dumps(therapy_request(example_request)), headers=AUTH).json()
    assert body["status"] == "unavailable"
    assert "therapy" not in body


def test_healthz_advertises_targeted_therapy(make_client):
    client, _ = make_client([])
    assert "theoracle-targeted-therapy-v1" in client.get("/healthz").json()["capabilities"]
```

Check the `completion` import already exists at the top of the file (it does: `from .conftest import AUTH, assessment, completion, model_outputs, with_case`).

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test:mira`
Expected: the five new tests FAIL (400 on `omitTherapy` as an extra field, 404 on `/v1/therapy/step`, missing capability).

- [ ] **Step 3: Implement**

`mira/service/contract/mira-step-request.schema.json` — inside the top-level `"properties"` add:

```json
    "omitTherapy": { "type": "boolean", "description": "Sentrapedia: skip the therapy part; therapy is requested separately from /v1/therapy/step." }
```

`mira/service/contract.py` — after `RESPONSE = ...`:

```python
def _therapy_schemas() -> tuple[Draft202012Validator, Draft202012Validator]:
    """The therapy step reuses the step contract: the same case and grounding, the same therapy object."""
    request = json.loads((CONTRACT_DIR / "mira-step-request.schema.json").read_text(encoding="utf-8"))
    del request["properties"]["omitTherapy"]
    request["properties"]["diagnosis"] = {
        "type": "object", "required": ["icd10", "label"], "additionalProperties": False,
        "properties": {"icd10": {"type": "string", "minLength": 1, "maxLength": 16},
                       "label": {"type": "string", "minLength": 1, "maxLength": 300}},
    }
    request["required"] = [*request["required"], "diagnosis", "grounding"]
    step = json.loads((CONTRACT_DIR / "mira-step-response.schema.json").read_text(encoding="utf-8"))
    response = {
        "$schema": step["$schema"], "type": "object", "required": ["contractVersion", "status", "meta"],
        "additionalProperties": False, "$defs": step.get("$defs", {}),
        "properties": {key: step["properties"][key] for key in ("contractVersion", "status", "therapy", "error", "meta")},
    }
    return Draft202012Validator(request), Draft202012Validator(response)


THERAPY_REQUEST, THERAPY_RESPONSE = _therapy_schemas()
```

The step response schema has top-level properties `contractVersion, status, differential, evidence, missingInformation, nextBestActions, disposition, unfilled, error, therapy, meta`; the five reused ones keep their definitions.

`mira/service/prompts.py` — after `fast_assessment_messages`:

```python
def targeted_therapy_messages(case: dict, diagnosis: dict, provisional_differential: bool, grounding: dict) -> list[dict]:
    """Therapy for the diagnosis the diagnosis step chose, from excerpts retrieved for that diagnosis."""
    messages = fast_assessment_messages(case, provisional_differential, therapy=True, grounding=grounding)
    messages[1]["content"] += (
        f"\n\nDiagnosis to treat: {diagnosis['label']} ({diagnosis['icd10']}). It was chosen by the diagnosis step; "
        "write therapy for this diagnosis only and set forDiagnosis to it."
    )
    return messages
```

`mira/service/engine.py`:
- import `targeted_therapy_messages` and `THERAPY_RESPONSE`;
- change `_fast_assessment(self, guard, case, deadline, grounding=None)` to `_fast_assessment(self, guard, case, deadline, grounding=None, therapy=True)` and replace both `if s.fast_therapy:` inside it with `if therapy:`;
- change `run(self, case, grounding=None)` to `run(self, case, grounding=None, omit_therapy=False)`, add `therapy = s.fast_therapy and not omit_therapy` at its top, use `(3 if therapy else 2) * FAST_COPIES` for `max_calls`, and call `self._fast_assessment(guard, case, deadline, grounding, therapy)`;
- add:

```python
    def therapy_unavailable(self, code: str, message: str, guard: ApiGuard | None = None) -> dict:
        cost = round(guard.cost_usd, 6) if guard else 0.0
        return {"contractVersion": CONTRACT_VERSION, "status": "unavailable", "error": {"code": code, "message": message},
                "meta": {"version": self.version, "model": self.model, "costUsd": cost}}

    async def run_therapy(self, case: dict, diagnosis: dict, grounding: dict) -> tuple[dict, ApiGuard, list[str]]:
        """Therapy for a diagnosis chosen by an earlier step, grounded on excerpts retrieved for it."""
        s = self.settings
        guard = ApiGuard(max_calls=FAST_COPIES, max_usd=s.max_usd_per_step, provider=s.llm_provider)
        if self.budget.exhausted():
            return self.therapy_unavailable("BUDGET_EXHAUSTED", "Daily model budget reached."), guard, []
        if self.breaker.is_open():
            return self.therapy_unavailable("API_ERRORS", "Model calls paused after repeated API errors."), guard, []
        deadline = time.monotonic() + s.step_deadline_s
        notes: list[str] = []
        try:
            async with asyncio.timeout(s.step_deadline_s):
                content = await self._race(
                    guard, "therapy", deadline, _complete_therapy,
                    messages=targeted_therapy_messages(case, diagnosis, s.provisional_differential, grounding),
                    response_format=THERAPY_RESPONSE_FORMAT, temperature=s.assess_temperature,
                )
            therapy = content["therapy"]
            target = therapy["forDiagnosis"]
            code, note = postchecks.resolve_code(target["icd10"], target["label"], postchecks.icd_codes())
            if note:
                notes.append(f"therapy: {note}")
            therapy = {**therapy, "forDiagnosis": {**target, "icd10": code or target["icd10"]}}
        except TimeoutError:
            response = self.therapy_unavailable("TIMEOUT", f"Step deadline of {s.step_deadline_s:g} s reached.", guard)
            self.budget.add(guard.cost_usd)
            return response, guard, []
        except RunAborted as exc:
            response = self.therapy_unavailable("STEP_BUDGET_EXCEEDED", str(exc), guard)
            self.budget.add(guard.cost_usd)
            return response, guard, []
        except StepFailed as exc:
            response = self.therapy_unavailable(exc.code, exc.message, guard)
            self.budget.add(guard.cost_usd)
            return response, guard, []
        except (KeyError, TypeError) as exc:
            response = self.therapy_unavailable("MODEL_OUTPUT_INVALID", type(exc).__name__, guard)
            self.budget.add(guard.cost_usd)
            return response, guard, []
        response = {"contractVersion": CONTRACT_VERSION, "status": "ok", "therapy": therapy,
                    "meta": {"version": self.version, "model": self.model, "costUsd": round(guard.cost_usd, 6)}}
        problems = errors(THERAPY_RESPONSE, response)
        if problems:
            response = self.therapy_unavailable("CONTRACT_MISMATCH", "; ".join(problems[:5]), guard)
        self.budget.add(guard.cost_usd)
        return response, guard, notes
```

`postchecks.icd_codes()` is the cached WHO code set that `postchecks.apply` already uses.

`mira/service/app.py`:
- `from .contract import CONTRACT_VERSION, REQUEST, THERAPY_REQUEST, errors`;
- add `TARGETED_THERAPY_CAPABILITY = "theoracle-targeted-therapy-v1"` next to `GROUNDING_CAPABILITY` and list both in `/healthz` `capabilities`;
- turn the body of `step(request)` into `async def handle(request: Request, validator, run) -> JSONResponse:` (unchanged except `errors(validator, payload)` and `response, guard, notes = await run(step_engine, payload)`), then:

```python
    @app.post("/v1/diagnosis/step")
    async def step(request: Request) -> JSONResponse:
        return await handle(request, REQUEST, lambda e, p: e.run(p["case"], p.get("grounding"), p.get("omitTherapy", False)))

    @app.post("/v1/therapy/step")
    async def therapy_step(request: Request) -> JSONResponse:
        return await handle(request, THERAPY_REQUEST, lambda e, p: e.run_therapy(p["case"], p["diagnosis"], p["grounding"]))
```

- [ ] **Step 4: Update package hashes**

For each changed file (`service/app.py`, `service/engine.py`, `service/prompts.py`, `service/contract.py`, `service/contract/mira-step-request.schema.json`, `service/tests/test_step_api.py`, and `service/tests/test_packaging.py` if it is listed), replace its `packagedSha256` in `mira/SOURCE.json` with `sha256sum mira/<path>`. Add `"service/engine.py"` and `"service/contract.py"` to the allowlist list in `test_packaged_engine_and_schemas_match_the_recorded_source` if they are not there.

- [ ] **Step 5: Run the tests**

Run: `npm run test:mira`
Expected: all pass (previous 173 + 5 new, 1 skipped), exit 0.

- [ ] **Step 6: Commit**

```bash
git add mira
git commit -m "feat(sentrapedia): MIRA therapy step for a given diagnosis and omitTherapy (R2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Gateway orchestration, flag, timeouts and stage logs

**Files:**
- Modify: `src/lib/mira/gateway.ts`
- Modify: `src/lib/mira/model-profile.ts` (add `miraTargetedGatewayTimeoutMs`)
- Modify: `src/app/api/mira/route.ts`
- Modify: `src/lib/mira/contract.ts` (`MiraAnalysis` optional fields)
- Test: `tests/mira-pipeline.test.ts` (new)

**Interfaces:**
- Consumes: `gateTherapy`, `EvidenceGateReport` (Task 1); `retrieveTheOracleTherapyGrounding` (Task 2); MIRA endpoints (Task 3).
- Produces:
  - `Options` gains `retrieveTherapyGrounding?: (caseData: CaseState, diagnosis: { icd10: string; label: string }) => Promise<TheOracleGroundingBundle>`, `targetedTherapy?: boolean`, `log?: (entry: StageLog) => void`.
  - `export interface StageLog { traceId: string; stage: string; ms: number; ok: boolean; code?: string }`
  - Reply body: `{ result, traceId, createdAt, grounding, therapyGrounding?, evidenceGate?, pipeline: { path: "targeted" | "legacy", stages: StageLog[] } }`.
  - `MiraAnalysis` gains `therapyGrounding?: TheOracleGroundingBundle; evidenceGate?: EvidenceGateReport`.
  - `model-profile.ts`: `export const miraTargetedGatewayTimeoutMs = (2 * profile.stepDeadlineS + profile.gatewayMarginS) * 1000;`

- [ ] **Step 1: Write the failing tests** (`tests/mira-pipeline.test.ts`)

```ts
import { describe, expect, it } from "vitest";
import { selectedMiraModel } from "../src/lib/mira/model-profile";
import { createMiraGateway, type StageLog } from "../src/lib/mira/gateway";
import { emptyCase } from "../src/lib/mira/contract";
import { THEORACLE_GROUNDING_CAPABILITY, TheOracleGroundingError, type TheOracleGroundingBundle } from "../src/lib/theoracle-grounding-types";

const version = `mira-service/test+contract=1+provider=openrouter+data=synthetic-only+plan=${selectedMiraModel}+assess=${selectedMiraModel}+experimental`;
const meta = { version, model: `${selectedMiraModel}+${selectedMiraModel}`, costUsd: 0.01 };
const input = () => new Request("http://127.0.0.1:3104/api/mira", { method: "POST", headers: { Origin: "http://127.0.0.1:3104", "Content-Type": "application/json" }, body: JSON.stringify({ case: { ...emptyCase(), chiefComplaint: "Batuk demam fiktif" }, synthetic: true }) });
const bundle = (text: string): TheOracleGroundingBundle => ({ version: THEORACLE_GROUNDING_CAPABILITY, corpus: { name: "TheOracle", indexSha256: "a".repeat(64), embeddingModel: { id: "onnx-community/embeddinggemma-300m-ONNX", revision: "e".repeat(40), dtype: "fp32", dims: 768 }, retrievedAt: "2026-10-11T12:00:00.000Z", reviewProvenance: "fixture" }, queryDigest: "b".repeat(64), evidence: [{ evidenceId: "E1", text, retrievalRank: 1, similarity: 0.6, source: { title: "ppk.pdf", docSource: "uji", origin: "fixture", textSha256: "c".repeat(64) } }] });
const diagnosisResult = (likely: { icd10: string; label: string; confidenceTier: string }[]) => ({ contractVersion: "1", status: "ok", differential: { likely, alternatives: [], cannotMiss: [] }, evidence: [], missingInformation: [], nextBestActions: [], disposition: null, unfilled: [], meta });
const pneumonia = { icd10: "J18.9", label: "Pneumonia", confidenceTier: "low" };
const therapy = { forDiagnosis: { icd10: "J18.9", label: "Pneumonia" }, regimen: [{ drug: "Amoxicillin", dose: "3x500mg", route: "PO", duration: "5 hari", note: "" }, { drug: "Levofloxacin", dose: "1x750mg", route: "PO", duration: "5 hari", note: "" }], interactions: [], contraindications: [] };

function service(options: { capabilities?: string[]; likely?: typeof pneumonia[]; therapyStatus?: "ok" | "unavailable"; withTherapy?: boolean } = {}) {
  const posts: { path: string; body: Record<string, unknown> }[] = [];
  const fetchFn: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path === "/healthz") return Response.json({ status: "ok", contractVersion: "1", version, capabilities: options.capabilities ?? [THEORACLE_GROUNDING_CAPABILITY, "theoracle-targeted-therapy-v1"] });
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    posts.push({ path, body });
    if (path === "/v1/therapy/step") return Response.json(options.therapyStatus === "unavailable" ? { contractVersion: "1", status: "unavailable", error: { code: "MODEL_ERROR", message: "x" }, meta } : { contractVersion: "1", status: "ok", therapy, meta });
    return Response.json({ ...diagnosisResult(options.likely ?? [pneumonia]), ...(options.withTherapy ? { therapy } : {}) });
  };
  return { fetchFn, posts };
}
const gatewayWith = (fetchFn: typeof fetch, extra: Record<string, unknown> = {}) => {
  const logs: StageLog[] = [];
  const gateway = createMiraGateway({ model: selectedMiraModel, maxCostUsd: 0.1, token: "test-only", fetchFn, targetedTherapy: true, log: entry => logs.push(entry),
    retrieveGrounding: async () => bundle("Batuk dan demam."), retrieveTherapyGrounding: async (_case, diagnosis) => { expect(diagnosis).toEqual({ icd10: "J18.9", label: "Pneumonia" }); return bundle("Pneumonia: amoksisilin 500 mg 3 kali sehari."); }, ...extra });
  return { gateway, logs };
};

describe("targeted therapy pipeline", () => {
  it("runs diagnosis, targeted retrieval, therapy and the gate in order, with one log line per stage", async () => {
    const { fetchFn, posts } = service();
    const { gateway, logs } = gatewayWith(fetchFn);
    const body = await (await gateway.step(input())).json();
    expect(posts.map(p => p.path)).toEqual(["/v1/diagnosis/step", "/v1/therapy/step"]);
    expect(posts[0].body.omitTherapy).toBe(true);
    expect(posts[1].body.diagnosis).toEqual({ icd10: "J18.9", label: "Pneumonia" });
    expect(body.result.therapy.regimen).toEqual([{ drug: "Amoxicillin", dose: "3x500mg", route: "PO", duration: "5 hari", note: "" }]);
    expect(body.evidenceGate.drugs.map((d: { status: string }) => d.status)).toEqual(["verified", "removed"]);
    expect(body.therapyGrounding.evidence[0].evidenceId).toBe("E1");
    expect(body.pipeline.path).toBe("targeted");
    expect(logs.map(l => l.stage)).toEqual(["retrieve_dx", "mira_dx", "retrieve_tx", "mira_tx", "gate"]);
    expect(JSON.stringify(logs)).not.toContain("Batuk");
  });
  it("makes no therapy call when targeted retrieval fails, and returns the diagnosis", async () => {
    const { fetchFn, posts } = service();
    const { gateway, logs } = gatewayWith(fetchFn, { retrieveTherapyGrounding: async () => { throw new TheOracleGroundingError("THEORACLE_NO_MATCH", "x"); } });
    const response = await gateway.step(input());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(posts.map(p => p.path)).toEqual(["/v1/diagnosis/step"]);
    expect(body.result.therapy).toBeUndefined();
    expect(body.result.differential.likely[0].icd10).toBe("J18.9");
    expect(logs.find(l => l.stage === "retrieve_tx")).toMatchObject({ ok: false, code: "THEORACLE_NO_MATCH" });
  });
  it("skips therapy when the diagnosis step has no likely diagnosis", async () => {
    const { fetchFn, posts } = service({ likely: [] });
    const { gateway, logs } = gatewayWith(fetchFn);
    const body = await (await gateway.step(input())).json();
    expect(posts.map(p => p.path)).toEqual(["/v1/diagnosis/step"]);
    expect(body.result.therapy).toBeUndefined();
    expect(logs.map(l => l.stage)).toEqual(["retrieve_dx", "mira_dx"]);
  });
  it("returns the diagnosis without therapy when the therapy step is unavailable", async () => {
    const { fetchFn } = service({ therapyStatus: "unavailable" });
    const { gateway, logs } = gatewayWith(fetchFn);
    const body = await (await gateway.step(input())).json();
    expect(body.result.therapy).toBeUndefined();
    expect(logs.find(l => l.stage === "mira_tx")).toMatchObject({ ok: false, code: "MODEL_ERROR" });
  });
  it("falls back to the current path when MIRA lacks the capability, and still gates its therapy", async () => {
    const { fetchFn, posts } = service({ capabilities: [THEORACLE_GROUNDING_CAPABILITY], withTherapy: true });
    const { gateway, logs } = gatewayWith(fetchFn);
    const body = await (await gateway.step(input())).json();
    expect(posts).toHaveLength(1);
    expect(posts[0].body.omitTherapy).toBeUndefined();
    expect(body.pipeline.path).toBe("legacy");
    expect(logs.find(l => l.stage === "route")).toMatchObject({ ok: false, code: "TARGETED_UNAVAILABLE" });
    expect(body.evidenceGate.therapyRemoved).toBe(true);
    expect(body.result.therapy).toBeUndefined();
  });
  it("with the flag off, keeps the current single call and gates its therapy against the complaint bundle", async () => {
    const { fetchFn, posts } = service({ withTherapy: true });
    const { gateway } = gatewayWith(fetchFn, { targetedTherapy: false, retrieveGrounding: async () => bundle("Amoksisilin 500 mg untuk pneumonia.") });
    const body = await (await gateway.step(input())).json();
    expect(posts.map(p => p.path)).toEqual(["/v1/diagnosis/step"]);
    expect(body.pipeline.path).toBe("legacy");
    expect(body.result.therapy.regimen.map((r: { drug: string }) => r.drug)).toEqual(["Amoxicillin"]);
  });
});
```

In the capability-fallback test the legacy bundle is `"Batuk dan demam."`, which names no drug, so the gate removes the therapy; that is the expected safety behaviour.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/mira-pipeline.test.ts` → FAIL (no `StageLog` export, no targeted path).

- [ ] **Step 3: Implement in `gateway.ts`**

1. Imports: `import { gateTherapy, type EvidenceGateReport } from "../theoracle-evidence-gate";` and `type MiraResult` from `./contract`.
2. Extend `Options` and add `export interface StageLog { traceId: string; stage: string; ms: number; ok: boolean; code?: string }`.
3. In `serviceHealth`, add `targetedReady = groundingReady && body.capabilities.includes("theoracle-targeted-therapy-v1")` to the returned object (and to the initial `status` in `health()` as `targetedReady: false`; `health()` keeps returning only the existing fields plus nothing new to the UI — do not add `targetedReady` to the `reply` in `health()`).
4. Inside `step`, after `traceId`/`createdAt`:

```ts
      const stages: StageLog[] = [];
      const log = options.log ?? (entry => console.info(JSON.stringify({ event: "mira.stage", ...entry })));
      const record = (stage: string, started: number, ok: boolean, code?: string) => { const entry = { traceId, stage, ms: Math.round(performance.now() - started), ok, ...(code ? { code } : {}) }; stages.push(entry); log(entry); };
      const timed = async <T>(stage: string, run: () => Promise<T>, limitMs?: number): Promise<T> => {
        const started = performance.now();
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const value = await (limitMs ? Promise.race([run(), new Promise<never>((_, fail) => { timer = setTimeout(() => fail(new TheOracleGroundingError("THEORACLE_UNAVAILABLE", "Pencarian TheOracle melewati batas waktu.")), limitMs); })]) : run());
          record(stage, started, true);
          return value;
        } catch (error) {
          record(stage, started, false, error instanceof TheOracleGroundingError ? error.code : error instanceof ServiceFailure ? error.code : timedOut ? "TIMEOUT" : "ERROR");
          throw error;
        } finally { clearTimeout(timer); }
      };
      const postService = async (path: string, body: unknown): Promise<unknown> => {
        const serviceBody = JSON.stringify(body);
        if (new TextEncoder().encode(serviceBody).length > 65536) throw new ServiceFailure("INPUT");
        const response = await fetchFn(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-MIRA-Case-Origin": "synthetic" }, body: serviceBody, signal: controller.signal, cache: "no-store", redirect: "error" });
        if (!response.ok) throw new ServiceFailure("SERVICE");
        const raw = await boundedBody(response, 1048576);
        if (token.length > 8 && raw.includes(token)) throw new ServiceFailure("RESPONSE");
        return JSON.parse(raw);
      };
```

   with, at module level: `class ServiceFailure extends Error { constructor(readonly code: string) { super(code); } }` and `const RETRIEVAL_TIMEOUT_MS = 5000;`.
5. Replace the current retrieval + single `fetchFn` call with:

```ts
        const targeted = !!options.targetedTherapy && !!options.retrieveTherapyGrounding && health.targetedReady;
        if (options.targetedTherapy && !targeted) record("route", performance.now(), false, "TARGETED_UNAVAILABLE");
        const grounding = options.retrieveGrounding ? await timed("retrieve_dx", () => options.retrieveGrounding!(payload.case), RETRIEVAL_TIMEOUT_MS) : undefined;
        if (options.retrieveGrounding && !validTheOracleGrounding(grounding)) throw new TheOracleGroundingError("THEORACLE_UNAVAILABLE", "Referensi TheOracle tidak dapat diverifikasi.");
        controller.signal.throwIfAborted();
        let result: unknown;
        try { result = await timed("mira_dx", () => postService("/v1/diagnosis/step", { contractVersion: "1", traceId, case: payload.case, ...(grounding ? { grounding } : {}), ...(targeted ? { omitTherapy: true } : {}) })); }
        catch (error) { if (error instanceof ServiceFailure) return error.code === "INPUT" ? failure("INPUT", "Kasus dan referensi melebihi batas layanan.", 413) : error.code === "RESPONSE" ? failure("RESPONSE", "Respons layanan tidak dapat ditampilkan.", 502) : failure("SERVICE", "Layanan analisis menolak permintaan atau belum tersedia.", 502); throw error; }
```

   Keep the existing `validResult`, profile/cost check and `result.status !== "ok"` mapping unchanged after this.
6. Before the final `reply`, add the therapy stages and the gate:

```ts
        let final: MiraResult = result;
        let therapyGrounding: TheOracleGroundingBundle | undefined;
        const diagnosis = result.differential.likely[0];
        if (targeted && diagnosis) {
          try {
            const target = { icd10: diagnosis.icd10, label: diagnosis.label };
            therapyGrounding = await timed("retrieve_tx", () => options.retrieveTherapyGrounding!(payload.case, target), RETRIEVAL_TIMEOUT_MS);
            if (!validTheOracleGrounding(therapyGrounding)) throw new TheOracleGroundingError("THEORACLE_UNAVAILABLE", "Referensi terapi tidak dapat diverifikasi.");
            const bundle = therapyGrounding;
            const body = await timed("mira_tx", async () => {
              const value = await postService("/v1/therapy/step", { contractVersion: "1", traceId, case: payload.case, diagnosis: target, grounding: bundle });
              if (!value || typeof value !== "object" || !("status" in value) || value.status !== "ok") throw new ServiceFailure(value && typeof value === "object" && "error" in value && value.error && typeof value.error === "object" && "code" in value.error && typeof value.error.code === "string" ? value.error.code : "UNAVAILABLE");
              return value;
            });
            const merged = { ...result, therapy: "therapy" in body ? body.therapy : undefined };
            const cost = "meta" in body && body.meta && typeof body.meta === "object" && "costUsd" in body.meta ? body.meta.costUsd : null;
            if (validResult(merged) && typeof cost === "number" && Number.isFinite(cost) && cost >= 0 && cost <= maxCostUsd) final = merged;
            else record("mira_tx_contract", performance.now(), false, "CONTRACT");
          } catch (error) {
            // A stage failure leaves the diagnosis without therapy; an overall timeout or cancel still ends the request.
            if (controller.signal.aborted) throw error;
            therapyGrounding = undefined;
          }
        }
        let evidenceGate: EvidenceGateReport | undefined;
        if (final.therapy) {
          const gated = await timed("gate", async () => gateTherapy(final.therapy!, targeted ? therapyGrounding : grounding, diagnosis ? { icd10: diagnosis.icd10, label: diagnosis.label } : undefined));
          evidenceGate = gated.report;
          const { therapy: _dropped, ...withoutTherapy } = final;
          final = gated.therapy ? { ...final, therapy: gated.therapy } : withoutTherapy;
        }
        return reply({ result: final, traceId, createdAt, ...(grounding ? { grounding } : {}), ...(therapyGrounding ? { therapyGrounding } : {}), ...(evidenceGate ? { evidenceGate } : {}), pipeline: { path: targeted ? "targeted" : "legacy", stages } });
```

   `_dropped` is an unused binding; if `@typescript-eslint/no-unused-vars` flags it, instead build `withoutTherapy` with `const withoutTherapy = { ...final }; delete withoutTherapy.therapy;` (typed `MiraResult`, whose `therapy` is optional).
   The order of stage logs in the happy path is `retrieve_dx, mira_dx, retrieve_tx, mira_tx, gate` (the `route` entry appears only on fallback).
7. `model-profile.ts`: add `miraTargetedGatewayTimeoutMs` as in Interfaces.
8. `route.ts`:

```ts
import { retrieveTheOracleGrounding, retrieveTheOracleTherapyGrounding } from "../../../lib/theoracle-grounding";
import { selectedMiraModel, miraStepBudgetUsd, miraGatewayTimeoutMs, miraTargetedGatewayTimeoutMs } from "../../../lib/mira/model-profile";
const targetedTherapy = process.env.MIRA_TARGETED_THERAPY === "true";
const gateway = createMiraGateway({ baseUrl: process.env.MIRA_SERVICE_URL, token: process.env.MIRA_SERVICE_TOKEN, model: selectedMiraModel, maxCostUsd: miraStepBudgetUsd, timeoutMs: targetedTherapy ? miraTargetedGatewayTimeoutMs : miraGatewayTimeoutMs, retrieveGrounding: retrieveTheOracleGrounding, retrieveTherapyGrounding: retrieveTheOracleTherapyGrounding, targetedTherapy });
```

9. `contract.ts`: `export interface MiraAnalysis { …existing; therapyGrounding?: TheOracleGroundingBundle; evidenceGate?: EvidenceGateReport }` with `import type { EvidenceGateReport } from "../theoracle-evidence-gate";`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/mira-pipeline.test.ts tests/mira-paid.test.ts tests/theoracle-mira.test.ts tests/mira-client.test.ts`
Expected: all pass. Existing gateway tests do not set `targetedTherapy` and their results carry no therapy, so the gate does not run; if one of them compares the whole reply with `toEqual`, add `pipeline: { path: "legacy", stages: expect.any(Array) }` to its expectation rather than changing behaviour. Then `npx tsc --noEmit` → 0; `npx eslint src/lib/mira/gateway.ts src/lib/mira/model-profile.ts src/app/api/mira/route.ts src/lib/mira/contract.ts tests/mira-pipeline.test.ts` → 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mira/gateway.ts src/lib/mira/model-profile.ts src/app/api/mira/route.ts src/lib/mira/contract.ts tests/mira-pipeline.test.ts
git commit -m "feat(sentrapedia): gateway runs diagnosis, targeted retrieval, therapy and evidence gate behind MIRA_TARGETED_THERAPY (R2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Client and presentation

**Files:**
- Modify: `src/lib/mira/client.ts`
- Modify: `src/lib/mira/presentation.ts`
- Modify: `src/components/mira-case-form.tsx:60`
- Test: `tests/mira-client.test.ts`, `tests/diagnosis-presentation.test.ts`

**Interfaces:**
- Consumes: `MiraAnalysis.therapyGrounding`, `MiraAnalysis.evidenceGate` (Task 4), `EvidenceGateReport` (Task 1).
- Produces: `theOracleCitations(grounding: unknown, therapyGrounding?: unknown, gate?: unknown): string` (old one-argument calls render exactly as before).

- [ ] **Step 1: Write the failing tests**

In `tests/diagnosis-presentation.test.ts` (reuse its existing result/grounding fixtures; name them as that file does):

```ts
  it("shows a removed dose as 'dosis: cek pedoman' and lists therapy verification after the references", () => {
    const result = { ...okResultFixture, therapy: { forDiagnosis: { icd10: "J18.9", label: "Pneumonia" }, regimen: [{ drug: "Amoxicillin", dose: "", route: "PO", duration: "5 hari", note: "" }], interactions: [], contraindications: ["Amoxicillin: alergi penisilin (belum terverifikasi)"] } };
    const draft = miraDraft(result, "trace", "2026-10-11T00:00:00.000Z");
    expect(draft).toContain("Amoxicillin dosis: cek pedoman PO 5 hari");
    const gate = { forDiagnosis: { icd10: "J18.9", label: "Pneumonia" }, therapyRemoved: false, reason: "", drugs: [{ drug: "Amoxicillin", dose: "3x500mg", status: "doseRemoved", evidenceIds: ["E1"] }, { drug: "Levofloxacin", dose: "1x750mg", status: "removed", evidenceIds: [] }] };
    const citations = theOracleCitations(groundingFixture, groundingFixture, gate);
    expect(citations).toContain("## Verifikasi terapi");
    expect(citations).toContain("- Amoxicillin: dosis tidak ditemukan di TheOracle, cek pedoman");
    expect(citations).toContain("- Levofloxacin: tidak ditampilkan, indikasi tidak terverifikasi di TheOracle");
    expect(citations).toContain("Referensi terapi (dicari memakai diagnosis):");
  });
  it("renders a draft saved before the evidence gate exactly as before", () => {
    expect(theOracleCitations(groundingFixture)).toBe(theOracleCitations(groundingFixture, undefined, undefined));
    expect(theOracleCitations(groundingFixture)).not.toContain("Verifikasi terapi");
  });
```

In `tests/mira-client.test.ts`:

```ts
  it("keeps the optional therapy grounding and evidence gate, and rejects an invalid therapy grounding", async () => {
    const gate = { forDiagnosis: { icd10: "J18.9", label: "Pneumonia" }, therapyRemoved: false, reason: "", drugs: [] };
    const ok = await requestMiraAnalysis(caseFixture, { synthetic: true, fetchFn: async () => Response.json({ ...replyFixture, therapyGrounding: groundingFixture, evidenceGate: gate }) });
    expect(ok.therapyGrounding).toEqual(groundingFixture);
    expect(ok.evidenceGate).toEqual(gate);
    await expect(requestMiraAnalysis(caseFixture, { synthetic: true, fetchFn: async () => Response.json({ ...replyFixture, therapyGrounding: { bad: true } }) })).rejects.toThrow("Respons analisis tidak dapat diverifikasi.");
  });
```

(`okResultFixture`, `groundingFixture`, `caseFixture`, `replyFixture` = the fixtures those files already define; use their actual names.)

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/diagnosis-presentation.test.ts tests/mira-client.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`client.ts` — before the `return`:

```ts
  const therapyGrounding = "therapyGrounding" in data ? data.therapyGrounding : undefined;
  if (therapyGrounding !== undefined && !validTheOracleGrounding(therapyGrounding)) throw new Error("Respons analisis tidak dapat diverifikasi.");
  const evidenceGate = "evidenceGate" in data && data.evidenceGate && typeof data.evidenceGate === "object" && "drugs" in data.evidenceGate && Array.isArray(data.evidenceGate.drugs) ? data.evidenceGate as EvidenceGateReport : undefined;
  return { case: snapshot, result: data.result, traceId: data.traceId, createdAt: data.createdAt, grounding: data.grounding, ...(therapyGrounding ? { therapyGrounding } : {}), ...(evidenceGate ? { evidenceGate } : {}) };
```

(`import type { EvidenceGateReport } from "../theoracle-evidence-gate";`; the cast is on a value whose shape was just checked; if the lint rule forbids it, write a small `validGate(value: unknown): value is EvidenceGateReport` checking `forDiagnosis`, `therapyRemoved`, `reason`, `drugs` and use it.)

`presentation.ts`:
- regimen line: `points(therapy.regimen.map(r => [r.drug, r.dose || "dosis: cek pedoman", r.route, r.duration].filter(Boolean).join(" ") + (r.note ? ` (${r.note})` : "")))`
- replace `theOracleCitations`:

```ts
const gateLine: Record<string, string> = { verified: "dosis terverifikasi", doseRemoved: "dosis tidak ditemukan di TheOracle, cek pedoman", removed: "tidak ditampilkan, indikasi tidak terverifikasi di TheOracle" };
const passages = (bundle: TheOracleGroundingBundle) => bundle.evidence.map(item => `- ${item.source.title} [${item.evidenceId}] · kemiripan ${item.similarity}\n  ${item.text}`).join("\n\n");

export function theOracleCitations(grounding: unknown, therapyGrounding?: unknown, gate?: unknown): string {
  if (!validTheOracleGrounding(grounding)) return "";
  const therapy = validTheOracleGrounding(therapyGrounding) ? "\n\nReferensi terapi (dicari memakai diagnosis):\n\n" + passages(therapyGrounding) : "";
  const report = gate && typeof gate === "object" && "drugs" in gate && Array.isArray(gate.drugs) ? gate as EvidenceGateReport : undefined;
  const verification = report ? "\n\n## Verifikasi terapi\n\n" + [report.reason, ...report.drugs.map(d => `- ${d.drug}: ${gateLine[d.status]}${d.status === "verified" && d.evidenceIds.length ? ` [${d.evidenceIds.join(", ")}]` : ""}`)].filter(Boolean).join("\n") : "";
  return "\n\n---\n\n## Referensi TheOracle\n\nReferensi yang dipilih sebelum analisis:\n\n" + passages(grounding) + therapy + verification;
}
```

  (`import type { TheOracleGroundingBundle } from "../theoracle-grounding-types";` and `import type { EvidenceGateReport } from "../theoracle-evidence-gate";`; same cast note as in `client.ts`.)
- `diagnosisContent`: `theOracleCitations("grounding" in source ? source.grounding : undefined, "therapyGrounding" in source ? source.therapyGrounding : undefined, "evidenceGate" in source ? source.evidenceGate : undefined)`
- `miraMessage`: `theOracleCitations(analysis.grounding, analysis.therapyGrounding, analysis.evidenceGate)`
- `sourceForDisplay`: add `therapyGrounding` to the displayed object when `validTheOracleGrounding(source.therapyGrounding)` (extend the cast type with `therapyGrounding?: unknown`).
- `theOracleSourceLinks`: append `therapyGrounding` passages when valid.

`mira-case-form.tsx:60`: `theOracleCitations(analysis.grounding, analysis.therapyGrounding, analysis.evidenceGate)`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/diagnosis-presentation.test.ts tests/mira-client.test.ts tests/mira-composer.test.ts` → pass. `npx tsc --noEmit` → 0. `npx eslint src/lib/mira/client.ts src/lib/mira/presentation.ts src/components/mira-case-form.tsx tests/diagnosis-presentation.test.ts tests/mira-client.test.ts` → 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mira/client.ts src/lib/mira/presentation.ts src/components/mira-case-form.tsx tests/diagnosis-presentation.test.ts tests/mira-client.test.ts
git commit -m "feat(sentrapedia): show therapy verification and removed doses in MIRA drafts (R2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Draft gold ICD-10 categories for the evaluation set

**Files:**
- Create: `docs/verification/theoracle-eval-2026-10-11/gold-icd10.json`

- [ ] **Step 1: Write the file** — for each of the 61 queries in `eval-set.json` that have `gold` and no `term`, the acceptable WHO ICD-10 three-character categories for the disease its gold documents describe, e.g.:

```json
{
  "status": "draft - written by Claude from the gold document titles; awaits Gaffer review",
  "created": "2026-10-11",
  "rule": "likely[0] is correct when its first three characters are in the list",
  "labels": {
    "lay_terms-01": ["B80"],
    "lay_terms-02": ["B86"],
    "lay_terms-03": ["B36"],
    "lay_terms-04": ["H00"]
  }
}
```

  Every one of the 61 ids must be present; every code must exist (three-character prefix) in `mira/service/data/icd10.json`.

- [ ] **Step 2: Check it**

```bash
python -c "import json;e=json.load(open('docs/verification/theoracle-eval-2026-10-11/eval-set.json',encoding='utf8'))['queries'];g=json.load(open('docs/verification/theoracle-eval-2026-10-11/gold-icd10.json',encoding='utf8'))['labels'];w={x['id'] for x in e if x.get('gold') and not x.get('term')};c={x['kode'][:3] for x in json.load(open('mira/service/data/icd10.json',encoding='utf8'))['icd10']};print(len(w),set(w)==set(g),[k for k,v in g.items() if not v or any(x not in c for x in v)])"
```

Expected: `61 True []`.

- [ ] **Step 3: Commit**

```bash
git add docs/verification/theoracle-eval-2026-10-11/gold-icd10.json
git commit -m "docs(sentrapedia): draft gold ICD-10 categories for the TheOracle eval set (R1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: End-to-end evaluation (paid, approved) and report

**Files:**
- Create: `scripts/eval-theoracle-pipeline.mjs`
- Create: `docs/verification/theoracle-eval-2026-10-11/pipeline-2026-10-11-{legacy,targeted}.json`, `docs/verification/theoracle-eval-2026-10-11/PIPELINE-REPORT.md`
- Modify: `.agents/HANDOFF.md`

**Interfaces:**
- Consumes: the running system's `POST /api/mira` reply (`result`, `grounding`, `therapyGrounding`, `evidenceGate`, `pipeline`), `gold-icd10.json`, `eval-set.json`, `postchecks`-style code/name data in `mira/service/data/icd10.json`.

- [ ] **Step 1: Write the script** — `node scripts/eval-theoracle-pipeline.mjs <baseUrl> <label>`:

```js
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

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
  const body = await response.json();
  if (!response.ok) { rows.push({ id: item.id, ok: false, status: response.status, code: body?.error?.code ?? null, ms }); if (body?.error?.code === "BUDGET_EXHAUSTED") break; continue; }
  const likely = body.result.differential.likely[0] ?? null;
  const gate = body.evidenceGate ?? null;
  const passages = [...(body.therapyGrounding?.evidence ?? []), ...(body.grounding?.evidence ?? [])].map(e => e.text.toLowerCase());
  // Raw model doses: from the gate report (it records what the model wrote) or, without a gate report, from the result.
  const written = gate ? gate.drugs : (body.result.therapy?.regimen ?? []).map(r => ({ drug: r.drug, dose: r.dose, status: null }));
  const supported = written.filter(d => d.dose && [...d.dose.matchAll(DOSE_STRENGTH)].every(m => passages.some(p => p.includes(m[1]))));
  rows.push({
    id: item.id, ok: true, ms, path: body.pipeline?.path ?? null, stages: body.pipeline?.stages ?? [],
    icd10: likely?.icd10 ?? null, icdValid: !!likely && names.has(likely.icd10) || !!likely && names.has(likely.icd10.slice(0, 3)),
    icdCorrect: !!likely && (labels[item.id] ?? []).includes(likely.icd10.slice(0, 3)),
    therapyRetrieved: !!body.therapyGrounding, drugsWritten: written.length, dosesWritten: written.filter(d => d.dose).length,
    dosesSupported: supported.length, verified: gate ? gate.drugs.filter(d => d.status === "verified").length : null,
    doseRemoved: gate ? gate.drugs.filter(d => d.status === "doseRemoved").length : null, removed: gate ? gate.drugs.filter(d => d.status === "removed").length : null,
    displayedDoses: (body.result.therapy?.regimen ?? []).filter(r => r.dose).length, costUsd: body.result.meta.costUsd,
  });
  console.error(`${item.id} ${ms} ms ${likely?.icd10 ?? "-"}`);
}
const done = rows.filter(r => r.ok);
const stageMs = name => done.flatMap(r => r.stages.filter(s => s.stage === name).map(s => s.ms));
const sum = key => done.reduce((n, r) => n + (r[key] ?? 0), 0);
const summary = {
  label, measuredAt: new Date().toISOString(), cases: rows.length, ok: done.length,
  latencyMs: { p50: pct(done.map(r => r.ms), 0.5), p95: pct(done.map(r => r.ms), 0.95), stages: Object.fromEntries(["retrieve_dx", "mira_dx", "retrieve_tx", "mira_tx", "gate"].map(s => [s, { p50: pct(stageMs(s), 0.5), p95: pct(stageMs(s), 0.95) }])) },
  icd10: { valid: done.filter(r => r.icdValid).length / done.length, correctTop1VsDraftGold: done.filter(r => r.icdCorrect).length / done.length },
  dose: { written: sum("dosesWritten"), supportedByPassages: sum("dosesSupported"), supportedRate: sum("dosesWritten") ? sum("dosesSupported") / sum("dosesWritten") : null, displayed: sum("displayedDoses"), verified: sum("verified"), doseRemoved: sum("doseRemoved"), removed: sum("removed") },
  retrievalSuccess: label === "targeted" ? done.filter(r => r.therapyRetrieved).length / done.length : null,
  costUsd: Math.round(sum("costUsd") * 10000) / 10000,
};
writeFileSync(path.join(dir, `pipeline-2026-10-11-${label}.json`), JSON.stringify({ summary, rows }, null, 2));
console.log(JSON.stringify(summary, null, 2));
```

  `costUsd` in `result.meta` is the diagnosis step only; the therapy step's cost is in the MIRA audit log (`.runtime/mira-deepseek/audit/*.jsonl`, `costUsd` per record). After each run, sum the audit `costUsd` for records written during the run and add it to the report.

- [ ] **Step 2: Check the launcher and budget before spending**
  - The launcher fixes `MIRA_DAILY_BUDGET_USD=5` (`scripts/mira-runtime.mjs:47`). The script stops on `BUDGET_EXHAUSTED`; if that happens, report the partial run and ask Gaffer before changing the budget.
  - Approved cap for the whole evaluation: $18.30. Stop if the audit total reaches it.
  - `OPENROUTER_API_KEY` comes from `.env.local` (never print it).

- [ ] **Step 3: Run the legacy path**

Start the system with the flag off (`MIRA_TARGETED_THERAPY` unset) using the repo's launcher (`npm run dev` through the preview tool configuration, or `node scripts/run-system.mjs dev` in a background terminal), read its port from the output, then:

```bash
node scripts/eval-theoracle-pipeline.mjs http://127.0.0.1:<port> legacy
```

Expected: 61 cases, `summary.dose.supportedRate` = baseline share of model doses supported by the passages sent.

- [ ] **Step 4: Run the targeted path**

Stop the system, start it with `MIRA_TARGETED_THERAPY=true`, check `/api/mira` health is ready, then:

```bash
node scripts/eval-theoracle-pipeline.mjs http://127.0.0.1:<port> targeted
```

- [ ] **Step 5: Spot-check dose correctness** — for 10 verified doses from the targeted run (first 10 rows with `verified > 0`), read the cited passage (`evidenceIds` → `therapyGrounding`) and record in the report whether the passage is about the same disease and population (adult/child). This is the semantic check the lexical gate cannot make.

- [ ] **Step 6: Write `PIPELINE-REPORT.md`** — a table legacy vs targeted: latency p50/p95 (total and per stage), ICD-10 valid rate and top-1 accuracy against draft gold, doses written / supported rate / displayed / verified / dose removed / drug removed, retrieval success, total cost (audit). Add the offline numbers (dose recall 0.508 → 0.754 → targeted from Task 2) and the spot-check result. State limits: draft gold labels, fictional one-line cases, lexical gate.

- [ ] **Step 7: Update `.agents/HANDOFF.md`** (new section at the top: changes, verification evidence, open risks, next steps; default of `MIRA_TARGETED_THERAPY` stays off until Gaffer decides from the report).

- [ ] **Step 8: Commit**

```bash
git add scripts/eval-theoracle-pipeline.mjs docs/verification/theoracle-eval-2026-10-11 .agents/HANDOFF.md
git commit -m "docs(sentrapedia): TheOracle pipeline evaluation, legacy vs targeted (R1)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
