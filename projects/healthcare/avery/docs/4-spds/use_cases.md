---
document_id: "16"
title: "Use Cases"
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

# Use Cases

## Function

Use cases.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


- UC-1 Chief greets Avery in DM → warm bounded reply.
- UC-2 Group chatter without mention → NO_REPLY.
- UC-3 Member asks "where are we on X?" → load sentra skills, answer from canonical sources.
- UC-4 Chief: "handle this" → execute within envelope, verify mutations, report.
- UC-5 Clinical question about a patient → refuse diagnosis; route to clinician.
- UC-6 Unknown DM → ignore per policy.
