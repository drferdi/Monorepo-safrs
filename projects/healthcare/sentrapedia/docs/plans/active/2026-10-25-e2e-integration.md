# End-to-end integration: server-side persistence for the authenticated beta

Status: **APPROVED 2026-10-25** and in progress. Gaffer gave the go, chose Neon, confirmed the scope and
delegated the patient-identity question; §5 records what he answered and the three items still open. Nothing is
installed or provisioned, and no database project exists. Written 2026-10-25 after the read-only audit recorded
in the same session; revised the same day when the decisions landed. Risk tier of this document: R0.

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

**Decided 2026-10-25: Neon Postgres.** Gaffer: "Neon pls". Supabase is declined, and with it the question of
forwarding Clerk session tokens to a database, so that coupling is declined by implication. The comparison that
produced this choice is kept in `.agents/DECISIONS.md`; what follows is the design as decided.

**Correction to this document's own first draft.** It said Neon had "no RLS story out of the box" and
recommended Supabase mainly for row-level security. That was wrong, and the error mattered because it was the
deciding argument. Neon is plain Postgres, so RLS is fully available; what it lacks is a built-in mapping from a
JWT claim to `auth.jwt()`. The equivalent needs no token at the database at all:

```sql
-- inside the same transaction as the query, never outside it
select set_config('app.user_id', $1, true);   -- true = transaction-local
-- policy on every table
using (user_id = current_setting('app.user_id', true))
with check (user_id = current_setting('app.user_id', true))
```

So the database-level guard survives Gaffer's choice. `set_config` is used rather than `SET LOCAL` because `SET`
takes no bind parameter; the principal is validated with the existing `validUserId` regex before it reaches the
database either way. Transaction-local also survives a transaction-mode connection pooler, which a session-level
setting would not.

> **Three conditions make that guard real, and all three belong in the migrations.** Without them "database-level
> isolation" is false again, in a new way:
>
> 1. **`force row level security` as well as `enable`**, on every table. A table's owner bypasses its policies
>    otherwise, and a managed Postgres project's default role owns what it creates.
> 2. **A separate runtime role**: `login nosuperuser nobypassrls`, not the owner of the tables, holding DML
>    grants only. Belt and braces with (1) rather than a choice between them.
> 3. **Both `using` and `with check`** over the missing-ok setting, so an unset principal denies the row rather
>    than exposing the table. A query that escapes the transaction then reads nothing, which is the safe failure.

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

RLS on every table: `auth.jwt()->>'sub' = user_id`, with no permissive fallback policy and no path that queries
these tables with the service-role key at request time.

**What moves to the server, and what stays in the browser.**

Moves (proposed):
- `Settings.specialty`, `Settings.language`, `Settings.name` (the doctor's own) -> `profile`.
- `PersonalTemplate[]` (`src/lib/workflow.ts`) -> `personal_template`. Doctor-authored, no patient content.
- Document bodies, **only after identity scrubbing**, and only if Q2 answers yes -> `workspace_sync`.

Stays in the browser, unchanged:
- `Workspace.patients[]` — **Q2 is resolved: pseudonymisation at the edge.** Gaffer delegated the choice
  ("chose the best practice untuk usaha sejenis"), so it is this session's and is recorded as such. The server
  stores the existing **random** local id as `patient_ref` and never a name; the name stays in the browser.
  `patient_ref` must never become a hash of the name, which a dictionary reverses. This satisfies D1 without
  touching the serialized format, so the parked migration (B6) stays parked. Dropping the column is not
  sufficient on its own, because free text can carry a name — which is why the scrubber (S2) is part of the
  work and not an optional extra.
  **The consequence Gaffer should know before the pilot, not after:** a doctor who signs in on a new device
  recovers every document but **no patient names**, because the map lived only in the lost browser and in the
  manual JSON export. Sync answers "I lost my notes", not "which patient was this". And pseudonymous
  longitudinal records remain personal data under UU PDP 27/2022 even when the key never leaves the edge; the
  server data is de-identified at rest only in that narrow sense.
- `activeEncounterId`, UI state, revision history (up to 20 per document), and the unreadable-backup blob.
- The whole blob remains authoritative locally. Sync is additive: a server round trip that fails must leave the
  app exactly as it works today.

**Explicitly out of scope:** engine audit rows, trace storage, analytics, anything that would put case text or
model output into a server table beyond the de-identified document body above.

### 4.4 Impact on existing invariants

| Invariant | Impact | How it is kept |
| --- | --- | --- |
| **Capsule sovereignty** (`rootDependencies: []`) | New npm dependency and new env names. | The client is a capsule-local dependency. Env names are declared in `project.contract.json` `externalServices` **and** `capsule.json` `requiredEnvironment` in the same commit (B4). A vendor MCP connector, where one is used, is session tooling for the operator, never a build, test or runtime dependency — the same rule `AGENTS.md` already applies to Jev. A lone clone of the product repository must still build with no connector present. |
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
| S1 | **Done** (`db/migrations/0001_account_and_templates.sql`, `tests/sync-schema.test.ts`). Schema as SQL owned by the capsule, as the sovereignty standard requires of migrations: `profile` and `personal_template`, the `nosuperuser nobypassrls` non-owner runtime role with DML grants only, and `enable` plus `force row level security` with both `using` and `with check` over `current_setting('app.user_id', true)` on each table. Scope held to those two tables until Q7 is answered; no `workspace_sync`. No application code, no `package.json` change, no manifest change, no project created, no connection attempted. **What the sentinel proves and does not:** it proves the SQL *contains* all three conditions on every table it creates, and that no column could hold patient identity. It cannot prove the conditions *work*, because that needs a provisioned database (Gaffer's action) and a driver (his approval) — so that proof is the first item of S3, not a stub test here. | **R2** |
| S2 | **Done** (`src/lib/sync/guard.ts`, `tests/sync-guard.test.ts`, `8997f0db`). Built as a **guard, not a redactor** — a document carrying identity is held back whole and never rewritten; see the 2026-10-25 decision for why, and for the fact that a redactor would need this guard to prove itself anyway. **No new `pii-parity.json` rows**, against what this row first said: the detector is `containsIdentity` used verbatim, so there is no pattern change to add rows for, and every row there is asserted by pytest too. The test reads the fixture's 19 cases as inputs instead. Pure function; no network, nothing wired. | **R2** |
| S3 | Server-only data access module (`src/lib/sync/`), behind `server-only`, which opens a transaction, sets the principal with `set_config(..., true)` from the verified Clerk session, and queries inside it. Never a client-supplied user id, never the migration credential. **The driver is an open decision for Gaffer** (`pg` or `@neondatabase/serverless`): the requirement is a path where the transaction-local setting holds for the whole unit of work, to be verified against the driver's own documentation at this step rather than assumed here. A new dependency is Gaffer's to approve. This step also carries the **declarations** — `project.contract.json` `externalServices` and `capsule.json` `requiredEnvironment` gain the env names in the same commit as the dependency, which is the B4 lesson. **And it opens with the proof S1 cannot give:** the two-principal negative test run against a real database, skipping while no connection string is set, exactly as `withIndex` does in `tests/private-data.ts`. | **R2** |
| S4 | Profile and template sync, additive and flag-gated. localStorage stays authoritative; every failure path degrades to today's behaviour. | **R2** |
| S5 | **Schema done** (`db/migrations/0002_workspace_sync.sql`): Gaffer answered Q7 — "Body dokumen ikut sync". `format_version` is on every row with a check constraint pinning it to 1, so a reader can refuse a version it does not know. `0001` was not edited; a new migration is the only way the schema moves. The table exists and the projection that feeds it exists; **writing to it is S4's wiring and still needs the driver decision.** | **R2** |
| S6 | Smoke tests: signed-out refusal, two-principal isolation, a failed round trip leaving the app usable, and `workspace-backup.json` still importing. | **R1** |
| S7 | Declarations (`project.contract.json`, `capsule.json`), `.env.example` names, `docs/data.md`, `deploy/beta/README.md`, `.agents/HANDOFF.md` and `.agents/DECISIONS.md`. | **R1** |

Rules carried from the request and kept: every new field optional and additive; the existing
`workspace-backup.json` must still import; UI copy in Indonesian; plain CSS tokens only, no Tailwind; no change
to clinical logic or AADI prompts; no paid model calls.

### 4.6 New environment variables (names only)

- `SENTRAPEDIA_DATABASE_URL` — the Neon connection string for the **runtime role** (the
  `nosuperuser nobypassrls` non-owner of condition 2). Server-side only, never `NEXT_PUBLIC_*`, never sent to
  the browser, never printed or committed.
- `SENTRAPEDIA_DATABASE_MIGRATION_URL` — the owner connection string, **migrations only, never on a request
  path.** Whether it belongs in the beta server's environment at all, rather than only in the operator's hands,
  is a decision at S1; the safer default is to keep it off the server entirely.
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

## 5. Decisions — answered 2026-10-25, and what is still open

Answered by Gaffer, recorded verbatim in `.agents/DECISIONS.md`:

1. **Build now.** "Sekarang sudah harus di updatge kita segera BETGA dan sudah ada pilot test" — the 2026-10-21
   parking of storage work is lifted for the server side. The format migration stays parked. Noted honestly:
   this session has no evidence of a registered tester and did not check; the pilot is his report.
2. **Delegated, not answered** — "chose the best practice untuk usaha sejenis". The choice made, and owned by
   this session rather than by him, is **pseudonymisation at the edge** (§4.3): `patient_ref` is the existing
   random local id, the name never leaves the browser, and a scrubber guards free text. Its cost to a doctor on
   a new device is stated in §4.3 and should be read before the pilot, not after.
3. **Neon.** "Neon pls". 3b is therefore **declined by implication**: Clerk session tokens are not forwarded to
   the database. RLS survives anyway, through a transaction-local setting — see the correction in §4.3, which
   reverses what this document first claimed about Neon.
4. **Scope confirmed.** "Yes" — database and sync only.
6. **Merge.** "Merge" — done locally as `008f1126`, a real merge commit; the hold it records carries a `Status:`
   line marking it withdrawn, so nothing in the tree reads as a live hold.

Still open, and each one blocks something specific:

5. **Region — not settled.** The question asked which region; the answer was "Yes", which does not pick one.
   Verified since: **Neon has no Jakarta region**, the nearest is AWS Singapore `aws-ap-southeast-1`, and a
   project's region cannot be changed after it is created. So the residency question under KMK 951/2026 is
   vendor-independent, and it blocks **provisioning only** — which is Gaffer's action, never an agent's. It
   does not block the SQL in S1.
7. **Do document bodies sync at all (S5), or only profile and templates (S4)?** This gates the
   `workspace_sync` table and makes the S2 scrubber load-bearing, so S1 is deliberately held to `profile` and
   `personal_template` until it is answered. Worth saying plainly: profile and templates alone do **not** close
   B1, the data-loss blocker that motivated this whole plan.
8. **The driver** (new, raised by the design): `pg` or `@neondatabase/serverless`? The requirement is a path
   where the transaction-local principal holds for the whole unit of work; it will be verified against the
   driver's own documentation at S3 rather than assumed here. A new dependency needs Gaffer's approval.

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
