# Contributing

## Required invariants
A contribution must not:
- set a shipped role's default authority to `execute`;
- remove core approval categories without a documented architecture decision and new tests;
- mark memory as authoritative;
- remove explicit scope exclusions;
- weaken mandatory evaluation cases;
- embed credentials or live sensitive data.

## Development flow
1. Update or add a failing test for runtime behavior.
2. Implement the smallest change.
3. Run `npm run check`.
4. For template changes, run target-model behavioral evals in addition to repository checks.
5. Record governance or source changes with date and provenance.

## Review lenses
Every role change should be reviewed from product-outcome, data/source, authority, security, domain-governance, and evaluation perspectives.
