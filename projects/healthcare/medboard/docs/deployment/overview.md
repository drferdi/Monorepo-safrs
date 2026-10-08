# Deployment Overview — MedBoard

Production architecture, build pipelines, configuration parameters, and health checks for MedBoard deployments.

---

## Deployment Environments

| Environment | Host / Provider | URL | Execution Mode |
|---|---|---|---|
| Local | Local Machine | `http://localhost:3000` | `pnpm run dev` (Node server with Socket.IO) |
| Production | Biznet Gio VPS (Ubuntu 24.04) | `https://medboard.sentrahai.com` | Systemd service behind Caddy reverse proxy |

### Production Request Pipeline
`Public Traffic` → **Caddy Reverse Proxy** (Automatic HTTPS / Let's Encrypt, WebSocket proxy on port 443) → **Custom Server** (`127.0.0.1:3000`, `server.ts` running Next.js + Socket.IO managed by systemd `medboard.service`) → **Local PostgreSQL Instance**.

For end-to-end server provisioning, automated deployment scripts, rollbacks, and backup routines, refer to the [VPS Deployment Runbook](vps.md).

---

## Build & Launch Commands

```bash
# Compile bundle and generate Prisma client
pnpm run build

# Start production server
pnpm run start

# Pre-release verification (validates environment keys and runtime readiness)
pnpm run deploy:dry-run
```

> [!IMPORTANT]
> The build must be executed with production environment variables present because `NEXT_PUBLIC_*` values are baked into client bundles during compilation.

---

## Production Environment Variables

On the host machine, secrets and runtime values reside in `/etc/medboard/medboard.env` (accessible only to root and the `medboard` system group).

### Mandatory Boot Variables

```env
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
DATABASE_URL=                        # PostgreSQL connection string
CREW_ACCESS_SECRET=                  # HMAC signing key for session cookies
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=  # Stable encryption key across deployments
TRUST_PROXY_HEADERS=true             # Required when reverse-proxied by Caddy
NEXT_PUBLIC_BASE_URL=https://medboard.sentrahai.com
```

*Crew accounts are stored in the database (`User` table). `CREW_ACCESS_AUTOMATION_TOKEN` must be populated if the browser extension communicates with the internal API bridge.*

### Optional Integration Variables (Degrades Gracefully)

```env
DEEPSEEK_API_KEY=                    # CDSS Iskandar Engine V2 reasoning
LIVEKIT_URL=                         # MedLink telemedicine signaling server
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
RESEND_API_KEY=                      # Transactional email service
EMAIL_FROM=
SENTRY_DSN=                          # Application error tracking
PLAYWRIGHT_BROWSERS_PATH=            # Headless Chromium for PDF and EMR automation
```

### Advanced Observability & Integrations

```env
SENTRY_AUTH_TOKEN=                   # Source maps upload
SENTRY_ORG=
SENTRY_PROJECT=
LANGFUSE_PUBLIC_KEY=                 # LLM telemetry and observability
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=
EMR_BASE_URL=                        # Target ePuskesmas system
EMR_USERNAME=
EMR_PASSWORD=
WHATSAPP_CLOUD_API_URL=
WHATSAPP_CLOUD_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
GROQ_API_KEY=                        # Audrey speech-to-text transcription
PERPLEXITY_API_KEY=
```

---

## Pre-Release Checklist

1. `DATABASE_URL` is accessible and migrations are fully applied (`npx prisma migrate deploy`).
2. `CREW_ACCESS_SECRET` and `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` are configured and persistent across deployments.
3. `TRUST_PROXY_HEADERS=true` is enabled behind Caddy.
4. `NEXT_PUBLIC_BASE_URL` matches the production domain.
5. `pnpm run deploy:dry-run` completes with exit code 0.
6. Verify service health post-launch via `GET /api/health`.

---

## Rapid Rollback Procedure

```bash
cd /opt/medboard && mv app app.bad && mv app.old app && systemctl restart medboard
```
*Rolling back application code does not revert database schema migrations. Detailed recovery strategies are documented in [VPS Runbook](vps.md).*

---

## Health Check Endpoint

```http
GET /api/health
```

- `status: "ok"` — System is healthy, all required subsystems are functional.
- `status: "degraded"` — System is online, but non-critical optional integrations are unconfigured.
- `status: "error"` — Critical configuration or database connectivity issue detected.
