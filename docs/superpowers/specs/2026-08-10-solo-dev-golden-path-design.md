# SAFRS Solo-Developer Golden Path Design

Status: APPROVED DESIGN
Date: 2026-08-10
Owner and final authority: Dr. Ferdi (Chief)
Repository: `D:\DEV\Monorepo`
Risk classification: R2 because this design adds dependencies, shared packages, CI, and repository-wide architecture boundaries.

## 1. Goal

Build a SAFRS v1.1 agent-first monorepo that lets a solo developer with little coding knowledge create, run, inspect, repair, test, and extend modern applications through a small set of safe commands and AI-readable contracts.

The default application stack is:

- Next.js App Router
- Hono RPC
- Zod
- PostgreSQL
- Prisma
- TypeScript strict mode
- pnpm workspaces and Turborepo

Python is allowed only when a technical requirement cannot be served responsibly by the TypeScript golden path. Electron, WXT, Stripe, email, and AI are optional capability packs. Renovate creates pull requests but does not auto-merge during the initial adoption phase.

## 2. User model

The primary user is a solo product owner who can describe intent and inspect outcomes but should not need to understand package graphs, container orchestration, database migrations, environment loading, or build tooling.

The repository must therefore:

1. Prefer one obvious path over many equivalent choices.
2. Turn multi-step technical operations into one memorable command.
3. Detect missing prerequisites before starting work.
4. Report failures in plain Indonesian with a short recovery action.
5. Prevent destructive operations against production-like targets.
6. Give AI agents precise, local, machine-verifiable context.
7. Keep advanced capabilities absent until a real project needs them.

## 3. Considered approaches

### 3.1 Full kitchen-sink template

Every project contains web, API, database, email, payments, AI, desktop, browser extension, and Python support.

Rejected because unused services increase installation time, secrets, attack surface, dependency updates, and cognitive load.

### 3.2 Golden path with optional capability packs

Every project starts with one stable TypeScript architecture. A repository wizard adds optional capabilities only when selected.

Selected because it provides a predictable default while preserving a controlled path for special requirements.

### 3.3 Independent templates per technology

Users choose between separate Next.js, Vite, Python, Electron, extension, and AI templates.

Rejected as the primary model because it forces the user to make architecture decisions before understanding their consequences. Specialized templates may exist only behind an explicit capability decision.

## 4. Architecture

### 4.1 Default deployment unit

The default project has one deployable Next.js application. Hono is mounted under the Next.js application as a catch-all API route. The Hono application and its exported `AppType` live in a shared package, so the API can later be hosted separately without rewriting its contract.

This choice avoids requiring Chief to operate two deployments while retaining an explicit API boundary.

### 4.2 Default topology

```text
projects/
└── golden-path/
    ├── AGENTS.md           SAFRS product boundary
    ├── docs/               Product architecture, data, and testing context
    └── apps/
        └── web/            Next.js application and Hono route adapter

packages/
├── api/                    Hono routes, typed client, and API errors
├── database/               Prisma schema, client, migrations, and seed
├── schemas/                Shared Zod contracts
├── env/                    Server/client environment validation
├── ui/                     Shared presentation components
└── config/                 Shared TypeScript and repository configuration

tools/
├── doctor/                 Prerequisite and health diagnostics
├── project-wizard/         Project creation workflow
└── capabilities/           Optional capability installers and manifests
```

`projects/` remains the SAFRS ownership and context boundary and contains each project's deployable applications. `packages/` contains product-neutral shared runtime capabilities. `tools/` contains repository-wide operator tooling. This preserves the canonical SAFRS topology without changing the simple root commands used by Chief.

### 4.3 Dependency direction

```text
projects/internal/golden-path/apps/web
  -> packages/api
  -> packages/database
  -> packages/env
  -> packages/schemas
  -> packages/ui

packages/api
  -> packages/database
  -> packages/schemas
  -> packages/env

packages/database
  -> packages/env

packages/ui
  -> packages/schemas only when a UI contract requires it
```

Shared packages must never import from `projects/` or from another project's private directory. Turborepo boundaries and tests enforce this rule.

## 5. Next.js golden path

The web application uses the latest supported Active LTS line rather than preview or canary releases. At design time, the selected line is Next.js 16.2.11. Dependency versions are locked, reviewed through Renovate pull requests, and changed only after verification.

### 5.1 Enabled foundations

- App Router with file-system routing.
- Turbopack for development and production builds because it is the Next.js default.
- React Server Components as the default component type.
- Client Components only for state, event handlers, browser APIs, or interactive libraries.
- Server Functions for internal form mutations where they reduce client code.
- Hono RPC for typed client/API communication and integration endpoints.
- Typed routes to catch invalid links during type checking.
- React Compiler when supported by the selected stable release and verified dependency set.
- `next/image`, `next/font`, metadata, and Open Graph conventions.
- Route-level `loading.tsx`, `error.tsx`, `not-found.tsx`, and root `global-error.tsx` patterns.
- Node.js runtime by default; Edge runtime requires a documented technical need.
- Development diagnostics exposed to AI agents by supported Next.js development tooling.

### 5.2 Rendering and caching

Cache Components is enabled only with repository-provided examples and tests. It provides the supported Partial Prerendering model: a fast static shell with cached or streamed dynamic content.

Rules:

- Static content remains static automatically.
- Dynamic content is wrapped in an intentional Suspense boundary.
- Reusable cached reads use `use cache` with an explicit cache lifetime and tag.
- Mutations invalidate named tags or paths.
- Personalized or authorization-sensitive data is not placed in a shared cache.
- The repository supplies safe examples; agents may not add caching merely for perceived speed.

### 5.3 Data access

- Server Components call typed domain services directly for internal reads, avoiding an unnecessary HTTP round trip.
- Client Components use the generated Hono RPC client when client-side requests are required.
- Server Functions call the same Zod schemas and domain services used by Hono handlers.
- Webhooks and externally callable endpoints enter through Hono.
- Database access is server-only and is never imported by Client Components.

This preserves one business rule implementation while supporting both efficient server rendering and end-to-end client/API typing.

## 6. End-to-end type safety

Zod schemas are the canonical runtime contracts for request input, form input, configuration values, and boundary responses where validation is required.

Hono routes use `@hono/zod-validator`. The API package exports a precomputed typed client so editor performance does not degrade as routes grow. All relevant TypeScript configurations use `strict: true`.

Type safety is verified by deliberate contract tests:

- valid input succeeds;
- invalid input produces the standard error envelope;
- API response status codes remain typed;
- the web package type-checks against the exported client;
- no application duplicates handwritten API response interfaces.

Swagger and Postman collections are not required for internal development. If an external consumer later requires an OpenAPI contract, it becomes a separate approved capability derived from the same Zod contracts.

## 7. Environment safety

`@t3-oss/env-nextjs` validates the Next.js environment. `@t3-oss/env-core` validates non-Next packages and tooling.

Environment variables are divided into:

- server-only secrets;
- explicitly public `NEXT_PUBLIC_*` values;
- build-time configuration;
- optional capability configuration;
- test-only configuration.

Rules:

1. `.env.example` contains names and safe descriptions, never real secrets.
2. A missing required variable fails `pnpm doctor`, development startup, and CI with a readable explanation.
3. Optional capability variables are required only when that capability is enabled.
4. Client bundles cannot import server variables.
5. CI uses dummy non-secret test values or secret-provider values; production secrets are never stored in Git.
6. Error output identifies the missing variable but never prints secret values.

## 8. Database experience

PostgreSQL is the default database. Prisma is the default ORM and migration tool. Prisma's generated client uses an explicit output directory and the modern TypeScript generator.

Required commands:

- `pnpm db:start` starts the local PostgreSQL service.
- `pnpm db:stop` stops the local service without deleting data.
- `pnpm db:studio` opens Prisma Studio.
- `pnpm db:generate` regenerates the client.
- `pnpm db:migrate` creates or applies a local development migration through a guided workflow.
- `pnpm db:seed` loads deterministic realistic demonstration data.
- `pnpm db:reset` resets only a positively identified local/test database.

`db:reset` must fail closed unless all local-safety checks pass. It may not operate on an unknown host, production-like database name, SSL production endpoint, or a URL not explicitly declared disposable. Migration changes remain SAFRS R2.

## 9. Code hygiene

Biome is the primary formatter and linter for JavaScript, TypeScript, JSON, and supported repository files. Husky installs Git hooks. `lint-staged` is not added because Biome can process staged files directly.

The pre-commit hook runs a fast staged-file write pass and then re-stages the safe changes. It does not run the entire build. Full checks run before push and in CI.

Commands:

- `pnpm format` formats supported files.
- `pnpm lint` reports lint violations.
- `pnpm fix` applies safe formatting and lint fixes.
- `pnpm typecheck` checks the complete TypeScript graph.
- `pnpm check` runs the standard local quality gate.

Python capability packs use Ruff, mypy where justified, and pytest without changing the TypeScript default.

## 10. Single-command operation

### 10.1 Human-facing commands

- `pnpm setup`: first-run installation and local preparation.
- `pnpm project:new`: guided creation of a new SAFRS project capsule and app binding.
- `pnpm capability:add`: guided installation of an optional capability.
- `pnpm dev`: preflight checks, local database, code generation, and all default development servers.
- `pnpm doctor`: read-only diagnosis with plain-language recovery instructions.
- `pnpm fix`: safe automatic repairs.
- `pnpm check`: complete local validation.

Every command prints:

1. what it is checking;
2. whether the check passed;
3. what Chief should do next if it failed;
4. where an agent can find detailed evidence.

### 10.2 Turborepo behavior

Turborepo owns the task graph, caching, dependency ordering, persistent development processes, and affected-package CI runs.

- Build tasks depend on dependency builds.
- Development tasks are persistent and uncached.
- Database mutation tasks are uncached.
- Environment variables that affect output are declared in task configuration.
- CI may use affected-package execution only when repository-level governance and shared-config changes still trigger all necessary consumers.
- Remote caching remains optional and must not become a prerequisite for local work.

## 11. Human-readable diagnostics

Expected diagnostic format:

```text
[DATABASE] BELUM SIAP
Docker Desktop terpasang tetapi belum berjalan.

Yang perlu Chief lakukan:
1. Buka Docker Desktop.
2. Tunggu sampai status Engine Running.
3. Jalankan kembali: pnpm dev

Detail teknis untuk agent: <concise machine-readable reason>
```

The first screen must not be an unfiltered stack trace. Detailed logs remain available for an AI agent or technical reviewer.

The current machine baseline is Node.js 24.18.0, pnpm 11.21.0, Git 2.55.0, and Docker CLI 29.6.2. Docker Desktop was installed but its Linux engine was not running during design verification. `pnpm doctor` must detect this exact class of condition.

## 12. Optional capability packs

Each capability pack contains a manifest declaring packages, files, environment variables, ports, commands, tests, sensitive paths, removal limitations, and SAFRS risk.

### 12.1 Email

Adds React Email preview, Resend integration, local-safe recipient restrictions, templates, and `pnpm dev:email`. Development must not send to arbitrary real recipients by default.

### 12.2 Stripe

Adds Stripe SDK integration, webhook signature verification, idempotency handling, sandbox-only defaults, and `pnpm stripe:listen`. Real charges, production keys, and production webhook changes are R3.

### 12.3 AI

Adds an approved AI SDK adapter, server-only provider keys, structured output validation, usage limits, timeout/retry bounds, prompt-injection boundaries, and deterministic test doubles. It does not select a vendor or model until a project requirement does.

### 12.4 Electron

Adds a desktop shell around an explicitly selected application, IPC schemas, packaging tasks, and desktop-specific tests. It is not included in normal web projects.

### 12.5 WXT

Adds a browser-extension application, manifest permissions, content/background boundaries, and extension tests. Permission expansion is R2.

### 12.6 Python

Adds a Python service only when a written technical decision shows why the TypeScript path is insufficient, such as a Python-only scientific or machine-learning dependency. The service exposes a validated boundary and does not share application internals with TypeScript packages.

## 13. Project wizard

`pnpm project:new` asks questions in product language:

1. What is the project called?
2. What problem does it solve?
3. Is it a web application, desktop application, or browser extension?
4. Does it need login, email, payments, AI, file storage, or another external service?
5. Does it handle healthcare, financial, government, or other sensitive data?

The wizard then shows a preview of exact changes and risk classification before writing. It creates or updates:

- the SAFRS project capsule;
- app/package bindings;
- environment example entries;
- optional capability manifests;
- test commands;
- sensitive-path declarations when required.

It never deploys, purchases, sends, charges, or enables production credentials.

## 14. AI-agent readiness

The repository keeps root `AGENTS.md` as the router and creates a narrow `AGENTS.md` in every app, package, tool, and project capsule where local instructions are necessary.

Adapters include:

- `.cursor/rules/*.mdc` rather than deprecated `.cursorrules`;
- `.github/copilot-instructions.md`;
- `GEMINI.md`;
- reusable Codex implementation prompts;
- machine-readable `.safrs` policy and tool inventory.

Agent instructions include exact commands, ownership boundaries, dependency direction, verification, prohibited actions, and escalation rules. Generated adapters point to canonical sources rather than copying the whole policy.

Next.js development diagnostics are exposed to capable agents so they can inspect current routes, errors, logs, and runtime metadata without asking Chief to translate technical output.

## 15. Renovate

Renovate is configured for pull-request-only operation.

- No automatic merge.
- Dependency Dashboard enabled.
- Related packages grouped where safe.
- Patch and minor updates may be grouped separately from majors.
- Major updates always remain explicit.
- Runtime, framework, database, security, GitHub Action, and governance dependencies receive clear labels.
- GitHub Actions remain pinned according to SAFRS supply-chain controls.
- Lockfile maintenance runs on a predictable schedule.
- A Renovate PR must pass governance, lint, type checking, tests, build, and security checks before human review.

Package manifests and lockfiles remain R2 under the current SAFRS sensitive-path policy, so green CI is evidence, not authorization to merge.

## 16. Testing strategy

### 16.1 Fast local tests

Vitest covers schemas, services, API handlers, environment validation, safety guards, wizard logic, and capability manifests.

### 16.2 Integration tests

Integration tests use an isolated PostgreSQL test database and verify Prisma queries, migrations, seeds, Hono handlers, and transaction behavior.

### 16.3 Browser tests

Playwright verifies the golden user journey, error/loading states, typed API behavior visible through the UI, and critical accessibility behavior.

### 16.4 Architecture and governance tests

Tests verify:

- package dependency direction;
- server-only modules cannot enter client bundles;
- required project capsule files and commands exist;
- capability manifests are complete;
- destructive database guards fail closed;
- sensitive changes receive the correct SAFRS tier;
- CI actions are immutably pinned;
- document and agent routing remain valid.

## 17. CI design

Pull requests run these gates in dependency-aware order:

1. SAFRS governance verification.
2. Dependency and lockfile integrity.
3. Biome CI check.
4. TypeScript type checking.
5. Unit tests.
6. Database integration tests.
7. Next.js production build with validated test environment.
8. Playwright smoke tests.
9. Secret and dependency security checks where configured.

CI stores concise evidence artifacts. It must not expose secret values. No workflow deploys production during the initial implementation.

## 18. Error handling and observability

API responses use one typed error envelope with a stable code, human message, correlation identifier, and optional field errors. Internal stack traces are logged but not returned to users.

The web app contains route-level recovery UI. Expected validation errors do not become generic 500 errors. Unexpected failures retain enough structured evidence for an agent to diagnose them.

Observability begins with structured server logs and correlation identifiers. External monitoring is an optional later integration, not a default paid dependency.

## 19. Security and SAFRS controls

- All external input is untrusted and validated at its boundary.
- Secrets stay server-side and are never printed.
- Authentication and authorization are not invented in the generic foundation; they become an explicitly designed project capability.
- Database reset and seed commands are local/test only.
- External side effects use sandbox or test mode by default.
- Dependencies, shared packages, CI, migrations, auth, and capability installation are R2.
- Production infrastructure, production data, real financial actions, production secrets, and healthcare-critical behavior are R3 and prepare-only without explicit human authorization.
- Existing SAFRS policy, permission matrices, multi-agent protocol, document lifecycle, tool inventory, resource bounds, and verification scripts remain authoritative.

## 20. Version policy

The repository records exact resolved versions in `pnpm-lock.yaml` and declares supported platform ranges. Selection rules are:

1. Prefer Active LTS runtimes and framework lines.
2. Never use canary, beta, RC, or preview versions by default.
3. Check the package registry and official release documentation during implementation.
4. Run compatibility tests before locking versions.
5. Let Renovate propose later updates through PRs.

At design time the available candidates included Node.js 24.18.0 LTS, Next.js 16.2.11 Active LTS, React 19.2.8, Hono 4.13.1, Zod 4.4.3, Prisma 7.9.1, Turborepo 2.10.9, Biome 2.5.7, Vitest 4.1.10, Playwright 1.62.1, Tailwind CSS 4.3.3, and TypeScript 7.0.2. These are candidates, not proof of mutual compatibility; the implementation plan requires an install/build/test compatibility gate before finalizing the lockfile.

## 21. Non-goals

The initial implementation does not:

- add a speculative product feature;
- add authentication without a project requirement;
- enable paid external services;
- configure production deployment;
- migrate applications from the old repository;
- enable automatic dependency merging;
- install every optional capability;
- introduce Python merely as an alternative preference;
- create microfrontends or independent services without a measured need.

## 22. Acceptance criteria

The implementation is complete only when:

1. A clean local checkout can be prepared through one documented setup command.
2. `pnpm doctor` accurately detects missing Node, pnpm, Git, Docker engine, environment, database, and generated-client prerequisites with human-readable recovery steps.
3. `pnpm dev` starts the default web application and local PostgreSQL flow without requiring multiple manually coordinated terminals.
4. A demonstrated Hono route validated by Zod is consumed through an inferred client type.
5. Deliberately changing the API contract causes the expected frontend type-check failure.
6. Missing required environment variables cause explicit local and CI failure without leaking values.
7. Biome, Husky, database studio/seed/reset, and all promised root commands work.
8. Database reset refuses an unsafe target.
9. The project wizard creates a valid SAFRS capsule from a temporary test input.
10. Optional capability architecture and manifests exist, but unselected runtime dependencies are not installed.
11. Renovate is PR-only and CI contains no production deployment.
12. Unit, integration, browser smoke, architecture, governance, type-check, lint, and production-build checks pass.
13. The complete file diff is reviewed, exact verification evidence is recorded, and no SAFRS v1.1 capability is dropped or weakened.

## 23. Implementation ordering

The implementation plan must split work into reviewable phases:

1. Foundation and version compatibility.
2. Workspace topology and shared configuration.
3. Web/API/schema/env golden path.
4. PostgreSQL/Prisma local experience and safety guards.
5. Human-facing doctor, setup, and project wizard.
6. Hygiene, tests, and single-command orchestration.
7. Optional capability framework without speculative integrations.
8. Renovate and CI.
9. SAFRS integration, documentation lifecycle, and complete verification.

Each phase must state exact files, tests, verification commands, risk tier, rollback boundary, and evidence output.
