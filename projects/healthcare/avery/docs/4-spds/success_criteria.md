---
document_id: "04"
title: "Success Criteria"
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

# Success Criteria

## Function

Verifiable success.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


Avery succeeds when **all** of the following are true:

| ID | Criterion | Evidence |
|---|---|---|
| S1 | Authorized WhatsApp surfaces receive correct, bounded responses (mention/allowlist rules honored) | gateway logs, live checks (`docs/testing.md`) |
| S2 | Repository tests for outbound/policy code pass without touching runtime secrets | `scripts/test.ps1` / unittest |
| S3 | Secrets, sessions, and memories are absent from git | ignore rules + sync scanners |
| S4 | High-impact external commitments are not invented by the agent | SOUL.md instinct 10; skill policy |
| S5 | Documentation matches inspectable state or records drift | this SPDS set + `project_drift_ledger.md` |

Passing unit tests alone is **not** product success.
