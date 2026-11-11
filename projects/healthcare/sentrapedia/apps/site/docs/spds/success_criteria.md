---
document_id: "04"
title: "Success Criteria"
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

# Success Criteria

## Function
Define measurable acceptance signals.

| Criterion | Evidence | State |
| --- | --- | --- |
| Site lifecycle works inside the standalone product capsule | parent `project.contract.json`, site package scripts | Verified locally |
| Local links and media resolve | `node --run verify` | Verified locally |
| Hero shows neuron then Sentrapedia | `scripts/hero.test.mjs`, browser evidence | Verified locally |
| Contact fails closed without config | `scripts/contact.test.mjs` | Verified locally |
| No real patient data in fixtures | repository review and policy | Required; continuous |
| Production delivery and uptime | live environment evidence | UNKNOWN |
| Third-party redistribution rights | license inventory and approvals | PARTIAL |
