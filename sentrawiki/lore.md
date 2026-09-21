# Lore — how this repository grew

The SAFRS Monorepo was bootstrapped in August 2026 by Dr. Ferdi Iskandar (Chief) and then expanded from a single golden-path demo into a control plane over sovereign capsules.

This page is historical narrative. It is not architecture truth. ADRs and `MONOREPO_PURPOSE.md` win.

## Eras

### Era 1 — Bootstrap and golden path (2026-08-10)

SAFRS v1.1 skeleton: six-layer control architecture, `policy.json`, R0–R3, agent roles, sensitive paths. Topology decision: `projects / packages / tools / tests / docs`.

[ADR 0001](../../docs/adrs/0001-solo-developer-golden-path.md) chose one Next.js app mounting a package-owned Hono API under `/api`, Zod as the shared contract.

### Era 2 — Agent automation and DX (2026-08-11)

`.agents/` memory files and registry-driven routing. Vendor adapters for Claude, Cursor, Codex. `@sentra/design-tokens` renamed to `@sentra/token`. Email and Stripe capability packs activated. Docs converted to concise English.

### Era 3 — SOTA extras and corpus (2026-08-12)

Telemetry, codegen, deps-graph, OpenAPI endpoint, property tests, supply-chain scan. Corpus-engine PoC for medical PDFs (data still lives gitignored in root `database/`).

### Era 4 — Automation control plane (mid-August)

[ADR 0002](../../docs/adrs/0002-safrs-automation-control-plane.md): canonical JSON contracts, monotonic risk, leases, PR gates, evidence, publisher identity.

### Era 5 — Domain layering and sovereignty (2026-08-22 … 2026-08-23)

[ADR 0005](../../docs/adrs/0005-projects-domain-layering.md): every capsule at `projects/<domain>/<capsule>/`.
[ADR 0006](../../docs/adrs/0006-standalone-project-capsules.md): root is optional; extraction is proof.

Smartboard migrated from `abyss-monorepo` (ADR 0003). SentraBot public-release decision (ADR 0004).

### Era 6 — Capsules that actually run (late August – early September)

- **2026-08-25:** origin `main` rewritten (`5b6b808`); local history is unrelated. Push/fetch requires the filtered publish flow (`.agents/BOUNDARIES.md`).
- **2026-08-26:** Kediri capsule: Payload, GSAP journey, Docker Postgres + MinIO, standalone verify PASS.
- **2026-09-03:** SentraBot excluded from the root pnpm workspace as its own lockfile.
- **2026-09-02:** SentraBot architecture doc frozen against code (`apps/api` is the harness on port 3100).

### Era 7 — Smartboard web completion and Gaffer wiring (September 2026)

- **2026-09-10:** Wiki refreshed to the control-plane + capsule topology (the `sentrawiki/` baseline this page supersedes).
- **2026-09-13 … 09-15:** Academic Smartboard web ported through sub-phase 5 — scheduling, academics, evaluasi, payroll/overtime, ops/master data, then admin + Kayyisa (pengaturan, persetujuan, platform, Kayyisa trajectory panel).
- **2026-09-19 … 09-21:** Gaffer orchestration lands in three phases — Ports Wiring (`tools/automation/src/gaffer/safrs-ports.mjs`), Provider Activation (`provider-codex.mjs` + `pnpm saf gaffer run`), and the accompanying architecture handoff (`docs/architecture/GAFFER_ORCHESTRATION_FRAMEWORK.md`). The current Codex provider callbacks are simulated and its default audit returns `SHIP` without independent review; Phase 4 economic validation is still open.

## Longest-standing controls

- Typed demo flow (ADR 0001) still exists as the **legacy** golden-path.
- Zod contracts for that demo.
- Database reset guard for disposable local Postgres.
- Human-Governed · Agent-Executed · Machine-Enforced.

## Deprecated or withdrawn

- Sentra-GSAP QA gates withdrawn 2026-08-28; motion uses official GSAP skills. Historical FAIL on those gates is not a current gate.
- Root-coupled capsules as a **pattern** — still present as defects, forbidden as templates.

## Related

- [By the numbers](by-the-numbers.md)
- [Decisions](decisions/index.md)
- [Background](background/index.md)
