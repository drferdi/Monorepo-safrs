---
document_id: "51"
title: "Risk Register"
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

# Risk Register

## Function
Preserve material product and delivery risks.

| Risk | State | Control / next evidence |
| --- | --- | --- |
| Visitors treat marketing examples as clinical advice | Open | physician-authority copy; claim review |
| Patient information entered in contact form | Controlled, residual | pattern rejection, explicit instruction, no echo |
| Contact data retained by external provider | UNKNOWN | approve provider terms and retention |
| Third-party assets lack redistribution clearance | Open | complete license register before publish |
| Ignored Bootstrap path absent from Git index | Open | force-stage exact asset and prove checkout |
| Production outage or relay failure | UNKNOWN | hosting, telemetry, rollback, and incident plan |
| Synthetic material mistaken for validated outcomes | Controlled, residual | label examples and prohibit efficacy claims |
