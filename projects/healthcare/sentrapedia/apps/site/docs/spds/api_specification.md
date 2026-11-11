---
document_id: "27"
title: "Api Specification"
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

# Api Specification

## Function
Define the contact API contract.

### `POST /api/contact`

Accepts JSON fields `name`, `email`, optional `company`, optional `phone`, `message`, empty honeypot `website`, and `consent: true`. Responses: `202 accepted`, `400 invalid`, `403 rejected origin`, `413 too large`, `415 unsupported media`, `429 limited`, `502 provider failure`, or `503 unconfigured`. The endpoint must never echo submitted values.
