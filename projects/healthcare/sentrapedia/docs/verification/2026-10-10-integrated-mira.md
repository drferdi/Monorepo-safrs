# Integrated MIRA verification — 2026-10-10

Outcome: Sentrapedia owns and installs its MIRA engine, and one application command
manages engine + workspace startup/shutdown. Local Windows and extracted standalone
execution are verified. Gaffer explicitly requested this packaging change and
approved corrected verification after Jev stop_retry, without paid inference.

## Observed gates

| Gate | Result |
| --- | --- |
| Main capsule-local Python install / pip check | PASS, exit0 |
| Fresh extracted `npm ci --workspaces=false` | PASS, exit0; Node + Python installed |
| `npm run typecheck` | PASS, exit0 |
| `npm run lint` and explicit changed script/test lint | PASS, exit0 |
| Current application tests | 154 passed, exit0 |
| Managed runtime / price preflight / Windows descendant tests | 7 passed, exit0 |
| Bundled MIRA tests, mocked model clients | 157 passed, 1 skipped, 1 warning, exit0 |
| Extracted `npm run build` | PASS, exit0; `hFR4P0kvcVmMAlxlhcH_k` |
| `npm run deploy:dry-run` | PASS, exit0; 6 traces, zero external source dependencies |
| Standalone production Python install / pip check | PASS, exit0 |
| Dedicated SAFRS R2 package/lifecycle review | PASS; no remaining actionable P1/P2 |

Extraction root: `C:/Users/drfer/AppData/Local/Temp/sentrapedia-integrated-mira-1791640528616`.
62 owned runtime/package/test files match the main capsule byte-for-byte. This proof
uses a fresh Node/Python install, not the previous external MIRA virtual environment.
No secret file was copied into extraction; the smoke harness injects the provider
key through the process environment. No shared service is selected by the supervisor.

## Runtime evidence

Both extracted `start` and packaged `standalone` executions:

- Private bundled engine health: reachable/configured/modelReady/groundingReady true.
- Workspace page and a real static asset: HTTP200.
- Valid synthetic empty-case complaint without Oracle II match: HTTP422,
  `ORACLE_NO_MATCH`, before a model call.
- Forced termination of only the supervisor: both engine and web listeners close.

A separate occupied-port smoke forces Next startup to fail with EADDRINUSE.
Supervisor exits1, closes its engine, and preserves the unrelated port owner.
The Windows regression also launches a child and descendant server, kills their
guardian, and observes both listeners close. Child ownership is assigned while
suspended, before any instruction executes. POSIX INT/TERM/HUP group cleanup was
reviewed; POSIX execution was not available on this Windows host.

Startup also preserves the original public model-price and structured-output gate.
Two unauthenticated metadata GETs occur per startup, with no key/case/body, bounded
timeouts and no retry. No model completion or paid inference occurred in verification.
Fresh downstream diagnosis latency, account quota and clinical accuracy are not
established by packaging/health checks.

## Source preservation and corrections

`mira/SOURCE.json` records 42 attributed file hashes and exact planning-menu/routine
prompt text hashes. Engine, clinical prompts, privacy, postchecks and contracts remain
byte-identical with the approved local source. Only packaging adapters, import roots,
and source-dependent regression fixture paths were localized. The optional sibling
source-copy check remains skipped; no sibling is needed to install/build/test/run.
The single warning is inherited Pydantic deprecation behavior.

Oracle II corpus SHA256 remains
`4a28f3293ecff578f23c88a086bbbc27830d28f8f5d90951d8b9e4d9884da116`.

First localized suite: 3 missing synthetic fixture failures; fixture and exact
upstream CLI-policy regression adapter were added, then corrected suite passed after
Gaffer's override. Initial smoke contained an unsupported `findings` field and was
correctly rejected with400; the valid empty-case fixture now yields422. Reviewer P2s
for POSIX HUP cleanup and the Windows runnable-before-job race were fixed and closed.
The last three price preflight tests were observed RED before implementation and
GREEN afterward.

Dockerfile packages Node + Python + engine under the same supervisor. Docker daemon
was unavailable (`dockerDesktopLinuxEngine` pipe missing), so image build/run is not
claimed. Fresh extracted standalone execution is the empirical runtime proof.
No UI design changes, database rewrite, commit, push, deployment or publication.

See [machine evidence](2026-10-10-integrated-mira.json) and
[runtime contract](../mira-integration.md). Older README/architecture claims about
separate MIRA setup, Node22, manual tokens and USD1 daily budget are superseded.
