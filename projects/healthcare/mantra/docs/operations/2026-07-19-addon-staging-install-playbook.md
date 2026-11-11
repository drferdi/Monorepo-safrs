# Playbook — Marketplace Addon Wave 1 (Staging)

**Date:** 2026-07-19  
**Policy:** [`docs/adr/0004-marketplace-addon-policy.md`](../adr/0004-marketplace-addon-policy.md)  
**Pins:** [`docs/operations/addon-pin-matrix.md`](./addon-pin-matrix.md)

## Class C gate (STOP)

Do **not** run `bench get-app` or `bench --site … install-app` until **all** are true:

1. Chief explicit `GO` for Wave 1 staging install.
2. Off-machine backup / staging site snapshot (or clone) proven and restorable.
3. Pin candidates verified from GitHub/Marketplace into the pin matrix (URL +
   v15-compatible tag — still may be “candidate” before install; finalize SHA after).

Until then: Wave 0 docs only. Default site name in docs: `mantra.localhost`
(replace with staging clone name when different).

## Prerequisites

- Work **inside** `.devcontainer` (bench on PATH).
- Never print or commit `sites/*/site_config.json` or `.env`.
- Secrets only via env var references (ADR-0002).
- Keep Tahap 2 GL gate: Workflow State `Approved` `doc_status` stays `0`.
- Keep `mute_emails=1` / outgoing disabled unless Chief GO for email pilot
  (DECISIONS 2026-07-18). Helpdesk email-to-ticket stays off under mute.
- Do not edit vendored `frappe` / `erpnext` / `hrms` / `healthcare`.

## Baseline

```bash
bench --site <staging-site> list-apps
```

Record the baseline app list in the session note or pin-matrix comments (names
and versions only — no DB credentials).

## Mandatory install order

1. Insights  
2. Helpdesk  
3. Wiki (stable pin — not RC)  
4. ERPNext Indonesia Localization (sandbox validation)  
5. PDF on Submit (whitelist)

**One app at a time.** Never batch all five without intermediate smoke.

### Per-app pattern

```bash
# Fill <git-url> and <tag> from pin-matrix after verification
bench get-app <git-url> --branch <v15-compatible-tag>
bench --site <staging-site> install-app <app_name>
bench --site <staging-site> migrate
bench --site <staging-site> list-apps
git -C apps/<app_name> rev-parse HEAD
git -C apps/<app_name> describe --tags --always
```

Update pin-matrix: tag, full SHA, site, UTC date, Smoke PASS/FAIL.

### Rollback

- Prefer **restore staging snapshot** if Desk breaks or migrate fails mid-wave.
- Secondary: `bench --site <staging-site> uninstall-app <app_name>` only when
  safe and documented; snapshot restore is the primary recovery path.
- On FAIL: stop the wave; do not install the next app.

## Per-app guardrails and smoke (no PHI)

### 1. Insights

**Guardrails**

- Connect analytics only via a **read-only** database account (or curated
  replicas/views).
- Curated SQL views / allowlisted queries — no blanket access to all production
  tables.
- Role-based dashboards; do not put raw Patient identifiers on shared boards.
- Prefer finance / stock / HR aggregates and operational counts.

**Smoke**

- [ ] App listed in `list-apps`.
- [ ] Open one curated dashboard with synthetic or aggregate finance data.
- [ ] Confirm RO user cannot write (attempt should fail).

### 2. Helpdesk

**Guardrails**

- Queues: IT, Facility, Biomedical, Patient Relations, Housekeeping, Finance Support.
- Not an EMR — no clinical SoR narrative in general tickets.
- Do not enable email-to-ticket while `mute_emails=1` unless separate GO.

**Smoke**

- [ ] Create one ticket in **IT** queue (synthetic subject).
- [ ] Assign and resolve without touching Patient Encounter.

### 3. Wiki

**Guardrails**

- Pin **stable** tag only (not `*-rc*` / develop).
- Suggested tree: Tata kelola; SOP pelayanan; SOP keperawatan; Keselamatan pasien;
  PPI; SDM/orientasi; Keuangan & pengadaan; Panduan MANTRA; Kebijakan AI & data.
- Wiki does not replace formal document control (nomor, owner, approver, effective
  date, revision history for controlled docs).

**Smoke**

- [ ] Create one page under “Panduan MANTRA”.
- [ ] Confirm revision history visible.

### 4. ERPNext Indonesia Localization

**Guardrails**

- Sandbox company / synthetic transactions only until accountant sign-off.
- Does not replace `sentra_mantra_indonesia` ownership of BPJS / PPh 21 / KFA /
  UU PDP (ADR-0004).
- Validation checklist with RSIA Melinda tax advisor:

  - [ ] Pembelian obat  
  - [ ] Jasa dokter  
  - [ ] Pembelian alat kesehatan  
  - [ ] Jasa vendor  
  - [ ] Retur  
  - [ ] Withholding tax  
  - [ ] PPN and exempt cases  
  - [ ] CoreTax XML export/import dry-run on synthetic docs  

**Smoke**

- [ ] Tax template or CoreTax export dry-run on synthetic Purchase Invoice.
- [ ] No production fiscal filing from staging.

### 5. PDF on Submit

**Guardrails**

- **Whitelist only.** Suggested starting set: Purchase Order, Purchase Invoice,
  selected Payment Entry, contracts, berita acara, selected leave/claim docs.
- Default **off** for all other DocTypes (avoid storage duplication).
- Pin v15-compatible tag even if Marketplace highlights v16.

**Smoke**

- [ ] Submit whitelisted test Purchase Order → exactly one PDF attached.
- [ ] Non-whitelisted DocType submit → no auto PDF.

## Post-wave

- [ ] Pin matrix complete for all five apps.
- [ ] `list-apps` shows baseline + exactly the five Wave 1 apps (names as installed).
- [ ] If any custom-app code was touched (should be none):  
      `python scripts/check_app_boundaries.py`
- [ ] Schedule regression smoke after any later Frappe/ERPNext/HRMS/healthcare upgrade.

## Out of scope

- Production install  
- Wave 2 pilots (see [`addon-pilot-wave2.md`](./addon-pilot-wave2.md))  
- Building adapt backlog (maker–checker, policy layer, compliance registry)  
- Flipping Tahap 2 GL gate  
- Enabling Email Delivery Service / FAC / other reject list apps  
