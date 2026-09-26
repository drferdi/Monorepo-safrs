# Referral Settlement Daily Runbook

## Production gate

Do not activate referral payouts until Boss has approved all of the following:

- documented legal, ethics, and compliance review;
- signed referral policy and effective-dated tariff matrix;
- Company, Finance, Director, Nursing, and payment-executor role assignments;
- referral service Item, expense account, cost center, and cash/bank Mode of
  Payment mappings;
- cash receipt and transfer proof templates;
- daily reconciliation and escalation owners;
- a clean synthetic dry run with zero unresolved critical findings.

The Tahap 2 GL gate must also be open under its separate Class C procedure.
Development and synthetic testing do not grant production activation.

## 1. Record the handover

The on-duty Melinda midwife records the referred patient's physical arrival and
handover. The logged-in user must have `Nursing User`, be linked to the active
`Employee` selected as `Accepted By Employee`, and have permission to read the
Patient.

Record the Patient link, arrival timestamp, referral partner, payer category,
service line, optional inpatient class, and source reference. Do not copy
clinical narrative from the RME.

MANTRA applies the tuple below as the duplicate boundary:

```text
Company + Patient + arrival service date + service line
```

A duplicate fails closed. It is not merged, assigned a second tariff, or paid.
Finance or the Director resolves the attribution with an audit note.

## 2. Review eligibility

MANTRA selects one active effective-dated tariff by Company, payer category,
service line, optional inpatient class, and service date. The one
highest-priority rule must be unique.

- A unique match copies the rule and amount into the handover as an immutable
  snapshot and marks it `Eligible`.
- Missing, expired, inactive, or ambiguous rules create `Exception`.
- An inactive or out-of-period referral agreement creates `Exception`.
- Finance never types or guesses a fallback amount.

Audit Event payloads contain only handover ID, status, tariff rule ID, and
amount. They must not contain patient or partner names, diagnoses, contact
details, bank numbers, attachments, or RME payloads.

## 3. Prepare and verify the settlement

`prepare_settlement` creates at most one settlement per handover.

- Eligible handovers enter `Finance Review` with the frozen amount.
- The approved tariff's service Item, expense account, and cost center are
  frozen on the settlement with that amount.
- Exception handovers enter `Exception` and require Director resolution.
- Cash and Transfer are the only payment channels.

An `Accounts Manager` verifies the handover, agreement, amount, and payment
destination, including `Mode of Payment`. A Transfer settlement must point
through the Referral Partner to a valid native ERPNext `Bank Account`.
Verification records `verified_by` and `verified_at`, then moves the settlement
to `Ready to Pay`.

The verifier and payment executor must be different users.

## 4. Execute cash pickup

Before a cash settlement can become `Paid`, record:

- receiver name;
- receiver timestamp;
- signed cash receipt attachment;
- submitted Purchase Invoice;
- submitted Payment Entry.

The Finance executor counts cash under the local dual-control procedure. Missing
receipt evidence fails closed; the settlement remains unpaid.

## 5. Execute bank transfer

Before a transfer settlement can become `Paid`, record:

- the Referral Partner's linked native Bank Account;
- transfer reference;
- transfer proof attachment;
- submitted Purchase Invoice;
- submitted Payment Entry.

A failed transfer becomes `Payment Failed` or `Unreconciled`, never `Paid`.
After Finance corrects the destination or execution issue, move it back to
`Ready to Pay` and retry the same settlement.

## 6. Accounting and retry

Accounting must use normal ERPNext APIs:

1. create or reuse one submitted Purchase Invoice for the referral service;
2. create or reuse one submitted Payment Entry allocated to that invoice;
3. store both links on the Referral Settlement;
4. confirm balanced GL entries from the native source documents.

Never insert `GL Entry` directly. Retrying a Paid settlement returns the
existing Purchase Invoice and Payment Entry links and must not create duplicate
documents.

The Finance-selected Mode of Payment must have exactly one native
`Mode of Payment Account` row for the settlement Company. Cash maps to a Cash
account and Transfer maps to a Bank account; missing, ambiguous, disabled, or
wrong-type mappings fail before liability creation.

The automated path is enabled for synthetic verification. Production master
activation remains disabled until every production tariff and Mode of Payment
mapping passes the production gate above.

## 7. Daily reconciliation

Run the non-PHI aggregate for the service date:

```bash
bench --site mantra.localhost execute \
    sentra_mantra_hospital.referral.reporting.daily_summary \
    --kwargs "{'posting_date': '<YYYY-MM-DD>'}"
```

Review handover count, eligible amount, confirmed paid amount, cash and transfer
amounts, pending count, unreconciled count, and exception count. A Paid label is
not confirmed unless both linked accounting documents are submitted.

Assign an owner and due date to every pending, failed, unreconciled, duplicate,
missing-evidence, and tariff exception. Escalate unresolved exceptions to the
Director before daily financial close.

## 8. Rejection, cancellation, and reversal

- Any unpaid state may be rejected with a reason and audit trail.
- Do not delete a rejected, failed, or duplicate record.
- Cancel or reverse posted accounting through the native Purchase Invoice and
  Payment Entry lifecycle.
- Preserve the linked source-document history and rerun daily reconciliation.
