# Puskesmas clinical flow (beta) - implementation plan

Written 2026-10-20 (Asia/Jakarta) for the capsule `projects/healthcare/sentrapedia`, from the bundle
`.claude/plans/handoff-for-puskesmas-plan.md`, the capsule and root `AGENTS.md`, `.agents/CONTEXT.md` and the source
at commit `08b31f78`. The implementer (a different agent, without this author's context) executes Phases 0-5 in order
and stops at every "STOP" line. Phase 6 is described but **not in this run**.

All paths below are relative to the capsule root `D:\DEV\monorepo\projects\healthcare\sentrapedia` unless they start
with `D:\`. Line numbers are those of `08b31f78`; re-check them before editing (Phase 0 does).

## 1. Goal, scope, baseline

### Goal

A beta "Puskesmas clinical flow" for Indonesian primary-care (FKTP/Puskesmas) doctors, layered on the doctor-flow
work in `08b31f78`: six small, deterministic, local features that help a doctor enter a case completely, see it as
S/O/A/P, keep working when the AADI analysis fails, move the result into P-Care field by field, and go on to the next
document without retyping. Nothing here adds clinical inference: no diagnosis, no ICD-10 code, no treatment is ever
produced by local code.

### Scope: the six features of bundle section 7, grouped into Phases 1-5

| # | Feature (bundle section 7) | Today | Phase |
| --- | --- | --- | --- |
| 1 | Section-insert chips: insert a labelled section skeleton into the composer | none | 2 (lib in 1) |
| 2 | Completeness strip: which required case/SOAP fields are filled vs missing | none | 2 (lib in 1) |
| 3 | Guided SOAP view: local, deterministic S/O/A/P from what the doctor typed | none | 3 (lib in 1) |
| 4 | Per-field copy to P-Care: copy buttons matching P-Care's entry fields, only what exists in the draft | partial (`summaryCopies`) | 5 |
| 5 | Error fallback: when an AADI analysis fails, offer a local deterministic draft | none | 4 (provenance in 1) |
| 6 | Next-step chips after a draft, routing to existing modes only | partial ("Surat rujukan") | 5 |

Phase 6 (data-policy copy, synthetic/de-identified data contract) is outlined in section 4 and is out of this run.

### Baseline

- Commit `08b31f78e6c160cb351693d02bf796b2522874c5`, "wip: rename MIRA to AADI; doctor-flow composer (checkpoint)",
  on branch `feat/prompt-claude-sonnet-5-5`, local only, no PR. Gate at that commit (bundle section 1): typecheck 0,
  lint 0, `npx vitest run` 0 (30 files, 384 tests), build 0, deploy dry-run 0; only `npm test -- tests/workspace.test.ts`
  failed, by the command's shape (section 5 below).
- **What `main` (`c611cca6`) lacks**, verified with `git.exe ls-tree`/`git.exe show main:...` from the monorepo root:
  - the engine folder is still `mira/` and the client library `src/lib/mira/` (`git.exe ls-tree --name-only main --
    projects/healthcare/sentrapedia/` lists `mira`; `src/lib` lists `mira` and `dify`, no `aadi`);
  - no doctor-flow: `main:.../src/components/composer.tsx` has 0 occurrences of `CaseStrip`;
    `main:.../src/lib/mira/presentation.ts` has 0 occurrences of `summaryCopies` and `doctorSummaryTitle`;
  - no `src/app/api/aadi/route.ts`, no `tests/ui/case-strip.test.tsx`, no nine-part report, no word-by-word reveal.
  - The branch is 159 commits ahead of `main` and 15 behind (merge-base `1f056afc`); `git diff main..HEAD` touches 510
    files across the monorepo (bundle section 5), so `main` is not a usable base for this plan (section 7, decision 1).
- Working tree at the start of this plan (`git.exe status --short` from the capsule): `.gitignore` modified (adds
  `.husky/_/`, not ours), `.playwright-mcp/` untracked (scratch, never commit), and other sessions' uncommitted work
  outside the capsule (`tools/prompt/*`, root `.agents/skills/gaffer-superpower/`, `docs/antigravity/`). The output
  folder `.claude/` is ignored by the capsule's `.gitignore` (line 20).
- Test inventory: `npx vitest list` prints 344 test names in 30 files; `npx vitest run` reports 384 tests because
  `it.each` rows expand at run time (`tests/workspace.test.ts` "builds $label" x18, "greets at %s" x9). 344 is not a
  regression.

## 2. Non-negotiable rules

- No push, no PR, no deploy, no npm install, no new dependencies, no changes outside the capsule, no edits under `apps/site`.
- Fictional cases only in code, fixtures, examples and tests: no names, NIK, BPJS numbers, phone numbers, addresses or dates of birth.
- Local drafting stays deterministic. Never generate diagnoses, ICD-10 codes or treatments. Missing data keeps the label "Belum tersedia — lengkapi dan verifikasi oleh klinisi" (it already exists as `missingField` in `src/lib/clinical-templates.ts`; reuse it).
- UI copy in Bahasa Indonesia. Code, comments, identifiers, tests, commit messages and docs in English.
- Every new persisted field is optional and additive. An old workspace-backup.json must still import. Storage key and `Workspace.version` stay unchanged.
- Plain CSS in `src/app/globals.css` using existing tokens only. No Tailwind.
- Capsule sovereignty: no imports from the monorepo root or sibling capsules.
- Do not change the thinking animation, the answer reveal (baseline: the word-by-word stream in `08b31f78`), the modal focus trap or the global keyboard shortcuts.
- Keyboard operable, visible focus ring, meaningful aria-labels, `prefers-reduced-motion` respected, no horizontal page scroll at 400 px.
- Do not touch: data-policy copy, the synthetic/de-identified contract, anything under `aadi/` (the engine; it was `mira/` before the rename, and on `main` it is still `mira/`), `src/lib/aadi/model-profile.ts`, `README.md`, `.agents/DECISIONS.md`.
- If a step turns out wrong or impossible, stop at that step, write what was found and the smallest alternative, and wait. Do not improvise a different design.
- Close the task in front of you before reporting new findings; new findings go in "Noticed, not touched".
- Update `.agents/HANDOFF.md` at the end of every phase (HANDOFF keeps the newest five entries; `AGENTS.md` describes archiving).

Plus the house rules that apply anyway: fix root causes, no `@ts-ignore`, no `eslint-disable`, no implicit `any`, no
silent casts; touch only what the task names; match the existing style (one-line JSX-heavy components, comments that
say why); own litter only.

## 3. Assumptions A1-A8

A2, A4, A5 and A8 are facts Phase 0 confirms or refutes by reading code or running tests. A1, A3, A6 and A7 are
product assumptions for Gaffer; the plan's defaults follow the recommendations in section 7.

| | Statement | Phase 0 check | If false |
| --- | --- | --- | --- |
| A1 (product) | A Puskesmas doctor enters the case as free text plus the case strip; structure comes from labelled lines that `structureNote` already reads ("Keluhan utama:", "Anamnesis:", "Pemeriksaan fisik:", "Asesmen:", "Rencana:"), not from a form. | Gaffer confirms at the Phase 0 stop. | Replace the insert chips with a form only on Gaffer's instruction; that is a different design, stop and ask. |
| A2 (code) | `parseWorkspace` (`src/lib/workspace.ts:94-114`) returns `null` only when a *required* field is missing or mistyped or `version !== 1` (line 97); unknown keys survive, because the validated object is cast whole (`data as unknown as Workspace`, line 103) and every record is copied with a spread (`{ ...message }` line 107; `cleanWorkflowMessage` `src/lib/workflow.ts:44`, `cleanWorkflowEncounter` `:53`, `cleanWorkflowState` `:61`). Old backups exist as fixtures: `tests/fixtures/workspace/v1-workflow.json`, `tests/fixtures/workspace/v1-demo-seed-2026-10-08.json`; `tests/workspace-fixtures.test.ts:13` asserts `parsed` equals `JSON.parse(raw)`, so the parser must never materialise a default for a field the backup lacks. | Read the lines; run `npx vitest run tests/workspace-fixtures.test.ts` (2 tests pass). | The plan adds no persisted field anyway (section 4, Phase 1); if unknown keys are dropped, note it in the report and keep the fallback marker inside `sourceText` as planned. |
| A3 (product) | Completeness items: analysis modes need Keluhan utama, Usia, Jenis kelamin, Tanda vital, Anamnesis, Pemeriksaan fisik; the SOAP mode (`clinic`) adds Asesmen and Rencana. The guide shows only in those modes and only once something is typed. | Gaffer confirms (section 7, decision 2). | Change the lists in `src/lib/soap.ts` (`guideItems`), the tests and the copy; nothing else moves. |
| A4 (code) | `Workspace.version` is the literal `1` (`src/lib/workspace.ts:12`, seeded at `:18`); the storage key is `storageKey = "sentrapedia-workspace-v1"` (`:15`), with `unreadableKey` derived from it (`:85`); `docs/data.md` "Format changes" says a new format gets a new key. No other module defines a version or key. | `grep -rn "sentrapedia-workspace\|version: 1\|storageKey" src/` shows only these lines (plus `workspace-hooks.ts:4,32` and `workspace-session.ts:4,22` importing it). | Find where it really lives; keep it unchanged; correct the file references in this plan's report. |
| A5 (code) | Of the 18 modes, five route to AADI through `composerUsesAadi` (`src/lib/aadi/composer.ts:7-9`: question, ddx, workup, refer, icd10) unless a personal template is chosen; the other 13 are local deterministic drafts, and `createDraft` (`src/lib/drafts.ts:32-90`) has sections for all 18 modes, the five analysis modes included (`:39-56`). So a local draft exists for every mode, and `generate` in `workspace.tsx:120-132` only needs a way to skip the AADI branch. | Read the lines; `npx vitest run tests/aadi-composer.test.ts` ("routes built-in Ask and DDx to AADI...") and `tests/workspace.test.ts` ("builds $label with supplied facts..." x18) pass. | If `createDraft` lacks a mode, the fallback (Phase 4) targets `clinic` only, which it does by default; if more modes call AADI, extend the next-step toast rule (Phase 5) to them. |
| A6 (product) | P-Care's per-visit entry fields this flow copies into are, in P-Care's order: Keluhan (anamnesa), Pemeriksaan fisik, Diagnosa (ICD-10 search), Terapi (obat), Alergi. The chip copies a value; it never submits anything. | Gaffer confirms the field names against the live P-Care form (section 7, decision 4). | Rename or drop entries in `pcareCopies` (`src/lib/aadi/presentation.ts`) and the test; the row stays. |
| A7 (product) | After an AADI answer, next-step chips route to local modes only (SOAP note, referral letter, task list). After a local draft, they may route to AADI modes (Analisis AADI, Pemeriksaan penunjang, Kode ICD-10) plus the referral letter; Enter then runs a paid analysis, and the toast says so. | Gaffer confirms (section 7, decision 5). | Drop the AADI targets from `nextSteps` for local drafts; one array literal and one test change. |
| A8 (code) | The missing-data label exists once as `missingField` (`src/lib/clinical-templates.ts:7`) and is reused by `drafts.ts:3,37`, `workflow.ts:3,80` and `studio.ts:1,52` (`emptySection`). It is **not** used by the AADI report: `src/lib/aadi/presentation.ts:190,202,206,240` write the shorter literal "Belum tersedia" (doctor-flow wording, R3, untouched by this plan). No P-Care field list exists anywhere in the capsule: `grep -rni "p-\?care\|pcare" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.runtime --exclude-dir=theoracle --exclude-dir=.playwright-mcp .` hits only the comment at `src/components/message-card.tsx:37` and `docs/plans/active/2026-10-20-doctor-flow-design.md:76,82`. | Run both greps; read `clinical-templates.ts:7`. | If a P-Care list exists, use it instead of A6; if `missingField` moved, import it from where it is. The AADI report's literal stays out of scope either way. |

## 4. Phases 0-6

Conventions for every phase:

- Test-first: write or extend the named test file, run `npx vitest run <file>` and watch it fail for the right reason,
  then implement, then run the gate (section 5).
- New UI test files start with `// @vitest-environment jsdom` on line 1 and copy the `beforeEach` scaffolding of
  `tests/ui/case-strip.test.tsx:22-37` (reduced motion on, `ResizeObserver`, `scrollIntoView`, a `fetch` mock that
  records POSTs and answers with a fixture). Reduced motion makes answers appear whole, so no fake timers are needed.
- Fixtures are fictional: complaints, vitals and the existing fixture analyses (`tests/ui/case-strip.test.tsx:9-18`,
  `tests/ui/workspace-smoke.test.tsx:19-107`); never a name, NIK, BPJS number, phone number, address or birth date.
- Commits stage explicit paths under `projects/healthcare/sentrapedia/` (`git.exe add projects/healthcare/sentrapedia/<file>`
  for each file), never `git add -A` or `git add .` from the monorepo root: the tree holds other sessions' uncommitted
  files. Each commit message ends with the `Co-Authored-By:` line the implementer's own session attribution requires.
- Every phase ends with the HANDOFF update (task "H" below) and the gate.

### Phase 0 - Recon and baseline (no code changes)

Goal: confirm the assumptions, record the baseline, and get the branch decision from Gaffer. Nothing is edited.

0.1 Read, in this order: `AGENTS.md` (capsule), `D:\DEV\monorepo\AGENTS.md` (wins on conflict), `.agents/HANDOFF.md`,
`.agents/CONTEXT.md`, `docs/data.md` ("Format changes"), `docs/testing.md`, the bundle
`.claude/plans/handoff-for-puskesmas-plan.md` sections 1, 2, 7 and 8, then the files this plan touches:
`src/lib/clinical-templates.ts`, `src/lib/note-structure.ts`, `src/lib/drafts.ts`, `src/lib/studio.ts`,
`src/lib/workspace.ts`, `src/lib/workflow.ts`, `src/lib/workspace-session.ts`, `src/lib/aadi/composer.ts`,
`src/lib/aadi/contract.ts`, `src/lib/aadi/types.ts`, `src/lib/aadi/client.ts`, `src/lib/aadi/gateway.ts` (only to
see what a POST returns when no engine is configured, for the Phase 4 browser check), `src/lib/aadi/presentation.ts`,
`src/components/composer.tsx`, `src/components/message-card.tsx`, `src/components/workspace.tsx`,
`src/components/workspace-views.tsx`, `src/components/document-studio.tsx`, `src/app/globals.css` (lines 1-60,
120-135, 210-220, 400-415, 600-610, 655-670, 840-901), `tests/ui/case-strip.test.tsx`,
`tests/ui/workspace-smoke.test.tsx`, `tests/workspace-session.test.ts`, `tests/workspace-fixtures.test.ts`,
`tests/studio.test.ts`, `tests/diagnosis-presentation.test.ts` (lines 476-500), `package.json`, `vitest.config.ts`,
`eslint.config.mjs`.

0.2 Working-tree state: `git.exe status --short` from the capsule and from the monorepo root. Expected: `.gitignore`
modified, `.playwright-mcp/` untracked, and the out-of-capsule files named in section 1. Anything else: record it,
do not touch it. Confirm `git.exe rev-parse HEAD` is `08b31f78...` and `git.exe branch --show-current` is
`feat/prompt-claude-sonnet-5-5`.

0.3 Baseline, from the capsule root, each with its exit code and one line: `npm run typecheck`, `npm run lint`,
`npx vitest run` (record files, tests, duration; expected 30 files, 384 tests), `npm test` (vitest plus the site's
node tests), `npm run build`, `npm run deploy:dry-run`. No `next dev` may be running on this folder during the
baseline or any later gate: a stale `.next/dev/types/*` file can fail `tsc` on its own (the HANDOFF doctor-flow entry
records exactly that); if `tsc` fails only there, say so and rerun once the folder is quiet. After `npm run build`,
`git.exe status --short` must be unchanged (the build rewrites `next-env.d.ts` back to the committed text; if it stays
dirty, say so).

0.4 Assumption checks A2, A4, A5, A8 exactly as the table in section 3 says, with file:line evidence in the report.

0.5 Report in the format of section 6, then **STOP: branch base.** Ask Gaffer to choose between the options in
section 7, decision 1 (recommended: `git.exe switch -c feat/puskesmas-flow 08b31f78`). This stop is an
approval-needing action: call `jev_route` first when the tool is available and state `Jev: <action> (<reason>)`
(capsule `AGENTS.md:5`); if Jev is unavailable or errors, say so and continue on the normal safe path. Do not create
the branch before the answer. Phases 1-5 run on the chosen branch.

### Phase 1 - Foundations: deterministic case-guide library and fallback provenance (lib only)

Why first: every later phase reads these pure functions, and this is the only phase that touches anything that is
persisted (one string block inside an existing field). **Zero new persisted fields**: the storage key, `Workspace.version`
and every record shape stay as they are, so the additive rule is met by construction; task 1.4 adds the test that pins it.

Tasks:

1.1 `src/lib/note-structure.ts`: add one alias to `aliases` (`:4-20`): `"tanda vital": "examination"`. A "Tanda vital:
TD 120/80, N 88" line then lands in the examination bucket, which the SOAP note's "Pemeriksaan Fisik"/"Examination"
section and the guide's O row read. No other change to `structureNote`.

1.2 New file `src/lib/soap.ts` (justified: it composes `note-structure.ts`, `readCaseFields`/`invalidCaseField` from
`aadi/composer.ts` and `missingField`/`insertTemplate` from `clinical-templates.ts`; putting it in `drafts.ts` would
make every `drafts.ts` consumer load `aadi/composer.ts` and through it `presentation.ts` and the TheOracle catalogue).
Exports, all pure and deterministic:

```ts
import type { ModeId } from "./drafts";
import type { CaseFields } from "./aadi/composer";

export type GuideKey = "concern" | "age" | "sex" | "vitals" | "history" | "examination" | "assessment" | "plan";
export interface GuideItem { key: GuideKey; label: string; filled: boolean; skeleton: string }
/** The items the guide checks for a mode: six for the five analysis modes, eight for "clinic", none elsewhere. */
export function guideItems(mode: ModeId): GuideKey[];
/** Each item with its filled state, read from labelled text, the strip and the saved patient only. */
export function caseGuide(text: string, fields: CaseFields, hints: { patientAge?: string; patientSex?: "M" | "F" }, mode: ModeId): GuideItem[];
/** The strip's readable vitals as one line ("TD 170/100 mmHg · Nadi 98/mnt · Suhu 38,5 °C · RR 22/mnt · SpO₂ 95%"); "" when none. */
export function vitalsLine(fields: CaseFields): string;
/** S/O/A/P rows from the typed text and the strip; an empty row carries `missingField`. Never infers A or P. */
export function soapView(text: string, fields: CaseFields): { key: "S" | "O" | "A" | "P"; label: string; text: string }[];
/** What an insert chip puts in the composer: the skeleton after the text (insertTemplate), with unlabelled text first
 *  given the complaint label so it stays the complaint once the text has structure (section 7, decision 9). */
export function insertSection(prompt: string, skeleton: string): string;
```

Rules the functions follow (write them as the tests):

- `guideItems`: `composerUsesAadi(mode, false)` (import it) → `["concern", "age", "sex", "vitals", "history", "examination"]`;
  `mode === "clinic"` → those plus `["assessment", "plan"]`; any other mode → `[]`.
- Labels and skeletons (the skeleton is what the insert chip appends through `insertTemplate`):
  concern "Keluhan utama" / `"Keluhan utama: "`; age "Usia" / `"Usia: "`; sex "Jenis kelamin" / `"Jenis kelamin: "`;
  vitals "Tanda vital" / `"Tanda vital: "`; history "Anamnesis" / `"Anamnesis: "`; examination "Pemeriksaan fisik" /
  `"Pemeriksaan fisik: "`; assessment "Asesmen" / `"Asesmen: "`; plan "Rencana" / `"Rencana: "`. Every label is an
  alias `structureNote` already reads (`note-structure.ts:5-11`) or a label `readCaseFields` reads (`usia`, the sex
  words, `TD`/`N`/`S`/`RR`/`SpO2` on the vitals line), so what the chip inserts is what the drafts parse.
- Filled rules, with `note = structureNote(text)`: concern = `note.fields.concern` or (`!note.recognized` and text is
  not blank: unlabelled free text is the complaint, as `createDraft` treats it at `drafts.ts:85`); age = `fields.age`
  non-blank and not `invalidCaseField("age", ...)`, else `hints.patientAge`; sex = `fields.sex` is `"M"`/`"F"`, else
  `hints.patientSex`; vitals = any of `bp`, `heartRate`, `temperature`, `respiratoryRate`, `spo2` non-blank and valid;
  history = `note.fields.history`; examination = `note.fields.examination`; assessment = `note.fields.assessment`;
  plan = `note.fields.plan` or `note.fields.followup`. An unlabelled number never fills anything (that is
  `readCaseFields`' own rule, `composer.ts:40-62`).
- `soapView` rows: S = concern (or the whole text when `!note.recognized`), history, associated, background,
  medications, allergies; O = `vitalsLine(fields)`, examination, investigations; A = assessment, differential;
  P = plan, followup. Each row joins its present fields with "\n"; an empty row's `text` is `missingField` (imported,
  never retyped). Labels: "S — Subjektif", "O — Objektif", "A — Asesmen", "P — Rencana".
- `insertSection(prompt, skeleton)`: `const base = prompt.trim() && !structureNote(prompt).recognized ? `Keluhan utama: ${prompt.trimStart()}` : prompt; return insertTemplate(base, skeleton);`.
  Why: `structureNote` (`note-structure.ts:29-43`) treats unlabelled text as the complaint only while *nothing* is
  labelled (`recognized` false, `drafts.ts:85`); the first labelled line would otherwise orphan the narrative (the
  guide's "Keluhan utama" would flip back to missing and the SOAP note's "Keluhan Utama" would be empty). Labelling
  it once, at the first chip, keeps the guide, `soapView` and `createDraft` consistent. A blank prompt gets the
  skeleton only; labelled text is never prefixed.

1.3 `src/lib/workspace-session.ts`, `localDraftMessages` (`:34-47`): add an optional `fallback?: string` to its
argument object. When given, append one more block to `sourceText`, after "Preferensi format":
`Analisis AADI tidak tersedia\n${fallback}`. Nothing else changes; the existing test at
`tests/workspace-session.test.ts:52` (block order without `fallback`) keeps passing.

1.4 Tests (test-first):

- New `tests/soap.test.ts`:
  - `describe("case guide")`: "lists six items for an analysis mode, eight for the SOAP note and none for other modes";
    "reads a filled item from labelled text, the strip or the saved patient, never from an unlabelled number"
    (cases: `"Laki-laki 45 tahun, nyeri kepala hebat sejak 2 jam, TD 170/100"` with the strip auto-filled gives
    concern/age/sex/vitals filled and history/examination missing; `"Anamnesis: demam 3 hari"` gives history filled
    and concern missing; `"demam 39"` fills nothing beyond concern; patient hints fill age and sex when the strip is
    empty); "pairs every item with the skeleton its chip inserts, and the skeleton is a label the drafts read"
    (for each item: `structureNote(skeleton + "x").fields` or `readCaseFields` reads it back, except the two
    demographic labels, which `readCaseFields` reads: `"Usia: 45"` → age, `"Jenis kelamin: perempuan"` → sex);
    "labels unlabelled text as the complaint when the first section is inserted, and leaves labelled or blank text
    as it is" (`insertSection("Laki-laki 45 tahun, nyeri kepala", "Pemeriksaan fisik: ")` →
    `"Keluhan utama: Laki-laki 45 tahun, nyeri kepala\n\nPemeriksaan fisik: "`; a second insert on that result adds only
    the skeleton; `insertSection("", "Anamnesis: ")` → `"Anamnesis: "`; after the first insert `caseGuide` still
    reports the complaint filled and `createDraft({ mode: "clinic" })` fills "## Keluhan Utama").
  - `describe("SOAP view")`: "builds S/O/A/P from labelled text and the strip without inferring assessment or plan";
    "marks an empty row with the clinician placeholder" (`missingField`, not a retyped string); "puts a Tanda vital
    line into the objective row" (the alias of 1.1); "keeps unlabelled free text as the subjective row".
  - `describe("vitals line")`: "lists only readable strip values, in strip order, with units".
- `tests/workspace-session.test.ts`, `describe("a local draft")`: add "records why a local draft stood in for a
  failed analysis, after the format block, and changes nothing else" (`fallback: "Layanan analisis tidak dapat
  dihubungi atau respons tidak dapat dibaca."` → the last block starts `Analisis AADI tidak tersedia`; without
  `fallback` the block list is unchanged).
- `tests/workspace-fixtures.test.ts`, `describe("frozen v1 workspaces")`: add "keeps a field it does not know on a
  saved message and encounter" (parse `v1-workflow.json` with `{ "puskesmas": { "note": "fiktif" } }` added to the
  assistant message and to the encounter; `parseWorkspace` returns them unchanged). This is A2 as a test and the
  guard the additive rule needs.

1.5 Docs: if Gaffer said yes to decision 6, copy this plan to `docs/plans/active/2026-10-20-puskesmas-flow.md`
(verbatim, English). Then task H.

H (every phase) `.agents/HANDOFF.md`: one entry for the whole Puskesmas flow, newest first, headed
`## Puskesmas clinical flow, phase <n> of 5 (<status>) - 2026-10-20 Asia/Jakarta`, updated in place each phase with:
what changed (files), tests added (names, counts), the gate table, the commit hash once committed (AGENTS.md:18),
open risks, next phase. HANDOFF already holds six entries and AGENTS.md:17 keeps five: when the Phase 1 entry is
added, move the two oldest entries ("Answer reveal streams like a chat reply..." and "Beta image built in CI, the
server only pulls...") verbatim to the top of `.agents/HANDOFF.archive.md` under
`## Archived on 2026-10-20 - handoff rotation for the Puskesmas flow (newest five kept)`. If Gaffer said yes to
decision 7, also change "(local, not committed)" to "(committed in 08b31f78)" in the status line of the five entries
whose work is in that commit; otherwise leave them.

Acceptance criteria:

- `npx vitest run tests/soap.test.ts tests/workspace-session.test.ts tests/workspace-fixtures.test.ts tests/workspace.test.ts tests/studio.test.ts` all pass; `tests/workspace.test.ts` "builds $label" x18 still passes with the new alias.
- `git.exe diff --stat` shows only `src/lib/note-structure.ts`, `src/lib/soap.ts`, `src/lib/workspace-session.ts`, the three test files, HANDOFF (+ archive), and the plan copy if chosen.
- `grep -n "Belum tersedia" src/lib/soap.ts` returns nothing (the label is imported, never retyped).
- No UI change; `npm run build` unchanged in behaviour.
- Gate (section 5) all 0.

Commit: `feat(sentrapedia): case guide library and fallback provenance for the Puskesmas flow (R1)`

### Phase 2 - Completeness strip with section-insert chips (features 1 and 2)

Design: one row under the composer box, outside `form.composer` (the box keeps its committed design, which Gaffer
guarded on 2026-10-20: "kamu rusakkan desain kolom text user"), shown only in the modes `guideItems` names and only
once the doctor has typed something. Filled items show as marks; missing items are chips that insert the item's
skeleton after the text and put the caret after the label.

Tasks:

2.1 New file `src/components/case-guide.tsx` (justified: the guide is a self-contained client component with its own
state in Phase 3, and `composer.tsx` is already 154 dense lines). Export
`CaseGuide({ prompt, mode, fields, patientAge, patientSex, onInsert })` (Phase 3 adds `onMode`; do not declare it here,
an unused prop is lint litter):

- `const items = caseGuide(prompt, fields, { patientAge, patientSex }, mode)`; render nothing when `items.length === 0`
  or `!prompt.trim()`.
- Markup: `<div className="case-guide" role="group" aria-label="Kelengkapan kasus">` containing
  `<span className="case-guide-count">Kelengkapan kasus: {filled} dari {items.length}</span>` (plain text, no live
  region: it changes on every keystroke), then for each item: filled →
  `<span className="case-guide-item" data-filled>{label}<Check size={12} role="img" aria-label="terisi"/></span>`
  (no `aria-label` on the span itself: ARIA 1.2 prohibits it on a generic element; the icon carries the state, so
  assistive tech reads "Keluhan utama terisi");
  missing → `<button type="button" className="action-chip case-guide-item" aria-label={`Sisipkan ${label}`} title={hint} onClick={() => onInsert(skeleton)}><Plus size={12} aria-hidden="true"/>{label}</button>`.
  Hints (title): vitals "Contoh: TD 120/80, N 88, RR 20, S 36,8, SpO2 98"; age "Contoh: Usia: 45"; sex "laki-laki
  atau perempuan"; the others "Ketik setelah label".
- Icons from `lucide-react` (`Check`, `Plus`; already a dependency).

2.2 `src/components/composer.tsx`:

- Add `const box = useRef<HTMLTextAreaElement>(null)` and `ref={box}` on the existing textarea (`:136`), nothing else
  on that element.
- Insert handler: `const insert = (skeleton: string) => { const next = insertSection(props.prompt, skeleton); props.onPrompt(next); requestAnimationFrame(() => { box.current?.focus(); box.current?.setSelectionRange(next.length, next.length); }); };`
  (`insertSection` from `../lib/soap`, Phase 1; it wraps `insertTemplate`, the function the template library uses,
  `clinical-templates.ts:39-41`).
- Render `<CaseGuide prompt={props.prompt} mode={props.mode} fields={props.caseFields ?? emptyCaseFields()} patientAge={props.patientAge} patientSex={props.patientSex} onInsert={insert}/>`
  right after `</form>` (`:147`) and before the dictation/analysis error lines (`:148-149`). `caseFields` is always
  passed by `workspace.tsx:142`, in every mode, because `updatePrompt` (`:89-93`) reads the text in every mode.
- No change to the toolbar, the strip, the send button, the slash picker or the quick actions.

2.3 `src/app/globals.css`: append one block at the end of the file (after its last line, 901, the end of the
phone-fold block), tokens only:

```css
/* Puskesmas flow: the case guide under the composer (phase 2), one wrapping row, no animation. */
.case-guide { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 8px 0 0; font-size: 12px; color: var(--color-text-secondary); }
.case-guide-count { margin-right: 4px; }
.case-guide-item { display: inline-flex; align-items: center; gap: 5px; }
.case-guide .action-chip { height: 28px; padding: 0 9px; font-size: 12px; }
.case-guide-item[data-filled] { height: 28px; padding: 0 9px; border: 1px solid var(--color-border-subtle); border-radius: var(--radius); background: var(--workspace-accent-soft); color: var(--workspace-accent-ink); }
```

Chips are `<button>`s, so `globals.css:50` (`button:focus-visible { outline: 2px solid var(--workspace-focus) }`)
gives the focus ring; `flex-wrap` keeps 400 px free of horizontal scroll; no transition or animation is added (the
global reduce rule at `:604` would neutralise one anyway). Use `--color-text-secondary`, not `--color-text-muted`,
because the row can sit on the surface colour (`tests/design-tokens.test.ts:31,42-49`).

2.4 Tests, new `tests/ui/case-guide.test.tsx` (jsdom pragma, scaffolding as above), `describe("case guide under the composer")`:

- "stays hidden until something is typed and outside the analysis and SOAP modes" (home screen, empty text → no
  group "Kelengkapan kasus"; type a fictional complaint in the default mode → the group appears; click the intent tab
  "Dokumentasi" (its first mode is `clinic`, `studio.ts:10`) → still shown; click the tab "Komunikasi" (first mode
  `education`) → hidden; the text is kept across mode changes, `workspace.tsx:73`).
- "shows missing items as chips, counts the strip's values and the saved patient as filled" (type
  `"Laki-laki 45 tahun, nyeri kepala hebat sejak 2 jam, TD 170/100"` → text "Kelengkapan kasus: 4 dari 6"; inside
  `within(screen.getByRole("group", { name: "Kelengkapan kasus" }))`: `getAllByRole("img", { name: "terisi" })` has
  length 4, and `getByText("Keluhan utama").closest(".case-guide-item")` has `data-filled` (same for "Usia", "Jenis
  kelamin", "Tanda vital"); buttons "Sisipkan Anamnesis" and "Sisipkan Pemeriksaan fisik" exist).
- "inserts the section skeleton after the typed text, labelling the complaint once, and keeps what is typed" (click
  "Sisipkan Pemeriksaan fisik" → textarea value is `"Keluhan utama: <text>\n\nPemeriksaan fisik: "`; "Keluhan utama"
  stays filled; then `fireEvent.change` with that value plus `"ronki basah halus"` after the label → "5 dari 6" and
  the "Sisipkan Pemeriksaan fisik" chip is gone; a second chip, "Sisipkan Anamnesis", appends only its skeleton).
  The caret position is a browser-check item, not asserted in jsdom.
- "keeps the case strip's own behaviour" (after the chip insert, the strip group "Usia, jenis kelamin, dan tanda
  vital" still shows the auto-read TD; the send button "Analisis kasus" is still the only button by that exact name).
- Existing pins that must still pass unchanged: `tests/ui/case-strip.test.tsx:68,83` (no strip group after an answer;
  the guide is hidden too because the prompt is empty), `:73-74` ("Tindakan cepat" and the combobox).

Acceptance criteria:

- The guide is absent on the home screen before typing and in any mode outside the five analysis modes and `clinic`.
- A chip inserts exactly `insertSection(prompt, skeleton)`; nothing typed is removed (the first chip may prefix unlabelled text with "Keluhan utama: ", decision 9); the inserted label is read back by `structureNote`/`readCaseFields` (Phase 1 tests).
- Keyboard: Tab reaches every chip, Enter/Space activates, focus ring visible; every chip has an `aria-label` starting "Sisipkan".
- Browser check (optional for the implementer; required before beta): `npx next dev -p 3106` with no engine, 1440x900 and 400x844: no horizontal page scroll, the composer box unchanged, chips wrap. Never run a browser against a server with the engine up unless every non-GET `/api/aadi` is aborted at the network layer (HANDOFF, rename entry, "Safety").
- Gate all 0; `tests/ui/case-strip.test.tsx` and `tests/ui/workspace-smoke.test.tsx` unchanged and passing.

Commit: `feat(sentrapedia): completeness strip with section-insert chips under the composer (R1)`

### Phase 3 - Guided SOAP view (feature 3)

Design: a toggle in the guide row opens a four-row S/O/A/P preview built by `soapView` from the typed text and the
strip, updated as the doctor types, with `missingField` in empty rows and one action that switches the composer to
the local SOAP mode. Nothing is sent or saved by the view itself.

Tasks:

3.1 `src/components/case-guide.tsx`: add the prop `onMode: (mode: ModeId) => void` (passed from `composer.tsx` as
`onMode={props.onMode}`), `const [soapOpen, setSoapOpen] = useState(false)` and `const id = useId()`.
After the items, render
`<button type="button" className="text-button" aria-expanded={soapOpen} aria-controls={`${id}-soap`} onClick={() => setSoapOpen(!soapOpen)}>{soapOpen ? "Sembunyikan susunan SOAP" : "Susunan SOAP"}</button>`.
When open: `<div id={`${id}-soap`} className="soap-view" role="region" aria-label="Susunan SOAP">` with, for each row
of `soapView(prompt, fields)`, `<div className="soap-row" data-empty={text === missingField || undefined}><strong>{label}</strong><span>{text}</span></div>`,
then `<p className="panel-caption">Disusun lokal dari teks yang diketik; bukan interpretasi klinis.</p>` and, when
`mode !== "clinic"`, `<button type="button" className="button" onClick={() => onMode("clinic")}>Gunakan mode Catatan Klinis (SOAP)</button>`.
Pressing Enter afterwards creates the local SOAP draft through the existing `generate` path (`createDraft`,
`drafts.ts:42,63`); the view adds no new draft path.

3.2 `src/app/globals.css`, appended to the Phase 2 block:

```css
.soap-view { flex-basis: 100%; display: grid; gap: 6px; padding: 8px 10px; border: 1px solid var(--color-border-subtle); border-radius: var(--radius); background: var(--workspace-white); color: var(--color-text-secondary); font-size: 12px; line-height: 1.6; }
.soap-row { display: grid; grid-template-columns: 7.5em 1fr; gap: 8px; overflow-wrap: anywhere; white-space: pre-line; }
.soap-row strong { color: var(--color-text-primary); }
.soap-row[data-empty] span { color: var(--color-text-secondary); font-style: italic; }
@media (max-width: 760px) { .soap-row { grid-template-columns: 1fr; gap: 2px; } }
```

(`(max-width: 760px)` is the literal `mobileQuery`; `tests/layout-constants.test.ts` keeps CSS and JS equal.)

3.3 Tests, `tests/ui/case-guide.test.tsx`, add `describe("guided SOAP view")`:

- "opens behind a toggle and shows S/O/A/P from the typed text with the placeholder in empty rows" (type
  `"Keluhan utama: demam 3 hari\nTanda vital: TD 120/80, N 88"` in the SOAP mode; click "Susunan SOAP"; region
  "Susunan SOAP" has "S — Subjektif" with "demam 3 hari", "O — Objektif" containing "TD 120/80 mmHg" and "Nadi 88/mnt"
  and the Tanda vital line, "A — Asesmen" and "P — Rencana" each showing `missingField`; `aria-expanded` toggles).
- "switches to the SOAP mode and Enter makes the local draft without any analysis call" (from the default mode:
  type `"Keluhan utama: demam 3 hari"`, click "Susunan SOAP", then click "Gunakan mode Catatan Klinis (SOAP)";
  the combobox shows "Catatan Klinis (SOAP)"; press Enter in the textarea (`fireEvent.keyDown(textarea, { key: "Enter" })`);
  an assistant card headed "Catatan Klinis (SOAP)" with badge "Draf lokal" appears; `sent` (POSTs) stays `[]`; the
  content contains "## Keluhan Utama" and the typed complaint and no "## " section with "Diagnosis" filled).
- "never shows a diagnosis, code or drug in the SOAP rows for free text" (type a narrative; A and P rows equal `missingField`).

Acceptance criteria:

- The view renders only from `soapView` (no component-side parsing); A and P come only from labelled "Asesmen:"/"Rencana:"/"Tindak lanjut:" lines.
- Keyboard: the toggle is a button with `aria-expanded`/`aria-controls`; the region has an accessible name; focus ring visible.
- 400 px: rows stack (one column); no horizontal scroll; long words wrap (`overflow-wrap: anywhere`).
- Reveal, thinking card, focus trap, shortcuts untouched (no file under those features is edited: `typing.ts`, `thinking-card.tsx`, `diagnosis-document.tsx`, `dialog.tsx`, `workspace-session.ts` `shortcutFor`).
- Gate all 0.

Commit: `feat(sentrapedia): guided SOAP view from the typed case (R1)`

### Phase 4 - Error fallback to a local draft (feature 5)

Design: when an AADI analysis fails, the composer's existing error line (`composer.tsx:149`: message + "Coba lagi")
gains a second button that builds the local SOAP note from the same text through `createDraft`, with no analysis
call, and records why in the draft's source. It is offered, never automatic. The target mode is `clinic`
(section 7, decision 3).

Tasks:

4.1 `src/components/workspace.tsx`:

- `generate(text = prompt, selectedMode = mode, useTemplate = true, local = false)` (`:120`): the AADI branch (`:125`)
  becomes `if (!local && composerUsesAadi(selectedMode, !!personal))`. Add an optional fifth argument
  `fallback?: string` passed through to `localDraftMessages({ ..., fallback })` (`:129`).
- New `function fallbackDraft() { if (!prompt.trim() || busy) return; const reason = analysisError; setAnalysisError(""); generate(prompt, "clinic", false, true, reason); notify("Draf SOAP lokal disusun tanpa analisis AADI. Lengkapi dan verifikasi oleh klinisi."); }`
  placed next to `startReferral` (`:95-99`). The prompt is the text the failed analysis put back (`:115`); the composer
  mode is not changed (the draft's own mode is `clinic`, so its card is headed "Catatan Klinis (SOAP)").
  `generate` already clears the prompt and adds the encounter when there is none.
- Pass `onFallback: fallbackDraft` in `composerProps` (`:141`).

4.2 `src/components/composer.tsx`: `Props` gains `onFallback?: () => void`. The error line (`:149`) becomes
`{props.analysisError} {props.prompt.trim() && !props.busy && <><button type="button" className="text-button" onClick={props.onSubmit}>Coba lagi</button> {props.onFallback && <button type="button" className="text-button" onClick={props.onFallback}>Susun draf SOAP lokal</button>}</>}`.
Both stay inside the existing `role="alert"` paragraph, as today.

4.3 Tests, new `tests/ui/draft-actions.test.tsx` (jsdom pragma; its `fetch` mock answers POST with
`new Response(JSON.stringify({ error: { code: "UPSTREAM_UNAVAILABLE", message: "Layanan analisis sedang tidak tersedia." } }), { status: 502, headers: { "Content-Type": "application/json" } })`
when a module-level flag `failAnalysis` is true, else with the fixture of `tests/ui/case-strip.test.tsx:9-18`),
`describe("local draft when the analysis fails")`:

- "offers a local SOAP draft next to Coba lagi, keeps the typed text, and sends nothing more" (type a fictional case,
  click "Analisis kasus"; the alert contains "Layanan analisis sedang tidak tersedia." and buttons "Coba lagi" and
  "Susun draf SOAP lokal"; the textarea still holds the text; click the fallback; an assistant card headed
  "Catatan Klinis (SOAP)" with badge "Draf lokal" appears; the alert is gone; the textarea is empty; `sent` has
  exactly 1 POST; a status toast contains "tanpa analisis AADI").
- "records the failure in the draft's source and never a diagnosis" (read the saved workspace from
  `localStorage.getItem(storageKey)`; the assistant message's `sourceText` contains
  `"Analisis AADI tidak tersedia\nLayanan analisis sedang tidak tersedia."`; its `content` contains `missingField`
  for the assessment section and contains no ICD-10 pattern `/\b[A-Z]\d{2}(\.\d)?\b/`; `hasAadiSource` is false).
- "withdraws both offers once the text is cleared" (after the failure, clear the textarea → neither "Coba lagi" nor
  "Susun draf SOAP lokal" is rendered; the existing condition at `composer.tsx:149` governs both).

4.4 Browser check (recommended, no cost): `npx next dev -p 3106` alone starts no engine, so `AADI_SERVICE_URL` and
`AADI_SERVICE_TOKEN` are unset and every POST fails at the gateway with 503 `NOT_CONFIGURED`, "Token koneksi layanan
analisis belum dikonfigurasi pada server workspace." (`src/lib/aadi/gateway.ts:81`, wired in
`src/app/api/aadi/route.ts`). The fallback can then be exercised end to end without any paid call. Phase 0 re-reads
that line; if the path has changed, skip the browser check and say so.

Acceptance criteria:

- The fallback is a button in the error line; nothing runs automatically on failure; `analysisError` is cleared when the draft is made.
- The draft is `createDraft({ mode: "clinic" })` output: deterministic, `missingField` in sections without labelled input, no diagnosis/code/drug.
- `sourceText` carries the reason block from Phase 1; no new `Message` field.
- `tests/ui/case-strip.test.tsx` and `tests/ui/workspace-smoke.test.tsx` unchanged and passing.
- Gate all 0.

Commit: `feat(sentrapedia): local SOAP draft when an AADI analysis fails (R1)`

### Phase 5 - P-Care field copies and next-step chips (features 4 and 6)

Design: the existing quick-copy row on an answer card (`message-card.tsx:47`, design D1/D2) is reorganised by P-Care's
entry fields and extended to local SOAP drafts; a second row offers next steps that only prefill the composer in an
existing mode, generalising the approved "Surat rujukan" button (design D4, `workspace.tsx:95-99`). Both rows sit
below the document, where the reveal's scroll logic never looks (`workspace-views.tsx:67` measures the text start
against the card top; rows under `DocumentStudio` do not move it).

Tasks:

5.1 `src/lib/aadi/presentation.ts`, next to `summaryCopies` (`:292-299`) and `referralPrompt` (`:303-320`):

- `const shortVitals = (vitals: CaseState["vitals"]) => [...]` → "TD 160/95 mmHg; Nadi 98/mnt; Napas 22/mnt; Suhu 38,5 °C; SpO₂ 95%" (only present keys, in that order; decimal comma for temperature as the UI writes it).
- `export interface PcareCopy { field: string; label: string; value: string; done: string }` and
  `export function pcareCopies(message: Pick<Message, "sourceText" | "mode">, content: string): PcareCopy[]`:
  - AADI answer (`hasAadiSource`, `validCase(source.case)`): in P-Care's order:
    Keluhan → `label "Keluhan"`, `value` = chief complaint + the history text without the "Konteks Encounter" prefix
    and without the "Catatan kasus" block (same split as `referralPrompt`, `:308-310`), joined with "\n";
    Pemeriksaan fisik → `shortVitals` + `physicalExam` joined with "; " (only when non-empty);
    Diagnosa → one entry per code of `summaryCopies(content).codes` (as the doctor edited it), `label "Diagnosa <code>"`,
    `value` = the code alone, `done` = `"Kode kandidat <code> disalin. Konfirmasi diagnosis sebelum dientri."`;
    Terapi → `summaryCopies(content).therapy` when non-empty (the gated line, wording unchanged), `done "Terapi usulan disalin."`;
    Alergi → `allergies` joined with ", " when non-empty.
  - Local draft (not AADI): map `documentSections(content)` by title, skipping sections where `emptySection(body)`:
    "Keluhan Utama" + "Riwayat Penyakit" (or "Chief concern" + "History of present illness") → Keluhan;
    "Pemeriksaan Fisik"/"Examination" → Pemeriksaan fisik; "Assessment" → `label "Diagnosa (teks)"`, value = the
    section text (no code is made); "Tata Laksana"/"Plan" → Terapi; "Riwayat Pengobatan / Alergi" is mixed and is not mapped.
  - Every entry's `done` defaults to `"<label> disalin."`.
- `export interface NextStep { mode: ModeId; label: string; text: string }` and
  `export function nextSteps(message: Pick<Message, "sourceText" | "mode" | "role">): NextStep[]`:
  - AADI answer: `[{ mode: "clinic", label: "Catatan SOAP", text: soapPrompt(source) }, { mode: "referral", label: "Surat rujukan", text: referralPrompt(message) }, ...(nextBestActions.length ? [{ mode: "tasks", label: "Daftar tugas", text: tasksPrompt(source) }] : [])]`.
  - Local assistant draft whose `sourceText` starts with `"Input\n"`: `input` = that block up to the first `"\n\n"`;
    steps `[{ mode: "question", label: "Analisis AADI" }, { mode: "workup", label: "Pemeriksaan penunjang" }, { mode: "icd10", label: "Kode ICD-10" }, { mode: "referral", label: "Surat rujukan" }]`
    each with `text: input`, minus the step whose `mode` equals `message.mode`. (The label is "Analisis AADI", not
    "Analisis kasus": the send button's aria-label is "Analisis kasus" (`composer.tsx:145`) and
    `tests/ui/workspace-smoke.test.tsx:201` queries it by regex; a second button with that text would make `getByRole` throw.)
  - Anything else: `[]`.
- `soapPrompt(source)`: labelled lines the local SOAP draft reads: `Keluhan utama: <chiefComplaint>`,
  `Anamnesis: <history>` (as in `referralPrompt`), `Tanda vital: TD s/d, N hr, RR rr, S t, SpO2 s` (only present keys; these
  are the labels `readCaseFields` reads), `Pemeriksaan fisik: <physicalExam; results>`, `Obat: <currentMedications>`,
  `Alergi: <allergies>`, `Asesmen: Diagnosis kerja (kandidat AADI, belum terkonfirmasi): <label (code)>; ...` (only
  when `likely` is non-empty; the same wording as `referralPrompt`), and always `Rencana: ` left empty. The plan is
  the doctor's (`clinical-templates.ts:14` rule); the gated regimen is never copied into it.
- `tasksPrompt(source)`: one line per `nextBestActions` item, `"<Tanyakan|Periksa|Pemeriksaan penunjang>: <item>"`
  (kind question/exam/test); the tasks mode turns each line into a checkbox (`drafts.ts:80`).

5.2 `src/components/message-card.tsx`:

- Props: replace `onReferral?: (text: string) => void` with `onStep?: (mode: ModeId, text: string) => void`
  (`import type { ModeId } from "../lib/drafts"`).
- `const copies = pcareCopies(message, content)` (replaces `summaryCopies` for the row; `summaryCopies` stays for
  "Salin ringkas"); `const steps = onStep ? nextSteps(message) : []`.
- Row 1 (replaces `:47`): `{copies.length > 0 && !editing && <div className="quick-copy" role="group" aria-label="Salin ke P-Care"><span>Salin ke P-Care:</span>{copies.map(item => <button type="button" key={item.field + item.label} className="action-chip" title={item.value} aria-label={`Salin ${item.field === "Diagnosa" ? `${item.value} — ${item.name}` : item.label} ke ${item.field} P-Care${item.field === "Diagnosa" ? " (kandidat, belum terkonfirmasi)" : ""}`} onClick={() => copyText(item.value, item.done)}>{item.label}</button>)}</div>}`.
  For the Diagnosa chip the aria-label therefore starts `Salin G44.2 — Tension-type headache ...`, so
  `tests/ui/case-strip.test.tsx:79` (`/^Salin G44\.2 — /`) keeps passing; give `PcareCopy` an optional `name` for it.
- Row 2 (new, after `</footer>`, `:48`): `{steps.length > 0 && !editing && <div className="next-steps" role="group" aria-label="Langkah berikutnya"><span>Lanjut:</span>{steps.map(step => <button type="button" key={step.mode} className="action-chip" onClick={() => onStep!(step.mode, step.text)}>{step.label}</button>)}</div>}`.
  Remove the footer "Surat rujukan" button (`:48`); the chip of the same name replaces it, so
  `tests/ui/case-strip.test.tsx:80` (`/Surat rujukan/`) still finds exactly one button.
- Keep "Salin", "Salin ringkas", "Edit", "Unduh" and the review badge as they are.

5.3 `src/components/workspace.tsx`: rename `startReferral(text)` (`:95-99`) to
`startStep(next: ModeId, text: string)`: `changeMode(next); updatePrompt(text);` the same focus `requestAnimationFrame`,
then `notify(stepToast(next))` where `stepToast` returns, for `referral`, the existing sentence
"Draf surat rujukan siap di kolom. Lengkapi penerima dan permintaan, lalu tekan Enter."; for other local modes
`"Mode ${label} siap dengan data kasus. Lengkapi, lalu tekan Enter."`; for AADI modes (`composerUsesAadi(next, false)`)
`"Mode ${label} siap dengan teks kasus. Tekan Enter untuk menjalankan analisis AADI."` (`label` from `modes`).
Pass `onStep={startStep}` to `Conversation` (`:163`).

5.4 `src/components/workspace-views.tsx`: `Conversation` prop `onReferral?: (text: string) => void` (`:49`) becomes
`onStep?: (mode: ModeId, text: string) => void` and is passed to `MessageCard` as `onStep` (`:110`). No other change in
this file (the scroll logic at `:54-107` is the reveal's).

5.5 `src/app/globals.css`: extend the existing selector at `:889` to `.quick-copy, .next-steps { ... }` and `:890` to
`.quick-copy .action-chip, .next-steps .action-chip { ... }` (two selector additions, no new declarations).

5.6 `tests/ui/case-strip.test.tsx:78`: change the group name to `"Salin ke P-Care"`. No other line changes (`:79-83`
keep passing by the aria-label and chip-name rules above).

5.7 Tests:

- `tests/diagnosis-presentation.test.ts`, extend `describe("copy and referral from an analysis")` (`:476`):
  - "copies the P-Care fields the draft has, in P-Care's order, with the code alone for Diagnosa" (fixture analysis
    with complaint, history, vitals, exam, allergies, one likely code, gated therapy → fields
    `["Keluhan", "Pemeriksaan fisik", "Diagnosa", "Terapi", "Alergi"]`, Diagnosa `value === "J18.9"`, `done` contains
    "Konfirmasi diagnosis"; with empty exam and allergies those two entries are absent).
  - "copies the codes and therapy as the doctor edited them" (edit the summary's code in `content` → the Diagnosa chip follows).
  - "maps a local SOAP draft's filled sections to P-Care fields and skips the placeholder" (`createDraft({ mode: "clinic", ... })`
    with labelled input → Keluhan, Pemeriksaan fisik, "Diagnosa (teks)", Terapi; with free text → Keluhan only).
  - "offers local next steps after an analysis, prefilled from recorded facts, with the plan left to the doctor"
    (`nextSteps(aadiMessage(fixture))` → modes `["clinic", "referral", "tasks"]`; the SOAP text has
    `"Keluhan utama: "`, `"Tanda vital: TD 160/95"`, `"Asesmen: Diagnosis kerja (kandidat AADI, belum terkonfirmasi): Pneumonia (J18.9)"`,
    ends with `"Rencana: "`, and does not contain "Amoxicillin"; the tasks text has one line per action).
  - "offers analysis steps after a local draft, without the draft's own mode" (local clinic draft from
    `localDraftMessages` → modes `["question", "workup", "icd10", "referral"]`, every `text` equals the input; a local
    referral draft omits `referral`; a user message gives `[]`).
- `tests/ui/draft-actions.test.tsx`, add `describe("next steps and P-Care copies")`:
  - "routes a next step into the composer in its mode, prefilled, and says what Enter will do" (seed a local clinic
    draft through the fallback flow or `localStorage`; click "Pemeriksaan penunjang" inside
    `within(screen.getByRole("group", { name: "Langkah berikutnya" }))`, because the quick actions under the composer
    carry the near-identical "Pemeriksaan Penunjang"; the combobox shows "Pemeriksaan Penunjang"; the textarea holds
    the input; a status toast contains "Tekan Enter untuk menjalankan analisis AADI"; `sent` has no new POST).
  - "copies a P-Care field and warns on a candidate code" (mock `navigator.clipboard.writeText`; click "Diagnosa G44.2"
    on the fixture answer → clipboard receives `"G44.2"`; toast contains "Konfirmasi diagnosis"; click "Keluhan" →
    clipboard receives the complaint text).

Acceptance criteria:

- Every P-Care chip copies only a value present in the draft; a field without a value has no chip; the Diagnosa value is the bare code and its toast carries the candidate warning.
- A next-step chip never calls `/api/aadi`; it only changes the mode, fills the composer, focuses it and toasts. Prefill text is recorded facts and AADI's own labelled candidates; the plan line is empty.
- "Surat rujukan" behaves exactly as before (same prefill, same toast) from its new place.
- No new `## ` section is added to any AADI content (`tests/ui/workspace-smoke.test.tsx:228` pins the nine-part navigation).
- Both rows are below the document; the reveal timing and scroll are unchanged (`tests/ui/diagnosis-fold.test.tsx`, `diagnosis-phone-fold`, `typing-*` pass untouched).
- 400 px: both rows wrap; no horizontal scroll; chips keyboard-operable with the global focus ring.
- Gate all 0.

Commit: `feat(sentrapedia): P-Care field copies and next-step chips on drafts (R1)`

### Phase 6 - Data-policy copy and the synthetic/de-identified data contract (NOT IN THIS RUN)

Outline only, for a later run with Gaffer's prior approval (R3: it touches the privacy posture):

- Copy: the "Tentang workspace ini"/legal dialogs (`src/components/workspace-dialogs.tsx`), the cockpit footnote
  "Tersimpan di browser · Data fiktif" (`clinical-panel.tsx:28`), the library form's "Saya menggunakan data fiktif"
  checkbox and captions (`aadi-case-form.tsx:44,55`), and whether the main composer should state that it declares the
  case synthetic (`workspace.tsx:108`, `synthetic: true`).
- Contract: `containsIdentity` (`src/lib/aadi/contract.ts:19-21`) and its parity fixture `tests/fixtures/pii-parity.json`
  against the engine's `aadi/service/privacy.py`; whether the P-Care copies (Phase 5) need a client-side identity check
  before the clipboard (they copy from a case the client already refused identities in, so none is planned).
- Out of scope until Gaffer approves; Phases 1-5 do not edit any of these files or strings.

## 5. Verification gate

Run from the capsule root before **every** phase commit; every command must exit 0:

```powershell
npm run typecheck          # tsc --noEmit
npm run lint               # eslint src tests scripts vitest.config.ts, then the site's syntax lint (no edits under apps/site)
npm test                   # the whole suite: vitest run, then the site's node --test
npm run build              # Next standalone + bundled engine/launcher, then the site transform
npm run deploy:dry-run     # no files published, no external call
npx vitest run <each new or touched test file>   # Phase 1: tests/soap.test.ts tests/workspace-session.test.ts tests/workspace-fixtures.test.ts; Phase 2-3: tests/ui/case-guide.test.tsx; Phase 4: tests/ui/draft-actions.test.tsx; Phase 5: tests/diagnosis-presentation.test.ts tests/ui/draft-actions.test.tsx tests/ui/case-strip.test.tsx
```

Then, after the commit:

```powershell
git.exe diff --name-only HEAD~1 HEAD   # must list only paths under projects/healthcare/sentrapedia/, and none under aadi/, apps/site/, nor README.md, .agents/DECISIONS.md, src/lib/aadi/model-profile.ts
git.exe status --short                 # unchanged from Phase 0 (the build rewrites next-env.d.ts back; .gitignore and .playwright-mcp/ stay as they were)
```

**Never use `npm test -- <file>`.** The root `test` script is `vitest run && npm --prefix apps/site test`
(`package.json:17`); npm appends the extra argument to the end of the whole script, so the file name reaches the
site's `node --test` in `apps/site`, which fails with "Could not find 'tests/<file>'" (bundle section 1, exit 1 at the
checkpoint gate). A single file runs with `npx vitest run <file>`.

Notes: `npm test` runs the site's tests too, which is why `apps/site` must stay untouched; `npm run build` takes
minutes (Next build plus the site transform) and needs the capsule's installed `node_modules` (no install in this run:
if a command fails for a missing module, stop and report). `npx vitest list` is a quick read-only check of test names.

## 6. Phase 0 report format

Write the Phase 0 report (and every later phase report) in this order, in English, with file:line evidence:

1. **Phase** - number, title, status (done / stopped at task x.y).
2. **Files changed** - path and one line each (Phase 0: "none").
3. **Tests added** - file, test names, counts (Phase 0: "none").
4. **Gate summary** - one row per command: command, exit code, one line (files/tests/duration for vitest).
5. **Vitest baseline** - `npx vitest run`: files, tests, duration; `npx vitest list`: names and files (344 / 30 expected at the baseline).
6. **Assumptions** - A2, A4, A5, A8 each "confirmed" or "refuted", with the file:line read and the test run.
7. **Branch-base decision for Gaffer** - the two options of section 7 decision 1, the recommendation, and the exact command; then STOP.
8. **Deviations from the plan and why** - any step that could not be done as written, what was found, the smallest alternative (Phase 0: "none" or the list).
9. **Noticed, not touched** - anything seen outside the task, one line each, no action taken.

## 7. Open decisions for Gaffer

1. **Branch base.** The run instructions said "create branch `feat/puskesmas-flow` from `main`", but `main` (`c611cca6`)
   still has `mira/` and `src/lib/mira/`, no `CaseStrip`, no `summaryCopies`/`doctorSummaryTitle`, no nine-part report,
   no reveal stream; the branch is 159 commits ahead and the diff is 510 files. **Recommendation:** create
   `feat/puskesmas-flow` from `08b31f78` (`git.exe switch -c feat/puskesmas-flow 08b31f78`). Today `08b31f78` is the tip
   of `feat/prompt-claude-sonnet-5-5`, so "from 08b31f78" and "from that branch" are the same commit; naming the hash
   keeps the base fixed if that branch moves. Alternative: keep working on `feat/prompt-claude-sonnet-5-5` (no new
   branch); not recommended, its name and its other work (`tools/prompt`) are unrelated.
2. **Completeness items and visibility** (A3). Six items for the five analysis modes, eight for the SOAP mode, shown
   only once text is typed and placed outside the composer box. **Recommendation:** as planned; the box design Gaffer
   restored on 2026-10-20 stays untouched. Alternative: show the guide on the empty home composer too (chips as a
   starting structure); one condition in `CaseGuide`.
3. **Fallback target mode** (Phase 4). **Recommendation:** the local SOAP note (`clinic`) for every failed analysis
   mode: it is the document a Puskesmas doctor needs, and its sections are deterministic. Alternative: the local
   draft of the same mode (`createDraft` has one for all five; a local "PICO" or "Kode ICD-10" draft is mostly
   `missingField`); one argument in `fallbackDraft`.
4. **P-Care field set and the Diagnosa value** (A6). No field list exists in the repo (A8). **Recommendation:** the
   five fields Keluhan, Pemeriksaan fisik, Diagnosa, Terapi, Alergi, in that order, with the Diagnosa chip copying the
   bare code (P-Care's Diagnosa box is a code/name search; "code — name" would not match) and a toast that says the
   code is a candidate to confirm before entry. Alternative: keep copying "code — name" as the approved D2 chips do,
   and let the doctor trim it; or add "Tindakan"/"Keterangan" once Gaffer names them against the live form.
5. **Next steps into AADI modes from a local draft** (A7). **Recommendation:** yes, with the toast "Tekan Enter untuk
   menjalankan analisis AADI" (Enter is the explicit, existing paid action; the chip itself calls nothing).
   Alternative: local modes only after a local draft (drop three entries from `nextSteps`).
6. **Plan copy in the repo.** `.claude/` is gitignored, so the next maintainer cannot reopen this plan; AGENTS.md routes
   plans to `docs/plans/active/`. **Recommendation:** copy it to `docs/plans/active/2026-10-20-puskesmas-flow.md` in
   Phase 1 (R1 docs) and move it to `docs/plans/completed/` after Phase 5.
7. **HANDOFF status lines.** Five entries still say "(local, not committed)" for work that is in `08b31f78`; AGENTS.md:18
   asks for the hash. **Recommendation:** fix them in the Phase 1 HANDOFF edit (the file is edited anyway); nothing
   else in those entries changes.
8. **"tanda vital" alias in `note-structure.ts`** (Phase 1.1). It puts a "Tanda vital:" line into the examination bucket
   of every local draft (SOAP note's "Pemeriksaan Fisik", DDx worksheet's findings). **Recommendation:** yes; that is
   where vitals belong in a SOAP note and it is one map entry. Alternative: keep vitals only in the guide's O row.
9. **The first chip labels unlabelled text as the complaint** (Phase 1 `insertSection`). `structureNote` reads
   unlabelled text as the complaint only while nothing is labelled; the first inserted label would otherwise orphan
   the narrative in the guide, the SOAP view and the SOAP note (`drafts.ts:85,87`). **Recommendation:** prefix the
   text with "Keluhan utama: " at the first chip (the chip's whole job is to add structure; nothing typed is
   removed). Alternative: leave the text untouched and accept that "Keluhan utama" flips to missing after the first
   chip, with the narrative kept only in "Teks sumber (verbatim)"; or change `createDraft`/`structureNote` to treat
   leading unlabelled lines as the complaint (touches every local draft; not recommended in this run).

The plan's defaults are the recommendations; the implementer changes them only on Gaffer's word at the Phase 0 stop.

## 8. Risks

- **Composer design sensitivity.** Gaffer reverted B2 on 2026-10-20 after the composer box changed. The guide sits
  outside the box, is one wrapping row, and is hidden until text is typed; still a visible addition. Mitigation: the
  Phase 2 browser check at 1440 and 400 px before the commit; decision 2 lets Gaffer move or hide it.
- **Heuristics, not understanding.** `structureNote` and `readCaseFields` read labels and ranges only; a doctor who
  writes "Asesmen: belum jelas" fills the A item. The guide reports presence, not quality, and says nothing clinical.
  The tests pin that unlabelled numbers and durations never fill anything.
- **Candidate codes into P-Care.** The Diagnosa chip copies an unconfirmed AADI code; the toast and aria-label say so
  on every copy. This is the one clinically sensitive copy; decision 4 is Gaffer's.
- **Paid calls behind next-step chips.** A chip never calls AADI; Enter does, as it already does in those modes. The
  toast names it. Decision 5 can drop those targets.
- **Test coupling.** `tests/ui/case-strip.test.tsx` pins the chip names and the strip's absence after an answer;
  `tests/ui/workspace-smoke.test.tsx` pins the send button name and the nine-part navigation. Each phase lists the
  exact lines; any other change to those tests is a deviation to report.
- **jsdom limits.** Caret placement, focus after `requestAnimationFrame`, wrapping and horizontal scroll cannot be
  asserted in jsdom; they are browser-check items. A browser check must never reach a live engine without the POST
  block (HANDOFF rename entry, "Safety"); `npx next dev` alone has no engine.
- **Reveal and scroll.** New rows go only below the document in the card; the Conversation effect keys on message
  count and measures the text start. If a phase's test in `tests/ui/diagnosis-*` or `typing-*` changes behaviour, stop.
- **Gate time.** `npm run build` plus `npm test` run several minutes per phase; the implementer runs the touched
  files first, the whole gate once per phase.
- **Other sessions' uncommitted files.** The tree carries edits outside the capsule; staging by explicit path is the
  only safe way to commit. `.playwright-mcp/` is untracked and must never be added.
- **HANDOFF rotation.** The file is already over the five-entry cap; the Phase 1 rotation moves two entries verbatim.
  A wrong move loses provenance; the archive heading names the reason, and `git.exe diff` is checked before commit.
- **Language drift.** All new UI strings are listed in Bahasa Indonesia in section 4; code, tests and comments in
  English. The `missingField` label is imported, never retyped (acceptance criterion in Phase 1 and 3).
