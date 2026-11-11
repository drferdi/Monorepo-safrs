# Architecture

- Single-page React 19 app built by Vite 6 into `dist/`; pages live in `vite-pages/`, UI in
  `components/`, client services in `services/`.
- Server side: Vercel Node handlers in `api/` (`diagnosis.ts`, `auth/sandbox-*`), with shared
  logic in `api/_services/` and `api/_utils/`. `vite.config.ts` mounts the same handlers for
  local development.
- Auth: same-origin email-code sign-in with a single-use challenge and a signed
  `medlink_session` cookie; sessions, quotas, and concurrency are held in Upstash Redis.
- Diagnosis: an OpenAI-compatible gateway (Gemini as fallback) returns ICD-10 candidates and
  referral considerations; results are never cached. Reference data lives in `data/`.
- Browser storage: IndexedDB holds only redacted logbook envelopes and credential metadata.
- Failure modes: a Redis failure denies access; missing model credentials make diagnosis fail
  closed. The full security model is in `README.md`.
