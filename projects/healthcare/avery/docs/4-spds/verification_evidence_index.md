---
document_id: "48"
title: "Verification Evidence Index"
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

# Verification Evidence Index

## Function

Index to actual evidence.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


| Claim | Evidence pointer | As of |
|---|---|---|
| Unittest suite exists | `scripts/test.ps1`, `tests/` | inspect now |
| Gate 0 audit | `../gate-0-reality-audit.md` | 2026-08-23 |
| FIX evidence | `../evidence/` | 2026-08-23+ |
| Tech-debt actions | `../tech-debt-2026-08-24.md`, `../handoff-2026-08-24.md` | 2026-08-24 |
| Live gateway health | host logs / health scripts | must re-inspect |

**No evidence, no verified claim.**
