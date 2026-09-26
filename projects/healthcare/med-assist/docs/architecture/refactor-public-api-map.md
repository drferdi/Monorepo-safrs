# Refactor Public API Map

Tanggal: 2026-06-18
Rule: keep public imports stable unless Chief approves an API change.

## Classification

| Module | Status | Reason | Allowed action |
| --- | --- | --- | --- |
| `utils/messaging.ts` | Runtime contract | Shared panel, worker, content messaging facade | Add parity metadata only |
| `utils/types.ts` | Runtime contract | Used by content, worker, RME, API bridge, and tests | No type deletion without contract test |
| `types/api.ts` | Runtime contract | CDSS and API response shapes | No public field rename |
| `types/shared-types.ts` | Shared contract facade | Used by trajectory and platform client tests | Keep import path stable |
| `lib/api/bridge-client.ts` | Runtime contract | Bridge config, consult, sync, canonical evaluate | Split internals, preserve exports |
| `lib/api/platform-api-client.ts` | Migration-hold | Contains orchestrator pivot note | Separate platform migration |
| `components/clinical/TTVInferenceUI.tsx` | Runtime UI | Mounted from sidepanel | Preserve default and named export |
| `components/clinical/ClinicalDifferential.tsx` | Runtime UI | Mounted from sidepanel and tested | Preserve props and named export |
| `components/clinical/ClinicalTrajectory.tsx` | Runtime UI | Mounted from sidepanel | Preserve props and named export |
| `components/cdss/index.ts` | Public-hold | Exported widget set, not mounted in initial probe | Keep until product decision |
| `components/clinical/ResepForm.tsx` | Public-hold | Exported component, not mounted in initial probe | Keep until product decision |
| `lib/store.ts` | Stale-candidate | `useEncounterStore` only self-referenced in initial probe | Do not delete before storage map |
| `lib/settings-store.ts` | Deleted | Pieces settings store had only self-references during deletion proof | Dependency removal remains a separate migration |
| `@pieces.app/pieces-os-client` | Dependency migration candidate | Package appears unused by source | Remove in separate dependency migration |

## Required Proof Before Deletion

Run these commands immediately before any deletion:

```powershell
rg -n "useSettingsStore|PiecesSettings|sentra-settings-storage|@pieces" --glob "!node_modules/**" --glob "!.wxt/**"
rg -n "useEncounterStore|EncounterState|setPatientContext|setAnamnesaData" --glob "!node_modules/**" --glob "!.wxt/**"
rg -n "CDSSWidget|DiagnosisCard|RedFlagAlert|ConfidenceMeter|CDSSDisclaimer" entrypoints components lib tests --glob "*.ts" --glob "*.tsx"
rg -n "ResepForm" entrypoints components lib tests --glob "*.ts" --glob "*.tsx"
```

Expected before deleting `lib/settings-store.ts`: only `package.json`, `package-lock.json`, and `lib/settings-store.ts` mention Pieces settings names. If any runtime source imports it, do not delete it.

After deleting `lib/settings-store.ts`, run `npm run typecheck`, `npm run lint`, and `npm run test`. Deletion is not accepted unless all three commands pass.

## Public API Stability Rule

Facade files may re-export from new internal modules. Existing import paths must keep compiling:

- `@/lib/api/bridge-client`
- `@/utils/messaging`
- `@/utils/types`
- `@/types/api`
- `@/types/shared-types`
- `@/components/clinical/TTVInferenceUI`
- `@/components/clinical/ClinicalDifferential`
- `@/components/clinical/ClinicalTrajectory`
- `@/components/cdss`
- `@/components/clinical/ResepForm`

## Dependency Follow-Up

`@pieces.app/pieces-os-client` remains in `package.json` after deleting `lib/settings-store.ts`.
Remove it in a separate dependency migration so package-lock churn is isolated from source refactor review.
