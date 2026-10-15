---
document_id: "26"
title: "Interface Contracts"
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

# Interface Contracts

## Function
Interface Contracts defines communication boundaries.

Interfaces are browser HTTP GET/HEAD, local static files, `POST /api/contact`, environment variables, and the Resend HTTPS API. No monorepo, clinical application, EHR, model, account, billing, or analytics interface exists. See `api_specification.md`, `system_context.md`, and `deployment_architecture.md`.
