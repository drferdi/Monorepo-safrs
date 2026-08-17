# MASTER REMEDIATION PLAN — SENTRA MONOREPO

**Closing the Gap Between SAFRS Design, Verification Integrity, Platform Enforcement, and Operational Reality**

**Version:** 0.2
**Status:** Approved — execution remains gated by claimed work packages
**Date:** 17 August 2026
**Owner:** dr. Ferdi Iskandar
**Organization:** Sentra Artificial Intelligence
**Repository:** Sentra Monorepo
**Primary Governance Framework:** SAFRS v1.1
**Execution Model:** Solo Developer · Agent-Assisted · Human-Governed · Machine-Enforced
**Remediation Sequence:** Ground Truth → Human Decisions → Verification Integrity → Platform Enforcement → Operational Control → Verification Depth → Security Depth → Optimization

---

# 1. Purpose

This document defines the authoritative remediation plan for the Sentra Monorepo following the deep-dive repository audit.

The purpose of this remediation is not to expand the technology stack, add speculative features, redesign the repository, or introduce unnecessary infrastructure.

The purpose is to close the gap between:

1. documented architecture;
2. SAFRS governance requirements;
3. actual repository state;
4. runtime condition;
5. executable verification;
6. CI behavior;
7. GitHub platform enforcement;
8. human authority;
9. Control Center reporting;
10. task and worktree lifecycle;
11. documentation truth; and
12. the operational experience required by a solo developer working primarily through AI agents.

The Monorepo already contains a strong and modern technical foundation.

The audit shows substantial maturity in:

- TypeScript type safety;
- modern application architecture;
- API validation;
- database architecture;
- unit and contract testing;
- repository behavior testing;
- design-system verification;
- supply-chain controls;
- SAFRS governance;
- task isolation;
- command safety;
- Control Center foundations;
- CI and GitHub Actions infrastructure.

The primary problem is therefore not technological insufficiency.

The primary problem is **operational closure and verification integrity**.

Several parts of the system can currently report success, readiness, connection, or compliance without all underlying operational conditions necessarily being true at the same time.

The remediation objective is therefore:

> **Make the Monorepo operationally truthful, verifiable, enforceable, and simple enough for one human operator to understand and control.**

---

# 2. Strategic Thesis

The Monorepo does not currently suffer from one isolated defect.

The deeper issue is:

> **The repository does not yet have one consistently enforced operational truth.**

Different layers may currently describe different realities.

For example:

- source files may exist;
- a Control Center feature may report `connected`;
- a SAFRS gate may report `PASS`;
- historical CI may be green;
- Turbo may replay a cached test result;
- documentation may declare one repository state;
- GitHub may enforce another state;
- a service may have worked previously;
- but the corresponding service may not currently be running or verified.

These conditions create **truth drift**.

Truth drift is dangerous because it creates false confidence.

A mature agent-first repository must distinguish between:

- existence;
- configuration;
- execution capability;
- present runtime health;
- historical verification;
- current verification;
- enforcement.

The following distinctions therefore become permanent design requirements.

A historical success is not current health.

A cached integration result is not fresh integration verification.

A `NOT_APPLICABLE` control is not a successful execution.

A file existing is not evidence that a capability is operational.

A repository policy is not an enforced control unless the platform actually prevents violations.

A documented branch rule is not branch protection unless GitHub enforces it.

A service that previously worked is not healthy now unless it can be verified now.

The remediation plan therefore focuses on establishing a reliable chain:

```text
Declared State
    ↓
Actual State
    ↓
Verification
    ↓
Evidence
    ↓
Enforcement
    ↓
Human Authority
```

Every important operational claim should eventually be traceable through this chain.

---

# 3. Scope

This plan applies specifically to the Sentra Monorepo.

It covers:

- repository state;
- Git state;
- worktrees;
- SAFRS governance;
- task lifecycle;
- CI;
- GitHub rules;
- linting;
- formatting;
- line endings;
- type checking;
- tests;
- database integration;
- Golden Path;
- visual E2E;
- build behavior;
- Turbo caching;
- environment handling;
- Control Center;
- supply-chain controls;
- documentation consistency;
- operator workflow.

This plan does **not** expand into unrelated Sentra initiatives.

The following subjects are explicitly outside the current scope unless they become directly necessary to repair the Monorepo:

- healthcare product architecture;
- clinical AI systems;
- AADI;
- external commercial strategy;
- government procurement strategy;
- hospital procurement;
- investor diligence;
- product-market positioning;
- production clinical infrastructure.

Commercial or procurement implications may be analyzed separately if required.

They are not part of this technical remediation plan.

---

# 4. Governing Principles

The remediation process must follow the existing Sentra engineering philosophy:

- simplicity;
- maintainability;
- consistency;
- reusability;
- verifiability;
- minimal unnecessary abstraction;
- incremental improvement;
- reuse before replacement;
- verification as part of implementation;
- evidence before assumption;
- no speculative features;
- no unrelated refactoring.

The remediation also follows the core SAFRS model:

```text
L5 — Human Authority
L4 — Executable Governance
L3 — Execution Isolation
L2 — Context & Navigation
L1 — Constitution
L0 — Trust Boundary
```

Constraint descends.

Authority ascends.

Platform enforcement remains subordinate to human authority.

Agent capability never creates additional permission.

Risk determines authorization.

---

# 5. Current-State Assessment

## 5.1 Strong Foundations

The audit demonstrates that the Monorepo already has substantial technical maturity.

Existing capabilities include:

### Platform

- Node.js 24 LTS;
- pnpm 11;
- TypeScript 7;
- Turborepo 2;
- Next.js 16;
- React 19;
- Hono;
- Prisma 7;
- PostgreSQL 17;
- Zod;
- Vitest;
- Playwright;
- Biome;
- OpenTelemetry;
- GitHub Actions.

### Workspace

The repository contains:

- Golden Path application;
- Control Center;
- project template;
- API package;
- database package;
- environment package;
- schema package;
- telemetry package;
- token package;
- UI package;
- shared configuration;
- developer tooling;
- task registry;
- capability management;
- automation tooling;
- dependency graph tooling;
- project generation tooling;
- SAFRS verification tooling.

### Golden Path

Existing implementation includes:

- Next.js App Router;
- Hono API;
- health endpoint;
- OpenAPI endpoint;
- API documentation;
- demo API;
- Zod validation;
- Prisma persistence;
- PostgreSQL adapter;
- normalized errors;
- correlation IDs;
- server-first rendering;
- client-side form boundary;
- database reset guard;
- deterministic seed;
- functional E2E;
- visual E2E architecture.

### Control Center

Existing capabilities include:

- repository inspection;
- Git status;
- workspace status;
- policy inspection;
- task inspection;
- role inspection;
- gate inspection;
- knowledge registry;
- doctor checks;
- activity information;
- feature catalog;
- command execution;
- command allowlisting;
- mutation confirmation;
- output limits;
- audit logging;
- path containment.

### SAFRS Governance

Existing governance includes:

- R0–R3 risk tiers;
- sensitive-path classification;
- task contracts;
- task registry;
- worktree ownership;
- lease model;
- fencing;
- monotonic risk escalation;
- approval model;
- evidence model;
- review gates;
- platform gates;
- document governance;
- tool inventory;
- CI governance;
- Action SHA pinning.

### Design System

Existing verification includes:

- semantic tokens;
- light/dark themes;
- accessibility contrast recomputation;
- token scope verification;
- raw-value scanning;
- self-hosted fonts;
- visual conventions.

### Supply Chain

Existing controls include:

- exact dependency catalog;
- pinned versions;
- minimum release age;
- install-script allowlisting;
- Renovate;
- pnpm audit;
- GitHub secret scanning;
- GitHub push protection;
- Dependabot security updates;
- immutable Action references.

The remediation plan preserves these foundations.

It does not replace them.

---

# 6. Problem Map by SAFRS Layer

---

## L0 — Trust Boundary

### Current Gaps

- Repository visibility in documentation appears inconsistent with actual GitHub visibility.
- Dependency and external-tool posture requires authoritative confirmation.
- License policy is incomplete.
- Platform trust assumptions may therefore differ from documented assumptions.

### Required Outcome

The repository trust boundary must be explicit and accurate.

The following must agree:

```text
GitHub Reality
Repository Documentation
Security Assumptions
Automation Behavior
SAFRS Configuration
```

---

## L1 — Constitution

### Current State

No major constitutional design failure has been identified.

SAFRS itself already provides strong principles for:

- permissions;
- risk;
- escalation;
- human authority;
- governance;
- isolation.

### Required Outcome

Do not modify SAFRS merely because the repository implementation currently violates it.

First fix implementation.

Change SAFRS only if evidence demonstrates that the policy itself is inappropriate.

---

## L2 — Context and Navigation

### Current Gaps

Documentation drift exists.

Examples include:

- capability documentation not matching actual Stripe/email implementation;
- stale feature inventories;
- stale CI descriptions;
- stale operational assumptions;
- repository visibility mismatch;
- potentially stale task state.

### Required Outcome

Canonical documentation must represent approved current reality.

Architecture documentation must describe what currently exists.

Execution plans must not become architecture truth.

Historical plans must not become operational truth.

---

## L3 — Execution Isolation

### Current Gaps

Control Center dynamic filesystem access can cause broad repository tracing during production-oriented Next.js builds.

This could make a deployment-oriented artifact include a broader repository surface than intended.

### Required Outcome

Until deployment is explicitly approved:

> **Control Center remains a local operational tool.**

Do not introduce deployment complexity solely to eliminate a warning.

If deployment becomes required later, output tracing must be redesigned deliberately.

---

## L4 — Executable Governance

This is the largest current remediation surface.

### Current Gaps

- `main` is not protected;
- required status checks are not platform-enforced;
- full CI does not verify exact merged `main` SHA;
- lint baseline fails;
- visual E2E baseline is invalid because the expected PNG is currently represented as a Git LFS pointer;
- database integration verification can potentially replay cache;
- root environment behavior is inconsistent;
- current verification semantics do not clearly distinguish fresh, cached, historical, skipped, and not-applicable results;
- coverage baseline is absent;
- dependency review is absent;
- platform security scanning can be improved;
- Turbo task contracts need tightening.

### Required Outcome

Every machine-checkable governance requirement should become actual executable verification.

Where appropriate, GitHub should enforce it.

---

## L5 — Human Authority

### Current Gaps

- task lifecycle contains stale state;
- dependency automation may conflict with current R2 policy;
- standard GitHub review assumptions do not fit a solo-developer repository cleanly;
- a practical R2 authorization model for a solo operator needs explicit definition.

### Required Outcome

Human authority must remain meaningful without forcing fake approvals, habitual administrator bypass, or ceremonial governance.

---

# 7. Mandatory Remediation Principles

---

## 7.1 Ground Truth Before Change

No normal remediation begins until the current factual state is established.

Agents must not repair assumptions.

Agents repair verified conditions.

---

## 7.2 Emergency Containment Exception

Ground Truth is the normal prerequisite for mutation.

There is one narrow exception.

If Phase 0A identifies a **verified active security exposure, destructive condition, credential exposure, uncontrolled public exposure, or comparable ongoing high-impact condition**, minimal containment may occur immediately.

Containment must follow these rules:

1. capture evidence first where safely possible;
2. confirm the condition;
3. perform only the smallest containment action required;
4. prefer reversible action;
5. do not combine containment with unrelated remediation;
6. record what changed;
7. record who authorized it;
8. resume Ground Truth collection afterward.

Example:

```text
Unexpected public exposure confirmed
        ↓
Capture evidence
        ↓
Perform minimal containment
        ↓
Record action
        ↓
Resume Phase 0A
```

Emergency containment is not permission for broad remediation.

---

## 7.3 Fresh Means Fresh

Integration and E2E verification must execute against the relevant current environment.

Fresh verification cannot silently become historical verification.

---

## 7.4 Green Must Have One Meaning

`PASS` means the required verification actually executed and passed.

Valid states are:

```text
PASS
FAIL
NOT_APPLICABLE
BLOCKED
UNKNOWN
```

Additional metadata may include:

```text
FRESH
CACHED
HISTORICAL
```

A `NOT_APPLICABLE` result must not appear as a successful execution.

A `CACHED` result must not masquerade as fresh integration evidence.

---

## 7.5 No Technology Migration Without Demonstrated Need

The following are not remediation strategies by default:

- Nx migration;
- moonrepo migration;
- new orchestration platforms;
- framework replacement;
- experimental runtime adoption;
- new dependency systems.

Existing technology must be corrected before replacement is considered.

---

## 7.6 Surgical Changes

Every fix should affect the smallest reasonable surface.

Avoid:

- mass refactors;
- unrelated cleanup;
- architectural rewrites;
- speculative abstractions;
- format churn unrelated to the actual problem.

---

## 7.7 Exit Criteria Before Schedule

A remediation phase is completed by evidence, not by elapsed calendar time.

There are no artificial completion dates.

However, lack of deadlines does not mean lack of cadence.

---

## 7.8 Remediation Review Cadence

A progress review occurs:

> **Every seven days or at phase completion, whichever occurs first.**

The review answers only:

1. What phase are we in?
2. What evidence was gained?
3. What remains blocked?
4. What Chief decisions remain open?
5. Has scope expanded?
6. Is the work still progressing toward the defined exit criteria?

This checkpoint is not a deadline.

Its purpose is to prevent silent stagnation or uncontrolled scope expansion.

---

# 8. Decision Register — Chief Authority Required

---

# D-001 — Repository Visibility

## Question

Should the Sentra Monorepo be:

```text
PUBLIC
```

or:

```text
PRIVATE
```

## Why This Matters

Repository visibility directly affects:

- trust boundary;
- source exposure assumptions;
- security posture;
- external access;
- platform configuration;
- documentation truth.

## Required Evidence

Phase 0A must independently verify current GitHub visibility.

Do not rely on stale repository documentation.

## Emergency Rule

If current visibility represents a verified unintended active exposure, Emergency Containment Exception may apply.

## Status

```text
OPEN
```

---

# D-002 — Solo-Developer Platform Authority Model

## Problem

Standard team workflows assume another human reviewer exists.

The current operating model is primarily:

```text
Chief
+
AI Engineering Agents
```

Requiring a permanent second human approval for all repository changes would create either:

- operational deadlock; or
- habitual administrator bypass.

Both are undesirable.

## Proposed Model

### R0

Read-only.

No approval required.

### R1

Reversible local change.

Machine verification is normally sufficient.

### R2

Boundary-affecting change.

Explicit Chief authorization is required.

### R3

High-impact action.

Mandatory explicit human authorization.

Agent execution remains restricted according to SAFRS.

## Platform Objective

GitHub should strongly enforce machine gates without requiring fictional human review for ordinary low-risk changes.

## Status

```text
RECOMMENDED — AWAITING APPROVAL
```

---

# D-003 — Renovate Dependency Automation Policy

## Problem

SAFRS v1.1 classifies dependency changes as R2 examples.

Current Renovate configuration may permit automated patch/minor merge behavior.

This creates a possible governance contradiction.

## Required Evidence Before Decision

Verify:

- actual Renovate configuration;
- actual package rules;
- current automerge behavior;
- current risk classifier behavior;
- whether dependency changes are automatically classified R2;
- how future GitHub rules would interact with Renovate.

Do not change SAFRS simply to legitimize current automation.

## Options

### Option A — Disable Dependency Automerge

All dependency changes require human authorization.

**Advantages**

- simplest model;
- strict SAFRS consistency.

**Disadvantages**

- more review burden;
- slower routine updates.

---

### Option B — Reclassify Selected Dependency Changes

Some low-impact dependency updates become R1.

**Advantages**

- consequence-based risk.

**Disadvantages**

- SAFRS policy change;
- requires formal decision;
- risk classifier becomes more complex.

---

### Option C — Bounded Patch-Only Automation

Patch updates may merge automatically only when approved machine gates succeed.

**Advantages**

- reduced operational burden;
- strong machine verification;
- narrower automation.

**Disadvantages**

- may still conflict with existing SAFRS v1.1 R2 semantics;
- requires explicit policy decision if implemented.

## Provisional Recommendation

Option C may eventually be appropriate.

No decision should be made before actual behavior is verified.

## Status

```text
OPEN — VERIFICATION REQUIRED
```

---

# D-004 — Solo-Developer R2 Authorization Model

## Problem

SAFRS requires human review for R2.

A solo-developer repository does not automatically have an independent second human reviewer.

GitHub also does not natively understand SAFRS risk tiers.

Therefore the practical meaning of R2 authorization must be defined explicitly.

## Required Model

R2 must remain materially different from R1.

The difference must not be ceremonial.

### Proposed R2 Flow

```text
Implementation
    ↓
Fresh Verification
    ↓
R2 Evidence Package
    ↓
Explicit Chief Review
    ↓
Explicit Authorization
    ↓
Merge
```

## R2 Evidence Package

At minimum:

- task identifier;
- risk classification;
- affected paths;
- why change is R2;
- public/boundary impact;
- migration/API/dependency impact where relevant;
- tests executed;
- verification results;
- architecture impact;
- rollback or reversibility notes;
- known unresolved risks.

## Authorization Requirement

Authorization must:

- be explicit;
- occur after verification;
- be recorded;
- not be inferred from implementation;
- not be granted automatically by an agent.

If Chief personally implemented the change, authorization still occurs as a distinct stage after verification.

Implementation and authorization must remain conceptually separate.

## Future Extension

When a reliable second human reviewer exists, selected sensitive R2 paths may additionally require independent human approval.

## Status

```text
PROPOSED — AWAITING APPROVAL
```

---

# 9. Remediation Phases

---

# PHASE 0A — ESTABLISH GROUND TRUTH

## Objective

Create one authoritative factual snapshot of the Monorepo before normal remediation begins.

This phase is read-only.

No repository source mutation is authorized.

Ignored build/cache artifacts created by verification commands are acceptable where unavoidable.

---

## 9.1 Git State

Verify:

- repository root;
- current branch;
- current commit SHA;
- upstream;
- ahead/behind state;
- tracked changes;
- untracked changes;
- ignored generated artifacts;
- staged changes.

---

## 9.2 Worktree State

For every worktree determine:

- filesystem path;
- branch;
- HEAD SHA;
- dirty state;
- task ownership;
- mutation owner;
- merge state;
- whether branch still exists;
- whether task is still active.

Resolve contradictory names such as:

```text
feat/database-100-ready
```

versus:

```text
fix-db-100-ready
```

before any merge planning.

---

## 9.3 Task Registry State

Identify:

- `PROPOSED`;
- `CLAIMED`;
- `PLANNED`;
- `EXECUTING`;
- `VERIFYING`;
- `REVIEW`;
- `MERGED`;
- `CLOSED`;
- `BLOCKED`;
- `CONFLICT`;
- `FAILED`;
- `ABORTED`;
- `SUPERSEDED`.

Detect:

- stale task;
- merged PR with active task;
- expired lease;
- task without worktree;
- worktree without task;
- missing owner;
- scope conflict.

---

## 9.4 GitHub Platform State

Verify directly:

### Repository

- visibility;
- default branch;
- branch protection;
- rulesets.

### Rules

- required pull request;
- required checks;
- review requirements;
- CODEOWNER requirements;
- force-push behavior;
- branch deletion;
- bypass actors;
- merge queue if present.

### Actions

- workflow list;
- triggers;
- current status;
- exact check names;
- whether `main` receives full CI;
- permissions.

### Security

- secret scanning;
- push protection;
- Dependabot;
- security updates;
- CodeQL if any;
- dependency review if any.

### Renovate

- actual configuration;
- effective package rules;
- automerge behavior.

---

## 9.5 Runtime State

Verify current status of:

- Docker;
- PostgreSQL;
- Golden Path;
- Control Center;
- Jaeger;
- relevant ports.

Record:

```text
RUNNING
STOPPED
UNAVAILABLE
UNKNOWN
```

Do not infer runtime health from source files.

---

## 9.6 Verification Baseline

Evaluate:

- lint;
- typecheck;
- package tests;
- repository tests;
- governance;
- security checks;
- build;
- database integration;
- functional E2E;
- visual E2E.

Every result records:

```text
Result
Fresh / Cached / Historical
Timestamp
Commit SHA
Required Environment
Observed Failure
```

---

## 9.7 Documentation Contradictions

Record every contradiction where:

```text
Documentation ≠ Repository
Repository ≠ Platform
Platform ≠ Runtime
Runtime ≠ Control Center
Control Center ≠ Verification
Verification ≠ Current Environment
```

No contradiction should be silently reconciled during Phase 0A.

Phase 0A records facts.

---

## 9.8 Deliverable

Create:

# MONOREPO GROUND TRUTH BASELINE v1

The baseline contains facts only.

Recommendations belong in the Master Plan or later execution specifications.

---

## 9.9 Exit Criteria

Phase 0A completes when material uncertainty has been removed regarding:

- Git state;
- worktrees;
- task state;
- GitHub state;
- runtime state;
- verification state;
- current contradictions.

Emergency containment actions, if any, must be recorded in the baseline.

---

# PHASE 0B — RESOLVE HUMAN DECISIONS

## Objective

Resolve policy questions that agents cannot decide autonomously.

Required decisions:

```text
D-001 Repository Visibility
D-002 Solo-Developer Platform Authority
D-003 Renovate Policy
D-004 Solo-Developer R2 Authorization
```

Each decision must become:

```text
APPROVED
REJECTED
DEFERRED WITH ACCEPTED RISK
```

No unresolved decision may silently become an implementation assumption.

---

# PHASE 1 — VERIFICATION INTEGRITY

## Objective

Make current verification trustworthy before stronger platform enforcement is enabled.

This is the most important technical remediation phase.

---

# 10. Phase 1.1 — Lint and Line-Ending Baseline

## Problem

Current lint reports hundreds of issues.

Audit evidence indicates many are likely associated with:

- LF/CRLF inconsistency;
- Windows checkout behavior;
- Biome `lineEnding: auto`;
- generated or local artifacts entering scan scope.

This must not be interpreted as hundreds of independent semantic defects without verification.

## Required Remediation

### Line Endings

Canonical tracked source:

```text
LF
```

### Formatter

Formatting behavior must be deterministic across platforms.

### Scope

Biome scope must clearly distinguish:

- tracked source;
- generated files;
- local agent artifacts;
- imported documentation;
- caches.

Files may only be excluded for a documented reason.

Do not use blanket ignores merely to make lint pass.

### Change Discipline

Do not mass-format unrelated dirty files.

Do not introduce unrelated refactors.

## Exit Criteria

On canonical clean checkout:

```text
pnpm lint
PASS
0 errors
```

---

# 11. Phase 1.2 — Test Cache Integrity

## Problem

Database integration results can potentially be replayed while PostgreSQL is unavailable.

That invalidates integration verification semantics.

## Required Policy

Recommended:

```text
Unit Tests               Cacheable
Contract Tests           Cacheable
Pure Repository Tests    Cacheable
Database Integration     Cache = False
E2E                      Cache = False
Visual E2E               Cache = False
```

Avoid building an unnecessarily complicated runtime fingerprint unless required later.

## Negative Test

Stop PostgreSQL.

Run database integration verification.

Expected result:

```text
FAIL
```

or:

```text
BLOCKED
```

It must not replay `PASS`.

## Exit Criteria

Service-dependent verification cannot produce successful fresh status from stale cache.

---

# 12. Phase 1.3 — Canonical Environment Contract

## Problem

Root commands currently behave inconsistently around required environment loading.

The operator should not need to understand hidden environment rituals.

## Required Outcome

These commands should behave predictably:

```text
pnpm run doctor
pnpm build
pnpm test
pnpm check
```

Environment loading must be consistent between:

- local execution;
- CI;
- tests;
- builds.

## Doctor Naming

Documentation must use:

```text
pnpm run doctor
```

when referring to the repository script.

This avoids collision with pnpm's own built-in command.

## Exit Criteria

Canonical commands have deterministic documented behavior.

---

# 13. Phase 1.4 — Database and Golden Path Readiness Closure

## Scope

Review the actual database-readiness worktree after its correct identity is established in Phase 0A.

This worktree may contain R2 schema changes.

No merge occurs before R2 authorization.

## Required End-to-End Proof

A fresh environment must demonstrate:

### Infrastructure

1. PostgreSQL starts successfully.

### Database

2. migrations apply from clean state;
3. seed executes successfully;
4. seed is deterministic where intended.

### Application

5. Golden Path starts successfully.

### Write

6. user creates a demo through the application;
7. API accepts validated request;
8. database stores the record.

### Read

9. API returns stored record;
10. UI displays stored record.

### Persistence

11. browser reload occurs;
12. stored record remains visible.

The proof is therefore:

```text
UI
 ↓
API
 ↓
Validation
 ↓
Database Write
 ↓
Database Read
 ↓
API Response
 ↓
UI
 ↓
Reload
 ↓
Persistent Data
```

This is the minimum acceptable Golden Path persistence proof.

---

## TransactionSample

If `TransactionSample` remains without:

- approved product requirement;
- API consumer;
- UI consumer;
- architectural role;

then its retention is speculative.

Removal should proceed through an approved R2 schema-change path.

Do not preserve unused schema merely because it already exists.

---

## Exit Criteria

Golden Path demonstrates real application-level read-after-write persistence.

---

# 14. Phase 1.5 — Visual Baseline Repair

## Problem

The current visual baseline image is represented by Git LFS pointer content rather than actual PNG binary data.

## Required Remediation

- materialize actual baseline;
- verify image signature;
- ensure Playwright consumes actual PNG;
- add defensive verification rejecting Git LFS pointer placeholders in snapshot paths.

## Exit Criteria

Visual E2E executes fresh against actual image content.

---

# 15. Phase 1.6 — Governance State Reconciliation

## Current Problem

Local governance can fail because repository ownership/task state is stale.

Examples may include:

- task still `EXECUTING` after PR merge;
- expired lease;
- stale worktree;
- task/branch mismatch.

This is not evidence that fail-closed governance is wrong.

It is evidence that lifecycle reconciliation is incomplete.

## Required Remediation

Correct actual stale state.

Do not weaken the checker.

Do not disable enforcement to obtain green output.

## Exit Criteria

Governance passes because repository state is correct.

---

# 16. PHASE 1 MASTER EXIT GATE

Phase 1 is complete only when all applicable verification succeeds with correct semantics:

```text
Lint                    PASS
Typecheck               PASS
Unit Tests              PASS
Contract Tests          PASS
Repository Tests        PASS
Database Integration    PASS — FRESH
Build                   PASS
Functional E2E          PASS — FRESH
Visual E2E              PASS — FRESH
Governance              PASS
Security Checks         PASS
```

Additional requirement:

No service-dependent verification may be falsely represented as fresh success.

No `NOT_APPLICABLE` gate may be presented as executed success.

No cached integration result may be treated as current runtime verification.

---

# PHASE 2 — PLATFORM ENFORCEMENT

## Objective

Convert repository governance from published signals into actual GitHub controls.

Phase 2 begins only after Phase 1 is stable, except for emergency containment.

---

# 17. Phase 2.1 — Full CI on Exact `main` SHA

## Problem

PR verification proves the PR head.

It does not necessarily prove the exact final merged commit.

## Required Remediation

Full CI must also run on:

```yaml
push:
  branches:
    - main
```

## Required Verification

The exact SHA that enters `main` must receive:

- install;
- lint;
- typecheck;
- tests;
- build;
- database checks where appropriate;
- browser smoke;
- governance;
- security verification.

## Exit Criteria

Every actual `main` SHA has corresponding full verification evidence.

---

# 18. Phase 2.2 — `main` Ruleset

Subject to D-002 and D-004 decisions.

Target platform posture:

```text
Pull Request Required                 YES
Required Status Checks                YES
Conversation Resolution               YES
Branch Must Be Current                YES
Force Push                            BLOCKED
Branch Deletion                       BLOCKED
Human Authorization                   RISK-TIERED
Bypass                                MINIMAL
```

Required status checks should include approved SAFRS and CI signals.

Generic second-human approval must not be enabled merely to imitate team workflows.

---

# 19. Phase 2.3 — R2 Enforcement Bridge

GitHub does not understand SAFRS R2 natively.

SAFRS classification must therefore feed machine-visible enforcement.

Potential flow:

```text
Change Detected
    ↓
SAFRS Risk Classification
    ↓
R0 / R1 / R2 / R3
    ↓
Required Gate Set
```

For R2:

```text
R2 Classification
    ↓
Fresh Verification
    ↓
Evidence Package
    ↓
Chief Authorization Record
    ↓
Merge Gate Satisfied
```

Implementation mechanics must follow D-004.

---

# 20. Phase 2.4 — Negative Enforcement Testing

Platform enforcement must be tested behaviorally.

Verify:

### Direct Push

Attempt prohibited direct push.

Expected:

```text
REJECTED
```

### Failed Check

PR with failing required check.

Expected:

```text
MERGE BLOCKED
```

### Missing Check

Expected:

```text
MERGE BLOCKED
```

### Force Push

Expected:

```text
REJECTED
```

### Branch Deletion

Expected:

```text
REJECTED
```

### R2 Without Authorization

Expected behavior must follow D-004.

### Exact `main` CI

Merge approved change.

Expected:

```text
Full CI Runs On Final main SHA
```

## Exit Criteria

The platform prevents prohibited behavior even when a user or agent attempts it.

---

# PHASE 3 — OPERATIONAL CONTROL CENTER

## Objective

Transform Control Center into the trusted operational surface of the Monorepo.

This is strategically important because the repository is being optimized for a solo operator who should not need routine terminal expertise to understand system state.

---

# 21. Phase 3.1 — Evidence Ladder

Replace one-dimensional status such as:

```text
Connected
```

with:

```text
Present
Configured
Runnable
Healthy Now
Last Verified
Enforced
```

Example:

```text
PostgreSQL

Present:         YES
Configured:      YES
Runnable:        YES
Healthy Now:     NO
Last Verified:   2026-08-xx
Enforced:        Fresh DB Integration Required
```

This prevents file existence from being interpreted as operational health.

---

# 22. Phase 3.2 — Verification Semantics

Control Center must distinguish:

```text
PASS
FAIL
NOT_APPLICABLE
BLOCKED
UNKNOWN
```

Where useful, display:

```text
Fresh
Cached
Historical
```

Every historical verification should display:

- timestamp;
- SHA;
- environment where relevant.

A stale green badge must not imply present health.

---

# 23. Phase 3.3 — Task Lifecycle Reconciliation

Control Center should detect:

```text
PR merged + task EXECUTING
Branch deleted + task active
Lease expired
Worktree missing
Task missing worktree
Owner missing
Conflicting mutation owner
```

It may recommend:

```text
RECONCILE
CLOSE
ABORT
SUPERSEDE
RECLAIM
```

It must not silently perform governance mutations requiring human authority.

---

# 24. Phase 3.4 — Minimal Local Process Supervisor

## Supported Targets

At minimum:

- PostgreSQL;
- Golden Path;
- Control Center;
- Jaeger.

## Supported Actions

```text
Start
Stop
Status
Bounded Log Tail
```

## Safety Requirements

- fixed executable;
- fixed argument patterns;
- no arbitrary shell;
- path containment;
- PID ownership;
- port collision detection;
- bounded logs;
- audit log;
- mutation confirmation;
- no R3 commands.

## Required Operator Experience

Chief should be able to answer:

- What is running?
- What is stopped?
- What failed?
- What port is occupied?
- What was last verified?
- What can I safely start?
- What requires approval?

without reconstructing state manually from the terminal.

## Exit Criteria

Routine Monorepo operation can be understood and managed from Control Center.

---

# PHASE 4 — VERIFICATION DEPTH

## Objective

After verification integrity is trustworthy, expand what the repository can prove.

---

# 25. Phase 4.1 — Coverage Baseline

Do not begin with arbitrary 90% coverage requirements.

Sequence:

```text
Measure
 ↓
Baseline
 ↓
Prevent Regression
 ↓
Critical-Control Thresholds
 ↓
Changed-Code Coverage
```

Priority targets:

- command executor;
- path containment;
- database reset guard;
- task contract;
- risk classifier;
- lease logic;
- API validation;
- security-sensitive helpers.

Coverage is evidence.

It is not a quality score by itself.

---

# 26. Phase 4.2 — API Compatibility Gate

Compare API surface to `main`.

Detect:

- route removal;
- required field addition;
- field type narrowing;
- incompatible response change;
- status-code change;
- public contract break.

Breaking shared/public API change should generally escalate to R2.

---

# 27. Phase 4.3 — Migration Drift Gate

Use disposable PostgreSQL verification.

Prove:

- migrations apply from zero;
- resulting database is consistent;
- seed succeeds;
- idempotency where intended;
- destructive changes are detected;
- schema and migration history remain aligned.

Future optional extension:

- restore drill;
- migration upgrade path fixtures.

Do not add these until a concrete requirement exists.

---

# 28. Phase 4.4 — Control Center E2E

Minimum test cases:

### Runtime

- Control Center loads with Docker unavailable.
- Database state appears unhealthy rather than connected.

### Command Safety

- unknown command rejected;
- disallowed arguments rejected;
- traversal rejected;
- mutation requires confirmation;
- R3 unavailable.

### Audit

- command execution recorded;
- audit write failure surfaced.

### Security

- sensitive values are not accidentally rendered.

## Exit Criteria

Critical operator-control behavior is covered by browser-level verification.

---

# PHASE 5 — SUPPLY-CHAIN AND PLATFORM SECURITY DEPTH

## Objective

Increase security assurance after repository truth and enforcement are stable.

Do not add security tooling merely to accumulate checks.

Every control must have a purpose and owner.

---

# 29. Phase 5.1 — Dependency Review

Add PR-time visibility into newly introduced dependency risk.

Potential policy:

- block high/critical vulnerable additions;
- identify prohibited licenses;
- show new transitive dependencies;
- produce evidence for dependency-changing R2 decisions.

---

# 30. Phase 5.2 — pnpm Trust Policy

Evaluate:

```text
trustPolicy: no-downgrade
```

Adopt only after validating compatibility with current pnpm behavior and repository needs.

---

# 31. Phase 5.3 — SBOM

Prefer package-manager-native functionality first.

Generate SBOM where it provides actual value for:

- dependency inventory;
- release evidence;
- incident investigation;
- security review.

Avoid adding an additional SBOM ecosystem without need.

---

# 32. Phase 5.4 — CodeQL

Add JavaScript/TypeScript static analysis where supported.

CodeQL supplements:

- tests;
- manual review;
- SAFRS controls.

It does not replace them.

---

# 33. Phase 5.5 — OpenSSF Scorecard

Evaluate after D-001 repository visibility is settled.

Add only if the resulting signal is useful.

Do not adopt merely for a badge.

---

# 34. Phase 5 Exit Criteria

Every added security control must have:

```text
Purpose
Owner
Execution Trigger
Failure Semantics
Evidence
Remediation Path
```

No unexplained security workflow should exist.

---

# PHASE 6 — MONOREPO PERFORMANCE OPTIMIZATION

## Objective

Improve speed only after correctness is trustworthy.

---

# 35. Phase 6.1 — Turbo Task Contract

Review and correct:

- task inputs;
- task outputs;
- environment hashing;
- global dependencies;
- false output declarations;
- coverage outputs not actually produced;
- package build output mismatches;
- integration caching.

Correctness comes before cache efficiency.

---

# 36. Phase 6.2 — Affected PR Lane

Potential PR workflow:

```text
turbo run lint typecheck test build --affected
```

Governance and sensitive-path verification may remain full where risk requires.

---

# 37. Phase 6.3 — Full `main` Lane

`main` remains fully verified.

Affected execution is an optimization for PR feedback.

It must not weaken canonical branch assurance.

---

# 38. Phase 6.4 — Remote Cache

Remote cache should only be considered after:

- task hashes are correct;
- inputs are correct;
- outputs are correct;
- integration tests are non-cacheable where required;
- sensitive artifacts are excluded;
- cross-branch trust is understood.

Remote cache is a performance tool.

It is not a verification control.

---

# 39. Explicitly Deferred

The following remain intentionally outside remediation scope:

- Nx migration;
- moonrepo migration;
- pnpm experimental major migration;
- Node Current migration merely because it is newer;
- production deployment;
- authentication;
- authorization;
- tenant isolation;
- Corpus Engine merge;
- AI runtime expansion;
- Electron;
- WXT;
- speculative Python platform;
- complex release system;
- broad observability redesign;
- premature SLO infrastructure;
- unnecessary microservices;
- unrelated product features.

Deferral is deliberate.

It is not technical debt unless a real requirement appears.

---

# 40. Definition of Operationally Ready

The Sentra Monorepo may only be declared:

# OPERATIONALLY READY

when all of the following are true.

---

## OR-1 — Verification Integrity

A green verification status means the appropriate verification actually executed and succeeded.

No stale cache or `NOT_APPLICABLE` state masquerades as success.

---

## OR-2 — Exact `main` Verification

Every final SHA entering `main` receives the required complete verification.

---

## OR-3 — Platform Enforcement

Important governance controls are actually enforced by GitHub.

They do not exist only as repository documentation.

---

## OR-4 — Runtime Truth

Control Center distinguishes:

```text
Present
Configured
Runnable
Healthy Now
Last Verified
Enforced
```

---

## OR-5 — Governance Truth

SAFRS states accurately reflect:

- task state;
- lease state;
- ownership;
- risk;
- approval;
- verification;
- platform enforcement.

---

## OR-6 — Documentation Truth

Canonical documentation matches approved current architecture and operational reality.

---

## OR-7 — Solo-Developer Operability

Routine operations do not require Chief to reconstruct repository state manually from multiple terminal commands.

---

## OR-8 — Human Authority

Risk-sensitive actions cannot be silently approved by agents or automation.

---

## OR-9 — Minimal Complexity

No major technology or platform component exists without a demonstrated need.

---

# 41. Remediation Completion Standard

A remediation item is not complete merely because code exists.

Every item must have:

1. verified problem;
2. baseline evidence;
3. bounded scope;
4. risk classification;
5. implementation;
6. fresh verification;
7. evidence;
8. appropriate human authorization;
9. required documentation update;
10. no unexplained collateral change.

For R2 or R3 work, authorization must follow the approved governance model.

---

# 42. Remediation Work Package Structure

Every implementation phase should be decomposed into bounded work packages.

Each package should define:

```text
Task ID
Objective
Problem Statement
Current Evidence
Scope
Out of Scope
Risk Tier
Mutation Owner
Allowed Paths
Forbidden Paths
Verification Commands
Exit Criteria
Required Human Approval
```

This allows agents to work from narrow execution contracts rather than the entire strategic plan.

---

# 43. Immediate Execution Sequence

After Master Plan approval:

```text
PHASE 0A
Establish Ground Truth
        ↓
PHASE 0B
Resolve Human Decisions
        ↓
PHASE 1
Verification Integrity
        ↓
PHASE 2
Platform Enforcement
        ↓
PHASE 3
Operational Control Center
        ↓
PHASE 4
Verification Depth
        ↓
PHASE 5
Supply-Chain and Platform Security
        ↓
PHASE 6
Performance Optimization
```

No unrelated feature expansion should bypass this sequence without explicit Chief authorization.

---

# 44. First Authorized Work Package

The first work package must be read-only.

No code modification is authorized.

The first output is:

# MONOREPO GROUND TRUTH BASELINE v1

---

## 44.1 Repository State

Record:

```text
Repository
Visibility
Default Branch
Current Branch
Current SHA
Upstream
Ahead / Behind
Tracked Changes
Untracked Changes
Ignored Generated Changes
```

---

## 44.2 Worktree State

For each worktree:

```text
Path
Branch
SHA
Dirty State
Task
Mutation Owner
Merge State
Lease State
```

---

## 44.3 SAFRS State

Record:

```text
Task Registry
Ownership
Active Leases
Risk Classifications
Gate Status
Approval State
Evidence State
```

For every gate distinguish:

```text
PASS
FAIL
NOT_APPLICABLE
BLOCKED
UNKNOWN
```

---

## 44.4 GitHub State

Record:

```text
Visibility
Rulesets
Branch Protection
Required Checks
Review Requirements
Bypass Actors
CI Triggers
Secret Scanning
Push Protection
Dependabot
Renovate
Security Workflows
```

---

## 44.5 Runtime State

Record:

```text
Docker
PostgreSQL
Golden Path
Control Center
Jaeger
Ports
```

---

## 44.6 Verification State

For every command:

```text
Command
Result
Fresh / Cached / Historical
Timestamp
Commit SHA
Environment Dependencies
Observed Failure
```

---

## 44.7 Contradiction Register

Explicitly record:

```text
Documentation ≠ Platform
Platform ≠ Repository
Repository ≠ Runtime
Runtime ≠ Control Center
Control Center ≠ Verification
Verification ≠ Current Environment
```

---

## 44.8 Emergency Containment Record

If Emergency Containment Exception is used, record:

```text
Condition
Evidence
Risk
Authorization
Action
Timestamp
Reversibility
Remaining Exposure
Follow-Up Required
```

---

# 45. Weekly Remediation Review

Every seven days, or at phase completion if sooner, produce a short remediation status report.

Required fields:

```text
Current Phase
Current Work Package
Evidence Added
Completed Exit Criteria
Remaining Exit Criteria
Active Blockers
Open Chief Decisions
Risk Escalations
Scope Changes
Next Authorized Action
```

The checkpoint does not redefine scope.

It does not create artificial deadlines.

It exists to keep remediation visible and bounded.

---

# 46. Canonicality and Documentation

This Master Remediation Plan is a time-bounded execution plan.

It does not become canonical architecture.

Its purpose is:

> describe how the remediation will be executed.

When remediation changes actual architecture or operational truth:

- canonical architecture documentation must be updated;
- this plan itself must not be treated as the source of current architecture.

When remediation is completed:

```text
ACTIVE
 ↓
COMPLETED
 ↓
ARCHIVED
```

The plan must not remain an active architectural authority afterward.

---

# 47. Explicit Non-Goals of the Master Plan

This plan does not attempt to:

- redesign SAFRS;
- replace the Monorepo stack;
- maximize test coverage numerically;
- maximize the number of security tools;
- optimize CI before verification correctness;
- introduce production architecture;
- solve unrelated product problems;
- define healthcare governance;
- define commercial procurement posture;
- expand Sentra product scope.

The focus remains exclusively:

> **repairing and strengthening the Monorepo.**

---

# 48. Final Governing Principle

The target state is not:

> “Everything exists.”

The target state is not:

> “Everything has a script.”

The target state is not:

> “Everything is green.”

The target state is:

> **Every critical capability is present where required, correctly configured, executable, currently observable, objectively verified, appropriately enforced, and controlled by the correct human authority.**

And it must achieve this without making the repository unnecessarily complicated.

For the Sentra Monorepo, operational maturity therefore means:

```text
Truthful
+
Verifiable
+
Enforced
+
Auditable
+
Human-Governed
+
Simple to Operate
```

That is the standard against which all remediation work will be evaluated.

---

# 49. Approval State

**Master Remediation Plan v0.2**

Current status:

```text
DRAFT FOR FINAL APPROVAL
```

No repository mutation is authorized by this document alone.

Upon approval, the next authorized artifact is:

# PHASE 0A — EXECUTION SPECIFICATION

Role:

```text
Observer / Analyst
```

Risk:

```text
R0
```

Mutation authority:

```text
NONE
```

Primary deliverable:

# MONOREPO GROUND TRUTH BASELINE v1

Only after the Ground Truth Baseline is complete and the required Chief decisions are resolved may Phase 1 remediation begin.
