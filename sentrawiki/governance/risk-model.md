# Risk model (R0–R3)

**Canonical:** `SAFRS_SPEC.md` §7, `.safrs/policy.json` `risk_tiers`.

Risk is determined by consequence, reversibility, privilege, blast radius, and data sensitivity — not by file count.

| Tier | Mutation | Human review | Human authorization | Examples |
| --- | --- | --- | --- | --- |
| **R0** | no | no | no | search, explain, inspect |
| **R1** | yes | no | no | local refactor, unit test, documentation |
| **R2** | yes | yes | no | authz, migration, shared package, CI, architecture, this wiki does not change that |
| **R3** | prepare-only for agents | yes | **yes, before execution** | production data/infra, credential rotation, deploy authorization, healthcare-critical logic |

`.safrs/policy.json` encodes the same table (`mutation`, `human_review`, `human_authorization`).

## Monotonic risk

`effective_risk = max(declared, path, operation, data, capability, actual_diff)`.

Agents may raise risk, never lower it. Every dimension needs a non-empty reason (`tools/automation/src/risk.mjs`).

## Typical R2 surfaces in this repo

`.safrs/**`, `AGENTS.md`, `.github/workflows/**`, `tools/safrs/**`, `tools/automation/**`, `packages/**`, capsule sovereignty contracts, design-token values that affect a shared distributed contract.

Wiki pages under `sentrawiki/` are documentation (R1) unless they are wired as verification evidence and changed together with the controls they describe.

## Related

- [Roles](roles.md)
- [Verification integrity](verification-integrity.md)
- [Features: SAFRS governance](../features/safrs-governance.md)
