# HANDOFF

Last updated: 2026-09-28 (late evening, mockup layout, no repeats, steady column, MIRA PII fix)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Capsule branch `feat/sidepanel-ui-batch`, **local only, not pushed, no PR.** HEAD is the docs
commit after `671777dc`. Today's earlier work (MIRA auto-start via native host, recurrent
diagnoses, step-flow page, pixel loader, reasons timeline) is in `DECISIONS.md` and the commit
bodies up to `265c488a`.

Late evening:

- `ca874859` — Chief's mockup: Usulan diagnosis utama, MUST NOT MISS, numbered Diagnosis banding
  with "Lainnya", NEXT BEST STEP. Card: title and chip, three-line `definisi`, tally row,
  "Lihat alasan ⌄" ("Mengapa perlu dipertimbangkan ⌄" on MUST NOT MISS).
- `2f2d70f2` — MIRA's `nextBestActions` reach the page; no action, no section.
- `c5b5ef88` — nothing said twice: no red "Jangan terlewat:" line, no chip on MUST NOT MISS
  cards, no "Diagnosis banding" title, no counts in the timeline, one term "Data kurang".
- `4df3887c` — steady column: opening the reasons moved every card, the step wrapper and the
  ghosts (layout corrections) and added an 8 px grid gap at once. Now only the reasons panel
  animates; layout animations run only on a step change or a selection change.
- `671777dc` — the MIRA client blocked about 1 in 700 requests as PII because the random trace
  id matched phone/NIK patterns; it now scans only the case. This was also the flaky
  `mira-engine` test.

No CSS change, no R3 path, no protected file. **SAFRS**: R2 UI and R2 engine code
(`lib/diagnosis-engine/**`, `types/api.ts`); the branch stays R3 through
`lib/clinical/recurrent-diagnosis.ts` (Chief's prior approval).

MIRA service: nothing listened on 127.0.0.1:8787 when checked this evening; the host
`com.sentra.mira` starts it when the side panel opens (verified earlier today, unchanged).

## What Chief tests now

1. `chrome://extensions` → reload "Asisten Medis" (`.output\chrome-mv3-dev`, rebuilt on the
   final tree), open the side panel, Trajectory → Diagnosis.
2. Press "Lihat alasan": only that card's reasons drop down; the cards above and below keep
   their size and shape and simply make room. Close: they return exactly.
3. Order and wording as above; nothing appears twice.

## Verification (capsule root, final tree)

| Gate | Exit | Result |
|---|---|---|
| `lint` | 0 | 1 pre-existing warning (`lib/api/platform-api-client.test.ts:19`) |
| `typecheck` | 0 | clean |
| `test` | 0 | 174 files passed, 1 skipped; 1344 tests passed, 17 skipped |
| `exec wxt build --mode development` | 0 | clean |
| `run:check` | 0 | "Extension loads: Asisten Medis 2.1.0 (MV3), all referenced files present." |

Motion checked in the Vite harness with a MutationObserver on every style change in the column
and a real mouse click: open and close change only the timeline height, its entries and lines,
and the chevron; card positions return exactly on close; selecting a card still folds the step
into its receipt. Token-guard: no violations (three runs this evening).

## Deferred minors (none blocking)

- `evidence.doNotMiss` and `buildDoNotMissReason` in `ClinicalDifferential.tsx` are unused by the
  page now (existing code, left in place).
- `console-divider` gives about 28 px around each divider against 12 px elsewhere; utilities
  cannot override it (style.css order, append-only).
- The Terapi medication rows still use `layout` and `whileTap` on the whole row; not reported as
  a problem, same pattern as the fixed cards.
- Carried: unused `.diagnosis-evidence-grid` and `dx-flow-*` CSS; `read_message` truncated-body
  guard; `askHost` disconnect and `publishMiraStatus` hydration untested; StrictMode double
  `miraEnsure` in dev; scanned visits never purged; `main.tsx` storage filter needs approval.

## Open for Chief (code must not change for these)

1. Durable R3 sign-off for `lib/clinical/recurrent-diagnosis.*` and `CHRONIC_ICD_ROOTS`.
2. `VITE_MIRA_SERVICE_URL` has no default in `.env.example`.
3. Host starts the service with `MIRA_SERVICE_ENV=development`; the environment name is Chief's.
4. Capsule `AGENTS.md` still says "penyakit.json wins; the LLM is a reranker only".
5. Whether Temuan, Terapi and RME headers get the pixel loader too.

## Next action

Chief reloads the extension and presses "Lihat alasan" on a card.
