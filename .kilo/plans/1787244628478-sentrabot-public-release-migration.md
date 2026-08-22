# Sentra Bot Public Release Migration

## Goal

Migrate every implemented capability tracked at `D:/DEV/Sentraverse/sentrabot` commit
`d17a138` into the official `projects/product/sentrabot/` capsule, conform it to the existing
Sentra Monorepo architecture and SAFRS controls, and release public source plus a
self-hosted beta. The Monorepo remains canonical; Sentra Bot adapts to it.

Execution agent: the configured `code` agent using GPT-5.6 Luna.

## Locked Decisions

- Do not change Monorepo principles, topology, workspace conventions, Turbo semantics,
  governance controls, or token system to preserve the source repository's shape.
- Keep `pnpm-workspace.yaml` patterns unchanged. Do not add project-local workspace
  packages or a second package manager/configuration stack.
- Import tracked Git `HEAD` only. Never read or copy source `.env`, credentials,
  `data/`, backups, caches, dependency directories, lockfile, or build output.
- Rename the product and all live identifiers to `Sentra Bot` / `sentrabot`. Retain
  Rakazo attribution only where Apache-2.0 provenance requires it.
- Preserve all implemented capabilities, not unsupported README claims. Source mentions
  `apps/mobile` and `apps/www`, but neither exists at the pinned commit; do not invent them.
- Public release train:
  1. public source + self-hosted beta;
  2. signed desktop beta after backend contract stability;
  3. Sentra-hosted service only after a separately authorized R3 production gate.
- Self-host signup defaults to closed. A future Sentra-hosted deployment may enable open
  signup only after email verification, abuse controls, quotas, and monitoring pass.
- Public beta uses per-user BYOK/OAuth. No Sentra-sponsored model or sandbox credits.
- “Healthy” means every acceptance gate below is evidenced; it is not a claim of zero bugs.

## Target Placement

```text
projects/product/sentrabot/
  AGENTS.md
  README.md
  LICENSE
  NOTICE
  capabilities.json
  apps/
    web/                 # Next.js App Router, Node runtime, /api Hono adapter
    worker/              # jobs, agent runtime, adapters, memory, private control API
    sandbox-supervisor/  # authenticated Docker supervisor service
    desktop/             # Electron thin client
  docs/
    architecture.md
    data.md
    testing.md
    security.md
    self-host.md
    release.md
    provenance.md
  emails/                # verification/reset templates
  infra/
    compose/
    sandboxes/
    systemd/
  scripts/               # project-scoped backup/restore and release helpers
  src/README.md          # boundary map; runtime code is owned by apps/shared boundaries
  tests/                 # cross-app integration, topology, parity, and E2E support
```

Do not create `projects/product/sentrabot/package.json`, `projects/product/sentrabot/packages/*`, or new
root packages merely to mirror `@rakazo/*`.

### Source Boundary Mapping

| Source | Canonical target |
| --- | --- |
| `packages/contracts` + pure domain validation | `packages/schemas/src/sentrabot/**` |
| `apps/api` + `packages/auth` | `packages/api/src/sentrabot/**`, composed by `apps/web` |
| `packages/db` schema/repositories/scoping/events | `packages/database/**/sentrabot` and the canonical Prisma schema |
| server environment validation | `packages/env/src/sentrabot-*` |
| `adapter-kit`, `adapters`, `memory`, worker-only core | `projects/product/sentrabot/apps/worker/src/**` |
| synchronous computer control | private authenticated worker API; public API calls its typed client |
| `apps/web`, `chat-ui`, `ui-web` | `projects/product/sentrabot/apps/web/**` |
| `ui-tokens` | removed; consume existing `@sentra/token` only |
| `infra/sandboxes/supervisor` | `projects/product/sentrabot/apps/sandbox-supervisor/**` |
| `apps/desktop` | `projects/product/sentrabot/apps/desktop/**` |
| `testkit` and source tests | colocated app tests plus `projects/product/sentrabot/tests/**` |
| source root/CI/build config | re-expressed through existing root catalogs/scripts/workflows; never copied |

Shared-boundary edits are allowed only in the already-canonical `@safrs/schemas`,
`@safrs/api`, `@safrs/database`, and `@safrs/env` packages. Keep Sentra Bot exports under
explicit `sentrabot` namespaces/entry points and preserve existing Golden Path behavior.
Product UI and agent runtime stay in the capsule. Do not add Sentra Bot components to
`@safrs/ui` unless a real second consumer is proven in a separate task.

## Execution Plan

### 1. Establish Governance and Immutable Intake

- Create an isolated sibling worktree and split execution into reviewable SAFRS tasks.
  Treat dependency/shared-package/CI/database work as R2; auth, internet-facing signup,
  credential handling, sandbox privileges, production configuration, and hosted execution
  as R3. Never self-approve either class.
- Record an accepted architecture ADR covering the mapping above, the release train, the
  private worker control plane, BYOK, signup defaults, and the absence of legacy runtime data.
- Generate a machine-readable source inventory from `git ls-tree -r HEAD` at `d17a138`.
  For every tracked path record one disposition: `ported`, `reimplemented`,
  `provenance-only`, or `excluded-with-proof`. This ledger is the completeness gate.
- Run the source's safe unit/integration/emulator suite from an isolated temporary archive
  when feasible, with no real provider keys or Docker socket. Record failures as baseline,
  not as accepted target behavior.
- Copy the Apache-2.0 license into the capsule and create a NOTICE identifying the pinned
  source and modifications. Do not erase the Rakazo copyright notice.

### 2. Activate the Official Capsule

- Instantiate the exact project-template contract: `AGENTS.md`, `README.md`, required
  `docs/*`, `src/`, and `tests/`; set Chief as accountable owner.
- Add only workspace-recognized app manifests under `apps/*`, named
  `@sentra/sentrabot-web`, `-worker`, `-sandbox-supervisor`, and `-desktop`.
- Use Node 24, pnpm 11, root catalogs, root Biome, root TypeScript config, existing Turbo
  task names (`build`, `lint`, `typecheck`, `test`, `dev`), and existing root commands.
- Register `ai`, `email`, and `electron` in `capabilities.json` through the existing
  capability workflow with technical justifications. Do not create parallel capability
  machinery.
- Update canonical product identity/registry documentation only after the capsule exists;
  keep all docs concise English.

### 3. Normalize Dependencies and Identity

- Inventory every direct/transitive source dependency. Adopt only current stable versions
  compatible with the Monorepo; use root catalogs and regenerate the single root lockfile.
- Remove source-only tooling and architecture dependencies, especially Vite/Turborepo
  duplication, local Biome/TypeScript config, source lockfile, and oRPC transport.
- Replace oRPC with the existing typed Hono + Zod client pattern. Preserve endpoint behavior,
  validation, error semantics, streaming, and correlation IDs.
- Rename package references, environment prefixes, database defaults, container labels,
  image names, paths, logs, app copy, domains, systemd units, and headers from Rakazo to
  Sentra Bot. Add a gate that rejects live `@rakazo`, `RAKAZO`, and `rakazo` references,
  excluding only LICENSE/NOTICE/provenance records.
- Audit icons/screenshots. Keep only authentic Sentra Bot assets; regenerate public release
  screenshots from the migrated product rather than publishing stale source screenshots.

### 4. Port the Canonical Data Boundary

- Extend the existing Prisma schema without removing or changing Golden Path models.
  Preserve all source entities, relations, constraints, indexes, timestamps, execution
  leases, reconciliation cursors, and Better Auth records; map SQL tables to explicit
  `sentrabot_*` names where adapter compatibility permits.
- Create new append-only migrations through the repository Prisma wrapper. Do not copy the
  source migration directory into the executable migration chain. Document a source-to-
  target migration map in provenance evidence.
- Move repositories, event persistence, message sequencing, model credentials, computer
  records, and tenant scoping under `@safrs/database/sentrabot`.
- Enforce every user-owned query by both `workspaceId` and `userId`; retain not-found
  responses for unauthorized cross-tenant access. Add property/integration tests for all
  resources, raw SQL search, deletion cascades, and concurrent sequence/lease behavior.
- Add deterministic synthetic seed fixtures only. No source runtime data is migrated.
- Validate clean create, upgrade from the current Monorepo schema, rollback strategy, local
  reset guard, backup, and restore against isolated PostgreSQL.

### 5. Port Contracts, API, Authentication, and Public-Signup Controls

- Export all domain/event/attachment/search/public and private-runtime Zod contracts from
  `@safrs/schemas/sentrabot`; retain source limits and add quota schemas.
- Implement the Sentra Bot Hono route tree under `@safrs/api/sentrabot`, mounted by the
  Next app at same-origin `/api`. Keep database and secrets server-only.
- Preserve bot/thread/routine/memory/capability/connection/artifact/usage/export/search,
  SSE/realtime, computer, deployment settings, and account-delete behavior.
- Configure current stable Better Auth with personal workspaces, no team invitation or
  member mutation, exact trusted origins, secure production cookies, CSRF/origin checks,
  password limits, reset flow, and session revocation.
- Require verified email before login for open signup. Use the existing email capability
  pattern for verification/reset delivery, preserve anti-enumeration responses, and block
  non-local development recipients.
- Replace the loose signup boolean with explicit modes: `closed`, `allowlist`, `open`.
  Default self-host to `closed`; allow hosted `open` only behind deployment configuration.
- Add IP/account velocity limits, resend cooldown, bot/resource creation limits, artifact
  limits, routine frequency limits, concurrency caps, and a deployment kill switch. Return
  recoverable typed errors without exposing internal details.
- Keep first-user deployment-owner semantics but make initialization transactional and safe
  under concurrent first signups.

### 6. Port the Worker and Agent Runtime

- Move adapter contracts, provider implementations/emulators, Pi runtime, scripted runtime,
  memory, artifacts/home stores, background handlers, Graphile jobs, realtime fanout,
  routine scheduling, reconciliation leadership, child bots, and secret redaction into the
  worker app without changing externally observed behavior.
- Add a private Hono control API for synchronous computer operations. Authenticate it with a
  dedicated secret, validate every request with Zod, bind actor/workspace identity, expose
  no provider credential, listen on loopback/internal networks by default, and support
  graceful shutdown/readiness.
- Keep Docker, E2B, Daytona, Box, desktop, fake, and emulator providers. Real-provider tests
  remain opt-in canaries; fake/emulator conformance is release-blocking.
- Use BYOK/OAuth credentials scoped per user/workspace. Hosted mode must reject deployment-
  level model credentials. Self-host may enable one explicitly, with clear operator scope.
- Replace the unversioned credential ciphertext with an authenticated, versioned envelope
  that supports key rotation; never log plaintext, tokens, or decrypted provider errors.
- Enforce queue idempotency, fencing tokens, timeouts, retries, cancellation, reconciliation,
  per-user concurrency, bounded output, and cleanup after failure or account deletion.

### 7. Rebuild the Web Surface on the Golden Path

- Rebuild the Vite SPA as a Next.js App Router Node application. Use server-first loading
  and minimal client islands where practical; preserve auth, onboarding, bot CRUD,
  conversations, streaming, approval/resume, routines, model settings, plugins/connections,
  memory, artifacts, search, computer view/control, usage, export, and deletion flows.
- Consume the typed Hono client only. Browser code must not import database, server env,
  worker, or secret modules.
- Remove `@rakazo/ui-tokens` and every raw colour/radius literal. Consume existing semantic
  `@sentra/token` tokens and existing `@safrs/ui` primitives without changing token values.
  Add migrated app source to `packages/token/scope.txt` only when the entire path passes.
- Follow the nearest Sentra reference composition, preserve an authentic product view, and
  support desktop/mobile layouts, keyboard operation, reduced motion, loading/empty/error
  recovery, focus management, and WCAG 2.2 AA.
- Split the source's oversized shell into coherent feature boundaries without changing user
  flows. Do not fabricate mobile or marketing apps.

### 8. Harden Sandbox and Self-Host Topology

- Port the supervisor as an app, rename all labels/paths/images, retain request identity,
  path normalization, command bounds, screen leases, and conformance tests.
- Never expose the Docker socket or supervisor publicly. Use an internal network, dedicated
  bearer secret, dropped capabilities/read-only filesystems where feasible, resource/PID
  limits, non-root users, bounded mounts, no-new-privileges, and explicit egress policy.
- Port computer and desktop sandbox images under capsule `infra/`; pin base images by digest
  for release and scan package/image contents.
- Rebuild Compose from the root context and root lockfile. Provide health/readiness checks,
  ordered migrations, web/worker/supervisor isolation, persistent volumes, graceful stop,
  and closed-signup defaults.
- Port backup/restore/hardening/systemd behavior with Sentra Bot names. Test a full backup,
  destructive local reset, restore, and smoke journey in an isolated environment.
- Preserve managed-provider topology for future hosted use. Do not execute or claim a
  production deployment in this migration.

### 9. Port and Harden the Electron Client

- Keep Electron as a thin client to a configured Sentra Bot origin; do not bundle a parallel
  backend or database.
- Preserve context isolation, sandboxing, preload allowlist, validated IPC, navigation and
  popup denial, external-link allowlisting, CSP, renderer asset integrity, and local dev flow.
- Rename and audit desktop assets/package metadata. Add Windows/macOS/Linux build smoke tests
  only for platforms actually supported by evidence.
- Produce unsigned local artifacts during migration. Public desktop release remains blocked
  until signing, notarization, update-channel integrity, rollback, and clean-machine tests
  pass in the separate desktop release gate.

### 10. Recreate the Verification Matrix

- Map every source test into a target unit, contract, integration, E2E, topology, security,
  or opt-in provider-canary test. A removed test needs a written superseding test and reason.
- Required release-blocking suites:
  - schema/API type drift and error envelope;
  - tenant isolation and authorization for every resource;
  - signup verification/reset/rate-limit/concurrency races;
  - credential encryption/rotation/redaction and secret scanning;
  - job idempotency/reconciliation/routine execution;
  - adapter and sandbox conformance, timeout, traversal, lease, cleanup, and fault injection;
  - web journeys for every user-visible capability;
  - WCAG/keyboard/responsive/token checks;
  - Electron preload/IPC/navigation/package smoke;
  - Compose health, migrations, backup/restore, and full fake-provider journey;
  - performance budgets for bootstrap, message history, streaming, and desktop startup.
- Use deterministic fakes by default. No release gate may require production credentials or
  transmit source/user data to a third party.
- Run focused suites, all affected package/app commands, `pnpm check`, `pnpm governance`,
  dependency/security scans, image scans, and `bash scripts/safrs-verify.sh`.

### 11. Prepare Public Source and Self-Hosted Beta

- Write concise operator docs for prerequisites, secure setup, closed/open signup modes,
  BYOK, provider selection, migrations, backup/restore, upgrades, rollback, quotas, logs,
  data retention/deletion, vulnerability reporting, and known limitations.
- Add only repository-native, SHA-pinned release workflows after designated R2 review:
  reproducible container builds, immutable tags, SBOM, provenance/attestation, vulnerability
  scan, and release artifacts. Do not copy source workflows or add SSH deployment.
- Define SemVer, compatibility policy, supported host architectures, database migration
  policy, image retention, and release rollback. Claim support only for tested platforms.
- Generate final screenshots from release bits and ensure README claims exactly match the
  parity ledger and tested topology.
- Tag public self-hosted beta only after designated security review and Chief authorization.
  Archive the old source repository read-only after parity evidence is accepted; do not
  delete it or migrate ignored local state.

### 12. Keep Hosted Production as a Separate R3 Gate

- Before operating public signup, require email deliverability, bot protection/challenge,
  rate limits, quotas, abuse reporting, moderation/disable controls, privacy/terms, retention,
  observability, alerting, incident response, disaster recovery, capacity tests, managed
  sandbox isolation, spend caps, and emergency kill switches.
- Prepare production IaC and runbooks as evidence only. Do not deploy, alter DNS, create
  credentials, migrate production data, or enable public signup without explicit R3 human
  authorization for that exact action.

## Mandatory Review Slices

- R2 designated review: architecture ADR, root dependency/lockfile changes, every shared
  package change, Prisma migration, release workflow, container topology, and token-scope
  enrollment.
- Independent security review: auth/session/signup, tenant scoping, credential encryption,
  internal worker API, Docker supervisor, screen proxy, OAuth/provider callbacks, Electron
  IPC, and release supply chain.
- Elevated review whenever implementation and its governing test/control change together.
- Advance each task through `VERIFYING` and `REVIEW`; update `.agents/HANDOFF.md`; close only
  after required evidence and authorization.

## Acceptance Gates

- Source inventory has exactly one justified disposition for every path at `d17a138`; every
  implemented capability has target code and a passing parity test.
- The capsule passes topology checks and matches existing project placement. No
  `projects/product/sentrabot/packages`, nested lockfile/workspace/Turbo/Biome stack, or new root
  package exists.
- Existing Golden Path, Control Center, Academic Smartboard, shared package behavior, root
  commands, workspace patterns, Turbo semantics, SAFRS checks, and token values remain green.
- No live Rakazo identifier remains outside legal/provenance records; all public branding is
  authentic Sentra Bot branding.
- No raw UI colour/radius appears outside `packages/token/src/tokens.css`; WCAG 2.2 AA and
  keyboard/responsive tests pass.
- All database migrations apply to a clean database and the current Monorepo database;
  tenant-isolation, backup, and restore tests pass with synthetic data.
- Self-host defaults are closed signup, internal-only supervisor/worker control, BYOK/OAuth,
  non-production secrets, and bounded resources.
- Unit, contract, integration, E2E, security, accessibility, desktop, Compose, performance,
  dependency, image, governance, and SAFRS gates pass with evidence.
- Release artifacts include license/NOTICE, SBOM, provenance, immutable image digests,
  upgrade/rollback documentation, and no secret or ignored source data.
- No hosted production action or signed desktop publication occurs under this migration
  without its later explicit gate and authorization.
