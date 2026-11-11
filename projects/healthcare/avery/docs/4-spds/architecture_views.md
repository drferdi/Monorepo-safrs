---
document_id: "22"
title: "Architecture Views"
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

# Architecture Views

## Function

Views.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


**Logical:** profile, skills, outbound store, console.

**Runtime:** gateway process, node bridge, optional dashboards.

**Data:** sqlite state/kanban, MEMORY.md/USER.md off-repo, session creds off-repo.

**Deployment:** laptop default; `deploy/` Docker compose for gateway+dashboard; Hostinger runbook.

**Security:** allowlists, origin checks, secret ignore, fail-closed replace.
