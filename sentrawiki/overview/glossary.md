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
| **Verification control** | Files that enforce governance: `.safrs/**`, `AGENTS.md`, CI workflows, security tests, architecture checks, `tools/automation/**`. Changes to these are minimum R2. |
| **Disposable database** | A local or test database that can be safely reset. Must be on `127.0.0.1:54329` with a name ending in `_local` or `_test`. Enforced by `packages/database/src/reset-guard.ts`. |
| **Correlation ID** | A UUID generated per request and attached to both the response header (`x-correlation-id`) and error envelopes for tracing. |
| **Agent adapter** | A vendor-specific file (`.cursor/rules/`, `CLAUDE.md`, `.codex/config.toml`, `.cline/hooks/`) that points at root `AGENTS.md` without duplicating policy. |
| **HANDOFF** | `.agents/HANDOFF.md`, overwritten each session with current state, work in flight, blockers, and next actions. Machine-enforced by `check_handoff.py`. |
| **Automation control plane** | The machine-checked enforcement layer (ADR 0002): canonical contracts, monotonic risk, lease chains, PR gates, evidence manifests, approvals, and a publisher identity. Implemented in `tools/automation/`. |
| **Canonical JSON** | UTF-8, lexicographically sorted keys, preserved array order, no insignificant whitespace, safe integers only. Digests must be byte-identical across Node and Python. Defined in `tools/automation/src/canonical-json.mjs`. |
| **Monotonic risk** | `effective_risk = max(declared, path, operation, data, capability, actual_diff)`. Agents may raise risk, never lower it. Defined in `tools/automation/src/risk.mjs`. |
| **Lease event chain** | An append-only NDJSON ledger of `LeaseEventV1` records tracking task ownership transitions (CLAIM, RENEW, TRANSITION, RELEASE) with fencing tokens. Defined in `tools/automation/src/leases.mjs`. |
| **PR gates** | 8 individually named GitHub Actions checks (contract, lease, risk, budgets, verification, review, evidence, platform) that branch protection can require. Defined in `tools/automation/src/gates.mjs`. |
| **Evidence manifest** | A content-addressed, redacted, reconstructable record of a task lifecycle: contract digest, lease events, check verdicts, approvals, budget usage, artifact hashes. Defined in `tools/automation/src/evidence.mjs`. |
| **Publisher identity** | A separated identity that may only request GitHub auto-merge for an exact verified head. It cannot merge, push, approve, bypass rules, or deploy. Defined in `tools/automation/src/publisher.mjs`. |
| **Shared guard** | A vendor-neutral pre-action decision module (`allow`, `ask`, `deny`, `stop`) shared across all agent adapters. Defined in `tools/automation/src/guard.mjs`. |
| **Fencing token** | A monotonically incrementing integer in the lease chain. A writer holding an older token must stop before mutating or pushing. |
