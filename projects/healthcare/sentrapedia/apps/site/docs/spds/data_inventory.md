---
document_id: "61"
title: "Data Inventory"
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

# Data Inventory

## Function
Preserve the known data inventory.

| Data | Classification | Storage | Destination |
| --- | --- | --- | --- |
| Public pages and brand media | Public | repository/site | visitor browser |
| Synthetic clinical examples | Public demonstration | repository/site | visitor browser |
| Contact identity and message | Personal/confidential | transient process memory | Resend + fixed recipient |
| Source IP for rate limiting | Personal/operational | transient in-memory timestamps | local process only |
| API key/from address | Secret/configuration | environment only | Resend authentication |
