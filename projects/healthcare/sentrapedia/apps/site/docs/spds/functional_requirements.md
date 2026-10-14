---
document_id: "14"
title: "Functional Requirements"
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

# Functional Requirements

## Function
Define observable software behavior.

| ID | Requirement |
| --- | --- |
| FR-01 | Build copies authored pages and assets into `site/`. |
| FR-02 | Preview serves local files with correct MIME and byte-range responses. |
| FR-03 | Hero contains only the neuron and Sentrapedia heading. |
| FR-04 | Workflow media use local posters/videos and remain controllable. |
| FR-05 | Contact validation rejects malformed, excessive, cross-origin, and patient-like input. |
| FR-06 | Contact reports success only after provider acceptance. |
| FR-07 | Verification detects protected presentation or missing local assets. |
