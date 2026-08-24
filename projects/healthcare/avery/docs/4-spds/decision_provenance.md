---
document_id: "S07"
title: "Decision Provenance"
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

# Decision Provenance

## Function

Decisions with authority and alternatives.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


| Decision | Authority | Evidence then | Alternatives | Depends on |
|---|---|---|---|---|
| Hermes + WhatsApp | Chief | operating agent | Cloud API, Slack | Baileys risk |
| Non-SaMD | Chief | intended use | Regulated product | H01 |
| Allowlist groups | Chief | silent-group incidents | open groups | env flags |
| Skills as markdown programs | Chief/engineering | Hermes skill model | compiled tools | runtime |
