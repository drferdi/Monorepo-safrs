# Oracle II grounding verification — 2026-10-10

Status: local implementation verified; no push, publication, deployment or paid inference.
Gaffer approved clinical-facing grounding and the local MIRA service scope, and separately
approved one isolated build/extraction after Jev returned stop_retry for the main-checkout build.
Claude owns the ongoing design work; existing UI changes were preserved.

## Observed gates

| Gate | Observed result |
| --- | --- |
| Main capsule `npm run typecheck` | PASS, exit 0 |
| Main capsule `npm run lint` | PASS, exit 0, zero errors/warnings |
| Main capsule targeted grounding/gateway/client/presentation/composer tests | 51 passed before the final curated-fact regression; new retrieval suite7 passed, exit 0 |
| Main capsule `npm test` and fresh JSON report | 179 passed before the final added fact regression, exit 0; includes 26 stale backup tests under `.runtime/advanced-before` |
| Main capsule `npm test -- --exclude .runtime/**` after the final fact regression | 154 current application tests passed, exit 0 |
| Isolated capsule `npm run typecheck`, `npm run lint`, `npm test` | PASS, exits 0; 154 current application tests, 12 files |
| Isolated capsule `npm run build` | PASS, exit 0, build `53NDRloPsbjPyFj3j5LW7` |
| Isolated capsule `npm run deploy:dry-run` | PASS, exit 0, six traces, zero external source dependencies |
| MIRA targeted `pytest assist/service/tests/test_step_api.py -q` | 50 passed, exit 0 |
| MIRA full `pytest assist/service/tests -q --disable-warnings` | 155 passed, 1 skipped, exit 0; 17 inherited deprecation warnings |
| Real forwarded Oracle bundle against MIRA request schema and full PII guard | PASS, exit 0 |
| Independent designated R2 review | Both P2 findings fixed and reviewed; no remaining actionable P1/P2 in scoped delta |

The skipped MIRA test requires `MED_ASSIST_CONTRACT_DIR`. Exact-copy comparison is intentionally
not asserted: the local service has documented optional `therapy` and `grounding` extensions.
No Python lint/typecheck tool was installed in the existing venv; schema checks and service tests ran.
No install was run, as requested: extraction used copied existing capsule dependencies.

## Extraction evidence

Extracted capsule: `C:/Users/drfer/AppData/Local/Temp/sentrapedia-oracle-proof-20261010-195126`.
It contains neither root dependencies/configuration nor `.env.local`, `.runtime` or main `.next`.
The 17 owned source/test/contract/config files compared byte-for-byte with the main capsule.
The first main-checkout build reported `UNKNOWN: unknown error, open ... next-env.d.ts` while
Next dev was running and generating that file. Its exit code was not retained. The isolated
build passed without changing the dev process; the original attempt is superseded by this proof.

The extracted standalone server returned HTTP 200 for `/` and a real static asset. Its real
`/api/mira` route queried the packaged read-only SQLite, negotiated the capability with a local
mock, forwarded the exact fictional case separately from six passages, and returned the same
bundle. A lexical no-match returned HTTP 422 with no second mocked inference request.
The actual forwarded envelope passed Python MIRA schema and privacy validation. No real model
provider was called. Temporary standalone/mock processes were stopped after the check.

Corpus SHA-256 before/after:
`4a28f3293ecff578f23c88a086bbbc27830d28f8f5d90951d8b9e4d9884da116`.

## Retrieval benchmark

Command: `npm run benchmark:oracle`. Node v24.21.0, 30 warm samples per complaint,
measured at 2026-10-10T12:52:31Z. The script compiles and runs the actual retriever,
including database opening, query, page integrity checks, privacy screening and bundle creation.

| Fictional query | References | Warm median ms | Warm p95 ms |
| --- | --- | --- | --- |
| malaria demam | 6 | 2.286 | 3.487 |
| batuk demam pneumonia | 6 | 2.631 | 3.786 |
| diabetes hiperglikemia | 6 | 1.880 | 2.519 |
| hipertensi tekanan darah tinggi | 6 | 2.999 | 3.663 |
| nyeri abdomen apendisitis | 6 | 2.672 | 3.460 |

The first retrieval, including database hashing, took 22.581 ms. These five results used
candidate passages; full-page fallback latency is not represented. These are retrieval
measurements, not end-to-end inference timing or evidence of diagnostic accuracy.

## Data flow

```mermaid
flowchart LR
    A[Composer / structured case] --> B[Local origin + fictional case validation]
    B --> C[Oracle II read-only retrieval]
    C --> D[Hashes + quote spans + source privacy filter]
    D --> E[At most 6 passages / 1600 chars each]
    E --> F[MIRA capability + strict envelope validation]
    F --> G[System grounding rules / all prompt branches]
    G --> H[Response contract + model and cost checks]
    H --> I[Draft + immutable source snapshot]
    I --> J[Oracle II citations / source links]
```

## Operational state and source conflicts

- The existing Sentrapedia launcher started the updated service on 8791 (parent PID 18464),
  with `oracle-grounding-v1`, Gemini 2.5 Flash and synthetic-only data policy. Startup used
  public model metadata preflight only, without inference. Existing shared 8787 remained untouched.
- The old 8787 process still serves its loaded legacy code without grounding capability and
  uses another model/data profile. Sentrapedia requires its dedicated 8791 profile.
- No live paid end-to-end latency test was run; historical sub-five-second figures predate grounding.
- Main preview was not listening at the last inspection while Claude was doing design work;
  this agent did not restart or take ownership of the design preview.
- The older HANDOFF `Open SAFRS gaps` claims about absent src/CONTEXT/project contract are
  superseded by the current files/path-move note. This is not a claim that every old governance gap is closed.
- HANDOFF/CONTEXT statements that MIRA never receives a database are superseded for the new 8791 process.
- Corpus review fields are preserved as-is. Session-level Gaffer/Kemenkes provenance does not
  overwrite individual record statuses or turn retrieved sources into claim-level citations.
- The original retrieval is lexical; it has no semantic reranker or clinical-performance evaluation.
- The form's old daily-budget text says USD1 while the existing launcher configures USD5;
  this inherited display/configuration mismatch remains outside this grounding delta.

Final documentation note: a scoped external `git diff --check` identified CRLF line endings
introduced by the documentation writer in service README/SOURCE. Their original LF format
was restored; raw diff size returned to17 added README lines and9 added/1 changed SOURCE lines.
Jev returned stop_retry for re-running that whitespace check, so no second whitespace-pass
claim is made. Runtime/source code, schema hashes and the observed test/build proof are unaffected.
