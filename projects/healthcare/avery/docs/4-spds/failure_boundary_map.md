---
document_id: "S11"
title: "Failure Boundary Map"
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

# Failure Boundary Map

## Function

Failures before they happen.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


| Failure | Blast radius | Degraded | Recovery owner | Auto recover | Escalate | Unacceptable |
|---|---|---|---|---|---|---|
| Model 429 | no replies | wait/fallback | operator | partial | if persistent | silent forever without alert |
| Bridge death | no WhatsApp | other UIs maybe up | operator | no (restart script) | immediately | orphan process + false unpaired |
| Session leak | account takeover | isolate number | Chief | no | immediately | continued operation |
| Clinical answer | patient harm via reliance | refuse + correct | Chief | no | immediately | any diagnostic pose |
