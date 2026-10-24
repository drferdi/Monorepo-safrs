# End-to-end integration: server-side persistence for the authenticated beta

Status: PROPOSAL — awaiting Gaffer's go. Nothing in this document has been built, installed or provisioned.
Written 2026-10-25 after the read-only audit recorded in the same session. Risk tier of this document: R0.

## 0. Why this plan is smaller than the request that asked for it

The request that produced this document assumed "no auth, no DB, no registration". That assumption is **stale**.
Four of the six components it asked about already exist and are merged into `main`. The audit evidence is in
section 1; the integration matrix is in section 2.

Only **one** component is genuinely missing: a server-side database, and with it any persistence that survives
a browser. Everything below is therefore scoped to that gap, not to a from-scratch integration. The request's
build order (Clerk skeleton -> protected routes -> DB -> sync -> site handoff) has its first two steps and its
fifth step already done.

---

## 1. Audit findings (verified against code on 2026-10-25, not against documentation)

### 1.1 Auth — EXISTS

- Installed: `@clerk/nextjs` 7.9.20 and `@clerk/backend` 3.26.2 (`package.json` dependencies), present in
  `node_modules/@clerk/{backend,nextjs,react,shared}`.
- Configured: `.env.example` asks for `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` and
  `SENTRAPEDIA_AUTH_MODE` (names only; no values read or printed).
- Declared: `capsule.json` `externalServices` and `requiredEnvironment` name Clerk and both key names
  (commit `5305816b`, R2); `project.contract.json` declares it a required external service.
- Enforced in code:
  - `src/proxy.ts` — Next.js 16 renamed `middleware.ts` to `proxy.ts`; this file calls `clerkMiddleware`
    with `authorizedParties: [origin]`, exempts only `GET /api/aadi` (the public readiness probe), and
    matches all other paths plus `/api/(.*)`.
  - `src/lib/auth/config.ts` — `resolveAuthConfig` returns `clerk` | `local` | `unavailable`. It validates
    the publishable/secret key shapes, decodes the Frontend API hostname out of the publishable key, and
    refuses mismatched `test`/`live` pairs. In `NODE_ENV=production` it requires a `live` key **and** a
    configured `SENTRAPEDIA_PUBLIC_ORIGIN`, otherwise it degrades to `unavailable`.
  - `src/lib/auth/policy.ts` — `assessBetaUser` requires a verified primary email, refuses a disabled
    account, and requires a current consent record (`betaPolicyVersion = "sentrapedia-beta-v1"`,
    `syntheticOnly: true`).
  - `src/lib/auth/server.ts` — reads the session and user through the Clerk backend SDK behind
    `server-only`; neither secrets nor whole Clerk user records cross that boundary.
  - `src/lib/auth/access.ts` — `boundedIdentity` caps every identity call at 5000 ms; `accessFailure`
    maps each state to an Indonesian message (`AUTH_REQUIRED` 401, `CONSENT_REQUIRED` 403,
    `ACCESS_DENIED` 403, `AUTH_UNAVAILABLE` 503).
- Tested: `tests/beta-auth.test.ts`, `beta-auth-routes.test.ts`, `beta-auth-proxy.test.ts`,
  `beta-auth-pages.test.tsx`, `user-access-flow.test.tsx`, `ui/auth-design.test.tsx`, `ui/beta-auth.test.tsx`.
- Merged: `56abccd6` (merge of `codex/sentrapedia-clerk-access-31bf87f9`), published as PR #30 and merged in
  the product repository as `e8cb4037`. Decision: `.agents/DECISIONS.md` 2026-10-24.

### 1.2 Registration and login UI — EXISTS

- `src/app/sign-in/[[...sign-in]]/page.tsx` and `src/app/sign-up/[[...sign-up]]/page.tsx` — Clerk catch-all
  routes.
- `src/app/apply/page.tsx` — now a `redirect("/sign-up")` only; the former application form is gone.
- `src/app/onboarding/page.tsx` plus `src/app/api/onboarding/consent/route.ts` — the versioned beta consent
  step, origin-checked by `trustedConsentOrigin` and bounded to 1024 bytes.
- `src/components/auth/{auth-frame,consent-form,session-boundary}.tsx` — the UI shell, the consent form and
  the session boundary that locks or unmounts workspace state on session loss or account switch.
- Flow per `.agents/HANDOFF.md` (2026-10-24, local WIP superseding the earlier design): Gaffer replaced
  Waitlist/approval/invitation/extra-consent for ordinary users with **Daftar -> Login -> Akses**; approval
  and invitations are admin scope. Legacy consent API and operator operations are retained for compatibility.

### 1.3 Database — MISSING (the only real gap)

- No database package anywhere: `supabase`, `prisma`, `drizzle`, `postgres`, `neon`, `pg`, `mysql`, `mongo`,
  `sqlite`, `kysely`, `redis` match **nothing** in `package.json` or `apps/site/package.json`.
- No database reference in code: the same grep over `src`, `scripts`, `aadi` and `apps/site/api` returns
  nothing, `DATABASE_URL` included.
- Persistence is browser-only, and it has already moved on from what the documentation says:
  - `src/lib/workspace-storage.ts` builds the key `sentrapedia-workspace-v2:<userId>` and refuses any
    principal that is not `/^user_[A-Za-z0-9]{1,120}$/` or the literal `local-development`.
  - **"v2" here is a key namespace per principal, not a new data format.** The serialized format is still
    `version: 1` (`src/lib/workspace.ts:12,18`). The legacy constant `storageKey = "sentrapedia-workspace-v1"`
    at `src/lib/workspace.ts:15` survives only as the default argument of `restoreFromStorage`
    (`src/lib/workspace-session.ts:22`); the live caller `src/components/workspace.tsx:46` passes
    `workspaceStorageKeys(principalId)` instead. This matches the 2026-10-24 decision ("browser persistence is
    namespaced by opaque principal … serialized workspace schema stay unchanged") and contradicts
    `.agents/AGENT-CONTEXT.md` §8 ("No v2 format exists yet"), which is drift, not a bug.
  - Consequence: the blob is per-browser. A doctor who signs in on a second device, clears site data, or uses
    a private window starts empty. Nothing is recoverable by the operator. The only transport is the manual
    JSON export/import in the Workspace dialog.
- Account-level state does have a server home already: Clerk `privateMetadata`
  (`sentrapediaBetaConsent`, `sentrapediaBetaAccess`), written through `updateUserMetadata` in
  `src/lib/auth/server.ts`. This is worth stating plainly, because it narrows what a database is actually for.

### 1.4 Site <-> app link — EXISTS (link only; nothing shared)

- `apps/site/source/index.html` links to the app at four places: lines 100 and 132 to
  `https://beta.sentrapedia.com/sign-in` ("Masuk"), lines 105 and 133 to
  `https://beta.sentrapedia.com/sign-up` ("Daftar", carrying `data-request-access`).
- **The string "Gabung Waitlist" no longer exists** in `apps/site/source`, `apps/site/assets` or `src`. The
  request's premise that the site CTA is a Resend-backed waitlist is out of date: the primary CTA is now
  registration in the app. The Resend path still exists, but it is the **contact form**
  (`apps/site/source/index.html:908`, `apps/site/api/contact.mjs` -> `apps/site/scripts/contact.mjs`), which
  reads `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_PUBLIC_ORIGIN` and `CONTACT_RECIPIENT`, and refuses
  requests without its settings. Submissions go to that recipient mailbox, never to a database.
- Shared code: **none.** `apps/site/` is a hand-built static site (Bootstrap, GSAP, no framework) with its own
  `package.json`, built by `apps/site/scripts/transform.mjs`.
- Shared env: **none.** The site needs the four `RESEND_*`/`CONTACT_*` names; the app needs
  `GEMINI_API_KEY`, the two Clerk names and `SENTRAPEDIA_*`. No name appears in both.
- Shared deployment: **none.** The site is the Vercel project `sentrapedia` (team Sentraverse, not Git-linked,
  deployed by CLI). The app is the Docker image behind Cloudflare Tunnel and Access on the Biznet Gio host
  (`deploy/beta/{README.md,setup-server.sh,update.sh}`). Two surfaces, two pipelines, joined only by a URL.

### 1.5 Engine — confirmed, with two corrections to the request's wording

- **`src/lib/mira/gateway.ts` does not exist.** MIRA was renamed AADI on 2026-10-20 by Gaffer's instruction
  (`.agents/DECISIONS.md`), for everything including code. The gateway is `src/lib/aadi/gateway.ts`; the env
  names are `AADI_*`, and the data policy is `AADI_DATA_POLICY` (`aadi/common/data_policy.py:1`), not
  `MIRA_DATA_POLICY`.
- Engine loopback: TRUE. `scripts/run-system.mjs:110` starts uvicorn with `--host 127.0.0.1` on a port chosen
  by binding `:0` on `127.0.0.1` (line 88), with a per-run 32-byte bearer token.
- Production refused: TRUE. `aadi/service/settings.py:133-135` raises `StartupRefused`
  ("`AADI_SERVICE_ENV=production` is not supported: no production token verifier.").
- **"Single user, loopback-only" is no longer true of the Next layer**, and this matters for any sync design:
  - `src/lib/aadi/gateway.ts:64-78` accepts one configured `SENTRAPEDIA_PUBLIC_ORIGIN` (https, origin-only) in
    addition to loopback, because the Cloudflare tunnel rewrites `Host`.
  - `scripts/run-system.mjs:115` honours `SENTRAPEDIA_HOST`, which may be `0.0.0.0`.
  - `AADI_MAX_CONCURRENT` (1-8) allows concurrent analyses, each still reserving its 0.10 USD step cap.
  - Browser state is already per-principal (§1.3), so the app is multi-tenant in storage terms.
  - The *engine process* remains single-user and loopback-bound. The *web app* in front of it is not.

### 1.6 Gate — run in this session, exit codes read directly from each command

| Command | Exit code | Counts from this run |
| --- | --- | --- |
| `npm run typecheck` | **0** | no errors |
| `npm run lint` | **0** | 0 errors in authored code |
| `npm test` | **0** | Vitest **525 passed / 525** over **46** files; site `node --test` **53 pass** |
| `npm run build` | **0** | Next standalone + bundled engine + site build |
| `npm run deploy:dry-run` | **0** | self-contained build check passed |

The request named `npm test`, so that is what ran. `npm test` is **not** `test:all`: it excludes
`npm run test:system` and `npm run test:aadi`, which were not run in this session and whose counts are
therefore not claimed here. Exit codes were captured from each command directly, never through a pipe, after
the 2026-10-25 handoff recorded a first run whose `$?` came from `tail` instead.

---

## 2. Integration matrix

Rows are the component that initiates; columns are the component it reaches.

| | Marketing site | Clinical app | Server DB | Registration | Login (Clerk) | AADI engine |
| --- | --- | --- | --- | --- | --- | --- |
| **Marketing site** (`apps/site`) | — | **EXISTS** (link only: `index.html:100,105,132,133` -> `beta.sentrapedia.com/sign-in\|sign-up`; no shared code, env or deployment) | **MISSING** (contact form posts to Resend -> `CONTACT_RECIPIENT`, no store) | **EXISTS** ("Daftar" -> `/sign-up`, `data-request-access`) | **EXISTS** ("Masuk" -> `/sign-in`) | **MISSING** (and correctly so) |
| **Clinical app** (capsule root) | **MISSING** (no link back; acceptable) | — | **MISSING** (no DB package, no `DATABASE_URL`, no client) | **EXISTS** (`src/app/sign-up`, `/apply` -> `/sign-up`) | **EXISTS** (`src/proxy.ts` `clerkMiddleware`, `src/lib/auth/*`) | **EXISTS** (`src/lib/aadi/gateway.ts` -> `POST /api/aadi` -> loopback engine) |
| **Server DB** | **MISSING** | **MISSING** | — | **MISSING** | **MISSING** | **MISSING** |
| **Registration** | n/a | **EXISTS** (consent -> workspace) | **MISSING** (profile rows have nowhere to live) | — | **EXISTS** (Clerk owns both) | n/a |
| **Login (Clerk)** | n/a | **EXISTS** (session gates pages and `POST /api/aadi`) | **PARTIAL** (`privateMetadata` holds consent + access flags — a key-value store, not a database) | **EXISTS** | — | **EXISTS** (guarded POST; readiness GET stays public) |
| **AADI engine** | n/a | **EXISTS** (6-section answer + TheOracle refs) | **MISSING** (no run/audit rows server-side; ledger is `.runtime/` JSONL, pruned at 14 days) | n/a | n/a | — |

Read plainly: **the auth column and the app column are done. The database row is empty.** The one PARTIAL cell
is Clerk `privateMetadata`, which already carries account-level state and reduces how much a database must do.

---

## 3. Blockers for end-to-end integration, ranked by risk

| # | Blocker | Risk | Why it ranks here |
| --- | --- | --- | --- |
| B1 | **No server-side persistence of clinical work.** A doctor's notes exist only in one browser profile. Clearing site data, a second device, or a private window loses everything; the operator cannot restore it. | **Highest** | This is the gap the whole plan exists to close, and it is the one a real beta tester will hit first. It is a data-loss risk, not a feature gap. |
| B2 | **D1 constrains what may be stored, and the stored blob does not currently respect that boundary.** D1 (2026-10-21): "the BETA accepts real clinical content without patient identity; identified records stay out of scope." But `Workspace.patients[]` holds a `name` field, and the seeded demo patient is literally named. Any naive sync would carry doctor-typed names to a server. | **High** | Getting this wrong is a privacy incident, not a bug. Sync cannot be designed before the boundary is decided (open question Q2). |
| B3 | **No production auth exists for the engine**, and none is planned here: the engine refuses `AADI_SERVICE_ENV=production` by design. Any sync service must sit in the Next layer, never behind the engine. | High | Mistaking "the app is authenticated" for "the engine is authenticated" would weaken the §9 safety boundary. |
| B4 | **Capsule sovereignty.** `capsule.json` `rootDependencies: []`. A database client must be a capsule-local npm dependency with its env names declared in **both** `project.contract.json` `externalServices` and `capsule.json` `requiredEnvironment`. The Clerk merge needed commit `5305816b` precisely because that second declaration had been skipped. | Medium | Known failure mode, already paid for once. Cheap to avoid, embarrassing to repeat. |
| B5 | **The Docker beta image is single-user with no login at the image level** and is published only as `-p 127.0.0.1:3000:3000` behind Cloudflare Access. Adding a database means a new secret in the server's runtime env (alongside `/etc/sentrapedia/clerk.env` and `index.env`) and a new rollback step. | Medium | Touches deploy and the edge gate, which the 2026-10-24 decision says must be preserved until an authorized cutover. |
| B6 | **No migration code exists for the stored format.** `docs/plans/active/2026-10-19-workspace-v2-migration.md` is parked by the 2026-10-21 decision, and the format is still `version: 1`. Server sync will want a schema that does not yet have a migration path. | Medium | Parked work the owner deliberately parked; reopening it is his call, not this plan's. |
| B7 | **PII parity would gain a fourth site.** Today three implementations share `tests/fixtures/pii-parity.json`: `src/lib/aadi/contract.ts`, `theoracle-grounding.ts`, `aadi/service/privacy.py`. A sync boundary is a fourth place where identity must be refused, and the rule is fixed: tighten the client, never loosen the engine. | Low-Medium | Mechanical but must be red-first, or parity silently rots. |
| B8 | **One high Dependabot alert** is open on the Sentrapedia default branch, carried in the handoff since 2026-10-25 and still unread. | Low | Not caused by this work, but it is in the same tree any new dependency lands in. |
| B9 | **Documentation drift** would mislead the next agent: `.agents/AGENT-CONTEXT.md` §8 says "No v2 format exists yet", §2 and §9 say the product "has no authentication", and several places still describe MIRA paths. | Low | Costs nothing to fix, and it already cost this session a wrong starting premise. |

---

## 4. Proposal

### 4.1 Auth — nothing to build

Clerk is installed, configured, enforced, tested and merged (§1.1). `@clerk/nextjs` is the SDK the request
asked for; protected routes are enforced in `src/proxy.ts`; the sign-in and sign-up pages exist and are in
Indonesian. **No auth work is proposed.** What remains is not code but acceptance, and it is already tracked
elsewhere: a real tester completing registration on the production instance, two-user isolation proven, and the
Cloudflare Access cutover — all three explicitly held as separate release gates by the 2026-10-24 decision.

The one auth-adjacent item worth a decision is the unmerged branch `docs/sentrapedia-clerk-hold-decision`
(commit `470504dd`), which still records a condition Gaffer has since withdrawn. What to do with it is his
call (Q6).

### 4.2 Site CTA — nothing to build

The site already sends visitors to `/sign-up` as "Daftar" (§1.4). The Resend path is the contact form and is
untouched by this plan. The request's "the waitlist stays Resend-based unless Gaffer decides otherwise" is
moot: there is no waitlist CTA left to keep.

### 4.3 Database — the only build proposed

**Leading candidate: Supabase Postgres.**

| | For | Against |
| --- | --- | --- |
| **Supabase Postgres** | A connector is already configured in this workspace, so provisioning and inspection need no new tooling. Managed Postgres with migrations, row-level security, and a generated TypeScript type file. RLS can be keyed to the Clerk `userId` so a row is unreadable by another principal even if application code is wrong — defence in depth that matches the per-principal storage already shipped. Free tier is sufficient for a 10-20 doctor closed beta. | A second external service after Clerk, each with its own outage surface. Its own auth system is redundant here and must be deliberately bypassed in favour of Clerk, which is a configuration trap. Free-tier projects pause when idle. Data would sit outside Indonesia unless a region is chosen with that in mind (Q5). |
| **Neon Postgres** (named alternative) | Plain Postgres, no bundled auth to bypass, generous branching for migration rehearsal, usually the lighter dependency. | No connector configured here, so provisioning is manual. No RLS story out of the box — isolation would rest entirely on application code, which is exactly what B2 makes risky. |
| **No database yet** (the honest third option) | Clerk `privateMetadata` already stores consent and access flags, so account data has a home today. Deferring costs nothing, adds no service, and keeps `rootDependencies: []` trivially true. It also respects the 2026-10-21 decision that parked storage-format work "until the consult answer is proven and real doctors have used it". | B1 stands: the first tester who clears their browser loses their work, and nothing can bring it back. |

**Recommendation: Supabase, mainly for RLS**, because B2 is the blocker most likely to cause real harm and RLS
is the only option on this list that does not rest isolation entirely on application code. But note honestly
that the 2026-10-21 decision points the other way — it parked exactly this kind of work pending real use — and
that tension is Q1, which is Gaffer's to settle, not this plan's.

**Schema — account data and de-identified sync only.** Per D1, no patient identity field may exist on the
server. The schema below has no column that can hold a name, a NIK, a BPJS number, a phone number, an email
belonging to a patient, an address, or a date of birth.

```
profile
  user_id        text primary key     -- Clerk userId, /^user_[A-Za-z0-9]{1,120}$/
  specialty      text null            -- from Settings.specialty, a closed list
  language       text null            -- from Settings.language, a closed list
  display_name   text null            -- the DOCTOR's own name (Settings.name), never a patient's
  created_at     timestamptz not null default now()
  updated_at     timestamptz not null

workspace_sync
  user_id        text not null references profile(user_id)
  doc_id         text not null        -- the existing local document id
  format_version int  not null        -- 1 today; the pin that lets a reader predate a writer
  body           jsonb not null       -- de-identified document body, identity-scrubbed before it leaves
  updated_at     timestamptz not null
  primary key (user_id, doc_id)

personal_template
  user_id        text not null references profile(user_id)
  template_id    text not null
  body           jsonb not null
  updated_at     timestamptz not null
  primary key (user_id, template_id)
```

RLS on every table: `user_id = <the Clerk subject of the verified JWT>`, with no permissive fallback policy.

**What moves to the server, and what stays in the browser.**

Moves (proposed):
- `Settings.specialty`, `Settings.language`, `Settings.name` (the doctor's own) -> `profile`.
- `PersonalTemplate[]` (`src/lib/workflow.ts`) -> `personal_template`. Doctor-authored, no patient content.
- Document bodies, **only after identity scrubbing**, and only if Q2 answers yes -> `workspace_sync`.

Stays in the browser, unchanged:
- `Workspace.patients[]` — it has a `name` field. **This is the crux of Q2.** D1 forbids identified records on
  the server, so either patient records never sync, or they sync with `name` dropped and the local id as the
  only handle, or the field is removed from the format first (which reopens parked work, B6).
- `activeEncounterId`, UI state, revision history (up to 20 per document), and the unreadable-backup blob.
- The whole blob remains authoritative locally. Sync is additive: a server round trip that fails must leave the
  app exactly as it works today.

**Explicitly out of scope:** engine audit rows, trace storage, analytics, anything that would put case text or
model output into a server table beyond the de-identified document body above.

### 4.4 Impact on existing invariants

| Invariant | Impact | How it is kept |
| --- | --- | --- |
| **Capsule sovereignty** (`rootDependencies: []`) | New npm dependency and two env names. | The client is a capsule-local dependency. Env names are declared in `project.contract.json` `externalServices` **and** `capsule.json` `requiredEnvironment` in the same commit (B4). The Supabase MCP connector is session tooling for the operator, never a build, test or runtime dependency — the same rule `AGENTS.md` already applies to Jev. A lone clone of the product repository must still build with no connector present. |
| **PII parity** (`contract.ts` / `privacy.py` / `theoracle-grounding.ts`, `tests/fixtures/pii-parity.json`) | A fourth boundary gains an identity check. | The scrubber reuses the existing patterns rather than writing new ones, and gains parity rows red-first. Direction unchanged: tighten the client, never loosen the engine. |
| **Loopback-only engine** | **None.** | Sync lives in the Next layer. No engine file, env var or port changes. `AADI_SERVICE_ENV=production` stays refused. The engine never learns that a database exists. |
| **Docker single-user image** | One new runtime secret, one new rollback step. | The key goes in a root-owned `600` file beside `clerk.env` and `index.env`, never baked into the image, never printed. The image still publishes as `-p 127.0.0.1:3000:3000`. With the sync flag off the image behaves exactly as today, so an unauthenticated rollback needs the edge gate restored first — the existing rule, unchanged. |
| **Data policy** (`AADI_DATA_POLICY`, `aadi/common/data_policy.py`) | **None.** | No prompt, no retrieval path and no model call is touched. No paid call is made at any step. |
| **Puskesmas flow** (`docs/plans/active/2026-10-20-puskesmas-flow.md`) | **None, if left parked.** | The 2026-10-21 decision parked it with the storage-format migration; its commits stay on `feat/puskesmas-flow`. This plan does not revive it and does not change the serialized schema. If Q2 is answered by changing the format instead of scrubbing, that parked work is reopened — which is why Q2 is a decision and not an implementation detail. |
| **Clinical logic** (R3) | **None.** | No change to retrieval, the evidence gate, prompts or postchecks. |

### 4.5 Build steps, risk tier per step

Only on Gaffer's "go". Branch `feat/e2e-integration`. One commit per step. The gate
(`typecheck`, `lint`, `test:all`, `build`, `deploy:dry-run`) must be green after each step, with counts from
the session that runs it.

| Step | What | Tier |
| --- | --- | --- |
| S1 | Schema and migrations as SQL files in the capsule, plus RLS policies. No application code. Applied first to a throwaway project or branch, never to anything live. | **R2** |
| S2 | Identity scrubber at the sync boundary, red-first, with new `pii-parity.json` rows. Pure function, no network. | **R2** |
| S3 | Server-only data access module (`src/lib/sync/`), behind `server-only`, reading the Clerk subject from the verified session. Never a client-supplied user id. | **R2** |
| S4 | Profile and template sync, additive and flag-gated. localStorage stays authoritative; every failure path degrades to today's behaviour. | **R2** |
| S5 | Document-body sync, **only if Q2 is answered yes**, with `format_version` written on every row. | **R2** |
| S6 | Smoke tests: signed-out refusal, two-principal isolation, a failed round trip leaving the app usable, and `workspace-backup.json` still importing. | **R1** |
| S7 | Declarations (`project.contract.json`, `capsule.json`), `.env.example` names, `docs/data.md`, `deploy/beta/README.md`, `.agents/HANDOFF.md` and `.agents/DECISIONS.md`. | **R1** |

Rules carried from the request and kept: every new field optional and additive; the existing
`workspace-backup.json` must still import; UI copy in Indonesian; plain CSS tokens only, no Tailwind; no change
to clinical logic or AADI prompts; no paid model calls.

### 4.6 New environment variables (names only)

- `SUPABASE_URL` — project origin, server-side only.
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only. **Never** `NEXT_PUBLIC_*`, never sent to the browser, never
  printed or committed.
- `SENTRAPEDIA_SYNC_MODE` — `off` | `on`, defaulting to **`off`**, so an image without it behaves exactly as
  today.

No value for any of these is read, written or printed by this document.

### 4.7 Tests to add, red first

1. Scrubber: a document carrying a patient name, NIK, BPJS number, phone and email leaves the boundary with
   none of them — asserted against `tests/fixtures/pii-parity.json`, with new rows added there first.
2. Isolation: principal A cannot read principal B's row, asserted against the policy, not only the client.
3. Signed-out and consent-missing requests are refused with the existing codes (`AUTH_REQUIRED`,
   `CONSENT_REQUIRED`) and write nothing.
4. `SENTRAPEDIA_SYNC_MODE=off` performs no network call at all.
5. A failed or timed-out round trip leaves local state untouched and the workspace usable.
6. Every fixture in `tests/fixtures/workspace/` still parses, and `workspace-backup.json` still imports.
7. `format_version` is written on every row, and a reader refuses a version it does not know.

### 4.8 Rollback

1. `SENTRAPEDIA_SYNC_MODE=off` — one env change, no deploy, no data change. The app is then byte-for-byte
   today's behaviour, because localStorage never stopped being authoritative.
2. Revert the branch. Nothing in the serialized local format changed, so no local data is stranded.
3. Drop the schema. No local data lived only on the server, by construction.
4. If rolling back to an image without Clerk: restore the Cloudflare edge gate **first**, per the 2026-10-24
   decision. Unchanged by this plan.

---

## 5. Open decisions for Gaffer

Numbered, short, and deliberately unanswered here.

1. The 2026-10-21 decision parked storage work "until the consult answer is proven and real doctors have used
   it", and no tester has registered yet. Build server sync now, or keep it parked until one has?
2. D1 forbids identified records on the server, but `Workspace.patients[]` has a `name` field. Which: patient
   records never sync; or they sync with `name` dropped; or the field leaves the format first?
3. Supabase (RLS, connector already set up) or Neon (plainer, no bundled auth to bypass)?
4. Is this plan's reduced scope right — database and sync only, since auth, registration and the site link are
   already merged?
5. Which region should the database sit in, given Indonesian clinical content and KMK 951/2026 still open?
6. The branch `docs/sentrapedia-clerk-hold-decision` (`470504dd`) still records a condition you have
   withdrawn. Merge it, delete it, or leave it?
7. Should document bodies sync at all (S5), or only profile and templates (S4)?

---

## 6. Noticed, not touched

- `.agents/AGENT-CONTEXT.md` drift: §8 "No v2 format exists yet" (a v2 **key namespace** ships, format still
  `version: 1`); §2 and §9 "It has no authentication" (Clerk is merged); §18 still lists two open questions
  that predate the Clerk work. §17 already carries the known-drift list this belongs in.
- `.agents/CONTEXT.md` was last rewritten 2026-10-17 and describes neither Clerk nor per-principal storage.
- `src/lib/workspace.ts:15` `storageKey = "sentrapedia-workspace-v1"` and `:85` `unreadableKey` are now reached
  only as default arguments of `restoreFromStorage`. Live code passes principal-scoped keys. Pre-existing; left
  intact per the no-drive-by-changes rule.
- One high Dependabot alert is open on the Sentrapedia default branch (carried in the handoff, still unread).
- `npm run test:system` and `npm run test:aadi` were not run in this session, so no count is claimed for them.
- The 2026-10-24 handoff records two consecutive local standalone smokes returning HTTP 500 (`EPROTO`, wrong
  TLS record, Clerk development proxy requesting `https://localhost:3423/sign-up`). That session halted under
  the circuit breaker. It is neither reproduced nor cleared here: the HTTP smoke is not part of `test:all`, and
  running it needs Clerk credentials this session does not have and must not configure.
