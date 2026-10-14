---
document_id: "S10"
title: "Context Handoff Packet"
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
classification: SENTRA
review_trigger: "material change to purpose, architecture, runtime, data handling, risk, or evidence"
---

# Context Handoff Packet

## Function
Preserve the minimum context needed by the next session.

Read `SITE_GENOME.yaml`, `read_first.md`, `../../../../.agents/HANDOFF.md`, `current_state_snapshot.md`, and `risk_register.md`. Use `source/` and `assets/` as authored inputs; regenerate `site/`. Keep patient data and secrets out. Do not claim production or clinical validation from local tests.
