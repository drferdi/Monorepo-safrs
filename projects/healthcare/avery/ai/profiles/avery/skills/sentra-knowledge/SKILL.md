---
name: sentra-knowledge
description: >-
  Use this skill whenever anyone asks about a Sentra official document, charter, organisational structure, financial architecture, legal transition, phantom stock, economic participation, portfolio thesis, or any fact that should come from a canonical source.
version: 0.2.0
author: Sentra Artificial Intelligence
license: Proprietary
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [sentra, avery]
---
# sentra-knowledge

## First action

Load `references/source-index.md`. It tells you which canonical source to open and its classification.

## Canonical-source rule

For any material institutional claim, use `skill_view` to open the specific file under `references/canonical/` before answering. Preserve the document's terminology and qualifiers. Do not turn planning assumptions, drafts, or legal-review material into settled facts.

## Sensitive sources

Financial, legal-transition, and phantom-stock material are need-to-know. Do not proactively expose them in general group conversation. If authorization/context is unclear, give a high-level answer and ask for clarification only when the needed information is genuinely absent from the skills and references; otherwise proceed.
