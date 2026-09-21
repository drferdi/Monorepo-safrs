# Context: Avery

## Metadata
- Slug: avery
- Created: 2024-08
- Lead Agent: Sarah (clinical assistant) + Cursor / Claude (coding agents)
- Domain: healthcare / clinical nursing
- Status: active
- Priority: p1
- Location: `projects/healthcare/avery/`
- Human Owner: Chief (dr. Ferdi Iskandar)

## Objective

Avery is a clinical nursing care assistant built on the Hermes framework. It serves as the nursing-side complement to SentraBot within RSIA Melinda Kediri. While SentraBot handles operational workflows (queue management, BPJS claims, communications), Avery focuses on bedside care documentation, patient monitoring, and nursing protocol adherence.

The product addresses three clinical nursing pain points:
1. **Bedside care documentation** — structured nursing notes, vital sign recording, and care plan tracking replacing fragmented paper-based nursing logs
2. **Patient monitoring alerts** — automated detection of abnormal vital signs and escalation to attending physicians based on RSIA Melinda clinical protocols
3. **Nursing protocol compliance** — ensuring adherence to standard nursing procedures (SOP) through guided checklists and real-time validation

Success criteria:
- 90% of nursing documentation completed digitally within 3 months
- Alert response time under 2 minutes for critical vital sign abnormalities
- 100% SOP compliance rate for high-risk procedures (post-operative care, neonatal care)
- Seamless data exchange with SentraBot for unified patient records

## Architecture Overview

Avery operates as a standalone clinical application with a distinct architecture from SentraBot, using the Hermes framework specifically designed for nursing workflows.

### Technology Stack
| Layer | Technology | Purpose | Notes |
|-------|-----------|---------|-------|
| Frontend | React (TBD exact version) | Nursing station web interface | May share UI components with SentraBot via packages/ui-web |
| Backend | Hermes framework | Clinical workflow engine | Domain-specific for nursing care processes |
| Database | SQLite (runtime) | Lightweight local data storage | `hermes-web-ui.db` — currently development/testing |
| Database (target) | PostgreSQL | Production data store | Migration planned after Hermes stability proven |
| AI | Sarah (Clinical Agent) | Nursing protocol guidance, documentation assistance | Shares agent identity with SentraBot but different knowledge domain |
| Integration | Planned oRPC | Communication with SentraBot API | Not yet implemented — requires unified schema |

### Hermes Framework Architecture
The Hermes framework is an experimental clinical workflow engine specifically designed for nursing care documentation. It provides:
- Structured care plan templates (neonatal, post-operative, general ward)
- Vital sign input forms with range validation against RSIA Melinda protocols
- Alert generation based on protocol-defined thresholds
- Shift handover report generation
- Integration hooks for medical devices (sphygmomanometer, pulse oximeter, thermometer)

## Key Decisions

| Date | Decision | Rationale | Owner | Impact | Status |
|------|----------|-----------|-------|--------|--------|
| 2024-08 | Hermes framework | Dedicated clinical workflow engine designed specifically for nursing care processes. General-purpose frameworks lack nursing-specific abstractions. | Chief | Core architecture | Active |
| 2024-09 | SQLite runtime | Lightweight, zero-configuration database suitable for development and testing without PostgreSQL infrastructure setup. Enables rapid iteration. | Chief | Development velocity | Active |
| 2025-01 | Separate from SentraBot | Nursing care (bedside documentation, vital signs, SOP compliance) and operational workflow (queue, BPJS, communication) are fundamentally different clinical domains with different users (nurses vs. admin staff). | Chief | Product scope | Active |
| 2025-06 | Planned PostgreSQL migration | SQLite is insufficient for production multi-user concurrent access. PostgreSQL migration required before hospital-wide deployment. | Chief | Production readiness | Planned |
| 2026-03 | Planned @safrs/* migration | Align with SentraBot and Golden Path standard stack. Hermes framework may be absorbed into @safrs/api or maintained as domain-specific layer. | Chief | Long-term architecture | Planned |

## Current Focus

### Active Development Streams (as of 2026-09-14)

1. Hermes Web UI Stabilization
   - Nursing station interface for vital sign input and care plan documentation
   - Shift handover report generation and export
   - Touch-friendly interface for bedside tablet computers

2. Patient Monitoring Alert System
   - Vital sign threshold configuration per RSIA Melinda clinical protocols
   - Alert routing: abnormal vital signs -> attending physician via SentraBot communication module
   - Alert escalation: unacknowledged alerts -> senior nurse -> department head

3. Database Schema Finalization
   - Patient-nursing relationship model
   - Care plan template definitions
   - Vital sign time-series storage schema
   - Migration path from SQLite to PostgreSQL

4. SentraBot Integration Planning
   - Unified patient ID system between Avery and SentraBot
   - Shared patient demographic data (read-only from SentraBot)
   - Cross-system alert delivery (Avery detects -> SentraBot notifies)

## Blockers & Dependencies

| # | Blocker | Severity | Dependency | ETA | Owner | Impact if Unresolved | Mitigation |
|---|---------|----------|------------|-----|-------|---------------------|------------|
| 1 | Unified patient data with SentraBot | High | Shared database schema design and @safrs/database implementation | TBD | Chief | Duplicate patient records; nurses enter demographics in Avery while admin enters in SentraBot | Prioritize patient ID standardization; implement read-only sync from SentraBot |
| 2 | Hermes framework stability | High | Comprehensive testing with real nursing scenarios and shift patterns | TBD | Chief | Framework bugs during actual clinical use risk patient safety | Extensive testing in simulation environment before deployment |
| 3 | SQLite to PostgreSQL migration | Medium | PostgreSQL infrastructure setup in RSIA Melinda | TBD | Chief | SQLite concurrency limits prevent multi-nurse simultaneous access | Run SQLite for pilot (single nursing station); migrate before multi-station rollout |
| 4 | Medical device integration | Medium | Hardware vendor APIs for sphygmomanometer, pulse oximeter, thermometer | TBD | Chief | Manual vital sign entry remains error-prone and time-consuming | Phase 1: manual entry with validation; Phase 2: device auto-read |

## Related Projects

| Project | Relationship | Data Flow | Notes |
|---------|-------------|-----------|-------|
| [SentraBot](sentrabot.context.md) | Operational complement — queue/BPJS vs bedside care | Planned bidirectional: Avery reads patient demographics from SentraBot; Avery sends alerts to SentraBot notification system | Unified patient database is the critical integration milestone. |
| [Control Center](control-center.context.md) | Monitoring dependency | Control Center will consume Avery service health metrics | Avery must expose standard metrics endpoint consistent with SentraBot. |
| [Golden Path](golden-path.context.md) | Architecture reference | Golden Path proves @safrs/* stack; Avery is migration target post-Hermes validation | Decision pending: absorb Hermes into @safrs/* or maintain as domain-specific layer. |

## Session Log

| # | Date | Agent | Mode | Summary | Outcomes |
|---|------|-------|------|---------|----------|
| 001 | 2026-09-14 | Vida (external) | Observation | Discovered during workspace scan as healthcare capsule alongside SentraBot | Confirmed distinct architecture (Hermes vs. SAFRS); identified SQLite runtime database |

## Knowledge Base

### Key Documents

| # | Document | Path | Type | Sensitivity | Last Modified |
|---|----------|------|------|-----------|---------------|
| 1 | Avery README | `projects/healthcare/avery/README.md` | Product | Internal | 2026-09-02 |
| 2 | Avery AGENTS.md | `projects/healthcare/avery/AGENTS.md` | Governance | Internal | 2026-09-02 |
| 3 | Hermes Framework Spec | `projects/healthcare/avery/` (TBD exact path) | Architecture | Internal | TBD |

### Extracted Insights

- **Hermes as Experiment**: The Hermes framework represents an architectural experiment — a domain-specific clinical workflow engine versus the general-purpose SAFRS stack. Its success or failure will determine whether Sentra maintains dual architectures or converges on @safrs/*.
- **SQLite as Bridge**: SQLite serves as a deliberate bridge technology — enabling rapid development without PostgreSQL infrastructure complexity. However, it creates a migration requirement that adds technical debt. The Golden Path project's PostgreSQL setup can serve as the migration template.
- **Nursing Domain Specificity**: Avery's nursing-specific features (care plan templates, shift handover, vital sign alerts) demonstrate that healthcare AI cannot be one-size-fits-all. Even within a single hospital, different clinical roles require different AI capabilities and interfaces.
