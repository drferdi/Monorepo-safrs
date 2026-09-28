# HANDOFF

Last updated: 2026-09-28 (afternoon, second review)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Capsule branch `feat/sidepanel-ui-batch`, **local only, not pushed, no PR.** HEAD `1cdbd1f8`.
Morning: plan `docs/plans/2026-09-28-mira-autostart-recurrent-dx-step-flow-plan.md` (16 tasks)
landed as `40f3b80c..9b355bfe` — MIRA auto-start (native host in
`D:\DEV\gafferverse\mira-system`, branch `feat/reasoning-service`, `a3e7fef..15f87b4`, never
pushed), recurrent diagnoses from the record, step-flow diagnosis page. See `DECISIONS.md`.

Afternoon (`1631880f`, `1cdbd1f8`): Chief rejected the rendered page twice ("teks tanpa CSS",
cluttered, fonts not matching, a triage list on a diagnosis page; then "Diagnosis banding mana?",
red triage line duplicating the header's TRIAGE tab, "Mana motion?"). Rewritten on the existing
design system: every step is a `ct-v2-panel` with `ttv-section-title`/`ttv-label` (Trajectory's
panel); the Diagnosis step names a "Diagnosis utama" slot ("Usulan diagnosis utama" until the
doctor taps; the patient's recurrent diagnosis first, else the engine's top card) and a
"Diagnosis banding" list, three cards in total, cannot-miss exempt; history cards read
"N× dalam 12 bulan · terakhir <date>"; Temuan shows three findings, complaint first; no
triage/red-flag text on the page (`SafetyStrip` deleted); actions are `diagnosis-text-button` /
`btn-ac-inline`. Motion via `framer-motion` after lab.xevrion.dev: step panel folds into its
receipt and unfolds on "ubah" (shared `layoutId`), staggered cards/chips, tap sink, accordion
"alasan", slide-in step. Header yellow/green triage zones colour only the tab dot. `style.css`
is append-only, so the old `dx-flow-*` block is orphaned CSS. Rendering verified in a Vite
harness of the real stylesheet in the browser pane (diagnosis, therapy, loading; fold/unfold).

MIRA host: registry key `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.sentra.mira` and
manifest (`allowed_origins` = `chrome-extension://oeiclacedioeocjijdopioolfdbnbjgf/`, UTF-8, no
BOM) verified; the id matches `.output\chrome-mv3-dev`. Running the host by hand with `ensure`
started the service (`/healthz` 200). The engine re-asks the supervisor after a network failure
and the background ensures the service at browser start, so a stale "belum terpasang" status
cannot outlive the install. `.output/chrome-mv3-dev` rebuilt at `1cdbd1f8`.

**SAFRS**: risk tier R3, driven only by `lib/clinical/recurrent-diagnosis.ts` + its test (Chief's
prior approval); the afternoon changes touch R2 UI, `background.ts` and `run-diagnosis.ts`
only; no verification-control path, no protected file, no secrets.

## What Chief tests now

1. `chrome://extensions` → reload "Asisten Medis" (the bundle in `.output\chrome-mv3-dev`).
2. Open the side panel: header dot green, no manual server start (service is up now; after a
   reboot the host starts it).
3. Trajectory → Diagnosis: Temuan receipt (3 findings), DIAGNOSIS panel with "Usulan diagnosis
   utama" + "Diagnosis banding", tap a banding card → it becomes "Diagnosis utama" and the panel
   folds into a receipt; "ubah" unfolds it. No triage text on the page.
4. Recurrence rule: ≥2 identical ICD roots in the last 12 months (`minCount` 2, `windowMonths`
   12 in `lib/clinical/recurrent-diagnosis.ts`); "2 in one month" is inside this window. If
   Chief wants a 1-month window, that is a one-constant change in that R3 file.

## Verification (capsule root, `node scripts/pnpm.mjs run <script>`, at `1cdbd1f8`)

| Gate | Exit | Result |
|---|---|---|
| `lint` | 0 | 1 pre-existing warning (`lib/api/platform-api-client.test.ts:19`) |
| `typecheck` | 0 | clean |
| `test` | 0 | 171 files passed, 1 skipped; 1320 tests passed, 17 skipped |
| `exec wxt build --mode development` | 0 | clean, `nativeMessaging` in manifest |
| `run:check` | 0 | "Extension loads: Asisten Medis 2.1.0 (MV3), all referenced files present." |

Token-guard subagent (at `1631880f`): no violations; this capsule has no `check:tokens` script
(pre-existing gap). MIRA repository host tests: 8 passed (morning run, host unchanged since).

## Deferred minors (none blocking)

- Part 1 — `read_message` no truncated-body guard; `askHost` disconnect path and
  `publishMiraStatus` restart hydration untested; StrictMode double-fires `miraEnsure` in dev.
- Part 2 — `knownConditions` dedupe is exact-string; hook interface is `{ candidates, loaded }`.
- Part 3 — orphaned `dx-flow-*` CSS block (append-only file); the unused `triage` prop stays on
  `DiagnosisPageProps` (removing it touches `ClinicalDifferential.tsx`); expand buttons lack
  `aria-controls`; "Jangan terlewat" is the only red text left; the Vite harness
  (`scratchpad/harness`, `.claude/launch.json`) was session-only and removed.

## Carried from the 2026-09-26 batch, still open

Trajectory "Review details" and top-card Indonesian copy (Chief checks live); side-panel items
a–g and parked a11y minors; `main.tsx` `storage.onChanged` filter needs a protected-file approval.

## Open for Chief — decisions from this session's SAFRS audit (code must not change for these)

5. Durable R3 acknowledgement for `lib/clinical/recurrent-diagnosis.*` and a review of
   `CHRONIC_ICD_ROOTS` as clinical content: the approval so far is verbal, in this session; the
   `DECISIONS.md` entry cites it but needs Chief's durable sign-off.
6. ADR-005 is Accepted by Chief's decision without the Gate 1 benchmark evidence; if the ADR's
   "Decision Maker … pending" header line is still present, closing it is Chief's to do.
7. `VITE_MIRA_SERVICE_URL` has no default in `.env.example`: a production build without
   `.env.local` reports MIRA `down` after the 30 s poll even though `mira` is now the default
   engine. Chief decides whether the extension gets the same default the host hard-codes
   (`http://127.0.0.1:8787`) or keeps `.env.local` as the single source.
8. The host starts the service with `MIRA_SERVICE_ENV=development` (same as `run_local.ps1`)
   while the extension's production build now defaults to `mira`; Chief decides the environment
   name.
9. Capsule `AGENTS.md` still says "penyakit.json wins; the LLM is a reranker only", which accepted
   ADR-005 supersedes for the differential; `projects/**/AGENTS.md` is an R2 verification control,
   so that edit is a separate change set for Chief to authorise.
10. Minor: a host `failed.reason` is `str(OSError)` and may surface a local path in the header
    status dot's title.

## Final review (whole branch) — fixes and what stays open

Fixed in `0a0d2814` `fix(med-assist): final review: persist scanned visits, uncapped cannot-miss,
receipts around a reopened step, prefetch by case key`, plus the re-review residual in the next
commit, `fix(med-assist): keep history cards on top when MIRA flags them cannot-miss` (TDD, each
with a test):

- **F1** The Trajectory stage (`ClinicalReasoningWorkbench.tsx`) now writes the scanned visit rows
  with `saveScrapedVisits` (once per patient and scan result; a failed write still lets the read
  run), reads the recurrent history only after the write lands, and sends `prefetchDiagnosis` only
  after that read. Before this, nothing wrote the visit store and Part 2 was inert in production.
- **F2** MIRA cannot-miss cards render outside the three-card cap, before "Lainnya (n)"; the
  do-not-miss line filter compares against the visible cards only.
  History cards always stay in the top group, even when their merged engine tag is cannot-miss;
  such a card is also exempt from the cap, so it is never behind "Lainnya" (next commit,
  `fix(med-assist): never hide a history card MIRA flags cannot-miss behind Lainnya`).
- **F3** Reopening an earlier step keeps every finished later step as a receipt below it.
- **F4** The prefetch is stored and found by case key (hash of `encounterToCaseState`, which applies
  the request-or-encounter fallbacks); the pending reply carries `prefetch_key`, the ready record is
  `{ key, at }`, and the page matches on that key. The `prefetchDiagnosis` reply's `hash` field now
  carries the case key; its no-encounter early return in `background.ts` still sends the request
  hash (unused by the panel).
- **F9** The history-only message needs a successful engine reply (not the fetch-error path).

For Chief to confirm:

- **Patient data at rest**: scanned visits (RM, dates, complaints, diagnoses, therapy text,
  clinician names) are now persisted in the extension's IndexedDB `sentra-visit-history`
  (`source: 'scrape'`, the store built for it). No expiry or purge exists. `saveVisit` keeps the
  first write for an `encounter_id` and never updates it, so a diagnosis corrected later in
  ePuskesmas, or a row saved under the wrong patient by a stale scan, stays until Chief decides a
  purge or correction path.
- **Scan cap**: `main.tsx` keeps 5 rows, so the 12-month window sees at most five visits (protected
  file; Chief's call).
- **`currentEncounterId`**: not passed; the content scanner already drops today's rows
  (`entrypoints/content.ts`, `pastCandidates`), so the current encounter never reaches the store.

Deferred minors (final review), none blocking:

- Header status dot is never re-checked mid-session: it stays green if MIRA dies until the header
  remounts.
- `getLastMiraStatus()` is `null` after a service-worker restart, so the notice reads "MIRA mati"
  instead of "belum terpasang".
- The host reply is cast `as HostReply` without validation.
- Audit `session_id: rm-<RM>` is hashed with a 32-bit `simpleHash` (enumerable); other callers use
  `session-<encounter.id>`.
- Case keys can still differ when there is no anamnesa draft and the typed `symptomText` differs
  from the encounter's `keluhan_utama` (the page prefers the encounter's, the Trajectory stage the
  typed text; `main.tsx` is protected). The page then runs its own MIRA step.
- If the scan resolves later than the 2 s debounce, one prefetch without history goes out first;
  the second, with history, is the one the page matches.
- The diagnosis page's own history read does not wait for the Trajectory stage's write; opening the
  page before the write lands misses the prefetch once.
- A scanned row found only by `href` has `encounter_id: ''`. The store's `encounter_id` index is
  unique across patients, so once any patient has a row with an empty `encounter_id`, every later
  href-only row is dropped, whichever patient it belongs to; the recurrent grouping also dedupes by
  it.
- `request-context.ts`'s module comment still says both paths "produce the same … hash"; the hash
  is no longer the prefetch key (file outside this fix's set).

## Next action

Chief runs the one-time host install, reloads the extension, and walks the live checks above; then
weighs in on the SAFRS items above (5–10).
