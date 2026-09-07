# CI workflows

Files under `.github/workflows/`:

| Workflow | Role |
| --- | --- |
| `ci.yml` | PR verification: governance, lint, typecheck, test, build, e2e |
| `safrs-governance.yml` | Python SAFRS checkers |
| `safrs-pr-gates.yml` | Eight automation gates as a matrix |
| `safrs-task-control.yml` | Dispatch: remote lease authority |
| `safrs-publish.yml` | Dispatch: publication eligibility |

Do not claim these are **required** GitHub checks. `docs/governance/safrs_conformance.md` refuses Controlled until branch protection evidence exists. HANDOFF notes GitHub Free private-repo limits.

Renovate: `.github/renovate.json` (`automerge: false`).
