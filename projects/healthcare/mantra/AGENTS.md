# Sentra MANTRA — Capsule Router

## Inheritance

This file is sufficient capsule-local guidance after extraction. When nested in a governed
repository, its contribution rules may add review or security requirements; those requirements
must not become lifecycle or standalone-verification dependencies.

## Objective and ownership

- Project: Sentra MANTRA (domain: `healthcare`)
- Objective: hospital management platform (not an electronic medical record) built as custom
  apps on a Frappe Bench v15 runtime for the site `mantra.localhost`.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: `R2`. `apps/sentra_mantra_integrations/**` and `apps/sentra_mantra_hospital/**`
  are R3: get Chief's approval before changing them. Auth, database schema, migrations,
  workflow gates, infrastructure, and destructive operations always need approval.
- Language: Bahasa Indonesia for Chief-facing notes; English for code.

## Standalone contract

This capsule holds only the five Sentra custom apps and their tooling. Upstream Frappe apps
(`frappe`, `erpnext`, `hrms`, `healthcare`, and the others) are never copied or edited here;
their exact commits are pinned in `bench-apps.lock.json` and are fetched by bench. The runtime
is the dev container in `.devcontainer/` (images pinned by tag). Secrets are read from the
environment by name only (ADR-0002).

## Required context

Read `.agents/HANDOFF.md` first, then `.agents/CONTEXT.md`.

1. `README.md`
2. `docs/architecture.md`, then `docs/adr/0000-*` and `docs/adr/0001-custom-app-boundaries.md`
3. `docs/data.md` and `docs/adr/0002-secrets-management.md`
4. `docs/testing.md`
5. `docs/clinical-safety/` before touching hospital or integration logic

## Commands

Run inside the dev container (`matra.bat` on Windows starts it from this folder):

```bash
bench --site mantra.localhost list-apps
bench --site mantra.localhost run-tests --app <sentra_mantra_*>
python scripts/check_app_boundaries.py
```

The SAFRS contract is static (`smoke: none`) and needs no container:
`python scripts/capsule_check.py install|test|run|deploy-dry-run` and
`python -m compileall -q apps scripts e2e` (see `project.contract.json`).

Run `bench --site mantra.localhost migrate` only when schema or fixtures change, and never
against a real hospital database. Portal and Beranda browser tests: `cd e2e && npm test`.

## Domain rules

- Keep logic in the most specific custom app; prefer `sentra_mantra_hospital` or
  `sentra_mantra_indonesia` over `sentra_mantra_core` unless it is truly shared.
- Do not add dependencies that violate ADR-0001; do not move business logic into upstream apps.
- `sentra_mantra_portal` is frontend-only and talks to the backend through the BFF/API
  contract, not generic DocType REST access.
- `sentra_mantra_integrations` holds external adapters and retry/reconciliation logic, not
  system-of-record storage.
- Tahap 2 GL gate: Workflow State `Approved` `doc_status` stays `0` until Chief gives GO.

## Prohibited actions

- Never hardcode secrets or patient or staff data; never print `site_config.json` or `.env`.
- Never edit upstream Frappe apps.
- Do not use production credentials or production data.
- Do not modify other capsules or shared packages without recording scope expansion.
