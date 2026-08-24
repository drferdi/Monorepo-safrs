---
document_id: "S05"
title: "Project Drift Ledger"
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

# Project Drift Ledger

## Function

Expected vs actual.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


| Expected | Actual | Impact | Action |
|---|---|---|---|
| Single current-state narrative | Legacy docs + handoff + SOUL | Agents guess | SPDS CURRENT_STATE is now canonical; update legacy or mark superseded |
| write_approval documented consistently | Conflicting files | Wrong autonomy | Inspect host; then edit example/docs together |
| capabilities monitoring | `not_yet` includes monitoring | Overclaim | Do not claim APM |
| Medical documentation if health folder | Must not imply SaMD | Regulatory risk | H01–H10 classify non-device |
