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
- Published a capsule-only snapshot to the existing **private** `drferdi/Sentrapedia` repository: branch `codex/sentrapedia-clerk-public-release`, commit `3eb3dc21a99cfbbc4d177fe3031d4082183099ab`, parent `a056f65b`. Its tree exactly equals capsule `60c76d77`, tree `d92e129ad17fe4fd96bf959af2c53fbf11a757cc`; 113 LFS objects (93,985,409 bytes) passed SHA-256 validation. Only capsule tree/blob objects were transferred, with no monorepo commit history or environment files.
- Created and attached [draft PR 26](https://github.com/drferdi/Sentrapedia/pull/26), without merge. Existing Linux [CI run 40069356582](https://github.com/drferdi/Sentrapedia/actions/runs/40069356582) passed both `check` and `docker` for that original release snapshot. That run built but did not publish an image; it does not prove the later publication controls below have executed on GitHub.
- Production dependency audit (`npm audit --omit=dev --audit-level=high --json`) exited 0 with zero vulnerabilities.

## Candidate delivery and security review

The additional capsule-local CI path prepares an immutable Docker image artifact only for the approved, same-repository private release PR. It does not push candidate images to GHCR, change `main`, delete rollback images or require a new registry credential on the server. Private artifact delivery and strict SSH transfer avoid adding persistent deployment credentials. The artifact has one-day retention; an expired artifact requires another authorized build/download.

The publishable key alone is supplied from masked Actions secret `SENTRAPEDIA_CLERK_PUBLISHABLE_KEY`, so its literal value does not appear in workflow logs. The Clerk server secret stays solely in the protected runtime file. Internal GitHub sign-in is still required to configure this new Actions setting; neither existing environment contents nor secret values should be exposed in chat or screenshots.

One fresh security review of this new CI boundary found two Important issues. Both were fixed in one pass:

1. Verification and Docker checkout now select the same immutable PR head revision; Docker still depends on the quality job.
2. Publication decisions execute the real Node policy in `scripts/release-publication.mjs`; case-sensitive branch/base checks avoid GitHub expression equality's case-folding behavior.

The three regressions (branch case, base case, mismatched checked revision) failed when the prior behaviors were restored, then passed after the fixes. Candidate-artifact delivery also failed before its implementation. Final event/consumer/subprocess checks: 13/13 passed. The test matrix denies forks, public mirrors, unrelated refs/bases and `pull_request_target`; it checks failed-quality denial, immutable candidate tags, no candidate registry login/push/retention, and unchanged main publication.

Fresh full suite after these changes: 520 Vitest, 53 site, 60 system tests; Python 237 passed/1 skipped. Raw lint exits 0 with the same three inherited warnings. No second review was dispatched and no confirmed minors were deferred. The new candidate publication path remains pending real CI execution and runtime acceptance.

The review did not establish live GHCR visibility/immutability, actual workflow execution, runtime credentials, old auth, clinical validity or email acceptance. Candidate transport uses the private artifact instead of making a new registry write; future main-registry settings remain outside this candidate. Existing auth is unchanged and retains its earlier review. Runtime key-family/permissions checks are recorded above. Clinical regression tests are not clinical validation; Gaffer explicitly chose the complete baseline. Actual tester invitation, consent, suspension and isolation remain mandatory release checks.

## Still required

Configure the masked public build setting after Gaffer signs in to GitHub internally, publish the reviewed CI delta, retrieve and verify the private image artifact, then stage/runtime-test it before switching the existing container. The current live app still redirects public `/apply` to Cloudflare Access; local `/sign-in` returns 200 with Clerk. Prove the actual approved-tester invitation/registration/consent/login flow and denial before admission. Publish the site only within the approved boundaries. Keep the existing end-user Access gate until those checks pass; preserve Tunnel, TLS, host loopback and administrator protection. Restore/verify Access before reverting an unauthenticated image.
