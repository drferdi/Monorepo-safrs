---
document_id: "10"
title: "Project Status"
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

# Project Status

## Function

Lifecycle state.


## Classification note

Avery is an **institutional executive agent**, not software as a medical device. Healthcare overlay documents in this set exist to **prevent clinical overclaim**, not to register a device.

## Epistemic discipline

Separate FACT, DECISION, ASSUMPTION, HYPOTHESIS, UNKNOWN, DISPUTED, and SUPERSEDED. Chat and Git history are context, not operational truth.

## Authority

Chief (dr. Ferdi Iskandar) is the human authority of record. Agents execute inside `autonomy_envelope.md`.


**Lifecycle:** operating / maintenance (not greenfield).

**FACT:** Capsule contains profile, 18 skill packages under `ai/profiles/avery/skills`, outbound Python package, Electron console, deploy templates, and tests.

**FACT:** Runtime is a separately installed Hermes; live `config.yaml` is not in git.

**UNKNOWN (this workspace):** whether a given host's gateway is up at the moment a reader opens this file. Verify with local scripts, not this paragraph.

**ASSUMPTION:** WhatsApp allowlists and FULL AUTO flags described in `docs/handoff-2026-08-24.md` still reflect Chief's last applied runtime unless Chief changed them off-repo.
