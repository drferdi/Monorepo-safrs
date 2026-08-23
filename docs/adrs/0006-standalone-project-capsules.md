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
2. Every active capsule owns executable `install`, `build`, `test`, `run`, and `deployDryRun`
   commands. Those five required stages cannot be marked not applicable. Only `lint` and
   `typecheck` may be explicitly not applicable, each with a non-empty reason. Commands are argv
   (`program` plus `args`), never shell strings; they run with the capsule root as their working
   directory and remain executable after the capsule is extracted. A deploy dry-run has no
   production side effects.
3. Capsule-local workspaces, lockfiles, packages, scripts, generated assets, and build/deploy
   configuration are allowed. Declared external APIs, databases, services, and pinned images are
   dependencies of the capsule, not dependencies on this monorepo; declarations never contain
   credentials.
4. A capsule must not consume the root workspace, catalog, lockfile, configuration, paths, scripts,
   tools, packages, or monorepo-owned runtime infrastructure. It must not use parent-escaping paths,
   import or link to another capsule, or require another capsule at runtime, build, test, or deploy
   time. Capsule-local workspace links are limited to packages inside that capsule.
5. Root-shared packages and the Sentra token source may remain temporarily for legacy root-integrated
   applications while each consumer migrates. The current `projects/internal/golden-path` coupling
   is explicitly legacy pending its planned capsule migration, not a standalone counterexample or a
   new-project template. During the transition, required shared code is distributed as a
   capsule-local package copied or generated from the approved source, or as an independently
   distributable, pinned package with provenance and local checks. Root packages may not remain a
   standalone capsule's runtime, build, test, or deploy dependency; extraction never resolves a
   root workspace package or checker.
6. Standalone verification has two required halves:
   - **Structural:** inspect paths, commands, and dependencies for forbidden root, cross-capsule,
     and outside-capsule coupling.
   - **Empirical:** copy only the capsule into a fresh directory, sanitize the environment, and run
     the required lifecycle and smoke commands from inside the extracted capsule. Only explicitly
     applicable `lint` and `typecheck` commands may be skipped.

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
