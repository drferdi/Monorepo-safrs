<!--
  Sentra Agent-First Repository Standard (SAFRS) v1.1
  Sentra Artificial Intelligence
  Human-Governed · Agent-Executed · Machine-Enforced

  This README is an explanatory repository entrypoint.
  It does not replace the normative SAFRS Specification.
-->

<!--
  SENTRA README VISUAL SYSTEM
  Profile-derived engineering aesthetic · compact · high signal
  Diagram grammar: #0D1117 node fill + semantic colored strokes + white labels
  Palette: Blue #5B8CFF · Cyan #22D3EE · Violet #8B5CF6 · Teal #14B8A6 · Amber #F59E0B · Red #F43F5E · Slate #64748B
  Diagram type: monospace 10–12px · compact padding · transparent GitHub surface
  Table body: compact subscript sizing while headers remain full-size
-->

<img src="https://i.ibb.co.com/Z1G4v477/SAFRS.png" alt="SAFRS" border="0">

<p align="center">
  <img src="https://img.shields.io/badge/HUMAN-GOVERNED-F59E0B?style=flat-square" alt="Human Governed" />
  <img src="https://img.shields.io/badge/AGENT-EXECUTED-8B5CF6?style=flat-square" alt="Agent Executed" />
  <img src="https://img.shields.io/badge/MACHINE-ENFORCED-14B8A6?style=flat-square" alt="Machine Enforced" />
  <img src="https://img.shields.io/badge/RISK-R0%E2%86%92R3-F43F5E?style=flat-square" alt="Risk R0 to R3" />
</p>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&size=14&duration=2200&pause=800&color=22D3EE&center=true&vCenter=true&width=900&height=30&lines=human+authority+%E2%86%92+bounded+agent+execution+%E2%86%92+machine+verification;constraint+descends+%C2%B7+authority+ascends+%C2%B7+capability+%E2%89%A0+trust" alt="Animated SAFRS operating signal" />
</p>

### Repository Governance for AI-Native Software Engineering

**Sentra Artificial Intelligence**

<p>
  <strong>Human-Governed · Agent-Executed · Machine-Enforced</strong>
  <br />
  <sub><code>CONSTRAINT DESCENDS · AUTHORITY ASCENDS · CAPABILITY ≠ TRUST</code></sub>
</p>

<p>
  <a href="#executive-summary"><strong>Executive Summary</strong></a>
  ·
  <a href="#six-layer-architecture"><strong>Architecture</strong></a>
  ·
  <a href="#risk-model"><strong>Risk Model</strong></a>
  ·
  <a href="#multi-agent-execution-protocol"><strong>Execution</strong></a>
  ·
  <a href="#conformance-levels"><strong>Conformance</strong></a>
  ·
  <a href="#adoption-path"><strong>Adoption</strong></a>
</p>

---

> [!IMPORTANT]
> This README is an **explanatory repository entrypoint**, not the normative
> standard. SAFRS documentation follows an authority hierarchy:
> **Specification → Explanatory Papers → Illustrative Reference Material**.
> If this README, an essay, a template, or an example conflicts with the
> SAFRS Specification, **the specification prevails**.

## Executive Summary

**SAFRS — the Sentra Agent-First Repository Standard — defines how a software
repository should be structured, governed, and enforced when autonomous
Artificial Intelligence agents perform a substantial share of engineering
work.**

SAFRS starts from one operational premise:

> **Repository structure is a security and governance control, not a matter of
> taste.**

A disorganized repository already creates friction for human engineering teams.
When autonomous agents are allowed to read, decide, modify, execute, and
coordinate inside that repository, the same ambiguity can become a control
failure: an agent can make the correct technical change under the wrong
authority, cross a risk boundary without escalation, act on injected
instructions, or create individually valid changes that become incoherent when
combined.

SAFRS v1.1 addresses that problem through five coupled mechanisms:

1. a **six-layer repository architecture** from Trust Boundary to Human Authority;
2. a **role-based permission model** in which capability never implies trust;
3. a **four-tier risk model** with cumulative mandatory controls;
4. a **multi-agent execution protocol** with explicit task states and one
   mutation owner per bounded scope;
5. a **knowledge governance model** that distinguishes current architecture,
   historical decisions, execution plans, Git history, and running code.

The same architecture is applied at four cumulative assurance levels:
**SAFRS Core**, **Controlled**, **Secure**, and **Regulated**.

| Dimension | Definition |
| --- | --- |
| <sub>Standard</sub> | <sub>Sentra Agent-First Repository Standard</sub> |
| <sub>Version</sub> | <sub>SAFRS v1.1</sub> |
| <sub>Organization</sub> | <sub>Sentra Artificial Intelligence</sub> |
| <sub>Domain</sub> | <sub>AI-native software repository governance</sub> |
| <sub>Primary control surface</sub> | <sub>Repository topology, permissions, execution, CI, documentation</sub> |
| <sub>Trust principle</sub> | <sub>Capability does not grant authority</sub> |
| <sub>Risk tiers</sub> | <sub>R0 · R1 · R2 · R3</sub> |
| <sub>Conformance levels</sub> | <sub>Core · Controlled · Secure · Regulated</sub> |
| <sub>Multi-agent invariant</sub> | <sub>One mutation owner per bounded scope</sub> |
| <sub>Governance apex</sub> | <sub>Non-delegable human authority</sub> |
| <sub>Documentation rule</sub> | <sub>At most one CANONICAL document per subject</sub> |
| <sub>Strategic posture</sub> | <sub>Human-Governed · Agent-Executed · Machine-Enforced</sub> |

## Standard Thesis

> An AI-native repository becomes governable when authority, scope, risk,
> execution, verification, and knowledge are explicit enough to be inspected by
> humans and enforced by machines.

SAFRS does not attempt to make agents inherently trustworthy. It makes their
authority **bounded, visible, and auditable**.

The distinction matters:

```text
Capability ≠ Trust
Role       ≠ Identity
Role       ≠ Model
Role       ≠ Vendor
Context    ≠ Permission
Plan       ≠ Architecture
Automation ≠ Human Authority
```

A stronger model may produce better code. That does not justify a larger blast
radius.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Standard Thesis](#standard-thesis)
- [Why SAFRS Exists](#why-safrs-exists)
- [Authority and Documentation Hierarchy](#authority-and-documentation-hierarchy)
- [Design Principles](#design-principles)
- [Six-Layer Architecture](#six-layer-architecture)
- [Trust and Permission Model](#trust-and-permission-model)
- [Agent Roles](#agent-roles)
- [Risk Model](#risk-model)
- [Mandatory Controls](#mandatory-controls)
- [Risk Escalation](#risk-escalation)
- [Multi-Agent Execution Protocol](#multi-agent-execution-protocol)
- [Task Contract](#task-contract)
- [Single-Writer Rule](#single-writer-rule)
- [Knowledge Governance](#knowledge-governance)
- [Executable Governance](#executable-governance)
- [Security Model](#security-model)
- [Conformance Levels](#conformance-levels)
- [Relationship to External Frameworks](#relationship-to-external-frameworks)
- [Adoption Path](#adoption-path)
- [What SAFRS Is Not](#what-safrs-is-not)
- [Known Limitations](#known-limitations)
- [Documentation Architecture](#documentation-architecture)
- [Contributing](#contributing)
- [License and Authority](#license-and-authority)
- [Stewardship](#stewardship)

## Why SAFRS Exists

Coding-agent guidance such as `AGENTS.md` can tell an agent where to look, how
a project is organized, and which commands are useful. That is necessary, but
it does not answer the governance questions that become critical once an agent
can act:

- What may this agent read?
- What may it modify?
- What may it execute?
- Which tools and network destinations may it reach?
- Which changes require human authorization?
- What happens when an R1 task becomes an R2 task during implementation?
- If several agents work in parallel, who owns mutation authority?
- When code and documentation disagree, which artifact is authoritative?
- How can an organization later prove who authorized a high-impact action?

SAFRS treats these as repository-level governance problems.

### Failure Modes SAFRS Is Designed Against

| Failure mode | Example | SAFRS response |
| --- | --- | --- |
| <sub>Structural ambiguity</sub> | <sub>A test fix silently becomes a schema change</sub> | <sub>Risk classification + mandatory escalation</sub> |
| <sub>Capability mistaken for trust</sub> | <sub>A better model receives broader write scope</sub> | <sub>Role-bound permission envelope</sub> |
| <sub>Parallel correctness, aggregate incoherence</sub> | <sub>Several agents produce clean but incompatible changes</sub> | <sub>Single-writer mutation authority</sub> |
| <sub>Epistemic drift</sub> | <sub>Agents follow stale architecture documents</sub> | <sub>Document lifecycle + canonicality</sub> |
| <sub>Context-surface injection</sub> | <sub>Issue, README, dependency, or tool output carries instructions</sub> | <sub>Trust boundary + constitutional precedence + isolation</sub> |
| <sub>Unprovable authorization</sub> | <sub>Git shows the change but not the governing approval</sub> | <sub>Task contract + audit + human gates</sub> |

## Authority and Documentation Hierarchy

SAFRS uses three documentation tiers.

| Tier | Artifact | Function | Authority |
| --- | --- | --- | --- |
| <sub>**Normative**</sub> | <sub>SAFRS Specification v1.1</sub> | <sub>Defines requirements</sub> | <sub>Binding</sub> |
| <sub>**Explanatory**</sub> | <sub>Strategic Introduction and Papers I–V</sub> | <sub>Explains reasoning</sub> | <sub>Non-binding</sub> |
| <sub>**Illustrative**</sub> | <sub>Reference architecture, examples, templates</sub> | <sub>Demonstrates implementation</sub> | <sub>Non-binding</sub> |

```mermaid
%%{init: {"flowchart": {"htmlLabels": false, "padding": 20}, "themeVariables": {"fontFamily": "monospace", "fontSize": "11px"}}}%%
flowchart TB
    Spec["SAFRS Specification v1.1<br/>Normative"]
    Papers["Strategic Introduction + Papers I–V<br/>Explanatory"]
    Ref["Reference Architecture<br/>Illustrative"]
    Templates["Templates + Examples<br/>Illustrative"]

    Spec --> Papers
    Spec --> Ref
    Spec --> Templates

    classDef normative fill:#0D1117,stroke:#F59E0B,color:#ffffff,stroke-width:2px;
    classDef explanatory fill:#0D1117,stroke:#5B8CFF,color:#ffffff,stroke-width:2px;
    classDef illustrative fill:#0D1117,stroke:#22D3EE,color:#ffffff,stroke-width:1.5px;

    class Spec normative;
    class Papers explanatory;
    class Ref,Templates illustrative;
```

The precedence rule is simple:

```text
SPECIFICATION
    ↓
EXPLANATORY MATERIAL
    ↓
ILLUSTRATIVE MATERIAL
```

The specification always wins.

## Design Principles

SAFRS v1.1 is organized around ten design principles.

| Principle | Decision |
| --- | --- |
| <sub>**P1 · Repository topology is a control surface**</sub> | <sub>Structure is normative, not merely stylistic</sub> |
| <sub>**P2 · Trust is orthogonal to capability**</sub> | <sub>Better model performance never grants more authority</sub> |
| <sub>**P3 · Roles are vendor-neutral abstractions**</sub> | <sub>Permissions bind to roles, not vendors or models</sub> |
| <sub>**P4 · Risk is a property of consequence**</sub> | <sub>Impact, reversibility, privilege, blast radius, and data sensitivity dominate</sub> |
| <sub>**P5 · Exactly one mutation owner per bounded scope**</sub> | <sub>Parallel analysis is allowed; uncontrolled parallel writes are not</sub> |
| <sub>**P6 · Documents are distinct epistemic objects**</sub> | <sub>ADRs, architecture, plans, Git history, and code carry different kinds of truth</sub> |
| <sub>**P7 · Governance must be executable**</sub> | <sub>Machine-checkable controls belong in CI</sub> |
| <sub>**P8 · Conformance is graduated**</sub> | <sub>Core, Controlled, Secure, and Regulated are cumulative</sub> |
| <sub>**P9 · Human authority is non-delegable**</sub> | <sub>High-impact authority cannot be granted by automation</sub> |
| <sub>**P10 · Simplicity is a control**</sub> | <sub>A usable standard is safer than an over-engineered standard nobody adopts</sub> |

## Six-Layer Architecture

A SAFRS-compliant repository is governed through six layers.

```mermaid
%%{init: {"flowchart": {"htmlLabels": false, "padding": 20}, "themeVariables": {"fontFamily": "monospace", "fontSize": "11px"}}}%%
flowchart TB
    L5["L5 · Human Authority"]
    L4["L4 · Executable Governance"]
    L3["L3 · Execution Isolation"]
    L2["L2 · Context & Navigation"]
    L1["L1 · Constitution"]
    L0["L0 · Trust Boundary"]

    L5 --> L4 --> L3 --> L2 --> L1 --> L0

    classDef authority fill:#0D1117,stroke:#F59E0B,color:#ffffff,stroke-width:2px;
    classDef governance fill:#0D1117,stroke:#14B8A6,color:#ffffff,stroke-width:2px;
    classDef execution fill:#0D1117,stroke:#8B5CF6,color:#ffffff,stroke-width:2px;
    classDef context fill:#0D1117,stroke:#5B8CFF,color:#ffffff,stroke-width:2px;
    classDef constitution fill:#0D1117,stroke:#22D3EE,color:#ffffff,stroke-width:2px;
    classDef boundary fill:#0D1117,stroke:#F43F5E,color:#ffffff,stroke-width:2px;

    class L5 authority;
    class L4 governance;
    class L3 execution;
    class L2 context;
    class L1 constitution;
    class L0 boundary;
```

The organizing rule is:

> **Constraint descends. Authority ascends.**

| Layer | Purpose | Typical contents | Failure without it |
| --- | --- | --- | --- |
| <sub>**L0 · Trust Boundary**</sub> | <sub>Define the repository perimeter</sub> | <sub>External dependencies, tool endpoints, MCP servers, network destinations, trusted/untrusted inputs</sub> | <sub>No principled way to constrain external input or egress</sub> |
| <sub>**L1 · Constitution**</sub> | <sub>Define non-negotiable repository rules</sub> | <sub>Prohibitions, authority hierarchy, risk policy, escalation rules</sub> | <sub>Every rule becomes contextual and negotiable</sub> |
| <sub>**L2 · Context & Navigation**</sub> | <sub>Tell agents where things are</sub> | <sub>`AGENTS.md`, capsule routing, ownership pointers, test/build entrypoints</sub> | <sub>Agents explore broadly and consume noisy context</sub> |
| <sub>**L3 · Execution Isolation**</sub> | <sub>Make scope enforceable</sub> | <sub>Worktrees, environment separation, credential isolation, resource and egress controls</sub> | <sub>Scope remains advisory</sub> |
| <sub>**L4 · Executable Governance**</sub> | <sub>Enforce mechanically decidable rules</sub> | <sub>Tests, lint, architecture checks, security checks, documentation integrity, verification integrity</sub> | <sub>Governance depends on reviewer vigilance</sub> |
| <sub>**L5 · Human Authority**</sub> | <sub>Preserve non-delegable authority</sub> | <sub>R3 authorization, constitutional amendment, incident declaration, conformance changes</sub> | <sub>Governance becomes a closed machine-controlled loop</sub> |

### L0 · Trust Boundary

Every external dependency, tool, MCP server, network destination, and input
channel extends the effective attack surface. SAFRS therefore treats them as
part of repository governance, not as incidental tooling.

### L1 · Constitution

The constitution is intentionally small, human-authored, and non-negotiable.

It should contain rules that remain true regardless of the task, model, prompt,
or tool being used. An agent must not be able to modify the constitution that
constrains it.

### L2 · Context & Navigation

Navigation tells an agent **where** to look. It does not grant permission to act.

This distinction is fundamental:

```text
Navigation answers:    Where is the relevant surface?
Permission answers:    May this role act on that surface?
```

### L3 · Execution Isolation

A permission model is not real if the process can still reach everything.

L3 converts a declared scope into an enforceable boundary through isolated
worktrees, environments, credentials, resources, and network access.

### L4 · Executable Governance

A rule that can be mechanically checked should not depend on memory or review
culture.

### L5 · Human Authority

L5 is the layer no automated system may occupy.

Certain acts are intentionally non-delegable: R3 approval, constitutional
change, incident declaration, conformance-level change, and other actions whose
consequences exceed acceptable autonomous authority.

## Trust and Permission Model

Permission in SAFRS is derived rather than assigned ad hoc.

```mermaid
%%{init: {"flowchart": {"htmlLabels": false, "padding": 20}, "themeVariables": {"fontFamily": "monospace", "fontSize": "11px"}}}%%
flowchart TB
    Identity["Identity"]
    Trust["Trust Level"]
    Read["Readable Scope"]
    Write["Writable Scope"]
    Tools["Tool Capabilities"]
    Network["Network Capability"]
    Execute["Execution Authority"]
    Approval["Approval Requirement"]

    Identity --> Trust --> Read --> Write --> Tools --> Network --> Execute --> Approval

    classDef chain fill:#0D1117,stroke:#5B8CFF,color:#ffffff,stroke-width:2px;
    class Identity,Trust,Read,Write,Tools,Network,Execute,Approval chain;
```

The combined result is the **permission envelope**.

The permission envelope belongs to a **role occupying a task**. It does not
belong to a model, vendor, or chat session.

### Permission Envelope

```text
Permission Envelope
├── readable scope
├── writable scope
├── tool capability
├── network capability
├── execution authority
└── approval requirement
```

A role cannot write outside its readable scope, invoke undeclared tools, reach
unapproved network destinations, or perform an action above its approval
authority.

## Agent Roles

| Role | Read | Write | Tools | Network | Typical approval |
| --- | --- | --- | --- | --- | --- |
| <sub>**Observer**</sub> | <sub>Repository-wide</sub> | <sub>None</sub> | <sub>Read-only</sub> | <sub>None</sub> | <sub>None</sub> |
| <sub>**Analyst**</sub> | <sub>Repository-wide</sub> | <sub>None</sub> | <sub>Analysis and search</sub> | <sub>Restricted</sub> | <sub>None</sub> |
| <sub>**Implementer**</sub> | <sub>Task scope + dependencies</sub> | <sub>Task scope only</sub> | <sub>Build, test, VCS</sub> | <sub>Restricted</sub> | <sub>PR review</sub> |
| <sub>**Reviewer**</sub> | <sub>Task scope + related</sub> | <sub>Review artifacts only</sub> | <sub>Analysis, test</sub> | <sub>None</sub> | <sub>None</sub> |
| <sub>**Maintainer**</sub> | <sub>Repository-wide</sub> | <sub>Broad, policy-bounded</sub> | <sub>Broad</sub> | <sub>Restricted</sub> | <sub>Per risk tier</sub> |
| <sub>**Release Agent**</sub> | <sub>Release artifacts</sub> | <sub>Release artifacts</sub> | <sub>Build, sign, publish</sub> | <sub>Controlled egress</sub> | <sub>Explicit human</sub> |
| <sub>**Security Agent**</sub> | <sub>Repository-wide, including sensitive surfaces</sub> | <sub>Security findings only</sub> | <sub>Scanning, analysis</sub> | <sub>Controlled</sub> | <sub>None for findings</sub> |

Two asymmetries are deliberate.

First, **read authority is not write authority**. Most analytical work should not
require mutation capability.

Second, a **Security Agent may detect but not silently remediate**. Broad read
scope combined with broad mutation scope would create the ability to both
introduce and conceal a security issue.

## Risk Model

SAFRS classifies risk by consequence rather than diff size.

```text
Impact
  × Reversibility
  × Privilege
  × Blast Radius
  × Data Sensitivity
```

The expression is conceptual, not a numeric formula in v1.1. The factors
compound. A maximum on one factor can dominate the classification.

| Tier | Definition | Typical examples | Human authorization |
| --- | --- | --- | --- |
| <sub>**R0**</sub> | <sub>Read-only</sub> | <sub>Search, analysis, dependency inspection</sub> | <sub>None</sub> |
| <sub>**R1**</sub> | <sub>Reversible local change</sub> | <sub>Unit test, local refactor, internal helper rename</sub> | <sub>Usually not required</sub> |
| <sub>**R2**</sub> | <sub>Boundary-affecting change</sub> | <sub>Database migration, dependency change, public API change, authorization middleware</sub> | <sub>Required</sub> |
| <sub>**R3**</sub> | <sub>High-impact action</sub> | <sub>Production deployment, credential rotation, critical clinical logic</sub> | <sub>Mandatory explicit authorization</sub> |

### Worked Classification Examples

```text
Rename internal helper              → R1
Add database migration              → R2
Modify authorization middleware     → R2
Rotate production secrets           → R3
Modify critical clinical algorithm  → R3
```

The amount of code is not the measure of risk.

## Mandatory Controls

Controls are cumulative.

```mermaid
%%{init: {"flowchart": {"htmlLabels": false, "padding": 20}, "themeVariables": {"fontFamily": "monospace", "fontSize": "11px"}}}%%
flowchart TB
    R1["R1<br/>lint · tests · CI"]
    R2["R2<br/>R1 + integration tests · CODEOWNER · architecture checks · human review"]
    R3["R3<br/>R2 + explicit authorization · isolation · audit · controlled deployment"]

    R1 --> R2 --> R3

    classDef low fill:#0D1117,stroke:#14B8A6,color:#ffffff,stroke-width:2px;
    classDef medium fill:#0D1117,stroke:#F59E0B,color:#ffffff,stroke-width:2px;
    classDef high fill:#0D1117,stroke:#F43F5E,color:#ffffff,stroke-width:2px;

    class R1 low;
    class R2 medium;
    class R3 high;
```

### R1

- lint;
- relevant tests;
- continuous integration.

### R2

All R1 controls, plus:

- integration tests;
- CODEOWNER approval;
- architecture conformance checks;
- human review.

### R3

All R2 controls, plus:

- explicit human authorization;
- isolated execution;
- audit record;
- controlled deployment.

## Risk Escalation

Risk classification is provisional at task creation and may only move upward
during execution.

> [!CAUTION]
> If an agent begins an R1 task and discovers that the correct fix requires an
> R2 or R3 action, execution must stop. The task must be reclassified and
> re-authorized before work continues.

This rule prevents the dangerous case in which a low-risk task quietly becomes a
higher-risk task without changing its permission envelope.

```mermaid
%%{init: {"flowchart": {"htmlLabels": false, "padding": 20}, "themeVariables": {"fontFamily": "monospace", "fontSize": "11px"}}}%%
flowchart LR
    R1["R1 Task"]
    Discover["Boundary-Affecting Requirement Discovered"]
    Stop["Stop Execution"]
    Reclassify["Reclassify to R2/R3"]
    Human["Human Review / Authorization"]
    Resume["Resume Under New Envelope"]

    R1 --> Discover --> Stop --> Reclassify --> Human --> Resume

    classDef task fill:#0D1117,stroke:#5B8CFF,color:#ffffff,stroke-width:2px;
    classDef gate fill:#0D1117,stroke:#F43F5E,color:#ffffff,stroke-width:2px;
    classDef approval fill:#0D1117,stroke:#14B8A6,color:#ffffff,stroke-width:2px;

    class R1,Discover,Reclassify task;
    class Stop gate;
    class Human,Resume approval;
```

## Multi-Agent Execution Protocol

The primary multi-agent risk is not necessarily one agent being wrong. It is
several agents being locally correct while the combined result becomes
architecturally incoherent.

SAFRS addresses this with explicit lifecycle state, bounded ownership, and
atomic handoff.

### Task Lifecycle

```text
PROPOSED
   ↓
CLAIMED
   ↓
PLANNED
   ↓
EXECUTING
   ↓
VERIFYING
   ↓
REVIEW
   ↓
MERGED
   ↓
CLOSED
```

Exceptional or blocking states:

```text
BLOCKED · CONFLICT · FAILED · ABORTED · SUPERSEDED
```

The state model must be queryable. A governance system should be able to answer
which agent owns mutation authority over a capsule at a given time.

## Task Contract

Every task carries an explicit contract.

The serialization format is an implementation choice; the logical content is
the governance requirement.

```yaml
task:
  id: STMS-142
  agent_role: implementer

  scope:
    - projects/stms/attendance/**

  dependencies:
    - STMS-137

  risk: R2

  allowed_actions:
    - read
    - modify
    - test
    - create_pr

  forbidden_actions:
    - merge
    - deploy
```

Explicit `forbidden_actions` are important because silence is ambiguous. A
prohibition should remain visible and auditable.

## Single-Writer Rule

> **Only one agent may hold mutation authority over a bounded task scope at a
> time.**

Many agents may:

- read;
- analyze;
- test;
- review;
- propose alternatives.

Only one may mutate the same bounded scope at a time.

```mermaid
%%{init: {"flowchart": {"htmlLabels": false, "padding": 20}, "themeVariables": {"fontFamily": "monospace", "fontSize": "11px"}}}%%
flowchart LR
    A1["Analyst A<br/>read"]
    A2["Analyst B<br/>read"]
    R["Reviewer<br/>review"]
    I["Implementer<br/>exclusive mutation authority"]
    Scope["Bounded Scope"]

    A1 --> Scope
    A2 --> Scope
    R --> Scope
    I ==> Scope

    classDef read fill:#0D1117,stroke:#5B8CFF,color:#ffffff,stroke-width:2px;
    classDef write fill:#0D1117,stroke:#F43F5E,color:#ffffff,stroke-width:2px;
    classDef target fill:#0D1117,stroke:#22D3EE,color:#ffffff,stroke-width:2px;

    class A1,A2,R read;
    class I write;
    class Scope target;
```

When ownership transfers from Implementer to Reviewer or Reviewer to Maintainer,
the permission envelope changes atomically. The outgoing role does not retain
write authority “just in case.”

## Knowledge Governance

SAFRS treats documentation as governed knowledge rather than undifferentiated
files.

### Epistemic Objects

| Object | Question answered | Authority |
| --- | --- | --- |
| <sub>**Architecture documentation**</sub> | <sub>How does the system work now?</sub> | <sub>Current truth</sub> |
| <sub>**ADR**</sub> | <sub>Why was this decision made?</sub> | <sub>Historical and immutable once accepted</sub> |
| <sub>**Execution plan**</sub> | <sub>How will this change be performed?</sub> | <sub>Time-bounded; expires on completion</sub> |
| <sub>**Git history**</sub> | <sub>What changed and when?</sub> | <sub>Evidential</sub> |
| <sub>**Code**</sub> | <sub>What actually runs?</sub> | <sub>Ground truth</sub> |

A completed plan is not current architecture. A superseded ADR is not a current
decision.

### Document Lifecycles

```text
Documents
DRAFT → ACTIVE → CANONICAL → SUPERSEDED → ARCHIVED

Execution Plans
ACTIVE → COMPLETED → ARCHIVED

Architecture Decision Records
PROPOSED → ACCEPTED → SUPERSEDED
                   ↘ REJECTED
```

### Canonicality Rule

> **At most one document may hold CANONICAL status for any given subject.**

Two canonical documents describing the same subject create a governance
failure, because an agent has no principled basis for choosing between them.

## Executable Governance

SAFRS requires machine-checkable rules to be machine-enforced.

### CI Can Enforce

- broken documentation links;
- invalid ADR references;
- multiple CANONICAL documents for one subject;
- missing architecture updates when protected surfaces change;
- stale references to deleted modules;
- invalid `AGENTS.md` routing;
- missing project README files;
- orphan ACTIVE plans with no owning task;
- missing or unknown governance status;
- missing CODEOWNER coverage for sensitive paths;
- relevant tests and lint;
- architecture and security checks;
- verification-integrity checks.

### CI Cannot Enforce

CI cannot determine whether a document is **semantically true**.

It can verify that an architecture document changed when required. It cannot
prove that the updated document accurately describes the system.

Structural enforcement reduces drift. Human review remains necessary.

## Security Model

SAFRS uses established security frameworks as external anchors instead of
inventing a parallel threat taxonomy.

| Area | Threat | SAFRS control |
| --- | --- | --- |
| <sub>**Secrets**</sub> | <sub>Credential leakage into context or output</sub> | <sub>L3 credential isolation; secrets excluded from agent-readable scope</sub> |
| <sub>**Supply chain**</sub> | <sub>Compromised dependency or build</sub> | <sub>L0 declaration + provenance requirements at higher conformance levels</sub> |
| <sub>**MCP / tools**</sub> | <sub>Over-broad tool capability</sub> | <sub>Tool trust bound to role and trust level</sub> |
| <sub>**Prompt injection**</sub> | <sub>Instructions injected through context surfaces</sub> | <sub>L1 precedence, L0 input classification, bounded permissions</sub> |
| <sub>**Data exfiltration**</sub> | <sub>Broad read scope combined with egress</sub> | <sub>Network capability constrained independently of tool capability</sub> |
| <sub>**Credential reach**</sub> | <sub>Agent reaches credentials outside task scope</sub> | <sub>Worktree and environment isolation</sub> |

### Containment, Not a Claim of Prevention

SAFRS does **not** claim to solve prompt injection.

Its repository-layer objective is to bound the consequence:

- injected instructions cannot expand the role's permission envelope;
- L3 isolation still constrains execution;
- R2 changes still require review;
- R3 actions still require explicit human authorization.

The security posture is **containment plus least privilege**, not a claim of
perfect prevention.

## Conformance Levels

SAFRS uses graduated conformance rather than a binary “compliant / not
compliant” label.

| Level | Requires | Intended for |
| --- | --- | --- |
| <sub>**SAFRS Core**</sub> | <sub>Repository topology, constitution, agent navigation, basic governance</sub> | <sub>Internal tools, low-consequence systems, early adoption</sub> |
| <sub>**SAFRS Controlled**</sub> | <sub>Core + risk tiers, CI enforcement, permission boundaries</sub> | <sub>Production systems with reversible consequences</sub> |
| <sub>**SAFRS Secure**</sub> | <sub>Controlled + execution sandboxing, credential isolation, supply-chain provenance, security controls</sub> | <sub>Systems handling sensitive data or privileged access</sub> |
| <sub>**SAFRS Regulated**</sub> | <sub>Secure + full auditability, mandatory human gates, data governance, domain-specific controls</sub> | <sub>Clinical, safety-critical, and regulated environments</sub> |

Each level is cumulative.

```mermaid
%%{init: {"flowchart": {"htmlLabels": false, "padding": 20}, "themeVariables": {"fontFamily": "monospace", "fontSize": "11px"}}}%%
flowchart LR
    Core["SAFRS Core"]
    Controlled["SAFRS Controlled"]
    Secure["SAFRS Secure"]
    Regulated["SAFRS Regulated"]

    Core --> Controlled --> Secure --> Regulated

    classDef core fill:#0D1117,stroke:#5B8CFF,color:#ffffff,stroke-width:2px;
    classDef controlled fill:#0D1117,stroke:#14B8A6,color:#ffffff,stroke-width:2px;
    classDef secure fill:#0D1117,stroke:#F59E0B,color:#ffffff,stroke-width:2px;
    classDef regulated fill:#0D1117,stroke:#F43F5E,color:#ffffff,stroke-width:2px;

    class Core core;
    class Controlled controlled;
    class Secure secure;
    class Regulated regulated;
```

The architecture stays consistent. The assurance intensity changes.

## Relationship to External Frameworks

SAFRS is designed as a **repository implementation layer**, not as a competitor
to organizational, regulatory, application-security, or supply-chain
frameworks.

| External framework | Primary governance surface | SAFRS relationship |
| --- | --- | --- |
| <sub>**ISO/IEC 42001**</sub> | <sub>Organizational AI management system</sub> | <sub>Repository-level operational evidence can support organizational AI governance</sub> |
| <sub>**EU AI Act**</sub> | <sub>High-risk AI systems</sub> | <sub>SAFRS Regulated is designed to support logging, oversight, documentation, and auditability needs</sub> |
| <sub>**OWASP guidance for LLM / GenAI security**</sub> | <sub>Application and model risk</sub> | <sub>SAFRS constrains repository-layer authority and blast radius</sub> |
| <sub>**SLSA**</sub> | <sub>Build and source provenance</sub> | <sub>SAFRS can bind provenance requirements to conformance level</sub> |
| <sub>**AGENTS.md**</sub> | <sub>Agent context and navigation</sub> | <sub>SAFRS uses agent navigation as L2 and adds trust, risk, isolation, governance, and human authority</sub> |

External standards and regulatory statements are time-sensitive and should be
re-verified before external publication or compliance claims.

## Adoption Path

For a team starting from a conventional repository, SAFRS v1.1 recommends
adoption in this order.

1. **Declare the trust boundary — L0.** Enumerate external dependencies, tools,
   MCP servers, and permitted network destinations.
2. **Write the constitution — L1.** Keep it concise; non-negotiables only.
3. **Establish navigation — L2.** Root and per-capsule, human-authored.
4. **Classify existing surfaces by risk.** Identify R2 and R3 surfaces and attach
   ownership controls.
5. **Turn on inexpensive CI checks — L4.** Broken links, canonical uniqueness,
   orphan plans, missing CODEOWNERS, and other structural checks.
6. **Add execution isolation — L3.** Worktrees, environment separation,
   credential isolation, and bounded egress.
7. **Formalize task contracts and lifecycle.** Do this after the underlying
   trust and execution controls are stable.
8. **Declare a conformance level and hold the repository to it.**

> [!NOTE]
> The source concept document describes steps 1–5 as the practical SAFRS Core
> entry point. Steps 6–8 progressively add the controls associated with higher
> assurance.

### Adoption Sequence

```mermaid
%%{init: {"flowchart": {"htmlLabels": false, "padding": 20}, "themeVariables": {"fontFamily": "monospace", "fontSize": "11px"}}}%%
flowchart LR
    L0["1 · Trust Boundary"]
    L1["2 · Constitution"]
    L2["3 · Navigation"]
    Risk["4 · Risk Surfaces"]
    CI["5 · CI Governance"]
    L3["6 · Isolation"]
    Task["7 · Task Protocol"]
    Conf["8 · Conformance Level"]

    L0 --> L1 --> L2 --> Risk --> CI --> L3 --> Task --> Conf

    classDef stage fill:#0D1117,stroke:#5B8CFF,color:#ffffff,stroke-width:2px;
    class L0,L1,L2,Risk,CI,L3,Task,Conf stage;
```

## What SAFRS Is Not

SAFRS should not be represented as:

- a certification scheme;
- a model evaluation benchmark;
- a replacement for security engineering;
- a replacement for ISO/IEC 42001;
- a replacement for the EU AI Act or sector-specific regulation;
- a replacement for SLSA;
- a guarantee against prompt injection;
- a claim that every autonomous agent is safe;
- a mandate to govern every repository at the highest possible intensity.

Its scope is narrower: **repository-level governance for agentic software
engineering**.

## Known Limitations

SAFRS v1.1 explicitly acknowledges unresolved questions.

| Limitation | Current boundary |
| --- | --- |
| <sub>No controlled empirical validation yet</sub> | <sub>v1.1 is a design standard; claims about drift reduction remain to be measured</sub> |
| <sub>Risk classification remains partly judgmental</sub> | <sub>The five-factor derivation is conceptual, not a numeric decision function</sub> |
| <sub>Agent identity is asserted, not cryptographically proven</sub> | <sub>Role attestation remains a future design question</sub> |
| <sub>Single-writer may be stricter than necessary</sub> | <sub>Finer-grained safe partitioning requires evidence before relaxation</sub> |
| <sub>Cross-capsule tasks are underspecified</sub> | <sub>Ownership across multiple bounded scopes needs a cleaner protocol</sub> |
| <sub>CI checks are structural, not semantic</sub> | <sub>Human review remains necessary for truthfulness</sub> |
| <sub>Prompt injection is contained, not solved</sub> | <sub>Least privilege and isolation limit consequence</sub> |
| <sub>Conformance is self-assessed</sub> | <sub>Independent verification is not defined in v1.1</sub> |

These are candidates for future revision, not hidden implementation assumptions.

## Documentation Architecture

SAFRS separates authoritative requirements from explanation and implementation
examples.

### Asset Model

```text
SAFRS Specification v1.1
│
├── Strategic Introduction
├── Papers I–V
├── Reference Architecture
├── Templates
└── Conformance Checklist
```

### Explanatory Paper Sequence

| Paper | Subject | Defines |
| --- | --- | --- |
| <sub>**Paper I**</sub> | <sub>Repository topology</sub> | <sub>The system</sub> |
| <sub>**Paper II**</sub> | <sub>Trust, identity, authority, permission</sub> | <sub>Who may act</sub> |
| <sub>**Paper III**</sub> | <sub>Risk tiers and mandatory controls</sub> | <sub>When they may act</sub> |
| <sub>**Paper IV**</sub> | <sub>Multi-agent coordination</sub> | <sub>How agents act together</sub> |
| <sub>**Paper V**</sub> | <sub>Documentation lifecycle and CI governance</sub> | <sub>How knowledge stays trustworthy</sub> |

The conceptual progression is:

```text
TOPOLOGY → TRUST → RISK → EXECUTION → KNOWLEDGE
```

### Documentation Governance Rule

The README is a discovery surface. It must remain concise enough to orient
humans and agents without becoming a shadow specification.

Normative requirements belong in the specification.

Detailed reasoning belongs in the explanatory papers.

Implementation examples belong in reference material and templates.

## Contributing

Changes to SAFRS should preserve its authority hierarchy and knowledge
lifecycles.

Minimum contribution workflow:

1. identify whether the change is **normative**, **explanatory**, or
   **illustrative**;
2. identify the affected architecture, trust, risk, execution, security, or
   knowledge-governance surface;
3. classify the change risk before editing;
4. preserve the single-writer rule for the bounded mutation scope;
5. update the canonical architecture documentation when current behavior
   changes;
6. create a new ADR instead of modifying a merged historical decision;
7. run all applicable documentation, architecture, security, lint, and test
   checks;
8. escalate immediately if the required work crosses into a higher risk tier;
9. obtain explicit human authorization for R3 actions and constitutional
   changes.

> [!IMPORTANT]
> A contribution must not weaken or bypass the controls used to verify that
> contribution.

## License and Authority

SAFRS v1.1 is an official concept and standards-development work of
**Sentra Artificial Intelligence**.

The exact license, redistribution rights, trademark policy, certification use,
and external conformance-claim policy should be defined by the authoritative
repository policy before public distribution.

Until such policy is explicitly declared, this README must not be interpreted as
granting certification rights or permission to represent third-party systems as
independently verified SAFRS conformant.

## Stewardship

**Dr. Ferdi Iskandar**  
Lead, CEO & Full Stack Developer  
Sentra Artificial Intelligence

For standards interpretation, repository governance, or formal conformance
questions, use the approved Sentra governance channel associated with the
authoritative SAFRS repository.

---

## Repository State

Everything below describes the concrete, current state of *this* repository —
not the abstract standard above. It is repo-state, not normative SAFRS
content, and is expected to drift; treat `.safrs/document-registry.json` and
the plans under `docs/plans/active/` as the source of truth if it falls out of
date.

### Quick start

```bash
pnpm install          # Node 24.18.x, pnpm 11
pnpm setup            # .env from template + local Postgres (Docker) + migrate + seed
pnpm dev              # golden-path app on http://localhost:3000
pnpm check            # governance + tokens + lint + typecheck + test + build
```

Working on this repository as an agent (or with one) starts at
[`AGENTS.md`](AGENTS.md), which routes to everything else.

### Current capsules

| Capsule | Current state | Entry point |
| --- | --- | --- |
| <sub>`golden-path`</sub> | <sub>Implemented reference flow: Next.js → typed Hono API → Prisma → local PostgreSQL</sub> | <sub>`projects/golden-path/apps/web`</sub> |
| <sub>`control-center`</sub> | <sub>Implemented local, read-only operator dashboard; remains usable when Docker or the database is unavailable</sub> | <sub>`projects/control-center/apps/web`</sub> |
| <sub>`academic-smartboard`</sub> | <sub>Governance, curriculum/reference data, and Kayyisa knowledge package migrated; application surfaces are not yet ported</sub> | <sub>`projects/academic-smartboard`</sub> |
| <sub>`_template`</sub> | <sub>Governance scaffold for new capsules; not an active product</sub> | <sub>`projects/_template`</sub> |

### Governance and automation commands

| Command | What it does |
| --- | --- |
| <sub>`pnpm governance`</sub> | <sub>All deterministic SAFRS checks (policy, registry, routing, inventory, topology, action pins, ownership, lifecycle, contracts, approvals/evidence, sensitive-change classification)</sub> |
| <sub>`pnpm saf:status`</sub> | <sub>Plain-language repository status and the single next action</sub> |
| <sub>`pnpm task claim \| state \| close \| list`</sub> | <sub>Task lifecycle and exclusive scope ownership</sub> |
| <sub>`pnpm saf gate --all`</sub> | <sub>The eight publication gates, locally</sub> |
| <sub>`pnpm saf contract compile <input.json>`</sub> | <sub>Compile and digest a `TaskContractV1`</sub> |
| <sub>`pnpm saf lease verify \| replay \| reconcile`</sub> | <sub>Inspect and reconcile lease event chains</sub> |
| <sub>`pnpm saf evidence verify <manifest.json>`</sub> | <sub>Verify a sealed evidence manifest</sub> |

### Automation control plane

Phases 1–5 of
[`SAFRS_FULL_AUTOMATION_IMPLEMENTATION_PLAN.md`](docs/plans/active/SAFRS_FULL_AUTOMATION_IMPLEMENTATION_PLAN.md)
are implemented and merged. Phases 6–8 are deliberately parked: Chief resolved
the activation decisions on 2026-08-18, but no autonomous runner has been named.
Canonical behavior lives in
[`SAFRS_AUTOMATION.md`](docs/governance/SAFRS_AUTOMATION.md),
[`SAFRS_APPROVALS.md`](docs/governance/SAFRS_APPROVALS.md), and
[`SAFRS_EVIDENCE.md`](docs/governance/SAFRS_EVIDENCE.md); the architecture
decision is [ADR 0002](docs/adrs/0002-safrs-automation-control-plane.md).

| Layer | Delivered | Where |
| --- | --- | --- |
| <sub>Contracts and risk</sub> | <sub>`TaskContractV1` plus six sibling schemas, canonical JSON digests, monotonic risk (agents may raise it, never lower it)</sub> | <sub>`.safrs/schemas/`, `tools/automation/src/`</sub> |
| <sub>Leases</sub> | <sub>Serialized remote lease authority with fencing tokens; one GitHub issue per task as an append-only ledger</sub> | <sub>`.github/workflows/safrs-task-control.yml`</sub> |
| <sub>Guard and budgets</sub> | <sub>One vendor-neutral `authorize()` shared by every adapter, plus a task-wide budget ledger with a circuit breaker</sub> | <sub>`tools/automation/src/{guard,budgets}.mjs`</sub> |
| <sub>Publication gates</sub> | <sub>Eight stable checks — `SAFRS Contract · Lease · Risk · Budgets · Verification · Review · Evidence · Platform`</sub> | <sub>`.github/workflows/safrs-pr-gates.yml`</sub> |
| <sub>Evidence and approvals</sub> | <sub>Sealed, redacted, content-addressed manifests; approvals bound to exact head SHA, diff digest, and reviewer authority</sub> | <sub>`docs/evidence/automation/`</sub> |

Two properties are worth knowing before relying on it:

- **A gate validates the artifacts that exist.** When a gate's artifacts are
  genuinely absent — a human-authored pull request carries no run evidence —
  it reports `not_applicable` and passes. The same code becomes enforcing once
  Phases 6–7 produce those artifacts.
- **Digests must agree across languages.** Every contract and manifest is
  verified by both Node and Python; disagreement fails governance. Canonical
  JSON therefore accepts only safe integers, because engines spell floats
  differently.

Vendor adapters (Codex, Claude, Cursor, Cline) are thin translators into the
shared guard, so all four reach the same verdict for the same behavior. Droid
remains `read_only_disabled`; Chief resolved on 2026-08-18 that no unattended
Droid workflow will be introduced without a separately reviewed artifact and
installer.

### Capability status

| Capability | Status | Command | Requires |
| --- | --- | --- | --- |
| <sub>Single-command local bootstrap</sub> | <sub>Verified</sub> | <sub>`pnpm dev`</sub> | <sub>Docker (Postgres)</sub> |
| <sub>Local email development (`golden-path`)</sub> | <sub>Installed; needs credentials</sub> | <sub>`pnpm dev:email`</sub> | <sub>`EMAIL_FROM`, `RESEND_API_KEY`</sub> |
| <sub>Stripe sandbox webhooks (`golden-path`)</sub> | <sub>Installed; needs credentials</sub> | <sub>`pnpm stripe:listen`</sub> | <sub>`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, local Stripe CLI</sub> |
| <sub>Renovate</sub> | <sub>Patch, minor, pin, digest, and lockfile updates auto-merge only after tests pass; major updates wait for Chief</sub> | <sub>—</sub> | <sub>Dependency dashboard enabled; GitHub-native auto-merge is disabled</sub> |
| <sub>GitHub security</sub> | <sub>Secret scanning, push protection, Dependabot alerts and security updates, and dependency graph enabled</sub> | <sub>—</sub> | <sub>Live GitHub API check on 2026-08-20; continuous drift audit is not implemented</sub> |
| <sub>CODEOWNERS R2/R3 enforcement</sub> | <sub>Declared, **not yet enforced**</sub> | <sub>—</sub> | <sub>Branch protection on `main` (checklist in [`PLATFORM_ACTIVATION.md`](docs/governance/PLATFORM_ACTIVATION.md))</sub> |
| <sub>Publisher auto-merge</sub> | <sub>Evaluation-only</sub> | <sub>—</sub> | <sub>`SAFRS_PUBLISHER_ENABLED` stays false until Phase 6 activates the required identity and controls</sub> |

> [!IMPORTANT]
> `main` currently has **no branch protection**, so the eight gates above are
> published but not required. Requiring them, together with creating the
> auditor and publisher identities, is parked Phase 6 work. Chief resolved the
> activation policy on 2026-08-18; activation waits for a named runner and the
> Phase 6 reviewed change.

Additional optional capabilities (see `tools/capabilities/manifests/` for the
full catalog) can be previewed and recorded per project with:

```bash
pnpm capability:add --capability <id> --project <project> --preview
pnpm capability:add --capability <id> --project <project> --apply --confirm "ENABLE <id> FOR <project>"
```

Recording a capability does not install its runtime integration — see the
manifest's `sideEffects` and `removal` fields for what that entails.

### Declared conformance

This repository declares **SAFRS Core**. It does not claim Controlled, Secure,
or Regulated: those require live platform evidence that does not exist yet.
See [`SAFRS_CONFORMANCE.md`](docs/governance/SAFRS_CONFORMANCE.md).

---

## ── OPEN CHANNEL

<p align="center">
  <a href="https://discord.gg/1511829076313374745"><img src="https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord" /></a>
  <a href="https://linkedin.com/in/dr-ferdi-iskandar-1b620a3b5"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn" /></a>
  <a href="https://medium.com/@ferdiiskandarse"><img src="https://img.shields.io/badge/Medium-111111?style=for-the-badge&logo=medium&logoColor=white" alt="Medium" /></a>
  <a href="https://quora.com/profile/drferdiiskadar@gmail.com"><img src="https://img.shields.io/badge/Quora-B92B27?style=for-the-badge&logo=quora&logoColor=white" alt="Quora" /></a>
  <a href="https://reddit.com/user/SixCupaCoffee"><img src="https://img.shields.io/badge/Reddit-FF4500?style=for-the-badge&logo=reddit&logoColor=white" alt="Reddit" /></a>
  <a href="https://tiktok.com/@drferdii"><img src="https://img.shields.io/badge/TikTok-000000?style=for-the-badge&logo=tiktok&logoColor=white" alt="TikTok" /></a>
  <a href="https://x.com/ClaudesyI81047"><img src="https://img.shields.io/badge/X-000000?style=for-the-badge&logo=x&logoColor=white" alt="X" /></a>
  <a href="mailto:drferdiiskadar@gmail.com"><img src="https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Email" /></a>
</p>

---

## ── TECHNOLOGY

<p align="center">
  <img src="https://img.shields.io/badge/PowerShell-5391FE?style=for-the-badge&logo=powershell&logoColor=white" alt="PowerShell" />
  <img src="https://img.shields.io/badge/Python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54" alt="Python" />
  <img src="https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white" alt="pnpm" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white" alt="Turborepo" />
  <img src="https://img.shields.io/badge/Biome-60A5FA?style=for-the-badge&logo=biome&logoColor=white" alt="Biome" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=000000" alt="React" />
  <img src="https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white" alt="Hono" />
  <img src="https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Postgres-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="Postgres" />
  <img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright" />
  <img src="https://img.shields.io/badge/OpenTelemetry-000000?style=for-the-badge&logo=opentelemetry&logoColor=white" alt="OpenTelemetry" />
  <img src="https://img.shields.io/badge/Git-F05033?style=for-the-badge&logo=git&logoColor=white" alt="Git" />
  <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/Docker-0DB7ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

---

<p align="center">
  <b>Dedicated to Aldebaran, Aimee, Audrey, and Del — & the Indonesia Healthcare Ecosystem.</b><br />
  <sub>Sentra Artificial Intelligence · Built in the depth, deployed at the bedside.</sub><br />
  <sub><code>// the surface is documentation. the depth is running.</code></sub>
</p>

