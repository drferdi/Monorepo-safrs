---
document_id: "65"
title: "Data Retention Policy"
status: active
authority: Chief
owner: dr. Ferdi Iskandar
version: "1.0.0"
created: "2026-08-25"
last_verified: "2026-08-25"
applies_to: projects/healthcare/avery
source_of_truth: true
supersedes: []
related_requirements: []
related_decisions: []
related_evidence: []
agent_readable: true
agent_editable: false
human_approval_required: true
classification: CONDITIONAL
review_trigger: material change to purpose, architecture, runtime, or evidence
---

# Data Retention Policy

## Function

Retention.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


Runtime sqlite/logs: operator-defined; not in git. Pending approvals: expire per outbound store rules (e.g. 15 minutes in tests). Memories: keep until Chief deletes. Backups: encrypted, Chief-owned. No retention of PHI in repository — retention period is **zero**.
