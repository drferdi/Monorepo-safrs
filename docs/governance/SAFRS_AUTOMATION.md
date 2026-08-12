# SAFRS Automation — Canonical Behavior

Canonical description of the automation control plane. Machine policy:
`.safrs/automation-policy.json`. Schemas: `.safrs/schemas/*.v1.schema.json`.
Architecture decision: `docs/adrs/0002-safrs-automation-control-plane.md`.

## Lifecycle

`human intent → task contract → exclusive claim → isolated execution →
verification → risk-based approval → publish or authorized execute →
durable evidence`.

## Task contracts

- `TaskContractV1` is the only grant of authority. No contract, no
  mutation. Free-text instructions grant nothing.
- Contracts are canonical JSON (UTF-8, sorted keys, no insignificant
  whitespace) digested with SHA-256. The digest binds claims, runs,
  approvals, and evidence to one immutable grant.
- The compiler (`tools/automation/src/contracts.mjs`; CLI entry
  `node tools/automation/src/cli.mjs contract compile <input>`) fails closed on:
  path escape, absolute or wildcard scopes, Windows case collisions,
  unknown tools or operations, unregistered network endpoints, missing or
  over-policy budgets, expiry beyond policy, secret-like content, and any
  attempt to lower computed risk.
- `tools/safrs/check_task_contract.py` revalidates stored contracts and
  recomputes digests in Python; Node/Python digest parity is a governance
  gate.

## Risk

`effective_risk = max(declared, path, operation, data, capability)` —
plus `actual_diff` once runs exist (Phase 3+). Reasons are mandatory above
R0. Risk behavior per level follows `.safrs/policy.json` and the plan:

- **R0** — read and report only; write scopes must be empty.
- **R1** — isolated branch/worktree; publication is automatic after every
  gate passes (publisher enables auto-merge; the agent cannot merge).
- **R2** — R1 plus a current independent/code-owner approval bound to the
  exact head SHA and diff digest.
- **R3** — prepare-only for agents. Execution requires a named human
  approving a protected-environment job for one exact operation digest.

## Adapters

`.safrs/adapter-capabilities.json` records, per provider, whether
pre-action enforcement is possible and the activation state. An adapter
without enforceable pre-action hooks is at most read-only. Droid stays
`read_only_disabled` pending Activation Decision 4.

## Boundaries

- No new runtime dependencies in `tools/automation/`.
- No production credentials, targets, or deployments anywhere in this
  plane; R3 production adapters are disabled by policy.
- Verification wiring currently lives in `.github/workflows/`
  (`safrs-governance.yml`); local `scripts/safrs-verify.ps1`/`.sh` parity
  is pending release of a stale claim on those files.
