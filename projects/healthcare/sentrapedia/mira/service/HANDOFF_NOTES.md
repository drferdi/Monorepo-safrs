# Handoff — MIRA reasoning service (2026-09-27, evening)

Private, gitignored (`*_NOTES.md`). Overwrite, do not append.

## State

Branch `feat/reasoning-service` (local only, never pushed; `origin` is the upstream author's repo).
HEAD `a3e7fef`. Main steps: `3335814` service · `e71d5b4` OpenRouter · `6fca624` data policy ·
`48f6b1b` deadline report · `8c1719c` `:nitro` preflight · `98fa73b` provider in smoke test ·
`bb3fe85` `X-MIRA-Plan-Model` allowlist · `f501fb5` CORS + `run_local.ps1` · `a3e7fef` script takes
the dev token from `src/.env`. Upstream files untouched (`git diff 73666b1 -- src` empty).

`src/.env` (never read; names only): `MIRA_LLM_PROVIDER=openrouter`,
`MIRA_PLAN_MODEL=google/gemini-3.1-flash-lite:nitro`, `MIRA_PLAN_MODEL_CHOICES` (gemini nitro,
mercury-2, gpt-6-luna), `MIRA_DEV_TOKEN`, `OPENROUTER_API_KEY` (Chief), `OPENAI_API_KEY` empty, and
since 2026-09-27 `MIRA_DATA_POLICY=openrouter-zdr` (Chief's decision, appended on his answer).
Code defaults unchanged (o1 / gpt-4o); assessment `openai/gpt-4o`; OpenRouter privacy policy fixed.

## Running

Chief's terminal runs the service on `127.0.0.1:8787`; `/healthz` reports
`data=openrouter-zdr`. The agent may not stop or restart it (auto mode denied); ask Chief.

## Med Assist integration: working end to end

- Med Assist (`feat/diagnosis-engine-interface`) sends `Authorization: Bearer VITE_MIRA_DEV_TOKEN`.
  Its build takes `SENTRA_DIAGNOSIS_ENGINE=mira` from `.env.production.local` and the service URL
  (`http://127.0.0.1:8787`) and token from `.env.local` (single source since 2026-09-27 evening).
  Token fingerprint equal on both sides (`dev-b1a8771b`). Extension rebuilt and verified.
- Temporary instance on 8788 (since stopped) with the extension's client code and the synthetic
  request example, no synthetic marker: `ok`, K35.3, 7.9 s, US$0.017831.
- First real side-panel request: `ok`, likely J45.9/J18.9, alternative J20.9, cannot-miss J96.0,
  9.7 s, US$0.016142. Visual check in the panel pending Chief.
- Verify outcomes in `audit/audit-<date>.jsonl`: read status, errorCode, ICD codes, latency and
  cost only; never print request/response case content.

## Live model results so far (synthetic appendicitis, except the panel request)

gpt-6-luna 14.6 s US$0.013 (over 12 s) · deepseek-v4-flash TIMEOUT >120 s (~US$0.002 billed, not
logged) · mercury-2 9.6 s US$0.015 · gemini-3.1-flash-lite:nitro 9.6 s US$0.019. All K35.3,
refer/urgent, empty alternatives and cannotMiss.

## Verified

`pytest` in `assist/service`: 125 passed, 1 skipped (2026-09-27 evening).

## 2026-10-01 — MODEL_ERROR fix (Chief chose: change the assessment model)

- Cause (audit 2026-10-01, 3 real steps): 2x assessment `RateLimitError` (gpt-4o has one ZDR
  provider, Azure; no fallback), 1x TIMEOUT (plan 11.85 s of the 12 s deadline).
- Appended `MIRA_ASSESS_MODEL=openai/gpt-oss-120b:nitro` to src/.env (overrides "assessment
  `openai/gpt-4o`" above). Preflight OK. Live smoke on Chief's "jalankan": ok, 5.6 s, US$0.0098;
  assessment 1.86 s on Cerebras; alternatives and cannotMiss filled, `nextBestActions` in
  `unfilled` (new, watch it). README `04b99df`.
- Stopped the old service (PID 4436, still gpt-4o); the native host `com.sentra.mira` respawns it
  when the panel opens. Not yet seen live from the panel.
- Still open: plan latency on real cases (11-12 s) vs 12 s deadline; 429 details are not logged.

## Open (Chief decides)

1. Timeout cost gap: guard and daily budget do not count timed-out calls OpenRouter still bills;
   proposed fix = worst-case estimate + test, waits for "perbaiki".
2. Whether the assessment step must always fill cannotMiss (clinical/prompt decision).
3. Production token verifier (crew-portal service token); hosting; ICD list licence.
4. Full dry run needs port 8080 (`temporal-ui` holds it; Chief frees it).

## Rules

Live calls triggered by Med Assist `mira` mode are allowed under `openrouter-zdr`; any scripted or
agent-triggered run still needs Chief's "jalankan" (synthetic only, max 2 calls, `--max-usd 1`).
Never change `MIRA_DATA_POLICY` again without Chief.
