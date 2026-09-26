### Sentra MANTRA Indonesia

Indonesia-specific localization for Sentra MANTRA: BPJS rules, PPh 21, THR, KFA mapping (per ADR-0001 S3)

> **Scope (ADR-0001 §3):** Indonesia-specific localization — BPJS business rules, PPh 21, THR, KFA (Kode Farmasi & Alkes) mapping, and other regulatory logic not specific to one hospital. **Not** the place for hospital/clinical workflows (→ `sentra_mantra_hospital`), the actual SATUSEHAT/BPJS API adapters (→ `sentra_mantra_integrations`), or generic shared logic (→ `sentra_mantra_core`).

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench install-app sentra_mantra_indonesia
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/sentra_mantra_indonesia
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### License

mit
