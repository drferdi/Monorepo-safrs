# User self-service access — 2026-10-24

## Superseding user instruction

Gaffer replaced the user admission requirement with **Daftar → Login → Akses**, clarified that approval/invitations belong to the admin process, and requested the user flow first. This supersedes the earlier mandatory Waitlist/invitation/extra-consent steps for ordinary users. It does not authorize granting admin privileges on registration or accepting legal terms for someone else.

## Scoped implementation

- `/sign-up` presents ordinary Clerk registration; `/sign-in` links directly to registration. Both completed authentication paths lead to `/`.
- `/apply` remains a compatible redirect to `/sign-up`; `/onboarding` redirects to `/`, whose server guard still checks identity.
- Default server access no longer requires the application-specific consent metadata. Verified email, session principal, backend suspension, provider-failure denial and identity-scoped workspace storage remain enforced. No admin role is created or written.
- The public website's desktop/mobile links now say Daftar and point to `/sign-up`. Only the approved URL and corresponding source/verification hashes changed; the historical output-parity test still normalizes exactly those navigation additions.
- Existing explicit consent inspection and the old consent API are retained for compatibility, but normal user navigation no longer uses them. Historical metadata is preserved. Existing operator suspension/invitation operations are unchanged; no admin UI or admin authorization system was added.
- Required native Clerk legal acceptance is intended to remain at registration. It has not been accepted on behalf of a user.

## Observed verification

- Five new user-flow checks failed against the previous behavior, then passed with the implementation. Website navigation assertion also failed before its link change.
- Focused auth suite: 36 passed. `npx tsc --noEmit`: exit 0.
- `npm run test:all`: exit 0; 525 Vitest, 53 site, 60 system tests; Python 237 passed/1 skipped.
- `rtk proxy npm run lint`: exit 0, three inherited unused-variable warnings. No autofix or rule suppression.
- `npm run build`: exit 0. `npm run site:verify`: 22 presentation files unchanged, 72 targets, zero errors. `npm run site:docs`: 96 documents, zero errors. `npm run deploy:dry-run`: exit 0, 13 local traces, zero external source dependencies, Windows-native build only.
- Fresh security review of this new text diff: no Critical/Important findings. One deferred Minor: the admin-role test fixture nests a public-metadata-shaped object inside privateMetadata, so that assertion does not establish actual publicMetadata behavior. No admin role is written by the implementation. External Clerk configuration, legal acceptance, Cloudflare gate and browser E2E were explicitly not established by this review.

## Failed local runtime checkpoint

Two consecutive local production-standalone smoke attempts returned HTTP 500 before the registration route could render. The first process inherited development configuration; clearing process key overrides and restarting did not resolve it. Server output still identifies a development Clerk instance and attempts HTTPS proxying to the local HTTP listener:

```text
Failed to proxy https://localhost:3423/sign-up Error: write EPROTO 348E0000:error:0A00010B:SSL routines:tls_validate_record_header:wrong version number:openssl\ssl\record\methods\tlsany_meth.c:78:
errno: -4046
code: 'EPROTO'
syscall: 'write'
```

Hypothesis: the local Next build embedded the development publishable key and the smoke's forwarded HTTPS headers trigger Clerk's development local proxy. This is not proven fixed. The user-supplied AGENTS circuit breaker requires halting verification after two consecutive failures; no third smoke/rebuild attempt or production rollout was performed. The built preview process is stopped at handoff.

## External state and remaining work

The existing production release `9fc41c77` remains active with its earlier onboarding flow. Clerk production signup mode is still Waitlist; the self-service public-mode patch has not been applied. Config schema was read to identify the supported `auth_access_control.sign_up_mode` setting; no credentials or configuration values were printed. Cloudflare Access is still active. Local browser automation is disabled in Work settings, and the request to re-enable it is pending.

Resume by resolving the local build/config mismatch, verifying the built user flow, publishing a capsule-only reviewed source revision and staging its Linux image. Then apply and read back public user registration with required email/legal settings retained, perform the separately controlled beta-only Access cutover, and prove a real user's registration/login/workspace journey. Never merge main, create an admin identity, remove the Tunnel/TLS/loopback protection, or claim completed E2E based on mocks. Existing inherited binary/LFS modifications and scratch files remain outside this change.

## Resumed production preparation

Gaffer explicitly resumed work with "just selesaikan end to end". Rebuilt with the selected live publishable configuration, explicitly withholding the server secret from the build environment. This build exited 0. The reverse-proxy HTTPS headers still produced a local TLS error: the standalone listener was bound to `127.0.0.1` while the framework/Clerk rewrite targeted `localhost`. Binding the owned preview to `localhost` and testing its actual HTTP origin resolved the local mismatch without changing application or SDK code. The initial hypothesis about a development build key was therefore incomplete; live public configuration is retained for release parity.

Six built HTTP checks then exited 0: `/sign-up` and `/sign-in` render 200, `/apply` redirects to `/sign-up`, `/onboarding` redirects to `/`, anonymous `/` redirects to `/sign-in`, and POST `/api/aadi` returns 401 `AUTH_REQUIRED`. No old invitation/extra-consent copy or workspace markup appears in the anonymous responses. Redirects may be streamed by Next. This is HTTP runtime evidence, not authenticated browser E2E.

Local browser access remains disabled by Work settings, as confirmed on resume. No attempt to bypass that permission through another browser-control mechanism was made. Wrangler is not authenticated; no Cloudflare credential was read or created. Vercel CLI is authenticated. A production Clerk configuration dry-run validates exactly `auth_access_control.sign_up_mode: public` and the old Waitlist path alias to `/sign-up`; it has not yet been applied at this checkpoint.

The private delivery artifact previously exceeded the connected download tool's 512 MiB limit. The CI transport now splits the exact Docker archive into at most four 256 MiB parts, plus a manifest of part sizes/hashes and whole-archive SHA-256. The same private publication guard protects every upload, with one-day retention, no new permission, no candidate registry push or image prune. Oversized input and preexisting output directories fail before upload. A roundtrip test proves identical reconstructed bytes and manifest hashes; all 15 publication tests and all 62 system tests pass. Targeted ESLint and diff check exit 0. A separate fresh review of this transport delta found no Critical/Important issues or confirmed minors. Live download/reassembly must still verify each part and the complete archive from the same CI revision before Docker load.
