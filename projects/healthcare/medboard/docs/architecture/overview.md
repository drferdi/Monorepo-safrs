# System Architecture — MedBoard

High-level architecture overview, subsystem mapping, execution runtimes, and core component relationships.

The comprehensive technical architecture description is maintained in the project-level [Architecture Specification](../../ARCHITECTURE.md).

---

## Architectural Pillars

- **Application Stack:** Next.js 16 (App Router), React 19, TypeScript strict mode, Tailwind CSS 4.
- **Server Runtime:** Custom Node.js 24 runtime (`server.ts`) hosting integrated Socket.IO WebSocket pipelines alongside Next.js request handling.
- **Data Layer:** PostgreSQL 16 accessed via Prisma 6 ORM; ephemeral queues managed in local runtime storage.
- **Clinical Intelligence:** Iskandar Diagnosis Engine V2 (IDE-V2) combining deterministic KKI knowledge base verification and DeepSeek Reasoner.

---

## Technical Documentation Map

- [Clinical Logic & CDSS](clinical-logic.md) — Iskandar Diagnosis Engine V2, candidate retrieval, NEWS2 rules, and triage alert pipelines.
- [Data Model & Schemas](data-model.md) — TypeScript type definitions, Prisma models, and clinical data contracts.
- [Data Storage & Persistence](data.md) — Database topology, migrations, runtime queues, and reference data.
- [Feature Catalog](features.md) — End-to-end user workflows, feature specifications, and sequence diagrams.
- [API Reference](../api/overview.md) — HTTP REST route catalog, route handlers, and OpenAPI specification.
- [AI Governance](../governance/ai-governance.md) — Clinical safety boundaries, human oversight, and transparency disclosures.
- [Privacy & Data Protection](../governance/privacy.md) — Zero-PHI architecture, audit redaction, and regulatory compliance.
- [Deployment Runbook](../deployment/overview.md) — Production build processes, Caddy proxy configurations, and systemd units.

---

## Execution Modes

1. **Standard Development & Production:** Executes through `server.ts` with real-time Socket.IO channels enabled.
2. **Local Standalone Mode (`start:local`):** Executes via `next start` on `127.0.0.1:4344` without database dependencies for isolated UI testing.

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
