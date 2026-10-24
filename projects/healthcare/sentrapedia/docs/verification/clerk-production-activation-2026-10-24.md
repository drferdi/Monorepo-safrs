# Clerk production activation — 2026-10-24

## Authority and scope

Gaffer approved production identity/DNS setup, publication/deployment and conditional end-user Cloudflare Access cutover after production checks pass. Gaffer subsequently chose the **latest complete verified version**, acknowledging that the live October 19 baseline uses Next 16.4.0/MIRA whereas the candidate uses Next 16.4.2/AADI plus later workspace/clinical changes. This is explicit release-baseline authority; it is not approval for a Git merge, automatic tester admission, paid plans or legal acceptance on a tester's behalf.

## Identity and DNS changes performed

- Used the existing selected application `app_3L7xAG9MgjfvqgrncG8OoonOmuF`, not a replacement application.
- Created production instance `ins_3L81k0OIGfJnOQEeJeWZpkXpLrU`, domain `beta.sentrapedia.com`, by cloning development configuration through the documented Platform API. Domain ID: `dmn_3L81jxgFZ79bRbW8XRcWDRYGXkQ`.
- Read-back confirms Waitlist, required verified email, email-code sign-in, no password/username, required legal consent and the existing policy URLs/paths. No testers or invitations were created.
- CLI `env pull --instance prod --file <capsule>/.env.clerk-production` exited 0. This new file is Git-ignored and separate from working development keys. No key values or existing environment-file contents were printed.
- Gaffer authenticated Cloudflare in the internal browser. The first account had no zones; the subsequently selected account contained the active `sentrapedia.com` zone and existing healthy beta tunnel. Public NS lookup returned `adel.ns.cloudflare.com` and `jaziel.ns.cloudflare.com`.
- Inspected the existing 12 records, then imported exactly the five Clerk-provided CNAME records below, with proxying disabled. Cloudflare reported success, 17 total records, and all five new records as DNS only with 300-second TTL. Existing Hostinger mail records and the beta Tunnel record were retained.

| Name | CNAME target |
| --- | --- |
| `clerk.beta.sentrapedia.com` | `frontend-api.clerk.services` |
| `accounts.beta.sentrapedia.com` | `accounts.clerk.services` |
| `clkmail.beta.sentrapedia.com` | `mail.3xzip5a3wdye.clerk.services` |
| `clk._domainkey.beta.sentrapedia.com` | `dkim1.3xzip5a3wdye.clerk.services` |
| `clk2._domainkey.beta.sentrapedia.com` | `dkim2.3xzip5a3wdye.clerk.services` |

Clerk verification finished with `deploy status` exit 0, `complete:true`, DNS/SSL/mail all complete and no pending records. This establishes domain readiness; it does not establish actual invitation delivery or an admitted user's login.

## Release preparation checkpoint

- The existing Tunnel is healthy and identifies the intended beta origin. SSH host verification remained strict; the server instructed use of its `gaffer` operator account. Scoped non-interactive sudo can inspect the existing container.
- Existing container image: `sentrapedia:beta`, immutable rollback image ID `sha256:bf509c866e12530b260aa6df8667b692f9650d7046d747a95ad90c42f79ad963`. Existing server Git checkout and dedicated repository main both resolve to `a056f65be17266aaaeeab5334fe046de7078b7cf`; neither was merged or advanced.
- Placed new runtime keys in `/etc/sentrapedia/clerk.env`, root-owned with permission 600, separately from the untouched existing beta environment file. A network-disabled, ephemeral Node container loaded that new file and reported only `publicLive:true`, `secretLive:true`. No credential values were printed.
- Started local Linux Docker and the candidate build `sentrapedia:clerk-60c76d77` from the verified capsule source. The local build stalled and the Docker backend returned HTTP 500; the owned build/client waits were canceled. No global Docker/WSL restart or unrelated container stop was performed. The failed local route is not a successful image build.
- Published a capsule-only snapshot to the existing **private** `drferdi/Sentrapedia` repository: branch `codex/sentrapedia-clerk-public-release`, commit `3eb3dc21a99cfbbc4d177fe3031d4082183099ab`, parent `a056f65b`. Its tree exactly equals capsule `60c76d77`, tree `d92e129ad17fe4fd96bf959af2c53fbf11a757cc`; 113 LFS objects (93,985,409 bytes) passed SHA-256 validation. Only capsule tree/blob objects were transferred, with no monorepo commit history or runtime environment files.
- Created and attached [draft PR 26](https://github.com/drferdi/Sentrapedia/pull/26), without merge. Existing Linux [CI run 40069356582](https://github.com/drferdi/Sentrapedia/actions/runs/40069356582) passed both `check` and `docker` for that original release snapshot. That run built but did not publish an image; it does not prove the later publication controls below have executed on GitHub.
- Production dependency audit (`npm audit --omit=dev --audit-level=high --json`) exited 0 with zero vulnerabilities.

## Candidate delivery and security review

The additional capsule-local CI path prepares an immutable Docker image artifact only for the approved, same-repository private release PR. It does not push candidate images to GHCR, change `main`, delete rollback images or require a new registry credential on the server. Private artifact delivery and strict SSH transfer avoid adding persistent deployment credentials. The artifact has one-day retention; an expired artifact requires another authorized build/download.

The publishable key alone is supplied from masked Actions secret `SENTRAPEDIA_CLERK_PUBLISHABLE_KEY`, so its literal value does not appear in workflow logs. The Clerk server secret stays solely in the protected runtime file. After Gaffer completed internal GitHub sign-in, the repository showed no existing Actions secrets. Added this public build setting and observed GitHub's success confirmation and masked name-only listing. No server secret was transmitted to GitHub.

One fresh security review of this new CI boundary found two Important issues. Both were fixed in one pass:

1. Verification and Docker checkout now select the same immutable PR head revision; Docker still depends on the quality job.
2. Publication decisions execute the real Node policy in `scripts/release-publication.mjs`; case-sensitive branch/base checks avoid GitHub expression equality's case-folding behavior.

The three regressions (branch case, base case, mismatched checked revision) failed when the prior behaviors were restored, then passed after the fixes. Candidate-artifact delivery also failed before its implementation. Final event/consumer/subprocess checks: 13/13 passed. The test matrix denies forks, public mirrors, unrelated refs/bases and `pull_request_target`; it checks failed-quality denial, immutable candidate tags, no candidate registry login/push/retention, and unchanged main publication.

Fresh full suite after these changes: 520 Vitest, 53 site, 60 system tests; Python 237 passed/1 skipped. Raw lint exits 0 with the same three inherited warnings. No second review was dispatched and no confirmed minors were deferred. The new candidate publication path remains pending real CI execution and runtime acceptance.

The review did not establish live GHCR visibility/immutability, actual workflow execution, runtime credentials, old auth, clinical validity or email acceptance. Candidate transport uses the private artifact instead of making a new registry write; future main-registry settings remain outside this candidate. Existing auth is unchanged and retains its earlier review. Runtime key-family/permissions checks are recorded above. Clinical regression tests are not clinical validation; Gaffer explicitly chose the complete baseline. Actual tester invitation, consent, suspension and isolation remain mandatory release checks.

## Still required

The reviewed CI delta was published as capsule-only release commit `9fc41c776b9edc2c7e8bb92b4aa1f7a7b1da85e7`, parent `3eb3dc21`, from canonical source `2bc3c379`. Its tree equals `edcace7645a6567405da390febb1cb190b91f24d`; all 113 LFS objects (93,985,409 bytes) passed SHA-256 verification. Remote `main` remains `a056f65b`. Linux [run 40073353188](https://github.com/drferdi/Sentrapedia/actions/runs/40073353188) passed both quality job `120811358527` and image job `120811960211`.

Candidate artifact `12552925780` has size 1,002,926,756 bytes and GitHub digest `sha256:a4e11ba2df258f47b1d22749b61fbdecb7885c307e07483090bda8a96a8b86e3`. The CI build reports config digest `sha256:b9739daceb40942f9d877dcd9da7a3a57881813a32d23f35c23077e9f5a5845e`; origin verification is recorded below. The connector declined the artifact because its limit is 512 MiB; browser download calls exceeded their execution time limit. The slow local stream was canceled. The approved origin downloaded the artifact directly using its short-lived GitHub redirect, transferred over strict SSH into a private operator directory. The helper verified SHA-256, exact ZIP member, image tag/config, runtime command/user and absence of a server-key environment entry before issuing a receipt. Staging waited for that receipt.

A temporary signed artifact redirect accidentally appeared in browser inventory output during recovery. No Clerk key was printed. The redirect expired at 07:40:30 UTC on October 24, before the subsequent origin clock check; its local transfer file was removed. No signed URL is retained in tracked evidence. The already-started origin response continues; its own transfer file is removed after checksum verification.

## Verified origin activation

The origin download/verification exited 0. Artifact SHA-256 matches GitHub; tar SHA-256 is `edbf344902cae357884d5584d4e737f5513afc7ec185194e20fd8c317c4c6a2e`. Docker loaded the intended candidate tag. The first stage guard incorrectly treated the config digest as the daemon's image ID and stopped before creating a container. Docker 29.1.3 reports manifest digest `sha256:157064676e10db23340cc2722c94693953a6f1d8df513c76c0234760d78af725`. Verified the archive index/manifest/config digest chain, every loaded rootfs diff ID, platform, runtime command and user before using that immutable manifest reference. This matches the [Docker manifest identity documentation](https://github.com/docker/docs/blob/main/_vendor/github.com/moby/moby/api/docs/v1.56.yaml); no image was rebuilt or substituted.

Auth-only staging used 384 MiB on `127.0.0.1:3202` without a second clinical engine. `/apply` and `/sign-in` returned 200 with the matching production Clerk configuration and no server-key content. A first page assertion expected only an HTTP redirect; characterization established the actual Next streaming redirect to `/sign-in`, with no workspace markup. The corrected smoke checks recognize that redirect as well as normal redirect headers. Both `/` and `/onboarding` deny anonymous workspace rendering; POST `/api/aadi` and `/api/onboarding/consent` return 401 `AUTH_REQUIRED`. Final stage smoke exited 0. No authentication source changed to accommodate either operational-check correction.

After verifying public Cloudflare Access was still present, activated the full candidate behind it. Stopped the owned stage, preserved the old container as `sentrapedia-beta-pre-clerk-20261024`, and created new `sentrapedia-beta` from the verified manifest with both protected runtime files. Kept `127.0.0.1:3201`, memory 2,621,440,000 bytes, swap 4,294,967,296 bytes, and restart policy. Container labels identify release `9fc41c776b9edc2c7e8bb92b4aa1f7a7b1da85e7` and source `2bc3c379`. The scoped activation script restores the retained old container on activation failure; it exited 0 without invoking rollback. No image prune, Git merge, source checkout update, firewall or Tunnel change.

Full runtime readiness returned `reachable:true`, `modelReady:true`, `groundingReady:true`, `configured:true`. The same six auth smoke checks passed against the full running container. This proves configured runtime and anonymous denial, not successful registration, actual email delivery or clinical output quality. No inference was invoked. The old image/container is retained for rollback.

Follow-up after warm-up: container still up, restart count 0, OOMKilled false, memory 1.94 GiB of 2.441 GiB, CPU 0.29%; readiness retained all four true fields. These are point-in-time observations, not a load test.

**Operator constraint:** do not run the old `deploy/beta/update.sh` unchanged against this candidate. It pulls `main`, prunes images and supplies only the old environment file. This deployment uses both `/etc/sentrapedia/beta.env` and `/etc/sentrapedia/clerk.env`, with explicit Clerk mode/public origin and the verified manifest reference. Restore/verify Cloudflare Access before any rollback to the retained unauthenticated image.

## Still required after activation

Public `/apply` still reaches the existing Cloudflare gate. Opened its internal-browser verification step and requested a code for the owner-designated mailbox; Gaffer must enter it directly, never in chat. Then prove the actual approved-tester request/pending/invitation/registration/consent/login flow, suspension and isolation. No tester has been created, approved or invited by the agent. Publish the site only within the approved boundaries. Keep the existing end-user Access gate until those checks pass; preserve Tunnel, TLS, host loopback and administrator protection.

## Missing edge OTP investigation

Gaffer reported no code arrived. The connected mail account does not expose the designated mailbox, so no inbox, spam folder or message body was inspected. Read the actual Cloudflare application and its linked policy through the authenticated internal browser: `Sentrapedia BETA`, destination `beta.sentrapedia.com`, policy `Dokter BETA` (`68d966c1-4978-4ab1-94be-c90c686bb4f7`). Its Allow/Include Emails rule contains one existing address; `info@sentrapedia.com` is absent. No other requirement or exclusion was shown. Existing private address is intentionally omitted here.

[Cloudflare's OTP documentation](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/) requires an email to match an Allow policy before a PIN is sent. Therefore the verification-screen message was not proof of delivery, and the observed missing policy match explains the current block before Clerk is reached. No repeated resend was attempted.

Prepared an unsaved draft adding only `info@sentrapedia.com` to the existing email rule, retaining the original address, Allow action and 24-hour session setting. The final `Save policy` action remains pending Gaffer's explicit action-time confirmation because it grants additional edge access. This is separate from Clerk user approval; no Clerk invitation or demo admission is granted by the draft. No persisted Cloudflare policy change or Access cutover has been performed.
