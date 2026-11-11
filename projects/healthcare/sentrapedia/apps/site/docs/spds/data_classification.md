---
document_id: "63"
title: "Data Classification"
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

# Data Classification

## Function
Data Classification governs data handled by this site subsystem.

Public static content and synthetic media may be stored in Git and served publicly. Contact identity/message and source IP are personal or operational data; they must not enter repository fixtures or logs. The site subsystem defines no durable database. Provider retention, lawful basis, deletion handling, and production notice remain **UNKNOWN**. See `data_inventory.md` and `privacy_impact_assessment.md`.
