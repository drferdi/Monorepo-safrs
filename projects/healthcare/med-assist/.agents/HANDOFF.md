# HANDOFF

Last updated: 2026-09-29 (Tatalaksana: dose "1x10mg", timeline cards, DDI reason, muted history, orange)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Capsule branch `feat/sidepanel-ui-batch`, **local only, not pushed, no PR.** HEAD is the
Tatalaksana "no red" commit after `d4452590` (DECISIONS 2026-09-29, four Tatalaksana entries):

- Four steps, three pages: Temuan 1/4 + Diagnosis 2/4 | Tatalaksana 3/4 | RME 4/4.
- `steps/TatalaksanaStep.tsx` (replaces TherapyStep and EducationStep): Terapi kronis (visit
  history, "Review"), Terapi kunjungan ini (slots Utama/Adjuvant/Vitamin, Ganti, hold-to-Hapus,
  "+ Tambah obat", "Gunakan semua usulan" / "Lanjut tanpa terapi tambahan"), Keamanan (duplicates,
  DDInter major, allergy/contraindication), Edukasi, Tindak lanjut (KB `kontrol`, routine per
  chronic condition), Safety net (KB `red_flags`), Ringkasan, "Selesai".
- Revision: doses "1x10mg" (`formatDose`), each therapy card an activity timeline
  (name → dose → [indication] → DDI → contraindication); DDI says why (curated pair table,
  `explainInteraction`) once per pair; "Review" history muted; findings orange, no red.
- Logic: `tatalaksana.ts`, `usePatientVisits.ts`, `labMotion.tsx` (lab.xevrion.dev motion);
  ClinicalDifferential runs `checkInteractions`, keeps dismissed proposals out of the
  prescription, sends the follow-up to RME `rencana_tindakan`.
- CSS appended at the end of `style.css` only. No R3 path, no protected file.
  **SAFRS**: R2 UI, R2 `lib/rme`; the branch stays R3 through `lib/clinical/recurrent-diagnosis.ts`.

## What Chief tests now

1. Reload "Asisten Medis" (`.output\chrome-mv3-dev`, built on the final tree).
2. A patient with chronic therapy in the visit history, diagnosis J06/J02/J20/I10 → page 2
   Tatalaksana: chronic cards with Indikasi/DDI, Review; choose or "Gunakan semua usulan";
   Keamanan; add education; "Selesai" → RME → "Isi otomatis RME": Edukasi and Rencana tindakan
   hold the ticked points and the KB follow-up.
3. Without a prescription service the page says "Tidak ada usulan obat dari layanan resep."; use
   "+ Tambah obat" or "Lanjut tanpa terapi tambahan".

## Verification (capsule root, final tree)

| Gate | Exit | Result |
|---|---|---|
| `lint` | 0 | 1 pre-existing warning (`lib/api/platform-api-client.test.ts:19`) |
| `typecheck` | 0 | clean |
| `test` | 0 | 179 files passed, 1 skipped; 1431 passed, 17 skipped (was 1430) |
| `exec wxt build --mode development` | 0 | clean |
| `run:check` | 0 | "Extension loads: Asisten Medis 2.1.0 (MV3), all referenced files present." |

Vite harness (`dx-harness`; `?dx=3-J20.9` major DDI, `&ddi=none`, `&ddi=unavailable`,
`&therapy=error&chronic=none`): viewed; toggling a card moves no other part (0 px); short hold
does not delete, full hold does; Ganti replaces; Selesai → RME. Not tested: live MIRA, the real
Sentra prescription API, the ePuskesmas fields themselves, real DDInter lookup in the extension.

## Open for Chief (code must not change for these)

1. Source of Terapi proposals: remote-only (local pipeline unreachable, R3). Default: keep.
2. DDI mechanisms come from the small curated table `lib/api/mocks/ddi-mock.ts` (~20 pairs);
   other pairs say "Mekanisme tidak tercatat di DDInter." Clinical review / larger source.
3. KB `red_flags` for some entries are complications (J20: "Pneumonia.", "Pleuritis."), shown
   verbatim in Safety net; clinical review of the KB wording (R3 data).
4. Durable R3 sign-off for `lib/clinical/recurrent-diagnosis.*` and `CHRONIC_ICD_ROOTS`.
5. `VITE_MIRA_SERVICE_URL` has no default in `.env.example`; `MIRA_SERVICE_ENV=development`.
6. Capsule `AGENTS.md` still says "penyakit.json wins; the LLM is a reranker only".
7. "Berubah setelah:" may grow long with many findings.

## Next action

Chief tests points 2–3 above.
