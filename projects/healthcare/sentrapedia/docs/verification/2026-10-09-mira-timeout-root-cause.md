# MIRA diagnosis timeout root-cause check

Date: 2026-10-09 (Asia/Jakarta)
Scope: Sentrapedia diagnosis path and its dedicated local MIRA 8791 service only. Read-only diagnosis; no inference submitted during this check, and no case/request/response text was inspected or copied.

## Finding

The newest MIRA audit entry observed was trace `296a6b8c-ce28-4afd-bba7-017bc2dbd769`: status `unavailable`, error `TIMEOUT`, total latency `120016 ms`. Its only completed call was `plan`, served by OpenRouter provider Wafer, at `89.58 s`, with reported cost `$0.00382`. No completed `assessment` call is recorded. MIRA runs planning and assessment sequentially under one shared 120-second deadline, so less than 31 seconds remained after planning; the service returned no partial result when the deadline expired. This is the direct cause of the observed no-result timeout.

This is an intermittent upstream latency issue, not a general lack of service availability. Read-only health probes at 3104 and 8791 returned reachable/configured/modelReady and `status=ok`, respectively; these probes do not test inference. Recent audit entries include full successful two-call analyses at 39.266, 46.422, 58.750, 60.625, 76.906, and 83.671 seconds, plus this 120-second timeout and an earlier 60-second timeout. Thus the local evidence does not support a claim that every recent call failed.

The Oracle catalogue is downstream/local reference data and is not reached before MIRA's two model calls finish; Oracle is not the cause of this timeout. Sentrapedia's 135-second proxy timeout is longer than the MIRA 120-second deadline and was not the initiating limit.

## Remediation boundary

The probable latency mitigation is throughput sorting among endpoints that already satisfy current provider requirements. OpenRouter documents that `provider.sort="throughput"` sorts eligible endpoints by throughput; the model variant `:nitro` also makes priority-tier endpoints eligible and can incur priority pricing. Therefore `:nitro` is not proposed. Preserve `zdr=true`, `data_collection=deny`, `require_parameters=true`, model selection, prompts, schemas, budgets, and clinical behavior.

The routing adapter belongs to shared MIRA source outside this capsule. Gaffer's existing instruction forbids changing the shared MIRA service. No code, runtime process, credential, model request, or Patient/Encounter data was changed. The smallest safe implementation requires explicit scope expansion: add an opt-in per-process throughput-sort setting defaulting off in shared MIRA, enable it only for the dedicated Sentrapedia 8791 launcher, then verify with one synthetic-only call within the existing budgets. Do not change or restart 8787/Med Assist.

## Evidence and limits

- Audit metadata only: `.runtime/mira-deepseek/audit/audit-2026-10-08.jsonl`; request and response values were intentionally excluded.
- Health-only status: workspace API 3104 and MIRA 8791 returned healthy and the expected Flash profile.
- Provider routing behavior reference: https://openrouter.ai/docs/guides/routing/model-variants/nitro
- No inference retry was made; improved completion latency remains unverified.
- Clinical quality, missing-data interpretation, and Oracle source validation remain outside this incident review.

## Next step

Ask Gaffer whether the narrowly scoped shared-MIRA opt-in for only Sentrapedia's 8791 process is authorized. If approved, implement, run focused adapter tests and capsule gates available without installing dependencies, restart only the verified 8791 listener, and perform one synthetic-only inference to confirm the route and returned result.

## Live check after throughput sort - 2026-10-09

The dedicated MIRA listener was restarted with `MIRA_OPENROUTER_PROVIDER_SORT=throughput` through the Sentrapedia launcher. No `:nitro` variant is used. Port 8791 serves the new code; port 8787 remains the existing PID. Workspace3104 remained running. Health at3104,8791,8787 reported reachable/configured/modelReady and `ok`; health does not establish inference latency.

Exactly one fictional-only POST was sent to same-origin `http://127.0.0.1:3104/api/mira`, avoiding the browser composer so no Patient/Encounter or current composer state was changed. HTTP200, analysis status `ok`, wall latency80130ms, provider-reported costUSD0.017616; audit latency80047ms/costSource reported. Safe stage metadata: plan29.22s and assessment50.82s, both served by Together. No text of the request or result was inspected/copied into the report. No retry was sent. Daily cost budget remained within the approved cap.

The feature therefore completed one formerly unavailable class of request within the120s MIRA deadline, but a single result cannot prove improved or reliable latency: 80s is still slow and overlaps prior successful 39-84s runs. Do not claim the delay issue fully resolved. No composer draft/save/reload was verified in this check; earlier proof remains distinct. Clinical accuracy, output quality and missing-data interpretation remain unvalidated.

Verification: focused provider tests32passed, full MIRA service suite129passed/1skipped, with17 existing Starlette/Pydantic deprecation warnings; launcher `-ValidateOnly` PASS; PowerShell launcher parse PASS; current health good. No npm tests/build ran because this change did not alter Sentrapedia TypeScript and the main-checkout dependency limitation persists. No install.

Manual self-review: shared adapter defaults to the old routing body, rejects non-throughput and non-OpenRouter settings at startup, and merges privacy policy after caller values; the `StepEngine` passes the setting only on its OpenRouter branch. Sentrapedia launcher is the sole location that enables it. No fresh-context reviewer was dispatched because Gaffer explicitly directed solo work/no additional workers. This is a review limitation.

Final: Ruling: choose one direct local gateway POST rather than browser composer submission to preserve active browser-local data - no Patient/Encounter state was written - cost if wrong: composer save/reload behavior is not re-proven in this session.
