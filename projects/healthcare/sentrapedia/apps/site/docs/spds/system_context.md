---
document_id: "20"
title: "System Context"
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

# System Context

## Function
Define external actors and systems.

Visitors retrieve static pages and may submit a general inquiry. The local/production Node server serves files and validates contact requests. When configured, the server sends validated contact text to Resend, which relays it to the fixed approved recipient. No clinical system, EHR, patient database, model service, analytics platform, or authentication provider is connected.
