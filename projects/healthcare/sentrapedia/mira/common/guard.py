"""Budget guard for OpenAI chat completions, shared by run_one_case.py and the service.

Moved unchanged in behaviour from run_one_case.py. ``install()`` wraps every chat completion
in the process (used by the CLI runner); the service uses ``before_call``/``record_success``/
``record_error`` around its own calls, one guard per request.
"""

from __future__ import annotations

import time

from .providers import (
    OPENROUTER_HEADERS,
    is_policy_failure,
    model_id,
    openrouter_extra_body,
    served_provider,
    usage_cost,
)

# USD per 1M tokens (input, output), standard tier, from the OpenAI model pages
# checked on 2026-09-27. Cached-input discounts are ignored (conservative).
PRICES = {"gpt-4o": (2.50, 10.00), "o1": (15.00, 60.00)}


class RunAborted(BaseException):
    """Raised by the budget guard. Derives from BaseException on purpose:
    upstream wraps API calls in tenacity @retry (retries any Exception forever)
    and tool execution in `except Exception`, so a normal Exception would be
    swallowed or retried endlessly."""


class ApiGuard:
    """Counts and limits OpenAI chat completions."""

    reasoning_model = "o1"

    def __init__(self, max_calls: int, max_usd: float, max_consecutive_errors: int = 3, provider: str = "openai"):
        self.provider = provider
        self.max_calls = max_calls
        self.max_usd = max_usd
        self.max_consecutive_errors = max_consecutive_errors
        self.calls: list[dict] = []
        self.errors = 0
        self.consecutive_errors = 0

    @staticmethod
    def price_for(model: str) -> tuple[float, float]:
        model = model.split("/")[-1]  # OpenRouter ids carry the organisation prefix
        for prefix in sorted(PRICES, key=len, reverse=True):
            if model.startswith(prefix):
                return PRICES[prefix]
        return PRICES["o1"]  # unknown model: assume the most expensive known price

    @property
    def cost_usd(self) -> float:
        return sum(c["cost_usd"] for c in self.calls)

    def before_call(self) -> None:
        if len(self.calls) >= self.max_calls:
            raise RunAborted(f"API call limit reached ({self.max_calls} calls).")
        if self.cost_usd >= self.max_usd:
            raise RunAborted(f"API cost limit reached (US${self.max_usd:.2f}).")

    def record_error(self, exc: Exception) -> None:
        self.errors += 1
        self.consecutive_errors += 1
        print(f"[guard] API error {self.consecutive_errors}/{self.max_consecutive_errors}: {exc}")
        if self.consecutive_errors >= self.max_consecutive_errors:
            raise RunAborted(f"Aborting after repeated API errors: {exc}") from exc

    def record_success(self, model: str, role: str, response, started: float) -> dict:
        self.consecutive_errors = 0
        usage = getattr(response, "usage", None)
        p_in = getattr(usage, "prompt_tokens", 0) or 0
        p_out = getattr(usage, "completion_tokens", 0) or 0
        details = getattr(usage, "completion_tokens_details", None)
        reasoning = getattr(details, "reasoning_tokens", 0) or 0
        price_in, price_out = self.price_for(model)
        reported = usage_cost(response)
        estimated = round(p_in / 1e6 * price_in + p_out / 1e6 * price_out, 6)
        record = {
            "n": len(self.calls) + 1,
            "role": role,
            "model_requested": model,
            "model_served": getattr(response, "model", None),
            "prompt_tokens": p_in,
            "completion_tokens": p_out,
            "reasoning_tokens": reasoning,
            "cost_usd": round(reported, 6) if reported is not None else estimated,
            "cost_source": "reported" if reported is not None else "estimated",
            "provider": self.provider,
            "provider_served": served_provider(response),
            "latency_s": round(time.time() - started, 2),
        }
        self.calls.append(record)
        print(f"[guard] call {record['n']} {role} {record['model_served']} "
              f"in={p_in} out={p_out} cost=${record['cost_usd']:.4f} total=${self.cost_usd:.3f}")
        return record

    def guarded(self, original):
        """Wrap a chat-completion `create` so every call is counted, limited and, for
        OpenRouter, sent with the organisation-prefixed model, the fixed privacy policy and the
        attribution header."""
        guard = self

        def guarded_create(client_self, *args, **kwargs):
            guard.before_call()
            model = kwargs.get("model", "?")
            role = (
                "physician" if "tools" in kwargs
                else "plan" if model == guard.reasoning_model
                else "patient"
            )
            if guard.provider == "openrouter":
                kwargs["model"] = model = model_id("openrouter", model)
                kwargs["extra_body"] = openrouter_extra_body(kwargs.get("extra_body"))
                kwargs["extra_headers"] = {**OPENROUTER_HEADERS, **(kwargs.get("extra_headers") or {})}
            started = time.time()
            try:
                response = original(client_self, *args, **kwargs)
            except Exception as exc:
                if is_policy_failure(exc):
                    # No provider meets the privacy policy: stop, never retry without it.
                    raise RunAborted(f"PROVIDER_POLICY: {exc}") from exc
                guard.record_error(exc)
                raise
            guard.record_success(model, role, response, started)
            return response

        return guarded_create

    def install(self) -> None:
        from openai.resources.chat.completions import Completions

        Completions.create = self.guarded(Completions.create)
