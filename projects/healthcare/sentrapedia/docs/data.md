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

`src/app/api/mira/route.ts` forwards case reviews to the bundled `mira/service` started by `scripts/run-system.mjs`. The supervisor supplies its private loopback URL and token to the server; the browser never sees the token. The request/response schemas remain in `src/lib/mira/` and `mira/service/contract/`. Oracle II retrieval validates page/source hashes before forwarding evidence. Only confirmed synthetic cases may be sent. `.env.example` names the server-side provider key; no external MIRA folder is needed. See `docs/mira-integration.md`.