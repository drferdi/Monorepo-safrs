# Public Clerk beta release readiness — 2026-10-24

## Required visitor journey

Website -> Ajukan akses -> native Clerk Waitlist request -> pending (no demo access) -> Gaffer's explicit Clerk Dashboard approval -> personal invitation -> registration/legal acceptance -> application synthetic-data consent -> login/demo. Gaffer reaffirmed this sequence on 2026-10-24. No shared demo password, automatic approval or public registration is part of this release.

The public applicant must eventually reach Clerk without first authenticating to Cloudflare Access. Retain Cloudflare DNS, Tunnel, TLS, network protection and separate administrator protection; the only intended cutover is the redundant end-user Access login gate for `beta.sentrapedia.com`.

## Resume and current evidence

Resumed Task 7 of `docs/plans/active/2026-10-24-clerk-beta-access.md` from `ba2033c0`, preserving completed Tasks 1–6. The original fresh whole-branch review, two Important findings, RED/GREEN fixes and rulings remain recorded in [implementation evidence](clerk-beta-access-2026-10-24.md). No new application, auth, clinical, dependency or verification-control source changes were needed in this continuation.

| Fresh command/check | Observed result |
| --- | --- |
| `npm run test:all` | Exit 0: 520 Vitest, 53 site, 47 system; Python 237 passed, 1 skipped. Existing Vite CommonJS and Python warning remain. |
| `rtk proxy npm run lint` | Exit 0: no errors, three inherited `missingField` warnings; site checks 63 authored JavaScript files. The initial filtered invocation reported vendored minified scripts outside the command's declared targets; the raw exact package script passed without source changes. |
| `npm run typecheck` | Exit 0. |
| `npm run site:verify` | Exit 0: 22 presentation files unchanged, 72 local targets, no errors. |
| `npm run site:docs` | Exit 0: 96 documents, no errors. |
| `npm run build` | Exit 0: optimized standalone app and static site generated. Development environment was present; no environment file was copied into the standalone artifact. |
| `npm run deploy:dry-run` | Exit 0: 13 capsule-local traces, zero external source dependencies, matching Windows native binaries. Site dry-run publishes nothing. This is not a Linux container proof. |
| `rtk proxy npm run export:split -- <plan-workspace>/release-export-ba2033c0` | Exit 0: draft capsule export, 526 public files and 216 private files. No Git history or deployment; regenerate from the final approved release commit before publishing. |
| `npx -y clerk@latest deploy status` | Exit 1 with explicit `complete:false`, `state:not_started`, `domain:null`, `productionInstanceId:null`. This expected status identifies the missing production setup, not a passing deployment. |

The selected application remains `app_3L7xAG9MgjfvqgrncG8OoonOmuF`. Development uses Waitlist, email-code sign-in and required legal consent. Detailed native-component checks and settings are in [development activation](clerk-development-setup-2026-10-24.md).

Fresh standalone smoke on loopback port 3423, explicitly without valid runtime keys:

- `/`, `/apply`, `/sign-in`, `/sign-up`, `/onboarding`: HTTP 200 unavailable state, no workspace shell.
- Anonymous POST `/api/aadi` and `/api/onboarding/consent`: HTTP 503 `AUTH_UNAVAILABLE`.
- Readiness GET `/api/aadi`: HTTP 200, `configured:false`, `reachable:false`; no analysis.
- Browser `/apply` confirmed the unavailable message. The temporary smoke server was stopped; the configured Clerk development preview was restored at `http://localhost:3422/sign-in`.

No live approval, invitation, OTP delivery, user creation, legal acceptance, production setting, DNS record, Cloudflare policy, remote Git branch, image or deployment was changed. The draft export contains internal private data only in its separate local data tree; neither tree has been transmitted.

## Concrete production work awaiting authority

1. Configure the **production instance of the existing selected Clerk application**, using `beta.sentrapedia.com` as the application origin. Do not create another application or reuse development keys in production. Clerk CLI 4.0.0 reports that interactive `clerk deploy` creates the production instance and returns required domain/DNS steps; inspect the proposed actions and stop for any additional purchase or legal commitment. No paid plan purchase is authorized.
2. Apply the same closed-beta settings in production: Waitlist, email OTP only, required legal URLs, correct `/apply`, `/sign-in`, `/sign-up` paths, no username/password/social/Organizations. Verify sender, DNS and TLS using the exact records returned by Clerk; preserve existing mail/MX records.
3. Provision matching live keys only into the protected beta runtime and set the exact HTTPS public origin. Keep secrets out of image build arguments, source, logs and chat. Use the dedicated `drferdi/Sentrapedia` publishing boundary and its private data separation; never publish monorepo history or the private data tree to the public code repository.
4. Build and verify the Linux image and existing clinical/readiness compatibility. Record an immutable image tag/digest and previous rollback image. The existing updater may perform `git pull --ff-only`; do not run its default update path without approval for that specific merge. A release approval alone is not permission for a merge.
5. Stage the Clerk-enabled runtime while retaining the existing Access gate. Gaffer approves a named tester in Clerk; the tester completes their own legal acceptance and OTP. Prove pending/uninvited denial, invitation delivery, consent, suspension/new-session denial and two-user isolation. Mocks and development OTP shortcuts do not satisfy these gates.
6. Only after the production checks pass and cutover is explicitly authorized, remove the redundant **end-user Access login gate for this hostname only** and publish the prepared marketing links. An external applicant must reach `/apply`, remain pending until Gaffer's approval and be unable to open workspace/analysis before admission. Approved login must reach the demo without a second end-user login.
7. If an authorization or admission check fails, restore and verify the previous Cloudflare Access gate first; only then revert the application image. Preserve account-scoped and legacy browser data. Do not remove Tunnel, TLS, host loopback binding or unrelated administrator policies.

## Stop condition

The application code and local artifacts are verified. The public journey remains incomplete because production is not configured or deployed. Executing the production steps above requires Gaffer's explicit authorization for production identity/DNS changes, publication/deployment and the conditional end-user Access cutover. The real tester's approval and legal acceptance remain human decisions.
