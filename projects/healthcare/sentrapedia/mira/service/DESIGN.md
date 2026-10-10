# MIRA reasoning service — design (Step 0)

Private notes, gitignored (`assist/.gitignore`). Date: 2026-09-27. Upstream commit `73666b1`.
Labels: **[V]** verified by reading code or running it here · **[I]** inferred · **[A]** assumption.

## 0. Repository state

- `D:\DEV\gafferverse\mira-system` is on `main`, in sync with `origin/main` (Dyke-F/MIRA). The whole
  `assist/` folder is **untracked**: nothing of ours has ever been committed [V].
- `src/.venv` and `src/.env` do not exist on D: yet; both are gitignored by upstream
  `.gitignore:151,153` [V].
- `python` on Windows is 3.12.14, but the `py` launcher used by `assist/setup_windows.ps1` is not
  installed [V]. The venv will be created with `python -m venv src\.venv`, which is the same thing.
- Docker Desktop is not running right now (`dockerDesktopLinuxEngine` pipe missing) [V]. Needed
  only for S8 and for the `--dry-run` check (FHIR).

## 1. Module layout (`assist/`)

```
assist/
  common/guard.py            ApiGuard + RunAborted, moved from run_one_case.py (S6)
  run_one_case.py            imports common.guard; behaviour unchanged
  service/
    app.py                   FastAPI: POST /v1/diagnosis/step, GET /healthz, body-size limit
    settings.py              env settings; production start refuses without verifier + API key
    auth.py                  TokenVerifier protocol, DevTokenVerifier, production verifier (§5.1)
    privacy.py               server-side PII re-check (patterns mirrored from med-assist)
    rate_limit.py            in-memory per-token limit (single process)
    menu.py                  orderable-item menu from src/tools.py (no tool_execs, no runs.run)
    prompts.py               assessment instructions (ours); planning prompt = routines.ROUTINE_PROMPT
    engine.py                one step: plan call -> assessment call -> post-checks
    postchecks.py            ICD validation, sex/age table, facility capabilities (deterministic)
    rules/sex_icd_ranges.json  one table, with its source noted
    data/icd10.json + data/SOURCE.md   vendored ICD-10 list (§5.2)
    contract/*.schema.json + SOURCE.md  vendored from med-assist (path, commit, SHA-256)
    contract.py              request/response validation (jsonschema)
    audit.py                 JSONL per traceId under service/audit/ (gitignored)
    sim_benchmark.py         S7, CLI only
    Dockerfile, requirements.txt, .env.example, README.md
    tests/
```

## 2. One step (live mode)

1. Auth (verifier) → body-size limit → rate limit → request schema validation (invalid → HTTP 400).
2. PII re-check on the serialized `case` → `unavailable` + `PII_DETECTED`, nothing sent, body not
   logged.
3. Daily budget check → `unavailable` + `BUDGET_EXHAUSTED`.
4. Build `patient_info` text from `CaseState` (English labels; the physician's Indonesian text is
   passed as written).
5. **Call 1, plan.** Same composition as `tool_execs.generate_routine` (`tool_execs.py:742-779`):
   `ROUTINE_PROMPT` + "Available Tools and options:" + menu + "The patient information so far:" +
   `patient_info`; model `REASONING_MODEL` (default `o1`). Output: free text.
6. **Call 2, assessment.** Model `MEDICAL_ASSISTANT_MODEL` (default `gpt-4o`, temperature 0.05),
   `response_format` = strict JSON schema derived from the response contract, input = case text +
   plan text. Our own instructions (prompts.py): WHO ICD-10 codes only, evidence must quote case
   facts, next actions only from the plan, leave a field empty and list it in `unfilled` when the
   case does not support it.
7. Post-checks (§4), then `meta`, then response validation against the vendored contract (a failure
   → `unavailable` + `CONTRACT_MISMATCH`), audit, return.

Both calls use `AsyncOpenAI` with `max_retries=0` and a per-call timeout equal to the remaining
step deadline. A model not equal to MIRA's default is written into `meta.version`
(`mira-service/<ver>+plan=<model>+assess=<model>+contract=1`), so it shows as a new experimental
condition.

**Menu.** `runs/run.py:70-83` defines the tool list, but importing `runs.run` pulls in
`tool_execs` → `transformers` (`tool_execs.py:24`) [V]. `menu.py` therefore repeats the same list of
tool classes from `src/tools.py` (without `ProcedureSearch`, as in `run_one_case.py`), and a test
parses `runs/run.py` with `ast` (no import) to check that the names match.

## 3. How each response field is filled

| Field | Source | Left empty and listed in `unfilled` when |
| --- | --- | --- |
| `differential.likely/alternatives/cannotMiss` | call 2 | every code fails §4, or the model declares it cannot rank |
| `score` | never filled | model-stated probabilities are not calibrated; the tier is enough |
| `evidence` | call 2; only case facts | the model finds no supporting or opposing fact |
| `missingInformation` | call 2, from the plan's "missing or unclear data" | nothing is missing |
| `nextBestActions` | call 2, mapped from the plan to `question`/`exam`/`test` | the plan gives no action |
| `disposition` | call 2 (`treat`/`refer` + urgency) | the model cannot decide → `null` |
| `meta` | service | never empty |

The contract has no field to mark a test as unavailable. A test missing from
`facilityCapabilities` therefore stays in the list, and its `reason` gets the suffix "Not available
here; consider referral." [I, needs Chief's OK or a contract change owned by med-assist].

## 4. Deterministic post-checks

- **ICD validation**: exact match against the vendored list after uppercasing. An ICD-10-CM style
  code (e.g. `K35.80`) whose first four characters exist is shortened to the WHO code and noted in
  `unfilled.reason`; anything else is removed and listed.
- **Sex/pregnancy**: `N70–N77` female only, `N40–N51` male only, `O00–O99` pregnancy only, applied
  only when `sex`/`pregnant` is known; a removed item is listed in `unfilled`. The task names no
  age rules; none will be invented.
- The med-assist I1 rule does **not exist yet**: `symptom-matcher.ts` accepts `jenisKelamin` but
  never uses it (one reference, the type field), and `penyakit.json` has no sex field [V]. The JSON
  table written here should become the single source that I1 later copies.

## 5. Answers to the three questions

### 5.1 Auth: how the crew portal issues sign-in tokens

- The crew portal is `medboard` (IntelligenceBoard) in the Monorepo [V]. It is a third repository,
  not one of the two named in the task.
- Login (`medboard/src/app/api/auth/login/route.ts`) sets the cookie `puskesmas_crew_session`:
  base64url JSON payload (`username, displayName, email, institution, profession, role,
  issuedAt, expiresAt`) + HMAC-SHA256 signature with `CREW_ACCESS_SECRET`; TTL 12 h; `httpOnly`;
  `sameSite=none` in production (`crew-access-auth.ts:171-189, 265-314, 378-384`,
  `crew-access.ts:122-123`) [V].
- The extension never holds that token: it stores the placeholder `accessToken: 'cookie-session'`
  (`med-assist/lib/api/auth-client.ts` cookie-session branch), and its own comment says the cookie
  is not forwarded cross-origin from the extension. The default is "Mode Lokal" with no server at
  all [V].
- **So there is no per-user credential the extension could send today** [I]. Verifying the
  cookie directly would mean sharing `CREW_ACCESS_SECRET` with this service, which would let the
  service mint crew sessions. Not recommended.
- **Recommended**: medboard adds a short-lived (e.g. 10 min) service token for audience
  `mira-service`, signed with a separate secret, returned in the login response body. It uses the
  same format as the crew session, so this service verifies it with Python's `hmac` (no new
  dependency). This needs changes in medboard and med-assist (both out of scope here). Until then:
  development verifier only, and the service refuses to start in production.

### 5.2 ICD-10 list

- ASSIST's only ICD source is `public/data/penyakit.json`, loaded by `lib/rag/icd10-loader.ts:35`:
  159 entries, 130 unique codes, **no K35–K37** [V]. Too small: validating against it would delete
  exactly the diagnoses MIRA should add (appendicitis K35.8).
- `medboard/database/icd10.json` (same file in `public/data/`): 18,543 codes, 2,051 three-character
  categories, tagged `ICD10_2010` (WHO ICD-10 2010, the version Indonesia uses), includes K35.2,
  K35.3, K35.8 and N70 [V]. Recommended source, vendored with `SOURCE.md` (path, commit `fbe291bf`,
  SHA-256). Licence and provenance of that file are not documented [A].

### 5.3 Import weight

- `src/tools.py` imports: pandas, `fhir.resources`, pydantic, termcolor, and via `_import_local_module`
  `code_maps` (data only), `codes.medication_codes` (pandas, requests, tenacity, tqdm, dotenv,
  `backend.log` → `config` → `paths`, `dataset.data` → pandas, tqdm, `paths`) and `MimicEnums`
  (enum only) [V]. No `torch`, no `transformers`, no `qdrant_client`, no import after line 32 [V].
- `tool_execs.py` imports `transformers.AutoModel`, `qdrant_client`, `IPython` (`tool_execs.py:19-24`),
  and `runs/run.py` imports `tool_execs` [V]. Neither is imported by the service.
- Import-time side effects of that chain: `load_dotenv()` and path constants only; no file writes
  and no network [V by reading]. Runtime confirmation (`sys.modules` has no `torch` after
  `import tools`) will be a test in S9.
- Slim image needs: openai 1.44.1 (for `pydantic_function_tool`, matching upstream's pin), fastapi,
  uvicorn, pandas, fhir.resources 7.1.0, pydantic, termcolor, requests, tenacity, tqdm,
  python-dotenv, jsonschema [I].

## 6. Timeouts and the biggest risk

- The client gives up at 15 s (`mira-engine.ts`), the step deadline defaults to 12 s [V: client].
- Call 1 sends about 33,700 characters of menu to `o1` (measured in the assessment) [V], and `o1`
  returns hidden reasoning before its answer. It is **likely to take longer than 12 s on its own**
  [I, not measured]. If so, live steps return `unavailable` + `TIMEOUT` most of the time.
- Gate 1 is not affected: the benchmark calls the service directly and can set a longer deadline.
- The smoke test (S9) measures the real latency. Options if it is too slow: raise the client
  timeout once med-assist's shadow call is non-blocking (plan step I3), drop call 1 (a different
  engine), or use a faster planning model (a new experimental condition).

## 7. Other design points

- `ApiGuard.install()` patches `Completions.create` for the whole process. That is fine for one
  CLI run, but wrong for a server handling several requests. `common/guard.py` keeps `install()`
  for `run_one_case.py` and adds a per-request `StepBudget` (call count, US$, deadline) used
  explicitly by the engine. Prices stay the table in `run_one_case.py`; an unknown model is charged
  at the `o1` price.
- "Never logs the raw request" is read as: stdout/stderr and exceptions never contain the body. The
  audit JSONL keeps the request only after it passed the PII re-check [A].
- PII patterns (as built): NIK, BPJS, phones and email copied from
  `med-assist/lib/iskandar-diagnosis-engine/anonymizer.ts:31-60`; titled names with the title
  case-insensitive and the name capitalised (incl. Sdr). Not copied: the RM-number pattern (with
  the `i` flag it matches the word "normal", so the committed contract example was blocked) and the
  address patterns (not in the task's list). The same false positives exist in med-assist's
  client guard [V with Node]; flagged as a separate med-assist task.
- First commit on `feat/reasoning-service` would also add the earlier untracked `assist/` files
  (README, adapter, runner, setup script, synthetic case), since the runner will import
  `common/guard.py` [A: Chief to confirm].
