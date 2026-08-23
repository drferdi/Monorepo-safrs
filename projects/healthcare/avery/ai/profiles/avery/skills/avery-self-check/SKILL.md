---
name: avery-self-check
description: >-
  Use this diagnostic skill when the Founder asks whether Avery can see her skills/files, when skill discovery seems broken, after installing/updating the Avery profile, or whenever the runtime must prove that canonical Sentra knowledge is actually accessible.
version: 0.2.0
author: Sentra Artificial Intelligence
license: Proprietary
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [sentra, avery]
---
# avery-self-check

## Self-check procedure

1. Call `skills_list` and report whether all 13 expected Avery skills are present.
2. Call `skill_view("sentra-home")` and confirm its router instructions loaded.
3. Call `skill_view("sentra-knowledge", "references/source-index.md")`.
4. Call `skill_view("sentra-people", "references/people-registry.md")`.
5. Report PASS only if all four checks succeed. Otherwise report exactly what is missing and tell the operator to run `python scripts/verify_runtime.py --profile avery` on the Hermes machine.

Do not answer from memory during this check; prove runtime visibility.
