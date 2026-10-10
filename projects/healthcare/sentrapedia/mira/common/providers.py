"""LLM provider settings shared by the reasoning service and the simulation runner.

Two providers: OpenAI directly, or OpenRouter (OpenAI-compatible API). For OpenRouter every
request defaults to zero data retention, no data collection, and only providers that support
every parameter sent. The service can explicitly omit only the retention filter per process.
If no provider meets the remaining policy, OpenRouter refuses the request and callers report
PROVIDER_POLICY; nothing retries without that policy.

OpenRouter facts checked on 2026-09-27 (docs and the public API):
- `usage: {include: true}` is documented as deprecated with no effect (usage is always
  returned); it is still sent because the project owner's rule requires it.
- `usage.cost` is in credits; the base currency of credits is US dollars. The 5.5% fee on buying
  credits is not part of it.
- HTTP 503 means no provider meets the routing requirements.
"""

from __future__ import annotations

import json
import urllib.request
from collections.abc import Callable

PROVIDERS = ("openai", "openrouter")
API_KEY_ENV = {"openai": "OPENAI_API_KEY", "openrouter": "OPENROUTER_API_KEY"}
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_HEADERS = {"X-OpenRouter-Title": "Sentra MIRA reasoning service"}
OPENROUTER_PROVIDER_POLICY = {"zdr": True, "data_collection": "deny", "require_parameters": True}
OPENROUTER_USAGE = {"include": True}


def model_id(provider: str, model: str) -> str:
    """OpenRouter model ids carry the organisation prefix (openai/o1); bare names get `openai/`."""
    if provider == "openrouter" and "/" not in model:
        return f"openai/{model}"
    return model


def openrouter_extra_body(existing: dict | None = None, *, provider_sort: str | None = None, enforce_zdr: bool = True) -> dict:
    """Merge policy, optional sort, and explicit per-process retention-filter opt-out."""
    body = dict(existing or {})
    provider = {**(body.get("provider") or {}), **OPENROUTER_PROVIDER_POLICY}
    if not enforce_zdr:
        provider.pop("zdr", None)
    if provider_sort is not None:
        provider["sort"] = provider_sort
    body["provider"] = provider
    body["usage"] = dict(OPENROUTER_USAGE)
    return body


def is_policy_failure(exc: BaseException) -> bool:
    """True when OpenRouter found no provider meeting the request's routing requirements."""
    status = getattr(exc, "status_code", None)
    text = str(exc).lower()
    return status == 503 or (status == 404 and "no endpoints found" in text)


def usage_cost(response) -> float | None:
    """Cost reported by the provider (OpenRouter: usage.cost, in USD-denominated credits)."""
    cost = getattr(getattr(response, "usage", None), "cost", None)
    if isinstance(cost, bool) or not isinstance(cost, (int, float)):
        return None
    return float(cost)


def served_provider(response) -> str | None:
    provider = getattr(response, "provider", None)
    return provider if isinstance(provider, str) and provider else None


def route_openai_sdk_to_openrouter(environ: dict) -> None:
    """Point every OpenAI() client created afterwards (including upstream MIRA's) at OpenRouter.

    The OpenAI SDK reads OPENAI_BASE_URL and OPENAI_API_KEY when a client is created; this sets
    both for the current process only. Nothing is written to disk.
    """
    key = environ.get("OPENROUTER_API_KEY")
    if not key:
        raise RuntimeError("OPENROUTER_API_KEY is empty.")
    environ["OPENAI_BASE_URL"] = OPENROUTER_BASE_URL
    environ["OPENAI_API_KEY"] = key


def _get_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=30) as response:  # public endpoints, no key sent
        return json.loads(response.read().decode("utf-8"))


def preflight_openrouter(requirements: dict[str, set[str]], get_json: Callable[[str], dict] = _get_json) -> list[str]:
    """Check, without any completion call, that each model exists, supports the listed
    parameters, and has a zero-data-retention endpoint that supports them. Returns problems."""
    models = {m["id"]: m for m in get_json(f"{OPENROUTER_BASE_URL}/models")["data"]}
    zdr = get_json(f"{OPENROUTER_BASE_URL}/endpoints/zdr")["data"]
    problems = []
    for model, needed in requirements.items():
        # ":nitro" only sorts the model's providers by throughput; it is not listed as its own model.
        base = model.removesuffix(":nitro")
        info = models.get(base)
        if info is None:
            problems.append(f"{model}: not offered by OpenRouter")
            continue
        missing = sorted(needed - set(info.get("supported_parameters", [])))
        if missing:
            problems.append(f"{model}: does not support {', '.join(missing)}")
        endpoints = [e for e in zdr if e.get("model_id") == base]
        if not endpoints:
            problems.append(f"{model}: no zero-data-retention endpoint")
        elif not any(needed <= set(e.get("supported_parameters", [])) for e in endpoints):
            providers = ", ".join(e.get("provider_name", "?") for e in endpoints)
            problems.append(f"{model}: no zero-data-retention endpoint supports {', '.join(sorted(needed))} ({providers})")
    return problems
