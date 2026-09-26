# MEDLINK

MEDLINK adalah public-production sandbox untuk eksplorasi diagnosis banding,
pemetaan ICD-10, dan pertimbangan rujukan menggunakan data sintetis. Aplikasi
ini tidak boleh menerima identitas pasien atau PHI dan tidak menggantikan
penilaian klinisi.

## Runtime and architecture

- React 19, Vite 6, TypeScript 5.8, and Vercel Node handlers.
- Same-origin email-code authentication with an opaque, single-use challenge.
- Signed `medlink_session` cookie: `HttpOnly`, `Secure`, `SameSite=Strict`,
  `/api`, eight-hour expiry.
- Upstash Redis REST for challenge consumption, active sessions, distributed
  quotas, and one-request-per-subject concurrency.
- Diagnosis limits: 10 requests per 15 minutes per verified subject and 30 per
  15 minutes per IP. Store failures deny access.
- IndexedDB v3 stores only schema-v2 redacted Logbook audit envelopes and
  metadata-only Credential records. Browser secrets are not supported.
- Active diagnosis and referral responses are never cached.
- Canonical Sentra light/dark design from
  `apps/internal/sentrahub/sentra-hub.html`.

## Local commands

From this capsule root (pnpm 11.21.0, Node 24):

```bash
node scripts/pnpm.mjs install --frozen-lockfile
node scripts/pnpm.mjs run dev
node scripts/pnpm.mjs run test
node scripts/pnpm.mjs run test:browser
node scripts/pnpm.mjs run lint
node scripts/pnpm.mjs run build
```

Local development uses `http://localhost:3007`. Browser acceptance uses
Playwright route interception for synthetic auth, session, and diagnosis
fixtures. It does not expose a runtime test flag or require live email, Redis,
or model providers.

## Production configuration

Required server-side variables are documented in
[docs/ENVIRONMENT_VARIABLES.md](./docs/ENVIRONMENT_VARIABLES.md). Never expose
auth, Redis, email, or model-provider secrets through `VITE_*` variables.

`APP_URL` is the single canonical origin. Browser API clients use fixed
same-origin `/api/*` paths; wildcard credentialed CORS is not supported.

## Release posture

The repository implements the public-production boundary, but this README does
not claim that deployment or live-provider acceptance has occurred. Release
evidence is tracked in
[docs/MEDLINK_FINALIZATION_AND_IMPROVEMENT_PLAN.md](./docs/MEDLINK_FINALIZATION_AND_IMPROVEMENT_PLAN.md).
