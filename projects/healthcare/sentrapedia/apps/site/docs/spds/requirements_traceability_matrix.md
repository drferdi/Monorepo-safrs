---
document_id: "19"
title: "Requirements Traceability Matrix"
status: active
authority: Gaffer
owner: "dr. Ferdi Iskandar"
version: "1.0.0"
created: "2026-10-14"
last_verified: "2026-10-14"
applies_to: "projects/healthcare/sentrapedia/apps/site"
source_of_truth: true
supersedes: []
related_requirements: []
related_decisions: []
related_evidence: ["docs/migration-report.md", "reference/verification.json"]
agent_readable: true
agent_editable: false
human_approval_required: true
classification: CORE
review_trigger: "material change to purpose, architecture, runtime, data handling, risk, or evidence"
---

# Requirements Traceability Matrix

## Function
Trace product requirements to implementation and evidence.

| Requirement | Implementation | Verification |
| --- | --- | --- |
| FR-01 | `scripts/transform.mjs` | build + migration tests |
| FR-02 | `scripts/serve.mjs` | `scripts/serve.test.mjs`, verifier |
| FR-03 | `source/index.html`, design CSS | `scripts/hero.test.mjs`, browser capture |
| FR-04 | workflow assets/controller | playback tests + verifier |
| FR-05/06 | `scripts/contact.mjs` | `scripts/contact.test.mjs` |
| FR-07 | `scripts/verify.mjs` | verifier output |
