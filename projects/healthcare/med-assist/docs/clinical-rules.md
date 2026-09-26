# Clinical Rules — Triage & Referral Decision Tree

**Status:** Active SSOT for deterministic triage/referral gating. Referenced by
the med-assist `CLAUDE.md` domain rule ("read `docs/clinical-rules.md` first"
for clinical reference logic).

**Scope:** This document specifies the _deterministic_ decision tree that maps an
already-matched diagnosis (from the Iskandar Diagnosis Engine) plus the patient's
complaint signals and vitals into an explicit triage outcome. It formalizes
safety gating the scoring engine performs implicitly. It does **not** invent
clinical criteria, and it does **not** replace or reorder the ranked diagnosis
shown to clinicians — the physician remains the final decision-maker.

**Implementation:** `lib/iskandar-diagnosis-engine/triage-referral-decision-tree.ts`
**Tests:** `lib/iskandar-diagnosis-engine/triage-referral-decision-tree.test.ts`
**Clinical data source:** `public/data/penyakit.json` (159-disease KB), fields
`red_flags`, `kriteria_rujukan`, `kompetensi`, `icd10`. Structured emergency
checks are delegated to `red-flags.ts` (qSOFA, ACS, stroke, preeclampsia,
hypoglycemia, anaphylaxis).

---

## Clinical & technical assumptions

- **Every rule traces to existing data or an evidence-based checker.** No new
  clinical threshold is introduced here; competence levels follow SKDI, and
  emergency thresholds follow the cited guidelines already encoded in
  `red-flags.ts`.
- **SKDI competence is the referral signal, not `can_refer`.** In the KB the
  `can_refer` flag is uniformly `false` and is not used. Referral is driven by
  the `kompetensi` level: `4A` = GP manages to completion; `1`, `2`, `3A`, `3B`
  = beyond primary-care completeness → refer.
- **`kriteria_rujukan` is free text.** It is surfaced as human-readable referral
  guidance; it is not machine-matched against signals.
- **`0` vitals mean "not measured,"** which is valid input, distinct from an
  out-of-range value.
- **Fail-closed.** When inputs are invalid or ambiguous, the tree resolves toward
  the safer branch (escalate / refer / insufficient), never silently toward
  routine local treatment.
- **Determinism.** The evaluator is a pure function; identical input yields
  identical output with no I/O or side effects.

---

## Decision tree

Evaluated top-to-bottom; the first firing node is terminal. Order encodes safety
priority.

```
Input: complaintSignals + complaintText + vitals + disease(KB) + confidenceBand
  │
  ├─ Node 1  EMERGENCY        structured red-flag checker returns severity=emergency
  │             → emergency                                           [terminal]
  │
  ├─ Node 2  URGENT REVIEW    urgent/warning structured flag OR KB red_flags text match
  │             → urgent_review                                       [terminal]
  │
  ├─ Node 3  REFER            kompetensi ∈ {1, 2, 3A, 3B}
  │             → refer  (+ kriteria_rujukan as guidance)             [terminal]
  │
  ├─ Node 4  INSUFFICIENT     no signals, OR low confidence + sparse signals,
  │                           OR invalid vitals with no measured vitals + sparse signals
  │             → insufficient                                        [terminal]
  │
  └─ Node 5  TREAT LOCALLY    default (kompetensi 4A, no safety trigger)
                → treat_locally
                → urgent_review if any vital is out-of-range (fail-closed)   [terminal]
```

---

## Per-node schema

Each node is specified by: **input criteria**, **differential exclusions** (what
must NOT already have fired), **confidence tier**, **ICD-10 mapping**, and
**source reference** (KB field or checker id) recorded in the audit trail.

### Node 1 — Emergency

- **Input criteria:** `runRedFlagChecks()` returns any flag with
  `severity = 'emergency'` (qSOFA ≥ 2, ACS, stroke FAST ≥ 2, severe preeclampsia,
  severe hypoglycemia, anaphylaxis).
- **Differential exclusions:** none — highest priority.
- **Confidence tier:** `high` (deterministic guideline thresholds).
- **ICD-10:** the emergency's own codes (e.g. sepsis `A41.9`), independent of the
  ranked diagnosis.
- **Source ref:** `<RF-ID>#red_flags`.

### Node 2 — Urgent review

- **Input criteria:** a structured flag of `severity ∈ {urgent, warning}`, OR a
  KB `red_flags` phrase (non-numeric) found as a substring of the complaint text.
- **Differential exclusions:** Node 1 did not fire.
- **Confidence tier:** mapped from `confidenceBand`.
- **ICD-10:** the matched disease `icd10`.
- **Source ref:** `<disease.id>#red_flags`.

### Node 3 — Refer

- **Input criteria:** normalized `kompetensi ∈ {1, 2, 3A, 3B}`.
- **Differential exclusions:** Nodes 1–2 did not fire.
- **Confidence tier:** mapped from `confidenceBand`.
- **ICD-10:** the matched disease `icd10`.
- **Guidance:** `kriteria_rujukan` free text, when present.
- **Source ref:** `<disease.id>#kompetensi`.

### Node 4 — Insufficient data

- **Input criteria:** `complaintSignals` empty, OR (`confidenceBand = low` AND
  fewer than 2 signals), OR (invalid vitals AND fewer than 2 signals AND zero
  measured vitals).
- **Differential exclusions:** Nodes 1–3 did not fire.
- **Confidence tier:** `insufficient`.
- **ICD-10:** the matched disease `icd10` (context only; not asserted as final).
- **Source ref:** `<disease.id>#gejala_klinis`.

### Node 5 — Treat locally (default)

- **Input criteria:** none fired above; `kompetensi = 4A`.
- **Fail-closed override:** if any vital is out-of-range, resolve to
  `urgent_review` instead of `treat_locally`.
- **Confidence tier:** mapped from `confidenceBand`.
- **ICD-10:** the matched disease `icd10`.
- **Source ref:** `<disease.id>#kompetensi`.

---

## Input validation

Physiologic bounds (a value of `0` is "not measured," never invalid):

| Vital   | Min | Max  |
| ------- | --- | ---- |
| sbp     | 40  | 300  |
| dbp     | 20  | 200  |
| hr      | 20  | 250  |
| rr      | 4   | 60   |
| temp    | 30  | 45   |
| glucose | 10  | 1000 |

Out-of-range values are recorded in `invalidInputs` (non-fatal) and are excluded
when mapping to the red-flag checker, so corrupt data cannot suppress an
escalation.

---

## Verification

- `pnpm vitest run lib/iskandar-diagnosis-engine/triage-referral-decision-tree.test.ts`
  covers every branch, the safety-priority ordering, edge cases (empty KB fields,
  all-zero vitals), invalid input, determinism, the audit trail, and one
  end-to-end reference case loaded from the real KB (Hipertensi I10).
- `pnpm run typecheck`, `pnpm exec eslint <files>`, `pnpm run test`,
  `pnpm run build` must all pass.

## Out of scope

- No rule is derived from `docs/clinical/root-klausula-reasoning-framework.md`
  (governance-locked).
- The tree does not change, reorder, or override the diagnosis shown to
  clinicians. Wiring any outcome into clinician-facing output that _alters_ the
  displayed diagnosis requires separate clinical sign-off.
