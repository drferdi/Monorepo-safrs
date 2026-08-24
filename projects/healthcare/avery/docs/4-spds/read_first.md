---
document_id: "01"
title: "Read First"
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

# Read First

## Function

Single entry point for humans and agents.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


## Start order

1. Capsule root `PROJECT_GENOME.yaml`
2. `purpose_contract.md`
3. `current_state_snapshot.md`
4. `context_handoff_packet.md`
5. `autonomy_envelope.md`
6. Capsule `AGENTS.md` then `ai/profiles/avery/SOUL.md` before behavior changes

## Hierarchy

PROJECT_GENOME → PURPOSE CONTRACT → AUTHORITY/DECISIONS → REQUIREMENTS → ARCHITECTURE → IMPLEMENTATION → VERIFICATION EVIDENCE → CURRENT STATE → OUTCOME.

## Legacy

`docs/1-human`, `docs/2-agent`, `docs/3-governance`, `docs/architecture.md`, `docs/data.md`, and `docs/testing.md` remain operational references. If they conflict with this SPDS set, record the conflict in `project_drift_ledger.md` and follow SPDS plus inspectable runtime evidence.
