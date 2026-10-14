---
document_id: "64"
title: "Privacy Impact Assessment"
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
classification: CONDITIONAL
review_trigger: "material change to purpose, architecture, runtime, data handling, risk, or evidence"
---

# Privacy Impact Assessment

## Function
Assess privacy impact of contact processing.

The form may process name, email, institution, phone, and free-text message. It explicitly rejects patient-like identifiers and does not define durable local storage. Resend and the recipient become processors/recipients when enabled. Lawful basis, notice wording, retention duration, data-subject request process, international transfer status, and processor agreement are UNKNOWN and block production acceptance.
