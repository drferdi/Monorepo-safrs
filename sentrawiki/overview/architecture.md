# Architecture

The SAFRS Monorepo follows a six-layer control architecture defined in `SAFRS_SPEC.md`. Each layer adds enforcement from trust boundaries at the bottom to human authority at the top. The repository topology separates product work, shared capabilities, tooling, and governance.

## Six-layer control architecture

```mermaid
graph TD
    L5["L5 — Human Authority<br/>Defines intent, owns architecture,<br/>approves high-impact actions"]
    L4["L4 — Executable Governance<br/>CI, linters, tests, architecture checks,<br/>secret detection, sensitive-path gates"]
    L3["L3 — Execution Isolation<br/>Worktrees, isolated dependencies,<br/>test databases, containers"]
    L2["L2 — Context and Navigation<br/>AGENTS.md, canonical docs, ADRs,<br/>active plans, project capsules"]
    L1["L1 — Constitution<br/>Objectives, architecture, engineering,<br/>coding, security, product standards"]
    L0["L0 — Trust Boundary<br/>Identity, repository access,<br/>data classification, credentials"]

    L5 --> L4 --> L3 --> L2 --> L1 --> L0
```

- **L0 (Trust Boundary)**: Defines who can access the repository, what data classification applies, and which credentials are allowed. Agents never hold production credentials (SAFRS-01).
- **L1 (Constitution)**: Stable principles in `.agents/knowledge/` covering objectives, architecture, engineering, coding, security, and product decisions.
- **L2 (Context and Navigation)**: `AGENTS.md` routes agents to the right documents. The document registry in `.safrs/document-registry.json` is the machine-readable index.
- **L3 (Execution Isolation)**: Parallel mutation work uses separate worktrees in `../Monorepo.worktrees/<branch>`. Shared mutable state (databases, ports, caches) is isolated per task.
- **L4 (Executable Governance)**: CI workflows, Biome linting, TypeScript checking, SAFRS verify scripts, token enforcement, supply-chain scanning, and architecture tests.
- **L5 (Human Authority)**: The Chief (Dr. Ferdi Iskandar) defines intent, owns architecture, and authorizes R3 actions. Human approval is risk-based, not universal.

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
        SAFRS["safrs checkers"]
        DOC["doctor"]
        WIZ["project-wizard"]
        CAP["capabilities"]
        CG["codegen"]
        DG["deps-graph"]
    end

    subgraph Governance
        POL[".safrs/policy.json"]
        REG["document-registry.json"]
        SENS["sensitive-paths.json"]
        INV["tool-inventory.json"]
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
    GP --> SCH
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

The Hono API is mounted inside Next.js via a catch-all route at `projects/golden-path/apps/web/src/app/api/[[...route]]/route.ts`. The browser never imports Prisma or `DATABASE_URL` directly. The typed Hono RPC client (`hc<AppType>`) provides compile-time drift detection between frontend and backend.

## Package dependency graph

```mermaid
graph TD
    token["@sentra/token"]
    config["@safrs/config"]
    schemas["@safrs/schemas"]
    env["@safrs/env"]
    database["@safrs/database"]
    api["@safrs/api"]
    telemetry["@safrs/telemetry"]
    ui["@safrs/ui"]
    web["@safrs/web (golden-path)"]

    web --> api
    web --> database
    web --> env
    web --> ui
    web --> token
    web --> telemetry
    api --> schemas
    api --> database
    api --> telemetry
    database --> env
    database --> telemetry
    ui --> token
    env --> config
    schemas --> config
    api --> config
    database --> config
    telemetry --> config
    ui --> config
```

All packages depend on `@safrs/config` for shared tsconfig presets. `@safrs/schemas` owns the Zod contracts that both the API and the web app consume. `@sentra/token` is the only package allowed to contain raw colour values.
