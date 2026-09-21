# Context: SentraBot

## Metadata
- Slug: sentrabot
- Created: 2024-06-14
- Lead Agent: Sarah (clinical assistant) + Cursor / Claude (coding agents)
- Domain: health / healthcare product
- Status: active
- Priority: p0 (highest — core revenue-generating product)
- Location: `projects/product/sentrabot/`
- Public URL: https://sentrahai.com
- License: Apache-2.0
- Human Owner: Chief (dr. Ferdi Iskandar)

## Objective

SentraBot is the flagship AI clinical assistant for RSIA Melinda Kediri, a maternal and child hospital in East Java, Indonesia. It serves as the primary health vertical product within the Sentra AI monorepo, focused on Indonesian children and communities.

The product addresses three critical operational pain points:
1. Patient queue management — digitalizing the traditional paper-based antrian system, reducing wait times, and providing real-time status updates to patients and staff
2. BPJS claim workflow — streamlining the complex Indonesian national health insurance claim process, reducing manual paperwork errors, and accelerating reimbursement cycles
3. Doctor-nurse communication — providing a secure, real-time messaging and notification system between clinical staff, replacing informal WhatsApp groups that lack audit trails and compliance

Success criteria:
- Reduce patient wait time by 40% within 6 months of deployment
- BPJS claim error rate below 2%
- 100% of clinical staff actively using the communication module daily
- Voice reminder system achieving 85% patient attendance rate for scheduled appointments

## Architecture Overview

SentraBot operates as a full-stack application within the SAFRS (Sentra AI Framework for Reliable Systems) monorepo architecture.

### Applications
| App | Path | Role | Runtime |
|-----|------|------|---------|
| apps/api | `apps/api/` | Public runtime boundary — Hono server | Node.js 22+ |
| apps/web | `apps/web/` | Main web client — Vite SPA | Browser |
| apps/desktop | `apps/desktop/` | Electron shell hosting web UI | Electron |
| apps/mobile | `apps/mobile/` | Expo React Native app | React Native |
| apps/worker | `apps/worker/` | Graphile Worker job processors | Node.js 22+ |
| apps/docs | `apps/docs/` | Documentation site | Static / SSR |
| apps/site | `apps/site/` | Public marketing site | Static |

### Shared Packages
| Package | Path | Role | Consumers |
|---------|------|------|-----------|
| packages/adapter-kit | `packages/adapter-kit/` | Background jobs, jobKey redelivery | api, worker |
| packages/adapters | `packages/adapters/` | SandboxProvider, executor, desktop paths | api, worker |
| packages/auth | `packages/auth/` | Authentication primitives | all apps |
| packages/bot-templates | `packages/bot-templates/` | Bot template definitions | api, web |
| packages/chat-ui | `packages/chat-ui/` | Chat interface components | web, mobile |
| packages/contracts | `packages/contracts/` | Shared TypeScript interfaces | all packages |
| packages/core | `packages/core/` | Run state machine, lease fencing, idempotency | api, worker |
| packages/db | `packages/db/` | Prisma schema, migrations, generation | all |
| packages/memory | `packages/memory/` | Memory layer for agents | api |
| packages/testkit | `packages/testkit/` | Test harnesses | tests |
| packages/ui-tokens | `packages/ui-tokens/` | Design tokens (@sentra/token) | all UI |
| packages/ui-web | `packages/ui-web/` | Web UI components | web, docs, site |

### Runtime Architecture
Web (Vite 127.0.0.1:5173), Mobile (Expo), Desktop (Electron) connect to:
- apps/api — Hono on API_HOST:API_PORT (default 127.0.0.1:3100)
  - Auth/session (Better Auth), workspace actor
  - oRPC router: bots, threads, runs, routines, computers, integrations, deployment
  - Composition root: executor + sandbox + connectors + memory + thread events
- PostgreSQL (Prisma) — graphile_worker -> apps/worker
  - Worker handles: run.continue, routine.wakeup, phone.deliver, computer.*, skill.*, history.compact
  - Reconciler: re-enqueues queued runs, expired leases, near-due routines

## Key Decisions

| Date | Decision | Rationale | Owner | Impact | Status |
|------|----------|-----------|-------|--------|--------|
| 2024-06-14 | Local-first architecture | Indonesian health data governed by strict privacy regulations (UU No. 27/2022). Patient data must never leave RSIA Melinda infrastructure. | Chief | All data layer decisions | Enforced |
| 2024-08-03 | BPJS-first workflow | ~90% of RSIA Melinda patients utilize BPJS. Optimizing for BPJS maximizes immediate impact. | Chief | Feature prioritization | Active |
| 2024-10-15 | Voice capability via Vapi | Automated phone reminders. Indonesian elderly and low-literacy patients respond better to voice than SMS/app. | Chief | Patient engagement | Active |
| 2025-03-20 | Monorepo native migration | Consolidate scattered repositories into unified SAFRS monorepo. Eliminates version drift. | Chief | Repository structure | Completed |
| 2025-07-10 | Electron desktop app | RSIA Melinda staff work from fixed nursing station computers. Desktop provides persistent notifications and tray integration. | Chief | Frontend distribution | Active |
| 2026-01-15 | @sentra/token design system | Semantic token-based design replacing ad-hoc styling. Typography: Geist + Geist Mono exclusively. | Chief | UI/UX standardization | Active |
| 2026-09-02 | apps/api IS the harness | Eliminated separate harness process on port 8799. API server already owns commands, SSE, permissions. | Chief | Runtime architecture | Completed |

## Current Focus

### Active Development Streams (as of 2026-09-14)

1. Core Workflow Stabilization
   - Patient queue digitalization: antrian masuk, panggilan perawat, status updates
   - BPJS claim form pre-validation to reduce rejection rate
   - Real-time dashboard for nursing station supervisors

2. Sarah Clinical Agent Enhancement
   - BPJS protocol knowledge base expansion (version 2.1 regulations)
   - RSIA Melinda-specific clinical guidelines integration
   - Indonesian medical terminology fine-tuning for voice recognition

3. Voice Agent Stability
   - Vapi integration robustness: retry logic, fallback to SMS
   - Indonesian TTS quality evaluation (neural vs standard voices)
   - Appointment reminder A/B testing: voice vs WhatsApp vs SMS

4. Production Deployment Preparation
   - End-to-end integration testing with RSIA Melinda HIS
   - Load testing: simulate peak hours (Monday 08:00-10:00)
   - Security audit: penetration testing for patient data endpoints

## Blockers & Dependencies

| # | Blocker | Severity | Dependency | ETA | Owner | Impact if Unresolved | Mitigation |
|---|---------|----------|------------|-----|-------|---------------------|------------|
| 1 | BPJS API integration | Critical | BPJS credential (sensitive, R3 escalation) | TBD | Chief | Cannot automate claim submission; manual process continues | Direct negotiation with BPJS regional office; alternative batch upload |
| 2 | Voice agent stability | High | Vapi credits & testing infrastructure | TBD | Chief | Reminder system unreliable; patient no-show rate high | Implement SMS fallback; reduce voice to critical appointments |
| 3 | Production deploy to RSIA Melinda | High | IT infrastructure approval & VPN setup | TBD | Chief | Product stuck in staging; no real patient data validation | Staged rollout: start with 1 department (Poli Anak) before hospital-wide |
| 4 | HIS integration | Medium | RSIA Melinda HIS vendor API documentation | TBD | Chief | Duplicate data entry; staff use both HIS and SentraBot | Develop HIS bridge adapter; prioritize read-only integration first |
| 5 | Electron desktop performance | Medium | Desktop app startup time > 5s on hospital computers | TBD | Chief | Nursing staff resistance; prefer browser over slow app | Profile and optimize bundle size; implement lazy loading |

## Related Projects

| Project | Relationship | Data Flow | Notes |
|---------|-------------|-----------|-------|
| [Avery](avery.context.md) | Clinical complement — nursing care vs operational workflow | Planned: unified patient database | Avery handles bedside care; SentraBot handles operations. Shared patient ID planned. |
| [Control Center](control-center.context.md) | Monitoring dependency | Control Center consumes SentraBot health metrics | SentraBot must expose standard metrics endpoint. |
| [Golden Path](golden-path.context.md) | Architecture reference | Golden Path proves SAFRS typed stack; SentraBot is target migration consumer | Gradual migration to @safrs/* packages as Golden Path stabilizes. |
| [Portfolio Dr. Novia](portfolio-drnovia.context.md) | No direct dependency | None | Different domain and architecture. |
| [Academic Smartboard](academic-smartboard.context.md) | Potential future integration | None planned | Could integrate for pediatric health education materials. |

## Session Log

| # | Date | Agent | Mode | Summary | Outcomes |
|---|------|-------|------|---------|----------|
| 001 | 2026-09-14 | Vida (external) | Observation | Initial workspace scan discovered capsule structure and dependencies | Confirmed 8 product capsules; validated monorepo topology |

## Knowledge Base

### Key Documents

| # | Document | Path | Type | Sensitivity | Last Modified |
|---|----------|------|------|-----------|---------------|
| 1 | AGENTS.md (root) | `AGENTS.md` | Governance | Internal | 2026-09-02 |
| 2 | SAFRS_SPEC.md | `SAFRS_SPEC.md` | Specification | Internal | 2026-09-02 |
| 3 | SECURITY.md | `SECURITY.md` | Security | Confidential | 2026-09-02 |
| 4 | SentraBot README | `projects/product/sentrabot/README.md` | Product | Internal | 2026-09-02 |
| 5 | SentraBot AGENTS.md | `projects/product/sentrabot/AGENTS.md` | Governance | Confidential | 2026-09-02 |
| 6 | BPJS Automation Plan | `docs/plans/active/SAFRS_FULL_AUTOMATION_IMPLEMENTATION_PLAN.md` | Plan | Internal | 2026-09-02 |
| 7 | Design Tokens | `packages/ui-tokens/src/tokens.css` | Design | Public-safe | 2026-09-02 |

### Extracted Insights

- **Clinical Data Unification**: SentraBot and Avery share the healthcare domain but serve different clinical workflows. A unified patient database (using @safrs/database schema) would eliminate data silos. Risk: BPJS data privacy constraints may limit cross-project data sharing.
- **Voice as Differentiator**: The Vapi voice integration is a genuine differentiator in the Indonesian healthtech market. Competitors (Halodoc, Alodokter) rely primarily on chat and SMS. Voice capability specifically addresses elderly and low-literacy patient populations — a significant underserved segment.
- **Desktop vs Mobile Strategy**: RSIA Melinda staff work from fixed nursing station computers, making Electron desktop the correct primary interface. Mobile (Expo) serves as secondary for on-call doctors. This differs from typical SaaS "mobile-first" assumptions.
- **SAFRS Migration Path**: SentraBot currently contains legacy patterns predating the @safrs/* package ecosystem. Golden Path serves as reference implementation. Priority migration order: (1) packages/contracts for type safety, (2) packages/db for unified Prisma schema, (3) packages/ui-tokens for design system compliance.
- **Privacy-First Architecture**: The local-first decision is both a regulatory requirement and a competitive advantage. However, it complicates cloud-based features (e.g., multi-hospital scaling). A hybrid model — local primary + encrypted cloud backup for disaster recovery — may be needed for Series A scalability.
