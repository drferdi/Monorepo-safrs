# Addon Adapt Backlog — Custom Apps (not marketplace installs)

**Status:** Backlog only. Inspired by marketplace concepts; **do not** install
Audit Control Reports, DocType Permission, or Compliance Plus as production
dependencies (ADR-0004 §4).

Each item needs its own future plan/ADR when scheduled. No schema work here
without Class C Chief GO.

## 1. Maker–Checker + Audit Event Registry

| Field | Value |
| --- | --- |
| Inspiration | Audit Control Reports (maker ≠ checker; consolidated audit trail) |
| Target app | `sentra_mantra_core` |
| Why not install | Very low marketplace install base; hospital needs native workflow hooks |

**Behaviors to implement later**

- Creator ≠ approver on material financial docs (SI/PI/PE/JE as applicable).
- Approver ≠ payer where payment separation is required.
- Cancellation requires reason.
- Backdated transactions require authorization.
- Vendor bank-account changes require dual approval.
- All overrides emit durable audit events (metadata only — no secrets/PHI dumps).

**Exit when:** Dedicated plan + tests under `sentra_mantra_core`; boundary check green.

## 2. Permission Policy Layer (restrict first, grant later)

| Field | Value |
| --- | --- |
| Inspiration | DocType Permission (default deny, then role grants) |
| Target app | `sentra_mantra_core` |
| Why not install | Hooks into `permission_query_conditions` / `has_permission` interact
  poorly with ERPNext + HRMS + Marley; tiny install base |

**Behaviors to implement later**

- Policy framework for salary, patient, purchase price, and management DocTypes.
- Explicit grant records; default deny for sensitive modules.
- Compatibility matrix tested against healthcare Patient and HR salary DocTypes.
- Prefer thin hooks + documented allowlists over a third-party permission app.

**Exit when:** Dedicated plan + permission tests; no silent widen of Patient access.

## 3. Compliance Registry

| Field | Value |
| --- | --- |
| Inspiration | Compliance Plus (licences, insurance, expiry reminders) |
| Target app | `sentra_mantra_hospital` (regulatory cross-refs may touch
  `sentra_mantra_indonesia` via public_api / data only — never reverse import) |
| Why not install | Paid / ~2 installs; data model must match Indonesian hospital governance |

**Entities to model later (indicative)**

- Izin operasional rumah sakit  
- SIP / STR tenaga kesehatan  
- SIO alat; kalibrasi alat  
- Sertifikat pemadam / keselamatan  
- Perizinan radiologi / laboratorium (if applicable)  
- Akreditasi rumah sakit  
- Kontrak dan asuransi  
- Kredensial dokter  
- Due date pelaporan regulasi  
- Temuan audit dan corrective action (CAPA)  

**Exit when:** Dedicated DocType plan + expiry reminder design + Tahap-appropriate
fixtures (synthetic only).

## Scheduling note

Do not block Wave 1 marketplace installs on this backlog. Wave 1 and adapt work
are independent tracks; adapt code lands only under explicit Chief scheduling.
