---
document_id: "S04"
title: "Current State Snapshot"
status: active
authority: Gaffer
owner: "dr. Ferdi Iskandar"
version: "1.1.0"
created: "2026-10-14"
last_verified: "2026-10-15"
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

# Current State Snapshot

## Function
Preserve a dated implementation snapshot.

As of 2026-10-15, the site subsystem contains authored source/assets, generated `site/`, Node build/preview/contact tooling, a Vercel contact function (`api/contact.mjs`), 15 automated tests, a verifier, migration manifest/report, and SPDS documentation. It is public on Vercel at `https://sentrapedia.vercel.app` as a work-in-progress pre-beta site, deployed by CLI. Contact delivery returns 503 until the Resend secrets are set. Committed-checkout tests passed in the standalone split. Monitoring, legal basis/retention, licensing, and Git-connected deploys remain open.
