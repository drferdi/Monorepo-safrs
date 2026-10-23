# Closed-beta identity operations

Status: implementation branch, not provisioned or deployed. Clinical behavior is unchanged. Synthetic cases only.

## Provisioning and admission

Gaffer selects the intended Clerk application and separate development/production instances. Do not bootstrap a role from a mailbox or share a demo password. In the Clerk Dashboard enable **Waitlist** access mode, email registration and email OTP sign-in. Disable open registration, passwords, social providers and Organizations. Set `/apply`, `/sign-in`, `/sign-up`, `/onboarding` and the exact production application origin; redirects after sign-in and registration are fixed by the application. Enable required legal acceptance with the marketing site's `/ketentuan/` and `/privasi/` URLs. Confirm the sender domain/DNS and native email templates/delivery in Clerk. Clerk's invitation may already verify email ownership; do not add an invented OTP stage.

Request -> pending -> Gaffer's explicit Dashboard approval -> personal invitation -> Clerk registration/legal acceptance -> application synthetic-data consent -> workspace. Uninvited, expired, used, revoked or forwarded invitations must be rejected by Clerk. Dashboard revoke/deny handles unused invitations; do not mistake this for disabling an existing user. No automatic invitation endpoint or custom rejection email service exists.

Private metadata contains `sentrapediaBetaConsent` (`version: sentrapedia-beta-v1`, server `acceptedAt`, `syntheticOnly: true`) and independent `sentrapediaBetaAccess.disabled`. Consent cannot clear suspension. Every workspace page/analysis request fetches current backend identity and metadata; lookup/configuration failures deny, not anonymously admit. A new consent version requires explicit renewed acknowledgement. No clinical content is sent to Clerk. Only the public publishable key is passed to the client provider.

## Configuration and build

Install/build/test commands stay capsule-local. Missing credentials must not break builds; runtime then displays unavailable and analysis POST returns 503. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` and bare HTTPS `SENTRAPEDIA_PUBLIC_ORIGIN` securely at runtime. Production accepts matching live keys only. If a publishable key is embedded at image build time, supply `--build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...` and use the same instance at runtime; no secret build ARG. Root layout is dynamic and supplies the runtime publishable key explicitly. A real secret never enters a plan, image ARG, repository or test log.

For a deliberate **development/test-only**, loopback-bound local session, set `SENTRAPEDIA_AUTH_MODE=local`, `NODE_ENV=development`, `SENTRAPEDIA_HOST=127.0.0.1`, and leave `SENTRAPEDIA_PUBLIC_ORIGIN` absent. This is not a demo authentication alternative and must never be used with a tunnel or public listener. Production always denies local mode. The managed launcher remains loopback by default. Keep the clinical engine, spend limits, synthetic-input checks and warm-up behavior unchanged. GET `/api/aadi` remains public readiness (no analysis); POST requires authorization before clinical work.

## Disable or enable a registered user

On Gaffer's explicit instruction, use the intended instance's server key in the operator process environment (or `node --env-file=<protected-file> scripts/beta-access.mjs ...`). Do not place the secret in command arguments. Identify the opaque Clerk user ID in the Dashboard:

```sh
npm run beta:access -- disable user_EXAMPLE
npm run beta:access -- enable user_EXAMPLE
```

Disable merges the backend-only flag first, snapshots active-session pages before revoking every listed session and leaves the flag disabled on partial failure. Repeat disable if revocation fails; never enable just to clear an error. Provider calls are bounded to 5 seconds each and the command has a 60-second work deadline; an exceptionally large session list (10,000) fails for manual investigation. New sessions still fail server authorization while disabled. Enable changes only the flag, grants neither consent nor a session, and requires the normal verified login flow. Messages omit emails, secrets, invitation URLs and provider response bodies. Concurrent remote metadata changes must be coordinated by the operator.

## Local data and session lifecycle

The workspace uses `sentrapedia-workspace-v2:<opaque-user-id>` and its scoped unreadable backup. Legacy `sentrapedia-workspace-v1` bytes are untouched and not assigned to the first login. Export an old workspace under the old protected build and explicitly import a reviewed synthetic JSON backup into the intended account; never copy all local storage. Restore/save/backup/clear act only on the current scope. Unreadable input is retained until explicit import or clear. Switching identities, sign-out and cached navigation unmount/lock workspace state and abort pending browser analysis work.

Namespacing is **not encryption**, and does not isolate data from the device owner or scripts on the same origin. Use individual browser profiles on shared devices and synthetic data only. Storage remains device-local, not Clerk data or cross-device sync.

## Release gates and rollback

No provisioning, email proof, DNS change, security-policy change, merge, push or deployment is implied by local tests. Keep the existing Cloudflare Access gate, tunnel, host-loopback mapping and firewall. Before requesting cutover, prove the actual native pending/invited/expired/revoked flow, required legal acceptance, OTP delivery, disabled/new-session denial, two-user isolation and mobile/keyboard use with a personally approved synthetic tester. Mocks are not delivery proof. Gaffer must separately authorize release and removal of the redundant end-user Access gate. Publish prepared marketing `/apply` and `/sign-in` links only with that cutover.

Rollback order: **restore/verify Cloudflare Access first**, then restore the previous unauthenticated application image. Never roll back the app first while leaving the edge gate removed. Preserve scoped and legacy browser data and keep the readiness probe and synthetic-input budget controls.
