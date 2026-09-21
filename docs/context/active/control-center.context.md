# Context: Control Center

## Metadata
- Slug: control-center
- Created: 2024-10
- Lead Agent: Nara (executive assistant) + Cursor / Claude (coding agents)
- Domain: internal / infrastructure / monitoring
- Status: active
- Priority: p2
- Location: `projects/internal/control-center/`
- Human Owner: Chief (dr. Ferdi Iskandar)

## Objective

Control Center is the internal operational dashboard for monitoring and controlling all Sentra AI services. It serves as the single pane of glass through which the Chief and internal team observe system health, service status, logs, and metrics across all product capsules.

The dashboard addresses four operational visibility needs:
1. **Service health monitoring** — real-time status of all Sentra AI applications (API, web, desktop, mobile, worker) and product capsules (SentraBot, Avery, Academic Smartboard, etc.)
2. **Log aggregation and search** — centralized collection and querying of application logs across distributed services
3. **Alert management** — configurable alerting for service degradation, error rate spikes, and infrastructure anomalies
4. **Operational metrics** — business and technical metrics: API request rates, response times, active users, deployment status

Success criteria:
- 99.9% uptime visibility for all critical services
- Log search response time under 3 seconds for 7-day window
- Alert delivery latency under 30 seconds from trigger to notification
- Single dashboard eliminating need to check individual service consoles

## Architecture Overview

Control Center is an internal-facing application that consumes metrics and logs from all other Sentra AI services through standardized APIs.

### Technology Stack
| Layer | Technology | Purpose | Notes |
|-------|-----------|---------|-------|
| Frontend | React / Next.js (TBD) | Dashboard web interface | May use shared packages/ui-web components |
| Backend | API aggregator | Collect and normalize metrics from multiple sources | Must handle heterogeneous capsule architectures |
| Data Store | Time-series database (TBD: InfluxDB, TimescaleDB, or PostgreSQL) | Metrics storage and aggregation | Decision pending based on query patterns |
| Log Store | Elasticsearch or Loki (TBD) | Log indexing and search | Alternatively: PostgreSQL JSONB for simplicity |
| Alert Engine | Custom or Prometheus Alertmanager (TBD) | Threshold evaluation and notification routing | Must support multiple channels: in-app, email, SMS |

### Integration Model
Control Center does not own any business logic — it is a pure aggregation and visualization layer. Each product capsule (SentraBot, Avery, etc.) must:
1. Expose a standard health endpoint (`/health` or `/api/health`) returning JSON with standardized fields
2. Emit structured logs in a standard format (JSON Lines with common schema)
3. Report key metrics via a standard metrics API or Prometheus-compatible endpoint

The standard health response schema (proposed):
```json
{
  "service": "sentrabot-api",
  "status": "healthy", // healthy | degraded | unhealthy
  "version": "1.2.3",
  "timestamp": "2026-09-14T10:00:00Z",
  "checks": {
    "database": "healthy",
    "cache": "healthy",
    "external_api": "degraded"
  },
  "metrics": {
    "request_rate_1m": 150,
    "error_rate_1m": 0.02,
    "p99_latency_ms": 250
  }
}
```

## Key Decisions

| Date | Decision | Rationale | Owner | Impact | Status |
|------|----------|-----------|-------|--------|--------|
| 2024-10 | Build internal first | Control own infrastructure monitoring before relying on external SaaS dashboards (Datadog, New Relic). Avoid vendor lock-in and data egress. | Chief | Architecture independence | Active |
| 2025-02 | Connect all capsules | Unified visibility is critical for operational decision-making. Fragmented monitoring leads to blind spots and delayed incident response. | Chief | Scope expansion | Active |
| 2025-08 | Standard metrics schema | Every capsule must expose consistent health endpoints. Without standardization, Control Center cannot aggregate meaningfully. | Chief | Integration contract | Active |
| 2026-01 | Internal-only access | Control Center contains infrastructure details, service topology, and potentially error logs with sensitive data. No external access permitted. | Chief | Security posture | Enforced |

## Current Focus

### Active Development Streams (as of 2026-09-14)

1. Dashboard UI for Service Status
   - Grid view of all services with color-coded status (green/yellow/red)
   - Service dependency graph visualization
   - Historical uptime charts (24h, 7d, 30d)

2. Log Aggregation Pipeline
   - Log collection from distributed capsules
   - Structured log parsing and indexing
   - Search interface with filters: service, level, timestamp range, keyword

3. Alert System Design
   - Threshold-based alerting: error rate > 5%, latency > 500ms, disk usage > 80%
   - Alert routing: in-app notification, email to Chief, SMS for critical only
   - Alert deduplication and grouping to prevent notification fatigue

4. Metrics Standardization
   - Define and document standard health endpoint schema
   - Implement health endpoints in SentraBot (priority p0)
   - Implement health endpoints in Avery (priority p1)
   - Implement health endpoints in Golden Path (reference implementation)

## Blockers & Dependencies

| # | Blocker | Severity | Dependency | ETA | Owner | Impact if Unresolved | Mitigation |
|---|---------|----------|------------|-----|-------|---------------------|------------|
| 1 | Metrics API from capsules | High | Each capsule must expose standard health endpoint | TBD | Chief | Control Center has no data to display; dashboard is empty | Start with SentraBot and Golden Path as pilot implementations |
| 2 | Real-time log streaming | Medium | WebSocket or Server-Sent Events implementation for live log tailing | TBD | Chief | Log view is delayed by batch processing interval (minutes) | Phase 1: batch collection every 60 seconds; Phase 2: real-time streaming |
| 3 | Time-series database selection | Low | Evaluation of InfluxDB vs TimescaleDB vs PostgreSQL JSONB for metrics storage | TBD | Chief | Suboptimal query performance for large metric volumes | Start with PostgreSQL (already operational); migrate if volume exceeds threshold |

## Related Projects

| Project | Relationship | Data Flow | Notes |
|---------|-------------|-----------|-------|
| [SentraBot](sentrabot.context.md) | Monitored service #1 (priority p0) | SentraBot exposes health endpoint -> Control Center consumes | SentraBot has the most complex architecture; its health endpoint is the most valuable. |
| [Avery](avery.context.md) | Monitored service #2 (priority p1) | Avery exposes health endpoint -> Control Center consumes | Avery uses Hermes framework; health endpoint design may differ from SAFRS stack. |
| [Golden Path](golden-path.context.md) | Reference implementation for SAFRS monitoring | Golden Path exposes health endpoint -> Control Center consumes | Golden Path should implement the canonical health endpoint pattern for other capsules to copy. |
| [Portfolio Dr. Novia](portfolio-drnovia.context.md) | Monitored service #3 (priority p2) | Dr. Novia exposes health endpoint -> Control Center consumes | Standalone capsule with vendored dependencies; health check may be simplified (HTTP 200 OK). |

## Session Log

| # | Date | Agent | Mode | Summary | Outcomes |
|---|------|-------|------|---------|----------|
| 001 | 2026-09-14 | Vida (external) | Observation | Discovered during workspace scan as internal infrastructure capsule | Confirmed monitoring and dashboard purpose |

## Knowledge Base

### Key Documents

| # | Document | Path | Type | Sensitivity | Last Modified |
|---|----------|------|------|-----------|---------------|
| 1 | Control Center README | `projects/internal/control-center/README.md` | Product | Internal | 2026-09-02 |
| 2 | Control Center AGENTS.md | `projects/internal/control-center/AGENTS.md` | Governance | Internal | 2026-09-02 |

### Extracted Insights

- **Infrastructure as Product**: Control Center demonstrates that internal tools deserve product-level attention. A neglected monitoring system creates operational blindness that directly impacts customer-facing reliability.
- **Standardization Challenge**: The heterogeneity of capsule architectures (SAFRS stack for SentraBot/Golden Path, Hermes for Avery, standalone vendored for Dr. Novia) creates a metrics standardization challenge. The health endpoint schema must be architecture-agnostic.
- **Alert Fatigue Prevention**: The alert system design must include deduplication, grouping, and severity classification from day one. An alert system that cries wolf will be ignored — and then miss the real incident.
