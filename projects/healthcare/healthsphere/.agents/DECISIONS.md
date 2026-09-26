# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-09-26 — Migrated from abyss-monorepo into SAFRS

- Decision: The legacy folder `abyss-monorepo/apps/healthcare/healthsphere` (with `website/`
  and `database/` inside) was copied as it is to `projects/healthcare/healthsphere`. Source:
  legacy commit `762e48cb4bb1967e2132e7b530e8f2a7f4231c59`.
- Not copied: `database/backups/` (eight `.bak.json` dataset dumps from 2026-03-13),
  `.agent/` folders, `CLAUDE.md` files, `graphify-out/`, `node_modules/`, `dist/`.
- The capsule root had no `package.json`; the website keeps its own pnpm workspace in
  `website/`, and the contract calls it through `scripts/pnpm.mjs --dir website`. No new
  sub-folders were introduced.
- The legacy root `README.md` was an unfilled template; it was replaced with a real capsule
  README. `website/AGENTS.md` now points to the capsule router.
- Toolchain: pnpm 9.15.0 became pnpm 11.21.0 with a fresh lockfile and `nodeLinker: hoisted`;
  Node 22 became Node 24. The pnpm 9 override block was dropped. `pnpm audit` on 2026-09-26
  flagged `sharp` 0.34 (dev dependency); raised to `^0.35.4`, then no known vulnerabilities.
  Build scripts allowed: `esbuild`, `sharp`.
- Added `typecheck` (`tsc -b`) and `start` (Vite preview on 127.0.0.1:4343) scripts.
- Lint had one inherited error (`react-hooks/set-state-in-effect` in
  `website/src/sections/PatientFlow.tsx`; the legacy lockfile pins the same plugin 7.1.1 and
  the legacy `node_modules` could no longer run). Fixed by moving `setActive(1)` from the effect
  into the IntersectionObserver callback, at the same moment `isVisible` becomes true.
- The public Puskesmas WhatsApp contact in `website/public/*.html` and
  `website/src/config/site.ts` is the clinic's published contact and was kept.
