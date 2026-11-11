---
document_id: "117"
title: "Postmortem Template"
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
related_evidence: []
agent_readable: true
agent_editable: false
human_approval_required: true
classification: CONDITIONAL
review_trigger: "material change to purpose, architecture, runtime, data handling, risk, or evidence"
---

# Postmortem Template

## Function
Postmortem Template defines or preserves a required control for the Sentrapedia website.

**FACT:** Provide a public, reviewable Sentrapedia marketing experience for physicians and institutions while preserving physician authority and avoiding unsupported clinical claims.

Apply this document with `source/index.html`, `scripts/*.mjs`, `tests/migration-boundary.test.mjs`, `reference/design-integrity.json`, and `docs/migration-report.md`. Keep the site subsystem standalone, use synthetic data, preserve physician authority, and distinguish local verification from production or clinical evidence. Any production, credential, clinical-purpose, privacy-retention, or publication decision remains human-authorized.
