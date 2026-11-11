---
document_id: "S10"
title: "Context Handoff Packet"
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

# Context Handoff Packet

## Function

Takeover packet.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


**Purpose:** WhatsApp executive agent under Chief.

**Current state:** see current_state_snapshot.md.

**Active decisions:** non-SaMD; Baileys; allowlist (open group not enabled per 2026-08-24).

**Unresolved:** live write_approval; VPS; Cloud API; monitoring.

**Active risks:** R-WA, R-UP, R-DOC.

**Current task:** SPDS 1.0 documentation set (this directory).

**Authoritative sources:** PROJECT_GENOME.yaml, purpose_contract.md, SOUL.md, live config on host.

**Prohibited assumptions:** Avery is a medical device; tests imply production health; example YAML is the live secret-bearing config.

**Next evidence required:** `scripts/test.ps1` result; optional `hermes doctor` on host.
