---
document_id: "52"
title: "Threat Model"
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

# Threat Model

## Function
Define credible threats and controls.

Threats include path traversal, oversized or malformed requests, cross-origin submissions, header injection, spam, patient-data entry, provider credential exposure, dependency tampering, and misleading success states. Current controls include resolved-root checks, body limits, origin matching, newline rejection, honeypot, per-IP rate limiting, secret-by-environment, CSP for HTML, no-store JSON, and provider-confirmed acceptance. Production abuse resistance remains unverified.
