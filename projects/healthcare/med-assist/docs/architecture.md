# Architecture

Detailed documents live in [`architecture/`](./architecture/README.md) and [`adr/`](./adr/README.md);
this page is the capsule-level summary.

- Chrome MV3 extension built with WXT (`wxt.config.ts`); output in `.output/chrome-mv3-dev`.
- Entrypoints (`entrypoints/`):
  - side panel (`sidepanel.html`) — the physician-facing UI, under a refactor freeze;
  - background service worker — message routing and orchestration (`lib/handlers/`);
  - content scripts on `*.epuskesmas.id`, one in the MAIN world — scraping the RME and
    auto-filling forms (`lib/scraper/`, `lib/filler/`, `lib/rme/`);
  - offscreen audio and login pages.
- Clinical core (R3):
  - `lib/iskandar-diagnosis-engine/` — deterministic-first diagnosis pipeline, triage and
    referral decision tree (`docs/clinical-rules.md`);
  - `lib/emergency-detector/` — emergency gates;
  - `lib/clinical/` — vitals, trajectory, and related clinical logic;
  - knowledge base `public/data/penyakit.json`, epidemiology priors
    `public/data/epidemiology_weights_v2.json`, drug interactions `data/ddi-clinical.json`.
- Integrations (`lib/api/`): Sentra platform API, crew portal passkey sign-in, optional
  OpenAI-compatible reranker. A PII guard (`lib/api/pii-guard.ts`) screens outgoing payloads.
