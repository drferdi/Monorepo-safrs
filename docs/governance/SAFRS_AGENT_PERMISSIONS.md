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
