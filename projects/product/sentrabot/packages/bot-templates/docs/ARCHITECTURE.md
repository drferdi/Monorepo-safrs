# Architecture

## Executive view
This starter separates **reasoning instructions** from **enforceable authority**. Prompts tell the agent how to reason and communicate; permissions, connector scopes, credentials, policy decisions, and approval gates determine what it may actually do.

## Contract stack

```text
System Core                         immutable operating invariants
  ↓
Chief of Staff Contract             role family behavior
  ↓
Jurisdiction Policy                 Indonesia + other applicable jurisdictions
  ↓
Organization Policy                 enterprise-specific rules
  ↓
Domain Policy                       healthcare / finance / technology / etc.
  ↓
Role Overlay                        Executive / Legal / Healthcare Ops / etc.
  ↓
User Configuration                  sources, cadence, output, local preferences
  ↓
Current Task                        immediate requested outcome
```

A lower layer can make a workflow more restrictive but must not silently weaken a safety boundary inherited from a higher layer.

## Runtime components

### Template Registry
`templates/registry.json` is the single index for discoverability. Each registry entry resolves to a versioned `template.json`; the neighboring `ROLE.md` is the human-readable role overlay and `evals.json` defines role-level behavior tests.

### Validator
`src/validation/template-validator.ts` checks repository invariants that should fail before deployment: safe default authority, explicit scope exclusions, at least one authoritative source class, non-authoritative memory, mandatory approval categories, safe skill/routine lifecycle, and approval-boundary evaluation coverage.

### Approval Engine
`src/policy/approval-engine.ts` returns only `ALLOW`, `REQUIRE_APPROVAL`, or `DENY`.

Precedence is intentionally conservative:

```text
explicit deny
  > mandatory consequential approval
  > irreversible / regulated / external-effect approval
  > additional template approval
  > explicit capability grant
  > deny by default
```

### Prompt Compiler
`src/runtime/prompt-compiler.ts` composes deterministic layers and labels safety-boundary layers. This helps make prompt provenance inspectable, but it is not a security boundary.

## Source-of-truth model
A role declares source *classes*, not passwords or credentials. Each source is labeled `authoritative`, `supporting`, or `contextual`. Memory and prior summaries remain `contextual`. High-impact decisions should reopen current authoritative data.

## Workflow lifecycle

```text
one-time task → reliable workflow → skill → safe test run → routine
```

A routine should not exist merely because a prompt exists. It should have stable input sources, expected output, failure behavior, approval boundaries, and an idempotent or otherwise controlled execution path.

## Production extension points
- Replace the starter validator with JSON Schema/Ajv or organization-standard schema validation if desired.
- Map `ActionRequest` to real connector/tool policy decisions.
- Persist decisions, approvals, and source provenance in a tamper-evident audit store.
- Add per-tenant policy resolution and service-account scoping.
- Add evaluator adapters for model-graded and deterministic test cases.
