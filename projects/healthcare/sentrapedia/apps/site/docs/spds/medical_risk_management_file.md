---
document_id: "H04"
title: "Medical Risk Management File"
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
classification: DOMAIN
review_trigger: "material change to purpose, architecture, runtime, data handling, risk, or evidence"
---

# Medical Risk Management File

## Function
Preserve the non-device medical-risk boundary.

This site subsystem has no medical-device risk file because it has no intended medical use. Residual communication hazards are managed in `risk_register.md`: overclaim, patient-data entry, and confusion between synthetic examples and validated outcomes. If intended use changes, stop release and initiate formal regulatory classification and risk management.
