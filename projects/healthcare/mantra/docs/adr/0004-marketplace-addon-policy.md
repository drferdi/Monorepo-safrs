# ADR-0004: Marketplace Addon Policy (Staging / Pilot / Adapt / Reject)

## Status

**Accepted — 2026-07-19** (executive inventory locked; Wave 1 install remains
Class C — Chief GO + staging snapshot required before `bench get-app` /
`install-app`).

Melengkapi ADR-0000 (version baseline), ADR-0001 (custom app boundaries), and
ADR-0002 (secrets). Does not modify upstream `frappe` / `erpnext` / `hrms` /
`healthcare`.

## Context

Frappe Cloud Marketplace offers hundreds of apps. For RSIA Melinda / Sentra
MANTRA (PHI, fiscal, clinical SoR), ad-hoc installs create upgrade risk,
permission interaction, storage bloat, and third-party data exposure.

Executive recommendation (2026-07-19) classified marketplace apps into four
buckets. This ADR makes that inventory the SSOT and defines ownership relative
to the five `sentra_mantra_*` apps.

Operational detail lives in:

- [`docs/operations/addon-pin-matrix.md`](../operations/addon-pin-matrix.md)
- [`docs/operations/2026-07-19-addon-staging-install-playbook.md`](../operations/2026-07-19-addon-staging-install-playbook.md)
- [`docs/operations/addon-pilot-wave2.md`](../operations/addon-pilot-wave2.md)

## Decision

### 1. Inventory (locked counts)

| Bucket | Count | Action |
| --- | ---: | --- |
| Staging Wave 1 | 5 | Install on staging after Chief GO + snapshot |
| Pilot Wave 2 | 4 | Limited pilot; separate Chief GO |
| Adapt (do not install) | 3 | Implement principles inside custom apps |
| Reject | 5 | Do not install on MANTRA production or staging used for ops |

### 2. Wave 1 — staging allowlist (install order mandatory)

| Order | App (marketplace) | Bench app name (verify at install) | Role for MANTRA |
| --- | --- | --- | --- |
| 1 | Frappe Insights | `insights` | Executive BI / analytics on curated read-only sources |
| 2 | Frappe Helpdesk | `helpdesk` | IT, facility, biomedical, patient-relations tickets (not EMR) |
| 3 | Frappe Wiki | `wiki` | SOP / policy knowledge base (stable pin only) |
| 4 | ERPNext Indonesia Localization | verify at install | CoreTax / Indonesian tax sandbox validation |
| 5 | PDF on Submit | verify at install | Permanent PDF attach on whitelisted submittable DocTypes |

### 3. Wave 2 — limited pilot (no install in Wave 1)

| App | Pilot scope |
| --- | --- |
| Frappe WhatsApp | Appointment / admin notifications via approved templates; communication boundary only |
| Raven | Nonclinical internal chat (IT, management, maintenance, implementation) |
| Print Designer | Noncritical print exploration only; critical docs stay coded Jinja |
| Frappe Drive | Nonclinical admin collaboration; not primary medical-record store |

### 4. Adapt — concepts only (backlog; not marketplace installs)

| Concept | Source inspiration | Target custom app |
| --- | --- | --- |
| Maker–Checker + consolidated audit | Audit Control Reports | `sentra_mantra_core` (Audit Event Registry) |
| Restrict-first permission grants | DocType Permission | `sentra_mantra_core` (Permission Policy Layer) |
| Compliance registry (licences, SIP/STR, SIO, accreditation) | Compliance Plus | `sentra_mantra_hospital` (+ indonesia regulatory refs) |

Principles to encode later (not in this ADR’s install wave):

- Creator ≠ approver; approver ≠ payer.
- Cancellation requires reason; backdated txn needs authorization.
- Vendor bank-account changes need dual approval; overrides → audit events.
- Default deny, then grant by role for salary, patient, purchase price, management docs.
- Hospital compliance entities: izin operasional, SIP/STR, SIO, kalibrasi, akreditasi, kontrak/asuransi, kredensial dokter, due dates regulasi, temuan audit / CAPA.

### 5. Reject — do not install

| App | Reason |
| --- | --- |
| FAC / Frappe Assistant Core | LLM read/write/execute surface too wide for hospital SoR |
| Frappe S3 Attachment | Example configs weaken block-public-access; unacceptable for hospital docs |
| Digital Signature | Marketplace support stuck on older Frappe; not certified e-sign for ID law |
| FCM Notification | Marketplace lists legacy Frappe only (not v15 baseline) |
| Email Delivery Service | Overrides org email; third-party retention; PHI/email risk |

Sandbox-only exception for FAC: synthetic data, read-only tools, strict allowlist —
never production MANTRA.

### 6. Ownership boundaries vs custom apps

| Concern | Owns | Must not |
| --- | --- | --- |
| CoreTax XML / Indonesia tax UI from localization app | Marketplace Indonesia Localization (sandbox→validated) | Replace BPJS / PPh 21 / KFA / UU PDP in `sentra_mantra_indonesia` |
| BPJS, PPh 21, THR, KFA, UU PDP, CoA Indonesia templates | `sentra_mantra_indonesia` | Duplicate CoreTax exporter if localization app is adopted for that job |
| Desk BI for directors (near term) | Insights (Wave 1) | Raw Patient identifiers on shared dashboards; blanket prod table access |
| Tahap 8 Executive Dashboard / portals / Melinda agent UI | `sentra_mantra_portal` | Be blocked by Insights — Insights is Desk BI now; portal remains BFF/Vue later |
| Clinical SoR (encounters, notes) | `healthcare` + `sentra_mantra_hospital` | Live in Helpdesk tickets, Raven, Drive, or WhatsApp bodies |
| External adapters (SATUSEHAT, BPJS APIs) | `sentra_mantra_integrations` | Become SoR if WhatsApp/Meta fails |

### 7. Pin and install policy

1. Every marketplace app is pinned to an explicit **tag or commit SHA** compatible
   with Frappe/ERPNext **version-15**. Record in the pin matrix before/at install.
2. Do **not** track `develop` or Wiki **release-candidate** on staging used for
   operations. Prefer last stable tag; verify against GitHub at install time.
3. Install **one app at a time**: `get-app` → `install-app` → `migrate` → smoke →
   pin-matrix update. Never batch five installs without intermediate smoke.
4. Install is **Class C**: requires Chief `GO` and off-machine staging snapshot /
   clone proof. Production install is out of scope until a later GO.
5. Secrets (WhatsApp tokens, DB RO password for Insights, etc.) follow ADR-0002:
   env var references; Password fields for DocType credentials; never CLI literals.
6. Keep `mute_emails=1` (DECISIONS 2026-07-18) until outgoing email is
   deliberately re-enabled for a Helpdesk pilot.

### 8. Insights and Helpdesk guardrails (normative)

**Insights:** MariaDB (or equivalent) **read-only** account; curated views /
allowlisted queries; role-separated dashboards; no direct unrestricted access to
all production tables; avoid exposing patient identity columns on shared boards.

**Helpdesk:** Separate queues — IT, Facility, Biomedical, Patient Relations,
Housekeeping, Finance Support. Tickets are not medical records; no sensitive
clinical narrative in general queues.

**PDF on Submit:** Whitelist only (e.g. Purchase Order, Purchase Invoice,
selected Payment Entry, contracts, berita acara). Default off elsewhere to
limit storage duplication.

## Consequences

- Positive: clear allow/deny list; upgrade and PHI risk bounded; Indonesia fiscal
  experimentation isolated from BPJS/clinical ownership in custom apps.
- Trade-off: Wave 1 adds five upgrade surfaces; pin matrix and regression after
  Frappe/ERPNext/HRMS/healthcare upgrades become mandatory ops.
- Trade-off: Indonesia Localization may overlap tax templates with
  `sentra_mantra_indonesia` — resolve conflicts in favor of one SoR per tax
  artifact after accountant validation (open question below).

## Open Questions

1. Exact git URLs, bench app module names, and v15-compatible tags/SHAs for all
   Wave 1 apps — fill pin matrix at install time from GitHub / Marketplace
   (do not invent forks).
2. After Indonesia Localization sandbox validation: which tax artifacts remain
   owned by the marketplace app vs `sentra_mantra_indonesia`?
3. Staging site name if not the same clone as `mantra.localhost` (document in
   playbook when snapshot is taken).

## Alternatives Considered

- **Install many marketplace apps early** — rejected: PHI, storage, and upgrade risk.
- **Build all BI/ticket/wiki in custom apps first** — deferred: official Frappe
  apps cover Wave 1 faster; custom apps stay for hospital-specific governance.
- **Adopt Compliance Plus / DocType Permission / Audit Control Reports as deps** —
  rejected: low install base / paid / permission interaction; adapt principles instead.
