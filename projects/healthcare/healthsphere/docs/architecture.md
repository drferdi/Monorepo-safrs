# Architecture

- `website/`: fully static React 19 + Vite 7 single-page app (sections in
  `website/src/sections/`, site configuration in `website/src/config/site.ts`). No backend.
  Deployed on Railway as static files (`website/railway.toml`). Details:
  `website/ARCHITECTURE.md`.
- `website/scripts/sync-google-reviews.mjs`: manual script that pulls Google reviews into a
  JSON file with `GOOGLE_MAPS_API_KEY`; not part of the lifecycle.
- `database/`: JSON master data (ICD-10, 144 Puskesmas diseases, ICD-X extensions), consumed as
  reference data. Details: `database/PROJECT_CONTEXT.md`.
- `scripts/`: capsule-level wrappers (`pnpm.mjs`, `deploy-dry-run.mjs`).
