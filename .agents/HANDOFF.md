# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-23 (projects/ relaid out by domain and committed; Sentra Bot tracked)

## Current state

- **Domain layering — committed** (`2fa329a`, merged `0c8b02c`; review evidence `edea112`). Chief ruled every capsule lives at `projects/<domain>/<capsule>/`, uniformly. Domains: `academic`, `corporate`, `healthcare`, `internal`, `product`; each carries only `AGENTS.md` + `README.md`. New capsule `healthcare/medisync` (Hermes/Avery config + deploy). Recorded in [ADR 0005](../docs/adrs/0005-projects-domain-layering.md) and `DECISIONS.md`; supersedes D1 of the smartboard migration design. Leases: `TASK-20260822-PROJECTS-DOMAIN-LAYERING` + `-REFS`, `-ROOT-DOCS`, `-PLANS`, `-OLDPATHS`, `-TOKEN-SCOPE`, `-DOCS`, and `-CURSOR-HTML-BUILD-SKILL-OWNERSHIP` (adopted an unowned path).
- **Controls that silently broke and are now fixed — do not rediscover.** `pnpm-workspace.yaml` `projects/*/apps/*` → `projects/*/*/apps/*` (the flat pattern had dropped all 9 apps from the workspace with no error); `tools/safrs/check_topology.py` now two-level; `tools/safrs/check_routing.py`; `packages/token/scope.txt` (3 stale paths would have disabled token enforcement); `biome.jsonc` `projects/*/portfolio*/**`; four capsule `AGENTS.md` canonical links now `../../../AGENTS.md`; `tests/repository/lfs-snapshots.test.mjs` builds its path from fragments so text rewriting missed it.
- **Integrity review APPROVED by Chief** for this change set (`.safrs/reviews/verification-integrity.json`, base `38a0f3a0b104`). It is fingerprint-bound: any further edit to a classified path invalidates it and Chief must re-sign.
- **Damage repaired, worth knowing.** `robocopy /MOVE` on `projects/sentrabot` followed pnpm symlinks and emptied 8 `packages/*` directories. Restored via `git checkout -- packages/`, and the 7 uncommitted files belonging to `TASK-20260822-SENTRABOT-RELEASE-CLOSEOUT` recovered from the copies under `projects/product/sentrabot/apps/web/node_modules/@safrs/`. Never use `robocopy /MOVE` inside a pnpm workspace.
- **Smartboard web security boundary — written down, do not rediscover it.** `projects/academic/academic-smartboard/apps/web/AGENTS.md` § "Batas keamanan". Code side clean; nothing deployed. Four obligations apply the moment it is: `ProtectedRoute` is not authorisation, security headers must come from the host, `COOKIE_SECURE`/`COOKIE_SAMESITE` fail open in the archive backend, `CORS_ORIGINS` must stay explicit.
- **Smartboard web sub-phase 2:** `docs/plans/active/2026-08-22-smartboard-web-subphase2-akademik.md`, status `PROPOSED`. Open decisions for Chief: adopt RTL now or keep deferring; where `Dashboard`/`Pengajar`/`TutorialPenggunaan` belong; two new catalog deps (`recharts`, `sonner`, R2).
- **Sentra Bot is now tracked** at `projects/product/sentrabot/`, on Chief's instruction. It had never been committed, so its files met Biome for the first time: `apps/site/**/assets`, `apps/site/original`, and `apps/site/src/html` are excluded as build output, provenance snapshot, and verbatim Webflow markup; `App.jsx` carries one justified `biome-ignore` for `dangerouslySetInnerHTML` (PAGE_HTML is assembled at build time from static modules, no user input). Runtime blockers unchanged — integrity manifest/approval missing; intake pin `d17a138` unavailable, do not substitute.
- **Portfolio:** now `projects/corporate/portfolio-drnovia/`. 33/33 tests PASS.
- **Unpushed:** `5b74cc2`, `eba5ff1`, `444554e` still local on `main`.

## Next actions

1. `pnpm install` — `vitest`/`tsc` are absent, so `pnpm test:contracts` could not be run against the new layout.
2. Chief: push `main` (3 merges land locally, unpushed).
3. Chief: approve smartboard web sub-phase 2 plan (`PROPOSED` → `ACTIVE`) and answer its 3 open decisions.
4. Owners: claim or clear remaining unowned untracked paths (`.kilo/plans/` and anything outside an active lease).
5. Before any smartboard web deploy: read `apps/web/AGENTS.md` § "Batas keamanan" first.

## Verify

```bash
bash scripts/safrs-verify.sh
```

Passing as of this handoff: topology, task contracts, ownership, sensitive classification (review approved), status claims. Suites run green: `tests/governance` 32, `tests/architecture` 6, every file under `tests/repository`, `tools/capabilities` 7, `scripts/check-tokens.mjs`.
