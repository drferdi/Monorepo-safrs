"""One reasoning step: MIRA's planning routine, then a structured assessment, then post-checks.

At most two model calls per step, a step deadline, a per-step cost cap (ApiGuard), a daily
budget, and a pause after repeated API errors. Every failure becomes a contract-valid
`unavailable` response; the case text never appears in errors or logs.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from dataclasses import replace

from openai import APITimeoutError, AuthenticationError, PermissionDeniedError

from common.guard import ApiGuard, RunAborted
from common.providers import is_policy_failure, openrouter_extra_body
from config import MEDICAL_ASSISTANT_MODEL, REASONING_MODEL

from . import SERVICE_VERSION, postchecks
from .audit import DailyBudget
from .contract import (
    CONTRACT_VERSION,
    RESPONSE,
    THERAPY_RESPONSE,
    errors,
    unavailable_response,
)
from .menu import planning_menu_text
from .prompts import (
    ASSESSMENT_RESPONSE_FORMAT,
    DIAGNOSIS_RESPONSE_FORMAT,
    THERAPY_RESPONSE_FORMAT,
    WORKUP_RESPONSE_FORMAT,
    assessment_messages,
    fast_assessment_messages,
    planning_messages,
    targeted_therapy_messages,
)
from .settings import Settings

log = logging.getLogger("mira_service")
MAX_CALLS_PER_STEP = 2
# fast assessment: default copies per raced part; MIRA_FAST_COPIES overrides it (fast_copies below)
FAST_COPIES = 3
# how long the other copies may still beat a valid but unaccepted one
FALLBACK_GRACE_S = 1.0


def fast_copies(environ: dict[str, str] | None = None) -> int:
    """Copies per raced part: MIRA_FAST_COPIES, default FAST_COPIES. Read here, not in Settings, which
    stays byte-identical to upstream."""
    env = os.environ if environ is None else environ
    copies = int(env.get("MIRA_FAST_COPIES", FAST_COPIES))
    if copies < 1:
        raise ValueError("MIRA_FAST_COPIES must be at least 1.")
    return copies


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

    async def _call(self, guard: ApiGuard, role: str, model: str, deadline: float, count_failure: bool = True, **kwargs) -> str:
        """One model call. A race passes count_failure=False and counts its part once, so failed copies of a part that
        another copy answers never pause the service."""
        guard.before_call()
        if self.settings.llm_provider == "openrouter":
            kwargs["extra_body"] = openrouter_extra_body(
                kwargs.get("extra_body"), provider_sort=self.settings.openrouter_provider_sort,
                enforce_zdr=self.settings.openrouter_zdr,
            )
        remaining = max(deadline - time.monotonic(), 0.001)
        started = time.time()
        guard.in_flight += 1
        try:
            try:
                response = await self.client.chat.completions.create(model=model, timeout=remaining, **kwargs)
            except Exception:  # a CancelledError is not an Exception: a cut-off call stays in flight (row 46)
                guard.in_flight -= 1
                raise
            guard.in_flight -= 1
        except APITimeoutError:
            # A slow call is the step deadline, not an API failure: it must not pause the service.
            raise StepFailed("TIMEOUT", f"{role} call exceeded the step deadline") from None
        except (AuthenticationError, PermissionDeniedError):
            # A rejected or revoked key is configuration, not an outage: no pause; the clinician is told to check the key.
            raise StepFailed("PROVIDER_AUTH", f"{role} call: API key rejected") from None
        except Exception as exc:
            if is_policy_failure(exc) and self.settings.llm_provider == "openrouter":
                # No provider meets the privacy policy. Not an outage: no pause, no retry without it.
                # Only OpenRouter has a routing policy; elsewhere (the Gemini route) a 503 is an outage.
                raise StepFailed("PROVIDER_POLICY", f"{role} call: no provider meets the privacy policy") from None
            # The class and HTTP status say whether it was a rate limit, an outage or credit; the message may echo input.
            log.warning("%s call failed: %s %s", role, type(exc).__name__, getattr(exc, "status_code", ""))
            if count_failure:
                self.breaker.failure()
            raise StepFailed("MODEL_ERROR", f"{role} call failed: {type(exc).__name__}") from None
        self.breaker.success()
        guard.record_success(model, role, response, started)
        # An empty choices list is billed like any answer, so it fails as a step (which charges it), not as a crash.
        message = response.choices[0].message if response.choices else None
        if not message or not message.content:
            raise StepFailed("MODEL_OUTPUT_INVALID", f"{role} call returned no content")
        return message.content

    async def _race(self, guard: ApiGuard, role: str, deadline: float, accept=lambda content: True, **kwargs) -> dict:
        """The first of fast_copies() identical calls to return valid JSON that `accept` takes. When a
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
                    guard.in_flight -= 1  # charged here, so a later hang-up does not charge it again
                    guard.calls.append({
                        "n": len(guard.calls) + 1, "role": role, "model_requested": model, "model_served": None,
                        "prompt_tokens": 0, "completion_tokens": 0, "reasoning_tokens": 0, "cost_usd": cost,
                        "cost_source": "estimated-cancelled", "provider": self.settings.llm_provider,
                        "provider_served": None, "latency_s": None,
                    })
            return content

        tasks = [asyncio.create_task(self._call(guard, role, model, deadline, count_failure=False, **copy(n))) for n in range(fast_copies())]
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
            if failure.code == "MODEL_ERROR":
                self.breaker.failure()
            raise failure
        finally:
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _fast_assessment(
        self, guard: ApiGuard, case: dict, deadline: float, grounding: dict | None = None, therapy: bool = True
    ) -> dict:
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
        if therapy:
            therapy_messages = fast_assessment_messages(case, s.provisional_differential, therapy=True, grounding=grounding)
            # The shortest copy is often an empty regimen; a complete one wins unless no copy has one.
            parts.append(race("therapy", THERAPY_RESPONSE_FORMAT, therapy_messages, _complete_therapy))
        try:
            diagnosis, workup = await asyncio.gather(*parts[:2])
            assessment = {**diagnosis, **workup, "unfilled": diagnosis["unfilled"] + workup["unfilled"]}
            if therapy:
                try:
                    assessment.update(await parts[2])
                except StepFailed:
                    pass
            return assessment
        finally:
            for part in parts:
                part.cancel()

    def _charge_if_cancelled(self, guard: ApiGuard) -> None:
        """A step cancelled because its caller hung up (row 46) stops with calls in flight that report no cost and
        may still be billed. Gaffer, 2026-10-19: each is charged the dearest call the step recorded; before any call
        has a cost, the step's cap stands in."""
        if not asyncio.current_task().cancelling() or not guard.in_flight:
            return
        s = self.settings
        recorded = [c["cost_usd"] for c in guard.calls]
        for cost in [max(recorded)] * guard.in_flight if recorded else [s.max_usd_per_step]:
            guard.calls.append({
                "n": len(guard.calls) + 1, "role": "cancelled", "model_requested": None, "model_served": None,
                "prompt_tokens": 0, "completion_tokens": 0, "reasoning_tokens": 0, "cost_usd": cost,
                "cost_source": "estimated-cancelled", "provider": s.llm_provider, "provider_served": None, "latency_s": None,
            })

    async def run(
        self, case: dict, grounding: dict | None = None, omit_therapy: bool = False, on_guard=None
    ) -> tuple[dict, ApiGuard, list[str]]:
        """on_guard receives the step's guard before any call, so a caller can still log the spend of a step that crashes."""
        s = self.settings
        therapy = s.fast_therapy and not omit_therapy
        max_calls = (3 if therapy else 2) * fast_copies() if s.fast_assessment else MAX_CALLS_PER_STEP
        guard = ApiGuard(max_calls=max_calls, max_usd=s.max_usd_per_step, provider=s.llm_provider)
        if on_guard:
            on_guard(guard)
        if not self.budget.reserve(s.max_usd_per_step):
            return self.unavailable("BUDGET_EXHAUSTED", "Daily model budget reached."), guard, []
        try:
            if self.breaker.is_open():
                return self.unavailable("API_ERRORS", "Model calls paused after repeated API errors."), guard, []
            return await self._run(guard, case, grounding, therapy)
        finally:
            # The hold is released and the spend charged however the step ends, an unexpected exception included (row 40).
            self._charge_if_cancelled(guard)
            self.budget.settle(s.max_usd_per_step, guard.cost_usd)

    async def _run(self, guard: ApiGuard, case: dict, grounding: dict | None, therapy: bool) -> tuple[dict, ApiGuard, list[str]]:
        s = self.settings
        deadline = time.monotonic() + s.step_deadline_s
        try:
            async with asyncio.timeout(s.step_deadline_s):
                if s.fast_assessment:
                    assessment = await self._fast_assessment(guard, case, deadline, grounding, therapy)
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
            return self.unavailable("TIMEOUT", f"Step deadline of {s.step_deadline_s:g} s reached.", guard), guard, []
        except RunAborted as exc:
            return self.unavailable("STEP_BUDGET_EXCEEDED", str(exc), guard), guard, []
        except StepFailed as exc:
            return self.unavailable(exc.code, exc.message, guard), guard, []
        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            return self.unavailable("MODEL_OUTPUT_INVALID", type(exc).__name__, guard), guard, []

        response = {
            "contractVersion": CONTRACT_VERSION,
            "status": "ok",
            **fields,
            "meta": {"version": self.version, "model": self.model, "costUsd": round(guard.cost_usd, 6)},
        }
        problems = errors(RESPONSE, response)
        if problems:
            return self.unavailable("CONTRACT_MISMATCH", "; ".join(problems[:5]), guard), guard, []
        return response, guard, notes

    def therapy_unavailable(self, code: str, message: str, guard: ApiGuard | None = None) -> dict:
        cost = round(guard.cost_usd, 6) if guard else 0.0
        return {"contractVersion": CONTRACT_VERSION, "status": "unavailable", "error": {"code": code, "message": message},
                "meta": {"version": self.version, "model": self.model, "costUsd": cost}}

    async def run_therapy(self, case: dict, diagnosis: dict, grounding: dict, on_guard=None) -> tuple[dict, ApiGuard, list[str]]:
        """Therapy for a diagnosis chosen by an earlier step, grounded on excerpts retrieved for it. on_guard: as in run."""
        s = self.settings
        guard = ApiGuard(max_calls=fast_copies(), max_usd=s.max_usd_per_step, provider=s.llm_provider)
        if on_guard:
            on_guard(guard)
        if not self.budget.reserve(s.max_usd_per_step):
            return self.therapy_unavailable("BUDGET_EXHAUSTED", "Daily model budget reached."), guard, []
        try:
            if self.breaker.is_open():
                return self.therapy_unavailable("API_ERRORS", "Model calls paused after repeated API errors."), guard, []
            return await self._run_therapy(guard, case, diagnosis, grounding)
        finally:
            # The hold is released and the spend charged however the step ends, an unexpected exception included (row 40).
            self._charge_if_cancelled(guard)
            self.budget.settle(s.max_usd_per_step, guard.cost_usd)

    async def _run_therapy(self, guard: ApiGuard, case: dict, diagnosis: dict, grounding: dict) -> tuple[dict, ApiGuard, list[str]]:
        s = self.settings
        deadline = time.monotonic() + s.step_deadline_s
        notes: list[str] = []
        try:
            async with asyncio.timeout(s.step_deadline_s):
                content = await self._race(
                    guard, "therapy", deadline, _complete_therapy,
                    messages=targeted_therapy_messages(case, diagnosis, s.provisional_differential, grounding),
                    response_format=THERAPY_RESPONSE_FORMAT, temperature=s.assess_temperature,
                )
            therapy = content["therapy"]
            target = therapy["forDiagnosis"]
            code, note = postchecks.resolve_code(target["icd10"], target["label"], postchecks.icd_codes())
            if note:
                notes.append(f"therapy: {note}")
            therapy = {**therapy, "forDiagnosis": {**target, "icd10": code or target["icd10"]}}
        except TimeoutError:
            return self.therapy_unavailable("TIMEOUT", f"Step deadline of {s.step_deadline_s:g} s reached.", guard), guard, []
        except RunAborted as exc:
            return self.therapy_unavailable("STEP_BUDGET_EXCEEDED", str(exc), guard), guard, []
        except StepFailed as exc:
            return self.therapy_unavailable(exc.code, exc.message, guard), guard, []
        except (KeyError, TypeError) as exc:
            return self.therapy_unavailable("MODEL_OUTPUT_INVALID", type(exc).__name__, guard), guard, []
        response = {"contractVersion": CONTRACT_VERSION, "status": "ok", "therapy": therapy,
                    "meta": {"version": self.version, "model": self.model, "costUsd": round(guard.cost_usd, 6)}}
        problems = errors(THERAPY_RESPONSE, response)
        if problems:
            response = self.therapy_unavailable("CONTRACT_MISMATCH", "; ".join(problems[:5]), guard)
        return response, guard, notes
