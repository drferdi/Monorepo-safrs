# MIRA reasoning service (step mode)

A small HTTP service that answers Med Assist's diagnosis-engine contract
(`POST /v1/diagnosis/step`, contract version `1`, vendored in `contract/`). One step takes the
case as the physician has recorded it so far and returns a differential (likely, alternatives,
cannot-miss), evidence, missing information, next best actions and a treat/refer suggestion.
Fields the model cannot support are left empty and listed in `unfilled`.

It reuses MIRA's planning routine (`src/routines.py` `ROUTINE_PROMPT`, `src/config.py`
`REASONING_MODEL`) and tool menu (`src/tools.py`, without `ProcedureSearch`). It does not use
MIRA's patient simulator, FHIR server or Qdrant. Upstream files are not modified.

## How one step works

1. Token check (development token only), rate limit, size limit, contract validation of the
   request (invalid → HTTP 400).
2. PII re-check (NIK, BPJS, phone, email, titled names) → `unavailable` + `PII_DETECTED`.
3. Daily budget and API-error pause → `unavailable` + `BUDGET_EXHAUSTED` / `API_ERRORS`.
4. Call 1: MIRA's planning routine on the case and the menu (default model `o1`).
5. Call 2: structured assessment in the contract's shape (default `gpt-4o`, strict JSON schema).
6. Deterministic post-checks: ICD-10 codes against `data/icd10.json` (invalid codes removed and
   listed), sex/pregnancy rules from `rules/sex_icd_ranges.json`, tests missing from
   `facilityCapabilities` kept with "Not available here; consider referral."
7. Response validation against the contract, audit log, answer.

Every failure after the request is accepted is HTTP 200 with `status: "unavailable"` and an
`error.code` (`TIMEOUT`, `MODEL_ERROR`, `MODEL_OUTPUT_INVALID`, `STEP_BUDGET_EXCEEDED`,
`CONTRACT_MISMATCH`, `INTERNAL_ERROR`, ...), so Med Assist falls back to its own engine.

## Providers

`MIRA_LLM_PROVIDER=openai` (default) calls OpenAI directly with `OPENAI_API_KEY`.
`MIRA_LLM_PROVIDER=openrouter` calls OpenRouter (`https://openrouter.ai/api/v1`) with
`OPENROUTER_API_KEY`; model ids carry the organisation prefix (defaults `openai/o1`,
`openai/gpt-4o`). Every OpenRouter request carries a fixed policy that no setting can change:

```json
{"provider": {"zdr": true, "data_collection": "deny", "require_parameters": true}, "usage": {"include": true}}
```

If no provider meets it, OpenRouter refuses (HTTP 503) and the step answers `unavailable` with
`PROVIDER_POLICY`; nothing retries without the policy. Cost comes from `usage.cost` when the
response reports it (credits, denominated in US dollars) and otherwise from the local price table.
`usage.cost` does not include OpenRouter's 5.5% fee on buying credits, so money actually spent is
about 5.5% higher than the logged cost;
the audit log records `cost_source` (`reported`/`estimated`) and the serving provider when the
response names it. `meta.version` carries `+provider=...`, and any OpenRouter run is marked
`+experimental`.

Current local choice (the project owner's, 2026-09-27; code defaults unchanged):
`MIRA_LLM_PROVIDER=openrouter` and `MIRA_PLAN_MODEL=google/gemini-3.1-flash-lite:nitro` in
`src/.env`; the assessment stays `openai/gpt-4o`. `:nitro` makes OpenRouter pick the fastest
eligible zero-data-retention provider (it may bill a priority tier). One live step on the
synthetic example took 9.6 s and US$0.019.

Since 2026-10-01 (the project owner's choice) the assessment is
`MIRA_ASSESS_MODEL=openai/gpt-oss-120b:nitro`: `openai/gpt-4o` has a single zero-data-retention
provider (Azure), whose rate limits (HTTP 429) ended real steps in `MODEL_ERROR`; gpt-oss-120b
has many. One live step on the synthetic example: 5.6 s (assessment 1.9 s, Cerebras), US$0.0098.

A client may pick the planning model for one step with the header `X-MIRA-Plan-Model`
(used by Med Assist's developer/admin model picker). Only `MIRA_PLAN_MODEL` and the models in
`MIRA_PLAN_MODEL_CHOICES` are accepted; any other value is answered `unavailable` +
`MODEL_NOT_ALLOWED` before any model call and is never forwarded. The chosen model appears in
`meta.version`, `meta.model` and the audit line. The request contract is unchanged.

Check a configuration before spending anything (public model and zero-data-retention lists, no
completion call): `smoke_live --provider openrouter` and `run_one_case.py --provider openrouter
--preflight-only` both run it first. On 2026-09-27 `openai/o1` had no zero-data-retention
endpoint on OpenRouter, so the default OpenRouter planning model fails this check.

## Data policy

`MIRA_DATA_POLICY` states which case data may be sent to which provider. It is a data-governance
decision by the project owner; production refuses to start without it, and development defaults
to `synthetic-only`. Neither provider retains nothing by default: OpenAI's API keeps data up to
30 days for abuse monitoring unless OpenAI approves zero data retention.

| Value | Provider | Accepts |
| --- | --- | --- |
| `synthetic-only` | any | only cases marked synthetic |
| `openai-standard-retention` | `openai` | any case; OpenAI keeps data up to 30 days |
| `openai-zdr-approved` | `openai` | any case; requires an OpenAI-approved ZDR agreement |
| `openrouter-zdr` | `openrouter` | any case; every request carries the ZDR policy above |

With `synthetic-only`, an HTTP request must carry the header `X-MIRA-Case-Origin: synthetic`
(the request contract has no field for it), and a case file must contain `"synthetic": true`.
Anything else is refused before any model call with `unavailable` + `DATA_POLICY`, and the
request is not written to the audit log. The value in use appears in `meta.version`
(`+data=...`) and in every audit line. `run_one_case.py` and `sim_benchmark.py` take the same
values as `--data-policy` (default `synthetic-only`).

## Run locally (development)

From the repository root, with `src/.venv` set up by `assist/setup_windows.ps1`:

```powershell
src\.venv\Scripts\python.exe -m pip install -r assist\service\requirements.txt
$env:MIRA_DEV_TOKEN = "<any local token>"   # keys and MIRA_* settings can also come from src/.env
src\.venv\Scripts\python.exe -m uvicorn --factory service.app:create_app --app-dir assist --host 127.0.0.1 --port 8765
```

For the Med Assist extension on this PC, `assist\service\run_local.ps1` starts the same service
on `http://127.0.0.1:8787` in development mode (token from `MIRA_DEV_TOKEN`). Browser origins
allowed by CORS are listed in `MIRA_ALLOWED_ORIGINS`, e.g. `chrome-extension://<extension id>`.

Clients send `Authorization: Bearer <MIRA_DEV_TOKEN>`. `MIRA_SERVICE_ENV=production` is refused
at start-up until a production token verifier exists. Settings are listed in `.env.example`.

## Tests

```powershell
cd assist\service
..\..\src\.venv\Scripts\python.exe -m pytest
```

All tests use a mocked model client. Set `MED_ASSIST_CONTRACT_DIR` to Med Assist's
`lib/diagnosis-engine/contract` to also check that the vendored contract is current.

One live step on the synthetic example (real model calls, at most two; needs the project owner's
approval and `OPENAI_API_KEY`), printing latency, tokens and cost per call:

```powershell
cd assist
..\src\.venv\Scripts\python.exe -m service.smoke_live --max-usd 1   # provider: MIRA_LLM_PROVIDER unless --provider
```

## Docker (step mode only)

```powershell
docker build -f assist/service/Dockerfile -t mira-service .
docker run --rm -p 127.0.0.1:8765:8765 -e OPENAI_API_KEY -e MIRA_DEV_TOKEN mira-service
# through OpenRouter (the image does not read src/.env):
docker run --rm -p 127.0.0.1:8765:8765 -e MIRA_LLM_PROVIDER -e OPENROUTER_API_KEY -e MIRA_PLAN_MODEL -e MIRA_PLAN_MODEL_CHOICES -e MIRA_DEV_TOKEN mira-service
```

## Simulation mode (Gate 1 reference, CLI only)

`python -m service.sim_benchmark --cases DIR --out DIR --max-usd N --max-calls N` (from
`assist/`) runs the published MIRA encounter per case and writes one contract response per case
plus `summary.jsonl` (status, latency, calls, cost). It needs the FHIR server and roughly 35-50
model calls per case.

## Audit log

`assist/service/audit/audit-YYYY-MM-DD.jsonl` (gitignored): one line per step with trace id,
status, calls (model, tokens, cost, latency), request (only after the PII check passed) and
response. It also seeds the daily budget after a restart.

## Auto-start from Med Assist

The Med Assist extension starts this service on demand through `com.sentra.mira`, a Chrome
native messaging host (`assist/host/sentra_mira_host.py`, launched by
`assist/host/sentra_mira_host.bat`) that spawns uvicorn and answers `starting`; the extension
polls `/healthz` until the service is up. The host then keeps the service running for as long
as the browser that launched it stays open; the service stops
once Chrome exits. Register the host for the current Windows user with
`powershell -ExecutionPolicy Bypass -File assist/host/install_host.ps1 -ExtensionId <id>`
(the extension id is shown at `chrome://extensions` in Developer mode, and changes whenever the
unpacked build folder moves, so re-run install after that), and remove it with
`powershell -ExecutionPolicy Bypass -File assist/host/uninstall_host.ps1`.

## Oracle II grounding extension (2026-10-10)

Gaffer approved the local service extension for Sentrapedia. `/healthz` advertises
`oracle-grounding-v1`; v1 requests may include an optional strictly validated `grounding`
bundle with at most six passages, each at most 1,600 characters. Legacy v1 requests remain valid.
Planning, full assessment, fast diagnosis/workup/therapy receive the same separate source
context, with system rules that preserve patient-only evidence and allow unsupported therapy
to remain empty. Source excerpts are reference material, not instructions. The response schema
is unchanged. Source-selection citations are persisted by Sentrapedia, not generated per claim.

Full-payload PII guard remains active. Sentrapedia filters matching public-source excerpts
before sending them. `contract/SOURCE.md` records the local optional extension and current hash;
exact-copy equality with Med Assist is not asserted. Service tests:155 passed,1 optional
source-copy test skipped; fake model clients only. Existing deprecation warnings remain.
Running services must be loaded after this code update; Sentrapedia's dedicated8791 instance
was started and advertises the capability. The shared8787 instance was left untouched.
