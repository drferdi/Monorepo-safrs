---
document_id: "07"
title: "Authority and Decision Rights"
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

# Authority and Decision Rights

## Function
Authorize who may make consequential decisions.

- **Gaffer only:** purpose, public claims, pricing, production sender/recipient, public release, medical-device status, risk acceptance, and deployment.
- **Delegated engineering:** reversible implementation, tests, documentation maintenance, local preview, and scoped fixes consistent with approved purpose.
- **Prohibited without fresh authority:** real-patient data, production credentials, clinical decision logic, publication, or cross-capsule runtime coupling.
