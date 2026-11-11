# MEDLINK Environment Variables

## Required for public sandbox

```env
SANDBOX_AUTH_SECRET=replace-with-long-random-secret
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=replace-with-upstash-rest-token
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@your-domain.com
APP_URL=https://your-medlink-domain.com
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-5.6-luna
```

## Optional

```env
RESEND_FROM_NAME=MEDLINK
```

## Notes

- `OPENAI_API_KEY` authenticates `/api/diagnosis`
- `OPENAI_BASE_URL` and `OPENAI_MODEL` must use one approved pair:
  `https://api.openai.com/v1` with `gpt-5.6-luna`, or
  `https://openrouter.ai/api/v1` with `openai/gpt-5.6-luna`
- `SANDBOX_AUTH_SECRET` must be at least 32 characters and derives separate HMAC
  keys for opaque identity hashes, verification challenges, and session signing
- `UPSTASH_REDIS_REST_URL` must be the HTTPS REST endpoint; non-HTTPS URLs fail
  closed
- `UPSTASH_REDIS_REST_TOKEN` is used only by server-side bearer-authenticated
  Redis requests and must never be exposed to the browser
- Verification challenges are random opaque IDs stored for 15 minutes and are
  consumed atomically on the first verification attempt
- Active `medlink_session` identifiers are stored for 8 hours; the cookie is
  signed, `HttpOnly`, `Secure`, `SameSite=Strict`, and scoped to `/api`
- `RESEND_*` powers sandbox verification emails
- Redis/configuration failures deny auth; verification codes are never written
  to server logs as a fallback
- Diagnosis and referral responses are not stored in browser or server caches
- `APP_URL` is the only accepted production origin; browser clients use fixed
  same-origin `/api/*` endpoints
- Diagnosis quotas are 10 requests per 15 minutes per verified subject and 30
  per 15 minutes per IP, with one active request per subject
- No server secret may use a `VITE_*` name or be serialized into browser state

## Verification

```bash
pnpm --dir apps/healthcare/referralink test
pnpm --dir apps/healthcare/referralink test:browser
pnpm --dir apps/healthcare/referralink lint
pnpm --dir apps/healthcare/referralink build
```

These commands are provider-independent. `test:browser` intercepts auth,
session, and diagnosis requests only inside Playwright and uses synthetic data.
Production email, Redis, model, and deployment acceptance require separately
provisioned infrastructure and must not use real patient data.
