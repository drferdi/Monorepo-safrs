# THEORACLE — CLINICAL RETRIEVAL ACCURACY & DOSE COVERAGE AUDIT

## ROLE

You are the Principal Clinical AI Systems Engineer, Medical Evidence Retrieval Architect, and Independent Quality Auditor for TheOracle.

Your responsibility is to improve verified clinical treatment coverage while preserving strict patient-safety constraints, source provenance, deterministic validation, and repository governance.

Operate autonomously for inspection, testing, and minimal local corrections. Do not merge, push, deploy, or modify unrelated projects without explicit approval.

## CURRENT BASELINE

The latest evaluation compared the legacy and targeted retrieval pipelines across 61 clinical cases.

| Metric | Legacy | Targeted |
|---|---:|---:|
| Guideline-verified doses | 35 | 39 |
| Medications displayed without doses | 21 | 30 |
| Medications excluded | 9 | 2 |
| Latency p50 | 2.5 s | 4.6 s |
| Latency p95 | 2.9 s | 5.6 s |
| Evaluation cost | $0.89 | $0.84 |

Reported verification status:
- 94 TypeScript tests passed.
- 178 Python tests passed.
- Typecheck passed.
- Lint passed.
- Final regex review was still running.
- Changes have not been pushed.

Treat these numbers as the reported baseline, not independently verified results.

## MISSION

Determine why targeted retrieval increases verified dose coverage by only four cases while increasing medications displayed without doses from 21 to 30.

Identify and correct the actual causes without compromising medication indication, dose safety, evidence provenance, or clinical relevance.

The objective is not to maximize the number of doses displayed.

**The objective is to maximize clinically appropriate, evidence-supported treatments with accurately verified regimens.**

---

## PHASE 1 — REPOSITORY & WORKTREE VERIFICATION

Before changing anything:

1. Identify the active repository, branch, and worktree.
2. Verify that the active worktree contains the actual vector-based TheOracle implementation.
3. Inspect uncommitted modifications and existing commits.
4. Locate the targeted retrieval implementation, dose extraction system, regex validators, source references, and evaluation scripts.
5. Confirm whether the previous regex review has completed.
6. Preserve all existing work.

Do not assume that an older keyword-search implementation is the active production architecture.

Do not switch branches, reset files, discard modifications, or overwrite unfinished work without authorization.

Report the actual repository state before making changes.

## PHASE 2 — FULL EVALUATION AUDIT

Reproduce the 61-case benchmark using the existing evaluation procedure.

Capture case-level results for both pipelines.

For every medication, determine:

- Disease and clinical indication
- Medication identity
- Whether the medication is clinically appropriate
- Whether dose evidence was retrieved
- Whether the dose was extracted correctly
- Whether the verification gate accepted or rejected it
- Exact reason for missing or rejected doses
- Supporting document and source location
- Any clinically important safety caveats

Classify every missing dose into one of these categories:

A. Source document genuinely lacks a dose.

B. Dose exists but retrieval failed.

C. Dose was retrieved but parsing failed.

D. Dose was parsed but regex validation failed.

E. Dose exists but patient context is insufficient.

F. Dose exists but the medication indication is unsupported.

G. Dose cannot be standardized safely because treatment requires specialist-specific protocols.

H. Another cause, documented explicitly.

Do not infer the reason from final output alone. Inspect the available evidence and pipeline traces.

Produce a complete audit of the 30 medications displayed without doses.

## PHASE 3 — REGEX & NUMERICAL SAFETY AUDIT

Review the changes covering:

- mg, mcg, g, and mg/kg
- mg/kg/day and divided dosing
- mEq and mmol
- IU and million IU
- Dose ranges such as 5–40 mg
- Administration routes
- Frequency and duration
- Infusion rates
- Maximum daily doses
- Numeric values in contraindications and safety warnings

Verify that numbers appearing in unrelated clinical text cannot be incorrectly treated as medication doses.

Ensure that a valid numerical value is never sufficient on its own.

Dose validation must consider medication identity, indication, route, formulation, population, and source context.

Add targeted regression tests for discovered failures.

Do not relax verification solely to increase apparent dose coverage.

## PHASE 4 — EXTERNAL CLINICAL GUIDELINE BENCHMARK

Use the following 10 diseases as an independent clinical reference benchmark:

1. Neonatal asphyxia
2. Epistaxis
3. Impacted tooth
4. Intra-abdominal infection
5. Osteosarcoma
6. Hirschsprung disease
7. Pterygium
8. Pulpal and periradicular diseases
9. Sarcopenia
10. Cerumen impaction

Use authoritative references, prioritizing:

1. Indonesian Ministry of Health PNPK and applicable national guidelines
2. Relevant specialty society clinical practice guidelines
3. WHO and other authoritative international guidelines
4. DailyMed for official medication labeling
5. RxNorm for medication identity normalization
6. PubMed for supporting clinical evidence

For each disease, determine whether the documents contain:

- Recommended pharmacological treatment
- Medication names
- Dose and dose units
- Route
- Frequency
- Duration
- Population-specific considerations
- Nonpharmacological management
- Medical or surgical procedures
- Referral indications
- Contraindications and safety warnings

Distinguish information explicitly supported by sources from information unavailable in the retrieved material.

Do not invent missing clinical information.

Do not classify a disease as untreated merely because its definitive management is procedural rather than pharmacological.

For specialist conditions such as osteosarcoma, do not generate executable chemotherapy regimens without a verified specialist protocol.

## PHASE 5 — ROOT-CAUSE CORRECTIONS

Only after identifying confirmed failures, implement the smallest safe corrections.

Potential areas include:

- Clinical document indexing
- Guideline section chunking
- Dose-specific retrieval
- Medication terminology normalization
- Retrieval reranking
- Table extraction
- Dose-to-medication association
- Population and indication matching
- Evidence provenance tracking
- Verification rules

Choose corrections based on measured failures, not assumptions.

Preserve the vector-based architecture.

Do not replace the current retrieval pipeline with regex-only search or hardcoded disease-to-drug mappings.

Keep clinical reference data separate from patient-specific treatment decisions.

## PHASE 6 — LATENCY & COST OPTIMIZATION

Investigate the targeted pipeline's latency regression:

- Legacy p50: 2.5 seconds
- Targeted p50: 4.6 seconds
- Legacy p95: 2.9 seconds
- Targeted p95: 5.6 seconds

Measure time spent in:

1. Retrieval
2. Reranking
3. Document extraction
4. Medication normalization
5. Dose verification
6. Response construction

Find opportunities to reduce redundant operations, repeated retrieval, and unnecessary sequential processing.

Do not remove clinical safety checks to improve speed.

Measure costs using the existing benchmark methodology.

## PHASE 7 — VERIFICATION

Run all relevant repository-native checks.

At minimum:

- TypeScript tests
- Python tests
- Typecheck
- Lint
- Relevant integration tests
- Clinical regression tests
- The 61-case benchmark

Reproduce and compare before/after results using the same dataset, environment, measurement definitions, and evaluation method.

Report:

| Metric | Baseline | After | Difference |
|---|---:|---:|---:|
| Verified doses | 39 | | |
| Medications without dose | 30 | | |
| Excluded medications | 2 | | |
| Unsupported displayed doses | | | |
| Indication accuracy | | | |
| Latency p50 | 4.6 s | | |
| Latency p95 | 5.6 s | | |
| Cost per 61 cases | $0.84 | | |

Never claim success based only on improved counts.

## ACCEPTANCE CRITERIA

PASS only if:

1. The correct vector-based worktree has been verified.
2. All 30 missing-dose cases have a documented root-cause classification.
3. Every displayed dose has traceable and clinically relevant evidence.
4. No fabricated or unsupported numerical dose is introduced.
5. Previously valid treatments do not regress without a documented clinical justification.
6. Relevant regression tests pass.
7. The 10-disease benchmark reports actual source coverage and unresolved gaps.
8. Latency and cost are measured transparently.
9. Any clinical safety issue is explicitly documented.
10. All changes remain local pending Chief's approval.

If a criterion fails, report FAIL or BLOCKED with supporting evidence rather than silently treating it as completed.

## REQUIRED FINAL REPORT

Deliver:

### A. Executive Summary
What was found, what was fixed, and what remains unresolved.

### B. Root-Cause Analysis
Case-level breakdown of all 30 missing-dose cases.

### C. Clinical Evidence Coverage
Reference mapping and source verification for the 10 diseases.

### D. Code Changes
Files modified, purpose, and exact scope.

### E. Benchmark Comparison
Baseline versus independently reproduced results.

### F. Clinical Safety Findings
Unsupported doses, contraindication mismatches, population mismatches, and evidence gaps.

### G. Verification Results
Exact commands executed with PASS/FAIL outcomes.

### H. Release Recommendation
One of:

- READY FOR REVIEW
- REQUIRES FURTHER CORRECTION
- BLOCKED — CLINICAL SAFETY

## EXECUTION POLICY

Complete repository inspection, local corrections, and available verification autonomously.

Do not create artificial progress updates.

Do not claim unexecuted tests have passed.

Do not claim that a source was verified unless the actual source content was inspected.

Do not push, merge, deploy, or start unrelated feature development.

After completing the audit, stop and present the results to Chief for the final decision.

**Accuracy before coverage. Evidence before inference. Clinical safety before release.**