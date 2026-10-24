# Proposal: the rest of tech-debt row 40 (budget ledger, reservation, rejected key)

Status: done 2026-10-19. Gaffer chose (a) as proposed, B1 with `service/audit.py` made capsule-owned, and (c) as proposed with the message "Kunci API ditolak, periksa GEMINI_API_KEY." Commits `0d6081c8` (a), `92498fa8` (b), `d183f434` (c). The live call with a wrong key was not answered and not made, so the 400 case is unchecked.

Ownership (checked in `aadi/SOURCE.json` on 2026-10-19): `service/engine.py`, `service/app.py`, `service/settings.py` and `common/guard.py` are capsule-owned; `service/audit.py` (which holds `DailyBudget`) and `common/providers.py` are pinned. `providers.py` is not touched by any option below. No option adds a bare or broad `except`.

## (a) A crashed step is written to the ledger at 0 USD

Today: `run()` and `run_therapy()` charge `guard.cost_usd` to the in-memory budget in a `finally` (`48f0b069`), but the exception still reaches the existing `except Exception` in `app.py`, which has no guard and writes `costUsd: 0.0` and `calls: []`. `DailyBudget` seeds itself from today's ledger at startup, so after an engine restart the crashed step's spend is forgotten.

Proposal: `app.py` creates nothing new; the engine hands the step's `ApiGuard` to the caller as soon as it exists. `run()` and `run_therapy()` take an optional `on_guard` callback and call it right after building the guard. `handle()` keeps the guard it was given; its existing `INTERNAL_ERROR` branch then uses `step_engine.unavailable("INTERNAL_ERROR", name, guard)` and `guard.calls`, so the response and the ledger line carry the real cost and calls. No new `except`; the existing one in `app.py` (BLE001 allowed there by design) is the only catch.

Test first: a fake client that answers one paid call and then raises an unexpected error; expect a ledger line with that call's cost, and a fresh `DailyBudget` built from the same ledger to report it.

## (b) The daily budget is not reserved, so concurrent steps all pass

Today: `budget.exhausted()` is checked once at step start and the spend is added at the end. Ten parallel steps at 4.99 of 5 USD all start.

Option B1 (recommended): reserve the step's maximum (`max_usd_per_step`, 0.10 USD) at start and settle to the real cost at the end, inside `DailyBudget`: `try_reserve(amount) -> bool` refuses when spent plus open reservations plus `amount` exceeds the limit; `settle(amount, actual)` releases the reservation and adds the actual cost. Both under the existing lock, so it also holds across threads. Needs Gaffer's approval to edit pinned `service/audit.py`, either as a repin or by marking it `owner: capsule` like `app.py` (the 14-day retention already had to live in `app.py` because `audit.py` was pinned).

Option B2 (no repin): do the same in `engine.py` with the public `DailyBudget` API only: `add(max_usd)` at start, `add(actual - max_usd)` at the end. Works because nothing awaits between the check and the add, but it charges a negative amount, and a step that runs across UTC midnight subtracts its reservation from the new day (undercount of at most 0.10 USD once per day).

Behaviour change in both: a step is refused when fewer than 0.10 USD of today's budget is left unreserved, instead of when the budget is fully spent. Overshoot drops from "one step per concurrent request" to none.

Test first: two steps started together with 0.15 USD left; expect one `BUDGET_EXHAUSTED`.

## (c) A rejected API key counts as an outage and pauses the engine for 60 s

Today: `_call` sends every non-timeout exception through `self.breaker.failure()`; three in a row pause model calls for `api_error_cooldown_s` (60 s) with `API_ERRORS`, and the clinician sees "Penyedia analisis sedang mengalami gangguan".

Proposal: catch `openai.AuthenticationError` and `openai.PermissionDeniedError` (401 and 403; both exist in openai 1.44.1 in the venv) by name before the generic branch, raise `StepFailed("PROVIDER_AUTH", ...)`, and do not call `breaker.failure()`. Add `PROVIDER_AUTH` to the gateway's reasons in `src/lib/aadi/gateway.ts` (status 503, message along the lines of "Kunci API layanan analisis ditolak. Periksa GEMINI_API_KEY lalu mulai ulang Sentrapedia."). The response contract's `error.code` is a free string, so no schema change.

Not verified here: whether the Gemini OpenAI-compatible endpoint answers an invalid (not revoked) key with 400 instead of 401/403. A 400 would still count as an outage under this proposal. Checking it needs a live call with a bad key, which costs nothing but is a call to Google; it needs Gaffer's go.

Test first: a fake client raising `AuthenticationError` three times; expect `PROVIDER_AUTH` each time and no `API_ERRORS` pause.

## Questions for Gaffer

1. (a) as proposed?
2. (b): B1 (edit `audit.py`, repin or make it capsule-owned) or B2 (engine only)?
3. (c) as proposed, and may one live call with a deliberately wrong key check the 400 case?
