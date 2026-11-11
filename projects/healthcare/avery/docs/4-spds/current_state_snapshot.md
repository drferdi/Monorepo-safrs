---
document_id: "S04"
title: "Current State Snapshot"
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

# Current State Snapshot

## Function

What exists now.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


Inspected from the capsule tree on 2026-08-25 (repository), not from a live Hermes process.

**Present in git:** persona, 18 skills, config.example.yaml, capabilities.json, docs (legacy layers + this SPDS), scripts, src/avery_outbound, Electron console, deploy templates, evidence folders.

**Not in git (by design):** live config.yaml, .env, WhatsApp session, MEMORY.md, sqlite.

**Divergence:** Layer-3 permission-broker still describes `write_approval: true` as configuration; 2026-08-24 operational handoff describes FULL AUTO with approvals false. Operational truth is the **host file**.

**Outstanding:** VPS cutover unverified from this session; WhatsApp live tests require Chief.
