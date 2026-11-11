---
document_id: "07"
title: "Authority and Decision Rights"
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
classification: CORE
review_trigger: material change to purpose, architecture, runtime, or evidence
---

# Authority and Decision Rights

## Function

Who may decide what.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


| Class | Decider | Agent role |
|---|---|---|
| Purpose, persona (`SOUL.md`), group/DM policy, FULL AUTO vs gated writes | Chief only | Propose |
| Capsule engineering within envelope | Agents / implementers | Execute |
| Institutional statements, pricing, legal, clinical claims, external commitments | Chief | Never originate |
| Memory/skill file writes | Per live `config.yaml` (see CURRENT_STATE) | Propose or apply only as configured |
| Production deploy | Chief | Prepare only |

R3 actions (production credentials, production deploy, irreversible real-data mutation) require explicit Chief authorization in the session that executes them.
