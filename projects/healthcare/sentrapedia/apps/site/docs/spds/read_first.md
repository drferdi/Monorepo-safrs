---
document_id: "01"
title: "Read First"
status: active
authority: Gaffer
owner: "dr. Ferdi Iskandar"
version: "1.0.0"
created: "2026-10-14"
last_verified: "2026-10-14"
applies_to: "projects/healthcare/sentrapedia/apps/site"
source_of_truth: true
supersedes: []
related_requirements: []
related_decisions: []
related_evidence: []
agent_readable: true
agent_editable: false
human_approval_required: true
classification: CORE
review_trigger: "material change to purpose, architecture, runtime, data handling, risk, or evidence"
---

# Read First

## Function
Guide humans and agents through the authoritative project record.

## Start here

1. Read `SITE_GENOME.yaml` and `purpose_contract.md`.
2. Read `authority_and_decision_rights.md` before changing product claims, contact delivery, or release state.
3. Read `current_state_snapshot.md`, `risk_register.md`, and `verification_evidence_index.md` before implementation.
4. Follow `AGENTS.md`, the local scripts in `package.json`, and the parent capsule lifecycle in `../../../../project.contract.json`.

## Classification

- **FACT:** This site subsystem is a public healthcare marketing website with a local Node.js server and an optional Resend contact relay.
- **DECISION:** The site subsystem is not a medical device, clinical decision system, AI runtime, or autonomous agent.
- **UNKNOWN:** Production host, public URL, sender approval, retention owner, uptime objectives, and final redistribution rights remain unverified.

## Authority order

Human direction from Gaffer → project genome → purpose contract → decisions → requirements → architecture → implementation → verification evidence → current state.
