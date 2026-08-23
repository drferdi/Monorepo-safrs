# ADR 0006 — Standalone Project Capsules

- Status: Accepted
- Risk: R2
- Date: 2026-08-23
- Deciders: Chief

## Context

SAFRS is an AI-native monorepo whose root provides automation and governance for independently
owned project capsules. A root workspace can make a capsule appear portable while silently
supplying configuration, paths, tooling, packages, or runtime infrastructure. A capsule also
needs a proof stronger than documentation: it must remain usable after extraction from the
monorepo.

## Options considered

1. **Root-managed runtime and workspace for every capsule.** Rejected: convenient orchestration
   becomes a hidden runtime dependency and extraction cannot prove portability.
2. **One repository per project with no root control plane.** Rejected: it loses shared AI
   automation, governance, and auditable coordination that SAFRS exists to provide.
3. **Capsule-owned standalone contracts with optional root orchestration.** Accepted: the root
   remains useful as a control plane while each capsule retains an independently verifiable
   lifecycle.

## Decision

1. The repository root is the SAFRS AI automation/control plane. It may discover, orchestrate,
   verify, update, and report on capsules as an optional convenience, but it is never a capsule's
   runtime, configuration, path, tooling, or infrastructure dependency.
2. Every capsule owns an independent install, build, test, run, and deploy contract, with lint and
   type-check stages when applicable. Commands run with the capsule root as their working directory
   and remain executable after the capsule is extracted. A genuinely inapplicable stage is stated
   explicitly with a reason.
3. Capsule-local workspaces, lockfiles, packages, scripts, generated assets, and build/deploy
   configuration are allowed. Declared external APIs, databases, services, and pinned images are
   dependencies of the capsule, not dependencies on this monorepo; declarations never contain
   credentials.
4. A capsule must not consume the root workspace, catalog, lockfile, configuration, paths, scripts,
   tools, packages, or monorepo-owned runtime infrastructure. It must not use parent-escaping paths,
   import or link to another capsule, or require another capsule at runtime, build, test, or deploy
   time. Capsule-local workspace links are limited to packages inside that capsule.
5. Standalone verification has two required halves:
   - **Structural:** inspect paths, commands, and dependencies for forbidden root, cross-capsule,
     and outside-capsule coupling.
   - **Empirical:** copy only the capsule into a fresh directory, sanitize the environment, and run
     applicable lifecycle and smoke commands from inside the extracted capsule.

   Empirical extraction is the decisive portability proof; prose or source-text grep tests are not
   a substitute.

## Consequences

- Capsules can be copied, reviewed, and operated independently while the root retains an auditable
  AI automation/control-plane role.
- Capsule owners must keep project-local dependency metadata and declare external services, which
  may duplicate small manifests that were previously supplied by the root.
- Root commands are thin orchestrators and may not be treated as lifecycle prerequisites. A capsule
  that needs shared code must keep it locally or adopt an independently distributable external
  dependency; root workspace reuse is not standalone proof.
- R2 changes to this boundary require designated review because implementation and verification
  controls may be affected together.
