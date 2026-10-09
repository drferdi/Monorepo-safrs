# OpenRouter gratis untuk MIRA

Gaffer authorizes free OpenRouter models on 2026-10-09. This supersedes the earlier no-new-provider-selection boundary for this configuration. Keep the MIRA planning/assessment/postchecks service; do not replace it with a generic chat call or change the shared service used by Med Assist.

Select apodex/apodex-1.1-mini:free for BOTH plan and assessment. Live public models and ZDR endpoint APIs show zero prompt/completion pricing and support for response_format, structured_outputs, temperature. Technical compatibility only, no clinical accuracy claim. No paid fallback, auto/nitro variants, or privacy weakening. Keys absent in current process; configuration-only until an authorized key is available.

Plan (solo): tests first for model-policy parsing + gateway no-inference block → free-profile helper and health/step model verification → UI readiness label and optional isolated service profile → typecheck/lint/targeted tests/build/dry-run/extraction proof, browser actual unready state, HANDOFF. Separate local MIRA instance may be configured using existing installed service with explicit environment; no shared .env edits or restart of 8787.

Acceptance: paid planning OR assessment OR other provider OR unknown version blocks POST before inference; missing token/key explicit; valid pinned free service accepts existing contract; returned model metadata and nonzero cost rejected; no silent free router or paid fallback. Original clinical data/rules/Oracle unchanged.
- [x] Free profile, pre-inference model guard, response cost/model validation, UI and isolated launcher prepared.
- [x] Public preflight, 69 tests, typecheck/lint/build/dry-run, extraction hashes and desktop/mobile unready state verified.
- [ ] Authorized key location/configuration, isolated MIRA startup and live synthetic zero-cost verification. No secrets available; full startup branch untested. See verification report.
- 2026-10-09 update: authorized own key configured and isolated service running; live Apodex schema error confirmed. Gaffer selected Google Gemma candidate; both free Gemma probes blocked by upstream shared quota. Pending: local JSON-object adapter with original assessment-schema validation, explicit fictional-only privacy profile, pinned Gemma gateway/launcher and live proof after quota availability. No active pin change or paid fallback. Circuit breaker halted this session.
- Other-model probe update: NVIDIA Nemotron3 Super free and Liquid LFM2.5 free both blocked HTTP404 Filter by Data Policy (Free model training) with data_collection deny. Pending explicit training-input consent for fictional-only isolated NVIDIA profile. No active model/account-policy change; circuit breaker halted two probes.
- Status SUPERSEDED by Gaffer paid-Flash approval. Free-only live acceptance was not achieved. Current completed paid integration: docs/plans/completed/2026-10-09-mira-deepseek-flash.md; actual HTTP200 proof in verification report.
