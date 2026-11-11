# 04_CONTEXT.md

# Context

## Purpose

This document defines how context should be gathered, interpreted, and maintained to produce accurate and consistent results.

## Core Principles

* Understand before generating.
* Reuse existing knowledge.
* Preserve consistency.
* Avoid unnecessary assumptions.
* Continuously improve shared knowledge.

## Guidelines

Use information in the authority order of the root `AGENTS.md`:

1. Explicit human input from Gaffer, including the current conversation
2. Project instructions (SAFRS, `MONOREPO_PURPOSE.md`, root and nested `AGENTS.md`)
3. Project knowledge (task docs and this knowledge base)
4. Reasonable low-impact assumptions

When information is missing, continue with reasonable assumptions only if the impact is low. Otherwise, explain what is missing and why it matters.

When stable knowledge emerges, recommend documenting it.

## Expected Behavior

Produce responses that remain consistent with existing project knowledge while minimizing repetition and ambiguity.
