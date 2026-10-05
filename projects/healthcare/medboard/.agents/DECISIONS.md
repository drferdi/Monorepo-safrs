# DECISIONS

Append-only, newest first. Record only durable decisions that concern this capsule. Each entry
has a dated heading, the decision, a short rationale, and its evidence.

## 2026-10-05 — MedBoard host is medboard.sentrahai.com

- Decision (Chief): `crew.puskesmasbalowerti.com` is retired; MedBoard is
  `medboard.sentrahai.com`. Default app base URL (WebAuthn rpID), CORS, Socket.IO origins, CSP
  `connect-src`, `.env.example` and the VPS runbook follow. Other legacy origins
  (`puskesmasbalowerti.com`, the Railway app) were left in the lists; Chief did not ask.
- Evidence: passkey helper test for the default rpID red first; commit `4362337a`.

## 2026-10-05 — Leave Railway for an Indonesian VPS

- Decision (Chief: Railway "terlalu mahal"; chose "VPS Indonesia"): MedBoard is to run on an
  Ubuntu VPS in Indonesia (4 GB RAM) behind Caddy, with local PostgreSQL and a systemd unit;
  runbook `docs/deploy-vps.md`. Railway bills about $10 per GB RAM per month; a 2–4 GB VPS in
  Indonesia costs about Rp 87–160 ribu per month (prices from provider listings, 2026-10).
- Rationale: MedBoard needs an always-on process (Socket.IO, presence timer) and Chromium, so
  serverless does not fit; data stays in Indonesia (PP 71/2019 for public-scope systems is an
  assumption to be confirmed by Chief); the whole `runtime/` folder now persists, not only the
  bridge queue.
- Evidence: no code change needed (`TRUST_PROXY_HEADERS`, `HOST`, `PORT`; CORS already lists the
  crew domain); runbook bash snippets pass `bash -n`; `git archive` package checked (6.8 MB, no
  `node_modules`, only `.env.example`). Not yet run on a real server.

## 2026-10-05 — "Asisten Medis" name; registration survives retries; ACARS lists Assist users

- Decision (Chief: "ganti semua istilah ghost protocol menjadi Asisten Medis"): copy and code
  identifiers say Asisten Medis; stored values (`sourceOrigin: 'ghost-protocols'`,
  `engineVersion 'ghost-iskandar-v1'`) stay, because saved records and the extension send them.
- Decision (Chief chose "Approve atomik, Ditolak boleh daftar ulang, Pendaftaran tak hilang saat
  redeploy"): only a `PENDING_REVIEW` request blocks a new one; approval skips creating a user that
  already exists; the request and profile files go on the Railway volume through
  `CREW_ACCESS_REGISTRATION_REQUESTS_FILE` and `CREW_ACCESS_PROFILE_FILE` (Chief sets them).
- Decision (Chief chose "Heartbeat + ACARS"): one presence store on `globalThis` (server.ts and
  route bundles do not share module state) merges dashboard sockets and Asisten Medis heartbeats
  (`/api/presence`, crew cookie, TTL 90 s, pruned every 30 s). ACARS shows the source. Triage goes
  only to dashboard users, because an Assist-only user has no socket to receive it.
- Evidence: `crew-access` suite (registration 3, presence 9, route 4, client 3) red first; Browser
  pane demo with synthetic users. Commits `98cd6fec`, `083e20c6`, `9c08db4b`.

## 2026-10-05 — IBM Plex Sans on the Carbon type scale; alerts without colour blocks

- Decision: Chief asked for IBM Plex Sans across the whole dashboard with professional sizing, and
  for alerts without filled colour blocks. The font is the self-hosted variable IBM Plex Sans
  (`@fontsource-variable/ibm-plex-sans`, already a dependency), replacing Poppins. Sizes follow
  IBM Carbon's productive scale: 12 / 14 / 16 / 20 / 24 / 28 / 32 only (display 36+ kept), body
  14px at line-height 1.43, uppercase tracking at most 0.1em. Alerts carry severity with a 2px
  left rule and a severity word, never a background fill, gradient, pulse or emoji.
- Rationale: Carbon is the system Plex was drawn for. The floor is 12px, not 14px: the old
  "minimum 14px (WCAG best practice 2026)" comment had no decision behind it and is not a WCAG
  rule, and over 200 inline sizes were 7–10px. No monospace still holds (2026-03-06).
- Evidence: `5d0259fe` (1,029 sizes mapped by script, excluding `src/lib/cdss`, `src/lib/report`,
  email templates, tests) and `ef28a942`; Browser pane check on a local dev server, with no page
  overflow or clipped text on five pages at 1563px and on two pages at 1100px; lint,
  test:capsule, build, deploy:dry-run green.

## 2026-10-04 — MedBoard's diagnosis engine is retired for MIRA; clinical rules realigned

- Decision (Chief): "diagnosis system medsmartboard ini istirahatkan, fully using diagnostic engine
  MIRA". Chosen shape: Assist forwards its MIRA differential with the consult; MedBoard shows it.
  The engine is gated at the route level by `LEGACY_CDSS_ENGINE_ENABLED` (off when unset):
  `/api/cdss/diagnose` and `/api/clinical/differential/evaluate` answer 503 `{ retired: true }`
  after auth with a 'failure' audit; `/api/consult` skips the engine; `GET /api/cdss/diagnose`
  tells the EMR page to disable its CDSS button. The engine code and its tests stay.
- Consequence accepted by Chief: MedBoard's PE/anaphylaxis Symphony gates and adult vital red flags
  no longer run on consults; safety alerts come from Med-Assist.
- `mira_differential` is validated (zod) and dropped when malformed; it travels on the doctor
  socket and to the intelligence dashboard (source 'mira'). No schema change, so the pending-list
  path does not carry it.
- Clinical rules (Chief chose the research recommendations, 2026-10-04): trajectory SBP low bands
  follow NEWS2 (<=90 critical, <=100 high, <=110 moderate; Med-Assist core uses < 90); a missing
  AVPU is no longer scored as 'A' (schema and patient-sync); momentum worsening for SBP, DBP,
  temperature and glucose means moving away from the normal-range midpoint, so 'shock' (SBP down,
  HR and RR up) is reachable. The deterioration denominator was already present-only here.
- Evidence: red-then-green tests in `momentum-engine.test.ts`, `trajectory-analyzer.test.ts`,
  `unified-vitals.test.ts`, `mira-differential.test.ts`, `consult-intelligence-events.test.ts`,
  `MiraDifferentialCard.test.tsx`, the differential route test and two safety-net cases;
  `test:capsule`, lint, build exit 0. `momentum-engine`, `prediction-engine` and `unified-vitals`
  tests existed but ran in no suite; they now run in intelligence-route.

## 2026-10-04 — MedBoard accepts Med-Assist payloads; the dashboard stays authoritative for now

- Decision (Chief): align MedBoard with Med-Assist by accepting Assist payloads first. The shipped
  contract (`authoritative_engine: 'dashboard'` in Med-Assist `bridge-client.ts`) stays; flipping
  authority and the clinical rule differences between the two engines are separate decisions.
- Both engines descend from the Jewel/Sentra Nada trajectory engine (Med-Assist
  `symphony-trajectory-core.ts` header); the upstream package no longer exists in the repository.
- Assist's trajectory summary carries no momentum data, so it reaches the CDSS prompt as its own
  "Ringkasan Trajectory dari Assist" block instead of filling `CDSSTrajectoryContext` (Chief chose
  the separate block, R3).
- The reports a test run writes are git-ignored and listed as mutable state; the committed
  safety-net report was still the legacy 21/25 run.
- Evidence: `assist-acceptance` suite (consult events, anamnesis extract, engine prompt) and
  `diagnose-parser.test.ts` failed before the changes and pass after; `test:capsule`, typecheck
  and build exit 0; a 2600-character extract against `start:local` returns 200 with a token and
  401 without.

## 2026-09-27 — Autocomplete tests send a clinician session

- The three "Autocomplete klinis" tests failed with 401, not with a wrong chain:
  `/api/cdss/autocomplete` requires a crew session (`isCrewAuthorizedRequest`) and the tests sent
  none. With a DOKTER session the route returns the chains the tests claim (Nyeri Pinggang with
  CVA Test; Nyeri Punggung), so only the request header changed, no assertion.
- Every failing test in `scripts/test-cdss.ts` now sets exit code 1 (27/27 pass).

## 2026-09-27 — CDSS diagnosis access comes from the clinical role only

- Decision (Chief, option A): `POST /api/cdss/diagnose` and
  `POST /api/clinical/differential/evaluate` admit a session only when its role is clinical
  (`DOKTER`, `DOKTER_GIGI`, `PERAWAT`, `BIDAN`, `APOTEKER`, `TRIAGE_OFFICER`). The profession no
  longer grants access.
- Rationale: every profession in `CREW_ACCESS_PROFESSIONS` is clinical and a missing profession
  defaults to `Bidan`, so the old "role or profession" rule let ADMIN, CEO, and ADMINISTRATOR
  sessions run diagnoses. The behaviour was inherited unchanged from legacy.
- Evidence: `scripts/test-cdss.ts` "Auth CDSS diagnose" tests (ADMIN/CEO/ADMINISTRATOR with a
  clinical profession get 403; DOKTER_GIGI and TRIAGE_OFFICER get 200) and the differential test
  in `src/app/api/clinical/anamnesis/extract/route.test.ts` failed before the change and pass
  after it. A failing `Auth ` test now sets exit code 1.

## 2026-09-27 — Migrated from abyss-monorepo into SAFRS

- Decision: The legacy folder `abyss-monorepo/apps/healthcare/medboard` was copied as it is
  to `projects/healthcare/medboard`. Source: legacy commit
  `762e48cb4bb1967e2132e7b530e8f2a7f4231c59`.
- Not copied: `.agent/`, `.claude/`, `CLAUDE.md`, `.env*` files other than `.env.example`,
  `node_modules/`, `.next/`, `runtime/consult-accepted.jsonl`.
- Toolchain: fresh pnpm 11.21.0 lockfile with `nodeLinker: hoisted`, Node 24. `next` raised to
  16.3.6; overrides `postcss >=8.5.23`, `sharp >=0.35.4`, `deepmerge-ts >=8.0.1`, and
  `effect >=3.20.0` clear the `pnpm audit` findings. `scripts/prisma-generate.mjs` replaces a
  `node -e` one-liner in `postinstall`.
- `test` is `test:capsule`: the main suite plus `test:cdss:engine`, `test:news2`, and
  `test:symphony:safety-gates`. `run` is `start:local` on 127.0.0.1:4344 without a database
  or migrations.
- `docs/TESTING.md` was renamed to `docs/testing.md` (the layout the repository checks).
- Known test gaps are left as they were in legacy on Chief's instruction (2026-09-27: "biarkan
  dulu, buat catatan"); see `docs/testing.md` "Known gaps" and `HANDOFF.md`.
