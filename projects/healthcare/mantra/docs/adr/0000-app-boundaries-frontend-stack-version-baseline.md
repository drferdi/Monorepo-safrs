# ADR-0001: App Boundaries, Frontend Stack, and Version Baseline Correction

- **Status:** Accepted
- **Date:** 2026-07-14
- **Scope:** Sentra MANTRA (Hospital Management System, RSIA Melinda)
- **Bench root:** `apps/healthcare/mantra` (Frappe v15, Docker Dev Container)

## 1. Context

Sentra MANTRA is built on Frappe Framework v15 + ERPNext + Frappe HR + Marley
Health (app name `healthcare`), all confirmed installed and verified at
`version-15` as of this ADR:

```
frappe     15.114.0 version-15
erpnext    15.116.0 version-15
hrms       15.62.2  version-15
healthcare 15.2.0   version-15
```

Sentra-specific logic will live in custom Frappe apps, kept separate from the
four upstream apps above (never modify upstream source directly). Before
running `bench new-app` for the first time, three decisions needed to be
written down instead of left as inferred/tribal knowledge:

1. Why `version-15` is the baseline (the original installation guide's stated
   reason turned out to be factually incorrect — see §2).
2. What belongs in each of the four custom apps (previously undocumented —
   see §3).
3. What frontend stack Tahap 8 (Executive Dashboard, patient/customer-facing
   portals, agent Melinda) will use, and where that code lives (see §4).

## 2. Decision — Version baseline stays `version-15`

**Decision:** `MANTRA_BASELINE = version-15` for all four upstream apps.

**Correction to the original installation guide:** The guide's Bagian 2
justified this by claiming Frappe HR's release page still showed `v15.62.2`
as its latest release while the other three apps already had v16 releases.
This claim was checked against GitHub directly and is **incorrect** — as of
July 2026, `frappe/hrms`, `frappe/erpnext`, `frappe/frappe`, and
`earthians/marley` (healthcare) all have actively maintained v16 release
tracks. That reasoning must not be repeated or cited going forward.

**Actual reasoning for staying on `version-15`:**

- The entire v16 stack across all four apps is young in production terms
  (GA since roughly December 2025–January 2026 for frappe/erpnext/hrms, and
  mid-January 2026 for Marley Healthcare) — under a year of field-proven use
  for a clinical, billing, and payroll system by the time MANTRA reaches
  production for RSIA Melinda.
- No official HRMS `version-15` → `version-16` migration guide exists yet
  (tracked as an open feature request against `frappe/hrms` as of March
  2026). Upgrading a live hospital's payroll/HR data without an official
  migration path is an unacceptable risk.
- `version-15` remains actively patched (confirmed via `frappe/hrms` release
  history showing continued `v15.x` releases in parallel with `v16.x`), so
  staying on it is not staying on an abandoned branch.

**Consequence:** `MANTRA_NEXT = version-16` remains a separate lab-only
track. Production baseline only moves to v16 after: an official HRMS
migration guide exists, a full parallel-run/regression cycle passes in the
lab environment, and this ADR is superseded.

## 3. Decision — Custom app boundaries

Four custom apps, each with a single, non-overlapping responsibility:

| App | Responsibility | Explicit source |
|---|---|---|
| `sentra_mantra_core` | Reusable domain logic shared across all phases (Tahap 0–8) — cross-cutting utilities, shared DocTypes/mixins not specific to one hospital or one country. Nothing hospital-specific or Indonesia-specific belongs here. | Inferred — no other app fits generic shared logic |
| `sentra_mantra_hospital` | Hospital/clinical-specific extensions to Marley (`healthcare`), including Melinda Maternal Workflows (mother–baby linkage, VK operations, neonatal workflow, maternal billing, maternal quality indicators). | Explicit — Bagian 6 of the original installation guide |
| `sentra_mantra_indonesia` | Indonesia-specific localization: BPJS business rules, PPh 21, THR, KFA (Kode Farmasi & Alkes) mapping, and other regulatory/localization logic not specific to one hospital. | Inferred — grouped from Tahap 3 (payroll/BPJS/PPh21) and Tahap 5 (KFA mapping) |
| `sentra_mantra_integrations` | External system adapters: SATUSEHAT (FHIR resources, identifier mapping, retry/reconciliation), BPJS (eligibility, SEP, Antrean Online, Mobile JKN). Integrations must never become the system of record — internal transactions persist even if an external call fails (outbox/retry pattern). | Explicit — Bagian 7 of the original installation guide |

**Rule:** if a piece of logic could plausibly go in two of the above, it goes
in the more specific one (hospital > indonesia > core), never duplicated in
both. Any ambiguity found during implementation gets resolved by amending
this ADR, not by silent duplication.

## 4. Decision — Tahap 8 frontend stack

**A fifth custom app, `sentra_mantra_portal`, holds all Tahap 8 frontend
code.** It is *not* merged into `core`, `hospital`, `indonesia`, or
`integrations` — those four are backend/domain apps; mixing frontend into
them would blur the same boundary this ADR exists to enforce.

**Stack:** Vue 3 + Vite + TailwindCSS + **Frappe UI** — the framework
Frappe's own team uses for its own custom apps (Helpdesk, CRM, LMS, Frappe
Cloud, Frappe Books), following their shared "Espresso" design system.
Rejected alternative: `frappe-ui-react` (a community-maintained React port
by rtCamp) — valid if the dev team is React-only, but not the default
because it is not maintained by the Frappe core team and trails official
releases.

**Access pattern:** `sentra_mantra_portal` talks to the backend through an
API contract / Backend-for-Frontend layer defined in
`sentra_mantra_integrations`, never by exposing Frappe's generic DocType
REST API directly to the frontend (per Bagian 8 of the original installation
guide).

**Design tokens:** `sentra_mantra_portal` will use the design system
documented in `sentra-token-DB01`
(https://github.com/drferdii/sentra-token-DB01) as its design *specification*
— colors, typography, spacing, radius, elevation, and component guidance —
but **not** as a consumable dependency/package.

> **Status: reviewed, 2026-07-14.** The repo is public (45 KB), owned by
> Chief. Its README (1563 lines, 33 sections) documents a mature, detailed
> design system — but the actual implemented code is only **11 CSS custom
> properties** in `src/app/globals.css` (7 neutral/surface colors, 3
> semantic accent colors, 1 font stack). Spacing, radius, shadow, and
> type-scale tokens described in the README are **not implemented in code**,
> and several files the README documents (`src/lib/db01-tokens.ts`,
> `src/components/db01/*`, `docs/*.md`) do not exist in the repo. Variable
> naming in the README (`--db01-*`) does not even match the actual file
> (`--sentra-db01-*`). `package.json` is named `stride-dashboard` (not
> `sentra-token-db01`) and is a standalone Next.js demo, not an installable
> package (`private: true`, no `main`/`exports`) — it cannot be added as a
> dependency.
>
> **Decision:** when `sentra_mantra_portal` is actually scaffolded (Tahap 8,
> not yet started), its own token file (Tailwind v4 `@theme` block or CSS
> custom properties) will be hand-written by porting values from the
> `sentra-token-DB01` README as the design spec of record — starting from
> the 11 already-implemented variables as the confirmed baseline, and
> filling in spacing/radius/shadow/type-scale from the README's documented
> values only after re-verifying each against actual rendered output, not
> assumed correct just because they're written down. `sentra-token-DB01`
> itself is not cloned or imported as a build dependency of
> `sentra_mantra_portal`.
>
> Separately, and outside Sentra MANTRA's scope: `sentra-token-DB01`'s own
> README claims `Visibility: Private` while GitHub reports it as Public, and
> its GitHub "description" field describes a security/auth-token product —
> neither matches the repo's actual design-system content. Worth Chief's
> own cleanup at some point, not something this project needs to fix.

> **Actual token values (verified directly, 2026-07-14)** — `src/app/globals.css`:
>
> ```css
> --sentra-db01-canvas: #3e3e3e;
> --sentra-db01-shell: #1b1b1b;
> --sentra-db01-sidebar: #181818;
> --sentra-db01-raised: #282828;
> --sentra-db01-text: #f4f4f1;
> --sentra-db01-muted: #90908d;
> --sentra-db01-divider: rgb(255 255 255 / 6%);
> --sentra-db01-accent-green: #30d069;
> --sentra-db01-accent-blue: #1399e9;
> --sentra-db01-accent-red: #f53b37;
> --sentra-db01-font: "Avenir Next", "Segoe UI", sans-serif;
> ```
>
> Note: `color-scheme: dark` — this is a **dark-by-default** theme. Worth
> revisiting at Tahap 8: most hospital data-entry UIs (clinical forms, long
> shifts) favor a light theme for readability and fatigue; inheriting a dark
> theme by default should be a deliberate choice, not an accident of which
> repo we ported from.

## 5. Consequences

- No `bench new-app` should be run for any of the five apps
  (`core`/`hospital`/`indonesia`/`integrations`/`portal`) in a way that
  violates the boundaries in §3–§4.
- `sentra_mantra_portal` is the only one of the five with a Node/Vite
  toolchain; the other four are pure Frappe/Python apps.
- Future ambiguity about where a piece of logic belongs should be resolved
  by amending this ADR, not by ad-hoc placement.

## 6. Open follow-ups

- [x] Claude Code: fetch and report `sentra-token-DB01` structure (read-only,
      no integration yet) — done 2026-07-14, see §4.
- [x] Amend §4 once token structure is known, before scaffolding
      `sentra_mantra_portal` — done, see §4.
- [ ] When `sentra_mantra_portal` is actually scaffolded (Tahap 8), hand-port
      spacing/radius/shadow/type-scale values from the `sentra-token-DB01`
      README into its own token file — re-verify each value against
      rendered output, don't copy README prose as ground truth without
      checking.
- [ ] **Desktop wrapper (decided, not yet designed):** `sentra_mantra_portal`
      will ship as an Electron desktop app, not Tauri, per Chief's explicit
      choice — overriding the Tauri recommendation discussed earlier in this
      project's history. Scope: Electron bundles only the static frontend
      build output; the Frappe backend stays server-side, accessed through
      the same BFF pattern as the web version (no direct DocType REST calls
      from the Electron main process). Full design (folder location, build
      pipeline, auto-updater, version-compatibility check against the
      backend) is deferred until Tahap 8 work actually starts — not before.
