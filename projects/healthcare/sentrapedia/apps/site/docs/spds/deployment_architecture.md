---
document_id: "28"
title: "Deployment Architecture"
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

# Deployment Architecture

## Function
Define deployment assumptions and unresolved topology.

**FACT:** the verified runtime is a single Node process serving `site/` and an optional contact endpoint.

**UNKNOWN:** hosting provider, domain, TLS termination, process supervision, secrets store, CDN, WAF, scaling, logs, backups, and rollback mechanism. Production deployment is not authorized by this document.
