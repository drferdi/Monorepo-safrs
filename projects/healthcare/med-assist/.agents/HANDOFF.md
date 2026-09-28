# HANDOFF

Last updated: 2026-09-28 (late evening, diagnosis step on Chief's mockup, nothing said twice)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Capsule branch `feat/sidepanel-ui-batch`, **local only, not pushed, no PR.** Today's earlier work
(MIRA auto-start via native host, recurrent diagnoses, step-flow page, pixel loader, reasons
timeline) is in `DECISIONS.md` and the commit bodies up to `265c488a`.

Late evening, three commits:

- `ca874859` — Chief's mockup: "Usulan diagnosis utama" first, then MUST NOT MISS (MIRA
  cannot-miss cards, outside the three-card cap), the numbered "Diagnosis banding N" cards with
  "Lainnya (n) ⌄", then NEXT BEST STEP; `console-divider` between parts. Card: title and chip,
  three-line `definisi`, tally row, "Lihat alasan ⌄" (MUST NOT MISS: "Mengapa perlu
  dipertimbangkan ⌄" opening Temuan yang relevan, Bila terlewat from `komplikasi`, Data kurang,
  "Apa yang perlu diperiksa →"). The recurrence rule is the Riwayat entry of the timeline.
  `useDiseaseDefinitions` became `useDiseaseNotes`.
- `2f2d70f2` — MIRA's `nextBestActions` now reach the page (`next_best_actions` in
  `CDSSResponse`, filled in `run-diagnosis.ts` mira mode, first one kept in
  `ClinicalDifferential`). No action, no section; the legacy engine sends none.
- `c5b5ef88` — Chief flagged repeats on the live render; the page now
  says nothing twice: no red "Jangan terlewat:" line, no chip on MUST NOT MISS cards, no
  "Diagnosis banding" title, no counts in the timeline, one term "Data kurang".

No CSS change, no R3 path, no protected file. **SAFRS**: R2 UI plus R2 engine plumbing
(`lib/diagnosis-engine/run-diagnosis.ts`, `types/api.ts`); the branch as a whole stays R3
through `lib/clinical/recurrent-diagnosis.ts` (Chief's prior approval).

MIRA service: nothing listened on 127.0.0.1:8787 at the end of the session (`/healthz` no
answer). The host `com.sentra.mira` starts it when the side panel opens; that path was verified
earlier today and was not changed.

## What Chief tests now

1. `chrome://extensions` → reload "Asisten Medis" (`.output\chrome-mv3-dev`, rebuilt on the
   final tree), open the side panel (MIRA starts), Trajectory → Diagnosis.
2. Order: Usulan diagnosis utama, Must not miss (if MIRA names one), Diagnosis banding 1 and 2,
   Lainnya, Next best step with "Masukkan hasil" (only when MIRA answered).
3. "Lihat alasan" and "Mengapa perlu dipertimbangkan" open and close smoothly; no word, count or
   warning appears twice.

## Verification (capsule root, final tree)

| Gate | Exit | Result |
|---|---|---|
| `lint` | 0 | 1 pre-existing warning (`lib/api/platform-api-client.test.ts:19`) |
| `typecheck` | 0 | clean |
| `test` | 0 | 174 files passed, 1 skipped; 1342 tests passed, 17 skipped |
| `exec wxt build --mode development` | 0 | clean |
| `run:check` | 0 | "Extension loads: Asisten Medis 2.1.0 (MV3), all referenced files present." |

Rendering checked in the Vite harness of the real stylesheet (closed and opened cards, next best
step). Frame-by-frame motion could not be re-measured: the browser pane throttled animation
frames to about 2 per second; the timeline motion itself is unchanged since `3b360c00`, where it
was measured. Token-guard: no violations on the mockup layout.

## Deferred minors (none blocking)

- `evidence.doNotMiss` and `buildDoNotMissReason` in `ClinicalDifferential.tsx` are now unused by
  the page (left in place, existing code).
- `console-divider` gives about 28 px around each divider against 12 px elsewhere; it is a
  boot-card class and utilities cannot override it (style.css order, append-only).
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

Chief reloads the extension and walks the checks above.
