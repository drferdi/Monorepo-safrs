# DECISIONS — Durable Choices

Append-only, newest first. Each entry: date, decision, brief rationale, evidence/status.
Major architectural decisions also get an ADR in `docs/adrs/`.
Never delete entries — reversals are new entries ("supersedes ...").

---

## 2026-08-13 - SAFRS automation control plane: phases 1-5 merged; agent merged under explicit authorization

Phases 1-5 of `docs/plans/active/SAFRS_FULL_AUTOMATION_IMPLEMENTATION_PLAN.md`
are on `main` (PRs #12, #14, #15, #17, #18 plus repairs #13, #19, #20):
contracts and monotonic risk, remote lease authority with fencing tokens,
one shared guard with adapter parity and hard budgets, eight stable PR
gates, sealed evidence, exact-binding approvals, and publisher separation.

Two durable choices from that session:

1. **Chief authorized the agent to merge** ("I give you permission, cleanup
   PR, merge, fix it"). The agent merged PRs #15, #17, #18, #19, #20 under
   that authorization. Precedent is per-session and does not generalize:
   AGENTS.md rule 5 still forbids agent merges absent explicit human
   authorization.
2. **The agent did not write a `verification-integrity.json` approval for
   its own work**, and will not. An agent authoring an approved-review
   record forges the evidence the control exists to produce. Merges that
   needed integrity review were merged on recorded human authorization
   instead, stated in each PR body.

Open question left for Chief: whether
`tests/governance/test_sensitive_classification.py` should be classified as
a verification control like its three sibling governance tests. Classifying
it would exempt checker-plus-test coupling from the integrity gate — the
exact coupling the gate correctly caught in #19 and #20 — so the agent
deliberately left it unclassified rather than decide it.

Phase 6 onward is blocked on Chief's four activation decisions (autonomous
provider and budgets; control identities; R3 authority and retention; Droid
disposition). Droid remains `read_only_disabled`.

## 2026-08-12 - SOTA enhancements v2: OpenAPI live endpoint, property tests, supply-chain scan

Three additional low-cost, key-free improvements on top of v1:
(5) live OpenAPI 3.1 endpoint (`GET /api/openapi.json` + Swagger UI at
`/api/docs`) built from Zod schemas via `z.toJSONSchema`; (6) property-based
testing with `fast-check` (deterministic seed) asserting schema invariants;
(7) supply-chain scan `pnpm check:security` (npm audit + optional osv-scanner).
Also removed the unused `@opentelemetry/sdk-trace-node` dep whose
`propagator-jaeger` child carried a high advisory. R1 except supply-chain gate
(R2). Verified: api 11 tests, schemas 6 tests, telemetry 7 tests, dev server
serves both OpenAPI routes.

---

## 2026-08-12 - SOTA enhancements v1: deps-graph, visual regression, telemetry, codegen

Four additive features adopted to raise the golden-path to current practice:
(1) monorepo dependency graph tool (`@safrs/deps-graph`, R1, standalone);
(2) Playwright visual regression with Git LFS baselines;
(3) shared OpenTelemetry tracing (`@safrs/telemetry`, OTLP/HTTP to local Jaeger)
wired into api/web; (4) schema-first codegen (`@safrs/codegen`) emitting
OpenAPI 3.1 (via Zod 4 `z.toJSONSchema`), mock factories (faker), and a typed
fetch wrapper. All four are additive and individually verified; R2 items
(telemetry, codegen, LFS, compose, registry/inventory/ci) await designated review.

---

## 2026-08-11 - Codex repository automation pack: native adapters + Context7 only

Codex uses a repository-scoped `.codex/config.toml`, tested PreToolUse/PostToolUse hooks,
two read-only-by-default reviewers, and repository skills under `.agents/skills`. Model and
reasoning remain session/user-owned. Context7 MCP is pinned to 4.0.0 and inventoried for
public documentation only; Prisma/PostgreSQL, Playwright, deployment, and scheduled MCP or
automation remain deferred. Hooks resolve nested project cwd to the repository root. The
control/test coupling requires designated integrity review.

---

## 2026-08-11 - Bugbot follow-ups: adapter R2 parity + force-with-lease allow

After `/review-bugbot` on the agent-automation packs: (1) Cursor `guard-shell.mjs`
allows `git push --force-with-lease` while still denying `--force`/`-f`; (2) Cline
prisma-migration skill points at its local `scripts/validate-migration.mjs`;
(3) `.safrs/sensitive-paths.json` classifies `.cursor/**` / `.cline/**` / `**/.mcp.json`
as R2 and registers Cursor/Cline hooks under `verification_control_patterns`;
(4) Claude credential write/read denials align with Cursor (`id_ed25519*`,
`credentials.json`, `secrets.json`, `*.p12`, `*.pfx`). Integrity review flagged:
controls + adapter docs changed together.

## 2026-08-11 - Cursor MCP: Context7 only; Prisma/Postgres MCP still deferred

Cursor automations may ship `.cursor/mcp.json` with Context7 for docs lookup. They must **not**
enable `prisma mcp` / Prisma-Local or Postgres MCP servers — same deferral as the Claude Code pack
entry above (`migrate-dev` / Studio bypass `run-local-prisma.mjs`). Supersedes any interim Cursor
recommendation that proposed Prisma-Local.

---

## 2026-08-11 - Claude Code automation pack: adapters under `.claude/`, R2 governed

Claude Code gets the same adapter treatment as Cursor: no policy duplication, everything points at
`AGENTS.md`. Shipped: two Node hooks (`guard-sensitive-paths.mjs` blocks credential writes and warns
on registry-classified R2 paths; `format-edited-file.mjs` runs Biome at edit time), two read-only
subagents (`safrs-auditor`, `token-guard`), two skills (`verify` user-only, `new-capability`), and a
read-deny permission list for `.env`/key material. Hooks are invoked as `node .claude/hooks/<name>.mjs`
— relative path, no shell expansion — because this workstation is Windows.
`.claude/**` and `.mcp.json` added to `.safrs/sensitive-paths.json` patterns; `.claude/settings.json`
and `.claude/hooks/**` added to `verification_control_patterns`. Guide: `docs/bootstrap/CLAUDE_SETUP.md`
(registry id `claude-setup`).

PostgreSQL MCP deferred, not shipped: `@modelcontextprotocol/server-postgres` is npm-deprecated,
third-party forks are unvetted against `.safrs/tool-inventory.json`, and `prisma mcp` exposes
mutating tools that bypass the `run-local-prisma.mjs` command allowlist. Enabling any of them is a
separate R2 change with a tool-inventory record.

## 2026-08-11 - All repo docs in English, maximally concise

Chief's standing preference: every doc in this repo is written in English and kept as short as
possible without losing meaning. Agent chat diagnostics remain in Bahasa Indonesia.
Historical archives (docs/bootstrap, docs/evidence, docs/superpowers) keep their original text.

## 2026-08-11 - Memory routing: registry-driven, HANDOFF machine-enforced

Five memory files registered in `.safrs/document-registry.json` with `normativity`/`scope`/`read_order`;
the `AGENTS.md` Read order block is generated from the registry (`tools/safrs/generate_routing.py`).
MUST-always (~2k tokens): 00_READ_FIRST → HANDOFF → 02 → 03 → 04 → 12_LESSONS.
`SAFRS_SPEC.md` demoted to SHOULD (token budget; operative rules mirrored in `AGENTS.md`).
`check_handoff.py` in `safrs-verify.sh` requires a HANDOFF update on any non-trivial change set.
Router duplication removed from `00_READ_FIRST`/`CONTEXT.md` — one source of read order.
Pattern references: Cline Memory Bank, AGENTS.md 2026 conventions.

## 2026-08-11 - Agent memory files: CONTEXT / DECISIONS / HANDOFF / PROGRESS / 12_LESSONS

Five memory files adopted, all under `.agents/`: `CONTEXT.md` (identity), `DECISIONS.md` (this file),
`HANDOFF.md` (session state), `PROGRESS.md` (area tracker), `knowledge/12_LESSONS.md` (reusable
corrections). Replaces the monolithic `.agent/` pattern from `abyss-monorepo` — pattern adopted,
old content NOT migrated. Supersedes the legacy `.agent/` approach.

## 2026-08-11 - `.agents/knowledge/` is the knowledge base location

Numbered KB (00_READ_FIRST … 11_RESPONSE_STANDARDS, 12_LESSONS, 99_SELF_AUDIT) re-routed from
root via `docs/knowledge-base/` to `.agents/knowledge/`. `AGENTS.md` routes there. Do not modify
without Chief's approval.

## 2026-08-11 - Migration from abyss-monorepo: selective copy, never lift-and-shift

Source: `D:\Devops\abyss-monorepo\apps`. Target: `projects/<name>/` per `projects/_template` +
`docs/governance/SAFRS_PROJECT_CAPSULES.md`. Hard bans: reading the old `.env` (live credentials);
copying `node_modules`, `.env`, `.next`, `.turbo`, lockfiles. Everything enters as new, reviewed code.

## 2026-08-10 - Golden path: Next.js + Hono RPC + Zod + PostgreSQL + Prisma

Set by [ADR 0001](docs/adrs/0001-solo-developer-golden-path.md) (ACCEPTED, R2, Chief-approved).
Demonstrator: `projects/golden-path/apps/web`. Electron, WXT, Stripe, email, AI, Python are
optional capability packs, not baseline.

## 2026-08-10 - Monorepo topology: projects / packages / tools / tests / docs

Product work in `projects/<project>/`; product-neutral code in `packages/`; dev tooling in `tools/`;
cross-project tests in `tests/`. New projects start from the template + SAFRS capsule.
Supersedes the legacy `apps/{healthcare,internal,academic,...}` topology.

## Baseline

- SAFRS v1.1 (`SAFRS_SPEC.md`) is the highest normative authority. Corporate PDFs are explanatory;
  on conflict, the spec wins.
- Language: agent diagnostics in Bahasa Indonesia; docs/code/commands/identifiers in English.
- Line endings: LF in git (`.gitattributes`); `.ps1/.bat/.cmd` CRLF.
- Package manager: always `pnpm`. Node >= 24.18 < 25.
