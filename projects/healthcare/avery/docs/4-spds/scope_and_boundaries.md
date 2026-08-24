---
document_id: "05"
title: "Scope and Boundaries"
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

# Scope and Boundaries

## Function

In, out, non-goals.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


## In scope

`ai/profiles/avery/**` (persona, skills, example config), `scripts/`, `src/avery_outbound`, `console/`, `deploy/`, `docs/`, capsule tests, Hermes patch notes that belong to this capsule.

## Out of scope

Monorepo control-plane packages as runtime dependencies; other capsules; production credential stores; rewriting Hermes upstream product.

## Non-goals

IEC 62304 medical device; always-on group chatter; unconstrained tool use; replacing Chief's authority.
