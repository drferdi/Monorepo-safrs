# Sentra-GSAP Standard v1.0

**Status:** Active  
**Owner:** Sentra Artificial Intelligence  
**Effective:** 2026-08-25

## Purpose

Sentra-GSAP makes high-quality GSAP implementation a repository execution contract rather than an optional style guide. A user may invoke `/Sentra-GSAP` without knowing implementation details; the agent is responsible for selecting sound architecture, implementing it, proving it in browsers, and refusing a production-ready claim until the required gates pass.

## Authority hierarchy

1. Human operator's explicit instruction.
2. Repository `AGENTS.md` / `CLAUDE.md` Sentra-GSAP routing block.
3. `.agents/skills/sentra-gsap/SKILL.md` — canonical operational standard.
4. Skill reference files — technical detail loaded on demand.
5. Sentra-GSAP verifier — machine-enforced evidence gate.
6. This document — human-readable governance summary.

This document does not duplicate all GSAP implementation rules; the skill is canonical to prevent drift.

## Meaning of `/Sentra-GSAP`

The directive means: build or modify the requested frontend using the complete Sentra GSAP workflow, not merely “use GSAP somewhere.” It includes architecture, intentional motion design, responsive variants, touch, reduced motion, lifecycle cleanup, performance, accessibility, browser QA, production build, and visual-quality review.

## Quality principle

More animation is not higher quality. The target is intentional, coherent, responsive, performant, accessible, maintainable motion. Native scrolling and the minimum plugin set are the default until a concept justifies more complexity.

## Completion rule

Only the final verifier may produce a Sentra-GSAP PASS. Any required gate that fails or is not run makes the overall result FAIL. The agent must not describe a failing implementation as production-ready.

## Non-technical operator contract

The operator is not expected to choose implementation details such as lifecycle hooks, easing primitives, smooth-scroll libraries, breakpoints, or ScrollTrigger options. The executing agent owns those choices under the standard and escalates only material product/design trade-offs.

## Change control

Changes to canonical rules require a versioned update to the skill, relevant tests/verifier logic, and this changelog when user-facing behavior changes. Do not maintain competing copies of the same rule across repo documents.
