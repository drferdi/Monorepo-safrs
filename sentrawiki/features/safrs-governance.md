# SAFRS governance

## What it is

SAFRS (**S**afe **A**gent **F**irst **R**epository **S**tandard) v1.1 is this
repository's control architecture for working with agents. Its mission is
**Human-Governed · Agent-Executed · Machine-Enforced**: humans set intent,
agents execute within it, and machines verify compliance automatically. The
canonical specification is `SAFRS_SPEC.md`.

## Six-layer control architecture

SAFRS structures control across six layers:

| Layer | Purpose |
|-------|---------|
| **L0 — Trust Boundary** | Identity, repository access, data classification, allowed tools, network access, credentials, and maximum authority. |
| **L1 — Constitution** | Stable principles: objectives, architecture, engineering, coding, security, product, decision standards. |
| **L2 — Context & Navigation** | `AGENTS.md`, canonical docs, ADRs, active plans, project-local instructions, indexes, references. |
| **L3 — Execution Isolation** | Worktrees, isolated dependencies, test databases/schemas, ports, caches, queues, sandboxes, ephemeral environments — based on risk. |
| **L4 — Executable Governance** | CI, linters, type checks, tests, architecture checks, dependency checks, secret controls, sensitive-path detection, protected-branch rules. |
| **L5 — Human Authority** | Humans define intent, own invariants, approve high-impact actions, and remain accountable for production outcomes. |

## Risk model: R0–R3

Risk is determined by impact, reversibility, privilege, blast radius, and data
sensitivity:

| Tier | Class | Example | Control |
|------|-------|---------|---------|
| **R0** | Observe | Search, explain, inspect logs, summarize code | Read-only identity/tooling |
| **R1** | Reversible local change | Local refactor, unit test, doc fix, isolated UI correction | Scoped mutation + standard verification + CI |
| **R2** | Boundary-affecting change | Auth, DB migration, new dependency, shared API/package, CI/CD, architecture, security/governance test | R1 + enhanced tests + sensitive-change gate + design/code-owner review |
| **R3** | High impact | Production data/infra, credentials, destructive migration, financial, healthcare-critical | R2 + explicit human authorization + isolated execution + audit trail |

`policy.json` records the tiers: `R0` blocks mutation, `R1` allows mutation,
`R2` requires `human_review`, and `R3` is **prepare-only** with
`human_authorization` required. Agent authority is the intersection:
`identity ∩ role ∩ task scope ∩ repo policy ∩ environment ∩ risk tier`.

## Agent roles

Roles are independent of model/vendor identity (`SAFRS_SPEC` §6):

- **Observer** — read/search only.
- **Analyst** — read, analyze, propose plans; no mutation.
- **Implementer** — scoped code/docs mutation, tests, branch/PR creation.
- **Reviewer** — inspect diffs/tests/policy; no self-approval of own R2/R3 work.
- **Maintainer** — broader repository mutation and merge subject to branch policy.
- **Release Agent** — prepares release artifacts; production execution requires explicit policy.
- **Security Agent** — security analysis/remediation within granted scope.

### Automation identities (Phase 5)

Three machine identities, each deliberately narrow and none able to do the
others' job (`docs/governance/SAFRS_AGENT_PERMISSIONS.md`):

| Identity | May | May never |
| --- | --- | --- |
| **Coding agent** | Read/write in contracted scopes, branch, open/update one PR, request review | Merge, enable auto-merge, approve, bypass rules, release, R3, read production credentials |
| **Publisher** | Enable auto-merge for one exact, fully verified head | Push source, approve, bypass rules, release, R3 |
| **Control auditor** (Phase 6) | Read live control state, write signed platform attestation | Mutate content, approve, merge |
| **R3 executor** (Phase 8) | Execute one allowlisted deterministic operation after exact human approval | Accept free-form commands, self-approve, run without a fresh protected-environment approval |

## Sensitive paths

`.safrs/sensitive-paths.json` declares the repository's sensitive and
verification-control surfaces. Touching any of them is **minimum R2**. Key
patterns include:

- Governance/security surfaces: `AGENTS.md`, `SECURITY.md`, `SAFRS_SPEC.md`, `.safrs/**`, `.github/workflows/**`, `.github/CODEOWNERS`.
- Vendor instruction adapters: `CLAUDE.md`, `GEMINI.md`, `.agents/**`, `.cursor/**`, `.claude/**`, `.cline/**`, `.codex/**`, `.husky/**`.
- Shared boundaries: `packages/**`, `projects/**/AGENTS.md`, `infrastructure/**`.
- Dependency manifests: root and nested `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `Cargo.toml`, `go.mod`, `pyproject.toml`, etc.
- Security/data-boundary dirs: `**/migrations/**`, `**/auth/**`, `**/authorization/**`, `**/security/**`.
- Verification controls: `tools/safrs/**`, `tools/automation/**`, `.safrs/approvals/**`, `tests/architecture/**`, `tests/security/**`, `scripts/safrs-verify*.mjs|ps1|sh`, and automation governance tests.
- R3 overrides: `projects/**/safety-critical/**`, `projects/**/production/**`, `infrastructure/production/**`.

Per **SAFRS-07**, a change to a verification control receives equal or greater
scrutiny than an implementation change, and modifying implementation and its
governing verification together is classified at least R2.

## Document registry & routing

`.safrs/document-registry.json` lists every canonical document, its type,
status, normativity, and read scope. It drives the generated `SAFRS:ROUTING`
block in `AGENTS.md`. CI validates duplicate canonical IDs, missing files,
invalid status/type, and missing supersession targets. Routing is regenerated
with:

```bash
python tools/safrs/generate_routing.py
```

Document lifecycle (`docs/governance/SAFRS_DOCUMENT_LIFECYCLE.md`): `CANONICAL`,
`ACTIVE`, `HISTORICAL`, `SUPERSEDED`, `ARCHIVED`. ADRs run
`PROPOSED → ACCEPTED → SUPERSEDED|REJECTED`; plans run
`ACTIVE → COMPLETED → ARCHIVED`.

## Verification pipeline (16 checkers)

`scripts/safrs-verify.sh` (and `.ps1`/`.mjs` on Windows) runs the machine
enforcement. It drives a battery of **16 governance checkers**, primarily in
`tools/safrs/` plus supporting repository tests:

- `check_policy.py`, `check_topology.py`, `check_routing.py`, `check_docs.py`,
  `check_handoff.py`, `check_tool_inventory.py`
- `check_actions_pinning.py`, `check_automation_policy.py`,
  `check_task_contract.py`, `check_task_ownership.py`, `check_lifecycle.py`,
  `check_approval_evidence.py`, `check_sensitive_changes.py`
- Supporting architecture/governance/security test suites in `tests/`

The checkers enforce policy shape, routing integrity, tool inventory, task
leases, lifecycle state, approval evidence, sensitive-change review, and
automation contracts. The design-token contrast gate
(`scripts/check-tokens.mjs`) runs as part of the same governance gate.

## Conformance levels

`docs/governance/SAFRS_CONFORMANCE.md` (SAFRS_SPEC §19) defines four levels:

- **SAFRS Core** — canonical routing, policy, risk tiers, local verification.
  *Currently declared level of this repository.*
- **SAFRS Controlled** — Core + CI enforcement + sensitive-path gates + review rules.
- **SAFRS Secure** — Controlled + execution isolation + credential/network controls + supply-chain protections.
- **SAFRS Regulated** — Secure + auditable approvals, domain invariants, controlled production access, evidence retention.

Controlled/Secure/Regulated are **not yet claimed**; they require platform
evidence from the actual GitHub repository (branch protection, enforced checks,
CODEOWNERS resolving, secret scanning). The human-only checklist lives in
`docs/governance/PLATFORM_ACTIVATION.md`.

## CODEOWNERS

`.github/CODEOWNERS` implements R2/R3 review enforcement. Every pattern is
**derived verbatim** from `.safrs/sensitive-paths.json` (patterns,
verification-control patterns, and R3 overrides), with a leading `/` added
where the source is root-anchored so the mapping is auditable line by line.

All rules currently resolve to owner `@drferdii`. Because **the last matching
pattern wins** in CODEOWNERS, ordering matters: the R3 block is placed last so
it wins over broader R2 rules. The file only enforces anything once branch
protection on `main` enables "Require review from Code Owners" — see
`docs/governance/PLATFORM_ACTIVATION.md`. Changing owners here is itself an R2
governance action.

## Key source files

- `SAFRS_SPEC.md`
- `.safrs/policy.json`
- `.safrs/sensitive-paths.json`
- `.safrs/document-registry.json`
- `.safrs/tool-inventory.json`
- `.safrs/automation-policy.json`
- `.safrs/adapter-capabilities.json`
- `docs/governance/SAFRS_AGENT_PERMISSIONS.md`
- `docs/governance/SAFRS_CONTROL_MATRIX.md`
- `docs/governance/SAFRS_CONFORMANCE.md`
- `docs/governance/SAFRS_MULTI_AGENT_PROTOCOL.md`
- `docs/governance/SAFRS_DOCUMENT_LIFECYCLE.md`
- `docs/governance/SAFRS_PROJECT_CAPSULES.md`
- `docs/governance/SAFRS_TOOL_INVENTORY.md`
- `docs/governance/PLATFORM_ACTIVATION.md`
- `.github/CODEOWNERS`
- `tools/safrs/` (checkers), `scripts/safrs-verify.*`

## Related

- [Automation control plane](automation-control-plane.md)
- [Design tokens](design-tokens.md)
- [Capability packs](capability-packs.md)
- [API overview](../api/index.md)
