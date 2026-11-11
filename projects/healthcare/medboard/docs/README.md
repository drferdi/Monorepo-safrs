# MedBoard Technical Documentation

Comprehensive technical documentation for MedBoard, the clinical dashboard and decision support system for Puskesmas primary care healthcare facilities.

For quick setup and high-level project background, see the [Project README](../README.md).

---

## Documentation Structure

```text
docs/
├── README.md                          # Master documentation index
├── api/
│   ├── openapi.yaml                   # OpenAPI 3.1 machine-readable specification
│   └── overview.md                    # HTTP REST & WebSocket API reference
├── architecture/
│   ├── overview.md                    # Subsystem topology and execution modes
│   ├── clinical-logic.md              # Iskandar Engine V2, triage, & clinical rules
│   ├── data-model.md                  # TypeScript domain interfaces & data types
│   ├── data.md                        # Persistence layer, migrations, & synthetic data
│   └── features.md                    # End-to-end user flows & feature catalog
├── deployment/
│   ├── overview.md                    # Production environments & build pipeline
│   └── vps.md                         # Ubuntu 24.04 VPS runbook & backup routines
├── development/
│   ├── setup.md                       # Local environment configuration & commands
│   ├── testing.md                     # Test runner suites, patterns, & coverage
│   └── troubleshooting.md             # Common errors, resolutions, & diagnostics
└── governance/
    ├── ai-governance.md               # Clinical safety guardrails & transparency
    └── privacy.md                     # Zero-PHI architecture & PDPA compliance
```

---

## Index & Navigation

### 1. Development & Operations
| Document | Path | Description |
|---|---|---|
| **Local Setup** | [`development/setup.md`](development/setup.md) | Node 24, pnpm 11, PostgreSQL setup, and environment variables |
| **Testing Guide** | [`development/testing.md`](development/testing.md) | `node:test` suites, CDSS verification, and acceptance gates |
| **Troubleshooting** | [`development/troubleshooting.md`](development/troubleshooting.md) | Port conflicts, auth errors, and engine fallback diagnostics |

### 2. Architecture & Design
| Document | Path | Description |
|---|---|---|
| **Architecture Overview** | [`architecture/overview.md`](architecture/overview.md) | System layers, runtime topologies, and pointers to root architecture |
| **Clinical Logic** | [`architecture/clinical-logic.md`](architecture/clinical-logic.md) | Iskandar Diagnosis Engine V2, KKI compendium, and triage boundaries |
| **Data Model** | [`architecture/data-model.md`](architecture/data-model.md) | Type contracts, `CDSSEngineInput`, and Socket.IO payloads |
| **Data Storage** | [`architecture/data.md`](architecture/data.md) | PostgreSQL with Prisma, runtime queues, and synthetic fixtures |
| **Feature Catalog** | [`architecture/features.md`](architecture/features.md) | Detailed feature walkthroughs, sequence diagrams, and endpoints |

### 3. API & Protocols
| Document | Path | Description |
|---|---|---|
| **API Reference** | [`api/overview.md`](api/overview.md) | REST routes, query contracts, and WebSocket event catalog |
| **OpenAPI Specification** | [`api/openapi.yaml`](api/openapi.yaml) | Standard OpenAPI 3.1 contract for API clients |

### 4. Deployment & Infrastructure
| Document | Path | Description |
|---|---|---|
| **Deployment Overview** | [`deployment/overview.md`](deployment/overview.md) | Production build pipeline, systemd service, and health checks |
| **VPS Runbook** | [`deployment/vps.md`](deployment/vps.md) | Ubuntu 24.04 configuration, Caddy reverse proxy, and automated backups |

### 5. Governance & Compliance
| Document | Path | Description |
|---|---|---|
| **AI Governance** | [`governance/ai-governance.md`](governance/ai-governance.md) | Human authority, transparent reasoning, and deterministic red flags |
| **Privacy & Compliance** | [`governance/privacy.md`](governance/privacy.md) | Zero-PHI architecture, audit redaction, and Indonesian PDPA alignment |

---

## Root Repository Specifications

- [`README.md`](../README.md) — High-level introduction, stack overview, and quickstart.
- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — System boundaries, network diagrams, and service definitions.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — Coding standards, git conventions, and branch management.
- [`SECURITY.md`](../SECURITY.md) — Vulnerability reporting guidelines and security commitments.
- [`DATA_PRIVACY.md`](../DATA_PRIVACY.md) — Statutory data privacy disclosures and legal expectations.
- [`DISCLAIMER.md`](../DISCLAIMER.md) — Clinical safety and software liability disclaimers.
- [`CHANGELOG.md`](../CHANGELOG.md) — Release notes and revision history.
- [`LICENSE`](../LICENSE) — Repository license terms.

---

## Engineering Guidelines

- **Commands:** Ensure all documented commands remain copy-pasteable and match `package.json` scripts.
- **Data Protection:** Never commit secrets, authentication credentials, or live patient data to source control.
- **API Synchronization:** Whenever endpoints under `src/app/api/` are modified, keep [`api/overview.md`](api/overview.md) and [`api/openapi.yaml`](api/openapi.yaml) updated in lockstep.

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
