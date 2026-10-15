---
document_id: "53"
title: "Security Architecture"
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

# Security Architecture

## Function
Decide the security boundary.

The public server exposes static GET/HEAD and one JSON contact POST. It stores no application database, serves no secrets, and binds locally by default. Production secrets enter only through environment variables. Browser assets are local. Contact messages cross the boundary only to Resend after validation; the recipient is fixed in code.
