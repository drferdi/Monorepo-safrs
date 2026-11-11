---
document_id: "15"
title: "Quality Requirements"
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

# Quality Requirements

## Function

ISO 25010-aligned qualities.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


| Quality | Requirement |
|---|---|
| Reliability | Fail closed on stale memory replace; restart via capsule scripts on Windows |
| Security | Secrets out of git; control-center CSRF/origin checks |
| Usability | Quiet groups; honorifics; no melodrama |
| Maintainability | Capsule-local scripts; do not couple to monorepo runtime |
| Compatibility | Hermes version documented in SBOM / gate-0 audit; patches re-applied after update |
