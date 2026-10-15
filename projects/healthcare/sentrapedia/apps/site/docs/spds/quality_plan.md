---
document_id: "40"
title: "Quality Plan"
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

# Quality Plan

## Function
Quality Plan defines evidence for this site subsystem.

Use focused Node tests, full site tests, the local verifier, migration hash checks, and browser review. Synthetic and mocked evidence is labeled as such. A passing gate demonstrates its stated behavior only; it does not prove production availability, real delivery, clinical benefit, accessibility conformance, or regulatory status. See `verification_evidence_index.md`.
