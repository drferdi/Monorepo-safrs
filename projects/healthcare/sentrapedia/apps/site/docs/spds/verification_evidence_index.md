---
document_id: "48"
title: "Verification Evidence Index"
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
classification: SENTRA
review_trigger: "material change to purpose, architecture, runtime, data handling, risk, or evidence"
---

# Verification Evidence Index

## Function
Index evidence without overstating it.

- `docs/migration-report.md`: lifecycle, extraction, and known root-gate evidence.
- `docs/migration-manifest.json`: byte-level migration closure.
- `reference/design-integrity.json`: protected presentation baseline.
- `reference/verification.json`: latest local verifier output.
- `scripts/*.test.mjs` and `tests/migration-boundary.test.mjs`: executable behavior checks.

Evidence is local unless explicitly identified as production evidence.
