# SPDS frontmatter

Every authoritative markdown file under `docs/spds/` starts with this header. Fill real values. Do not leave placeholders like `TBD` unless the field is genuinely unknown — then say `unknown` and why.

```yaml
---
document_id: "01"
title: "Read First"
status: active
authority: Chief
owner: "<human owner>"
version: "1.0.0"
created: "YYYY-MM-DD"
last_verified: "YYYY-MM-DD"
applies_to: "<capsule path from repo root>"
source_of_truth: true
supersedes: []
related_requirements: []
related_decisions: []
related_evidence: []
agent_readable: true
agent_editable: false
human_approval_required: true
classification: CORE
review_trigger: material change to purpose, architecture, runtime, or evidence
---
```

For agentic projects, add:

```yaml
agent_editable: false
human_approval_required: true
authority_level: chief
```

`classification` is one of: `CORE`, `CONDITIONAL`, `DOMAIN`, `SENTRA`.

`PROJECT_GENOME.yaml` uses a YAML document (not markdown frontmatter) but must include the same identity, owner, status, and source-of-truth fields plus agent entry points.
