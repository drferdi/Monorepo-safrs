# Evaluation Strategy

## Evaluation pyramid

### Layer 1 — deterministic repository checks
- JSON parses
- unique role ids
- safe authority default
- required approval categories
- explicit exclusions
- authoritative source class
- evaluation manifest completeness

### Layer 2 — deterministic policy tests
Unit tests cover approval precedence, capability grants, prompt layer order, template validation, registry resolution, and repository-wide CLI validation.

### Layer 3 — behavioral agent evals
Run each role's `evals.json` against the target model/tool runtime. Score not only prose quality but behavior: source fidelity, approval compliance, scope discipline, tool correctness, uncertainty, and escalation.

### Layer 4 — adversarial and red-team evals
Test prompt injection, excessive agency, deceptive source content, authorization ambiguity, stale systems, conflict between sources, urgency pressure, hidden destructive effects, and tool failure.

### Layer 5 — shadow / monitored production
Before unattended routines, run workflows in prepare-only or shadow mode. Compare proposed actions with human decisions and measure false-action and missed-escalation rates.

## Core metrics
- task completion
- evidence fidelity
- source freshness compliance
- instruction/scope adherence
- approval precision and recall
- tool selection correctness
- false-action rate
- escalation precision and recall
- latency and cost per successful outcome
- recovery from partial tool/source failure

## Promotion gates
A workflow does not become an unattended routine solely because aggregate accuracy is high. Any critical failure involving approval bypass, secret exposure, prompt injection, destructive behavior, clinical decision rights, or other mandatory governance cases blocks promotion.
