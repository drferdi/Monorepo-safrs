# MIRA auto-start, recurrent diagnosis, step-flow diagnosis page (2026-09-28) — Design

## Intent

Chief reported three things after the live test of 2026-09-28:

1. "MIRA tidak tersedia": the MIRA reasoning service on `127.0.0.1:8787` was not running. Chief
   wants MIRA to be the default diagnosis engine and to come up on its own whenever Assist is on,
   without starting a server by hand.
2. With thin input the engine often answers "tidak ada diagnosis". The system should also look at
   the patient's diagnosis history: when the same diagnosis has been recorded two or more times,
   surface it, let the doctor agree, and promote it to the primary diagnosis.
3. The diagnosis page is still overwhelming (arrangement, type sizes). The staged layout of
   2026-09-27 (collapse and reorder) did not solve it; a different structure is needed.

Success: a doctor opens the side panel on a running ePuskesmas page and MIRA is ready before the
diagnosis page is opened; a chronic or recurrent diagnosis from the record is offered first and
becomes primary with one tap; the diagnosis page shows one step at a time, with everything the
doctor has finished reduced to one line each.

Chief's choices recorded in chat on 2026-09-28: order MIRA → history → page; MIRA lives while
Assist is on and stays alive until Chrome closes; MIRA is started as soon as the encounter data is
read (Trajectory), so the result is ready when the diagnosis page opens; recurrent = same ICD at
least twice in the last 12 months; chronic conditions (HT, DM, and the like) are labelled
"Kronis", everything else "Berulang"; first view = clinical finding + diagnosis + therapy; page
form B "fokus berjalan" from the mockup set (`.superpowers/brainstorm/847-1790554390/content/layout.html`).

Out of scope: diagnosis ranking inside either engine, triage decision logic, emergency detection,
the emergency verdict card, the action bar, changes to the MIRA request contract (v1), changes
under `src/**` of the MIRA repository, the data policy value (`openrouter-zdr`, Chief's decision
of 2026-09-27).

## Approvals and constraints recorded

- No R3 path is touched (`lib/clinical/**` only gains a new pure module, see Part 2; Chief
  approves that file with this spec). `lib/emergency-detector/**`,
  `lib/iskandar-diagnosis-engine/**` and `public/data/penyakit.json` are unchanged.
- No protected file is edited (`entrypoints/sidepanel/main.tsx`, `TTVInferenceUI.tsx`,
  `SentraAssistPanel.tsx`, `ApprovedSentraAssistApp.tsx`). `style.css` is append-only.
- MIRA repository (`D:\DEV\gafferverse\mira-system`): new files only under `assist/host/`; nothing
  under `src/`; `src/.env` is never opened; no push, no PR there. Live model calls happen only
  through Med Assist's `mira` mode (Chief's 2026-09-27 waiver); no scripted live run without
  "jalankan".
- Registering the native messaging host writes a registry key on Chief's PC. The agent prepares
  the script; Chief runs it once.
- ADR-005 moves to Accepted with a note that Chief made `mira` the default on 2026-09-28.

## Part 1 — MIRA starts with Assist and is the default engine

### 1.1 Native messaging host (MIRA repository, `assist/host/`)

- `sentra_mira_host.py`: a Chrome native messaging host (length-prefixed JSON on stdin/stdout).
  One request, `{"cmd": "ensure"}`. It answers one of:
  - `{"status": "running", "port": 8787}` when `GET http://127.0.0.1:8787/healthz` answers 200;
  - `{"status": "starting", "port": 8787, "pid": <n>}` after it has spawned the service;
  - `{"status": "failed", "reason": "<short text>"}` when the spawn fails (Python venv missing,
    port taken by something that is not MIRA, token not configured).
- The spawn is the same command as `run_local.ps1`: `src\.venv\Scripts\python.exe -m uvicorn
  --factory service.app:create_app --app-dir assist --host 127.0.0.1 --port 8787`, with the
  working directory at the repository root so `src/config.py` finds `src/.env` through
  `load_dotenv()`, and `MIRA_SERVICE_ENV=development`. Console window hidden.
- Lifetime: the host does not tie the service to the messaging port, because a Manifest V3
  service worker may be suspended and would close the port. Instead the host records its parent
  Chrome browser process id at start, keeps running after the port closes, polls that process
  every 5 s, and terminates uvicorn (and itself) when Chrome has exited. A second host instance
  (after a service worker restart) finds `/healthz` up and answers `running`; the instance that
  spawned uvicorn stays the owner. Only the owner terminates the service.
- `install_host.ps1 -ExtensionId <id>`: writes `assist/host/com.sentra.mira.json` (name
  `com.sentra.mira`, `type: stdio`, `path` to a `.bat` launcher that calls the venv Python with
  `sentra_mira_host.py`, `allowed_origins: ["chrome-extension://<id>/"]`) and the registry value
  `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.sentra.mira` pointing at that manifest.
  Also registers under `HKCU\Software\Microsoft\Edge\NativeMessagingHosts` for Edge. Re-runnable.
  `uninstall_host.ps1` removes both values.
- Tests (`assist/host/tests/`, pytest, no network beyond loopback, no model call): message
  framing; `ensure` when healthz is up (fake server) answers `running` without spawning; `ensure`
  when down spawns once (spawn function injected) and answers `starting`; a second `ensure` while
  starting does not spawn again; parent-exit detection terminates the child (fake process
  handle).

### 1.2 Extension side

- `wxt.config.ts`: add permission `nativeMessaging`.
- New module `lib/diagnosis-engine/mira-supervisor.ts` (background only):
  - `ensureMira()`: connects to `com.sentra.mira` with `runtime.connectNative`, sends `ensure`,
    then polls `/healthz` every 500 ms for at most 30 s. Errors from `connectNative`
    ("Specified native messaging host not found") map to `not-installed`.
  - Status type `MiraStatus = { state: 'not-installed' | 'starting' | 'ready' | 'down' |
    'failed'; reason?: string; checkedAt: string }`.
  - `publishMiraStatus(next)`: writes `sentra:mira-status` to `storage.local` only when `state`
    or `reason` differ from the last published value (kept in a module variable and re-read from
    storage on service-worker start). One storage write per change, never per poll. Rationale:
    the side panel re-renders on every `storage.onChanged` (DECISIONS 2026-09-28, render loop).
- Trigger: `SidePanelHeader` (not protected, mounted for every view) sends `miraEnsure` once on
  mount through `utils/messaging.ts`. The background handler calls `ensureMira()` and returns
  the current status. A `MiraStatusDot` in the header (new small component) reads
  `sentra:mira-status` and shows one of: siap (green), menyala… (amber), mati / gagal (red),
  belum terpasang (grey, tooltip "Jalankan install_host.ps1"). No text beyond the tooltip.
- Engine notice: `run-diagnosis.ts` replaces the single string `MIRA tidak tersedia` with a
  reason-specific notice built from the engine result: `MIRA belum terpasang`, `MIRA sedang
  menyala`, `MIRA mati`, `MIRA: batas biaya harian`, `MIRA: waktu habis`, `MIRA: hasil tidak
  valid`, `MIRA: data pasien ditolak (PII)`; unknown codes fall back to `MIRA tidak tersedia
  (<code>)`. The mapping lives in `lib/diagnosis-engine/mira-notice.ts` with a table test.
- Default engine: in `wxt.config.ts`, when the build mode is production and
  `SENTRA_DIAGNOSIS_ENGINE` is unset, define it as `mira`. `parseDiagnosisEngineMode` and its
  default (`legacy`) are unchanged, so Vitest (which never goes through the wxt define) keeps
  running the legacy engine. `.env.production.local` may still override.

### 1.3 Prefetch: MIRA runs from Trajectory, the diagnosis page reads the result

- New message `prefetchDiagnosis` with the same payload as `getSuggestions`
  (`DiagnosisRequestContext`). `ClinicalReasoningWorkbench` sends it once its inputs are ready
  (non-empty `symptomText` and a patient `rm`), debounced 2 s after the last input change, and
  again only when the payload hash changes.
- Background: `lib/diagnosis-engine/mira-prefetch.ts` keeps an in-memory map
  `hash → { status: 'pending' | 'done', result, startedAt }` (hash = SHA-256 of the canonical
  JSON of the payload plus the patient `rm`), capped at 20 entries, cleared on service-worker
  start. `prefetchDiagnosis` runs the MIRA step (same `stepWithTimeout`, same 20 s cap) unless
  an entry with that hash is pending or done. When a step finishes, the background writes
  `sentra:mira-prefetch-ready` = `{ hash, at }` to `storage.local` once.
- `getSuggestions` in `mira` mode: if the map has a done entry for the hash, its result is used
  immediately (no new live step). If the entry is pending, the legacy response is returned with
  `engine_notice = 'Menunggu MIRA…'` and `engine_pending = true`. If there is no entry, the
  behaviour is today's (wait for MIRA up to 20 s).
- `ClinicalDifferential` listens to `storage.onChanged` for `sentra:mira-prefetch-ready` while
  `engine_pending` is true and re-sends `getSuggestions` once when the hash matches its last
  request; the list is replaced in place and tagged "MIRA" as today. No other new listener.
- Cost guard: one live step per distinct payload hash per service-worker lifetime; the service's
  daily budget remains the hard stop. Audit: `logShadowComparison` is not used for prefetch; the
  existing `mira` mode audit line records each step.
- Tests: hash stability and change detection; no second live step for an equal payload; pending
  → legacy-with-notice; done → MIRA result without a new step; `sentra:mira-prefetch-ready`
  written once per finished step; `ClinicalDifferential` re-requests once on the matching hash.

### 1.4 ADR and docs

- `docs/adr/ADR-005…`: Status → Accepted (2026-09-28), with the lines: Chief made `mira` the
  production default; safety layer unchanged; ADR-004 rule "penyakit.json wins" superseded for
  the differential only.
- `.env.example`: document `nativeMessaging` and the host install in three lines.
- `DECISIONS.md`: entry for the auto-start design and for the resolved "MIRA tidak tersedia"
  investigation (cause: service not running).

## Part 2 — Recurrent diagnosis from the record

### 2.1 Pure module `lib/clinical/recurrent-diagnosis.ts` (R2; Chief approves with this spec)

```ts
export interface RecurrentDiagnosisCandidate {
  icd: string;            // normalised: trimmed, upper-case
  name: string;           // most recent `diagnosa.nama` for that ICD
  count: number;          // visits with this ICD inside the window
  visitsConsidered: number; // visits inside the window
  lastSeen: string;       // ISO timestamp of the most recent visit with this ICD
  label: 'Kronis' | 'Berulang';
}
export function findRecurrentDiagnoses(
  visits: VisitRecord[],
  today: Date,
  options?: { minCount?: number; windowMonths?: number }
): RecurrentDiagnosisCandidate[];
```

- Window: visits with `timestamp` within the last 12 months of `today` (default), grouped by
  normalised `diagnosa.icd_x`; visits without an ICD are ignored; the current visit (if it is in
  the list) is excluded from the count. Threshold `minCount` default 2.
- `Kronis` when the ICD's three-character root is in `CHRONIC_ICD_ROOTS`: `I10`–`I15`
  (hipertensi), `E10`–`E14` (diabetes), `E78` (dislipidemia), `I25` (PJK), `I50` (gagal
  jantung), `J44` (PPOK), `J45` (asma), `N18` (PGK), `G40` (epilepsi), `F20` (skizofrenia),
  `E03` and `E05` (tiroid), `M06` (artritis reumatoid). Chief may edit this list at any time;
  it is data in the module, not logic.
- Order: `Kronis` first, then higher `count`, then more recent `lastSeen`.
- Tests: threshold (1 visit → none, 2 → candidate), window edge (visit 12 months + 1 day is
  out), ICD normalisation (`i10 ` = `I10`), label per list, ordering, current visit excluded,
  missing ICD ignored.

### 2.2 Data flow and view model

- `ClinicalReasoningWorkbench` already holds `prefetchedVisitHistory.visits`. It computes
  candidates with `useMemo` (identity stable across equal re-renders, per DECISIONS 2026-09-28)
  and passes `recurrentDiagnoses` to `ClinicalDifferential`, which passes them to
  `DiagnosisWorkspace` / the step flow (Part 3).
- `diagnosisViewModel.ts` gains `recurrent: DiagnosisRecurrentView[]` and merges: when an engine
  candidate has the same normalised ICD as a recurrent candidate, that engine card carries the
  history line and the label chip and shows "MIRA setuju" (engine source MIRA) or "engine
  setuju" (legacy); otherwise the recurrent candidate is its own card placed first. Each card
  keeps `source: 'riwayat' | 'engine' | 'both'`.
- Selecting a recurrent card uses the same selection path as choosing a differential candidate
  (the `selectedDiagnosisCount` flag flips, therapy opens). It is never auto-selected
  (`ClinicalDifferential.autoselect.test.tsx` stays green). On selection the audit records
  `logSuggestionSelected` with `selected_icd` and, in metadata, `source: 'riwayat'`, `count`,
  `visitsConsidered` (extend the function's metadata argument; existing callers unchanged).
- Empty engine result: when the engine returns no diagnosis and at least one recurrent candidate
  exists, the Diagnosis step shows the candidates with the line "Data hari ini belum cukup untuk
  engine; riwayat menunjukkan pola berikut." The UI fallback list `buildUiFallbackDiagnoses` is
  not shown in that case.

### 2.3 History to MIRA

- `encounterToCaseState` appends `"<name> (<ICD>)"` for each recurrent candidate to
  `knownConditions` (de-duplicated against `penyakit_kronis`). The request contract is unchanged
  (`knownConditions` is an existing `stringList`). `DiagnosisRequestContext` gains an optional
  `recurrent_diagnoses: Array<{ icd: string; name: string }>` that the workbench and
  `ClinicalDifferential` fill for both `prefetchDiagnosis` and `getSuggestions`; it is part of
  the prefetch hash.
- Test: `case-state.test.ts` shows the appended entries and no duplicates.

## Part 3 — Diagnosis page as a step flow ("fokus berjalan")

### 3.1 Page structure, top to bottom

1. **Safety strip** (`SafetyStrip.tsx`), rendered whenever it has content, never behind a click:
   - one line for danger signs: "⚠ N tanda bahaya · lihat"; "lihat" expands the full
     de-duplicated list (`getVisibleSafetyItems`, uncapped, as D3 of the 2026-09-27 spec);
   - one line for triage: "Triase: <headline> · alasan"; when referral is indicated the line is
     highlighted with the existing danger tone and reads "Rujuk: <headline>"; "alasan" expands
     `firedCriteria` and `referralGuidance`.
   When neither exists the strip is absent.
2. **Receipt lines**, one per finished step, 11 px, left rule in the accent colour:
   "✓ Temuan · <chips> · ubah". "ubah" re-opens that step in full below the receipts (it becomes
   the active step until the doctor confirms again or taps "selesai").
3. **Active step** in full, with one question as its heading (14 px, semibold).
4. **Ghost lines**, one per future step, 45 % opacity, not interactive: "3 · Terapi",
   "4 · RME".

The receipt and ghost lines replace the progress stepper (D5, 2026-09-27).
`DiagnosisProgressStepper.tsx` and its test are deleted; the stepper CSS classes stay in
`style.css` (append-only file).

### 3.2 Steps

Step state comes from the view model (`steps: { id, label, done, active }[]`), with the same
done rules as D5: Temuan done when `phase === 'ready'`; Diagnosis done when
`selectedDiagnosisCount > 0`; Terapi done when `selectedMedicationCount > 0`; RME done when
`transfer.state === 'success'`. The active step is the first not-done step, unless the doctor
re-opened an earlier one.

- **Temuan** (`steps/FindingStep.tsx`): receipt shows the complaint chips (max 4, "+N") and only
  abnormal vitals from `diagnosis-clinical-signals`; the full step is today's Clinical Finding
  block unchanged.
- **Diagnosis** (`steps/DiagnosisStep.tsx`): heading "Apa diagnosis utama hari ini?". At most
  three cards: recurrent candidates first (Part 2), then engine candidates in engine order.
  Card: title "<nama> · <ICD>" (13 px semibold), one chip (`Kronis` / `Berulang` / `MIRA`), one
  muted line (history line "3 dari 5 kunjungan · terakhir 12 Agu 2026" or tally "mendukung 4 ·
  tidak 0 · ? 1"), a small "alasan" text link that expands Mendukung / Yang tidak mendukung /
  Data kurang / Catatan inside the card. Tapping the card body selects it (`aria-pressed`).
  Below the cards: "Jangan terlewat: …" list from the engine's cannot-miss entries, uncapped;
  "Lainnya (N)" reveals the remaining engine candidates as the same cards; "Diagnosis manual ›"
  toggles the manual form as today. The words "Diagnosis Utama", "Diagnosis Banding" and the
  confidence words in headers are gone; confidence appears only in the muted tally line.
  Receipt after selection: "✓ Diagnosis · <nama> <ICD> · ubah".
- **Terapi** (`steps/TherapyStep.tsx`): heading "Terapi apa?". One row per medication from the
  existing therapy view (`TherapyReviewPanel` content, reduced): name and dose left, one status
  word right (`lanjut` for continued chronic therapy, `usulan`, `dipilih`); tap toggles
  selection. Buttons "+ Obat" (manual medication form as today) and "Resep" (opens the
  prescription form). Receipt: "✓ Terapi · <first two medications>, +N · ubah".
- **RME** (`steps/RmeStep.tsx`): one primary button "Isi otomatis RME" with the D6 morphing
  states, one status line "Diagnosis siap · Resep belum siap · Obat 2/2", "Batal" / "Ulangi"
  as D2, and the "Rincian transfer" dropdown holding Kirim diagnosis / Kirim resep / Anamnesis
  and the step tracker (D7). Enable rules unchanged. Receipt: "✓ RME · terkirim <time>".

### 3.3 Not steps

- "Penunjang (N)" and "Edukasi (N)" are two one-line text links under the active step; each
  expands in place with today's content (Pemeriksaan / Catatan lists; Edukasi items minus those
  already in Penunjang). The 2026-09-28 force-open exception for Penunjang is removed because
  the safety strip now carries the danger signs whenever they exist.

### 3.4 Typography and motion

- Sizes: body 13 px, step heading 14 px semibold, labels 10 px uppercase muted, receipts and
  ghosts 11 px. No other sizes on this page. Colours from existing tokens only
  (`--text-main`, `--text-muted`, `--accent-med`, existing danger/warn tokens).
- Motion: receipt collapse and step expand 160 ms with `--ease-neu`; ghost → active is a fade
  in; all disabled under `prefers-reduced-motion`. No pulse, no new keyframes.
- New classes appended to `style.css` under the prefix `dx-flow-` (strip, receipt, ghost, step,
  card, chip, tally). Token-guard runs before commit.

### 3.5 Code structure

- `components/clinical/diagnosis/DiagnosisStepFlow.tsx` replaces `DiagnosisWorkspace.tsx` as the
  page component (`ClinicalDifferential` renders it with the same props plus
  `recurrentDiagnoses`). `DiagnosisWorkspace.tsx` is deleted after its tests are migrated.
- `components/clinical/diagnosis/steps/{FindingStep,DiagnosisStep,TherapyStep,RmeStep}.tsx`,
  `SafetyStrip.tsx`, `StepReceipt.tsx` (receipt and ghost line). Each file under 250 lines.
- `diagnosisViewModel.ts` gains `steps`, `recurrent`, and the merged candidate `source`.
  `createDiagnosisPageViewModel` keeps its signature with one added optional input.
- Tests: `diagnosisViewModel.test.ts` extended (steps derivation, merge rules);
  `DiagnosisStepFlow.test.tsx` (active step render, receipts, ghosts, "ubah" re-open, safety
  strip always present with content and uncapped, recurrent card tap → selected + audit,
  "Lainnya (N)", empty-engine-with-history message); `RMETransferPanel.test.tsx` and
  `TransferStepTracker.test.tsx` kept; `DiagnosisWorkspace.test.tsx` assertions migrated
  one-for-one and every changed or dropped assertion named in the commit message.

## Error handling

- Host not installed: status `not-installed`; diagnosis proceeds with the legacy engine; notice
  "MIRA belum terpasang".
- Host installed, spawn fails: status `failed` with the host's reason; legacy engine; notice
  "MIRA mati".
- Service up but a step fails: the reason from `error.code` (Part 1.2 mapping); legacy engine.
- Prefetch result older than the current payload (hash mismatch): ignored; a new step runs.
- Visit history absent or `insufficient`: no recurrent candidates; the Diagnosis step shows
  engine cards only.
- Recurrent candidate whose ICD the engine marks cannot-miss: shown once, as the candidate card
  with the history line; the cannot-miss list omits it.

## Testing and gates

- TDD per part. Gates before each commit: `node scripts/pnpm.mjs run lint|typecheck|test|build`,
  token-guard for Part 3 and the header dot, safrs-auditor. Host tests: `pytest assist/host/tests`
  in the MIRA repository (no model calls).
- Live verification by Chief after the build: run `install_host.ps1` once, reload the extension,
  open the side panel and watch the status dot turn green without starting anything by hand;
  open Trajectory then Diagnosis and see the MIRA-tagged list at once; a synthetic patient with
  three prior I10 visits shows the Kronis card first; the page shows one step at a time.

## Sequencing (one plan, three task groups)

1. Part 1 (host, supervisor, notice mapping, prefetch, default, ADR).
2. Part 2 (pure module, view model merge, case-state).
3. Part 3 (step flow, safety strip, steps, tests migration, CSS).

Each group ends with green gates and a local commit; no push, no PR unless Chief asks.
