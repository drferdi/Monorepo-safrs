# Addon Pin Matrix — Sentra MANTRA

SSOT for marketplace app pins. Policy: [`docs/adr/0004-marketplace-addon-policy.md`](../adr/0004-marketplace-addon-policy.md).

**Rule:** Fill `Pinned tag / commit`, `Git URL`, and `Bench app name` only after
GitHub / Marketplace verification at install time. Do not track `develop` on
operational staging. Wiki RC is forbidden **except** Chief-recorded exception
(2026-07-19: `v3.0.0-rc.5` — see Wave 1 row 3).

Baseline upstream (do not change casually): Frappe / ERPNext / HRMS / healthcare
on `version-15` per ADR-0000.

## Wave 1 — staging (5)

Baseline `list-apps` before Wave 1 (2026-07-19): frappe 15.114.0, erpnext
15.116.0, hrms 15.62.2, healthcare 15.2.0, five `sentra_mantra_*` — no
marketplace Wave 1 apps yet. Site: `mantra.localhost` (staging/UAT).

| Order | Marketplace name | Bench app name | Git URL | Pinned tag / commit | v15 note | Site | Installed (UTC date) | Smoke |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Frappe Insights | `insights` | https://github.com/frappe/insights | `v3.12.2` / `db795c4be3395d7ab5d7a081f168dbe66af8e003` | RO user `insights_ro` (SELECT-only); source `site_db_(insights_ro)`; view `v_mantra_wave1_ops_agg`; password in git-ignored `.env` as `MANTRA_INSIGHTS_RO_*` | mantra.localhost | 2026-07-20 | PASS — RO query 4 agg rows; CREATE/INSERT denied; no Patient columns |
| 2 | Frappe Helpdesk | `helpdesk` | https://github.com/frappe/helpdesk | `v1.27.0` / `518c1c97588f6d586c72cb343f9b079840e94a35` | Requires transitive `telephony` (see note) | mantra.localhost | 2026-07-19 | PASS — HD Ticket `0002`; queues IT/Facility/Biomedical/Patient Relations/Housekeeping/Finance Support (seed member Administrator); email-to-ticket off |
| 3 | Frappe Wiki | `wiki` | https://github.com/frappe/wiki | `v3.0.0-rc.5` / `7fe4ab2acfc9ac48abef85efdb2e5aeacccaecfb` | **Chief GO exception 2026-07-19** — ADR-0004 normally forbids RC; last non-RC `v2.0.1` broke `redis`. | mantra.localhost | 2026-07-19 | PASS — Wiki Document `rqeuelh75g` under space Panduan MANTRA; Frappe Version trail after edit |
| 4 | ERPNext Indonesia Localization | `erpnext_indonesia_localization` | https://github.com/agile-technica/erpnext-indonesia-localization | `v1.4.1` / `b0a26a1fdcbb23f69e4b043565a96e78eddc766d` | Sandbox only; accountant validation before prod fiscal use; does not replace `sentra_mantra_indonesia` BPJS/PPh21/KFA | mantra.localhost | 2026-07-19 | PASS — CoreTax DocTypes + Indonesia Localization Settings present; no production filing |
| 5 | PDF on Submit | `pdf_on_submit` | https://github.com/alyf-de/erpnext_pdf-on-submit | `v15.6.0` / `b38047157acf58a8a5a6fd3f230f394fbcdc02d7` | Whitelist=`Purchase Order`+`Material Request`; `create_pdf_in_background=0` (inline). PO true-submit blocked by Tahap 2 gate (`Approved` doc_status=0). | mantra.localhost | 2026-07-19 | PASS — synthetic Supplier/Item; PO draft `PUR-ORD-2026-00001`; MR `MAT-MR-2026-00002` → exactly 1 private PDF; Sales Order not whitelisted |

**Transitive dependency (Helpdesk):** `telephony` from https://github.com/frappe/telephony
`develop` @ `e04272a4d6b78862cfdbde4256a06b2cab79a607` (no release tags). Twilio not
configured; leave dormant. Not a Wave 1 product pick — required by Helpdesk
`pyproject.toml` `[tool.bench.frappe-dependencies]`.

## Wave 2 — pilot (4) — do not install until separate GO

| Marketplace name | Bench app name | Git URL | Pinned tag / commit | v15 note | Site | Installed | Smoke |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Frappe WhatsApp | _TBD_ | _TBD_ | _TBD_ | Meta Cloud API; Password fields for tokens | — | — | — |
| Raven | _TBD_ | _TBD_ | _TBD_ | Nonclinical channels only | — | — | — |
| Print Designer | _TBD_ | _TBD_ | _TBD_ | Noncritical docs; watch v15 print issues | — | — | — |
| Frappe Drive | _TBD_ | _TBD_ | _TBD_ | Nonclinical admin files only | — | — | — |

## Reject (never pin / never install)

| Marketplace name | Reason (ADR-0004) |
| --- | --- |
| FAC / Frappe Assistant Core | LLM surface too wide |
| Frappe S3 Attachment | Public-access config risk |
| Digital Signature | Not v15 / not certified e-sign ID |
| FCM Notification | Legacy Frappe only |
| Email Delivery Service | Overrides email + third-party retention |

## How to record a pin after install

Inside `.devcontainer`, after successful smoke:

```bash
# From apps/<app_name> — record output metadata only (no secrets)
git -C apps/<app_name> rev-parse HEAD
git -C apps/<app_name> describe --tags --always
bench --site <staging-site> list-apps
```

Paste tag + full SHA into this matrix; set Smoke to `PASS` or `FAIL` with one-line note (no PHI).
