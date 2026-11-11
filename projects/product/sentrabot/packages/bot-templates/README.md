# Sentra Chief of Staff Production Starter

**Version 2.1.0 · Indonesia-first · 2026-08-31 research baseline**

A production-oriented repository for building **outcome-owned Chief of Staff agents** with explicit source-of-truth rules, authority boundaries, human approval gates, agentic threat controls, structured role contracts, and evaluation assets.

This is deliberately **not a prompt pack**. It separates what an agent is instructed to do from what a system actually allows it to do.

## What ships

- **66 role packages** across 13 operating domains.
- Each role includes `template.json`, `ROLE.md`, and `evals.json`.
- Typed TypeScript contracts for templates, actions, policy decisions, evidence, and evaluations.
- Conservative `ALLOW / REQUIRE_APPROVAL / DENY` policy engine.
- Repository-wide template validator and CLI.
- Layered prompt compiler.
- Global, enterprise, healthcare, and Indonesia governance packs.
- Threat model for prompt injection, excessive agency, shared-session risk, stale data, source conflict, and approval fatigue.
- Evaluation packs for golden, adversarial, reliability, and governance cases.
- Product/UI design system and static builder reference.
- Worked configurations for **Clara**, **Atlas**, and **Lex**.
- Deployment, security, production-readiness, and release checklists.

## Design thesis

```text
Outcome ownership
      +
Authoritative source discipline
      +
Minimum necessary agency
      +
Explicit approval boundaries
      +
Evidence / action provenance
      +
Behavioral evaluation
      =
Operationally trustworthy Chief of Staff agent
```

## Contract stack

```text
SYSTEM CORE
    ↓
CHIEF OF STAFF CONTRACT
    ↓
JURISDICTION POLICY
    ↓
ORGANIZATION POLICY
    ↓
DOMAIN POLICY
    ↓
ROLE OVERLAY
    ↓
USER CONFIGURATION
    ↓
CURRENT TASK
```

A lower layer may become more restrictive. It must not silently weaken an inherited safety boundary.

## Authority model

| Level | Meaning | Default |
|---|---|---:|
| **Observe** | read, search, retrieve, monitor |  |
| **Prepare** | analyze, reconcile, draft, recommend | **✓** |
| **Propose** | construct a fully specified action and request approval |  |
| **Execute** | only explicitly granted capabilities |  |

Consequential categories such as external communication, purchases/fund transfers, destructive changes, permission changes, production changes, and legal acceptance remain approval-gated by default. High-risk domain overlays add further gates.

## Repository map

```text
core/                 shared operating contracts
schemas/              machine-readable schemas
src/domain/            TypeScript contract model
src/validation/        production invariant validator
src/policy/            approval / authority decision engine
src/runtime/           deterministic prompt composition
src/registry/          role discovery and loading
src/cli/               repository validation CLI

templates/             66 complete role packages
governance/            policy packs and regulatory status
evals/                 reusable behavioral evaluation cases
ui/                    design tokens, builder UX, reference prototype
examples/              Clara, Atlas, Lex worked configurations
deployment/            security and production runbooks
docs/                  architecture, threat model, research provenance
```

## Role catalog

### Leadership — 6
Executive; Founder; Strategy; Board & Governance; Transformation & PMO; Corporate Affairs.

### Corporate — 11
Finance & Business; Treasury; Legal Affairs; Law Practice; Tax & Accounting Practice; Risk & Compliance; Internal Audit; People & HR; Procurement & Vendor; Privacy & Data Governance; ESG & Sustainability.

### Commercial — 6
Revenue; Sales Operations; Growth & Marketing; Customer Success; Partnerships; Pricing & Revenue Management.

### Operations — 12
Operations; Supply Chain; Manufacturing; Quality; Facilities; Project Delivery; Crisis & Business Continuity; Health, Safety & Environment; Construction & Property; Hospitality & F&B; Logistics & Last-Mile; Agriculture & Plantation.

### Technology — 8
Product; Engineering; AI & Data; Cybersecurity; Technology Operations; DevOps & SRE; Enterprise IT; AI Governance.

### Healthcare — 7
Hospital Executive; Healthcare Operations; Clinical Operations; Quality & Patient Safety; Healthcare Regulatory & Accreditation; Healthcare Finance; Healthcare Workforce.

### Research & Education — 4
Academic & Research; Clinical Research; Knowledge & Intelligence; Education & Academic Operations.

### Indonesia & Public Sector — 4
Public Affairs & Government Relations; Public Policy; Regulatory Intelligence; Public Sector Program Delivery.

### Small Business — 1
UMKM Owner.

### Financial Services — 1
Financial Services.

### Creative — 1
Creator & Media.

### Social Impact — 1
NGO & Social Program.

### Personal — 4
Career & Job Search; Personal Finance; Freelancer; Student.

See `templates/registry.json` for machine-readable discovery.

## Quick start

Prerequisites: Node.js 22+ and TypeScript 5.x (`npm install` installs the declared development dependency).

```bash
npm install
npm run check
```

Expected repository validation:

```text
Validated 66 templates: 66 valid, 0 invalid, 0 warnings.
```

Compile:

```bash
npm run build
```

Validate role packages only:

```bash
npm run validate:templates
```

## Example: policy decision

```ts
const decision = decideAction(template, {
  capability: 'send_external_email',
  requestedLevel: 'execute',
  category: 'external_communication',
  externalEffect: true
});

// => REQUIRE_APPROVAL
```

The engine does not assume that a convincing prompt is permission.

## Adding a role

1. Create `templates/<domain>/<role>/template.json`.
2. Add explicit ownership and exclusions.
3. Declare authoritative/supporting/contextual source classes.
4. Default authority to `prepare`.
5. Add mandatory and domain-specific approval categories.
6. Create `ROLE.md` with the specialized operating overlay.
7. Create `evals.json` including all mandatory cases.
8. Add the role to `templates/registry.json`.
9. Run `npm run check`.
10. Test against the real target model/tool runtime before promotion to a routine.

## Grok Bot / xAI implementation notes

The design baseline was re-verified against xAI Grok Bot documentation on 2026-08-31. Important assumptions include the task → skill → routine progression, explicit approval boundaries, current authoritative sources, and the fact that bot identity does not itself provide security isolation where an account-level computer/session is shared. See `docs/SOURCES.md`.

## Indonesia governance

The repository deliberately separates regulatory status from operational role text. `governance/indonesia/regulatory-status-2026-08-31.json` labels UU PDP as enacted, SE 9/2023 as guidance, and the 2026 AI presidential instruments as draft/awaiting establishment according to the cited official Komdigi reporting available at the research date.

**This repository is an engineering and governance starter, not legal advice or a substitute for sector-specific professional review.**

## Security position

- Prompt text is not access control.
- Bot names are not security boundaries.
- Retrieved content is untrusted data.
- Sensitive access belongs in scoped connectors, credentials, service accounts, network policy, tool policy, and approval controls.
- Audit controls should be outside the agent's ability to disable.
- High-risk actions require enhanced human oversight.

Read `SECURITY.md` and `docs/THREAT_MODEL.md` before connecting real systems.

## Static UI reference

Open `ui/prototype/index.html` locally to review the proposed dark-first role catalog and authority inspector without installing a frontend framework.

## Status

This starter provides validated reference architecture and reusable implementation primitives. It does **not** include production credentials, vendor-specific connector code, or authorization to automate regulated decisions.
