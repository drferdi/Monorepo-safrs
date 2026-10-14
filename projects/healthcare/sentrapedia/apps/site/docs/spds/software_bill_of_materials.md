---
document_id: "135"
title: "Software Bill of Materials"
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

# Software Bill of Materials

## Function
Preserve a human-readable runtime component inventory.

| Component | Form | Status |
| --- | --- | --- |
| Node.js >=22 | runtime | required; version constraint declared |
| Bootstrap CSS 5.3.8 | mirrored browser asset | license verification required |
| Bootstrap Icons 1.11.3 | mirrored browser asset | license/fonts present; verify notice |
| Slick Carousel 1.8.1 | mirrored browser asset | license verification required |
| jQuery / jQuery Migrate | mirrored browser assets | embedded notices; verify versions |
| GSAP + plugins | local browser bundles | redistribution terms require review |
| Caveat font | local font | OFL text included |
| Inter font/theme assets | local assets | provenance and rights incomplete |
| Resend | optional external service | not bundled; production approval pending |
