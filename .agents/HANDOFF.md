# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-22 (Smartboard Tailwind 4 shorthand repair merged; sub-phase 2 plan drafted)

## Current state

- **Claude session:** `TASK-20260822-SMARTBOARD-TAILWIND-SHORTHAND-FIX` — R1 — commit `959ff09`. An unclaimed Tailwind 4 shorthand conversion (`[var(--x)]` → `(--x)`) was sitting uncommitted across 12 UI files of `apps/site`/`apps/web`. Adopted and repaired: multi-value `shadow-(--button-ledge)_var(…)` never parsed, so the button ledge shadow was absent from built CSS in 4 places; 9 files had CRLF against a LF repo plus 2 format nits, breaking `biome check` for all of `apps/web`. Equivalence proven by building HEAD in a throwaway worktree and diffing emitted CSS declaration by declaration (web 421/421, site 345/345 — only selector spellings differ).
- **Smartboard web sub-phase 2:** plan written, `docs/plans/active/2026-08-22-smartboard-web-subphase2-akademik.md`, status `PROPOSED` — awaiting Chief. 16 tasks, 8 archive pages + 6 shared components. Open decisions for Chief: adopt RTL now or keep deferring; where `Dashboard`/`Pengajar`/`TutorialPenggunaan` belong (in no roadmap row); two new catalog deps (`recharts`, `sonner`, R2).
- **Cursor session:** `TASK-20260822-SMARTBOARD-PLAN-MD032` — `VERIFYING` — R1 — `docs/plans/completed/2026-08-21-smartboard-web-subphase1-foundation.md`.
- **Fix pass 2:** MD032 at line 108 was `**Files:**` + bullet list. Blank lines were not enough for the IDE diagnostic. Folded every `**Files:**` / `**Interfaces:**` bullet block into a paragraph so line 108 is no longer a list. Checkbox step lists kept. `markdownlint-cli`: no MD032.
- **Smartboard web sub-phase 1:** `apps/web` foundation done — Task 1-12 merged/pushed; plan in `docs/plans/completed/`. Sub-phase 2-5 plans not yet written — see `docs/plans/active/2026-08-21-smartboard-web-roadmap.md`.
- **Sentra Bot phase:** disposable runtime complete; release/closure not complete.
- **Sentra Bot runtime:** Compose `sentrabot-disposable` up. PostgreSQL `healthy`; worker `healthy`; supervisor running; web `http://localhost:3000`.
- **Sentra Bot blockers:** integrity manifest/approval missing; intake pin `d17a138` unavailable — do not substitute.
- **Portfolio:** Unified into `projects/portfolio-drnovia/`. 33/33 tests PASS. Static server `:4173`.

## Next actions

1. Chief: feel-test Lenis (`node projects/portfolio-drnovia/server.js` → `:4173`).
2. Delete `projects/portfolio/` once IDE workspace handle lock is released.
3. Integrity review / split merges before claiming full `safrs-verify` green.
4. Co-review `biome.jsonc` with `TASK-20260821-SENTRABOT-BIOME-MARKETING`.
5. Chief: approve smartboard web sub-phase 2 plan (`PROPOSED` → `ACTIVE`) and answer its 3 open decisions.
6. Owners: claim or clear the unowned untracked paths blocking `safrs-verify` task ownership — `.cursor/skills/html-build/`, `.kilo/plans/`, and anything else not covered by an active lease.

## Verify

```bash
bash scripts/safrs-verify.sh
```

This markdown change is R1. `safrs-verify` still fails on **pre-existing** Sentra Bot integrity review, not introduced by this docs fix.
