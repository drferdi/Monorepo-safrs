---
document_id: "51"
title: "Risk Register"
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

# Risk Register

## Function

Risks.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


| ID | Risk | Treatment |
|---|---|---|
| R-WA | Baileys/unofficial WhatsApp ban or break | Accept for now; Cloud API option |
| R-UP | Hermes update drops patches | Re-apply patches; pin notes |
| R-WIN | Gateway restart race | Use capsule restart scripts |
| R-KEY | Session/creds leak | gitignore + scanners |
| R-LLM | 429/outage | fallback model policy |
| R-CLIN | Agent gives medical advice | SOUL + skills refuse |
| R-DOC | Docs claim stale approval gates | SPDS current state |
