---
document_id: "13"
title: "System Requirements"
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

# System Requirements

## Function
Define system-level requirements.

- Node.js 22 or newer executes build, preview, tests, and verification.
- Runtime dependencies are capsule-local; current scripts use Node built-ins.
- `source/` and `assets/` are authored inputs; `site/` is generated output.
- The server binds to `127.0.0.1` by default and constrains paths to the site root.
- Contact delivery requires `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and an approved exact origin in production.
