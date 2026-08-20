# Architecture

The SAFRS Monorepo follows a six-layer control architecture defined in `SAFRS_SPEC.md`. Each layer adds enforcement from trust boundaries at the bottom to human authority at the top. On top of this, an automation control plane (ADR 0002) adds machine-checked task contracts, lease chains, PR gates, evidence manifests, and a separated publisher identity.

## Six-layer control architecture

```mermaid
graph TD
    L5["L5 — Human Authority<br/>Defines intent, owns architecture,<br/>approves high-impact actions"]
    L4["L4 — Executable Governance<br/>CI, linters, tests, architecture checks,<br/>PR gates, secret detection, evidence"]
    L3["L3 — Execution Isolation<br/>Worktrees, isolated dependencies,<br/>test databases, budget ledgers"]
    L2["L2 — Context and Navigation<br/>AGENTS.md, canonical docs, ADRs,<br/>active plans, project capsules"]
    L1["L1 — Constitution<br/>Objectives, architecture, engineering,<br/>coding, security, product standards"]
    L0["L0 — Trust Boundary<br/>Identity, repository access,<br/>data classification, credentials"]

    L5 --> L4 --> L3 --> L2 --> L1 --> L0
```

## Automation control plane

The automation control plane extends L4 (Executable Governance) with machine-checked enforcement. It was introduced in ADR 0002 and implemented across 5 phases.

```mermaid
graph TD
    subgraph Control Plane
        CT["Canonical Contracts<br/>Task, Run, Operation, Lease,<br/>Approval, Evidence, Platform<br/>(JSON Schema 2020-12)"]
        RK["Monotonic Risk<br/>effective = max(declared, path,<br/>operation, data, capability, diff)"]
        LS["Lease Chains<br/>CLAIM → RENEW → TRANSITION<br/>→ RELEASE, fencing tokens"]
        GT["PR Gates<br/>8 gates: contract, lease, risk,<br/>budgets, verification, review,<br/>evidence, platform"]
        EV["Evidence Manifests<br/>Content-addressed, redacted,<br/>reconstructable lifecycle"]
        AP["Approvals<br/>Content-bound, time-limited,<br/>no self-review"]
        PB["Publisher<br/>enable_auto_merge only,<br/>never merge or push"]
        GD["Shared Guard<br/>Vendor-neutral decision for<br/>every adapter"]
    end

    CT --> RK
    CT --> LS
    RK --> GT
    LS --> GT
    GT --> EV
    EV --> AP
    AP --> PB
    GD --> GT
```

## Repository topology

```mermaid
graph LR
    subgraph Projects
        GP["golden-path/apps/web<br/>Next.js + Hono demonstrator"]
        TMPL["_template<br/>Project capsule template"]
    end

    subgraph Packages
        SCH["schemas"]
        ENV["env"]
        DB["database"]
        API["api"]
        UI["ui"]
        TOK["token"]
        CFG["config"]
        TEL["telemetry"]
    end

    subgraph Tools
        SAFRS["safrs checkers<br/>(16 Python)"]
        AUTO["automation<br/>control plane"]
        DOC["doctor"]
        WIZ["project-wizard"]
        CAP["capabilities"]
        CG["codegen"]
        DG["deps-graph"]
        TSK["task CLI"]
        STS["status CLI"]
    end

    subgraph Governance
        POL[".safrs/policy.json"]
        APOL[".safrs/automation-policy.json"]
        REG["document-registry.json"]
        SENS["sensitive-paths.json"]
        INV["tool-inventory.json"]
        SCHM[".safrs/schemas/<br/>(7 JSON Schemas)"]
        ADAP["adapter-capabilities.json"]
    end

    GP --> API
    GP --> DB
    GP --> ENV
    GP --> UI
    GP --> TOK
    GP --> TEL
    API --> SCH
    API --> DB
    API --> TEL
    DB --> ENV
    UI --> TOK
    AUTO --> SCHM
    AUTO --> APOL
    AUTO --> SENS
    AUTO --> INV
    GD["Agent adapters<br/>Claude, Cursor, Codex"] --> ADAP
```

## Golden-path data flow

The golden-path application proves the typed Database to API to Web flow:

```mermaid
sequenceDiagram
    participant B as Browser
    participant N as Next.js (Node)
    participant H as Hono API
    participant P as Prisma
    participant PG as PostgreSQL

    B->>N: GET / (server-rendered)
    N->>H: app.request("/api/health")
    H-->>N: { status: "ok" }
    N->>P: database.$queryRaw("SELECT 1")
    P->>PG: SELECT 1
    PG-->>P: 1
    P-->>N: ready
    N-->>B: Readiness desk (server-rendered)

    B->>N: POST /api/demos { name }
    N->>H: Hono handler (mounted via catch-all route)
    H->>H: zValidator(createDemoInputSchema)
    H->>P: database.demo.create({ data: { name } })
    P->>PG: INSERT INTO demos
    PG-->>P: { id, name, createdAt }
    P-->>H: DemoRecord
    H->>H: demoSchema.parse(serialize)
    H-->>N: 201 { id, name, createdAt }
    N-->>B: DemoForm result
```

## CI pipeline

The repository runs 5 GitHub Actions workflows:

```mermaid
graph LR
    PR["Pull Request"] --> CI["ci.yml<br/>lint, typecheck, test, build, e2e"]
    PR --> GOV["safrs-governance.yml<br/>16 Python checkers"]
    PR --> GATES["safrs-pr-gates.yml<br/>8 PR gates (matrix)"]
    PR --> TASK["safrs-task-control.yml<br/>lease authority (dispatch)"]
    PUBLISH["safrs-publish.yml<br/>publication eligibility (dispatch)"]
    GATES --> PUBLISH
```

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| `ci.yml` | pull_request | Full verification: governance, lint, typecheck, test, build, e2e |
| `safrs-governance.yml` | pull_request, push to main | 16 Python governance checkers |
| `safrs-pr-gates.yml` | pull_request, push to main | 8 PR gates as matrix jobs |
| `safrs-task-control.yml` | workflow_dispatch | Serialized remote lease authority |
| `safrs-publish.yml` | workflow_dispatch | Publication eligibility evaluation |
