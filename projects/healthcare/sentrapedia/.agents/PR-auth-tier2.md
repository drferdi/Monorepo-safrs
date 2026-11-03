# PR text: feat/sentrapedia-auth-tier2-2026-11-02

Title: Auth tier 2: Indonesian widgets, CSP and headers, idle lock, passkeys, account page, consent gate, deletion webhook

Body:

Tier 2 of the 2026-11-02 audit of the Clerk login and registration flow. Seven commits on top of the footer-credit split `f3a60a09` (plus the two docs commits that recorded it).

- Clerk's widgets render in Indonesian (`@clerk/localizations` `idID`, pinned 4.24.0 to match the installed `@clerk/shared` 4.41.1) and send no telemetry; sign-out lands on `/sign-in`.
- Every response carries a per-request nonce Content-Security-Policy (`strict-dynamic`, the Clerk Frontend API as the only foreign connect target, `frame-ancestors 'none'`) plus HSTS, nosniff, `X-Frame-Options: DENY`, Referrer-Policy, COOP and a Permissions-Policy that keeps the microphone for dictation. Denials are hardened too.
- The workspace signs out after 30 idle minutes and says so. The toolbar gains `UserButton`, leading to a full-page `UserProfile` at `/account` (email, passkeys, devices, deletion). A doctor without a passkey sees a one-line nudge to add one.
- The beta acknowledgement (policy v2) is a gate again: `/onboarding` renders the form, analysis and sync answer `403 CONSENT_REQUIRED` without it. Accounts without a v2 record are asked once on their next login.
- `POST /api/webhooks/clerk` verifies Clerk's signature with `CLERK_WEBHOOK_SIGNING_SECRET` and purges the account's Neon rows on `user.deleted` (cascade to templates and synced documents). Without the secret it answers 503 and purges nothing.

Verification: `tsc` 0, eslint 0 on touched files, Vitest 596/596, system tests 67/67, headers and nonce confirmed in the dev preview with zero CSP violations. Not verified against a live Clerk instance: passkey enrolment, `/account`, the webhook signature path, the consent re-ask.

Before merging or building: this needs a merge commit (a squash or rebase breaks the subtree-split chain). After the build, set `CLERK_WEBHOOK_SIGNING_SECRET` in the beta env file and subscribe `https://<beta>/api/webhooks/clerk` to `user.deleted` in the Clerk dashboard. Tier 1 dashboard steps remain: enable passkeys, bot protection and the session inactivity timeout.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
