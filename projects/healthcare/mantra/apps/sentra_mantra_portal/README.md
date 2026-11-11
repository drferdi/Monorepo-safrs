### Sentra MANTRA Portal

Tahap 8 frontend for Sentra MANTRA: Executive Dashboard and patient-facing portals, Vue 3 + Frappe UI via BFF (per ADR-0001 S4)

> **Scope (ADR-0001 §4):** all Tahap 8 frontend code — Executive Dashboard, patient/customer-facing portals, agent Melinda. Stack: Vue 3 + Vite + TailwindCSS + Frappe UI; the only custom app with a Node/Vite toolchain. Talks to the backend **only** through the BFF/API contract defined in `sentra_mantra_integrations` — never the generic DocType REST API directly. **Not** the place for backend/domain logic of any kind (→ `core`/`hospital`/`indonesia`/`integrations`).

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench install-app sentra_mantra_portal
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/sentra_mantra_portal
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### License

mit
