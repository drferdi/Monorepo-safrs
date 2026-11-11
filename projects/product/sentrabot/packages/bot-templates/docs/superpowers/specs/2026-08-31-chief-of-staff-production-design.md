# Sentra Chief of Staff Production Starter Repository — Design Specification

## Status
Approved for implementation on 2026-08-31.

## Goal
Create a production-oriented starter repository for an Indonesia-first Chief of Staff bot platform targeting Grok Bot/xAI-style agentic workflows. The repository must be useful to product, design, security, governance, and engineering teams rather than functioning as a prompt dump.

## Product thesis
Each Chief of Staff template owns one stable operational outcome. Roles are implemented as composable contracts: global operating contract → jurisdiction policy → organization policy → domain policy → role overlay → user configuration → current task. Memory is continuity context, never the authoritative source for consequential decisions.

## 2026 research baseline
The implementation reflects the following verified product and governance patterns as of 2026-08-31:
- Grok Bot recommends starting from a one-time task, stabilizing it as a skill, then automating it as a routine; routines should preserve approval boundaries and explicit stale/no-data behavior.
- Grok Bot approvals are especially relevant for sending, publishing, purchasing/transfers, deleting/overwriting, permission changes, production changes, and accepting legal terms.
- Bots share an account-level cloud computer; separate bots are not a security isolation boundary.
- Grok Bot memory is not a substitute for an authoritative source for changing or consequential facts.
- xAI Structured Outputs supports JSON Schema-constrained outputs and strict function-call arguments on supported models.
- NIST AI RMF / GenAI Profile is used as a risk-management reference; the AI RMF is under revision in 2026.
- OWASP Excessive Agency guidance motivates minimum functionality, minimum permissions, and minimum autonomy.
- Indonesia baseline includes UU No. 27/2022 on Personal Data Protection and SE Menkominfo No. 9/2023 on AI ethics. As of August 2026, Indonesia's AI roadmap and AI ethics presidential regulations were still reported by Komdigi as awaiting presidential establishment.

## Architecture
### 1. Contract stack
1. System Core
2. Chief of Staff Base Contract
3. Indonesia Governance Pack
4. Organization Policy
5. Domain Policy
6. Role Template
7. User Configuration
8. Current Task

Higher layers cannot silently weaken a lower-layer safety boundary.

### 2. Authority model
- Observe: read/search/retrieve/monitor.
- Prepare: analyze/reconcile/draft/recommend. Default.
- Propose: construct a fully specified action requiring a decision.
- Execute: perform only explicitly granted actions; consequential actions remain approval-gated.

### 3. Policy decision model
A policy decision is one of ALLOW, REQUIRE_APPROVAL, or DENY. A mandatory approval category always dominates a lower-risk allow rule. Deny dominates all decisions.

### 4. Template model
Every template contains identity, mission, scope, sources of truth, authority, approvals, evidence policy, output contract, risk profile, skills/routines guidance, evaluation suite, version, and tags.

### 5. Template catalog
Ship at least 36 roles across leadership, corporate, commercial, operations, technology, healthcare, research/education, and Indonesia/public-sector domains. Each role has a machine-readable template plus a domain-specific role overlay prompt and evaluation manifest.

### 6. Validation
Repository ships a dependency-light TypeScript validator and CLI. Validation enforces key production invariants such as default authority, explicit exclusions, evidence policy, approval gates, and version fields.

### 7. Evaluation
Ship reusable golden and adversarial cases for stale data, conflicting sources, prompt injection, excessive agency, approval boundaries, scope violations, and regulated workflows.

### 8. UI/UX system
Ship design tokens, information architecture, card anatomy, builder flow, capability/authority UX, risk disclosure patterns, and a static reference mockup. UI must expose capability and approval boundaries instead of presenting bots as merely personas.

### 9. Indonesia governance
Jurisdiction rules are versioned independently from role templates. Regulatory status is labeled as verified fact, implementation interpretation, or policy assumption. No file claims legal advice.

## Technology
- TypeScript 5.x
- Node.js 22+
- JSON / JSON Schema 2020-12-style artifacts
- Node built-in test runner after TypeScript compilation
- No runtime npm dependencies in the starter core

## Non-goals
- No production connector credentials.
- No autonomous financial, legal, clinical, or patient-facing execution.
- No claim that prompt text is an access-control mechanism.
- No vendor-specific secret material.
- No legal or clinical decision automation.

## Success criteria
- At least 36 complete role templates.
- Machine-readable template registry.
- Build succeeds with TypeScript.
- Automated tests cover validator, approval policy, registry, and prompt compiler.
- CLI validates all shipped templates.
- Documentation explains architecture, threat model, evaluation, UI/UX, and Indonesia governance.
- ZIP contains a coherent repository, not a flat collection of notes.
