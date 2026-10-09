# Main composer MIRA — observed verification

Chief reported a local Clinical question brief rather than an AI response. Verified root cause: WorkspaceApp.generate called createDraft for every built-in main-composer submission. The separate MIRA dialog/API was working, but the main input was not connected. Earlier paid-profile API success did not prove this path.

## Bounded change

Built-in Tanya and Diagnosis Banding now stage a local, editable MIRA case preview. It preserves the actual complaint, recorded numeric age/sex and raw Encounter context/Patient notes; name and ID are excluded. No diagnosis, negative findings, vitals or allergy status is inferred. Fictional-data confirmation and an explicit analysis submission remain required before transmission. A validated success appends the original prompt and MIRA source-preserving draft to the captured encounter, selects that encounter and clears the prompt. Closing/canceling/errors do not create a placeholder or clear the original prompt. Explicit personal templates and other modes remain local.

The draft badge now distinguishes structured MIRA snapshots from local documents. Source/result/trace/cost and Oracle references are preserved, and fresh checklist items remain unchecked. No schema, model, clinical prompt, postcheck, privacy policy, service budget or shared Med Assist/MIRA source was changed.

## Fresh gates

Execution root: C:/Users/drfer/AppData/Local/Temp/sentrapedia-identity-20261008-220319, the existing independent extraction with dependencies already installed. Main-checkout dependencies remain incomplete; no installation performed and no main-checkout gate claim.

| Command | Observed result |
| --- | --- |
| npx tsc --noEmit | exit 0 |
| npx eslint components/composer.tsx components/workspace.tsx components/knowledge-dialog.tsx components/mira-case-form.tsx components/message-card.tsx lib/mira/composer.ts lib/mira/presentation.ts tests/mira-composer.test.ts --fix | exit 0 |
| npm test -- tests/workspace.test.ts tests/studio.test.ts tests/workflow.test.ts tests/oracle-mira.test.ts tests/mira-free.test.ts tests/mira-paid.test.ts tests/mira-composer.test.ts | exit 0; 79/79 tests, 7 files |
| npm run build | exit 0; build -ucz05vHuIv2Gy73PpG9y |
| npm run deploy:dry-run | exit 0; PASS, 6 traces, 0 external source dependencies, no deployment |

68 source/config/test/script/asset/Oracle/README files match this extraction by SHA-256, zero mismatches. All four original Oracle files and the official logo retain their prior hashes. Proof: 2026-10-09-main-composer-extraction-hashes.json. Standalone preview 3104 was stopped before rebuilding to avoid Windows output locks, then restarted with this capsule's ignored environment file (session16765). The isolated MIRA8791 and shared service8787 were unchanged.

TDD log: initial relative copy executed from the extraction could not find the new test and ran no tests; corrected to absolute source path. The regression then intentionally failed RED because lib/mira/composer did not exist. Implemented helper/wiring and observed all final gates pass. No lint suppressions or implicit any. Bundled Next guides remain unavailable; no new framework API introduced. Solo self-review, no independent reviewer under Chief's solo instruction.

## Real browser acceptance

Browser at http://127.0.0.1:3104, existing Chief data initially 1 Demo Patient/1 Encounter. Created a separate QA MIRA Fiktif Patient with age67/Male and raw note Riwayat HT. Entered the exact complaint in the MAIN composer: “pasien mengeluh nyeri kepala bagian belakang selama 2 hari, nyeri menetap”. Pressed Enter, rather than the separate Analisis MIRA shortcut.

1. Preview opened with the exact complaint, age67, male and raw HT history. Missing exam/vitals/medications/knownConditions/allergies/results stayed empty. No Patient name/ID appeared in the case. Fictional checkbox unchecked; analysis disabled even with healthy connection.
2. Closed preview: original main prompt retained and zero assistant documents created. Reopened by Enter, consent still unchecked.
3. Confirmed the fictional QA input and clicked Analisis dan tambahkan draf. Observed busy/disabled form and cancel control. No mock or interception was used.
4. Actual MIRA/OpenRouter success automatically closed preview and added original user prompt plus one Analisis MIRA assistant draft. No Clinical question brief placeholder in the QA conversation. The main prompt cleared after success.
5. Source view contained full case/result/trace/time/Oracle snapshot. Saved only this fictional source artifact to 2026-10-09-main-composer-live.json. Name/ID excluded.
6. Reload retained one Draf MIRA document and exactly identical source text. Four review boxes unchecked; reviewed/final options disabled.
7. Mobile390×844 document width390; preview width358/document width390, no horizontal overflow. Diagnosis Banding Enter opened the corresponding new preview; consent reset and submission disabled. No second inference call made for this routing check.
8. Deleted ONLY the QA Patient and its encounter through the application confirmation. Chief's Demo, original complaint, raw HT context and local brief remain. Returned to the original encounter and reused its prompt, leaving it ready in the main composer; no further case sent.

Screenshots: mira-composer-preview.png, mira-composer-live-desktop.png, mira-composer-review-mobile.png, mira-composer-preview-mobile.png.

## Live evidence and limits

Trace 00f3b79a-9cbc-4942-a159-660132bb1e09: HTTP200, statusok, contract1. Observed service latency39266ms. Planning and assessment requested/served deepseek/deepseek-v4.1-flash. Provider-reported plan Parasail cost0.010006USD and assessment Together cost0.011162USD; total0.021168USD. Sanitized audit whitelist in 2026-10-09-main-composer-audit.json contains no credentials. This is usage metadata, not an account invoice audit; budget checks cannot guarantee canceled/rejected calls are not charged.

Technical acceptance is verified, not clinical accuracy. Output is preserved without clinical rule changes; this case left disposition unavailable pending examination. Some reasons still place undocumented findings under opposing evidence, and broad examination/laboratory suggestions reflect the original MIRA flow. Those interpretations and scope require clinical review. Clinical prose remains the original service output, including English; no translation/rewriting was introduced. Oracle lacks verified PNPK page citations. The service stays fictional/local only, with unencrypted browser storage and no production user authentication. Old local documents are not retroactively replaced: reuse the prompt to obtain a new analysis. Other document modes/personal templates remain local formats.

Next: clinician-led review of missing-data interpretation, examination/test scope and source grounding before real-patient use. No deployment, patient-record mutation, new provider selection or shared service change was performed.
