# MedBoard technical documentation

Deeper technical material for MedBoard, the clinical dashboard for Puskesmas staff. Start with
the [project README](../README.md) for an overview and quickstart.

## Index

| Document | Description |
| --- | --- |
| [`SETUP.md`](./SETUP.md) | Local setup, prerequisites and first run |
| [`architecture.md`](./architecture.md) | Pointer to the architecture description in [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| [`API.md`](./API.md) | HTTP API overview; machine-readable stub in [`api/openapi.yaml`](./api/openapi.yaml) |
| [`DATA_MODEL.md`](./DATA_MODEL.md) | Data model and persistence |
| [`data.md`](./data.md) | Where data lives: database, runtime files, reference data |
| [`CLINICAL_LOGIC.md`](./CLINICAL_LOGIC.md) | Clinical logic boundaries (non-prescriptive) |
| [`AI_GOVERNANCE.md`](./AI_GOVERNANCE.md) | AI providers, disclosure and human oversight |
| [`PRIVACY.md`](./PRIVACY.md) | Privacy and patient-data handling in the implementation |
| [`testing.md`](./testing.md) | Test commands and conventions |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Deployment notes |
| [`deploy-vps.md`](./deploy-vps.md) | Deploying to an Ubuntu VPS |
| [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) | Common failures and fixes |

Project-level documents in the repository root: [`README.md`](../README.md),
[`ARCHITECTURE.md`](../ARCHITECTURE.md), [`CONTRIBUTING.md`](../CONTRIBUTING.md),
[`SECURITY.md`](../SECURITY.md), [`DATA_PRIVACY.md`](../DATA_PRIVACY.md),
[`DISCLAIMER.md`](../DISCLAIMER.md), [`CHANGELOG.md`](../CHANGELOG.md) and [`LICENSE`](../LICENSE).

## Conventions

- Keep commands copy-pasteable and check them against the `package.json` scripts.
- Never store secrets, credentials or real patient data in this repository.
- After changing routes under `src/app/api/`, update `API.md`. `pnpm run docs:api` writes a
  generated OpenAPI file to `mintlify-docs/openapi.json` (git-ignored) for reference.
