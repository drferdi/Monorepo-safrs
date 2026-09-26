# Architecture

Sentra MANTRA is a Frappe Bench v15 bench. The bench fetches the upstream apps pinned in
`bench-apps.lock.json` and installs the five Sentra custom apps from `apps/`. The runtime is the
dev container defined in `.devcontainer/docker-compose.yml`: MariaDB 11.8, two Redis 8
instances (cache and queue), Mailpit, and `frappe/bench` running `bench start` (see `Procfile`).

App boundaries and dependency direction are fixed by `docs/adr/0000-*` and
`docs/adr/0001-custom-app-boundaries.md`, and checked by `scripts/check_app_boundaries.py`.
Desk experience placement is ADR-0003; add-on policy is ADR-0004. A fuller data-flow picture is
in `docs/architecture/system-architecture-and-data-flow.md`.
