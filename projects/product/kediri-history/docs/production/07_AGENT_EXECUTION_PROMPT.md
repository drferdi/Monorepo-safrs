# 07 — AGENT EXECUTION PROMPT

Use this as the short command for Claude/Codex/Fable after this pack is installed.

---

Read `docs/production/00_IMPLEMENTATION_AUTHORITY.md` first.

Then read all files in `docs/production/` in numeric order.

Your task is to execute **Batch A only** from `06_BATCH_PLAN.md`.

Before coding:
1. inspect the current Journey implementation;
2. inspect the real 27-image asset set;
3. bind the actual image filenames to Scene 00–04 in `01_SCENE_MANIFEST.yaml`;
4. verify each mapped image visually;
5. report any ambiguity before implementation.

Implementation requirements:
- preserve historical/evidence canon;
- use the approved production narrative;
- GSAP is mandatory and must own cinematic progression;
- use one coordinated scene timeline where applicable;
- implement explicit outgoing → transformation → incoming scene handoffs;
- preserve native document scroll;
- do not introduce generic repeated fade-up section choreography;
- preserve reduced motion;
- preserve deterministic anchor/rest states;
- do not implement Scene 05+.

After implementation:
- run existing typecheck/lint/test/build/Playwright/governance/Sentra-GSAP checks;
- capture required desktop/mobile visual checkpoints from `04_VISUAL_ACCEPTANCE.md`;
- update relevant entries in `05_REDO_REGISTER.md`;
- mark completed items `READY_FOR_REVIEW`, never `APPROVED`;
- report exact files changed and exact test results.

If a cinematic requirement is difficult:
**DO NOT SIMPLIFY IT QUIETLY.**
Stop and report the blocker.

Stop after Batch A.
