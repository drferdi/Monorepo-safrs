# Sentrapedia data

Sentrapedia has no database. Its data comes from three places.

## Browser storage

- `sentrapedia-workspace-v1` (localStorage): patients, encounters, drafts and settings for the workspace.
- `sentrapedia-feedback` (localStorage): feedback the user leaves on generated drafts.

The storage is unencrypted and is only for fictional demonstration data. Never enter real patient data. The account dialog can export a backup or clear all local records.

## Bundled reference data

- `oracle/sentrapedia.json`: the disease knowledge base (`metadata`, `categories`, `diseases`), read by `src/lib/oracle.ts`.
- `oracle/diseases.json`, `oracle/diseases-data.ts`, `oracle/data.ts`: earlier forms of the same data.

The reference data ships with the build. The app does not change it at runtime.

## MIRA service

`src/app/api/mira/route.ts` forwards case reviews to an optional local MIRA service. It reads `MIRA_SERVICE_URL` and `MIRA_SERVICE_TOKEN` on the server only; the browser never sees the token. `src/lib/mira/request.schema.json` and `src/lib/mira/response.schema.json` fix the payload shapes, and `tests/oracle-mira.test.ts` pins their hashes. Only synthetic cases may be sent. The variable names are listed in `.env.example`; `config/*.env.example` covers the separate MIRA launcher.
