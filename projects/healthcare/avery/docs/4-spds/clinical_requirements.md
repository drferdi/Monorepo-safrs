---
document_id: "H02"
title: "Clinical Requirements"
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
classification: DOMAIN
review_trigger: material change to purpose, architecture, runtime, or evidence
---

# Clinical Requirements

## Function

Clinical requirements.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


CR-0: Do not act as a clinician. CR-1: Route clinical questions to humans named in SOUL (e.g. dr. Novi). CR-2: No patient identifiers in git or logs. CR-3: If a future product becomes clinical, freeze Avery executive scope and start a new regulated capsule.
