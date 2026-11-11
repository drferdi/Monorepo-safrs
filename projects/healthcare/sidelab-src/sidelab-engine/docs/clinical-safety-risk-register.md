# Clinical Safety Risk Register

## Non-Negotiable Invariants

- Clinician final authority: SideLab assists physicians; it does not diagnose, prescribe, refer, or treat autonomously.
- Red flag priority: deterministic red flags must be shown before routine model reasoning and must appear in the diagnostic/referral frame.
- No fabrication: missing vitals, labs, physical findings, scores, medication history, allergy history, and duration must not be invented.
- Explainability: diagnosis, trajectory, score, therapy, and referral suggestions must be traceable to input data, local references, or visible system warnings.
- Pharmacology traceability: drug suggestions must surface FORNAS/local lookup status, DDI/KI, patient-specific contraindication concerns, and manual-verification requirements.
- Indonesian FKTP context: output must remain aligned to Puskesmas/FKTP workflow, local stock/FORNAS references, and Bahasa Indonesia clinical usage.

## Active Risks

### R1 - Raw Streaming Before Final Safety Post-Processing

Severity: High

Evidence: `_chat_inner()` historically streamed model tokens before red-flag diagnostic-frame injection, pharmacology validation, provisional framing, and no-fabrication post-processing.

Why it matters: A clinician may act on or trust text that later gets corrected only in stored response.

Mitigation: Render finalized output only, via `finalize_clinical_output()`.

Mitigation type: code + tests.

### R2 - Pharmacology Rules Can Be Emptied Silently

Severity: Critical

Evidence: `data/pharma_rules.json` was previously `{}`, while `tests/clinical/test_pharma_guardrails.py` treats these rules as safety-critical.

Why it matters: noninfectious MSK/URI cases can retain irrelevant antibiotics.

Mitigation: Keep guardrail rules in data, test the file, and include `test_pharma_guardrails.py` in lightweight safety profile.

Mitigation type: data + tests.

### R3 - Anti-Fabrication Warning Not Persisted Everywhere

Severity: High

Evidence: warning panels can be printed separately from `last_response`.

Why it matters: saved, sent, or copied output may omit the safety warning.

Mitigation: route all final text through `finalize_clinical_output()`.

Mitigation type: code + tests.

### R4 - Minimum Three Drugs Pressure During Sparse Cases

Severity: High

Evidence: system prompt asks for minimum three drugs; insufficient-data guardrail forbids specific pharmacology.

Why it matters: the model can be pushed toward drug suggestions despite insufficient input.

Mitigation: explicitly relax minimum-three-drug requirement when data is insufficient.

Mitigation type: prompt + tests.

### R5 - Limited DDI/KI Enrichment

Severity: Medium

Evidence: FORNAS catalog is broad, but enrichment records are limited.

Why it matters: some common FKTP drug interactions or patient contraindications may not surface.

Mitigation: prioritize enrichment for common FKTP drugs and high-risk combinations.

Mitigation type: data + tests + clinical review.
