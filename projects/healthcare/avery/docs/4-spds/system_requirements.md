---
document_id: "13"
title: "System Requirements"
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

# System Requirements

## Function

System/software requirements.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


- SR-1 Windows or Linux host capable of running Hermes gateway + Node WhatsApp bridge.
- SR-2 Python 3.12+ for capsule tests and optional control center.
- SR-3 Persistent disk for Hermes profile (session, sqlite, logs) **outside git**.
- SR-4 Network to model provider; optional VPS (Hostinger KVM class) for 24/7.
- SR-5 Loopback-only dashboards unless tunneled; no LAN-trust assumption (RFC1918 is untrusted).
