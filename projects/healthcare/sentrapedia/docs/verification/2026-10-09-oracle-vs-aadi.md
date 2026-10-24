# Comparison of Oracle and the AADI that Med Assist uses

Date: 2026-10-09. Scope: inspection of local code and documentation plus a local GET health check only. No change to Med Assist or AADI, no credential read, no paid inference, no installation, and no Sentrapedia wiring implemented.

## Conclusion

AADI already has a diagnosis integration that can be adapted for Sentrapedia. Oracle is a local reference dataset of 144 entries. The two serve different functions: case reasoning through the AADI service, disease lookup and detail from Oracle. Neither the Oracle schema nor the available AADI contract yet provides a PNPK citation per document and page.

The service Med Assist uses is the assist/service step mode in <mira-system>, not the full upstream simulation runner. engine.py limits each step to two model calls (planning, structured assessment) and uses deterministic post-checks, a budget/error breaker, and contract validation. The README explains that step mode needs neither FHIR nor Qdrant. The 35–50 call estimate from the older upstream assessment is not used to judge this service path.

## Readiness evidence at the time of inspection

- GET http://127.0.0.1:8787/healthz returned HTTP 200, status ok, with status/version/contractVersion fields. This proves the local service responds; it does not yet prove that the current inference, model or provider succeeds.
- The SHA-256 of aadi-step-request.schema.json and aadi-step-response.schema.json is identical between Med Assist lib/diagnosis-engine/contract and AADI assist/service/contract.
- Med Assist lib/diagnosis-engine/mira-engine.ts has an adapter for POST /v1/diagnosis/step, contract v1, a 15 s timeout, abort, JSON validation, and a PII guard before sending. run-diagnosis.ts renders the differential, missing information and next-best actions; on failure it falls back to legacy with a notice.
- wxt.config.ts makes aadi the default production build when no flag is given. Development without a flag is still legacy. ADR-005, Accepted 2026-09-28, records Gaffer's decision. Some older comments and docs still say off-by-default or proposed; the config code and the accepted note distinguish production from development.
- aadi-supervisor.ts and native messaging com.sentra.mira provide autostart for the extension. An ordinary Sentrapedia web page has no Chrome nativeMessaging API; it needs a server connection to an already running service and a lifecycle strategy of its own.
- The new service auth.py/app.py supports a development token; production startup is refused until a production verifier exists. Local readiness is not treated as production readiness.

## Comparison

| Aspect | Sentrapedia Oracle | Med Assist AADI |
| --- | --- | --- |
| Form | JSON/TS files, 144 records | HTTP reasoning service plus an extension adapter |
| Input | Name/code/category for lookup | A structured CaseState: de-identified demographics, complaint, history, vitals, physical examination, results, drugs, conditions/allergies and facility |
| Output | Definition, symptoms, diagnosis/therapy/referral narrative | likely/alternatives/cannotMiss, evidence supporting/opposing, missingInformation, nextBestActions, disposition/unfilled and metadata |
| Case analysis | No engine yet | The reasoning and rendering path already exists |
| Source trail | A file/record identity can be produced; a general reference does not yet prove the content of each entry | Engine/version/model/trace/cost/latency; evidence is case-related reasoning, not yet a bibliographic guideline citation |
| Coverage | 144 records; 15 actual categories; labels and codes need review | An output code may fall outside the local KB; clinical accuracy needs a separate evaluation |
| Dependencies | Local; lookup calls no model | The local service and the configured model provider; an inference step may consume quota and cost |
| When the service fails | Local lookup stays available | Med Assist uses the legacy fallback; Sentrapedia does not have that fallback engine |
| Therapy | The original narrative is not reviewed | The step contract provides no drug regimen; Med Assist's separate drug path uses a KB/safety filter when the prescription API is not configured |
| Sentrapedia implementation | A data adapter and a lookup UI | A CaseState/response adapter, a server path, de-identification, a review UI, timeout/error handling, server configuration and lifecycle |

## Suggested wiring direction

1. Keep Oracle as the local reference catalogue, with provenance and review status. Do not change the category codes, do not make ICD the primary key, and do not drop an AADI diagnosis merely because it is absent from the 144-entry catalogue.
2. Adapt the AADI v1 contract as a local, versioned Sentrapedia contract. Connect through the Sentrapedia server API to the service that already exists; credentials stay server-side. Do not import source from the Med Assist capsule, do not use a VITE or client token, and do not carry the extension or native-host dependency into the web app.
3. Separate case-reasoning rationale from the guideline source. Store the trace, the version, the de-identified input and the review status on the analysis result. An official PNPK and a page citation require a separate, verified registry and retrieval. Do not treat AADI output as automatically validated by Oracle or PNPK.
4. When AADI is unavailable, show an unavailable status and keep the catalogue and drafts; do not invent a legacy diagnosis engine in Sentrapedia. Live inference counts as R3 clinical logic; the integration and review details, and permission to use the service, still have to be settled before implementation.

No new AI provider has to be chosen in order to adapt the service already in use. This inspection read neither src/.env nor ran a POST diagnosis, so the active provider and model, the actual cost, and today's live clinical results are untested. What the README says about historical models and cost is not treated as the current configuration or the current rate.

## Main code references

- Med Assist: lib/diagnosis-engine/types.ts, aadi-engine.ts, run-diagnosis.ts, aadi-supervisor.ts, contract/aadi-step-{request,response}.schema.json; wxt.config.ts; docs/adr/adr-005-pluggable-diagnosis-engine-aadi-candidate.md.
- Therapy: Med Assist lib/api/sentra-api.ts, the getPrescriptions branch taken when PRESCRIPTION_API_CONFIGURED is false (line 956 onward).
- AADI service: assist/service/README.md, engine.py, app.py, auth.py, contract/SOURCE.md. The upstream assessment assist/MIRA_ASSESSMENT.md is distinguished from the step service actually used.
- Oracle: docs/verification/2026-10-09-oracle-readiness.md and oracle/sentrapedia.json.

Result: the comparison, the health check and the contracts were verified directly. No tests or builds were re-run, and no claim is made about clinical accuracy, production readiness, or Sentrapedia wiring being finished.
