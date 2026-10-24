# Clerk Beta Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Gaffer selected inline execution and ordered implementation of the written spec on 2026-10-24.

**Goal:** Implement individually authenticated, consent-gated closed-beta access without changing clinical behavior or prematurely removing the live Cloudflare gate.

**Architecture:** Clerk owns waitlist, invitations, email verification and sessions. Capsule-owned access helpers enforce server-side suspension and versioned consent; the workspace uses principal-scoped browser persistence. The existing readiness GET remains public and analysis POST gains an authorization guard.

**Tech Stack:** Next.js 16.4.2, React 19.3.0, TypeScript, pinned @clerk/nextjs 7.9.20, Vitest, existing static site toolchain.

**Spec:** `docs/specs/2026-10-23-clerk-beta-access-design.md`

**Execution status (2026-10-24):** Tasks 1–6 implemented; Task 7 auth review/fix pass and source gates verified. Gaffer authorized production/DNS/deploy/conditional cutover and selected the latest complete tested baseline. Clerk domain checks are complete; draft private PR26 original Linux check/docker passed. Local Docker failed; reviewed private-artifact CI delivery is prepared (13 release checks, full system suite60), awaiting internal GitHub sign-in to configure the masked publishable setting before publication/runtime rollout. See `docs/verification/clerk-production-activation-2026-10-24.md`; real tester acceptance and public cutover remain open.

## Global Constraints

- Synthetic cases only; no clinical engine, evidence, template or provider behavior changes.
- Missing/invalid Clerk configuration and failed identity lookups fail closed. Production has no local bypass.
- Approval is in Clerk Waitlist mode, not a new administrative application.
- Never trust user IDs, approval, suspension or consent supplied by client metadata.
- No keys, OTPs, invitation URLs or real tester identifiers in source/logs/test fixtures.
- Legacy browser data is preserved but never automatically assigned to an authenticated user.
- All changes, dependency state and runtime helpers belong to this capsule. No root/sibling runtime dependency.
- Provisioning, paid plans, production DNS/access changes, publication and merges are separately gated operations. Do not run the beta updater, whose git pull is a merge.
- Manually integrate the SDK; do not run a CLI initializer that modifies global agent skills/configuration.

## File Structure

- `src/lib/auth/config.ts`: validate auth mode and environment; no UI exposure of secret configuration.
- `src/lib/auth/policy.ts`: pure user/consent/suspension decisions and metadata validation.
- `src/lib/auth/access.ts`: bounded provider seam, consent handler and authorization response mapping.
- `src/lib/auth/server.ts`: server-only Clerk adapter; no clinical content enters Clerk.
- `src/proxy.ts`: SDK request initialization, without treating middleware as the resource guard.
- Auth/onboarding pages and `src/components/auth/`: admission UI, consent and session lifecycle.
- `src/lib/workspace-storage.ts` and existing persistence/form callers: principal-scoped storage and backup handling.
- `scripts/beta-access.mjs` and `scripts/beta-access-core.mjs`: explicit user-ID suspension operator.
- Capsule package/lock, environment example, Docker/contract and beta runbook: operational integration.
- `apps/site/`: reviewed site foundation and prepared request-access/sign-in navigation; not deployed before cutover.
- Auth/storage/UI/operator tests: behavioral contracts, not source-text assertions.

## Review Focus

1. A wrong or switched principal must never see or overwrite another principal's state, including after back/forward, restore and clear.
2. Identity timeout, malformed metadata, stale consent and disabled users must be denied before analysis calls, including a newly issued session for a disabled user.
3. Consent changes must not reactivate an account or overwrite unrelated provider metadata; forwarded Host/Origin values cannot bypass CSRF checks.
4. A credential-free build must succeed while the resulting runtime stays unavailable rather than anonymous; readiness must still work.
5. Prepared site links must not regress the already-published frontend or imply that live Clerk provisioning/cutover is complete.

---

### Task 1: Configuration and access policy

**Files:** create `src/lib/auth/{config,policy,access}.ts`; tests `tests/beta-auth.test.ts`.

**Interfaces:**
- Produces `resolveAuthConfig(env: Record<string, string | undefined>): AuthConfig`, discriminated by `mode: 'clerk' | 'local' | 'unavailable'`.
- Produces `BetaUser` with `id`, `emailVerified`, `privateMetadata`; `AccessResult` with `status: 'allowed' | 'signed-out' | 'consent-required' | 'disabled' | 'unavailable'` and an admitted `userId` only for allowed results.
- Produces `createBetaAccess(deps)` with `resolve(requireConsent?: boolean): Promise<AccessResult>` and `consent(request: Request): Promise<Response>`; dependency callbacks resolve session, fetch user and merge consent metadata. Identity timeout is 5 seconds. Beta policy version is `sentrapedia-beta-v1`.

- [ ] Step 1: Write behavioral tests: empty configuration unavailable; local rejected in production/public-origin/non-loopback mode; Clerk requires matching environment key families and production https origin; no session denies; a disabled/malformed record denies; only verified matching user plus current consent admits; changing subject cannot obtain another user's consent; lookup errors/timeouts deny; unsafe metadata cannot grant access. Consent rejects wrong origin, unexpected keys, false acknowledgement, wrong version and body over 1024 bytes; valid input writes only the authenticated subject's version/server timestamp/synthetic flag.
- [ ] Step 2: Run `npx --no-install vitest run tests/beta-auth.test.ts`. Expected: RED for missing implementation, with intended assertions identified in the ledger.
- [ ] Step 3: Implement pure configuration/policy and bounded callback-based access helpers. Preserve the existing AADI error envelope in denied JSON responses. Validate consent before writing and preserve unrelated metadata through the provider's metadata merge endpoint.
- [ ] Step 4: Run the same test command. Expected: all Task 1 cases pass without network calls.
- [ ] Step 5: Commit `feat(auth): add closed-beta access and consent policy` with the Codex coauthor trailer.

### Task 2: Clerk server integration and API protection

**Files:** package/lock; create `src/lib/auth/server.ts`, `src/proxy.ts`, `src/app/api/onboarding/consent/route.ts`; modify `src/app/api/aadi/route.ts`; test `tests/beta-auth-routes.test.ts`.

**Interfaces:** consumes Task 1; produces server-only `getBetaAccess()` and `getAuthConfig()`; handlers use `getBetaAccess().resolve()` before clinical work and `.consent(request)` for onboarding.

- [ ] Step 1: Write route tests using provider/grounding seams only: unauthenticated, disabled and missing-consent POSTs have 401/403 and zero gateway work; allowed POST forwards the original request once; GET readiness remains session-free and never performs analysis; consent response preserves Task 1 validation. Include unconfigured/timeout results returning generic 503 rather than HTML or anonymous access.
- [ ] Step 2: Run `npx --no-install vitest run tests/beta-auth-routes.test.ts`. Expected: RED because the current analysis route has no auth guard.
- [ ] Step 3: Install pinned Clerk and `server-only` in this capsule, read installed SDK types and the installed Next guide (official documentation if not bundled), and wire the server adapter/proxy/handlers. Secret key remains server-side; proxy bypass for public readiness does not bypass POST authorization. No live key is needed for unit tests.
- [ ] Step 4: Run `npx --no-install vitest run tests/beta-auth.test.ts tests/beta-auth-routes.test.ts`. Expected: all pass.
- [ ] Step 5: Commit `feat(auth): guard analysis with Clerk identity and consent`.

### Task 3: Admission, onboarding and session UI

**Files:** modify `src/app/{layout,page}.tsx`; create `/apply`, `/sign-in/[[...sign-in]]`, `/sign-up/[[...sign-up]]`, `/onboarding`; create focused `src/components/auth/` files and token-based auth CSS; tests `tests/ui/beta-auth.test.tsx` and server-page tests.

**Interfaces:** consumes server access result and configuration; produces `AuthenticatedWorkspace({userId})` and a consent form posting exactly `{version, accepted:true, syntheticOnly:true}`. Only the public publishable key enters ClerkProvider props.

- [ ] Step 1: Test page decisions for signed-out, disabled, unavailable, missing consent and admitted users; unchecked consent cannot submit; pending/errors preserve a usable retry; success navigates only to `/`; authenticated shell hides/unmounts its workspace when the SDK's current user differs or its session ends. Test focusable controls and accessible error/status messages with real app UI; mock external Clerk hooks only.
- [ ] Step 2: Run `npx --no-install vitest run tests/ui/beta-auth.test.tsx tests/beta-auth-pages.test.tsx`. Expected: RED for missing admission UI/guards.
- [ ] Step 3: Add public admission surfaces with Clerk components, provider inside body, appropriate Suspense/dynamic boundaries and safe fixed redirects. Missing configuration renders an unavailable state without constructing Clerk UI. Add the unchecked synthetic-data consent and current policy links. Server guards redirect or deny before the client workspace mounts. Provide sign-out and handle session loss across tabs/pageshow without retaining interactive client state.
- [ ] Step 4: Run the same UI/page tests plus Task 1/2 tests. Expected: pass without real email delivery or credentials.
- [ ] Step 5: Commit `feat(auth): add waitlist and consent-gated sign-in UI`.

### Task 4: Principal-scoped workspace persistence

**Files:** create `src/lib/workspace-storage.ts`; modify workspace persistence/session/forms/app and auth shell; tests `tests/workspace-storage.test.ts`, relevant existing workspace UI/session tests.

**Interfaces:** produces `workspaceStorageKeys(userId: string): {storageKey: string; unreadableKey: string}` using an opaque principal and a versioned namespace; existing `restoreFromStorage` gains an explicit key parameter while retaining its legacy helper behavior for existing non-auth consumers. WorkspaceApp receives a principal scope from its authenticated caller.

- [ ] Step 1: Tests prove A cannot restore B; no legacy data is auto-loaded; broken A data backs up under A only; clearing A leaves B and legacy keys untouched; failed restore never saves seed data over unreadable input; principal changes unmount old state and abort outstanding browser requests. Update existing app callers/tests for the intentionally required scope, keeping reducer/JSON contracts unchanged.
- [ ] Step 2: Run `npx --no-install vitest run tests/workspace-storage.test.ts tests/workspace-session.test.ts tests/ui/workspace-smoke.test.tsx tests/ui/beta-auth.test.tsx`. Expected: RED for missing scoped persistence.
- [ ] Step 3: Thread one scoped adapter through restore/save/backup/clear; keep legacy bytes untouched; key the workspace by principal and prevent writes during restore or after unmount. Do not migrate or delete browser records automatically.
- [ ] Step 4: Run the same command and all UI tests. Expected: green; old clinical interactions still work.
- [ ] Step 5: Commit `feat(auth): isolate browser workspaces per principal`.

### Task 5: Operator and self-contained deployment contract

**Files:** create `scripts/beta-access{,-core}.mjs`; tests `tests/beta-access-operator.node-test.mjs`; modify package scripts, `.env.example`, Dockerfile, project contract, beta runbook and auth documentation.

**Interfaces:** operator core accepts explicit `disable|enable` and opaque `user_...` ID, a provider seam and server key; `disable` merges only the suspension flag before revoking all sessions. CLI errors/logs omit key, email, invitation URL and provider bodies.

- [ ] Step 1: Test invalid action/user ID and missing config fail before network; disable writes the flag before revocation; enable writes false without granting consent; pagination covers every session; partial revocation failure exits nonzero while the flag remains disabled; unrelated metadata remains. Test CLI subprocess exit/output against a local controlled HTTP provider through the core seam, never a real service.
- [ ] Step 2: Run `node --test tests/beta-access-operator.node-test.mjs`. Expected: RED for missing operator.
- [ ] Step 3: Implement the bounded operator and runbook. Declare Clerk as a capsule external dependency and readiness as smoke path; add publishable build args/runtime key contract without secret build args. Keep host loopback, existing budgets, launch/warm behavior and container engine packaging intact. Document Waitlist/OTP/legal/sender configuration, explicit local-only development mode, suspension, storage preservation and edge-first rollback. No live configuration mutation.
- [ ] Step 4: Run the operator tests and `npm run test:system`. Expected: pass with no paid model calls. Inspect build/dry-run traces after Task 7 for capsule-local Clerk dependencies.
- [ ] Step 5: Commit `feat(auth): add beta access operator and deployment contract`.

### Task 6: Prepared marketing navigation on the reviewed site foundation

**Files:** only `apps/site/` changes from the previously reviewed snapshot `c773e692`, plus source login/request-access anchors, site tests/verifier/parity normalization and deployment notes.

**Interfaces:** consumes system `/apply` and `/sign-in`; public production destinations remain under `https://beta.sentrapedia.com`. No website deploy is performed by this task.

- [ ] Step 1: Inspect the exact site-only diff to `c773e692` and port the already-approved frontend foundation as text patches, without merging a branch or importing clinical/control-plane files. Confirm its site test baseline first. This avoids reverting the already-published refactor/caption removal when preparing navigation.
- [ ] Step 2: Add site behavior tests that built desktop/mobile Masuk links target `/sign-in`, request-access links target `/apply`, and no unapproved destination appears. Run `node --run test` from `apps/site`. Expected: new navigation assertions RED against the reviewed foundation.
- [ ] Step 3: Add the small navigation change using existing classes, update the exact outbound allowlist and precise historical-parity normalization for the approved auth anchors only. Document that publication waits for the Clerk cutover.
- [ ] Step 4: Run site test/lint/verify/docs:verify/deploy:dry-run. Expected: all pass; protected design files unchanged and eight live/two anatomy panels retained.
- [ ] Step 5: Commit `feat(site): prepare Clerk request-access and sign-in navigation`.

### Task 7: Regression, browser verification and final review

**Files:** add focused lifecycle/route regression cases as needed; update tracked implementation evidence, plan/ledger and capsule handoff; no clinical source changes.

**Interfaces:** consumes Tasks 1-6; produces a verified code branch and an explicit unfulfilled-release checklist when external authority/configuration is unavailable.

- [ ] Step 1: Run `npm run typecheck`, `npm run lint`, `npm run test:all`, `npm run site:verify`, `npm run site:docs`, `npm run build`, `npm run deploy:dry-run`. Expected: exit 0; no real model calls. Resolve code failures with reproducing tests, never disable gates. Classify inherited warnings separately.
- [ ] Step 2: Start the built app with no Clerk keys and inspect public admission/unavailable states plus readiness; direct analysis must deny, not call the provider. Run mocked-session browser/unit transitions for consent, denied, principal switch, logout and keyboard/mobile behavior. Expected: no unapproved workspace flash or cross-account state.
- [ ] Step 3: Inspect authenticated Clerk provisioning options without exposing secrets. If application selection/login/terms or security-sensitive setup requires Gaffer, stop that external step and record the exact prerequisite. Do not invent keys or claim real invitation/OTP delivery from mocks.
- [ ] Step 4: Generate a whole-branch review package, dispatch one fresh reviewer on the strongest available model, and perform one TDD fix pass for confirmed Important/Critical findings. Expected: all applicable code gates green; deferred minors and rulings recorded. No per-task implementer or reviewer agents.
- [ ] Step 5: Commit tracked evidence/handoff. Code completion is distinct from the mandatory external acceptance: selected Clerk dev/prod instances, native Waitlist and consent settings, a real invited tester flow, sender DNS verification, separately authorized release/Cloudflare cutover and post-cutover verification remain explicit release gates, not silently waived requirements.

## External release checklist (not authorized by local implementation)

- Select/claim the intended Clerk application under Gaffer's account; configure separate development/production instances and secret destinations securely.
- Verify Waitlist mode, email OTP, required legal acceptance, correct policy/redirect URLs and native email delivery. Gaffer approves the invited tester; the human completes credential/legal-consent steps requiring human control.
- Verify real pending/invited/revoked/expired/disabled flows and two-user browser isolation in the configured environment.
- Obtain production release, DNS/access-policy and any merge authority; preserve the existing Cloudflare gate until the staged Clerk guards pass.
- Cut over the redundant end-user gate only, publish prepared site links, verify live behavior and retain edge-first rollback. Never call this implementation fully deployed while these items lack authoritative evidence.
