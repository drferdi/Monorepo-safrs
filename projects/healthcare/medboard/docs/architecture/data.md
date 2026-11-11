# Data Storage & Persistence — MedBoard

Data architecture, persistence mechanisms, secrets management, and synthetic test data handling.

---

## Primary System of Record

- **Relational Storage:** PostgreSQL 16 managed through Prisma ORM (`prisma/schema.prisma`, connected via `DATABASE_URL`).
- **Data Model Reference:** The full entity model and TypeScript schemas are detailed in [Data Model](data-model.md).
- **Privacy & Security Constraints:** Patient privacy standards and de-identification boundaries are documented in [Privacy & Data Handling](../governance/privacy.md) and the root [Data Privacy Policy](../../DATA_PRIVACY.md).
- **Database Migrations:** Schema migrations require explicit review and are deployed deterministically (`pnpm exec prisma migrate deploy`) during system startup.

---

## Secrets & Configuration Hygiene

- All environment variables, API keys, and database credentials are enumerated with documentation comments in [`.env.example`](../../.env.example) and declared in `project.contract.json`.
- Concrete values reside exclusively in the host production environment (`/etc/medboard/medboard.env`) or local git-ignored files (`.env.local`). Secrets are never committed to version control.

---

## Runtime State & Queues

- The `runtime/` directory manages local, ephemeral state:
  - `runtime/bridge-queue/`: Mutable local queues for EMR auto-fill and offline events.
  - Test run outputs, coverage reports, and diagnostic logs.
- In production, `/opt/medboard/app/runtime` symlinks to `/var/lib/medboard/runtime` to ensure local state persists across release deployments.

---

## Synthetic Test Fixtures

- All test fixtures and mock datasets are strictly synthetic.
- Directories designated for real clinical verification (`tests/fixtures/phi/`) are enforced as git-ignored and must remain empty within source control.

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
