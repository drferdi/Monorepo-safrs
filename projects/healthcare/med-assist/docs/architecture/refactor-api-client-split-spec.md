# Refactor API Client Split Spec

Tanggal: 2026-06-18

## Rule

Keep `@/lib/api/bridge-client` as the public import path. Move internals behind re-exports only. All current exported functions, types, constants, and schemas must remain import-compatible from `@/lib/api/bridge-client`.

## Proposed Internal Modules

| New module                          | Responsibility                                    | Public exports preserved by `bridge-client.ts`                                                                |
| ----------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `lib/api/bridge-config.ts`          | Bridge config and runtime readiness               | `getBridgeConfig`, `saveBridgeConfig`, `getBridgeRuntimeStatus`, `isBridgeReady`                              |
| `lib/api/bridge-consult.ts`         | Online doctors and consult send                   | `getOnlineDoctors`, `sendConsultToDoctor`                                                                     |
| `lib/api/bridge-canonical.ts`       | Canonical clinical and differential evaluate      | `evaluateCanonicalClinicalEngine`, `evaluateCanonicalDifferential`, schema guards                             |
| `lib/api/bridge-entry-lifecycle.ts` | Inbound bridge entry lifecycle                    | `fetchPendingEntries`, `fetchEntryDetail`, `claimEntry`, `reportProcessing`, `reportComplete`, `reportFailed` |
| `lib/api/bridge-patient-sync.ts`    | Patient sync outbound call                        | `syncPatientToDashboard`                                                                                      |
| `lib/api/bridge-clinical-utils.ts`  | Display filtering and clinical extraction helpers | `filterDoctorsForDisplay`, `extractClinicalAnamnesis`                                                         |

## Current Behavior

`lib/api/bridge-client.ts` combines config, auth-source resolution, readiness probes, schema guard constants, canonical evaluate calls, inbound entry lifecycle calls, doctor consult calls, display filtering, clinical extraction, and patient sync.

## Structural Improvement

Each bridge concern gets a small module while `bridge-client.ts` remains the compatibility facade.

## Behavior-Preserving Constraints

- Keep shared transport and auth helper behavior centralized; do not duplicate or fork `bridgeFetch` semantics.
- Preserve auth-source detection, error mapping, retry behavior, schema guards, extraction circuit state, readiness message wording, and correlation id behavior.
- Preserve all current public exports from `@/lib/api/bridge-client`, including functions, types, constants, and schemas, through facade re-exports.

## Validation

- Before moving internals, add a facade export contract test or TypeScript import contract that imports all current public symbols from `@/lib/api/bridge-client`.
- The split is not accepted unless that export contract passes with the existing tests.
- `npm run test:contract`
- `npm run test -- lib/api/bridge-client.test.ts lib/api/bridge-client.local-server.test.ts lib/api/platform-api-client.test.ts components/clinical/TTVInferenceUI.forward-doctor.test.tsx`
- `npm run typecheck`
- `npm run lint`
