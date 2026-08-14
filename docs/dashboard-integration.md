# Control Center — what can be visualised, in what order, and how it wires

> The test this document applies to every candidate:
> **how much real work can dr. Ferdi finish here without opening a terminal?**
>
> A screen that only reports state scores zero. A screen that completes a job scores.
> Status is context around work, never the product.

## 0. The engines that already exist

Nothing below invents capability. Each surface drives machinery that is already written:

| Engine | Location | State |
| --- | --- | --- |
| Corpus pipeline | `projects/corpus-engine/src/corpus_engine/{parse,quality,blocks,chunker,flow}.py` | complete, branch `feat/corpus-engine-poc` |
| Corpus query | `.../query.py` | complete, same branch |
| Corpus contents | `database/canonical/manifest.jsonl` (93 documents) | on disk now |
| Environment doctor | `tools/doctor/src/cli.mjs` | complete, text output only |
| Governance | `scripts/safrs-verify.mjs` + `tools/safrs/*.py` | complete |
| Control plane | `tools/automation/src/{gates,leases,evidence,approvals}.mjs` | complete |
| Task registry | `tools/task/src/cli.mjs` | complete, `list --json` |
| Status report | `tools/status/src/cli.mjs` | complete, `--json` |
| Golden Path app | `projects/golden-path/apps/web` | complete |
| Capability packs | `tools/capabilities/manifests/*.json` (6) | complete |
| Codegen | `tools/codegen/src/cli.mjs` | complete |
| Dependency graph | `tools/deps-graph/src/cli.mjs` | complete |
| Design tokens | `packages/token` + `scripts/check-tokens.mjs` | complete |
| Wiki | `sentrawiki/` (46 pages) | complete |

## 1. The shared foundation (prerequisite for everything)

Two pieces every surface below depends on. Build once.

### F1 — Command executor

**Logic.** The browser sends only a command *id*. The server looks it up in a fixed allowlist
(`lib/exec/commands.ts`), where each entry is an executable plus a fixed argument array — never a
string, never a shell, never user input on a command line. Unknown id → refused. Mutating commands
require an exact confirmation phrase. R3 is absent from the table by construction, so production
cannot be reached even by a malicious request.

**Wiring.** `execFile` with `cwd = repoRoot`, hard timeout, captured stdout/stderr, exit code, and
an append-only audit line per run (who, what, when, result).

**Gives.** Every button on every screen below.

### F2 — Structured output from the tools

**Logic.** A screen cannot parse human prose reliably; text parsing breaks silently. Each tool the
dashboard drives needs a machine-readable mode.

**Wiring.** `pnpm doctor --json` must be added (`tools/doctor/src/cli.mjs` prints Indonesian text
only). `status --json` and `task list --json` already exist. `saf gate` needs verifying.

**Gives.** Health, Activity, Governance, Tasks — all of them.

---

## 2. Ranked surfaces

Ranking = work unlocked ÷ effort, with end-to-end completeness preferred over partial coverage.
A surface is only "done" when a job can be finished on it start to finish.

### Wave 1 — the corpus becomes usable

The largest dormant asset. 93 parsed medical documents nobody can reach without Python.

**S1. Corpus contents**
- *Job:* see what the knowledge base actually holds, and what is broken in it.
- *Does:* browse 93 documents by specialty, year, page count, parse-quality score; sort worst
  first; open one document's page-level quality.
- *Wiring:* read `database/canonical/manifest.jsonl` directly. No Python, no database, no branch
  merge needed — the file is on disk today.
- *Prerequisite:* none. **Cheapest real surface in this document.**

**S2. Ask the corpus**
- *Job:* ask a clinical question in plain language, get an answer with page-level citations.
- *Does:* question box → results with source document, page, and quoted passage.
- *Wiring:* F1 runs `corpus_engine/query.py` with the question passed as a *single argv element*
  (never interpolated); parse structured results; render citations as links into the source PDF.
- *Prerequisite:* corpus-engine merged to `main` (R2, your decision), Python environment via `uv`,
  PostgreSQL with pgvector on `:54329`, GPU for embeddings.
- *Note:* this is the reason the corpus exists. It is ranked after S1 only because S1 has no
  prerequisites at all.

**S3. Add a PDF to the corpus**
- *Job:* put a new guideline into the knowledge base, end to end.
- *Does:* upload/point at a PDF → parse runs → per-page quality shown → accept or reject → document
  enters the corpus and appears in S1.
- *Wiring:* F1 drives `parse.py` → `quality.py` → `flow.py`. Must respect `database/corpus.lock`
  (single writer — two sessions raced on 2026-08-12 and corrupted `manifest.jsonl`). Long-running,
  so this needs progress reporting, not a request/response call.
- *Prerequisite:* S2's prerequisites, plus the lock and progress design.

### Wave 2 — the product runs from a button

**S4. Machine readiness**
- *Job:* find out why nothing works, and fix it.
- *Does:* nine readiness checks with Indonesian recovery text already written in
  `tools/doctor`; each failing check offers the button that repairs it.
- *Wiring:* F1 + F2 (`doctor --json`).

**S5. Run the product**
- *Job:* start the local database and Golden Path, then open it.
- *Does:* Start database → apply schema → seed sample data → start app → link to it. A guided
  sequence, each step showing its effect before it runs.
- *Wiring:* F1 for `db:start`, `db:migrate`, `db:seed`. `pnpm dev` is long-running and must be
  managed as a supervised process, not a request — same problem as S3.
- *Prerequisite:* Docker Desktop running.

**S6. Quality gate**
- *Job:* find out whether a change is safe, before asking anyone.
- *Does:* run governance, tests, token check, supply-chain check; show which gate failed and what
  it means in plain language.
- *Wiring:* F1 for four commands; failures mapped from checker output to human explanation.

### Wave 3 — you govern the agents

**S7. What the agents are doing**
- *Job:* see current work and who owns which scope.
- *Wiring:* F2 (`status --json`, `task list --json`).

**S8. Decisions waiting for you**
- *Job:* clear the R2/R3 queue that is blocking everything.
- *Does:* list every pending decision with what changes, why it is R2, what happens if approved,
  and what happens if not. Today four are open: corpus-engine merge, the three other unmerged
  branches, branch protection on `main`, and the four Phase 6 activation decisions.
- *Wiring:* registry (unmerged branches) + `saf gate --all` + `.safrs/reviews/`. Approval itself
  stays a human act recorded through the control plane — the board prepares it, never performs it.

**S9. Change review in human language**
- *Job:* understand a diff without reading code.
- *Does:* per branch — which files, which risk tier, which sensitive paths touched, which gates
  pass, plain-language summary of effect.
- *Wiring:* `git diff --stat`, `.safrs/sensitive-paths.json` classification, `saf gate`.

### Wave 4 — the rest of the repository

**S10. Projects and packages** — real workspace read (`pnpm-workspace.yaml` + every
`package.json`), dependency graph rendered from `deps-graph`.

**S11. Capability packs** — the six manifests, with preview-then-enable (`capability:add --preview`
is read-only and safe; apply is R2 and needs the exact phrase).

**S12. Knowledge search** — search across `sentrawiki/` 46 pages and `docs/`, answering "what is
this and where is it explained".

**S13. Observability** — Jaeger traces, once `compose.telemetry.yaml` is up.

**S14. Design system** — token contrast results from `check-tokens.mjs`, and the reference screens.

---

## 3. Build order

| Step | Build | Why here |
| --- | --- | --- |
| 1 | F1 executor | nothing is clickable without it |
| 2 | S1 corpus contents | real work, zero prerequisites, proves the pattern |
| 3 | F2 `doctor --json` | one small tool change unlocks S4 |
| 4 | S4 readiness | fixes the "why doesn't anything run" problem permanently |
| 5 | S6 quality gate | read-only, high value, no new infrastructure |
| 6 | S5 run the product | needs the supervised-process design |
| 7 | S2 ask the corpus | needs the corpus-engine merge decision first |
| 8 | S7 + S8 agent control | needs F2 across the control plane |
| 9 | S3 add a PDF | hardest: long-running, lock-aware, progress-reporting |
| 10 | S9–S14 | breadth once the core is genuinely usable |

## 4. Two problems to solve before Wave 2 finishes

1. **Long-running processes.** `pnpm dev` and the corpus pipeline outlive a page request. A
   dashboard request must not own them. Needs a small supervisor with start/stop/status and a log
   tail — designed once, used by S3 and S5.
2. **The corpus single-writer lock.** `database/corpus.lock` exists because a race already
   corrupted `manifest.jsonl`. Any pipeline surface must take the lock and refuse to start when it
   is held, showing who holds it.

## 5. What this document is not

It is not a promise that all fourteen surfaces will be built. It is the ordered list, with the
logic and the wiring worked out, so each one can be started knowing what it depends on and what it
actually delivers.
