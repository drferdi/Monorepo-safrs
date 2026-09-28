# HANDOFF

Last updated: 2026-09-28 (night, Chief's six-point revision of the diagnosis page)

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md`.

## Current state

Capsule branch `feat/sidepanel-ui-batch`, **local only, not pushed, no PR.** HEAD is the docs
commit after `400c94ca`. Earlier work today is in `DECISIONS.md` and the commit bodies.

Tonight (Chief's revision, all points done):

- `4e65703d` — Catatan: practical bedside guidance from `penyakit.json` (what to examine, when
  to refer), not "Review faring".
- `44c43b40` — "Masukkan hasil" opens options to tick (Ronki, Wheezing, ...; signs
  Positif/Negatif); "Simpan" asks MIRA again with `bedside_findings` (CaseState `qa`,
  `physicalExam`, `results`); the Temuan receipt lists the result after the main complaint.
  MUST NOT MISS "Apa yang perlu diperiksa" ticks the knowledge base's `pemeriksaan_fisik`, or
  MIRA's remaining plan when the code has none; MIRA's `missingInformation` joins Data kurang.
- `e753ad58` — two banding cards, no "Lainnya".
- `e309efd0` — Terapi and RME on the second page. It also removed the "Basis:" line in Terapi
  (it repeats the Diagnosis receipt); `400c94ca` restores it, because without its "hapus" a
  manual diagnosis could not be removed and a second diagnosis was shown nowhere.

No CSS change, no R3 path, no protected file. **SAFRS**: R2 UI and R2 engine code
(`lib/diagnosis-engine/**`, `types/api.ts`); the branch stays R3 through
`lib/clinical/recurrent-diagnosis.ts` (Chief's prior approval).

MIRA: nothing answered on 127.0.0.1:8787/health tonight; the host `com.sentra.mira` starts it
when the side panel opens (unchanged).

## What Chief tests now

1. `chrome://extensions` → reload "Asisten Medis" (`.output\chrome-mv3-dev`, built on the final
   tree), side panel, Trajectory → Diagnosis.
2. Next best step → "Masukkan hasil" → tick → "Simpan": the page reloads the diagnosis, Temuan
   shows the result.
3. A MUST NOT MISS card → "Mengapa perlu dipertimbangkan" → "Apa yang perlu diperiksa".
4. Choose a diagnosis: Terapi and RME appear on their own page; "ubah" on Diagnosis goes back.

## Verification (capsule root, final tree)

| Gate | Exit | Result |
|---|---|---|
| `lint` | 0 | 1 pre-existing warning (`lib/api/platform-api-client.test.ts:19`) |
| `typecheck` | 0 | clean |
| `test` | 0 | 175 files passed, 1 skipped; 1361 tests passed, 17 skipped |
| `exec wxt build --mode development` | 0 | clean |
| `run:check` | 0 | "Extension loads: Asisten Medis 2.1.0 (MV3), all referenced files present." |

Vite harness (synthetic fixture): tick list, receipt, MUST NOT MISS panel, both pages viewed;
MutationObserver: opening "Masukkan hasil" changes only its panel. Token-guard: PASS twice
(`check-tokens` exit 0; its raw-value scan does not cover this capsule, the diff was searched
by hand).

## Limits to keep in mind

- The tick catalogue (`bedsideFindings.ts`) is input vocabulary for Chief's clinical review.
- K65, K35 have no knowledge-base entry; their checks are MIRA's plan for the whole
  differential. Per-code checks need KB entries (R3) or a MIRA contract field.
- Legacy engine ignores `bedside_findings`; saving a finding clears a chosen diagnosis and
  manual medications (it is a new request). A re-request with findings has a new case key, so
  MIRA runs live (read in `run-diagnosis.ts`); not live-tested, the service was down.

## Open for Chief (code must not change for these)

1. Durable R3 sign-off for `lib/clinical/recurrent-diagnosis.*` and `CHRONIC_ICD_ROOTS`.
2. `VITE_MIRA_SERVICE_URL` has no default in `.env.example`.
3. Host starts the service with `MIRA_SERVICE_ENV=development`; the environment name is Chief's.
4. Capsule `AGENTS.md` still says "penyakit.json wins; the LLM is a reranker only".
5. Clinical review of the tick catalogue wording.
6. The "Basis: … hapus" line in Terapi repeats the Diagnosis receipt above it. Default: keep.
   Dropping it needs the receipt to list every chosen diagnosis and a remove action elsewhere.

## Next action

Chief reloads the extension and tests points 2–4 above.
