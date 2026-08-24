---
document_id: "130"
title: "Compliance Matrix"
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

# Compliance Matrix

## Function

Compliance.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


| Framework | Posture |
|---|---|
| SAFRS | Capsule under monorepo policy |
| ISO 27001 | Aligned practices, not certified |
| ISO 42001 | Aligned AI docs, not certified |
| ISO 13485 / 14971 / IEC 62304 | **Not applicable as device QMS** — overlay explains non-applicability |
| HIPAA | Not a US covered entity product; still no PHI in git |
