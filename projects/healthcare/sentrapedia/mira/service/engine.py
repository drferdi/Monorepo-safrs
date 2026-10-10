"""One reasoning step: MIRA's planning routine, then a structured assessment, then post-checks.

At most two model calls per step, a step deadline, a per-step cost cap (ApiGuard), a daily
budget, and a pause after repeated API errors. Every failure becomes a contract-valid
`unavailable` response; the case text never appears in errors or logs.
"""

from __future__ import annotations

import asyncio
import json
import time
from dataclasses import replace

from common.guard import ApiGuard, RunAborted
from common.providers import is_policy_failure, openrouter_extra_body
from config import MEDICAL_ASSISTANT_MODEL, REASONING_MODEL
from openai import APITimeoutError

from . import SERVICE_VERSION, postchecks
from .audit import DailyBudget
from .contract import CONTRACT_VERSION, RESPONSE, errors, unavailable_response
from .menu import planning_menu_text
from .prompts import (
    ASSESSMENT_RESPONSE_FORMAT,
    DIAGNOSIS_RESPONSE_FORMAT,
    THERAPY_RESPONSE_FORMAT,
    WORKUP_RESPONSE_FORMAT,
    assessment_messages,
    fast_assessment_messages,
    planning_messages,
)
from .settings import Settings

MAX_CALLS_PER_STEP = 2
# fast assessment: each of its two parts is sent this many times and the first answer wins
FAST_COPIES = 3
# how long the other copies may still beat a valid but unaccepted one
FALLBACK_GRACE_S = 1.0


def _complete_therapy(content: dict) -> bool:
    therapy = content.get("therapy") or {}
    return all(therapy.get(key) for key in ("regimen", "interactions", "contraindications"))


class StepFailed(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class ApiErrorBreaker:
    """After N consecutive API errors (across requests), pause model calls for a cool-down."""

    def __init__(self, max_consecutive: int, cooldown_s: float, clock=time.monotonic):
        self.max_consecutive = max_consecutive
        self.cooldown_s = cooldown_s
        self._clock = clock
        self._errors = 0
        self._open_until = 0.0

    def is_open(self) -> bool:
        return self._clock() < self._open_until

    def success(self) -> None:
        self._errors = 0

    def failure(self) -> None:
        self._errors += 1
        if self._errors >= self.max_consecutive:
            self._open_until = self._clock() + self.cooldown_s
            self._errors = 0


class StepEngine:
    def __init__(self, settings: Settings, client, budget: DailyBudget, breaker: ApiErrorBreaker):
        self.settings = settings
        self.client = client
        self.budget = budget
        self.breaker = breaker

    @property
    def version(self) -> str:
        s = self.settings
        version = (
            f"mira-service/{SERVICE_VERSION}+contract={CONTRACT_VERSION}+provider={s.llm_provider}"
            f"+data={s.data_policy}+plan={s.plan_model}+assess={s.assess_model}"
        )
        default = ("openai", REASONING_MODEL, MEDICAL_ASSISTANT_MODEL)
        if (s.llm_provider, s.plan_model, s.assess_model) != default:
            # Another model, or the same model through another provider, is a new experimental condition.
            version += "+experimental"
        if s.provisional_differential:
            version += "+ddx=provisional"
        if s.fast_assessment:
            version += "+assessment=fast"
        if s.fast_therapy:
            version += "+therapy=fast"
        return version

    @property
    def model(self) -> str:
        return f"{self.settings.plan_model}+{self.settings.assess_model}"

    def with_plan_model(self, plan_model: str) -> StepEngine:
        """The same engine (client, daily budget, error pause) planning with another allowed model."""
        return StepEngine(replace(self.settings, plan_model=plan_model), self.client, self.budget, self.breaker)

    def unavailable(self, code: str, message: str, guard: ApiGuard | None = None) -> dict:
        cost = round(guard.cost_usd, 6) if guard else 0.0
        return unavailable_response(code, message, self.version, self.model, cost)

    async def _call(self, guard: ApiGuard, role: str, model: str, deadline: float, **kwargs) -> str:
        guard.before_call()
        if self.settings.llm_provider == "openrouter":
            kwargs["extra_body"] = openrouter_extra_body(
                kwargs.get("extra_body"), provider_sort=self.settings.openrouter_provider_sort,
                enforce_zdr=self.settings.openrouter_zdr,
            )
        remaining = max(deadline - time.monotonic(), 0.001)
        started = time.time()
        try:
            response = await self.client.chat.completions.create(model=model, timeout=remaining, **kwargs)
        except APITimeoutError:
            # A slow call is the step deadline, not an API failure: it must not pause the service.
            raise StepFailed("TIMEOUT", f"{role} call exceeded the step deadline") from None
        except Exception as exc:
            if is_policy_failure(exc):
                # No provider meets the privacy policy. Not an outage: no pause, no retry without it.
                raise StepFailed("PROVIDER_POLICY", f"{role} call: no provider meets the privacy policy") from None
            self.breaker.failure()
            raise StepFailed("MODEL_ERROR", f"{role} call failed: {type(exc).__name__}") from None
        self.breaker.success()
        guard.record_success(model, role, response, started)
        message = response.choices[0].message
        if not message.content:
            raise StepFailed("MODEL_OUTPUT_INVALID", f"{role} call returned no content")
        return message.content

    async def _race(self, guard: ApiGuard, role: str, deadline: float, accept=lambda content: True, **kwargs) -> dict:
        """The first of FAST_COPIES identical calls to return valid JSON that `accept` takes. When a
        copy is valid but not accepted, the others get FALLBACK_GRACE_S more to do better; otherwise
        that first valid copy is returned. Copies still running are cancelled and charged at the
        winner's cost, so the budget never undercounts."""
        model = self.settings.assess_model
        providers = self.settings.fast_copy_providers

        def copy(n: int) -> dict:
            # Copies on different providers keep one slow provider from delaying the answer.
            return {**kwargs, "extra_body": {"provider": {"order": [providers[n % len(providers)]]}}} if providers else kwargs

        def settle(content: dict) -> dict:
            cost = max(c["cost_usd"] for c in guard.calls if c["role"] == role)
            for task in tasks:
                if not task.done():
                    task.cancel()
                    guard.calls.append({
                        "n": len(guard.calls) + 1, "role": role, "model_requested": model, "model_served": None,
                        "prompt_tokens": 0, "completion_tokens": 0, "reasoning_tokens": 0, "cost_usd": cost,
                        "cost_source": "estimated-cancelled", "provider": self.settings.llm_provider,
                        "provider_served": None, "latency_s": None,
                    })
            return content

        tasks = [asyncio.create_task(self._call(guard, role, model, deadline, **copy(n))) for n in range(FAST_COPIES)]
        try:
            failure, fallback, grace_until = None, None, None
            pending = set(tasks)
            while pending:
                timeout = None if grace_until is None else max(0.0, grace_until - time.monotonic())
                done, pending = await asyncio.wait(pending, timeout=timeout, return_when=asyncio.FIRST_COMPLETED)
                if not done:
                    break
                for task in done:
                    try:
                        content = json.loads(task.result())
                    except StepFailed as exc:
                        failure = exc
                        continue
                    except json.JSONDecodeError:
                        failure = StepFailed("MODEL_OUTPUT_INVALID", f"{role} call returned invalid JSON")
                        continue
                    if accept(content):
                        return settle(content)
                    if fallback is None:
                        fallback, grace_until = content, time.monotonic() + FALLBACK_GRACE_S
            if fallback is not None:
                return settle(fallback)
            raise failure
        finally:
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _fast_assessment(self, guard: ApiGuard, case: dict, deadline: float, grounding: dict | None = None) -> dict:
        """Diagnosis and workup (and therapy, when enabled) in parallel, merged into one assessment
        for the post-checks. A failed therapy part leaves the assessment without therapy."""
        s = self.settings
        messages = fast_assessment_messages(case, s.provisional_differential, grounding=grounding)

        def race(role: str, fmt: dict, msgs: list[dict], accept=lambda content: True) -> asyncio.Task:
            return asyncio.create_task(
                self._race(
                    guard, role, deadline, accept, messages=msgs, response_format=fmt, temperature=s.assess_temperature
                )
            )

        parts = [race("diagnosis", DIAGNOSIS_RESPONSE_FORMAT, messages), race("workup", WORKUP_RESPONSE_FORMAT, messages)]
        if s.fast_therapy:
            therapy_messages = fast_assessment_messages(case, s.provisional_differential, therapy=True, grounding=grounding)
            # The shortest copy is often an empty regimen; a complete one wins unless no copy has one.
            parts.append(race("therapy", THERAPY_RESPONSE_FORMAT, therapy_messages, _complete_therapy))
        try:
            diagnosis, workup = await asyncio.gather(*parts[:2])
            assessment = {**diagnosis, **workup, "unfilled": diagnosis["unfilled"] + workup["unfilled"]}
            if s.fast_therapy:
                try:
                    assessment.update(await parts[2])
                except StepFailed:
                    pass
            return assessment
        finally:
            for part in parts:
                part.cancel()

    async def run(self, case: dict, grounding: dict | None = None) -> tuple[dict, ApiGuard, list[str]]:
        s = self.settings
        max_calls = (3 if s.fast_therapy else 2) * FAST_COPIES if s.fast_assessment else MAX_CALLS_PER_STEP
        guard = ApiGuard(max_calls=max_calls, max_usd=s.max_usd_per_step, provider=s.llm_provider)
        if self.budget.exhausted():
            return self.unavailable("BUDGET_EXHAUSTED", "Daily model budget reached."), guard, []
        if self.breaker.is_open():
            return self.unavailable("API_ERRORS", "Model calls paused after repeated API errors."), guard, []

        deadline = time.monotonic() + s.step_deadline_s
        try:
            async with asyncio.timeout(s.step_deadline_s):
                if s.fast_assessment:
                    assessment = await self._fast_assessment(guard, case, deadline, grounding)
                else:
                    plan = await self._call(
                        guard, "plan", s.plan_model, deadline,
                        messages=planning_messages(case, planning_menu_text(), grounding)
                    )
                    raw = await self._call(
                        guard,
                        "assessment",
                        s.assess_model,
                        deadline,
                        messages=assessment_messages(case, plan, s.provisional_differential, grounding),
                        response_format=ASSESSMENT_RESPONSE_FORMAT,
                        temperature=s.assess_temperature,
                    )
                    assessment = json.loads(raw)
            fields, notes = postchecks.apply(assessment, case)
        except TimeoutError:
            return self._spent(self.unavailable("TIMEOUT", f"Step deadline of {s.step_deadline_s:g} s reached.", guard), guard)
        except RunAborted as exc:
            return self._spent(self.unavailable("STEP_BUDGET_EXCEEDED", str(exc), guard), guard)
        except StepFailed as exc:
            return self._spent(self.unavailable(exc.code, exc.message, guard), guard)
        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            return self._spent(self.unavailable("MODEL_OUTPUT_INVALID", type(exc).__name__, guard), guard)

        response = {
            "contractVersion": CONTRACT_VERSION,
            "status": "ok",
            **fields,
            "meta": {"version": self.version, "model": self.model, "costUsd": round(guard.cost_usd, 6)},
        }
        problems = errors(RESPONSE, response)
        if problems:
            return self._spent(self.unavailable("CONTRACT_MISMATCH", "; ".join(problems[:5]), guard), guard)
        self.budget.add(guard.cost_usd)
        return response, guard, notes

    def _spent(self, response: dict, guard: ApiGuard) -> tuple[dict, ApiGuard, list[str]]:
        self.budget.add(guard.cost_usd)
        return response, guard, []
