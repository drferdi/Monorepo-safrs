# Golden Path Tests

This capsule's tests live alongside the web source so its deployable runtime and proof remain together.

Run `pnpm --filter @safrs/web test` for behavior, adapter, client-response, and server-data recovery checks. Use safe local configuration from the root `.env.example`; do not place credentials or production data in tests.

Canonical verification and sensitive-surface rules remain in the root [AGENTS.md](../../../AGENTS.md) and [SECURITY.md](../../../SECURITY.md).
