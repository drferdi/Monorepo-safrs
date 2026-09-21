# Purpose and invariants

**Canonical:** `docs/architecture/MONOREPO_PURPOSE.md`.

## Mission

Let a single human Chief operate many software projects through autonomous AI engineering with minimal manual work.

The desired operator experience:

> Chief gives an objective. The system determines project context, routes work, executes, retries, verifies, and returns a concise result.

## What the root may do

Project discovery, agent orchestration, task routing, policy enforcement, risk classification, health reporting, verification, evidence, release coordination, templates, optional generated-asset sync, portfolio observability.

These operate **on** projects. They must not become hidden runtime or build requirements of projects.

## What a project is

Every directory under `projects/<domain>/<capsule>/` is a sovereign capsule. It owns source, manifests, lock state, runtime versions, configuration, environment contract, local first-party packages, tests, schemas, migrations, infrastructure, build, deployment, and operational documentation as applicable.

A capsule may depend on declared external systems or versioned artifacts. It must not depend on the Monorepo root merely because it currently lives inside the Monorepo.

## Fundamental invariants

| ID | Rule |
| --- | --- |
| I-01 | Project sovereignty — install, build, test, run, package, deploy-dry-run after extraction |
| I-02 | Root optionality — deleting root access must not break an extracted project |
| I-03 | No hidden parent dependency — no required resolve above the capsule root |
| I-04 | Human governs, agents execute |
| I-05 | Machine handles deterministic governance |
| I-06 | Executable evidence beats assumption — extraction test is decisive |
| I-07 | Existing mistakes do not redefine purpose |
| I-08 | Simplicity is a control |
| I-09 | Autonomy inside isolation |
| I-10 | State-of-the-art without churn |

## Architectural test oracle

When evaluating any implementation, ask:

1. Does this reduce Chief's manual operational burden?
2. Does this increase agent end-to-end execution capability?
3. Does this preserve project sovereignty?
4. Does this keep root optional?
5. Can the rule be machine-enforced?
6. Does it create human interruption for a deterministic outcome?
7. Does it improve reliability without unnecessary complexity?
8. Can the claim be proven by executable evidence?

## Known non-conformance (current state, not templates)

Root-coupled projects are **defects pending remediation**, not precedents.

Named legacy demonstrator: `projects/internal/golden-path/apps/web`. It consumes `@safrs/*` from the root workspace. ADR 0006 records this as planned capsule migration.

`projects/internal/control-center` also consumes `@sentra/token` and `@safrs/config` from the root workspace. It is a local operator surface, not a product template.

Do not copy those patterns into new capsules.

## Related

- [Architecture](architecture.md)
- [Capsule sovereignty](../governance/capsule-sovereignty.md)
- [Project capsules](../projects/index.md)
- ADR 0006 — `docs/adrs/0006-standalone-project-capsules.md`
