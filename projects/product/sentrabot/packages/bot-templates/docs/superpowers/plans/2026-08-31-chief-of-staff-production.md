# Chief of Staff Production Starter Repository Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a verified, production-oriented Chief of Staff starter repository with a typed contract model, approval engine, template registry, 36+ role packages, evaluation assets, governance pack, design system, and packaging.

**Architecture:** Role packages are declarative JSON plus prompt overlays, interpreted by small dependency-free TypeScript modules. Safety boundaries are implemented as policy decisions rather than prompt-only instructions. Governance, UI, evaluation, and source provenance are versioned alongside the runtime contracts.

**Tech Stack:** Node.js 22+, TypeScript 5.x, Node test runner, JSON, JSON Schema artifacts.

**Spec:** `docs/superpowers/specs/2026-08-31-chief-of-staff-production-design.md`

## Global Constraints
- Default authority is `prepare`.
- Consequential actions use explicit approval categories.
- Memory is not an authoritative source for consequential decisions.
- Bot identity is not treated as a security boundary.
- No runtime npm dependencies in the starter core.
- All templates carry a semantic version and evaluation manifest.

---

### Task 1: Repository foundation and domain contracts
**Files:** create `package.json`, `tsconfig.json`, `src/domain/types.ts`, `schemas/*.schema.json`.
**Produces:** shared `BotTemplate`, `ActionRequest`, `PolicyDecision`, and evaluation types.
- [x] Create repository metadata and TypeScript configuration.
- [x] Define JSON schemas for template, authority, output, evaluation, and governance artifacts.
- [x] Run JSON parse checks on all schema files.

### Task 2: Template validator — TDD
**Files:** create `tests/template-validator.test.ts`, then `src/validation/template-validator.ts`.
**Produces:** `validateTemplate(template: BotTemplate): ValidationResult`.
- [x] Write validator tests for valid template and key invariant failures.
- [x] Run build/test and observe failure before implementation.
- [x] Implement minimum validator.
- [x] Run tests until green.

### Task 3: Approval policy engine — TDD
**Files:** create `tests/approval-engine.test.ts`, then `src/policy/approval-engine.ts`.
**Produces:** `decideAction(template, action): PolicyDecision`.
- [x] Write tests for DENY precedence, mandatory approval, observe/prepare limits, and explicitly allowed low-risk execution.
- [x] Run and observe failure.
- [x] Implement decision engine.
- [x] Run tests until green.

### Task 4: Prompt compiler — TDD
**Files:** create `tests/prompt-compiler.test.ts`, then `src/runtime/prompt-compiler.ts`, `core/*.md`.
**Produces:** `compilePrompt(layers): string`.
- [x] Write tests for deterministic layer order and safety-boundary preservation markers.
- [x] Run and observe failure.
- [x] Implement compiler.
- [x] Run tests until green.

### Task 5: Template registry — TDD
**Files:** create `tests/template-registry.test.ts`, then `src/registry/template-registry.ts`, `templates/registry.json`.
**Produces:** `loadRegistry()` and `findTemplate(id)`.
- [x] Write registry tests.
- [x] Run and observe failure.
- [x] Implement registry loader.
- [x] Run tests until green.

### Task 6: Build 36+ complete role packages
**Files:** `templates/<domain>/<role>/template.json`, `ROLE.md`, `evals.json`.
**Produces:** catalog of deployable role definitions across all required domains.
- [x] Generate role packages from a reviewed catalog.
- [x] Validate completeness and unique IDs.
- [x] Regenerate registry from role paths.

### Task 7: Evaluation assets and CLI — TDD for CLI behavior
**Files:** `evals/*`, `tests/cli.test.ts`, `src/cli/validate-templates.ts`.
**Produces:** repository-wide validation command and reusable adversarial cases.
- [x] Write CLI test that expects zero validation failures for shipped templates.
- [x] Observe failure before CLI implementation.
- [x] Implement CLI.
- [x] Add golden/adversarial scenario packs.
- [x] Run tests until green.

### Task 8: Governance, security, and 2026 source provenance
**Files:** `governance/*`, `docs/ARCHITECTURE.md`, `docs/THREAT_MODEL.md`, `docs/INDONESIA_GOVERNANCE.md`, `docs/SOURCES.md`, `docs/EVALUATION_STRATEGY.md`, `docs/OBSERVABILITY.md`.
**Produces:** deployer-facing governance and risk documentation with dated source provenance.
- [x] Encode policy hierarchy and Indonesia baseline.
- [x] Document shared-computer, prompt-injection, excessive-agency, stale-data, and approval risks.
- [x] Record verified sources and access date.

### Task 9: Product/UI design system and examples
**Files:** `ui/*`, `examples/*`.
**Produces:** product-grade builder IA, tokens, card/authority patterns, static reference mockup, and three full example configurations.
- [x] Add design tokens and interaction/state specification.
- [x] Add builder information architecture and authority control patterns.
- [x] Add static mockup.
- [x] Add Clara, Atlas, and Lex examples.

### Task 10: Documentation, verification, and packaging
**Files:** `README.md`, `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md`, `deployment/*`.
**Produces:** release-ready starter repository ZIP.
- [x] Write operator-facing README and deployment checklists.
- [x] Run `npm run build`, `npm test`, and `npm run validate:templates` fresh.
- [x] Verify template count, file count, and archive integrity.
- [x] Create ZIP and checksum manifest.
