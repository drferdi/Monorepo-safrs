### Sentra MANTRA Hospital

Hospital and clinical extensions to Marley Health for RSIA Melinda, incl. Melinda Maternal Workflows (per ADR-0001 S3)

> **Scope (ADR-0001 §3):** hospital/clinical-specific extensions to Marley (`healthcare`), including Melinda Maternal Workflows (Tahap 6) — mother–baby linkage, VK operations, neonatal workflow, maternal billing, maternal quality indicators. **Not** the place for BPJS/tax/localization logic (→ `sentra_mantra_indonesia`), external adapters like SATUSEHAT/BPJS APIs (→ `sentra_mantra_integrations`), or generic shared logic (→ `sentra_mantra_core`).

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench install-app sentra_mantra_hospital
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/sentra_mantra_hospital
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### License

mit
