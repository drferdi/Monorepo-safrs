# HANDOFF

Last updated: 2026-09-29 (Tatalaksana: dose "1x10mg", timeline cards, DDI reason, muted history, orange, stock search, steady UI, focus underline, standard dose prefill, selection trace, Keamanan removed + audit, Edukasi swipe deck in the reference design, Sentra logo on each card, Tindak lanjut "Kontrol 3 hari", Safety net timeline)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Capsule branch `feat/sidepanel-ui-batch`, **local only, not pushed, no PR.** HEAD is `9fbb52e5`, the last of four Edukasi swipe-deck commits after `2adb435c` (DECISIONS 2026-09-29,
twelve Tatalaksana entries):

- Four steps, three pages: Temuan 1/4 + Diagnosis 2/4 | Tatalaksana 3/4 | RME 4/4.
- `steps/TatalaksanaStep.tsx` (replaces TherapyStep and EducationStep): Terapi kronis (visit
  history, "Review"), Terapi kunjungan ini (slots Utama/Adjuvant/Vitamin, Ganti, hold-to-Hapus,
  "+ Tambah obat", "Gunakan semua usulan" / "Lanjut tanpa terapi tambahan"), Edukasi (given list +
  swipe deck of the rest: right/"Berikan" gives, left/"Lewati" skips), Tindak lanjut
  (KB `kontrol`, routine per chronic condition), Safety net (KB `red_flags`), Ringkasan, "Selesai".
  No "Keamanan terapi" part (Chief): each card's DDI node says interactions and "duplikasi: …",
  its Kontraindikasi node allergies; Ringkasan "Safety check" counts them.
- Revision: doses "1x10mg" (`formatDose`), each therapy card an activity timeline
  (name → dose → [indication] → DDI → contraindication); DDI says why (curated pair table,
  `explainInteraction`) once per pair; "Review" history muted; findings orange, no red;
  "Nama obat" searches the Puskesmas stock `stok_obat.json` as typed (`searchStock`).
- Steady UI (Chief: no rubbery motion): no springs, height/layout glides, slides, stagger or scale
  on any diagnosis page; only the hold-to-Hapus fill and the pixel loader cycle remain; a focused
  field shows one green underline that grows smoothly (no green frame); a selected card has no
  green frame either, one line travels around its edge (`SelectionTrace`).
- "Tambah obat" / "Ganti obat" is disabled until name and dose are filled ("Isi nama obat dan dosis.");
  before, an add without a dose failed silently in ClinicalDifferential.
- A picked stock medicine fills Dosis and Aturan pakai (Durasi "1 hari" for a single dose) from
  `standardDose.ts`: lowest standard adult regimen in whole units, signa from PIONAS / PPK 2022 /
  BPOM labels (source per rule); topicals "2x aplikasi" / "6x1 tetes" + "Pemakaian luar"; syrups
  signa only; injections, programme and psychiatric drugs nothing (dose cleared).
- Audit fixes: `drugKey` is the generic name (not the first word) with one spelling
  (amoxicillin = amoksisilin); allergies match across spellings; `strengthOf` reads "100.000 IU";
  `formatDose` never multiplies a %; summary says "interaksi obat tidak dapat dicek" instead of
  "✓ Aman"; no "• -" for an empty duration.
- Logic: `tatalaksana.ts`, `usePatientVisits.ts`, `labMotion.tsx` (tick and hold-to-delete);
  ClinicalDifferential runs `checkInteractions`, keeps dismissed proposals out of the
  prescription, sends the follow-up to RME `rencana_tindakan`.
- CSS appended at the end of `style.css` only. No R3 path, no protected file.
  **SAFRS**: R2 UI, R2 `lib/rme`; the branch stays R3 through `lib/clinical/recurrent-diagnosis.ts`.

## What Chief tests now

1. Reload "Asisten Medis" (`.output\chrome-mv3-dev`, built on the final tree).
2. A patient with chronic therapy in the visit history, diagnosis J06/J02/J20/I10 → page 2
   Tatalaksana: chronic cards with Indikasi/DDI, Review; choose or "Gunakan semua usulan";
   tick education on its cards; "Selesai" → RME → "Isi otomatis RME": Edukasi and Rencana tindakan
   hold the ticked points and "Kontrol <interval>" from Tindak lanjut.
3. Without a prescription service the page says "Tidak ada usulan obat dari layanan resep."; use
   "+ Tambah obat" or "Lanjut tanpa terapi tambahan".
4. "+ Tambah obat" → type "Am": Puskesmas stock list with counts; pick with mouse or arrows + Enter.
5. Pick Amlodipin 10 mg → "1x1", "Sesudah makan"; Omeprazol 20 mg → "Sebelum makan"; Permetrin →
   "1x aplikasi", "Pemakaian luar", "1 hari"; Haloperidol → dose empty.
6. Tick a therapy card (or a diagnosis card): no green frame, one line circles it.
7. No "Keamanan terapi" part; add "BLUD Amlodipin" while chronic Amlodipin is listed → both cards
   say "duplikasi: …" in orange, Ringkasan "⚠ … perlu review".
8. Edukasi: one card per point in the swipe-deck look (number on top, Sentra logo in the middle,
   point below); swipe
   either way, the round arrows or ArrowLeft/Right → the next point; the tick on the card gives it
   (count "Edukasi N" goes up, the tick stays on when the card comes round again); no list below.
9. Tindak lanjut: one row "Kontrol [3 hari]"; pick 1 minggu / 2 minggu / 1 bulan → the RME
   Rencana tindakan says "Kontrol 1 minggu". The long KB follow-up text is gone.
10. Safety net: a timeline like the therapy cards, an orange warning node per red flag, no box
    and no second title.

## Verification (capsule root, final tree)

| Gate | Exit | Result |
|---|---|---|
| `lint` | 0 | 1 pre-existing warning (`lib/api/platform-api-client.test.ts:19`) |
| `typecheck` | 0 | clean |
| `test` | 0 | 181 files passed, 1 skipped; 1462 passed, 17 skipped (was 1466: the v1 deck tests and the "ubah" focus test went with the feature; +1 logo test; -1 `buildFollowUp` test; +1 safety-net timeline test) |
| `exec wxt build --mode development` | 0 | clean |
| `run:check` | 0 | "Extension loads: Asisten Medis 2.1.0 (MV3), all referenced files present." |

Vite harness (`dx-harness`; `?dx=3-J20.9` major DDI, `&ddi=none`, `&ddi=unavailable`,
`&therapy=error&chronic=none`): viewed; toggling a card moves no other part (0 px); short hold
does not delete, full hold does; Ganti replaces; Selesai → RME; `getAnimations()` 0 after every
open apart from the selected card's `dx-trace` (Review, education, form, stock list, "Lihat alasan" on `?step=diagnosis`). Not tested: live MIRA, the real
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
8. The stock file is a snapshot (last_updated 2026-01-30), not a live inventory feed; a live
   Puskesmas stock source would replace `stok_obat.json`.
9. Clinical sign-off of the dose table `standardDose.ts` (conflicts listed in DECISIONS). Topical
   doses keep the templates' "2x aplikasi"; the RME quantity estimate counts them like tablets.
10. Allergy matching is by name only: a class allergy ("penisilin") does not flag amoksisilin.
    Cross-reactivity needs a clinical class table (R3 data, Chief's decision).
11. Tindak lanjut intervals (3 hari, 1 minggu, 2 minggu, 1 bulan; default 3 hari for every
    diagnosis) are my assumption from "cukup kontrol 3 hari atau sejenisnya"; `DiseaseNote.followUp`
    is parsed but unused.

## Next action

Chief tests points 2–3 above.
