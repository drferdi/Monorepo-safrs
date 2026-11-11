---
document_id: "S03"
title: "Epistemic Ledger"
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
classification: SENTRA
review_trigger: material change to purpose, architecture, runtime, or evidence
---

# Epistemic Ledger

## Function

FACT vs DECISION vs ASSUMPTION vs UNKNOWN.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


## FACT

- Capsule path `projects/healthcare/avery` exists with profile, skills, scripts, tests, console.
- `capabilities.json` version 0.2.0 lists capabilities and `not_yet`.
- SOUL.md forbids clinical origination and restart apologies to WhatsApp.
- Older docs and HANDOFF may disagree on `write_approval` / FULL AUTO — do not collapse that disagreement into a single fake fact.

## DECISION

- Avery is not SaMD (Chief / this SPDS set).
- Baileys transport accepted with risk.
- Group widening (`group_policy: open`) was explicitly not applied in 2026-08-24 handoff.

## ASSUMPTION

- Example config still approximately matches production keys (values in example are placeholders).

## HYPOTHESIS

- Official Cloud API would reduce ban risk (not implemented).

## UNKNOWN

- Live gateway up/down at read time.
- Exact live model id.
- Exact live write_approval boolean without reading host config.yaml.

## DISPUTED

- Memory write_approval true (older governance docs) vs FULL AUTO false (handoff 2026-08-24). **Resolve by inspecting live config.yaml.**

## SUPERSEDED

- Contact-outreach broker as second permission layer (noted as dropped in monorepo HANDOFF for Avery).
