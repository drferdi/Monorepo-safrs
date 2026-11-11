# PR text: feat/sentrapedia-glass-workspace-2026-11-04

Title: The workspace takes Glass's shape: split canvas, document pane, Glass-shaped AADI analysis, chip row, /agent page

Body:

The workspace takes Glass Health's shape: sidebar order and account menu, a canvas split between the chat and a document pane, the AADI analysis rendered as a Glass-shaped document from the stored engine result, one chip row with `/` as the mode picker, and Pengaturan Agent as the page `/agent`. Spec `docs/specs/2026-11-04-glass-workspace-redesign-design.md`, plan `docs/plans/active/2026-11-04-glass-workspace-redesign.md` (14 tasks), decisions in `.agents/DECISIONS.md` "2026-11-04 — The workspace returns to Glass's shape".

- **Shell.** Sidebar: Baru · Buat Pasien · Buat Daftar Pasien · Mulai Scribe · Pengaturan Agent · Cari, then the three list sections and an account menu that holds the Clerk button and Keluar; the session toolbar is gone. `--radius-control` 8 px and `--radius-structure` 12 px are overridden in `globals.css` (`sentra-tokens.css` untouched).
- **Composer.** Eight shortlisted chips, `/` as the full picker; intent tabs, mode menu and quick rows removed. One deviation from the spec: a single `ddx` chip ("Diagnosis Banding" / "Perbarui Diagnosis Banding"), since both are the same mode and a new mode would change the contract.
- **Document pane.** The Clinical Cockpit and the "Alur kasus" rail are retired. Above 1200 px the canvas splits between the chat and a pane with the Ringkasan encounter tab and one tab per document; below it the pane is the "Dokumen encounter" sheet. Chat turns are prose, the doctor's summary and document cards.
- **AADI rendering.** `analysis-view.ts` and `analysis-document.tsx` render the stored result in Glass's differential order (Pembahasan kasus → Kutipan pedoman), therapy through the evidence gate ("Cek dosis obat" on unverified doses; drugs the gate removed are not listed), guideline passages as numbered Kutipan pedoman cards. The typing reveal and the step timer are gone; the thinking card reports only what happened and `AadiAnalysis.pipeline` keeps the trace. An edited answer renders as its markdown.
- **Pengaturan Agent.** `/agent` with Preferensi, Mode dan templat and Pengetahuan. `Settings` gains the optional `environment` (home pill) and `modeInstructions` (local drafts only); earlier saves load unchanged. Leaving the encounter for `/agent` asks first when text, edits or an analysis would be lost.

No change to the storage format, the `Message`/`Encounter`/`Patient` types, the AADI contract (one optional `pipeline` field aside), the gateway, auth, consent, sync, the evidence gate or the PII guard.

Verification: `tsc` 0, eslint 0 errors, Vitest 653/653, system tests 67/67, axe 0 violations on home, the encounter, the sheet and `/agent` at 1440/1024/375 px (`docs/verification/glass-redesign-2026-11-04/`). A whole-branch review (fresh context) found one Critical and two Important issues, fixed with tests in the last commit; eleven minors are listed in that review and left for a follow-up. Not verified: the live engine path end to end in the new pane (the evidence used a stored result) and Clerk mode of `/agent`.

Before merging or building: this needs a merge commit (a squash or rebase breaks the subtree-split chain).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
