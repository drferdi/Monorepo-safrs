# Glossary

Project-specific terms used throughout the SAFRS Monorepo.

| Term | Definition |
| --- | --- |
| **SAFRS** | Sentra Agent-First Repository Standard. The governance specification defining how a repository should be structured when AI agents participate in engineering. Current version: v1.1. |
| **Chief** | Dr. Ferdi Iskandar, the solo developer and human authority for the repository. |
| **Golden path** | The default reference application proving the typed Database to API to Web flow with one safe demo record. Lives at `projects/golden-path/apps/web`. |
| **R0** | Read-only analysis. No mutation allowed. |
| **R1** | Reversible local change. Scoped mutation with standard verification. |
| **R2** | Boundary-affecting change. Requires designated human or code-owner review. |
| **R3** | High-impact change. Requires explicit human authorization before execution. Agent may prepare but not self-authorize. |
| **Project capsule** | A self-contained context boundary for one project, including `AGENTS.md`, README, docs, src, and tests. Defined in `docs/governance/SAFRS_PROJECT_CAPSULES.md`. |
| **Capability pack** | An optional feature module (Stripe, email, Electron, WXT, AI, Python) that can be activated per project via `pnpm capability:add`. |
| **Design tokens** | Sentra semantic tokens in `@sentra/token`. Raw colour values are forbidden outside `packages/token/src/tokens.css`. Enforced by `scripts/check-tokens.mjs`. |
| **Document registry** | Machine-readable index at `.safrs/document-registry.json` tracking every canonical, reference, plan, and ADR document with status and normativity. |
| **Sensitive paths** | File patterns classified as R2 or higher in `.safrs/sensitive-paths.json`. Changes to these paths trigger enhanced review. |
| **Tool inventory** | Machine-readable inventory at `.safrs/tool-inventory.json` recording every approved tool, its purpose, data scope, and review status. |
| **Verification control** | Files that enforce governance: `.safrs/**`, `AGENTS.md`, CI workflows, security tests, architecture checks. Changes to these are minimum R2. |
| **Disposable database** | A local or test database that can be safely reset. Must be on `127.0.0.1:54329` with a name ending in `_local` or `_test`. Enforced by `packages/database/src/reset-guard.ts`. |
| **Correlation ID** | A UUID generated per request and attached to both the response header (`x-correlation-id`) and error envelopes for tracing. |
| **Agent adapter** | A vendor-specific file (`.cursor/rules/`, `CLAUDE.md`, `GEMINI.md`, `.codex/config.toml`) that points at root `AGENTS.md` without duplicating policy. |
| **HANDOFF** | `.agents/HANDOFF.md`, overwritten each session with current state, work in flight, blockers, and next actions. Machine-enforced by `check_handoff.py`. |
