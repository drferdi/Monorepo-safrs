# HANDOFF

Last updated: 2026-09-28 (night, clinical reasoning loop)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Capsule branch `feat/sidepanel-ui-batch`, **local only, not pushed, no PR.** HEAD is the
reasoning-loop commit after `c8dccf33`. Earlier tonight: two banding cards, practical Catatan,
tick lists, MUST NOT MISS checks, Terapi/RME on page 2, one "Masukkan hasil" (see DECISIONS).

Reasoning loop (Chief's specification):

- Findings have three states (ditemukan, tidak ditemukan, belum diperiksa); unknown is never
  sent. `case-state.ts` marks present/absent "— DITEMUKAN" / "— TIDAK DITEMUKAN"; old
  checkbox records read as present only. MIRA repo `af7ca77` explains the words in the
  assessment rules (`assist/service/prompts.py`).
- A finding-only rerun keeps the doctor's diagnosis, therapy and medications; selection key is
  by ICD code. "MIRA sekarang menyarankan: …" when MIRA's proposal differs from the choice.
- `assessmentDelta.ts` compares the assessment shown at "Simpan" with the next one:
  ↑/↓ sebelumnya, Baru muncul, new supporting/opposing findings, Data kurang a → b,
  "Tidak lagi disarankan", "Berubah setelah:" on the Next best step.
- The MUST NOT MISS and NEXT BEST STEP labels carry the same 4x4 pixel loader as the
  Diagnosis title (Chief, after lab.xevrion.dev/lab/pixel-loader); `Section` in
  `DiagnosisStep.tsx`, the label row holds the section test id.

No CSS change, no R3 path, no protected file. **SAFRS**: R2 UI and R2 engine code; the branch
stays R3 through `lib/clinical/recurrent-diagnosis.ts` (Chief's prior approval).

## What Chief tests now

1. Reload "Asisten Medis" (`.output\chrome-mv3-dev`, built on the final tree) → Diagnosis.
2. Next best step → "Masukkan hasil": tap a finding once = Ditemukan, twice = Tidak ditemukan,
   three times = back to Belum diperiksa → "Simpan". After MIRA answers: change marks on the
   cards and "Berubah setelah" on the new step.
3. Choose a diagnosis, "ubah Diagnosis", record a finding: the choice stays "Diagnosis utama".

## Verification (capsule root, final tree)

| Gate | Exit | Result |
|---|---|---|
| `lint` | 0 | 1 pre-existing warning (`lib/api/platform-api-client.test.ts:19`) |
| `typecheck` | 0 | clean |
| `test` | 0 | 176 files passed, 1 skipped; 1386 tests passed, 17 skipped |
| `exec wxt build --mode development` | 0 | clean |
| `run:check` | 0 | "Extension loads: Asisten Medis 2.1.0 (MV3), all referenced files present." |
| MIRA `pytest` (assist/service) | 0 | 126 passed, 1 skipped |

Vite harness (synthetic fixture, simulated second answer): three-state panel, change marks,
"Tidak lagi disarankan", "Berubah setelah" viewed. **Live MIRA not tested**: nothing answered
on 127.0.0.1:8787; the service picks up the new prompt rule when it next starts.

E2E (outside the repo, session scratchpad): the real extension, built with the MIRA URL pointed at
a fake service on 127.0.0.1:18787, loaded in Edge 153; `getSuggestions` sent from an extension
page. 21/21 checks: Bearer dev token, contract request, "— DITEMUKAN" / "— TIDAK DITEMUKAN",
unknown never sent, yes/no as qa "Ya", legacy tick as present, MIRA mapping (primary,
"MIRA · jangan terlewat", next best action, missing information), rerun changes the answer, a
contract breach shows "MIRA: hasil tidak valid". Harness UI loop driven by DOM clicks (the
browser pane was hidden). Not covered: login, scrape, side-panel shell, live MIRA.

## Limits to keep in mind

- Only the latest two assessments are compared; no history.
- Present and absent share the pressed style; the state word tells them apart.
- Input changes other than a finding (complaint, vitals) still reset the doctor's choice.
- Tick catalogue wording and K65/K35 knowledge-base gaps: as before, Chief's review.

## Open for Chief (code must not change for these)

1. Durable R3 sign-off for `lib/clinical/recurrent-diagnosis.*` and `CHRONIC_ICD_ROOTS`.
2. `VITE_MIRA_SERVICE_URL` has no default in `.env.example`.
3. Host starts the service with `MIRA_SERVICE_ENV=development`; the environment name is Chief's.
4. Capsule `AGENTS.md` still says "penyakit.json wins; the LLM is a reranker only".
5. Clinical review of the tick catalogue wording.
6. The "Basis: … hapus" line in Terapi repeats the Diagnosis receipt above it. Default: keep.

## Next action

Chief tests points 2–3 above with MIRA running.
