---
document_id: "06"
title: "Stakeholder Map"
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

# Stakeholder Map

## Function

Who cares and why.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


| Stakeholder | Interest | Authority |
|---|---|---|
| Chief (dr. Ferdi Iskandar) | Mandate, persona, production WhatsApp policy | Final |
| Founding Core (named in SOUL.md) | Correct address, privacy, useful coordination | Consulted / informed |
| Operators of the Windows/VPS host | Uptime, backups, secrets | Delegated ops |
| Hermes upstream | Engine behavior | External vendor/community |
| Model providers (e.g. OpenRouter) | Inference | External |
| WhatsApp users outside allowlist | None — must be ignored | None |

Do not invent additional stakeholders as if they were authorized.
