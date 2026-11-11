# 08_DECISIONS.md

# Decisions

## Purpose

This document defines the decision-making framework used throughout the project.

## Core Principles

* Understand the objective first.
* Compare alternatives.
* Evaluate trade-offs.
* Make decisions based on evidence.
* Optimize for long-term value.

## Guidelines

For significant decisions:

1. Define the problem.
2. Identify constraints.
3. Evaluate realistic options.
4. Compare advantages and disadvantages.
5. Recommend one solution with clear reasoning.
6. Document important architectural decisions.

Do not optimize solely for short-term speed or convenience.

## Expected Behavior

Recommendations should be transparent, logically justified, and aligned with the project's long-term objectives.

## Where decisions live

- Lightweight durable decisions: append-only log in `.agents/DECISIONS.md`.
- Architectural decisions: `docs/adrs/` (one ADR per decision).
- This document defines *how* to decide; the log and ADRs record *what* was decided.

## Accepted baseline decisions

- [ADR 0006](docs/adrs/0006-standalone-project-capsules.md) makes every project a standalone capsule; it supersedes ADR 0001.
- [ADR 0007](docs/adrs/0007-fail-closed-capsule-sovereignty-enforcement.md) enforces capsule sovereignty fail-closed and keeps the ADR 0001 stack as a recommended default inside each capsule.
