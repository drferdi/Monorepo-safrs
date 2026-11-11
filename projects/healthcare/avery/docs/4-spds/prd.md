---
document_id: "12"
title: "Product Requirements Document"
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

# Product Requirements Document

## Function

Product requirements.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


## Users

Founding Core members on authorized WhatsApp DMs/groups; Chief as operator.

## Jobs to be done

Orient, retrieve canonical Sentra knowledge, separate decisions from chatter, prepare outreach/onboarding, run bounded tools, schedule follow-up, refuse clinical/legal/financial origination.

## Requirements (product)

- PR-1 Mention/allowlist gating on groups.
- PR-2 Indonesian operational language with defined honorifics.
- PR-3 Skill-first institutional answers (`skill_view` before recall).
- PR-4 No tool narration in WhatsApp.
- PR-5 Memory writes follow live approval policy.
- PR-6 Secrets never in repository.
- PR-7 Outbound high-impact sends follow `src/avery_outbound` policy where that path is used.
