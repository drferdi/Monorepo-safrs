# Dedicated analysis entry — 2026-10-09

Gaffer reports that typing a complaint always opens Referensi with the catalog subtitle. Reproduced in the existing browser using the exact provided example, without transmitting it: Enter opened Referensi, catalog tabs were present, all optional fields visible. Source cause: main composer and catalog use the same KnowledgeDialog wrapper.

Surgical two-component fix: KnowledgeDialog returns a dedicated Analisis kasus dialog for staged main input or explicit analysis shortcut; ordinary reference entry remains the existing catalog. MiraCaseForm keeps the chief complaint visible and editable, shows recorded demographics/raw context summary, and collapses optional data for staged cases. Confirmed fictional-only submission, schema validation, server checks, source preservation, save callback and model profile remain unchanged. No clinical rules or inference behavior changed.

Observed gates in existing independent extraction C:/Users/drfer/AppData/Local/Temp/sentrapedia-identity-20261008-220319: npx tsc --noEmit exit0; npx eslint components/knowledge-dialog.tsx components/mira-case-form.tsx --fix exit0; npm test -- tests/workspace.test.ts tests/studio.test.ts tests/workflow.test.ts tests/oracle-mira.test.ts tests/mira-free.test.ts tests/mira-paid.test.ts tests/mira-composer.test.ts exit0,79/79tests/7files; npm run build exit0/buildl-1XR1tg8iWSsYQqKOnhN; npm run deploy:dry-run exit0/PASS6traces/0external source dependencies. No installs; main dependencies remain incomplete. Preview stopped before build and restarted session65388/3104 with own private env; service8791 unchanged. 68 implementation/config/test/script/asset/Oracle/README files match extraction (direct-analysis-hashes JSON). Original Oracle/logo hashes unchanged. Bundled Next guides absent; no new framework APIs. Solo self-review.

Browser before/after acceptance:

- Main Enter with Gaffer's exact example now opens Analisis kasus with no catalog tabs/subtitle and unchanged complaint. Optional details closed, pemfis textbox isVisible false. A DOM getClientRects check initially misleadingly reported a hidden descendant as present; accessibility, isVisible and screenshot confirmed collapsed state.
- Expanded optional data and edited only ephemeral QA context; collapsed it and verified summary updated while data stayed in the form.
- Replaced preview complaint with an explicitly fictional QA input, confirmed fictional checkbox, observed enabled analysis button with optional fields incomplete. Did NOT click analysis: no model call or new cost.
- Close preserved the original main prompt and created zero assistant documents; QA preview edits discarded. Reopen reset consent/optional details.
- Mobile390×844: document width390, dialog358, no horizontal overflow, title Analisis kasus/no catalog tabs, consent unchecked. Reset viewport.
- Referensi penyakit still opens Referensi/catalog144. Closed it and left Gaffer's prompt ready in the main composer. No Patient/Encounter records edited.

Evidence screenshots sentrapedia-direct-analysis-desktop.png and sentrapedia-direct-analysis-mobile.png. Initial reproduction attempt encountered an empty prompt and consequently no dialog; inspected current state and filled the exact provided example before successful before/after checks. No gate failures. Existing live inference proof is from the earlier main-composer verification, not rerun for this presentation change. Clinical accuracy, missing-data interpretation and PNPK page citations remain unverified.
