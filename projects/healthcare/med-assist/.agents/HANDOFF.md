# HANDOFF

Last updated: 2026-09-29 (Diagnosis → Terapi and Edukasi)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Capsule branch `feat/sidepanel-ui-batch`, **local only, not pushed, no PR.** HEAD is the commit
after `53168078` (DECISIONS 2026-09-29):

- Three pages: Temuan and Diagnosis | Terapi (3 / 5) and Edukasi (4 / 5) | RME (5 / 5).
  `pageOf` in `DiagnosisStepFlow.tsx`; Edukasi is `steps/EducationStep.tsx`, ended by "Lanjut".
- Edukasi = the knowledge base's `kie_edukasi.untuk_pasien` and `tindak_lanjut.kontrol` for the
  chosen diagnoses (`education.ts`, `useDiseaseNotes`); ticked = "diberikan"; ticked points go to
  RME `lainnya.edukasi` (whole points within 250 characters; nothing ticked keeps the old random
  line). No entry → "Basis pengetahuan belum punya edukasi untuk diagnosis ini."
- `getRecommendations` now sends `penyakit_kronis` (confirmed chronic + history "Kronis").
- Terapi: "Tidak ada usulan obat dari layanan resep." when the service gives nothing or fails.

No CSS change, no R3 path, no protected file. **SAFRS**: R2 UI, R2 `lib/rme`; the branch stays R3
through `lib/clinical/recurrent-diagnosis.ts` (Chief's prior approval).

## What Chief tests now

1. Reload "Asisten Medis" (`.output\chrome-mv3-dev`, built on the final tree).
2. Choose a diagnosis with education in the knowledge base (J06/ISPA, J02, I10, K29, E11, …) →
   page 2 Terapi → "Lanjut"/"Lanjut tanpa obat" → Edukasi: tick what was given → "Lanjut" →
   page 3 RME → "Isi otomatis RME" or "Rincian transfer → Anamnesis": the ePuskesmas Edukasi
   field holds the ticked points.
3. A diagnosis without education (e.g. J18) shows the knowledge-base note instead.

## Verification (capsule root, final tree)

| Gate | Exit | Result |
|---|---|---|
| `lint` | 0 | 1 pre-existing warning (`lib/api/platform-api-client.test.ts:19`) |
| `typecheck` | 0 | clean |
| `test` | 0 | 178 files passed, 1 skipped; 1400 passed, 17 skipped (was 1387) |
| `exec wxt build --mode development` | 0 | clean |
| `run:check` | 0 | "Extension loads: Asisten Medis 2.1.0 (MV3), all referenced files present." |

Vite harness (old session scratchpad, `dx-harness`, now with `?dx=2-J06.9`, `?dx=1-J18.9`,
`&therapy=error`): all three pages viewed, no console errors. token-guard: clean after the new
muted lines moved from Tailwind `text-muted` to `diagnosis-row-meta`. Not tested: live MIRA, the
real Sentra prescription API, the ePuskesmas Edukasi textarea itself.

## Limits to keep in mind

- Only 21 of 159 knowledge-base entries have education; MIRA-only codes have none.
- Proposals come only from the remote Sentra API; with no `VITE_SENTRA_API_URL` the default
  `https://api.sentra.local` is expected to fail, so Terapi shows the no-proposal line.
- Education beyond 250 characters in total is left out of the RME (whole points only).

## Open for Chief (code must not change for these)

1. Source of Terapi proposals: the local pipeline in `sentra-api.ts` is unreachable
   (ARCHITECTURE §5.4, R3). Revive it, keep remote-only, or give a Sentra API address.
2. Durable R3 sign-off for `lib/clinical/recurrent-diagnosis.*` and `CHRONIC_ICD_ROOTS`.
3. `VITE_MIRA_SERVICE_URL` has no default in `.env.example`; `MIRA_SERVICE_ENV=development`.
4. Capsule `AGENTS.md` still says "penyakit.json wins; the LLM is a reranker only".
5. Clinical review of the tick catalogue and of the education wording ("Kontrol: …" prefix).
6. The "Basis: … hapus" line in Terapi repeats the Diagnosis receipt. Default: keep.
7. "Berubah setelah:" may grow long with many findings.

## Next action

Chief tests points 2–3 above.
