---
title: SAFRS Agent Autonomy Model
status: CANONICAL
subject: agent-autonomy
authority: governance
---

# SAFRS Agent Autonomy Model

## Purpose

Preserve human authority without turning the human into the operator of routine agent work.

## Principle

**Human authority defines the envelope. Agents operate inside the envelope. Machines enforce the envelope.**

The existence of an approval boundary does not imply per-command approval.

## Work-Package Authorization

Chief may authorize a bounded work package defining:

- objective;
- writable scope;
- forbidden scope;
- risk tier;
- allowed environment;
- production prohibition if applicable;
- completion criteria.

Once authorized, the Implementer may autonomously choose normal implementation steps required to complete it.

## Routine Sandbox Actions

Within an authorized sandbox/worktree and bounded scope, routine reversible actions should normally be allowed without repeated human confirmation:

- read/search;
- create/modify files;
- delete recoverable scoped files;
- install development dependencies;
- run package managers;
- lint/typecheck/test/build;
- run local services;
- use local Docker;
- debug/retry;
- refactor within scope;
- generate temporary artifacts;
- run local migrations against disposable data;
- invoke approved developer tools;
- delegate read-only analysis/review when permitted.

Conversation should not be the primary enforcement mechanism.

## Genuine Human Gates

Stop and request human authority for:

- R3 action;
- production deployment;
- production credential use/rotation;
- irreversible mutation of real data;
- critical clinical/safety algorithm change;
- material architecture/product ambiguity;
- material scope expansion beyond the approved work package;
- active mutation conflict on the same bounded scope;
- destructive action that cannot be safely recovered;
- legal/compliance decisions reserved for the human.

## Deterministic Governance Must Self-Resolve

### Stale task claim

If no active mutation owner can be demonstrated:

- record evidence;
- transition the stale claim to a valid terminal/superseded state;
- continue.

### Inherited verification failure

If a failure demonstrably predates the authorized task:

- record it as inherited baseline state;
- evaluate the task delta;
- prevent new unexplained regression;
- continue unrelated work.

### Active collision

If another live writer owns the same bounded mutation scope:

- block;
- identify the concrete collision;
- require ownership resolution.

## Risk Escalation

Do not escalate merely because many files are involved, debugging is difficult, tests require retries, package installation is needed, or local configuration changes are required within scope.

Risk is about consequence, reversibility, privilege, blast radius, and data sensitivity.

## Chief Experience Requirement

A successful workflow should permit:

> "Fix Sentrabot and verify it."

The system should handle routine context loading, planning, task state, implementation, installation, debugging, retries, testing, build, smoke checks, evidence, and concise reporting.

Chief should receive decisions, exceptions, and outcomes—not repository housekeeping.

## Governance Friction Test

For every stop/approval mechanism, ask:

1. What concrete harm does this prevent?
2. Is the harm within the current task envelope?
3. Can the correct result be determined mechanically?
4. Does the interruption require human judgment or merely human clicking?
5. Can isolation or machine enforcement provide equivalent protection?

If no genuine human judgment is required, redesign toward machine handling.

## Safety Preserved

This model does not remove trust boundaries, credential isolation, execution isolation, risk escalation, single-writer ownership, architecture verification, verification integrity, or human authority for high-impact actions.

It removes governance theater.
