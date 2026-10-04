# HANDOFF

Last updated: 2026-10-04 (visit summary on Chief's approved template in IBM Plex Sans Bold; signers
rule; one welcome sound; header "Prototype"; archive of unreachable code and finished docs;
lowercase docs; standard repository files; README on Chief's AsistenMedis design. Earlier the same
day: one chronic card per drug through the RME synonym table, standard start without a signa,
every riwayat signa form read, halves kept to the resep).

Overwrite this file at the end of every capsule-scoped session; never append. Keep it under about
1k tokens. Durable decisions go to `DECISIONS.md` (the 2026-10-04 entries hold the details).

## Current state

- Visit summary PDF (`lib/report/*`, model → layout draw ops → pdf-lib renderer): the template
  `Clinical_Visit_Summary_Template.docx` (A4, ten numbered blocks, ink logomark in the title cell),
  IBM Plex Sans Bold (`public/fonts/`, subset through `@pdf-lib/fontkit`). DPJP = signed-in
  `dokter_nama` (a non-doctor gives dr. Ferdi); verifier = dr. Ferdi, or when he is DPJP one of
  `FERDI_VERIFIERS` by `RM|date`. The RME nurse field is unchanged. Columns inside the blocks
  (DECISIONS "gains columns"): 05 STATUS + INTERAKSI + the DDInter check line; 08 up to four dated
  earlier visits, Diagnosis and GDS rows, sparkline + arrow; same-day visits left out. Not done:
  the medication table header is not repeated on page 2.
- Sound: only `opening.mp3` from `runLaunchSequence`; `ConsoleLogin` plays none.
- Header: "Prototype" under "Architected by dr Ferdi Iskandar" (`SidePanelHeader.tsx`).
- `archieved/` (gitignored, on disk): unreachable components, lib clients, the trajectory chart set,
  finished docs, Plex Regular, the white logomark. Held for Chief (R3, look unused):
  `lib/emergency-detector/index.ts`, `gate2-workflow.ts`, `ttv-inference.ts`,
  `lib/clinical/dosage-database.ts`. Kept though doubtful: the vital-sign set, features-
  comprehensive, `med-assist-system-architecture`, dashboard-migration and trajectory-endpoint
  blueprints, five unexecuted refactor specs, `refactor-message-contract-map`, `gate-2-vital-sign-brief`.
- `LICENSE` is a proprietary placeholder; the terms are Chief's call.
- Open: standard-start rules for vitamin B komplek, tiamin, zink, tambah darah, nistatin,
  griseofulvin (need references); T-10 MIRA per-session token; dependency prune; MedLens `any`
  suppressions; chronic quantity rule; Dependabot 2 high on AsistenMedis, unchecked.

Branch `feat/sidepanel-ui-batch`, not pushed to the monorepo. AsistenMedis main is at e3e5c6e3
(capsule at 23f45639); the commits since are not pushed, a push is Chief's call (same merge
procedure: merge `asistenmedis/main`, push the capsule subtree). Another session's uncommitted
`lib/api/sentra-api.ts`, its test, `tests/e2e/zz-verify-kb-rx.spec.ts` (lint red), `docs/brand/`
and root `.agents/HANDOFF.md` are not this session's.

Harness (scratchpad, launch `gate3-harness`, port 5181): `header.html`, `summary.html`
(`?dpjp=ferdi`), `tatalaksana.html`; `@/utils/messaging` is stubbed there.

## Verification (final tree, 2026-10-04)

`run build` 0 · typecheck 0 · vitest 0 (198 files, 1708 passed, 17 skipped; fewer than 2026-10-03
because archived tests left with their code) · eslint `components lib entrypoints utils types` 0 ·
full lint 1, only `zz-verify-kb-rx.spec.ts` (4 `no-console`) · `run:check` 0 · e2e 21 passed ·
governance 1, only root `.agents/HANDOFF.md` task ownership (other session). Red first: font test
(Helvetica-Bold), sound test, header test, the PDF column tests (model, layout, helper, PDF flow). Not shown red first: the signer model tests. Production
build in `.output\chrome-mv3-dev`, last.
