# Clerk access integration readiness (read-only assessment)

Written 2026-10-24 Asia/Jakarta on `feat/puskesmas-flow` at `dc809e91`. Read-only: no merge, no cherry-pick, no
dependency install, no Clerk or Cloudflare call, no push. Risk of this document: R0. The integration it describes is
R2 (authentication, dependencies, capsule manifests, CI) and R3 for the production access cutover.

Gaffer's request was to learn the capsule and prepare it for a front end website, login access and Clerk
registration/login. All three already exist as code: they were built on a separate branch by another agent. This is
therefore a **merge-readiness** assessment, not a build plan. Nothing here was re-implemented.

## 1. What already exists, and where

| Line | Head | Contents |
| --- | --- | --- |
| `feat/puskesmas-flow` (this worktree, `D:\DEV\monorepo`) | `dc809e91` | Knowledge SSOT v0.6, dose audit, evidence gate. No authentication at all. |
| `codex/sentrapedia-clerk-access-31bf87f9` (worktree `C:\Users\drfer\.codex\worktrees\sentrapedia-clerk-access-31bf87f9\monorepo`) | `f30274f1` | Clerk sign-up/sign-in, server access guards, principal-scoped storage, site "Daftar" links, CI release transport. |
| `codex/sentrapedia-site-refactor` | `c773e692` | The site refactor the Clerk branch was built on. **Not an ancestor** of `f30274f1`; the Clerk branch carries its own copy from the shared base `5044c7eb`. |
| `feat/sentrapedia-legal-pages` | `63a7a313` | Site legal pages, which Clerk's required legal acceptance links to. Not assessed here. |

Every `src/**`, `tests/**`, `docs/specs/**` and `docs/verification/**` path quoted below exists on
`codex/sentrapedia-clerk-access-31bf87f9` only, until that branch is merged. Read them with
`git show codex/sentrapedia-clerk-access-31bf87f9:./<path>` from the capsule root.

Both active lines diverge from the same base `511a66d5`: this branch is 29 commits ahead, the Clerk branch 28.

Pre-Clerk state of this branch, for the record: `src/app/page.tsx` mounts `WorkspaceApp` with no session concept,
`src/app/api/aadi/route.ts` is reachable by anyone who can reach the listener, `src/lib/workspace.ts` writes one
unscoped browser key `sentrapedia-workspace-v1`, and the account dialog's own copy says "authentication … belum
terhubung". Access control today is entirely Cloudflare Access in front of the tunnel at `beta.sentrapedia.com`.

## 2. What the Clerk branch adds (94 files, +3,758 / -562 since the base)

- Routes: `/sign-up/[[...sign-up]]`, `/sign-in/[[...sign-in]]`, `/apply` (compat redirect to `/sign-up`),
  `/onboarding` (compat redirect to `/`), `POST /api/onboarding/consent` (retained for compatibility).
- `src/proxy.ts` initialises `clerkMiddleware` with `authorizedParties` from the configured origin and lets
  `GET /api/aadi` through unauthenticated, because the launcher and the deploy probe call readiness without a browser.
- `src/lib/auth/config.ts` validates both keys, requires the key family (`test`/`live`) to match, decodes the
  publishable key's Frontend API host, and requires a live key plus an exact HTTPS origin in production. Anything
  missing or malformed resolves to `unavailable`, which denies access; it never falls back to anonymous.
  `SENTRAPEDIA_AUTH_MODE=local` is an explicit development/test escape hatch, allowed only on loopback with no public
  origin.
- `src/lib/auth/policy.ts` and `access.ts` enforce verified email, the backend-only `sentrapediaBetaAccess.disabled`
  suspension flag and (optionally) the versioned beta consent record, reading Clerk's private metadata server-side.
- `src/app/page.tsx` is now a server component: signed-out redirects to `/sign-in`, anything other than `allowed`
  renders an access notice, and the workspace mounts keyed per principal.
- Browser storage becomes principal-scoped (`src/lib/workspace-storage.ts`, `workspace-session.ts`,
  `workspace-hooks.ts`): the legacy unscoped key and the unreadable backup are left untouched and are never adopted by
  the first account that signs in.
- `scripts/beta-access.mjs` is a capsule-owned operator command that sets/clears the suspension flag and revokes
  sessions for an explicitly supplied Clerk user ID.
- Manifests: `@clerk/nextjs` 7.9.20, `@clerk/backend` 3.26.2 and `server-only` 0.0.1 pinned in `package.json` with the
  lockfile updated; `project.contract.json` declares Clerk as a required external service and moves the extraction
  smoke from `/` to `/api/aadi`, since `/` is no longer 200 without a session; `.env.example` documents the keys and
  the local mode.
- Tests: `tests/beta-auth*.ts(x)`, `tests/user-access-flow.test.tsx`, `tests/workspace-storage.test.ts`,
  `tests/beta-access-operator.node-test.mjs`, `tests/release-workflow.node-test.mjs`, plus six existing UI tests
  updated. `test:system` gains the two new Node suites.
- Site: `apps/site/source/index.html` desktop and mobile navigation say **Daftar** and point at `/sign-up`, with
  `apps/site/tests/login-access.test.mjs` asserting it. This arrives together with the whole site refactor
  (`scripts/browser/*`, `render-homepage.mjs`, `transform.mjs` rewrite): 32 site files, +1,147 / -481 against this
  branch.

## 3. The flow that is implemented is Daftar → Login → Akses

Gaffer superseded the original Waitlist design on 2026-10-24: ordinary users register themselves, approval and
invitations are admin scope, and registration grants no admin rights. That supersession is committed, not only
planned, in `a0735948`; `/sign-up` renders Clerk's ordinary `SignUp` with `forceRedirectUrl="/"`, and the earlier
waitlist/extra-consent path survives only as redirects and dormant compatibility code. The approved design document
`docs/specs/2026-10-23-clerk-beta-access-design.md` still describes the Waitlist flow and is therefore partly
superseded by `docs/verification/user-self-service-access-2026-10-24.md`.

Consequence worth stating plainly: the production instance is still configured as Waitlist, and the pending
invitation `inv_3L8LSBY0...` belongs to the superseded flow. Accepting it is no longer the acceptance test for the
flow Gaffer asked for; applying `auth_access_control.sign_up_mode: public` to the production instance is.

## 4. Merge conflict evidence

`git merge-tree --write-tree --name-only HEAD codex/sentrapedia-clerk-access-31bf87f9` (computed, nothing mutated;
exit 1) reports exactly two conflicted paths:

```text
projects/healthcare/sentrapedia/.agents/HANDOFF.archive.md
projects/healthcare/sentrapedia/.agents/HANDOFF.md
```

The set of files touched by both lines since the base is the same two files. There is **no code, test, manifest, SSOT
or index overlap**: the Clerk branch never touches `theoracle/**`, `oracle/**`, `src/lib/theoracle*`,
`scripts/knowledge-ssot.mjs` or the evidence gate, so this branch's newer knowledge work merges intact, and the 52 MB
LFS object `theoracle/index/vectors.f32` is not contested.

Resolution rule per path:

| Path | Rule |
| --- | --- |
| `.agents/HANDOFF.md`, `.agents/HANDOFF.archive.md` | Keep both sides' entries, newest first, then apply the retention rule. Never drop the Clerk branch's Clerk entry. |
| Everything else | Auto-merge is correct; review the result, do not hand-edit. |

A clean textual merge is not a clean semantic merge. The real post-merge risks are listed in section 5, and the
capsule gate (`typecheck`, `lint`, `test:all`, `build`, `deploy:dry-run`) is what proves them, since the Clerk branch's
own green gate was run without this branch's SSOT and UI changes, and this branch's gate was run without the auth
guards.

## 5. Gaps and risks found in the Clerk branch, from reading it

1. **`capsule.json` was not updated.** `project.contract.json` declares Clerk, but `capsule.json` still lists only
   `GEMINI_API_KEY` in `requiredEnvironment`, names no Clerk service in `externalServices`, and its
   `sensitiveSurfaces` do not mention identity data or email delivery. Both files are capsule manifests; for an R2
   boundary change they must agree. This is the one concrete defect this assessment found.
2. **Local development stops working silently after the merge.** This worktree's `.env.local` holds
   `GEMINI_API_KEY`, `AADI_*` and `OPENROUTER_API_KEY`, and no Clerk keys. With `SENTRAPEDIA_AUTH_MODE` unset the
   default is `clerk`, so `resolveAuthConfig` returns `unavailable` and the workspace denies access by design. Before
   or with the merge, this worktree's `.env.local` needs either `SENTRAPEDIA_AUTH_MODE=local` (loopback development
   only) or the development Clerk keys. This is the single most practical preparation step.
3. **Six UI tests were rewritten on the Clerk branch** to mount the workspace behind the auth boundary, while this
   branch changed workspace UI and the evidence gate. They auto-merge, but they are the most likely place for a
   post-merge test failure.
4. **The site refactor rides along.** Merging the Clerk branch brings the full `apps/site` refactor, not just the
   "Daftar" link. If Gaffer wants the login link without the refactor, that has to be a separate, smaller change; the
   refactor cannot be stripped out of this merge cheaply.
5. **Uncommitted state in the Codex worktree** is `.agents/HANDOFF.md` plus ~30 modified PNG files under
   `docs/verification/` (inherited LFS/binary noise). None of it is needed for the merge, and none of it should be
   swept into a commit.
6. **The design document and the implemented flow disagree** (section 3). Whichever way Gaffer goes, one of the two
   should be marked superseded so the next maintainer does not read the Waitlist tables as current.

## 6. The blocker in the handoff is already resolved

The Clerk branch's HANDOFF entry says the standalone smoke was halted under the circuit breaker after two HTTP 500s
with `write EPROTO … wrong version number` while proxying `https://localhost:3423/sign-up`. The newest committed
evidence (`docs/verification/user-self-service-access-2026-10-24.md`, "Resumed production preparation") records the
cause and the fix: the standalone listener was bound to `127.0.0.1` while the framework/Clerk rewrite targeted
`localhost`. Binding the preview to `localhost` resolved it with no application or SDK change, and six built HTTP
checks then passed — `/sign-up` and `/sign-in` 200, `/apply` → `/sign-up`, `/onboarding` → `/`, anonymous `/` →
`/sign-in`, anonymous `POST /api/aadi` → 401 `AUTH_REQUIRED`. The earlier "development key embedded at build time"
hypothesis was explicitly withdrawn there. So the halt is stale: there is nothing to retry and no circuit breaker to
respect on this point.

What is genuinely still open is external, not code: production `sign_up_mode: public` has been dry-run validated but
not applied; the private release artifact must be downloaded in parts, reassembled, hash-verified and loaded; a real
user's registration/login/workspace journey has never been proven; and the Cloudflare Access end-user gate is still in
front of everything, which is why no external person can reach `/sign-up` yet. Browser automation was disabled in Work
settings for the Codex session that did this work, which is why its authenticated browser E2E was never run; that
restriction was not re-checked here.

## 7. Suggested sequence, each step needing Gaffer's word where marked

1. Prepare this worktree: add `SENTRAPEDIA_AUTH_MODE=local` (or the development Clerk keys) to `.env.local`. R1,
   untracked file, reversible.
2. **Gaffer approves the merge** of `codex/sentrapedia-clerk-access-31bf87f9` into `feat/puskesmas-flow`, resolving
   the two handoff documents by keeping both. R2.
3. `npm ci` for the three new pinned dependencies, then the full capsule gate: `typecheck`, `lint`, `test:all`,
   `build`, `site:verify`, `site:docs`, `deploy:dry-run`. Report counts against both lines' baselines.
4. Close gap 1: `capsule.json` gains the Clerk keys, service and sensitive surface. R2, one small commit.
5. Mark the superseded half of the design document, and fold the Clerk entry into this branch's handoff.
6. Only then, and separately authorised: apply production `sign_up_mode: public`, stage the image, prove one real
   registration and login, and decide the Cloudflare Access cutover. R3 throughout, edge gate removed last and
   restored first on any rollback.

Publication stays a `git subtree split` to the dedicated Sentrapedia repository, descending from `414afa5d`; the beta
runbook's `update.sh` must not be used unchanged, because it pulls `main` and omits the Clerk environment file.

## 8. The decision for Gaffer

Merge the Clerk line into `feat/puskesmas-flow` now, while the conflict surface is two documentation files and the
code surface is empty — or hold the merge until the production instance is switched to public sign-up and one real
user has registered on it. Merging first means this branch carries authentication while the external cutover is still
pending; holding means both lines keep diverging, and the next SSOT or UI change may create the code overlap that does
not exist today.
