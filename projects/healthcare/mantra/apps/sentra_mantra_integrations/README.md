### Sentra MANTRA Integrations

External system adapters for Sentra MANTRA: SATUSEHAT (FHIR) and BPJS, outbox/retry pattern (per ADR-0001 S3)

> **Scope (ADR-0001 §3):** external system adapters only — SATUSEHAT (FHIR resources, identifier mapping, retry/reconciliation) and BPJS (eligibility, SEP, Antrean Online, Mobile JKN), plus the BFF/API contract consumed by `sentra_mantra_portal`. Integrations must never become the system of record — internal transactions persist even if an external call fails (outbox/retry pattern). **Not** the place for BPJS *business rules* (→ `sentra_mantra_indonesia`) or clinical workflows (→ `sentra_mantra_hospital`).

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench install-app sentra_mantra_integrations
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/sentra_mantra_integrations
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### RME Bridge (read-only)

The RME bridge uses a read-only database connection or a scheduled export
folder. It does not call an RME API, write to the RME, or create final Patient
records. Every pull first creates an audited `RME Staging Batch` and its
`RME Staging Record` rows; the Pasien & Klinik dashboard counts only completed
patient batches.

Configure the source in the bench/container environment, never in committed
files:

```text
MANTRA_RME_SOURCE_KIND=readonly_db
MANTRA_RME_DB_HOST=<rme-host>
MANTRA_RME_DB_NAME=<rme-database>
MANTRA_RME_DB_USER=<read-only-user>
MANTRA_RME_DB_PASSWORD=<secret>
MANTRA_RME_TABLE_PATIENT=<patient-table>
MANTRA_RME_PATIENT_PRIMARY_KEY=<primary-key-column>
MANTRA_RME_PATIENT_UPDATED_AT=<updated-at-column>
```

For a file export instead:

```text
MANTRA_RME_SOURCE_KIND=folder
MANTRA_RME_EXPORT_DIR=<mounted-export-folder>
```

The folder must contain `patient.csv` or `patient.xlsx`. Run one immediate
patient pull with:

```bash
bench --site mantra.localhost execute sentra_mantra_integrations.rme_bridge.runner.pull_patients
```

After a successful pull, the hourly scheduler keeps the patient staging data
current. If the source is not configured, the scheduler skips without creating
a batch or inventing a count.

### License

mit
