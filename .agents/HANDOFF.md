# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-22 (Smartboard Tailwind 4 shorthand repair merged; sub-phase 2 plan drafted)

## Current state

- **Claude session — all merged to local `main`, NOT pushed.** `5b74cc2` Tailwind 4 shorthand repair (lease `TASK-20260822-SMARTBOARD-TAILWIND-SHORTHAND-FIX`, R1, CLOSED), `eba5ff1` web security boundary + sub-phase 2 plan, `444554e` roadmap index. An unclaimed shorthand conversion (`[var(--x)]` → `(--x)`) had been left uncommitted across 12 UI files of `apps/site`/`apps/web`; multi-value `shadow-(--button-ledge)_var(…)` never parsed, so the button ledge shadow was missing from built CSS in 4 places, and 9 files carried CRLF that broke `biome check` for all of `apps/web`. Equivalence proven by building HEAD in a throwaway worktree and diffing emitted CSS declaration by declaration (web 421/421, site 345/345 — only selector spellings differ).
- **Smartboard web security boundary — written down, do not rediscover it.** `projects/academic-smartboard/apps/web/AGENTS.md` § "Batas keamanan". Code side is clean (no secrets, no `localStorage`/`document.cookie`, no XSS sinks, `pnpm audit --prod` 0/270). Nothing is deployed anywhere — repo has no hosting config at all — so nothing is exposed today. Four obligations apply the moment it is: `ProtectedRoute` is not authorisation, security headers must come from the host, `COOKIE_SECURE`/`COOKIE_SAMESITE` fail open in the archive backend, `CORS_ORIGINS` must stay explicit.
- **Smartboard web sub-phase 2:** plan committed at `docs/plans/active/2026-08-22-smartboard-web-subphase2-akademik.md`, status `PROPOSED`, indexed in the roadmap and the active-plans table. 16 tasks, 8 archive pages + 6 shared components, security controls built into Task 16. Open decisions for Chief: adopt RTL now or keep deferring; where `Dashboard`/`Pengajar`/`TutorialPenggunaan` belong (in no roadmap row); two new catalog deps (`recharts`, `sonner`, R2).
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
7. Chief: push `main` (3 merges land locally, unpushed — `5b74cc2`, `eba5ff1`, `444554e`).
8. Before any smartboard web deploy: read `apps/web/AGENTS.md` § "Batas keamanan" first. Host security headers are the open item; nothing is hosted yet.

## Verify

```bash
bash scripts/safrs-verify.sh
```

This markdown change is R1. `safrs-verify` still fails on **pre-existing** Sentra Bot integrity review, not introduced by this docs fix.
