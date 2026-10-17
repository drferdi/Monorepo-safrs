# MIRA inside Sentrapedia

Current runtime contract, 2026-10-10: MIRA is installed and launched as part of
Sentrapedia. The previous external-repository setup is superseded.

```mermaid
flowchart LR
  Install["npm ci"] --> Node["Node dependencies"]
  Install --> Python["Local Python environment"]
  Start["npm run dev / npm start"] --> Supervisor["System supervisor"]
  Supervisor --> Engine["Bundled MIRA engine"]
  Engine --> Ready["Profile and grounding health check"]
  Ready --> Web["Sentrapedia workspace"]
  Web --> Gateway["Server gateway + TheOracle evidence"]
  Gateway --> Engine
  Engine --> Provider["Gemini API (gemini-3.1-flash-lite)"]
```

Host prerequisites: Node24+, Python3.11+. Docker includes both. Install once with
`npm ci --workspaces=false`; set `GEMINI_API_KEY` in the environment or capsule
`.env.local`; run `npm run dev` (not `npx next dev`, which starts no engine). For an optimized local build use `npm run build`
then `npm start`. Default workspace: http://127.0.0.1:3101. `PORT` and
`SENTRAPEDIA_HOST` override the local web listener.

`mira/service` owns model calls, contract checks, privacy checks, budget/audit and
postchecks; `mira/common` owns provider/data policy and call guards.
`scripts/install-mira.mjs` owns the capsule-local environment and pinned package
installation. `scripts/run-system.mjs` owns startup, ephemeral loopback port,
per-run token, readiness and shutdown. Windows child guardians use Job Objects
and parent monitoring; POSIX cleanup handles INT/TERM/HUP process groups.
`scripts/build-system.mjs` stages engine, launcher, TheOracle index and model and static assets into the
standalone output. `src/lib/theoracle-grounding.ts` owns readonly TheOracle vector retrieval; the query is
embedded locally on CPU with the model recorded in `theoracle/index/manifest.json`.
`npm ci` also downloads that pinned model once (about 1.2 GB) into `theoracle/model/`.

The internal engine is a Python process managed by the application lifecycle.
No external `MiraRoot`, source checkout, shared service, manually supplied service
token, or another project's environment is used. Old `.env.local` service URL/token
values are overridden in memory. The provider is still an external model API.
Startup reads the model's metadata from the Gemini API with the key
(`preflightProvider` in `scripts/mira-runtime.mjs`): a rejected key or an unknown
model stops startup without a retry. The request carries no case data and sends no
completion, so install, startup and health checks cost nothing.

Source license and hashes are in `mira/LICENSE` and `mira/SOURCE.json`. The exact
routine prompt and planning schema snapshots avoid importing research FHIR/ML
dependencies; regression tests verify their original text hashes. Runtime engine,
prompts, privacy, postchecks and contracts retain approved source bytes. The
simulation runner is retained only as attributed text for policy regression tests,
not offered as a runtime feature.

Build output can run with `node scripts/run-system.mjs standalone` after installing
its Python lock using `node scripts/install-mira.mjs --production`. Docker performs
this installation and uses the same supervisor. Runtime secrets are injected at
launch, never built into the image. Preserve `.runtime/mira-deepseek/audit` when
moving an existing local installation so today's budget ledger is retained.

The application retains its existing synthetic-only development boundary. Local
packaging does not add production authentication or establish clinical accuracy.
Historical inference timings predate this packaging change. See the dated
verification report for fresh install/build/run evidence and remaining limits.
