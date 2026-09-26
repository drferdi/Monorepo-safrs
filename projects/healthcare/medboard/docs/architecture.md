# Architecture

The full architecture description is in [`../ARCHITECTURE.md`](../ARCHITECTURE.md) (stack,
layers, CDSS pipeline, and realtime channel). Related references:

- [`API.md`](./API.md) — route handlers under `src/app/api/`
- [`CLINICAL_LOGIC.md`](./CLINICAL_LOGIC.md) — CDSS, trajectory, and NEWS2 rules
  (`src/lib/cdss/**`, R3)
- [`AI_GOVERNANCE.md`](./AI_GOVERNANCE.md) — model providers and disclosure
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Railway deployment (`railway.toml`) and `server.ts`

The capsule runs as a Next.js app (`next start`) or through the custom `server.ts` with
Socket.IO. The local lifecycle (`start:local`) uses `next start` on 127.0.0.1:4344 and needs no
database.
