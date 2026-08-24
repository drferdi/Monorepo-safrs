---
document_id: "93"
title: "Autonomy Envelope"
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

# Autonomy Envelope

## Function

Human vs agent vs execution freedom.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


## Human authority only

Purpose, persona, production deploy, secrets, group/DM policy flags that widen access, medical-device claims, institutional commitments.

## Agent authority (delegated)

Routine engineering inside the capsule; using tools to complete Chief-assigned tasks; proposing memory; executing already approved outbound drafts via the outbound library.

## Execution freedom

Inside a delegated task, choose implementation details that are reversible, tested, and secret-free. Do not expand scope to other capsules. Do not ask permission for `git status` or unittest. Do ask (or stop) at R3 and SOUL edits.
