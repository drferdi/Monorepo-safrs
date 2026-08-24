---
title: SAFRS Monorepo Purpose
status: CANONICAL
subject: safrs-monorepo-purpose
authority: architecture
---

# SAFRS Monorepo Purpose

## Mission

The SAFRS Monorepo exists to let a single human Chief operate many software projects through autonomous AI engineering with minimal manual work.

Its operating model is:

**Human-Governed · Agent-Executed · Machine-Enforced**

The human defines objectives, policy, authority boundaries, and genuine high-impact decisions.

Agents perform engineering work end to end inside the authority already granted to them.

Machines enforce deterministic constraints, verification, isolation, and evidence.

The Monorepo is successful only when it reduces human operational burden while increasing engineering reliability.

## What the Monorepo is

The Monorepo root is an AI engineering control plane.

It may provide:

- project discovery;
- agent orchestration;
- task routing;
- policy enforcement;
- risk classification;
- project health reporting;
- dependency and maintenance automation;
- verification;
- evidence generation;
- release coordination;
- templates;
- optional synchronization of generated assets;
- portfolio-wide observability.

These capabilities operate on projects. They must not become hidden runtime or build requirements of projects.

## What a project is

Every project under `projects/` is a sovereign capsule.

A project owns everything required for its normal software lifecycle, including as applicable:

- source code;
- manifests;
- dependency lock state;
- runtime versions;
- configuration;
- environment contract;
- local first-party packages;
- tests;
- schemas;
- migrations;
- infrastructure definitions;
- build configuration;
- deployment definition;
- operational documentation.

A project may depend on explicitly declared external systems or versioned artifacts.

A project must not depend on the Monorepo root merely because it currently lives inside the Monorepo.

# Fundamental Invariants

## I-01 — Project Sovereignty

Every project must remain independently installable, configurable, testable, buildable, runnable, packageable, and deployable or deployment-dry-runnable after extraction outside the Monorepo.

## I-02 — Root Optionality

Deleting access to the Monorepo root must not break the normal lifecycle of an extracted project.

The root may improve convenience. The root may not be required for project survival.

## I-03 — No Hidden Parent Dependency

A project must not resolve required code, configuration, dependency state, tooling, infrastructure, runtime state, or secrets from above its capsule root.

Prohibited examples include:

- root lockfile;
- root dependency catalog;
- root workspace package required at project runtime/build time;
- root TypeScript configuration;
- root build wrapper;
- root `.env`;
- root database package;
- root Docker build context;
- parent-path imports into root source;
- direct source dependency on another project.

Explicit versioned external dependencies are allowed.

## I-04 — Human Governs, Agents Execute

Chief determines purpose, allowed scope, policy, risk boundaries, genuine architecture/product decisions, production authority, and irreversible high-impact authorization.

Agents determine routine implementation details inside the approved envelope.

The system must not require Chief to act as terminal operator, task-state janitor, or per-command confirmation service.

## I-05 — Machine Handles Deterministic Governance

If a governance outcome is mechanically determinable, the machine should resolve or enforce it.

Examples:

- stale/orphan task claim detection;
- scope collision detection;
- project independence checks;
- verification execution;
- link integrity;
- dependency-boundary checks;
- evidence integrity;
- secret detection;
- required merge checks.

Human interruption is reserved for uncertainty or authority, not deterministic bookkeeping.

## I-06 — Executable Evidence Beats Assumption

Architecture claims must be proven by executable evidence where feasible.

A project is standalone only when an isolated extraction test proves it.

## I-07 — Existing Mistakes Do Not Redefine Purpose

Existing implementation patterns do not become architectural truth merely because they are widespread.

If the codebase systematically contradicts an approved invariant, classify the implementation as non-conformant.

## I-08 — Simplicity Is a Control

Prefer a small number of strong, machine-enforced invariants over conversational approvals and brittle procedural gates.

## I-09 — Autonomy Inside Isolation

Execution isolation exists to enable safe agent autonomy.

Within an approved sandbox/worktree/scope, routine reversible engineering actions should proceed without repeated human approval.

Strict human gates remain for genuinely high-impact or irreversible actions.

## I-10 — State-of-the-Art Without Churn

Adopt modern engineering and agentic practices when they materially improve autonomy, reproducibility, safety, observability, supply-chain assurance, maintainability, or operator simplicity.

Do not migrate frameworks merely because newer alternatives exist.

# Operator Experience Target

The desired experience is:

> Chief gives an objective. The system determines project context, routes work, executes, retries, verifies, and returns a concise result.

Chief should not have to manually:

- run routine package-manager commands;
- resolve stale claims;
- repair task metadata;
- repeat tests;
- retry failed builds;
- locate project commands;
- interpret routine CI noise;
- approve every file write;
- approve every local tool invocation.

# Root Responsibilities

The root should own Monorepo-wide control-plane capabilities:

- SAFRS constitution and machine policy;
- project discovery;
- contract schemas;
- orchestration;
- multi-project inventory;
- governance checkers;
- cross-project reporting;
- agent adapters;
- templates;
- maintenance automation;
- extraction-test orchestration;
- governance evidence.

The root must not become a required source package or runtime dependency of project capsules.

# Project Responsibilities

Each capsule should own:

- its local workspace if needed;
- dependency manifests;
- dependency lockfile;
- build/test configuration;
- first-party packages;
- environment schema/example;
- database schema/migrations when applicable;
- infrastructure;
- deployment contract;
- local tests;
- project documentation.

A root convenience command may call local project commands, but must not replace them.

# Allowed External Dependencies

Standalone does not mean dependency-free.

Allowed dependencies include explicit and reproducible package registries, container images, databases, hosted APIs, SaaS platforms, model providers, object stores, queues, versioned shared artifacts, and operating-system services.

# Architectural Test Oracle

When evaluating any implementation, ask:

1. Does this reduce Chief's manual operational burden?
2. Does this increase agent end-to-end execution capability?
3. Does this preserve project sovereignty?
4. Does this keep root optional?
5. Can the rule be machine-enforced?
6. Does it create human interruption for a deterministic outcome?
7. Does it improve reliability without unnecessary complexity?
8. Can the claim be proven by executable evidence?

# Definition of Success

The Monorepo is aligned with purpose when:

- each capsule proves independent lifecycle execution after extraction;
- root orchestrates projects without being required by them;
- agents can complete normal sandbox engineering without conversational micromanagement;
- deterministic governance self-enforces or self-reconciles;
- genuine risk boundaries still stop execution appropriately;
- project/repository health is machine-verifiable;
- Chief receives concise decisions and outcomes rather than infrastructure noise.
