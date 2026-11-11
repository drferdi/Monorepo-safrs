# Clinical Safety Risk Management Plan

Status: scaffold baseline
Date: 2026-07-16

## Purpose

Define how Sentra MANTRA identifies, evaluates, controls, and verifies clinical-safety risks. This is aligned with ISO 14971-style risk management and IEC 62366-style usability risk thinking, adapted for a hospital information system.

## Scope

Clinical-safety scope includes any feature that can affect:

- Patient identification.
- Appointment status or patient waiting state.
- Patient encounter creation or completion.
- Practitioner schedules and assignment visibility.
- Clinical documentation, orders, observations, prescriptions, billing tied to clinical care.
- External clinical data exchange such as SATUSEHAT/FHIR.

Current implemented clinical-facing custom code:

- `sentra_mantra_indonesia.ws_klinik.data` for clinical dashboard data.
- `sentra_mantra_core.workspace_nav` for clinical workspace navigation.
- `sentra_mantra_indonesia.home_today` for task/status indicators that may include operational items.

## Risk process

1. Identify workflow and users.
2. Identify hazards and foreseeable misuse.
3. Estimate severity and probability.
4. Define risk controls.
5. Implement controls in code, configuration, training, or procedure.
6. Verify controls.
7. Record residual risk and owner acceptance.

## Initial hazard classes

| Hazard class | Example | Required control |
|---|---|---|
| Wrong patient | User opens or acts on wrong Patient/Appointment | Clear labels, routes to exact records, permission enforcement, audit trail. |
| Delayed care | Dashboard hides urgent item or displays stale status | Empty/error states, conservative queries, clear date filters, manual fallback list links. |
| Unauthorized access | User sees clinical counts or patient details without permission | `frappe.has_permission` checks before aggregating data; no `ignore_permissions`. |
| Incorrect practitioner schedule | Schedule summary inaccurate or missing | Source from canonical Healthcare DocTypes; display empty states and direct schedule links. |
| Misleading clinical status | Count labels do not match underlying filters | Trace each card to exact filters and validate with representative records. |
| Integration failure | External system outage blocks internal care | Outbox/retry pattern; internal transaction remains source of truth. |

## Safety classification

Until formally classified, treat patient-identification, appointment, encounter, medication, billing-linked clinical, and external clinical integration changes as high scrutiny. They require risk record and validation evidence before real clinical use.

## Required records

Create a risk record from `docs/compliance/templates/risk-record-template.md` for each safety-relevant feature. Store records under `docs/clinical-safety/records/` when that folder is introduced.

## Current status

This plan is structurally valid as a baseline. Actual clinical-safety compliance requires execution: risk records, validation evidence, user acceptance, and residual risk sign-off.
