# Glossary

Project-specific terms. Prefer these over inventing synonyms.

| Term | Definition |
| --- | --- |
| **SAFRS** | Sentra Agent-First Repository Standard. Current version: v1.1. Spec: `SAFRS_SPEC.md`. |
| **Chief** | Dr. Ferdi Iskandar — the human authority for this repository. |
| **Control plane** | The repository root: policy, orchestration, verification. Optional for capsule survival. |
| **Project capsule** | A sovereign project at `projects/<domain>/<capsule>/`. Must remain operable after extraction. |
| **Domain folder** | `projects/<domain>/` — routing only (`AGENTS.md` + `README.md`). No application code. |
| **Golden path** | Legacy Next.js demonstrator proving Database → API → Web with one demo record. `projects/internal/golden-path`. Not a new-product template. |
| **Standalone** | Capsule lifecycle (`install`, `build`, `test`, `run`, `deployDryRun`) succeeds after extraction. Structural check + empirical extraction. ADR 0006. |
| **R0** | Read-only analysis. |
| **R1** | Reversible local change. |
| **R2** | Boundary-affecting change. Designated review. |
| **R3** | High-impact change. Explicit human authorization before execution. Agent may prepare only. |
| **Capability pack** | Optional module (Stripe, email, Electron, WXT, AI, Python) via `pnpm capability:add`. Root convenience; not a capsule runtime requirement. |
| **Design tokens** | Sentra semantic tokens. Capsules must own or pin them; extraction must not resolve `packages/token`. |
| **Document registry** | `.safrs/document-registry.json` — status and read-order for canonical docs. Generates the AGENTS.md routing block. |
| **Sensitive paths** | Patterns in `.safrs/sensitive-paths.json` classified R2+. |
| **Tool inventory** | `.safrs/tool-inventory.json` — approved tools, data scope, review status. |
| **Verification control** | Files that enforce governance (`.safrs/**`, `AGENTS.md`, CI, `tools/automation/**`, checkers). Changes are minimum R2. |
| **Disposable database** | Local/test Postgres that the reset guard will allow. Root demo: `127.0.0.1:54329`, name ending `_local` or `_test`. |
| **HANDOFF** | `.agents/HANDOFF.md` — current session state, overwritten each session. Enforced by `check_handoff.py`. |
| **Automation control plane** | ADR 0002 machine-checked contracts, leases, gates, evidence, publisher. `tools/automation/`. |
| **Canonical JSON** | UTF-8, sorted keys, preserved array order, no insignificant whitespace. Digests identical across Node and Python. |
| **Monotonic risk** | `effective_risk = max(declared, path, operation, data, capability, actual_diff)`. Agents may raise, never lower. |
| **Lease event chain** | Append-only NDJSON of ownership events with fencing tokens. Lives in the git common dir, not in `.safrs/`. |
| **Publisher identity** | May only enable auto-merge for an exact verified head. Cannot merge, push, approve, or deploy. |
| **Shared guard** | Vendor-neutral pre-action decision: allow / ask / deny / stop. |
| **Fencing token** | Monotonic integer on a lease. Stale holders must stop. |
| **Wiki** | `sentrawiki/` — derived navigation. Not canonical. |
| **SPDS** | Sentra Project Documentation Standard 1.0 — per-capsule professional docs (`docs/spds/`), distinct from this wiki. |

Shorter collaboration glossary: `.agents/knowledge/10_GLOSSARY.md`.
