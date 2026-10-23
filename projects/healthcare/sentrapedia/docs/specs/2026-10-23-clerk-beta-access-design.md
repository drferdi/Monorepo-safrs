# Clerk closed-beta access design

Status: Gaffer ordered implementation on 2026-10-24. Code implemented on the isolated Clerk branch; see `docs/verification/clerk-beta-access-2026-10-24.md`. External provisioning, native invitation/OTP acceptance and separately authorized production cutover remain open. No production migration has been performed.

Authority: Gaffer, 2026-10-23, approved Clerk and the sequence: request access -> Gaffer approval -> invitation email -> registration and consent -> login.

Code baseline: capsule at monorepo commit `511a66d5ae887967cba6336fc086e5bf9921c52c`. Risk: R2 for application authentication, dependencies and persistence boundaries; R3 for production identity configuration, DNS, access-policy cutover and release. Clinical behavior is not part of this change.

## 1. Outcome and scope

An invited tester can request access, receive Gaffer's approval, accept a personal invitation, complete registration and consent, and enter the existing synthetic-data workspace. Gaffer manages admissions in the Clerk Dashboard, not a new Sentrapedia administration application. Each tester uses an individually controlled email address; a shared mailbox is not an application role or an administrator bootstrap mechanism.

The marketing site remains a separate static build under `apps/site/`. Clerk belongs to the existing Next.js clinical application at the capsule root. No forked demo app, new clinical engine, patient-data service, organization model, subscription system, password database or cross-capsule dependency is introduced. There is no claim of clinical certification, legal sufficiency or production patient-data readiness.

## 2. Current behavior and required deltas

- `src/app/page.tsx` mounts `WorkspaceApp` without application authentication. The closed beta currently relies on Cloudflare Access invited-email OTP in front of the tunnel.
- `src/app/api/aadi/route.ts` exposes readiness GET and analysis POST. The launcher and beta update script call readiness without a browser session. Origin, synthetic-input, PII, cost and concurrency checks already exist in the gateway and must remain.
- `src/lib/workspace.ts` and `workspace-session.ts` use one browser key, `sentrapedia-workspace-v1`, plus an unreadable-data backup. Persistence, backup and clearing paths must all become account-scoped together.
- `Dockerfile` produces a standalone Next.js application. There is no Clerk dependency in the current manifest. Registry inspection on 2026-10-23 returned `@clerk/nextjs` 7.9.20; its published peer ranges admit the installed Next.js 16.4.2 and React 19.3.0. The implementation plan must pin the reviewed SDK and update only the capsule lockfile; no framework upgrade is needed by this design.
- The already-published site changes are on the separate `codex/sentrapedia-site-refactor` branch. This design does not merge that branch or other sessions' clinical commits. Marketing-link integration must use the reviewed site snapshot during the later implementation/release process.

## 3. Admission and identity

Use Clerk **Waitlist** access mode with email enabled, email OTP sign-in and explicit legal acceptance. Disable open self-service sign-up, passwords, social providers and application Organizations for this first delivery. Approval remains an explicit Gaffer action; no application endpoint or webhook automatically invites applicants.

Clerk's waitlist precedes account creation. It is not an active user account carrying a client-editable `approved` flag. The native flow records requests and sends confirmation and invitation emails. See [access modes](https://clerk.com/docs/guides/secure/restricting-access).

| State | Allowed behavior | Workspace access |
| --- | --- | --- |
| Visitor | View request-access and sign-in pages | Denied |
| Requested | Clerk records a waitlist request and sends its confirmation | Denied |
| Invited | Gaffer invites the applicant from the Clerk Dashboard; Clerk emails the invitation | Denied until registration and consent finish |
| Registered | The user completes Clerk registration, including required legal acceptance | Consent page only until beta acknowledgement is recorded |
| Ready | Valid Clerk session and current server-recorded beta consent | Allowed |
| Denied, expired or revoked invitation | Clear denial/expiry/re-request guidance; no invitation bypass | Denied |
| Signed out or session revoked | Reauthentication required | Denied |

An invitation may establish verified email ownership itself; do not impose an additional invented OTP stage if Clerk already treats the invited email as verified. Returning sign-in uses the configured OTP flow. Forwarded invitations must not create an account for a different email. Invalid, used or expired invitations must follow Clerk's validated behavior, never an application-side override.

Denying a request uses the Dashboard's native revoke/deny behavior. A separate custom rejection-email service is not included. Revoking an unused invitation is not the same as suspending a registered user: the operator guide must distinguish both operations. Existing-user suspension sets a backend-only `sentrapediaBetaAccess.disabled` flag in Clerk private metadata and revokes that user's sessions. Every protected server request checks this flag alongside consent, so simply obtaining a fresh OTP cannot restore a disabled user's workspace access. An absent flag permits the ordinary invited-user path; a malformed flag or failed lookup denies access. A small capsule-owned operator command performs disable/re-enable for a named Clerk user ID on Gaffer's instruction; it is not a public endpoint or an approval dashboard. Do not rely on a paid-only Clerk ban feature.

## 4. Pages, guards and failure handling

Proposed system routes:

| Surface | Access contract |
| --- | --- |
| `/apply` | Public Clerk waitlist form; submitted state; link to sign in |
| `/sign-in/[[...sign-in]]` | Public Clerk sign-in UI; link to request access |
| `/sign-up/[[...sign-up]]` | Public invitation entry surface, with eligibility enforced by Clerk Waitlist mode |
| `/onboarding` | Signed-in users only; synthetic-data acknowledgement and policy links |
| `POST /api/onboarding/consent` | Signed-in user only, same-origin and bounded validated body; records consent for that session's principal |
| `/` | Server-protected workspace; redirects signed-out users to sign-in and incomplete users to onboarding; disabled users see access denied |
| `POST /api/aadi` | Server-protected analysis; no session: JSON 401; disabled account or missing consent: JSON 403; existing gateway validation follows only after authorization |
| `GET /api/aadi` | Explicit public readiness exception used by the launcher and deploy probe; preserve the existing bounded readiness JSON contract, without user content, keys or inference |

Do not initialize the client workspace, read browser records or start analysis before the server guard admits the user. Middleware/proxy initializes Clerk and performs coarse routing, but the page and mutation handlers enforce access close to the resource. Clerk middleware alone does not protect routes by default. Follow the installed Next.js guide and current SDK behavior when choosing `proxy.ts` and dynamic rendering boundaries; see [Next.js integration](https://clerk.com/docs/nextjs/getting-started/quickstart).

Missing or invalid configuration and upstream identity/consent lookup failures must return an unavailable state, not silently activate anonymous mode. Use bounded identity lookups and generic client errors; do not cache an authenticated workspace response across principals. Navigation targets are fixed application routes or validated same-origin paths, never arbitrary invitation/query-string redirect destinations.

The production beta always uses Clerk. If the existing private developer workflow needs an auth-free mode, it must be an explicit development/test-only setting, bound to loopback with no public origin; it is rejected for production/public deployment. There is no public bypass header, query token, magic test code or fail-open fallback. Automated build/unit tests must not require live Clerk credentials or provisioning; absent configuration must remain fail-closed at runtime.

## 5. Legal and beta consent

Enable Clerk's express legal-consent requirement and point it to the public site's reviewed terms and privacy pages. Legal acceptance must complete through the provider, not a checkbox whose value is trusted only in the browser. See [Clerk legal acceptance](https://clerk.com/docs/guides/secure/legal-compliance).

Before opening the workspace, show an unchecked Indonesian acknowledgement that the beta accepts fictional/synthetic cases only, outputs remain drafts for clinician review, and browser data is local and unencrypted. Refusal leaves the workspace and analysis unavailable. A policy change advances the application consent version and requires acknowledgement again.

The application server writes a small `sentrapediaBetaConsent` record in Clerk private metadata: policy version, server timestamp and `syntheticOnly: true`. The subject comes from the verified session, never a user ID or email in the submitted body. The operator-owned disable flag is separate, and the consent endpoint cannot change it or reactivate an account. Client metadata is not an authorization source. Read the current backend record for workspace and analysis authorization; do not rely on a stale token claim after a metadata change. A failed lookup or write cannot grant access. Keep unrelated metadata intact. See [metadata access boundaries](https://clerk.com/docs/guides/users/extending).

This is a minimal current-consent record, not an immutable compliance audit ledger. No case, draft, clinical reference, diagnosis or patient information is sent to Clerk metadata, email templates or identity logs. Policy copy must accurately disclose Clerk identity processing and be reviewed by Gaffer before release; enabling a consent checkbox does not itself establish regulatory compliance.

## 6. Browser data and session lifecycle

Retain the workspace JSON schema, reducer behavior, review states, drafts and document/export semantics. Derive storage and unreadable-backup keys from a versioned namespace and the opaque verified Clerk user ID, never an email address. Pass the scoped persistence adapter to every restore/save/backup/clear path; audit all current `localStorage` users, including workspace forms.

Do not assign the legacy unscoped key to the first person who signs in. Leave the original and unreadable backup untouched, and do not surface their contents in a different account's authenticated UI. Document export-before-cutover using the existing workspace controls; any later legacy import must be an explicit ownership-reviewed migration, not automatic sign-in behavior.

Mount client state keyed by principal. On sign-out, account switch or SDK-reported session invalidation, remove the rendered workspace, abort in-flight browser requests, discard in-memory case/draft state and stop writes under the old principal. Existing account-scoped browser records are retained, not destructively deleted. Other tabs must respond to the SDK's session-change notification rather than keeping an interactive stale workspace. Browser back/forward must not reveal a previous account's rendered records. Suspension denies the next protected request; it does not retract bytes already downloaded or promise cancellation of an inference already authorized before revocation.

Namespacing prevents accidental cross-account UI reuse; it is not encryption or a boundary against a device owner, browser extensions or same-origin script compromise. Keep the synthetic-data restriction and browser-storage warning explicit.

## 7. Component ownership and operational configuration

- Capsule-owned auth/config and server access helpers: validate configuration, resolve principal, enforce consent and map failures. Keep Clerk calls behind small testable adapters.
- A capsule-owned access operator command: validates an explicitly supplied opaque user ID, sets the backend-only suspension flag, and revokes sessions when disabling; logs no keys, email addresses, invitation URLs or OTPs. Request approval remains in the native Clerk Dashboard.
- Application auth pages/layout and onboarding endpoint: use Clerk prebuilt components with existing Sentra tokens, Indonesian copy, responsive keyboard/focus behavior and accessible errors. No marketing-site framework migration.
- Workspace persistence adapter and lifecycle: responsible only for principal scope and session transitions; no clinical logic change.
- `src/app/api/aadi/route.ts`: authorization wrapper around the unchanged gateway, retaining the readiness exception.
- `apps/site/source/`: later add request-access navigation and route Masuk to the system sign-in page; preserve the already-approved site presentation and public assets.
- Capsule manifests, standalone/container pipeline, environment example, lifecycle contract and beta runbook: declare Clerk as an external dependency and carry publishable configuration into the browser build and the secret key into server runtime only. An unauthenticated extraction smoke check must use the readiness route, not expect workspace HTML at `/`.

Use separate development and production Clerk instances owned by Gaffer's account. Before provisioning, inspect/select any existing application instead of silently duplicating it. Do not run an initialization tool that modifies global agent skills, rules or other control-plane files. No keys, invitation links, cookies, OTPs, real tester addresses or mailbox passwords enter git, logs, screenshots or test fixtures.

Clerk delivers the initial authentication and invitation emails. Production sender-domain DNS records need verification; preserve existing Hostinger MX and mail authentication records. Do not promise an arbitrary sender address, customized template, MFA or suspension capability without confirming availability on the selected production plan. No paid-plan purchase or domain/access change is implied by this design approval.

## 8. Staged migration and rollback

1. Implement and test against a development instance, without changing the live Cloudflare policy or clinical model behavior. Only synthetic fixtures and mocked analysis are needed for auth regression testing.
2. Configure a staged production instance/runtime with Waitlist mode, reviewed policy links, correct redirect URLs and verified email delivery. Test through an invited tester before public cutover. Keep the old Cloudflare Access gate in place during this stage.
3. Prove page and API denial without a session, onboarding denial without consent, readiness compatibility and account isolation. Check that disabled/revoked access cannot be regained by simply requesting another OTP.
4. Obtain explicit release and access-policy authority. Keep Cloudflare DNS, Tunnel, TLS and network protection; remove only the redundant end-user Access login gate for the validated application hostname after Clerk guards work. The origin remains loopback-only. Administrator/server access remains separately protected.
5. Verify an external visitor can request access and an approved individual can enter through Clerk without a second end-user login. Then update the public site's request-access/sign-in links.
6. If any authorization test fails after cutover, re-enable the old Cloudflare Access policy before reverting to a pre-Clerk image. Never roll back to an unauthenticated application while the old edge gate is absent. Do not delete browser workspaces or identity records during rollback.

The current beta runbook's update command includes a git pull. It must not be run automatically as part of this work: each merge needs its own Gaffer approval. Publication must continue through the dedicated Sentrapedia repository, never monorepo history. Prior website-only publication authority does not silently authorize this identity cutover.

## 9. Binary acceptance evidence

| Requirement | Evidence required before release |
| --- | --- |
| Request and approval | External applicant reaches `/apply`; pending request visible in the selected Clerk instance; no workspace access before Gaffer's invitation |
| Invitation delivery | A named authorized tester receives the actual invitation; wrong-email, expired, revoked and reused-link cases cannot bypass provider checks |
| Registration and terms | Required terms cannot be skipped; a permitted invited user can finish registration; a visitor without an invitation cannot create an eligible account |
| Beta acknowledgement | Reject/missing/stale consent blocks workspace and analysis; valid consent is recorded server-side for the authenticated subject only |
| Server authorization | Direct POST with no/invalid/expired session is denied before gateway/model calls; client metadata, forged subject and untrusted origins cannot grant access |
| Readiness parity | Launcher warming and beta deploy probe still succeed without interactive login; readiness never triggers paid inference or exposes identity/clinical content |
| Isolation and preservation | Account A data is never rendered or saved under B; backup and clear are scoped; legacy raw and unreadable records remain unchanged; sign-out, tab session loss and back navigation are covered |
| Revocation and failure | Revoked users cannot re-enter; stale sessions, Clerk outage, metadata failure and missing keys fail closed; no production local bypass |
| Behavior parity | Existing gateway origin, synthetic/PII, cost/concurrency and therapy/evidence tests still pass; clinical source and templates remain unchanged |
| Browser UX | Desktop/mobile request, pending, invitation, sign-in, consent, retry, sign-out and denied states tested; keyboard/focus and responsive styles verified |
| Capsule lifecycle | Declared install/lint/typecheck/test/build/run/deploy-dry-run pass in an isolated extraction with only declared capsule dependencies and appropriately configured auth |
| Production cutover | Correct commit/Clerk instance/hostname recorded; live email, session denial and admitted-user flow proven after authorized gate change; rollback procedure validated |

Development auth tests may use Clerk's supported test identities only in a development instance. Do not treat a fixed development OTP or mocked email as proof of production delivery. Production acceptance is a real invited-user flow, with the user completing any credential or consent steps that require human control. No paid clinical inference is necessary to prove registration and login.

## 10. Review and implementation handoff

This specification is a design deliverable only. Written-spec approval is followed by an implementation plan with small reviewable passes: provider/config, admission pages, consent/access guards, scoped persistence, container/readiness integration, site links, regression/E2E, then separately authorized production cutover. Security review must cover the auth boundary before release. No build, account provisioning, dependency installation or production configuration is claimed complete here.

References: [email delivery and DNS](https://clerk.com/docs/guides/development/troubleshooting/email-deliverability), [development sign-up testing](https://clerk.com/docs/guides/development/testing/playwright/test-sign-up-flows). Provider configuration and plan limits must be rechecked at implementation time.
