# Addon Pilot Wave 2 — Stub (no install)

**Status:** Prerequisites only. **Do not** `get-app` / `install-app` until a
**separate** Chief GO after Wave 1 staging is stable.

**Policy:** [`docs/adr/0004-marketplace-addon-policy.md`](../adr/0004-marketplace-addon-policy.md)  
**Pins (empty until GO):** [`addon-pin-matrix.md`](./addon-pin-matrix.md)

## Apps (4)

| App | Intended pilot | Hard boundaries |
| --- | --- | --- |
| Frappe WhatsApp | Appointment reminders, registration confirmations, doctor schedule info, non-sensitive admin/payment reminders, CS follow-up, Melinda agent channel later | Communication boundary only — no free access to Patient Encounter / clinical notes; approved templates; patient consent; send log; opt-out; classify sensitive content |
| Raven | Replace scattered ops chat for IT, management, maintenance, implementation | Not clinical orders; not medical-record substitute; decisions that matter go into DocTypes/workflows; manage retention and channel access |
| Print Designer | Explore employee cards, internal letters, simple admin forms, inventory labels | Not for invoices, medical letters, EMR, claims, or other deterministic/regulated output — those stay coded Jinja Print Formats with VCS + regression |
| Frappe Drive | Nonclinical admin folders, previews, sharing, light collaboration | Not primary store for patient medical records |

## Prerequisites before any Wave 2 GO

### Frappe WhatsApp

- [ ] Meta WhatsApp Cloud API account under organization control.
- [ ] Credentials stored in Password fields / env refs (ADR-0002) — never CLI literals.
- [ ] Template set reviewed (no PHI in template variables beyond agreed minimum).
- [ ] Consent + opt-out process documented.
- [ ] Dedicated role(s); no broad clinical DocType grants to the integration user.
- [ ] Pin matrix row filled with v15-compatible tag.

### Raven

- [ ] Channel plan: IT, Management, Maintenance, Implementation only (initial).
- [ ] Retention / access owner named.
- [ ] Written rule: no clinical instructions as SoR in chat.
- [ ] Pin matrix row filled.

### Print Designer

- [ ] Explicit noncritical DocType list for experiments.
- [ ] Regression note: critical formats remain Jinja in repo.
- [ ] Pin matrix row filled; watch known v15 install/print reports.

### Frappe Drive

- [ ] Folder taxonomy for admin-only content.
- [ ] Sharing policy (no patient chart dumps).
- [ ] Accept maturity risk (early version lineage) — pilot, not core.
- [ ] Pin matrix row filled.

## Install pattern (when GO’d)

Same as Wave 1 playbook: one app at a time → migrate → smoke → pin → abort on
failure. Prefer a staging clone; keep `mute_emails` unless WhatsApp-only pilot
does not need SMTP.

## Out of scope

- Production patient messaging  
- Using Raven/Drive/Helpdesk as EMR  
- Installing reject-list apps (FAC, S3 Attachment, Digital Signature, FCM, Email Delivery Service)  
