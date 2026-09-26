# Sentra MANTRA

Hospital management platform for RSIA Melinda, built as five custom Frappe apps on a Frappe
Bench v15 runtime (site `mantra.localhost`). MANTRA is hospital management, not an electronic
medical record.

## Layout

- `apps/sentra_mantra_core` — shared desk experience, workspaces, finance and HR controls
- `apps/sentra_mantra_hospital` — hospital operations (R3)
- `apps/sentra_mantra_indonesia` — Indonesian regulatory localisation
- `apps/sentra_mantra_integrations` — external adapters such as SATUSEHAT (R3)
- `apps/sentra_mantra_portal` — staff portal frontend
- `bench-apps.lock.json` — upstream apps and the exact commits bench must fetch
- `.devcontainer/` — MariaDB, Redis, Mailpit, and `frappe/bench` containers (pinned tags)
- `e2e/` — bench-level Playwright harness; `scripts/` — boundary checks and helpers
- `docs/` — ADRs, architecture, clinical safety, compliance, operations

## Start locally

Set `MARIADB_ROOT_PASSWORD` in the environment, then run `matra.bat` (Windows) or
`docker compose -f .devcontainer/docker-compose.yml up -d` followed by `bench start` in the
`frappe` container. Open http://localhost:8000.

## Safety

No secrets, patient data, or staff data belong in this folder. Secrets live in a git-ignored
`.env` inside the bench and are referenced by variable name only (ADR-0002).
