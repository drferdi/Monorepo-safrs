# ADR-005: Pluggable Diagnosis Engine; LLM-Led Reasoning Candidate (MIRA)

## Metadata

- **Proposed**: 2026-09-27
- **Decision Maker**: Chief (dr. Ferdi Iskandar), pending
- **Review Date**: after the Gate 1 benchmark has run
- **Status**: Proposed
- **Related ADRs**: ADR-004 (dashboard as canonical clinical engine)
- **Related work**: `docs/plans/diagnosis-engine-inventory.md` (inventory of the legacy engine),
  `lib/diagnosis-engine/` (implementation), `mira-system/assist/MIRA_ASSESSMENT.md` (outside this
  repository)

## Status

**Proposed. Nothing in this ADR changes clinical behaviour until Chief accepts it.**

Two domain rules in `AGENTS.md` stay in force until then:

- "Clinical source of truth: the local knowledge base (`public/data/penyakit.json`) wins; the LLM
  is a reranker only."
- "Diagnosis logic must be deterministic, auditable, and traceable to clinical criteria."

If the Gate 1 benchmark passes and Chief accepts this ADR, it **supersedes the first rule** and
**amends the second** as described under Decision.

## Context

- Chief reports that the current diagnostic core produces wrong diagnoses too often. The core
  works like this: keyword and symptom matching against a 159-disease list, then a Top-N
  shortlist, then an optional OpenAI rerank that may only reorder the list.
- The golden recordings made for this work show the limits concretely. All 12 recorded cases are
  synthetic, and the recordings were made without an OpenAI key:
  - A typed appendicitis-like presentation in a 22-year-old man ("nyeri perut kanan bawah",
    fever, vomiting) is ranked B54 (malaria) first, A09 (gastroenteritis) second and N70
    (salpingitis, a female-only diagnosis) third.
  - Appendicitis cannot appear at all: the knowledge base has no K35–K37 entry.
  - An English-language case (the MIRA synthetic appendicitis case) returns an empty
    differential, because matching works on Indonesian terms only.
- MIRA (Ferber et al., _Nature_ 2026, MIT licence) is an LLM agent that reasons through a case
  and asks for the history, examination and tests it needs. It has been installed and assessed
  locally (`mira-system/assist/MIRA_ASSESSMENT.md`). That assessment found:
  - its data path works on a non-MIMIC case;
  - the full LLM encounter has not been run yet, so its accuracy is unknown;
  - one encounter is estimated at about 35–50 API calls and US$2–4 (an inference, not measured);
  - its prompts and tools assume a US emergency department;
  - the published configuration uses `o1`, which OpenAI shuts down on 2026-12-11.

## Decision (proposed)

### Implemented now, with no behaviour change

These parts are merged on `feat/diagnosis-engine-interface`:

1. **A pluggable engine contract** (`lib/diagnosis-engine/types.ts`). Every engine takes a
   de-identified `CaseState` and returns an `EngineResult`, which contains:
   - the differential: `likely`, `alternatives` and `cannotMiss`;
   - evidence for and against each diagnosis;
   - missing information;
   - next best actions;
   - a treat or refer suggestion;
   - `meta`: engine, version, model, cost, latency and trace id.

   An engine must leave empty any field it cannot fill and list it in `unfilled`; it must never
   invent one.

2. **The legacy engine is wrapped unchanged** (`legacy-engine.ts`). It stays the comparator for
   Gate 1 and the fallback. Golden tests prove that its output through the new path is identical
   to the recording made before the switch.
3. **A flag, `diagnosisEngine`** (`SENTRA_DIAGNOSIS_ENGINE`), defaults to `legacy`.
   - With `mira`, the MIRA engine runs _alongside_ the legacy engine.
   - Physicians still see only the legacy result.
   - Only MIRA's outcome (status, ICD codes, latency) is written to the audit log.
4. **A MIRA client slot** (`mira-engine.ts`). It sends requests only to a Sentra-side reasoning
   service at `VITE_MIRA_SERVICE_URL`.
   - The extension never holds an OpenAI key for MIRA.
   - Every payload passes `lib/api/pii-guard.ts`.
   - Any failure returns a flagged "unavailable" result.
   - The request/response contract is JSON Schema in `lib/diagnosis-engine/contract/`, with
     examples.
5. **A benchmark export** (`scripts/benchmark/run-legacy-engine.mjs`). It runs the legacy engine
   on case files in the MIRA case format, so both engines are scored on identical input.
6. **The safety layer stays deterministic and outside every engine.** It covers red flags, the
   emergency gates (4-Gate and Pattern-Engine v2), the triage verdict and the triage/referral
   tree. A test checks that none of it imports the diagnosis pipeline, and that it produces its
   full output while an engine throws, hangs or is broken.

### Proposed, only if Gate 1 passes and Chief accepts

- MIRA becomes the physician-facing reasoning core, running through the Sentra-side service.
  The legacy engine remains the fallback whenever MIRA is unavailable.
- The rule "the LLM is a reranker only" is replaced by: _the LLM may lead diagnostic reasoning
  through the engine contract. Its output must name ICD-10 codes, show evidence and flag
  unfilled fields. The deterministic safety layer runs independently and always has the final
  say on emergencies and referral urgency._
- The rule "diagnosis logic must be deterministic" is narrowed to the safety layer. For the
  reasoning engine, auditability is kept instead: every result carries engine, version, model,
  trace id and evidence, and is audit-logged.
- Showing MIRA's result in the side panel is a separate UI task, done under the side-panel
  freeze rules (`entrypoints/sidepanel/AGENTS.md`).
- Deleting the legacy ranking code is a separate, later task. It happens only after the gates
  pass.

## How success is measured (Gate 1)

The cases are de-identified ASSIST cases with a confirmed final diagnosis. They are written the
way clinicians type in ePuskesmas (Indonesian) and kept outside the repository. Both engines run
on the identical `CaseState`: the legacy engine through the benchmark export, MIRA through the
reasoning service.

| Measure            | Definition                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Top-1 accuracy     | Share of cases where `likely[0]` matches the final diagnosis (ICD-10, 3-character level)                          |
| Top-3 accuracy     | Share of cases where the final diagnosis is among the first three of `likely` + `alternatives`                    |
| Cannot-miss recall | Share of cases with a reference "cannot-miss" diagnosis in which the engine lists it in `cannotMiss` or its top 3 |
| Cost per case      | Mean and maximum `meta.costUsd`, in US dollars                                                                    |
| Also reported      | Latency (median and 95th percentile), rate of `unavailable` results, and fields left `unfilled`                   |

**Pass thresholds are not set yet.** Chief sets them, together with the case set (how many cases
and which diagnoses), before the benchmark runs, so the result cannot shape the bar. MIRA must
beat the legacy engine on Top-3 accuracy and cannot-miss recall at an acceptable cost per case.

## Consequences

### Positive

- Engines can be compared on identical input and swapped without touching the side panel or the
  safety layer.
- The legacy engine stays available as a comparator and a fallback at no risk. Its behaviour is
  pinned by golden tests.
- No OpenAI key is needed in the extension for MIRA. PII screening happens before anything leaves
  the browser.

### Risks

- **Clinical fit.** MIRA's prompts, tools and dispositions are written for a US emergency
  department. Adapting them to primary care is a new experimental condition that needs its own
  measurement.
- **Wrong or invented diagnoses.** An LLM-led engine can name diagnoses outside the local
  knowledge base. The contract requires ICD-10 codes and evidence, and the safety layer stays
  independent, but clinical review of Gate 1 errors is still required.
- **Cost and latency.** An estimated 35–50 API calls and US$2–4 per encounter, not yet measured,
  against a legacy engine that runs locally at almost no cost.
- **Model availability.** The published `o1` configuration cannot be reproduced after
  2026-12-11.
- **Data governance.** Case text goes to the Sentra service and from there to a model provider.
  - The PII guard is a pattern detector. A bare patient name would pass it.
  - Chief must sign off data governance before any real case is sent.
  - How the service authenticates the extension is not decided. The client sends no credentials
    today.
- **Deployment.** The service host must be allowed by the extension: either `localhost` during
  development or an added `host_permissions` entry.

## Alternatives Considered

1. **Improve the legacy engine only** (a larger knowledge base, better matching, a wider rerank).
   It keeps determinism, but does not address open-ended reasoning or next-question guidance.
   Still possible, and the Gate 1 comparator shows how far it falls short.
2. **Replace the legacy engine outright.** Rejected: it leaves no comparator and no fallback
   while MIRA is unproven on Puskesmas cases.
3. **Run MIRA from the extension with an OpenAI key.** Rejected: it puts a secret into every
   installation and bypasses server-side governance.
4. **Widen the existing rerank** (let the LLM add candidates). Rejected as a halfway step: it
   breaks the "knowledge base wins" rule without the evidence, missing-information and
   next-action structure that justifies breaking it.
