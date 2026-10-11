# TheOracle clinical evidence pipeline (Option A)

Status: draft for Gaffer's review · 2026-10-11 · branch `feat/sentrapedia-dify-theoracle`
(worktree `oracle-vector-only`). Builds on `8e1d5604` (dose-bearing treatment passage) and
`ffc74272` (ICD-10 postchecks).

## Intent (Gaffer)

- Priority: TheOracle must use the knowledge base Gaffer already has; the dose problem is a
  retrieval-architecture failure, not missing medical knowledge. Then prove dose accuracy with numbers.
- Flow: Clinical case → Diagnostic reasoning → Targeted evidence retrieval (diagnosis + patient
  context) → Clinical evidence gate (ICD-10, dose, contraindication, reference) → Final response with
  verified evidence or clearly stated uncertainty.
- One request from the UI. Keep the API, response shape and UI compatible. Keep the current path
  behind a feature flag for rollback. Timeout and log per stage.
- If retrieval fails, never show a dose from model memory. Show a drug without a dose only when its
  indication is verified. Unverified dose → drug shown, dose empty ("dosis: cek pedoman").
- Measure p50/p95 latency, ICD-10 accuracy, dose accuracy and retrieval success on the existing
  evaluation set.

Assumptions (not stated by Gaffer): the gate is deterministic code, not a second model; "streaming"
means the existing single-JSON response of `/api/mira` (it does not stream today; only the Vera/Dify
widget streams, and it is untouched).

## Flow

Today: gateway → one `/v1/diagnosis/step` call; diagnosis, workup and therapy run in parallel in
MIRA on one complaint-based grounding bundle.

Option A (flag `MIRA_TARGETED_THERAPY=true`, default on once evaluation passes):

| # | Stage | Where | Timeout | On failure |
|---|---|---|---|---|
| 1 | `retrieve_dx`: complaint grounding (current retriever) | Next.js | 5 s | current behaviour (analysis refused, error shown) |
| 2 | `mira_dx`: `/v1/diagnosis/step` with `omitTherapy: true` | MIRA | engine step deadline (20 s) | current behaviour |
| 3 | `retrieve_tx`: targeted retrieval for `differential.likely[0]` + patient context | Next.js | 5 s | no therapy call; diagnosis returned; therapy absent with reason |
| 4 | `mira_tx`: new `/v1/therapy/step` for that diagnosis with the targeted bundle | MIRA | engine step deadline (20 s) | diagnosis returned; therapy absent with reason |
| 5 | `gate`: clinical evidence gate | Next.js | — (pure function) | therapy absent with reason |

The gateway's overall timeout becomes `2 × stepDeadlineS + gatewayMarginS` when the flag is on
(65 s with the current profile). Diagnosis, workup and disposition are produced exactly as today
(same prompt, same parallel race, same postchecks); only therapy moves behind them.

Flag off: the current path, unchanged, except that the gate (stage 5) also runs on its therapy,
so no path shows an unverified dose. If the flag is on but MIRA does not advertise the capability
`theoracle-targeted-therapy-v1`, the gateway uses the current path and logs it.

## Components

1. **Targeted retrieval** (`src/lib/theoracle-grounding.ts`, new export
   `retrieveTheOracleTherapyGrounding(caseData, diagnosis)`): one local embedding of
   `<label> (<ICD-10>) + "penatalaksanaan terapi dosis obat" + age, sex, pregnancy, known conditions,
   current medications`. Selection over the whole corpus: up to 4 best passages that state a drug
   amount (same `DOSE` regex as `8e1d5604`), then up to 2 best other passages, at most 2 per
   document, same privacy filter. Same bundle type and validator (max 6), so no new contract shape.
2. **MIRA therapy step** (`mira/service`): request schema gains optional `omitTherapy` (step) and a
   new `/v1/therapy/step` request `{contractVersion, traceId, case, diagnosis: {icd10, label},
   grounding}` → response `{contractVersion, status, therapy, meta}` using the existing therapy
   schema, prompt rules (`FAST_THERAPY_RULES`, targeted at the given diagnosis) and race. Grounding is
   required on this endpoint. Health adds `theoracle-targeted-therapy-v1`. Audit log entry per call,
   as for the step.
3. **Clinical evidence gate** (`src/lib/theoracle-evidence-gate.ts`, pure function): input = therapy,
   the targeted bundle, the step's `differential.likely[0]`.
   - ICD-10: `therapy.forDiagnosis.icd10` must equal the requested diagnosis code (after postchecks);
     otherwise therapy is dropped.
   - Indication verified = the drug's generic name occurs in a passage of the targeted bundle (a bundle
     retrieved for this diagnosis). Not verified → drug removed.
   - Dose verified = drug name and strength (number + unit, e.g. `500mg` matches `500 mg`) occur in
     the same targeted passage. Not verified → `dose` set to `""`; the UI shows "dosis: cek pedoman".
   - Contraindications and interactions: kept only for drugs that remain; each shown with
     "(belum terverifikasi)" unless a targeted passage contains the drug name and a contraindication or
     interaction term.
   - References: each verified dose records the `evidenceId` of the passage that verified it.
   - Retrieval failed or bundle empty → no therapy call (stage 4 skipped), so no dose can come from
     memory.
4. **Gateway** (`src/lib/mira/gateway.ts`): orchestrates stages 1–5, per-stage timeout through the
   existing `AbortController`, one log line per stage: `{traceId, stage, ms, ok, code}` (no case
   text). Response keeps `{result, traceId, createdAt, grounding}` and adds optional
   `therapyGrounding` and `evidenceGate` (per drug: `verified | doseRemoved | removed`, evidenceIds,
   reason). Cost check per MIRA call against `stepBudgetUsd`; a case costs at most 2 × budget.
5. **Client and UI** (`src/lib/mira/client.ts`, `presentation.ts`): accept the optional fields,
   render "dosis: cek pedoman" for an empty dose, mark unverified contraindications, list therapy
   references under "Referensi TheOracle". Saved drafts without the new fields render as today.

## Evaluation

Existing set: `docs/verification/theoracle-eval-2026-10-11/eval-set.json` (88 queries, 61 with gold
documents; gold labels draft).

- **Free (local, no model calls)**
  - Retrieval success: for each of the 61 gold queries, does the targeted bundle for the gold
    disease contain a dose-bearing passage naming it (the `doseRecall` rule of `8e1d5604`)? Compared
    with complaint-only (0.508) and complaint + treatment (0.754). The disease label is taken from the
    gold document title.
  - Retrieval latency p50/p95.
  - Gate unit tests with fixture passages.
- **Paid (live MIRA via OpenRouter, needs Gaffer's approval)**: the 61 gold queries as chief
  complaints, flag off vs on.
  - Latency p50/p95, end to end and per stage.
  - ICD-10: share of codes that are valid WHO codes whose official name matches the label; plus
    accuracy of `likely[0]` against a gold 3-character ICD-10 category per query. That gold column does
    not exist yet: Claude drafts it (61 entries), status draft until Gaffer reviews.
  - Dose accuracy: share of displayed doses whose drug and strength occur in a passage retrieved for
    the diagnosis (flag off measured without the gate, to get the baseline), plus counts of
    verified / dose removed / drug removed.
  - Retrieval success at run time: share of cases where stage 3 returned a bundle.
  - Cost: at most 61 × 3 steps × $0.10 = $18.30 (cap); expected well below.
- Results: `docs/verification/theoracle-eval-2026-10-11/pipeline-<date>.json` and a short report.

## Out of scope

Rewriting the diagnosis prompt, a second verifier model, UI redesign, changes to the corpus or the
index, relaxing `_complete_therapy` (revisit after the paid run).

## Risks

- Therapy arrives with the diagnosis, about one model call later than today (target: p95 increase
  ≤ 5 s; the paid run measures it).
- Indication check is lexical: a drug named in a targeted passage for another disease in the same
  chunk would pass. The targeted query and the diagnosis-only bundle limit this; the paid run reports
  examples.
- Diagnosis labels are English, the corpus Indonesian; EmbeddingGemma measured 0.87 on mixed ID/EN
  queries. The ICD-10 code is added to the query.
- R2 change (engine contract + data path) under SAFRS.
