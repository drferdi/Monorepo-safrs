# Architecture

UNICOM is a single Next.js App Router application. `src/app/page.tsx` renders the browser chat interface. `src/app/api/chat/route.ts` calls the local agent wrapper, and `src/app/api/webhooks/route.ts` provides the migrated webhook endpoint. `src/lib/chat.ts` owns in-memory state; `src/lib/agent.ts` adapts that state to the AI SDK.

All source, assets, dependency state, build configuration, and verification tooling reside inside this capsule. No lifecycle command may resolve parent paths or a root workspace package.
