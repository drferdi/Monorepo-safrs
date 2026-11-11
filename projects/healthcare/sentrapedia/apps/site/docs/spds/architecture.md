---
document_id: "21"
title: "Architecture"
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
classification: CORE
review_trigger: "material change to purpose, architecture, runtime, data handling, risk, or evidence"
---

# Architecture

## Function
Decide the authoritative architecture.

Authored inputs live in `source/` and `assets/`; `scripts/transform.mjs` produces `site/`. `scripts/serve.mjs` serves the generated site and delegates `POST /api/contact` to `scripts/contact.mjs`. Tests and `scripts/verify.mjs` validate behavior and presentation integrity. The site subsystem has no root or cross-capsule runtime dependency.
