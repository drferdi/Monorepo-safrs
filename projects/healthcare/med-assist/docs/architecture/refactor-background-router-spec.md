# Refactor Background Router Split Spec

Tanggal: 2026-06-18

## Rule

Do not rename message strings. Do not change payload shapes. Keep `registerBackgroundHandlers()` behavior inside `entrypoints/background.ts` until parity tests cover route groups.

Before moving any route group, add a route-registration parity test that proves the facade registers the same message handlers in the same order.

## Proposed Internal Modules

| New module                                     | Responsibility                           | Messages                                                                                                                                                |
| ---------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entrypoints/background/transfer-routes.ts`    | RME transfer and cancellation            | `transferRME`, `cancelRMETransfer`, `RME_TRANSFER_PROGRESS`                                                                                             |
| `entrypoints/background/scan-routes.ts`        | Field, history, context, and visit scans | `scanFields`, `scanMedicalHistory`, `scanClinicalContext`, `scanVisitHistory`, `resolveTenagaMedis`, `pageReady`, `scrapeResult`, `visitHistoryScraped` |
| `entrypoints/background/fill-routes.ts`        | Direct fill commands                     | `fillResep`, `fillAnamnesa`, `fillDiagnosa`, `fillAnamnesa` native response path                                                                        |
| `entrypoints/background/cdss-routes.ts`        | CDSS engine and API calls                | `getSuggestions`, `getRecommendations`, `checkInteractions`, `checkAllergies`, `calculatePediatricDose`, `getCDSSStatus`, `initializeCDSS`              |
| `entrypoints/background/bridge-sync-routes.ts` | Bridge poller and patient sync callbacks | `BRIDGE_SYNC_RESULT`                                                                                                                                    |

## Native Message Handlers

Native `browser.runtime.onMessage` handlers remain in `entrypoints/background.ts` until native-message parity tests exist. This includes `scanFields`, `scanMedicalHistory`, `scanClinicalContext`, `fillAnamnesa`, and `triggerRiwayatClick`.

## Behavior-Preserving Constraints

The split must preserve:

- Listener registration order.
- Singleton state and shared helper identity.
- Cache keys.
- Timeout values.
- Tab-selection fallback.
- Content-script injection retry behavior.
- Native `sendResponse` and `return true` semantics.
- Bridge poller side effects.
- Audit and progress broadcasting.

## Validation

- Required now: `npm run test -- tests/runtime/message-contract-parity.test.ts utils/messaging.runtime.test.ts lib/rme/transfer-orchestrator.test.ts`
- Pending follow-up before route movement: add route-registration parity coverage for each route group. The previous `tests/runtime/background.exec-scrape.test.ts` and `tests/runtime/content.exec-scrape.test.ts` checks are not present in this branch and should not be required until they exist.
- Required after an actual router split: `npm run test:e2e` or an explicit manual extension smoke covering install, background startup, scan, fill, transfer, bridge sync, and progress broadcast paths.
- `npm run typecheck`
- `npm run lint`

## Rollback

Because each split keeps `entrypoints/background.ts` as the facade, rollback is limited to restoring the moved route group, restoring any moved shared helpers or singleton state, and deleting the new route module.
