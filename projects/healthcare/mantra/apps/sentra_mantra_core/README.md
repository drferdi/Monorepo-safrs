### Sentra MANTRA Core

Shared cross-cutting domain logic and utilities for Sentra MANTRA (per ADR-0001 S3)

> **Scope (ADR-0001 §3):** reusable domain logic shared across all phases (Tahap 0–8) — cross-cutting utilities and shared DocTypes/mixins not specific to one hospital or one country. **Not** the place for anything hospital-specific (→ `sentra_mantra_hospital`), Indonesia-specific (→ `sentra_mantra_indonesia`), external adapters (→ `sentra_mantra_integrations`), or frontend code (→ `sentra_mantra_portal`).

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench install-app sentra_mantra_core
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/sentra_mantra_core
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### License

mit
