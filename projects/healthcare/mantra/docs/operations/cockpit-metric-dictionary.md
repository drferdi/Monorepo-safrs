# MANTRA Operating Cockpit Metric Dictionary

## Contract

Every metric carries a stable `key`, reader label, raw `value`, `status`,
`as_of`, and a permission-protected source `route`. `unit` and `note` are
included when applicable. Numeric values are not formatted by the service.

Statuses:

- `confirmed`: calculated from valid submitted sources;
- `pending`: a draft or workflow item awaiting action;
- `unreconciled`: posted or executed state requires reconciliation;
- `exception`: the source query or business invariant failed.

Dashboard values are decision support, never a system of record.

## Financial position

### Cash and Bank

- Definition: cumulative debit minus credit on leaf Cash and Bank accounts.
- Source: submitted `GL Entry` joined to `Account`.
- Date semantics: GL posting date less than or equal to `as_of`.
- Unit: Company currency, presented as IDR on this site.
- Route: `/app/general-ledger`.
- Exclusions: draft/cancelled source documents, non-Cash/Bank accounts, account
  names in the aggregate response.

### Accounts Receivable

- Definition: current outstanding amount on submitted Sales Invoices posted on
  or before `as_of`.
- Source: `Sales Invoice`.
- Unit: Company currency.
- Route: `/app/sales-invoice`.
- Known exclusion: this is not a reconstructed historical aging snapshot;
  later payments affect the current outstanding amount.

### Accounts Payable

- Definition: current outstanding amount on submitted Purchase Invoices posted
  on or before `as_of`.
- Source: `Purchase Invoice`.
- Unit: Company currency.
- Route: `/app/purchase-invoice`.
- Known exclusion: this is not a reconstructed historical aging snapshot.

## Daily movement

### Receipts

- Definition: submitted Payment Entry base paid amount where payment type is
  `Receive`.
- Date semantics: Payment Entry posting date equals the selected date.
- Route: `/app/payment-entry`.

### Disbursements

- Definition: submitted Payment Entry base paid amount where payment type is
  `Pay`.
- Date semantics: Payment Entry posting date equals the selected date.
- Route: `/app/payment-entry`.

### Net movement

- Definition: Receipts minus Disbursements for the selected posting date.
- Source and route: submitted `Payment Entry`, `/app/payment-entry`.

## Revenue mix

- Definition: submitted Sales Invoice Item base net amount grouped by an exact
  approved Cost Center name.
- Supported dimensions: `Rawat Jalan`, `Rawat Inap`, and `Farmasi`.
- Unsupported, blank, partial, or differently named dimensions:
  `Unmapped`.
- Date semantics: parent Sales Invoice posting date in the inclusive selected
  range.
- Route: `/app/sales-invoice`.
- Exclusions: diagnosis, patient narrative, item-name inference, and free-text
  classification.

## Expense mix

- Definition: debit minus credit from submitted GL Entry rows whose Account
  root type is `Expense`, grouped by Account and Cost Center.
- Date semantics: GL posting date in the inclusive selected range.
- Unit: Company currency.
- Route: `/app/general-ledger`.
- Exclusions: non-expense accounts and draft/cancelled source documents.

## Procurement pipeline

- Material Request: controlled workflow drafts; amount omitted because the
  source has no reliable canonical total.
- Purchase Order: submitted orders not fully received; amount is submitted base
  grand total.
- Purchase Receipt: drafts awaiting receipt completion/evidence; amount
  omitted.
- Purchase Invoice: submitted invoices with outstanding amounts.
- Payment Entry: draft supplier payments; amount omitted until submission.
- Status: `pending`; age is calendar days since creation.
- Routes: native DocType list routes for each stage.

## Referral settlement

- Handovers and eligible amount: eligible Referral Handovers for the service
  date.
- Paid amount: Referral Settlements labelled Paid only when linked Purchase
  Invoice and Payment Entry are both submitted.
- Unreconciled: `Payment Failed` or `Unreconciled`.
- Exceptions: tariff, evidence, duplicate, or accounting-source exceptions.
- Route: `/app/referral-settlement`.
- Privacy: aggregate responses exclude patient and partner identity.

## Director decision inbox

- Definition: row-permission-filtered workflow items currently awaiting Finance
  or Director action, plus Referral Settlement exceptions.
- Age: calendar days from document creation.
- Urgency: `normal` for 0–1 days, `attention` for 2–3 days, `critical` for four
  or more days or an explicit exception.
- Amount: included only when the user can read the source row and the DocType
  exposes the reviewed monetary field.
- Route: native document route.
- Privacy: no patient-linked fields or bank details are returned.
