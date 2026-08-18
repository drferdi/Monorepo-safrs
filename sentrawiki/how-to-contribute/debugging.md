# Debugging

This page lists common failure modes in the Monorepo and how to diagnose them. Use `pnpm doctor` for a read-only environment diagnosis and `pnpm status` for task/registry/governance state. For deeper context start from [How to contribute](index.md) and [Development workflow](development-workflow.md).

## Purpose

- Document recurring errors: PostgreSQL, Prisma, `.env`, the token gate, governance checkers, and automation contract failures.
- Explain how `pnpm doctor` and `pnpm status` help localize problems.

## First diagnostics

### pnpm doctor

`pnpm doctor` runs `tools/doctor/src/cli.mjs` and reports environment readiness — Node version, pnpm, Docker/PostgreSQL availability, environment variables, and database connectivity — without modifying anything. Run it first whenever setup or a push fails unexpectedly.

### pnpm status

`pnpm status` reads the shared task registry, verifies the lease chain for active tasks, checks ownership conflicts, and runs a **live** governance probe. It fails (`FAIL`) when the registry is invalid, ownership overlaps, or the governance probe reports failed checks, and suggests a next action. Use `pnpm status --json` for a machine-readable report.

Run `pnpm governance` to see exactly which checker failed.

## Common errors and fixes

### PostgreSQL

- **Demo database won't start** — run `pnpm db:start` (`docker compose up -d --force-recreate --wait postgres`). Re-run `pnpm doctor` to confirm connectivity.
- **Port conflict / wrong host** — the local databases must be reachable at `127.0.0.1:54329`; the reset guard rejects any other URL. Confirm `DATABASE_URL` uses that host.
- **E2E rejects the URL** — `scripts/test-e2e.mjs` requires a local PostgreSQL URL ending in `_test`, or it will create a disposable one itself. A rejected variable raises `[E2E] DATABASE_URL DITOLAK`.

### Prisma

- **Client out of date** — run `pnpm db:generate` after schema changes, then `pnpm db:migrate` and `pnpm db:seed`.
- **Migration drift** — run `pnpm db:migrate`; for a clean local reset use `pnpm db:reset` (guarded to disposable databases only). Never run destructive resets against a non-local database.

### .env

- **Missing variables** — `.env` is gitignored and never read by agents. `pnpm run setup` validates it. Required: `DATABASE_URL`, `APP_URL`, `NODE_ENV`.
- **Stale values** — re-run `pnpm run setup` after environment changes. `DATABASE_URL` must be `postgresql://` on `127.0.0.1:54329` with a name ending in `_local` or `_test`.

### Design token gate

`pnpm check` fails at the token step when raw colour or `border-radius` values appear outside `packages/token/src/tokens.css`, or when tokens fail WCAG 2.2 AA contrast. Import tokens from `@sentra/token` instead of hard-coding values. See [patterns-and-conventions.md](patterns-and-conventions.md) and `scripts/check-tokens.mjs`.

### Governance checkers

`pnpm governance` runs the SAFRS Python checkers in `tools/safrs/` plus governance tests. Common failures:

- **HANDOFF stale** — a non-trivial change set that does not update `.agents/HANDOFF.md` fails `check_handoff.py`. Update the handoff.
- **Ownership/lifecycle mismatch** — `check_lifecycle.py` and `check_task_ownership.py` detect drift between the task registry, lease ledger, and lifecycle states. Claim/transition/close tasks correctly with `pnpm task`, and reconcile leases with `pnpm saf lease reconcile`.
- **Sensitive-change review required** — changes to verification controls (`.safrs/**`, `AGENTS.md`, `.github/workflows/**`, `tools/automation/**`, security tests) are minimum R2 and must be flagged for designated review; `check_sensitive_changes.py` enforces this.
- **Registry mtime change** — `pnpm status` reports `status-detected-registry-mtime-change` if the governance probe unexpectedly modified the registry; status must remain read-only.
- **Pre-commit partial stage** — the Husky hook aborts if a file is partially staged (staged and unstaged changes at once). Stage the whole file or commit staged-only portions first.

### Automation contract failures

When a `pnpm saf` subcommand fails closed, treat any unresolvable input as a deny — never guess. Common causes:

- **Contract/digest mismatch** — recompile the task contract with `pnpm saf contract compile task.json --write .safrs/contracts/task.json`; digests must stay byte-identical across Node and Python (validated by `check_task_contract.py` and `test/canonical-json.test.mjs`).
- **Gate verdict not PASS** — inspect the verdict with `pnpm saf gate --all`; a failing gate reports its reason. See [automation tool](../tools/automation.md) and the [control plane](../features/automation-control-plane.md).
- **Missing ledger issue** — only `CLAIM` may create a ledger issue; other lease actions on an unknown task are denied.
- **Dispatched but silent lease** — never infer success from dispatching `safrs-task-control`; read the ledger back and treat a missing event as deny (`reconcileLease` enforces this).

### CI failures

The 5 workflows are described in [tooling.md](tooling.md). For red checks, read the failing step's log; the governance workflow runs each checker as a separate step so the failing one is named directly. E2E browser evidence is uploaded as a `playwright-results` artifact on failure.

## Related pages

- [Tooling](tooling.md)
- [Development workflow](development-workflow.md)
- [Testing](testing.md)
- [SAFRS governance](../features/safrs-governance.md)
- [Automation control plane](../features/automation-control-plane.md)
