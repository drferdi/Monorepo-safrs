---
document_id: "42"
title: "Test Strategy"
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

# Test Strategy

## Function
Define test levels and their limits.

Node tests cover source structure, contact validation/relay behavior, FAQ, server paths/MIME/ranges, workflow playback, and migration closure. The verifier checks presentation hashes and local targets. Browser checks cover interaction and responsive behavior. Tests use synthetic data and mock provider acceptance; they do not validate clinical effectiveness or real delivery.
