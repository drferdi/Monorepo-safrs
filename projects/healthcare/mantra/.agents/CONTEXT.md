# CONTEXT

Capsule identity. Change it rarely, and state only facts that the capsule's own `README.md`,
`AGENTS.md`, or `project.contract.json` also state.

- Purpose: hospital management platform for RSIA Melinda on Frappe Bench v15 (site
  `mantra.localhost`); not an electronic medical record.
- Human owner: Chief (dr. Ferdi Iskandar)
- Default risk: R2; `apps/sentra_mantra_hospital/**` and `apps/sentra_mantra_integrations/**`
  are R3
- Stack: Frappe 15 and ERPNext 15 (upstream, pinned in `bench-apps.lock.json`), Python, MariaDB
  11.8, Redis 8, Playwright for bench-level E2E
- Protected areas: upstream apps (never edited), the Tahap 2 GL gate, database schema and
  migrations

This folder is tracked and publishes with the capsule. Treat it as public: no secrets,
credentials, tokens, phone numbers, messaging identifiers, personal data, or database dumps.
Name environment variables, never their values.
