---
document_id: "14"
title: "Functional Requirements"
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

# Functional Requirements

## Function

Behaviors.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


| ID | Behavior |
|---|---|
| FR-1 | Ingest WhatsApp via Baileys bridge; honor DM/group policies |
| FR-2 | Load profile SOUL + skills |
| FR-3 | Tool use: filesystem, terminal, browser-use, web search, kanban, cron, as enabled |
| FR-4 | Memory propose/apply per config |
| FR-5 | Control center / console: status and allowlisted script actions |
| FR-6 | CI-ish local checks: unittest + secret scan scripts |
