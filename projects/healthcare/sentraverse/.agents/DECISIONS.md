# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-09-26 — Migrated from abyss-monorepo into SAFRS

- Decision: The legacy folder `abyss-monorepo/apps/healthcare/sentraverse` was copied as it is
  to `projects/healthcare/sentraverse`. Source: legacy commit
  `762e48cb4bb1967e2132e7b530e8f2a7f4231c59` plus one untracked, not-ignored file
  (`app/privacy/tiktok…txt`, a public domain-verification file).
- Not copied: `.agent/`, `.claude/`, `.codex/`, `graphify-out/`, `CLAUDE.md`, `.env.local`,
  `node_modules/`, `.next/`, `.turbo/`, `.vercel/`, the npm `package-lock.json`.
- Toolchain: pnpm 9.15.0 became pnpm 11.21.0 with a fresh capsule lockfile and
  `nodeLinker: hoisted`; Node 22 became Node 24. The pnpm 9 override block was dropped;
  `pnpm audit` on 2026-09-26 required `next` 16.3.6 (was 16.2.11, RCE advisory) plus
  overrides `postcss >=8.5.23` and `sharp >=0.35.4`, and then reported no known vulnerabilities.
- `test` runs the existing node:test suite; the Playwright smoke stays as `test:e2e` because
  it needs locally installed browsers.
- Absolute legacy paths in comments and docs were rewritten; legacy `AGENTS.md` was replaced
  and its scoped rules kept.
