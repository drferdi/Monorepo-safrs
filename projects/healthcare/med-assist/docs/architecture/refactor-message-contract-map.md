# Refactor Message Contract Map

Tanggal: 2026-06-18

## Typed ProtocolMap Messages

The typed protocol names are exported from `utils/messaging.ts` as `PROTOCOL_MESSAGE_NAMES`.

| Message                  | Primary sender                       | Primary handler                         | Notes                                       |
| ------------------------ | ------------------------------------ | --------------------------------------- | ------------------------------------------- |
| `fillResep`              | UI components                        | `entrypoints/background.ts`             | Routes to content `execFill`                |
| `fillAnamnesa`           | UI components                        | `entrypoints/background.ts`             | Routes to content `execFill`                |
| `fillDiagnosa`           | UI components                        | `entrypoints/background.ts`             | Routes to content `execFill`                |
| `transferRME`            | `ClinicalDifferential` and sidepanel | `entrypoints/background.ts`             | Uses `RMETransferOrchestrator`              |
| `cancelRMETransfer`      | `ClinicalDifferential`               | `entrypoints/background.ts`             | Cancels active transfer run                 |
| `pageReady`              | `entrypoints/content.ts`             | `entrypoints/background.ts`             | Content readiness notification              |
| `scrapeResult`           | content runtime                      | `entrypoints/background.ts`             | Scrape result update                        |
| `execFill`               | background                           | `entrypoints/content.ts`                | Direct content fill command                 |
| `execScrape`             | background                           | `entrypoints/content.ts`                | Direct content scrape command               |
| `getSuggestions`         | differential UI and CDSS widget      | `entrypoints/background.ts`             | CDSS diagnosis path                         |
| `getRecommendations`     | differential UI                      | `entrypoints/background.ts`             | Prescription recommendation path            |
| `checkInteractions`      | CDSS UI                              | `entrypoints/background.ts`             | Drug interaction path                       |
| `checkAllergies`         | CDSS UI                              | `entrypoints/background.ts`             | Allergy path                                |
| `calculatePediatricDose` | CDSS UI                              | `entrypoints/background.ts`             | Pediatric dose path                         |
| `getCDSSStatus`          | CDSS widget                          | `entrypoints/background.ts`             | Engine status                               |
| `initializeCDSS`         | CDSS widget                          | `entrypoints/background.ts`             | Engine initialization                       |
| `scanFields`             | diagnostics and background self-heal | `entrypoints/background.ts` and content | Form field scan                             |
| `scanMedicalHistory`     | sidepanel and trajectory flows       | `entrypoints/background.ts` and content | Medical history scan                        |
| `scanVisitHistory`       | sidepanel and trajectory flows       | `entrypoints/background.ts` and content | Visit history scan                          |
| `scanClinicalContext`    | sidepanel                            | `entrypoints/background.ts` and content | Facility, payer, allergy, pregnancy context |
| `resolveTenagaMedis`     | sidepanel and differential           | `entrypoints/background.ts` and content | Live resolver plus cache fallback           |
| `visitHistoryScraped`    | content/background                   | `entrypoints/background.ts`             | Acknowledges visit history scrape           |

## Raw Runtime Messages

Known raw messages are not part of `ProtocolMap` and need separate parity coverage:

- `RME_TRANSFER_PROGRESS`
- `BRIDGE_SYNC_RESULT`
- `getCurrentPageType`
- `getPatientInfo`
- `scanFieldsDAS`
- `mapFieldsDAS`
- `previewMappingDAS`
- `sentra-main-world-ready`
- `sentra-riwayat-result`
- `sentra-trigger-riwayat`
- `sentra-native-fetch-request`
- `sentra-native-fetch-response`
- `sentra-fill-fields`
- `sentra-fill-fields-response`

## Refactor Rule

Before splitting `entrypoints/background.ts`, add or update tests that cover every changed message group. Do not rename message strings in a structural refactor.
