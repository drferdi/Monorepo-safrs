# Evidence cited from untracked folders

Tech-debt row 34. Handoff entries and one decision cite evidence in `verify-report/`, `.runtime/` or a session scratchpad, none of which git tracks. On 2026-10-19 this file records what that evidence showed, so the next maintainer can rely on it without the original machine. Since 2026-10-17 (`d56ddc0b`) the capsule `AGENTS.md` says new entries must cite tracked evidence.

Checked on Gaffer's machine on 2026-10-19 by reading the files; nothing was rerun and no model was called. Case texts are fictional. Ledger lines written before 2026-10-18 hold full request and response text, so only their metadata is summarised here.

## Model choice: Gemini 3.1 Flash-Lite (DECISIONS 2026-10-17)

`verify-report/full-check/2026-10-16/results/mira-live-3.json` to `-5.json`: the same fictional cough case through `npm run dev` on the OpenRouter route. The model per run comes from the decision text; the files hold no model id. The 2026-10-17 ledger confirms one reported pair of calls for each of the three models.

| Run | Model | `aadi_dx` + `aadi_tx` | Cost (USD) | Answer visible | Therapy (gate) |
|---|---|---|---|---|---|
| 3 | `google/gemini-2.5-flash` | 3,545 + 2,020 ms | 0.016927 | 18,241 ms (cold retrieval 12,052 ms) | ambroxol, paracetamol (verified) |
| 4 | `google/gemini-3.5-flash-lite` | 2,732 + 1,557 ms | 0.020232 | 8,525 ms | paracetamol, dextromethorphan (verified) |
| 5 | `google/gemini-3.1-flash-lite` | 2,727 + 1,797 ms | 0.013548 | 9,048 ms | ambroxol, paracetamol (verified) |

All three: HTTP 200, six sections in order, no unverified dose shown.

## Direct Gemini API route (HANDOFF archive, 2026-10-17)

Same case, `gemini-3.1-flash-lite` through Google's OpenAI-compatible endpoint. All PASS: HTTP 200, six sections in order, ambroxol and paracetamol verified (run 9: dengue A90, paracetamol verified), no unverified dose.

| Runs | What they showed | Answer visible | Cost per case (USD) |
|---|---|---|---|
| 6, 7, 8 | First direct-route runs; run 6 had cold retrieval (4,493 ms) | 10,050 / 4,436 / 4,451 ms | 0.0150 to 0.0154 |
| 9 | First case after a fresh `npm run dev` with warm-up: retrieval 172 ms | 4,436 ms | 0.014022 |
| 10, 11, 12 | After the copy-count change: two plus one calls per case, no `estimated-cancelled` call | 4,960 / 4,434 / 4,436 ms | 0.0050 to 0.0051 |

Ledger `.runtime/aadi-deepseek/audit/audit-2026-10-17.jsonl`: 30 records; served models `google/gemini-2.5-flash` (5 reported calls), `google/gemini-3.5-flash-lite` (3), `google/gemini-3.1-flash-lite` (3), `gemini-3.1-flash-lite` (36 estimated), plus 69 `estimated-cancelled` calls from extra fast copies; 0.1954 USD in total. `audit-2026-10-16.jsonl`: 4 records, 9 reported `google/gemini-2.5-flash` calls and 9 cancelled copies, 0.0372 USD.

## Full functional check, 2026-10-16 to 2026-10-17

`verify-report/full-check/2026-10-16/REPORT.md` (report only, HEAD `9b370a85`): the workspace works as a local clinical workspace. Static gates passed except one stale site test; workspace e2e 119 of 124 runs passed at three widths and two motion modes with no console error; two live AADI cases passed (runs 1 and 2: dengue with paracetamol, reflux with omeprazole and domperidone; 0.037 USD of a 0.10 budget); failure paths kept the input and never faked an answer; the public site had no broken link or overflow. No P0 or P1 finding. P2 findings: no backup import control, the cost row covered only the diagnosis stage, analysis latency 6.5 s warm and 10.1 s cold against a 5 s target. `77e83dd4` closed the first two; `fix-verify-2026-10-17.json` shows an invalid backup rejected with storage unchanged, a valid backup restored only after confirmation, the file input reachable by Tab with a visible ring, and 0 console errors at 390 and 1440 px. `logs/post-fix-npm-test.log` ends with 0 failures.

## Earlier `.runtime/` evidence

- `.runtime/gemini-live-diagnosis-check.json` (2026-10-09, OpenRouter): one synthetic case, HTTP 200, `google/gemini-2.5-flash` for both stages, 0.008432 USD, 9,059 ms wall time against a 5,000 ms target, likely J02.9 and J00, one request and no retry.
- `.runtime/dose-inventory/iso_gap_fill.json` and `ppk_doses_verified.json` are archived in `data/dose-inventory/` (tracked, with a README).
- `.runtime/audit/` (the 2026-10-11 evidence-gate replay harness) no longer exists. Its recorded result, 42 verified doses on both paths, survives only as text in the HANDOFF archive.

## Not reopenable

These were written to a session scratchpad and are gone; the handoff text is the only record.

- The 2026-10-18 principal-level audit; its findings became tech-debt rows and commits recorded in HANDOFF.
- The patch of the dropped stash@{0} (2026-10-12, "superseded").
- Older scratchpad material cited in the HANDOFF archive and DECISIONS: answer-reveal and text-reveal frames, the first hero film clip, the hero showcase and carousel WIP copies, the palette previews and the `globals.css` backup, the TheOracle ingest tool, a pre-rename diff and a direct benchmark script.
- `verify-report/design-audit/2026-10-16/` and `verify-report/design-fixes/` still exist locally but only hold screenshots and checks of superseded designs; they are not summarised here.
