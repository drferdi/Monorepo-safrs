## Sentra-GSAP Mandatory Directive

`/Sentra-GSAP` and `/sentra-gsap` are reserved Sentra execution directives.

When either directive appears, or the user explicitly asks for the Sentra-GSAP standard:

1. MUST read `.agents/skills/sentra-gsap/SKILL.md` before modifying frontend code.
2. MUST follow its workflow, architecture invariants, decision rules, reference routing, and completion contract.
3. MUST treat responsive motion, touch, reduced motion, lifecycle cleanup, browser behavior, performance, accessibility, and visual polish as acceptance requirements—not optional cleanup.
4. MUST run the configured Sentra-GSAP QA and final verifier before claiming completion.
5. MUST fix failing implementation gates rather than weakening, deleting, skipping, or rewriting them merely to pass.
6. MUST report `SENTRA-GSAP FAIL` when any required gate is failed or not run. Do not call such work finished or production-ready.
7. Technical choices that do not materially change product intent are the agent's responsibility; do not offload routine coding decisions to a non-technical user.

For GSAP implementation policy, `.agents/skills/sentra-gsap/SKILL.md` is the canonical source unless the human operator explicitly overrides it.
