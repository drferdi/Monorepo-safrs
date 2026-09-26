# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-09-27 — Static SAFRS contract

- Decision (Chief): `project.contract.json` is a static contract with `smoke: none`.
  `scripts/capsule_check.py` (standard library only) runs `install` (Python within the bench
  range), `test` (ADR-0001 boundary scan, upstream lock, pinned compose images and
  password-by-variable, no absolute legacy paths, valid app JSON), `run` (Procfile check), and
  `deploy-dry-run` (prints the bench plan); `build` is `python -m compileall`.
- Rationale: the standalone verifier cannot start Docker, MariaDB, Redis, and a bench, and
  building a bench does not fit its per-command limit. Frappe tests still run with
  `bench run-tests` in the dev container.
- `bench-apps.lock.json` `repository` fields filled from each checkout's `upstream` remote as
  public HTTPS URLs; every checked-out HEAD matched the pinned commit.
- Evidence: `pnpm project:verify healthcare/mantra` PASS on 2026-09-27.
- The NIK-shaped value in two `sentra_mantra_core` tests (Kota Kediri region code, a plausible
  birth date) was replaced by the plainly synthetic `9999000000000001` (Chief). The guard
  pattern is `\d{16}`, so `validate_narrative` and `scan_for_identifiers` return the same
  results for the new value.
- Pre-migration backup: bench root branch `wip/pre-safrs-migration` (`f56b1973`, which embeds
  all five custom apps) pushed to the private `drferdi/mantra`. The five app repositories do not
  exist on GitHub yet; git bundles of their full history are kept outside git with the migration
  notes.

## 2026-09-27 — Migrated from abyss-monorepo into SAFRS

- Decision: Only the Sentra-owned parts of `abyss-monorepo/apps/healthcare/mantra` were copied
  to `projects/healthcare/mantra`: the five `sentra_mantra_*` apps, `docs/` (without
  `progress/` and `superpowers/`), `e2e/`, `scripts/`, `public/`, `patches.txt`, `Procfile`,
  and `.devcontainer/`. Source: legacy commit `762e48cb4bb1967e2132e7b530e8f2a7f4231c59`.
- Before copying, uncommitted legacy work was committed locally (no push) on branch
  `wip/pre-safrs-migration`: bench root `f56b197361c9`, `sentra_mantra_core` `080372b0`,
  `sentra_mantra_hospital` `6a24bf66`, `sentra_mantra_indonesia` `36b97b58`;
  `sentra_mantra_integrations` (`056b1702`) and `sentra_mantra_portal` (`85e2ced7`) had no
  changes.
- Not copied: upstream apps, `sites/`, `env/`, `logs/`, `config/`, `.env`, `*.xlsx`,
  `archived/`, `graphify-out/`, `.agent/`, `CLAUDE.md`, the legacy root `README.md` (it
  described an old employee-form prototype) and `MANTRA_CURRENT_STATUS_REPORT.md`.
- Upstream apps are recorded in `bench-apps.lock.json` with the checked-out commit of each.
  The `wiki` checkout (`7fe4ab2`) differs from what `sites/apps.json` recorded (`3b894f5`);
  the checkout is treated as authoritative.
- `.devcontainer/docker-compose.yml`: `latest` image tags pinned (MariaDB 11.8.9, Redis
  8.8.3-alpine, Mailpit v1.31.2, frappe/bench v5.31.0), and the hard-coded MariaDB root password
  replaced by the required variable `MARIADB_ROOT_PASSWORD`. `devcontainer.json` SQLTools now
  asks for the password instead of storing it.
- `matra.bat` now starts from its own folder (`%~dp0`) instead of an absolute legacy path, and
  stops early when `MARIADB_ROOT_PASSWORD` is unset.
- The absolute legacy path in `docs/operations/backup-restore.md` was made relative.
