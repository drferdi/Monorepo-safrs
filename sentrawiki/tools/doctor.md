# Doctor

## Purpose

`pnpm doctor` (implemented in `tools/doctor/src/cli.mjs`) is a read-only environment diagnosis that runs before setup and development. It checks the Node toolchain, package manager, Git, Docker, the local `.env`, the disposable-database contract, PostgreSQL readiness, and the generated Prisma client, then prints a human report (Bahasa Indonesia) with a recovery hint for every failing check. It never mutates anything.

## Key source files

| File | Purpose |
| --- | --- |
| `tools/doctor/src/cli.mjs` | CLI entrypoint: runs the report, supports `--technical` |
| `tools/doctor/src/checks.mjs` | The check implementations (`runDoctor`) and env parsing |
| `tools/doctor/src/messages.mjs` | Report rendering + deterministic secret redaction |
| `tools/doctor/package.json` | Package metadata (`@safrs/doctor`) |

## How it works

`runDoctor()` in `tools/doctor/src/checks.mjs` runs nine checks and renders a verdict for each (`SIAP` / `BELUM SIAP` / `DITOLAK`):

- **NODE** — Node.js 24 LTS compatible (major 24, minor >= 18).
- **PNPM** — `pnpm --version` succeeds.
- **GIT** — `git --version` succeeds.
- **DOCKER** — Docker CLI installed and the engine (`docker info`) running.
- **ENV** — `.env` exists; otherwise the recovery is `pnpm run setup`.
- **DATABASE** — `DATABASE_URL` (from env or parsed from `.env`) passes `assertDisposableDatabase` from `packages/database/src/reset-guard.ts`. An unsafe URL is `DITOLAK` and exits with code `2`.
- **POSTGRES** — `docker compose exec postgres pg_isready` against the local service.
- **PRISMA** — the generated client exists at `packages/database/src/generated/prisma/client.ts`; otherwise recovery is `pnpm db:generate`.
- **`.env` canonical parsing** — `loadCanonicalEnvironment` validates `DATABASE_URL`/`APP_URL`/`NODE_ENV` from `.env` for tooling consumers.

Exit codes: `0` all good, `1` recoverable failures, `2` unsafe (e.g. non-disposable `DATABASE_URL`).

### Redaction

Every line of output runs through `redactText` (`tools/doctor/src/messages.mjs`): URL-embedded credentials become `[URL DISEMBUNYIKAN]`, `NAME=secret` assignments become `$1=[RAHASIA DISEMBUNYIKAN]`, and any value present in the supplied environment is replaced with `[NILAI ENV DISEMBUNYIKAN]`. A `--technical` flag adds a redacted technical report of failing checks.

## CLI usage

```bash
pnpm doctor          # human report (redacted, Bahasa Indonesia)
pnpm doctor --technical
```

## Integration points

- **`pnpm run setup`** — doctor is the recommended first step before setup/dev (root `AGENTS.md`, golden-path capsule).
- **`packages/database/src/reset-guard.ts`** — shared disposable-database assertion reused verbatim.
- **`tools/AGENTS.md`** — the boundary rules: run focused tool tests first, then `pnpm run doctor` for read-only diagnostics.
- **`scripts/lib/process.mjs`** — shared command runner and package-manager command resolution.

## Related pages

- [Tools overview](index.md)
- [SAFRS governance checkers](safrs.md) — `check_sensitive_changes` is the read-only governance gate counterpart
- [Packages / Database](../packages/database.md) — the reset guard doctor relies on
- [Getting started](../overview/getting-started.md) — setup flow
