# SAFRS Agent Permission Framework

## Rule
Effective authority = identity ∩ assigned role ∩ task scope ∩ environment ∩ repository policy ∩ risk tier.

## Default role envelopes
| Role | Read | Plan | Modify | Test | PR | Merge | Deploy |
|---|---:|---:|---:|---:|---:|---:|---:|
| Observer | ✓ | – | – | – | – | – | – |
| Analyst | ✓ | ✓ | – | – | – | – | – |
| Implementer | ✓ | ✓ | Scoped | ✓ | ✓ | – | – |
| Reviewer | ✓ | – | –* | ✓ | Review | – | – |
| Maintainer | ✓ | ✓ | Scoped | ✓ | ✓ | Policy | – |
| Release Agent | ✓ | Release plan | Release artifacts | ✓ | ✓ | – | Prepare only |
| Security Agent | ✓ | ✓ | Scoped remediation | ✓ | ✓ | – | – |

`*` A reviewer should not mutate the same change it is independently approving; if it does, independent review is required.

## Separation of duties
- The authoring agent cannot be the sole approver of its own R2/R3 work.
- R3 execution authorization must come from an authorized human.
- Deployment credentials are separated from implementation credentials.
- Tool availability does not grant task permission.

## Automation identities (Phase 5)

Three machine identities, each with a deliberately narrow grant. None of
them may do another's job.

| Identity | May | May never |
| --- | --- | --- |
| **Coding agent** | Read, write inside contracted scopes, branch, open and update one pull request, request review | Merge, enable auto-merge, approve a review, bypass branch rules, release, execute an R3 operation, read production credentials |
| **Publisher** | Ask GitHub to enable auto-merge for one exact, fully verified head | Push source, approve a review, bypass branch rules, release, execute an R3 operation |
| **Control auditor** (Phase 6) | Read live GitHub control state and write a signed platform attestation | Any write to repository content, any approval, any merge |
| **R3 executor** (Phase 8) | Execute one allowlisted deterministic operation after exact human approval | Accept free-form commands, self-approve, run without a fresh protected-environment approval |

Machine-checked today: `.safrs/automation-policy.json` records the
publisher's `may` / `may_not` lists and `check_automation_policy.py`
enforces their shape; `.github/workflows/safrs-publish.yml` holds
`pull-requests: write` and nothing else, granted through the explicit
`workflow_write_permissions` allowlist. Until Chief approves the separate
publisher identity (Activation Decision 2) that workflow is
evaluation-only and requests nothing.
