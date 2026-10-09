# Oracle + MIRA integration verification — 2026-10-09

Gaffer authorized “Okay integrate both oracle and MIRA”; implementation and review solo, no extra worker. Bounded local integration complete. Actual inference remains unverified because the Sentrapedia server token is absent. Risk R2 server/contract; R3 analysis surface explicitly requested; no upstream clinical rules changed.

## Delivered and provenance

- Referensi & MIRA in sidebar, composer and Command Center. Read-only Oracle lookup of 144 records, 15 actual categories; original narratives and source file/version/record/hash visible. Metadata's 14 categories reported separately. Repeated codes stay separate; exact code matching never filters away MIRA diagnoses outside Oracle.
- Capsule-local MIRA v1 schema/type/validator snapshots from Med Assist, with SOURCE.md attribution. Server-only gateway /api/mira; existing loopback service /healthz and /v1/diagnosis/step. No cross-capsule runtime imports or configuration reads. Optional environment example, no credential values.
- Explicit structured fictional case; no Patient/Encounter auto-copy. Input and response validation, bounded bodies, identity-pattern guard, loopback/same-origin/Host checks, timeout/cancel and one active request. Identity patterns are not certified anonymization. No automatic fallback engine or prescribing from Oracle.
- Successful output includes hypotheses, case reasons, missing information, next actions, disposition/unfilled, Oracle source references and trace/version/time/model/reported cost. Save explicitly creates an editable draft with original response/case/source snapshot and unchecked review checklist. Page citations unavailable.

## Observed gates

Independent preinstalled extraction: C:\Users\drfer\AppData\Local\Temp\sentrapedia-identity-20261008-220319. No installs in this session. Main checkout dependencies remain incomplete; gates ran in this extraction, not claimed as main-checkout executions.

| Command from extraction | Observed result |
| --- | --- |
| npx --no-install tsc --noEmit | Exit 0 |
| npx --no-install eslint app/api/mira/route.ts components/workspace.tsx components/sidebar.tsx components/command-palette.tsx components/knowledge-dialog.tsx components/mira-case-form.tsx lib/oracle.ts lib/mira/contract.ts lib/mira/types.ts lib/mira/validate-json.ts lib/mira/gateway.ts lib/mira/presentation.ts tests/oracle-mira.test.ts --fix | Exit 0 |
| npm test -- tests/oracle-mira.test.ts tests/workflow.test.ts tests/workspace.test.ts tests/studio.test.ts | Exit 0; 64 tests / 4 files |
| npm run build | Exit 0; /, /_not-found, dynamic /api/mira |
| npm run deploy:dry-run | Exit 0 PASS; 6 traces, zero external source dependencies |

Final build TL2K0LuhZqyCyGOtmg7zY. Hash report 2026-10-09-oracle-mira-extraction-hashes.json: 57 source/test/script/config/asset/Oracle files equal byte-for-byte. Main and extraction lockfiles match. No dependency changes or installation claim. Install command not rerun under Gaffer's no-install constraint. Standalone server running on 127.0.0.1:3104; no deployment performed.

Original Oracle hashes unchanged from pre-integration inventory:

- data.ts: d7423acc04d2f986f7a460dd8d4711ee19772f32b7a05fcc07d3b5dcb8207946
- diseases-data.ts: e7107164ef7090af180fb4b19f80b6012375be056e83c46408ae01e058c2a1c5
- diseases.json: 0e5af5cbc9f71a1b1ffbb1dd399b135473a4427c899117b46d6558114e860ced
- sentrapedia.json: 73e40882cdd313f46f406c99c3474aab9ebde44418d3e1681b0f5aaec9f9cd9a

## Browser evidence and correction

Desktop 1247×895: catalog J00 lookup, original detail and expanded provenance; MIRA health reports reachable but token unconfigured on 3104, submit disabled. Mobile 390×844: A09 search retains two exact-code records and the separately named A03-A09 range record; category filter and empty-state work; form is one column. Document width 390, dialog width 358 / inner scroll width 356, no horizontal page overflow. Command Center search/Enter opens MIRA; Escape closes the dialog.

Separate QA only: mock HTTP service on 8789 and the identical standalone app on 3105 with a test-only token. No model/provider calls. UI identity-pattern input rejected. One successful explicit POST, synthetic header and contract v1 received, two physical-exam lines preserved. All response fields including C92.0 outside catalog shown; save to active QA Encounter; Source displays complete input/response/Oracle hash/trace. Reload preserves draft; required checklist unchecked and Ditinjau/Final disabled. QA Encounter removed through UI; QA servers stopped; primary browser returned to 3104.

Browser found Next's internal localhost URL can differ from public 127.0.0.1 origin. Corrected by validating the public Host as loopback, matching port and exact Origin, while rejecting nonlocal hosts. Regression test added; final gates and browser success above supersede the initial rejection. Initial typecheck test fixture needed explicit MiraResult typing, corrected; subsequent gates all pass. TDD first run expected missing-module RED. K35 was initially assumed outside Oracle but is actually present; test changed to verified absent C92.0. No clinical inference was drawn from test fixtures.

Screenshots: oracle-mira-catalog-desktop.png, oracle-mira-health-desktop.png, oracle-mira-draft-source.png, oracle-mira-review-draft.png, oracle-mira-catalog-mobile.png, oracle-mira-form-mobile.png.

## Limits and next steps

Existing MIRA health directly responds; authenticated live inference, provider/model current configuration, actual quota/billing and clinical accuracy were not tested. Sentrapedia needs an authorized server-side MIRA_SERVICE_TOKEN and restart for live synthetic analysis. No secrets copied from Med Assist or MIRA. Ordinary composer remains deterministic; this is the separate explicit MIRA flow. Clinical review, secure storage, production authentication/verifier, full safety pipeline, PNPK version registry/page citations and OCR remain separate work. No deployment or production-readiness claim. Independent reviewer not used per Gaffer's solo direction. Next.js bundled guides were unavailable; existing installed server source was inspected for the internal-URL issue.
Final delta: preserve every matching evidence row and unlisted service evidence in the readable draft; full raw response remains in Source. Schema keyword/snapshot-hash tests added. Final gates rerun at 03:10–03:11 Asia/Jakarta; 64 tests pass. Earlier browser mock used the preceding build; its result fixture renders identically, and these presentation additions are verified by targeted tests. Primary preview restarted on final build.
