# Agent roles and permissions

**Canonical:** `SAFRS_SPEC.md` §6, `.safrs/policy.json` `roles`, `docs/governance/SAFRS_AGENT_PERMISSIONS.md`.

Roles are independent of model vendor.

| Role | Allowed (policy.json) |
| --- | --- |
| observer | read, search |
| analyst | read, search, plan |
| implementer | + modify-scoped, test, create-branch, create-pr |
| reviewer | read, search, review, test |
| maintainer | implementer + merge-policy-permitting |
| release-agent | read, prepare-release, test, create-pr |
| security-agent | read, search, security-analyze, modify-scoped, test, create-pr |

Authority is the intersection of identity ∩ role ∩ task scope ∩ repository policy ∩ environment ∩ risk tier (`SAFRS_SPEC.md` §8). A tool being installed is not permission.

Reviewers do not self-approve their own R2/R3 work. Coding agents never hold merge or production-execution authority (ADR 0002).
