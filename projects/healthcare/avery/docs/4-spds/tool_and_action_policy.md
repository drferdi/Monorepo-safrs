---
document_id: "94"
title: "Tool and Action Policy"
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
classification: DOMAIN
review_trigger: material change to purpose, architecture, runtime, or evidence
---

# Tool and Action Policy

## Function

Tools.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


Use tools to finish work; do not narrate them on WhatsApp. Terminal/browser are dual-use: no attacks, no credential printing. `send_message` may be intentionally unregistered as an agent tool in some Hermes builds — outbound then uses cron/CLI/MCP. Verify live tool list with `hermes doctor` on the host.
