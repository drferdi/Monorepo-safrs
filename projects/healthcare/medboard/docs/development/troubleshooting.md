# Troubleshooting — MedBoard

Diagnostics, error resolutions, and operational runbook for common MedBoard issues.

---

## Development Server

### Port Occupied (e.g. Port 3000 in use)
The server automatically falls back to an available port (e.g. 3001). Check the startup log:
```
⚠ Port 3000 in use, trying 3001...
```
To set a specific port manually:
```bash
PORT=3002 pnpm run dev
```

### `.next/dev/lock` Lockfile Conflict
Stale lockfiles after abrupt shutdowns can prevent the development server from starting:
```bash
pnpm run dev:clean
# Automatically clears .next/dev/lock before launching server.ts
```

### Turbopack Compatibility
Turbopack is explicitly disabled (`turbopack: false` in `next.config.ts`) because MedBoard relies on custom Node.js and Socket.IO bindings in `server.ts`. Do not enable Turbopack with the custom server.

---

## Authentication & Sessions

### Expired or Invalid Crew Session
- Socket.IO connections are rejected if the session cookie is missing or invalid.
- Resolution: Clear the `puskesmas_crew_session` cookie in the browser and re-authenticate.
- Server log signature: `[Auth] Socket connection rejected — invalid or missing session cookie`.

### Login Failed ("Invalid credentials")
Credential lookup precedence:
1. Environment variables `CREW_ACCESS_SECRET` / database `User` table
2. Runtime fallback `runtime/crew-access-users.json`
3. Seeded administrative accounts

Verify that the user account exists in the active database or runtime json.

---

## CDSS / Iskandar Diagnosis Engine V2

### Empty Suggestions Returned
Possible causes:
- `DEEPSEEK_API_KEY` is unset → engine gracefully invokes the deterministic local safety fallback.
- Knowledge base failed to load → ensure `penyakit.json` exists in `src/lib/cdss/`.
- Response inspection: `source: "error"`, `model_version: "IDE-V2-FALLBACK"`.

### DeepSeek Request Timeout (30 seconds)
The engine automatically shifts to the local deterministic fallback without crashing the clinical UI:
```
[IDE-V2] DeepSeek timeout/failed, fallback to local safety path: ...
```

### LLM Service Outage
Verify `DEEPSEEK_API_KEY` validity and outbound network connectivity. The engine delivers a fallback payload with a user-facing banner: `"AI Engine Unavailable"`.

### Low Confidence Score (< 0.3)
When clinical inputs are sparse, a `low_confidence` alert triggers. Provide richer clinical context:
- Input complete vital signs (systolic blood pressure, heart rate, SpO2).
- Include additional symptoms or anamnesis details.
- Provide doctor's preliminary notes (`assessment_conclusion`).

---

## Audrey Voice Assistant

### Voice Endpoints Return 503
Expected behavior. Real-time voice processing and audio streaming endpoints are temporarily disabled during architecture transition and return `503 Service Unavailable`.

---

## EMR Auto-Fill Automation (Playwright)

### Authentication Failure ("ePuskesmas login failed")
- Verify `EMR_USERNAME` and `EMR_PASSWORD` in `.env.local` / `/etc/medboard/medboard.env`.
- Check if session cache files under `runtime/` or `storage/` have expired; purge stale session files if necessary.

### Playwright Selector Not Found
If the external ePuskesmas UI changes layout or input attributes, update the DOM selectors located in `src/lib/emr/field-selectors.ts`.

### Progress Updates Missing in UI
Ensure Socket.IO event `emr:progress` is actively listened to, and verify `setSocketIO(io)` is invoked before `server.ts` starts listening.

---

## Intelligence Dashboard

### Socket Cannot Connect to `/intelligence`
- Ensure the user's crew session cookie is valid.
- Log signature: `[Intelligence] Socket rejected — invalid session`.
- Resolution: Re-authenticate to refresh session tokens.

### Realtime Events Not Emitted
Verify that `setIntelligenceNamespace(intelligenceNS)` has been registered in `server.ts` prior to `httpServer.listen()`.

---

## Database & Prisma

### Migration Schema Conflicts
```bash
pnpm run db:migrate
# In isolated development environments, to reset local state:
npx prisma migrate reset
```

### Prisma Studio Launch
```bash
pnpm run db:studio
# Opens Prisma Studio at http://localhost:5555
```

---

## Build & Type Checking

### TypeScript Compilation Errors
```bash
pnpm run lint
# Runs: tsc --noEmit --incremental false
```
All errors must be resolved prior to release. Strict TypeScript checks are enforced.

---

<sub>Architected and built by Drferdi — 2026 · Sentra Healthcare Artificial Intelligence</sub>
