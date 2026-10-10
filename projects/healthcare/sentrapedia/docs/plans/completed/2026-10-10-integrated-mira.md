# Integrated MIRA installation

Gaffer requests MIRA to be installed as one system with Sentrapedia. This supersedes
the external local-service packaging of the approved Oracle II implementation.
Scope: R2 packaging/lifecycle; preserve the approved engine, clinical prompts,
contracts, privacy checks, model profile and Oracle II data. Claude owns UI design.

## Design

Localize the existing service and its minimal Python dependency closure in `mira/`.
Preserve the upstream MIT license and record source hashes. Snapshot the exact
planning tool schemas and routine prompt so startup does not import the research
FHIR/data/ML stack. Verify the snapshots against the installed original before use.
Do not port or rewrite the clinical engine.

`npm ci` installs Node dependencies and a capsule-owned Python virtual environment.
Node 24 and Python 3.11+ are host prerequisites; the Docker image includes both.
`npm run dev` / `npm start` launch the local engine, require its matching health
capability, then start Next.js. Both children share one managed lifecycle. The engine
listens only on loopback on a dynamically allocated port, with a generated token.
Only the server receives that token. The provider key stays in the environment or
capsule `.env.local`; no external MIRA root or manually started service is required.
Preserve the existing audit directory and USD5 daily budget continuity.

Build stages the engine into the standalone output; Docker installs the same pinned
Python dependencies and starts the same supervisor. Deployment remains a dry run.
No paid inference, publishing, clinical changes, or shared-service restart.

## Execution and verification

- [x] Bundle and hash service/common, schemas, prompt, data and regression tests.
- [x] Add pinned Python install, unified lifecycle and standalone staging.
- [x] Update package/lock, contract, Docker and operator documentation.
- [x] Verify snapshot parity and Python behavior with mocked providers.
- [x] Typecheck, changed-file lint, targeted tests, isolated build and dry run.
- [x] Extract capsule; run fresh install and integrated health/page smoke.
- [x] Verify shutdown and child-failure cleanup without disturbing existing ports.
- [x] Independent review; record evidence and capsule handoff.

Acceptance: extracted Sentrapedia installs and runs its engine without access to
`D:/DEV/gafferverse/mira-system` or the monorepo root. Health confirms the grounded
Gemini Flash profile. Missing key/runtime fails clearly; no silent UI-only startup.

Verification completed: 154 app + 7 managed runtime + 157 MIRA tests pass;
1 optional skip. Fresh extracted install/build/start/standalone/dry-run pass.
Dedicated R2 review PASS; 62 owned files match extraction. Docker daemon unavailable;
no image execution or paid inference claimed. See dated verification report.
