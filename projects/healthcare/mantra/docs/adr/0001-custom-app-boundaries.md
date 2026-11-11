# ADR-0001: Custom App Boundaries and Dependency Direction

## Status

Accepted — 2026-07-15
(Scope of `sentra_mantra_portal` is a working assumption pending explicit confirmation — see Open Questions.)

## Context

The Sentra MANTRA bench has 9 apps installed: `frappe`, `erpnext`, `hrms`, `healthcare` (upstream, unmodified), and 5 custom apps — `sentra_mantra_core`, `sentra_mantra_hospital`, `sentra_mantra_indonesia`, `sentra_mantra_integrations`, `sentra_mantra_portal`.

Tahap 1 (master data) is about to begin, which means more than one contributor may start writing DocTypes and business logic in parallel across these custom apps. Without an explicit boundary, two failure modes are likely:

- Duplicate or conflicting DocTypes (e.g. a "Medical Department" concept re-implemented in `sentra_mantra_hospital` when it may already exist natively in `healthcare`).
- Circular dependencies between custom apps once cross-app imports start happening ad hoc.

The founder's stated ambition is national scale (multiple hospitals over time), while the current pilot is a single hospital (RSIA Melinda). This ADR also fixes the segregation strategy for that tension, because it is expensive to change after Company/Branch and naming series exist with real transactions (Tahap 2+).

## Decision

### 1. Ownership per app

| App | Owns | Must NOT contain |
|---|---|---|
| `sentra_mantra_core` | Cross-cutting mixins/utilities, Company/Branch scoping helpers, naming-series generator framework, audit-log framework, platform settings DocType, Role/Permission scaffolding (framework, not instances) | Clinical logic, Indonesia-specific rules, external integration code |
| `sentra_mantra_hospital` | Hospital Unit / Medical Department / Service Unit (only if not already native to `healthcare` — verify first), Melinda Maternal Workflows (as a configurable module, not hardcoded to one hospital name), ward/bed/discharge orchestration beyond stock Marley Health, clinical quality indicators | BPJS/SATUSEHAT rules, Indonesian tax/regulatory logic, UI/BFF code |
| `sentra_mantra_indonesia` | BPJS eligibility/contribution business rules (logic only, not the API client), KFA mapping, UU PDP compliance controls (data subject rights, breach notification records), Indonesian Chart of Accounts template, regulatory naming-series formats (MRN, tax invoice number) | HTTP clients to SATUSEHAT/BPJS, hospital-specific clinical workflows |
| `sentra_mantra_integrations` | SATUSEHAT FHIR client, BPJS API client (SEP, referral, Antrean Online, Mobile JKN), retry/reconciliation queues, external API credential handling | Any system-of-record responsibility — internal transactions must remain valid and stored even if an external service call fails |
| `sentra_mantra_portal` *(assumption — confirm)* | BFF/API contract layer for the 9 MANTRA frontends (Executive, Finance, People, Supply, Pharmacy, Patient Administration, Quality, Customer Service) and the Melinda agent; patient self-service portal if in scope | Business logic duplicated from other apps |

**Precedent for `sentra_mantra_core` "Role/Permission scaffolding (framework, not instances)"
(first concrete example, Chief GO 2026-07-15):** the Custom Field `disabled` (Check, default 0) on
DocType `Designation` lives in core, added via the versioned patch
`sentra_mantra_core/patches/v0_0/add_designation_disabled_field.py` (registered in `patches.txt`,
applied by `bench migrate` — never created ad hoc through the console). Rationale: it is a
cross-cutting HR-master capability (upstream Designation lacks a disable flag), not clinical,
not Indonesia-specific. Flagging the 31 generic wizard-fixture Designations as disabled is itself
reproducible via the companion data-fix patch
`sentra_mantra_core/patches/v0_0/disable_generic_designations.py` (Chief GO 2026-07-15, superseding
the earlier "site data, outside the patch" stance): idempotent, exact-match on the 31 fixture names
only, safe on fresh sites where those records don't exist yet. A patch already recorded in the
site's Patch Log never re-runs on `bench migrate`, so behaviour extensions always go into a NEW
patch file — never appended to an executed one.

### 2. Dependency direction (enforced)

```
sentra_mantra_core
   ^              ^
sentra_mantra_hospital   sentra_mantra_indonesia
   ^                          ^
   +------------+-------------+
                |
   sentra_mantra_integrations
   sentra_mantra_portal
```

- `core` may be depended on by all other custom apps; `core` depends on none of them.
- `hospital` and `indonesia` must never import from `integrations` or `portal`.
- Cross-app access happens only through explicit public modules (e.g. `hospital/public_api/`) or Frappe hooks — never by importing another app's internal service classes directly.

### 3. Multi-hospital segregation strategy (confirmed with Chief, 2026-07-15)

Single Bench, single site. Multi-hospital segregation happens at the **Company/Branch** level in ERPNext, not at the DocType, module, or app level. Consequence: hospital-specific naming such as "Melinda Maternal Workflows" must be implemented as a configurable module parameterized by Company/Branch, not hardcoded to a specific hospital's name in code.

## Consequences

- Positive: prevents circular dependencies before parallel development starts; gives a single reference table for where new DocTypes/logic belong; keeps the door open to onboarding additional hospitals without an app rewrite.
- Negative / trade-off: ~~there is no automated lint rule enforcing the import direction yet~~ **Resolved 2026-07-15:** `scripts/check_app_boundaries.py` (bench root) statically enforces both the dependency direction and the public-surface rule (`<app>.public_api`) across all five custom apps. Run `python scripts/check_app_boundaries.py`; exit 1 on violation. Wired into git pre-commit for all five custom app repos via `python scripts/install_boundary_hooks.py` (2026-07-15, verified: a violating commit is rejected). Git hooks are not versioned — re-run that installer once after any fresh clone of a custom app. No CI yet.
- Blocks one open item below from being treated as settled.

## Open Questions (must resolve before parallel development on these apps begins)

1. Confirm the intended scope of `sentra_mantra_portal` explicitly (BFF-only vs. also patient-facing portal).
2. ~~Verify whether "Hospital Unit", "Medical Department", "Service Unit" already exist as native DocTypes in the `healthcare` app before creating new ones in `sentra_mantra_hospital`.~~ **Resolved 2026-07-15 (verified against installed `healthcare` 15.2.0 source):** `Medical Department`, `Healthcare Service Unit`, and `Healthcare Service Unit Type` exist natively (`healthcare/healthcare/doctype/`). There is no native "Hospital Unit" DocType — that concept is modeled as a tree of Healthcare Service Units. Consequence: `sentra_mantra_hospital` must NOT create DocTypes for these three concepts; extend the native ones via Custom Field/hooks if needed.

## Alternatives Considered

- **Single monolithic custom app** — rejected: breaks the "don't modify upstream, no hidden fallback" discipline already established, and creates unclear ownership as more than one person contributes.
- **Per-hospital custom app instead of Company/Branch segregation** — rejected: does not scale to a national multi-hospital ambition without an app per hospital, which multiplies maintenance cost.
