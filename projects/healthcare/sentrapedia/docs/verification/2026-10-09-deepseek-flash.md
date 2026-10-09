# DeepSeek Flash integration - 2026-10-09

Gaffer explicitly approved paid DeepSeek Flash after free-model failures and rejected training-use consent. This supersedes free-only selection. Solo; no installs, shared MIRA/Med Assist mutations, patient data, production deployment or clinical-rule edits.

Selected deepseek/deepseek-v4.1-flash for BOTH stages. Official models/ZDR APIs checked: catalog prompt0.0000003 USD/token, completion0.0000012 USD/token, structured_outputs/response_format/temperature,25 ZDR endpoints. Snapshot 2026-10-09-deepseek-flash-preflight.json. Pin excludes auto/latest aliases and other models. Nonclinical original assessment-schema diagnostic passed: finishReason stop, schemaValid true, reported cost0.000589695 USD (2048-token request ceiling, no retry, provider ZDR/deny-training/require-parameters).

lib/mira/model-profile.ts defines release, response budget and immutable-version parsing. Gateway checks both stages/provider/synthetic-only before POST, rejects mixed/unknown profiles, inconsistent response metadata and negative/missing/over-limit cost. Legacy free-helper/tests preserved for regression but production route selects only approved paid Flash. UI now labels paid Flash, budgets and fictional-only input. No source text/Oracle/clinical postchecks changed.

config/mira-deepseek.env.example and scripts/run-mira-deepseek.ps1 start separate installed MIRA8791, disable external dotenv, use own private environment, fixed original privacy policy,60s deadline, US$0.10 step and US$1 daily service budgets. Two-call limit inherited. Gateway75s deadline. Preflight/public price thresholds, runtime and actual startup observed. Own URL/token written only after health; secrets never printed or copied into artifacts/Git. Shared8787 preserved. Old owned Apodex8788 stopped after new-profile success. Budget accounting occurs after provider calls; rejecting output/cost or cancellation does not guarantee zero provider charge.

TDD RED: new paid-profile test first failed for missing model-profile module, intentionally; then implementation. Fresh independent extraction gates at C:/Users/drfer/AppData/Local/Temp/sentrapedia-identity-20261008-220319:
- npx --no-install tsc --noEmit: exit0.
- npx --no-install eslint app/api/mira/route.ts components/mira-case-form.tsx lib/mira/model-profile.ts lib/mira/gateway.ts tests/mira-paid.test.ts --fix: exit0.
- npm test -- tests/mira-paid.test.ts tests/mira-free.test.ts tests/oracle-mira.test.ts tests/workflow.test.ts tests/workspace.test.ts tests/studio.test.ts: exit0,74/74,6files.
- npm run build: exit0,4Ss7TEoD27S9w-cjfatTt.
- npm run deploy:dry-run: exit0 PASS,6traces,zero external source dependencies.
- 66 source/config/test/script/asset/Oracle/README files match main checkout; deepseek-extraction-hashes.json. No install; main dependencies incomplete. Bundled Next docs not found, no new Next framework API introduced.

Live actual workspace API3104 -> MIRA8791 -> OpenRouter:
- GET health: reachable/configured/modelReady true,freeOnly false,selected Flash,maxCostUsd0.1.
- POST explicit synthetic case: HTTP200,result.status ok,contract1,full source trace,time and fields.
- BOTH actual models deepseek/deepseek-v4.1-flash. Plan: Morph,reported0.003037 USD; assessment: Together,reported0.007251 USD; total0.010288 USD; latency34782ms. Audit cost_source reported for both; account statement reconciliation not performed.
- Evidence deepseek-live.json. This is an authenticated live two-stage success, not a mock or inference from health.

Browser desktop1247 and mobile390: paid-profile name/budgets and readiness displayed; empty input disables submit; explicit fictional complaint plus opt-in enables submit. Width desktop1247/1247,mobile390/390,no overflow. Screenshots mira-deepseek-{desktop,mobile}.png. No second UI inference or draft save performed (prior save/reload flow separately fixture-verified); no workspace records mutated. Dialog closed and viewport reset. One DOM measurement used an absent explicit role attribute; corrected to existing form node, no product issue. Preview3104 session26388 remains running with own --env-file; MIRA8791 listening.

Review solo. Technical success does NOT establish clinical correctness: the observed model output treated an empty allergy list as a recorded absence and reasoned from missing red flags, so clinician review remains essential. Those statements are retained transparently in evidence, not converted into active advice or repaired by inventing findings. PNPK source/page verification remains absent, Oracle not clinically reviewed, browser data unencrypted, synthetic-only. No independent review per solo constraint.

Jev returned ask_human for paid/account category; Gaffer's explicit paid-Flash authorization already fulfilled that request; no account/privacy settings or purchase changed. Future work: separate clinical evaluation of missing-data interpretation and verified guideline sourcing before any real patient use. Free-only plan superseded; paid technical integration complete.