---
document_id: "25"
title: "Data Architecture"
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
classification: CONDITIONAL
review_trigger: "material change to purpose, architecture, runtime, data handling, risk, or evidence"
---

# Data Architecture

## Function
Define data structures, stores, and movement.

Static assets are files. Build state is deterministic generated output. Contact fields exist transiently in request memory and outbound provider payloads; the site subsystem defines no database or durable application store. An in-memory per-IP attempt list resets on process restart. Repository fixtures are synthetic and must contain no PHI.
