---
description: Generate a consistent, shareable Markdown report from given inputs.
argument-hint: [what should the report cover]
---

Generate a Markdown report about: $ARGUMENTS

Use a consistent structure so reports are comparable across runs:
1. Title and date.
2. Scope and method (what was examined, how, on what date).
3. Findings / data, evidence-based, with severity where applicable.
4. Recommendations, prioritized.
5. Open items / UNVERIFIED / limitations.
6. Command log (any commands run and their status).

Guidelines:
- Keep it factual and evidence-based; never invent data.
- Mark any item you did not verify as UNVERIFIED.
- Do not include secrets, tokens, or sensitive values — redact them.
- Write the report to the target the user names (default: `report.md` in the current directory) and show a summary.
