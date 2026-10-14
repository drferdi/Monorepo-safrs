---
document_id: "05"
title: "Scope and Boundaries"
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

# Scope and Boundaries

## Function
Define what this site subsystem owns and what remains outside it.

## In scope

Authored HTML, CSS, JavaScript, local media, static build output, preview server, contact validation and relay adapter, tests, verification assets, migration records, and project documentation.

## Out of scope

The Sentrapedia clinical application, patient data, diagnosis or treatment decisions, model inference, accounts, billing, analytics, production infrastructure, and monorepo-root runtime dependencies.
