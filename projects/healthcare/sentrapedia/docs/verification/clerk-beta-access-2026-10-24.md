# Clerk closed-beta implementation evidence

Date: 2026-10-24 Asia/Jakarta. Branch: `codex/sentrapedia-clerk-access-31bf87f9`. Source baseline: `511a66d5`; implementation range begins after the approved design/handoff at `7175067d`.

## Implemented boundary

- Clerk provider/proxy and closed-beta admission pages; no application password database or approval dashboard.
- Current backend identity, verified primary email, private suspension flag and versioned synthetic-data consent enforced before workspace rendering and analysis POST.
- Same-origin, bounded-body consent records the server timestamp for the authenticated subject only; metadata writes cannot clear suspension.
- Client shell locks/unmounts on identity mismatch, sign-out and cached navigation; pending analysis cleanup remains owned by the existing workspace.
- Principal-scoped restore/save/backup/clear, with legacy browser bytes left untouched and unreadable input not overwritten during hydration.
- Explicit ID-based suspension operator: flag first, snapshot paginated active sessions, revoke, generic failures and bounded provider calls; enable grants neither consent nor a session.
- Reviewed static-site foundation from `c773e692` with exact prepared `/apply` and `/sign-in` anchors. No marketing deployment.

No clinical engine, clinical templates, grounding, evidence rules, JSON workspace schema, framework version or clinical provider behavior was changed. The new pinned dependencies are `@clerk/nextjs@7.9.20`, `@clerk/backend@3.26.2` and `server-only@0.0.1`.

## Observed commands

Run from this capsule unless specified. No live credentials or paid inference were used.

| Command | Observed result |
| --- | --- |
| `npm ci --workspaces=false` | Exit 0, capsule-owned lock/install and bundled runtime setup |
| `npm run typecheck` | Exit 0 |
| `npm run lint` | Exit 0; three inherited unused `missingField` warnings |
| `npm run test:all` | Exit 0 after review fixes: 517 Vitest, 53 site, 47 Node tests; Python 237 passed, 1 skipped |
| `npm run site:verify` | Exit 0: 22 presentation files unchanged, 72 local targets, no errors |
| `npm run site:docs` | Exit 0: 96 documents, no errors |
| `npm run build` | Exit 0, without Clerk credentials; dynamic guarded pages/proxy built |
| `npm run deploy:dry-run` | Exit 0: 13 traces remain inside capsule, zero external source dependencies; site dry-run publishes nothing |

TDD observations: missing policy modules, unguarded analysis POST and missing consent route, missing admission UI/unguarded Home, missing scoped storage, missing operator, and old marketing destinations each produced expected RED results before their implementation. Focused GREEN runs are recorded in the corresponding task commits/plan execution. Plain Node cannot import the Next-specific ESM server entry, so the CLI uses its pinned direct backend SDK; a subprocess test covers that boundary. Internal navigation uses Next Link after the lint gate rejected plain anchors.

Inherited/toolchain limits: Vitest emits the existing CommonJS/native-config-loader warning. npm reports deprecated ESLint and unapproved dependency install scripts; no suppression/approval was added. This host's standalone image contains Windows native binaries; Linux image verification requires the normal Docker build on Linux, not reuse of this host's artifacts.

## Built runtime and browser smoke

Started `node .next/standalone/server.js` on `127.0.0.1:3422`, explicitly without Clerk keys and with Clerk mode. No managed clinical engine/provider was started for this smoke.

| Probe | Observed result |
| --- | --- |
| `/`, `/apply`, `/sign-in`, `/sign-up`, `/onboarding` | HTTP 200 unavailable state, no `app-shell` or anonymous workspace |
| POST `/api/aadi` | HTTP 503, bounded `AUTH_UNAVAILABLE` JSON |
| POST `/api/onboarding/consent` | HTTP 503, same fail-closed envelope |
| GET `/api/aadi` | HTTP 200 existing readiness contract; configured/reachable/modelReady/groundingReady false |

In-app browser confirmed the unavailable page and Enter navigation from request access to `/sign-in`. At viewport 390 x 844, DOM measurements confirmed a 350px heading at x=20, 28.8px font, device-width viewport and scale 1. The temporary viewport was reset. No authenticated browser screenshot or native email-delivery proof is claimed. The `agent-browser` CLI was unavailable, so browser smoke used the existing CUA surface.

## Mandatory external acceptance still open

The Clerk Dashboard redirected to its sign-in screen. Gaffer must sign in and identify the intended application; no account creation, legal acceptance, secret provisioning, paid plan, sender DNS or access-policy change was performed. Never send keys or OTPs in chat.

Before release, verify separate dev/prod instances, native Waitlist mode, required legal acceptance, email OTP and delivery, actual pending/invited/expired/revoked paths, suspension/new-session denial and two-user browser isolation. Those are not established by mocks. Obtain separate merge/push/release/cutover authority. Keep the live Cloudflare gate, tunnel and host-loopback protections until then; restore the edge gate before rolling back to any unauthenticated image. The operator/release checklist is in `docs/auth-beta-access.md`.

## Fresh-context whole-branch review and fix pass

One read-only reviewer examined `7175067d..372e53a5`. Two Important findings, no Critical findings and no deferred minors:

1. Clerk middleware could hang before reaching the bounded resource guard, or propagate a provider exception. Regression tests observed pending status after 5001ms instead of 503 and an exposed exception. The proxy now uses the same identity deadline and generic no-store unavailable mapping; readiness retains its bypass.
2. Consent cancellation could be mistaken for normal EOF (200/write after timeout), or await an uncooperative cancellation forever. Tests reproduced both failures. The parser now rejects an expired read and cancels best-effort without awaiting cleanup. Additional checks cover invalid delayed trailing bytes and rejected cancellation.

Fix commit: `94ef2de2`. Focused suite: 29/29, typecheck 0. Full suite, lint, build, site checks and deploy dry-run were rerun after the fixes with the results above. A first rebuild encountered Windows EPERM on a sharp DLL loaded by this task's standalone preview; stopping that owned preview released the lock, and the rebuild exited 0. No destructive cleanup or gate suppression was used. There was no second reviewer dispatch.

### Rulings carried from execution

- Gaffer's explicit Implement-spec instruction plus executing-plans selection approved continuous inline execution of the derived plan. Cost if wrong: task breakdown may need revision; live security/release actions remain separately gated.
- Bundled Next documentation was absent after install, so current official docs and pinned installed types were used. Cost if wrong: upstream documentation mismatch, covered by local typecheck/build and route tests.
- The plain Node operator uses a pinned direct `@clerk/backend@3.26.2` dependency because the Next server SDK's extensionless ESM imports require a bundler. Cost if wrong: one additional maintained dependency; subprocess tests cover the boundary.
- The review deliberately did not reassess clinical inference, therapy/evidence quality or medical validity: no clinical code changed and clinical gates still ran. Cost if wrong: pre-existing clinical issues remain undiscovered; this work makes no clinical-validation claim.
- The review did not repeat the historical motion review of `c773e692`; new inspection covered navigation/auth changes and existing parity/interaction tests ran. Cost if wrong: a pre-existing animation defect may remain.
- Native invitation/OTP, Dashboard/legal settings, DNS and cutover were not judged passed without a configured environment. Cost if wrong: release remains blocked; local mocks cannot substitute for external acceptance.

Deferred minors: none.
