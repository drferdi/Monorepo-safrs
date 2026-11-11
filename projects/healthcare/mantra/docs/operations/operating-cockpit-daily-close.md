# Operating Cockpit Daily Financial Close

## Purpose

Use this checklist to close each MANTRA financial day with a balanced General
Ledger, reconciled cash and bank positions, and an assigned owner for every
remaining difference. Run all commands inside the dev container or the
equivalent approved production bench environment.

Confirmed totals come only from submitted source documents. Draft documents
remain pending, cancelled documents are excluded, and reversals remain visible
through the source-document history.

## Roles

- Finance executor: completes or rejects same-day payment execution.
- Finance reviewer: performs cash, bank, evidence, and allocation review.
- Cash witnesses: two staff members count and sign the physical cash record.
- Escalation owner: Director or designated Finance lead who owns unresolved
  exceptions.

The executor and reviewer must be different users where separation-of-duties
rules require it.

## Daily close sequence

1. Submit or reject every same-day cash `Payment Entry`. A draft payment is
   pending and must not be included in the confirmed cash balance.
2. Count physical cash with two staff members. Record the count, names or
   employee IDs, timestamp, and signed evidence in the approved operational
   record; do not copy the evidence into an Audit Event payload.
3. Reconcile the physical cash count and bank statement position against the
   submitted GL balances for each Cash or Bank account.
4. List failed transfers and payments with missing channel-appropriate
   evidence. Keep them `Payment Failed`, `unreconciled`, or `exception`; never
   mark them `Paid`.
5. Review unallocated submitted `Payment Entry` documents and assign each
   allocation difference to a named Finance owner.
6. Run the non-PHI aggregate reconciliation for the closing date:

   ```bash
   bench --site mantra.localhost execute \
       sentra_mantra_core.financial_cutover.reconcile \
       --kwargs "{'as_of_date': '<YYYY-MM-DD>'}"
   ```

7. For every item returned in `unreconciled`, record:

   - difference type and amount;
   - source document ID or drill-down route;
   - owner;
   - due date;
   - resolution or escalation status.

8. Close the day only when `gl_difference` is zero and every cash, bank,
   receivable, payable, evidence, transfer, or allocation difference is either
   resolved or assigned to an escalation owner with a due date.

## Required close record

The daily close record must contain the closing date, reconciliation timestamp,
Finance executor, Finance reviewer, two cash witnesses when cash is present,
confirmed cash and bank total, receivable and payable totals, exception count,
unreconciled count, and the source-document drill-down references.

Do not include patient names, diagnoses, phone numbers, addresses, bank account
numbers, raw attachments, or RME payloads in the close summary or Audit Event
payload.

## Failure and retry

- A query or accounting error produces an `exception`; it does not produce a
  confirmed zero.
- Retry only through the linked source document or idempotent service. Never
  insert `GL Entry` directly.
- Reverse or cancel a posted transaction through its native ERPNext source
  document. Do not delete ledger history.
- Escalate a difference that remains unresolved at the agreed cutoff time to
  the Director and carry it into the next opening review.
