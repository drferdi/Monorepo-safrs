# Triage Zone Severity Audit (Sub-Project D) — Design Spec

> Status: approved by Chief (dr. Ferdi Iskandar) in-session, 2026-07-07.
> Sub-project D of the large clinical spec decomposed 2026-07-06/07 (A: 13
> new ABCDE protocols, B: 91-entity-to-22-protocol mapping, C: Emergency
> Verdict Card — all three complete). This spec reconciles the MERAH/
> KUNING/HIJAU/Standby zone classification in Chief's clinical spec (Section
> 2, re-pasted in full this session) against `computeTriageVerdict()`
> (`lib/emergency-detector/triage-verdict.ts`, built and wired in
> sub-project C).

## Problem

`computeTriageVerdict()` computes a triage zone generically from the worst
`severity` tier present across all fired alerts: `critical` → `merah`,
`high`/`warning` → `kuning`, no alerts → `hijau`, no vitals entered yet →
`standby`. There is no per-entity zone field — the zone is entirely a
function of each alert/pattern's `severity` value, set individually at each
of the ~91 alert-generating code paths (21 legacy `buildAlerts()` types +
70 Pattern-Engine v2 patterns in `clinical-patterns.ts`).

Chief's clinical spec explicitly names specific entities that belong in
MERAH (e.g. "cauda equina", "abdomen akut tidak stabil", "pasien tampak
lebih sakit dari angka", "penurunan kesadaran") and KUNING (e.g. "shock
index meningkat", "asma/COPD sedang", "nyeri dada atipikal"). A systematic
audit compared every entity's coded `severity` against Chief's zone
descriptions and protocol write-ups (Sections 2–6 of the spec). Confirmed
in-session with Chief:

**5 clear mismatches** (code's wording/title already matches Chief's zone
list almost verbatim, but the `severity` value doesn't):

| Entity                                                                      | File                   | Current   | Fix        | Evidence                                                                                                                                                                                                    |
| --------------------------------------------------------------------------- | ---------------------- | --------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CP-070` "Kekhawatiran klinis — pasien tampak lebih sakit dari angka"       | `clinical-patterns.ts` | `warning` | `critical` | Chief's spec names this exact phrase under MERAH                                                                                                                                                            |
| `CP-060` "Cauda equina syndrome"                                            | `clinical-patterns.ts` | `high`    | `critical` | Chief's spec explicitly lists "cauda equina" under MERAH                                                                                                                                                    |
| `CP-055` "Emergensi abdomen — nyeri perut hebat + hemodinamik tidak stabil" | `clinical-patterns.ts` | `high`    | `critical` | Chief's spec lists "abdomen akut tidak stabil" under MERAH; the pattern's own title already says "tidak stabil"                                                                                             |
| `CP-062` "Hipertiroid / thyroid storm"                                      | `clinical-patterns.ts` | `warning` | `critical` | Chief's own `PROTO_THYROID_STORM` write-up says "rujuk emergensi"                                                                                                                                           |
| `avpu_abnormal` (legacy), AVPU=V branch                                     | `TTVInferenceUI.tsx`   | `high`    | `critical` | Internal inconsistency: Pattern-Engine v2's `CP-036` already treats ANY `AVPU != A` as `critical` for the same clinical finding; Chief's spec lists "penurunan kesadaran" under MERAH without qualification |

**5 confirmed after reviewing exact firing criteria** (judgment calls, not
typos):

| Entity                                                            | File                                         | Current                                               | Fix                                                           | Reasoning                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preeclampsia_watch`                                              | `TTVInferenceUI.tsx` / `vital-guardrails.ts` | `critical` (unconditional)                            | `high`                                                        | Fires at SBP≥140 **or** DBP≥90 — the mild gestational-hypertension threshold, not Chief's severe threshold (≥160/110). Forcing MERAH at first-detected mild elevation over-triggers; KUNING (observe, re-measure, escalate to doctor) matches Chief's own text ("hanya TD berat/gejala berat → MERAH"). |
| `hypertensive_crisis`, "crisis" tier                              | `TTVInferenceUI.tsx` / `htn-classifier.ts`   | `critical` for both `HTN_URGENCY` and `HTN_EMERGENCY` | `critical` for `HTN_EMERGENCY` only; `high` for `HTN_URGENCY` | Chief's spec explicitly separates these: only confirmed target-organ damage (HMOD) is a true hypertensive emergency (MERAH); BP alone ≥180/110 without organ damage should be observed, not rushed.                                                                                                     |
| `CP-064` "Delirium akut — lansia + bingung + vital hampir normal" | `clinical-patterns.ts`                       | `high`                                                | `critical`                                                    | The pattern's own `reasoning` text says "Mortalitas tinggi" (high mortality); Chief's spec explicitly instructs treating this as ALOC+sepsis (both MERAH-tier) "sampai terbukti sebaliknya".                                                                                                            |
| `CP-019` "Hipertensi berat + nyeri dada — curiga ACS/Stroke"      | `clinical-patterns.ts`                       | `high`                                                | `critical`                                                    | All 3 criteria are `requiredCriteria` (hard AND, not scored): HR>90 **and** SBP≥160 **and** chest pain present — a tight combination, not a loose trigger. Chief's spec lists both "nyeri dada ACS" and "stroke akut" under MERAH.                                                                      |
| `CP-032` "Anemia berat + tanda syok"                              | `clinical-patterns.ts`                       | `high`                                                | `critical`                                                    | Both `requiredCriteria` are hard AND: HR>110 **and** SBP<100 — already a shock-consistent hemodynamic picture before any scored symptom is even considered. Chief's spec lists "syok/hipotensi" under MERAH.                                                                                            |

**Explicitly deferred, not fixed this round** (lower confidence / genuinely
debatable, flagged for a future pass if Chief wants to revisit): `CP-038`
(deteriorasi progresif), `CP-059` (neutropenic sepsis), `CP-063` (aritmia +
near-syncope), `CP-065` (cardiac red flag remaja), `CP-066` (infeksi
jaringan dalam DM), `CP-043`/`CP-068` (drug-related respiratory
depression), `CP-005` (curiga sepsis berat/syok — `minScore: 1` is a loose
bar, kept at `high` intentionally).

**Important caveat on the `hypertensive_crisis` split:** `TTVInferenceUI.tsx`
already has a code comment confirming HMOD red flags are never actually
collected from manual vital input — `classifyHypertension()` is always
called with `redFlags: undefined`, so `triageHypertensiveCrisis()` always
resolves to `HTN_URGENCY` in practice today. This means, in the current
running system, this specific gate will now **always** report `high`
(never `critical`) until a future session wires up real HMOD red-flag
collection. This is not a regression: any genuine organ-damage symptom
(chest pain, neuro deficit, pulmonary edema, pregnancy/preeclampsia) already
fires its own independently-critical alert (`CP-018`/`CP-021`/
`preeclampsia_watch`/etc.), so the overall `computeTriageVerdict()` zone
still correctly resolves to MERAH via that other alert — this change only
affects how the _BP-specific_ alert self-reports, not the patient's overall
zone in a true emergency.

## Scope

**In scope:**

- The 10 severity value changes listed above: 7 in `clinical-patterns.ts`
  (`CP-070`, `CP-060`, `CP-055`, `CP-062`, `CP-064`, `CP-019`, `CP-032`) and
  3 in `TTVInferenceUI.tsx`/related (`avpu_abnormal` V-branch,
  `preeclampsia_watch`, `hypertensive_crisis` crisis-tier split).
- A new permanent regression test,
  `lib/emergency-detector/zone-classification-audit.test.ts`, encoding
  Chief's Section 2 zone rules as an explicit `id/type → expected zone`
  table covering all ~91 entities (not just the 10 changed ones), verified
  via `computeTriageVerdict()` on a single-alert array per entity. This is
  the audit mechanism itself, kept as a permanent guard against future
  severity drift.

**Out of scope (explicitly deferred):**

- The 7 lower-confidence entities listed above — flagged in the test file
  as `.skip`-documented candidates (see Testing Plan), not changed.
- Wiring real HMOD red-flag collection into the manual vital-entry UI so
  `hypertensive_crisis` can genuinely distinguish `HTN_URGENCY` from
  `HTN_EMERGENCY` at runtime — a separate, larger feature.
- Any change to gate thresholds, criteria (`requiredCriteria`/
  `scoredCriteria`), or clinical content beyond the 10 `severity` field
  value changes — this audit only corrects zone classification, not
  detection logic.
- The 12 patterns already confirmed intentionally unmapped to any
  `actionProtocolId` (from sub-project B) — untouched, unrelated to this
  audit.

## Architecture

No new modules. This is a data-correction task across 2 existing files,
plus one new test file.

### 1. `lib/emergency-detector/clinical-patterns.ts` — 7 one-line severity changes

Change `severity:` from the current value to the new value for exactly
these 7 pattern objects, touching no other field: `CP-019` (`high`→
`critical`), `CP-032` (`high`→`critical`), `CP-055` (`high`→`critical`),
`CP-060` (`high`→`critical`), `CP-062` (`warning`→`critical`), `CP-064`
(`high`→`critical`), `CP-070` (`warning`→`critical`).

### 2. `components/clinical/TTVInferenceUI.tsx` — 3 changes

- `avpu_abnormal`: `avpuSeverityMap.V` changes from `'high'` to `'critical'`
  (making the map `{ V: 'critical', P: 'critical', U: 'critical' }` — since
  all three branches now resolve identically, this could collapse to a
  single value, but the map is kept for clarity/future-proofing in case a
  softer AVPU tier is reintroduced later).
- `preeclampsia_watch`: `severity: 'critical'` (hardcoded) changes to
  `severity: 'high'` (hardcoded) at the alert push site (~line 872). The
  underlying `vital-guardrails.ts` `softFlags` threshold (SBP≥140 or
  DBP≥90) is unchanged — only how severely `TTVInferenceUI.tsx` treats that
  flag changes.
- `hypertensive_crisis`, "crisis" tier: the `severityMap` lookup
  (`{ stage1: 'warning', stage2: 'high', crisis: 'critical' }`) is replaced
  for the `crisis` case only with a conditional on `htnResult.type`:

  ```ts
  const severityMap: Record<string, ScreeningAlert['severity']> = {
    stage1: 'warning',
    stage2: 'high',
  };

  const crisisSeverity: ScreeningAlert['severity'] =
    htnResult.type === 'HTN_EMERGENCY' ? 'critical' : 'high';

  // ...
  severity: htnSeverity === 'crisis' ? crisisSeverity : (severityMap[htnSeverity] ?? 'high'),
  ```

  (Exact integration point and variable names to be finalized against the
  live code in the implementation plan — this shows the logic, not the
  literal diff.)

### 3. `lib/emergency-detector/zone-classification-audit.test.ts` (new)

A single test file with one `describe` block per Chief's Section 2 zone
bucket (`MERAH`, `KUNING`), each containing an `it.each` table of
`[id-or-type, label]` pairs, asserting the computed zone for a
single-synthetic-alert array matches the expected bucket. Two mechanisms,
depending on the entity's origin:

- **Pattern-Engine v2 entities** (the 70 `CP-*` patterns): look up the real
  object from `CLINICAL_PATTERNS` by `id`, build a
  `{ id, type: pattern.gate, severity: pattern.severity, gate: pattern.gate }`
  synthetic alert, and assert
  `computeTriageVerdict([syntheticAlert], true).zone === expectedZone`.
  This directly uses each pattern's real, current `severity` — no need to
  actually trigger the pattern's criteria via `evaluatePatterns()`.
- **Legacy `buildAlerts()` entities** (21 types): call `buildAlerts()` with
  a `makeState()` override crafted to trigger that specific alert type
  (reusing the existing `makeState` helper pattern already used in
  `TTVInferenceUI.test.tsx`), extract the matching alert by `type`, and
  assert its `severity` maps to the expected zone via the same
  `computeTriageVerdict()` call. This exercises the real trigger conditions,
  not just a synthetic object, which is important here because several of
  the legacy entities (`preeclampsia_watch`, `hypertensive_crisis`) have
  conditional/branching severity logic that a synthetic object would bypass.

The 7 explicitly-deferred lower-confidence entities (`CP-038`, `CP-059`,
`CP-063`, `CP-065`, `CP-066`, `CP-043`, `CP-068`) get their own small
`describe.skip` block with a comment explaining why each is deferred and
what would need to be true to revisit it — visible in the test file as a
standing to-do, not silently omitted.

## Data Flow

No change to the runtime data flow from sub-project C. This audit only
changes the _value_ going into `severity` at 10 specific call sites — the
computation path (`buildAlerts()`/`evaluatePatterns()` → `severity` field →
`computeTriageVerdict()` → `zone`) is unchanged.

## Error Handling

Not applicable — no new error paths. The new test file's synthetic-alert
construction for Pattern-Engine v2 entities reads directly from
`CLINICAL_PATTERNS`, so it cannot silently drift out of sync with a
renamed/removed pattern id — a typo'd `id` in the test table produces
`undefined` from the lookup, which fails loudly (not silently) when
building the synthetic alert.

## Testing Plan

- All 91 entities get a row in `zone-classification-audit.test.ts` (84
  confirmed-correct-as-is + 7 explicitly fixed here, all asserting their
  _final_ post-fix severity resolves to the zone Chief's spec names; the 7
  deferred entities get a documented `.skip`).
- Existing tests that assert on the specific `severity` value of any of
  the 10 changed entities must be updated to the new value in the same
  commit as the corresponding source change (e.g. any existing
  `hypertensive_crisis`/`preeclampsia_watch` assertions in
  `TTVInferenceUI.test.tsx`).
- Full suite (`pnpm run test`) must stay green — this audit must not
  introduce any regression in existing pattern/alert tests.

## Open Assumptions

- "Zone" in this audit means the zone a _single_ firing of that entity
  would produce in isolation, per `computeTriageVerdict()`'s severity-tier
  rule — not accounting for tie-break gate-priority ordering (irrelevant
  to zone, only to headline-alert selection within a tier).
- The 7 deferred entities remain at their current severity; revisiting them
  is a separate future task, not blocked by or bundled into this one.
