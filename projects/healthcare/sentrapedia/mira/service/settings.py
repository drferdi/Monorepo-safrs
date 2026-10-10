"""Service settings, read from environment variables only (names in .env.example)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from common.data_policy import DEVELOPMENT_DEFAULT, policy_problem
from common.providers import API_KEY_ENV, PROVIDERS, model_id
from config import MEDICAL_ASSISTANT_MODEL, MEDICAL_ASSISTANT_TEMPERATURE, REASONING_MODEL

SERVICE_DIR = Path(__file__).resolve().parent


class StartupRefused(RuntimeError):
    """The service must not start with this configuration."""


@dataclass(frozen=True)
class Settings:
    env: str
    llm_provider: str
    openrouter_provider_sort: str | None
    openrouter_zdr: bool
    # assessment lists a low-confidence differential even when only the chief complaint is recorded
    provisional_differential: bool
    # no planning call: two parallel assessment parts, each raced in FAST_COPIES copies
    fast_assessment: bool
    # OpenRouter provider slugs; fast-assessment copy n is sent to entry n (cycling), empty = default routing
    fast_copy_providers: tuple[str, ...]
    # fast assessment adds a third raced part: the first-line drug regimen for the likely diagnosis
    fast_therapy: bool
    data_policy: str | None
    dev_token: str
    plan_model: str
    # planning models a client may pick per step (X-MIRA-Plan-Model); the default is always one
    plan_model_choices: tuple[str, ...]
    assess_model: str
    assess_temperature: float
    step_deadline_s: float
    max_usd_per_step: float
    daily_budget_usd: float
    max_consecutive_api_errors: int
    api_error_cooldown_s: float
    max_body_bytes: int
    rate_limit_per_minute: int
    audit_dir: Path
    # browser origins allowed by CORS, e.g. chrome-extension://<Med Assist extension id>
    allowed_origins: tuple[str, ...]


def _flag(env: dict[str, str], name: str) -> bool:
    value = env.get(name, "false")
    if value not in ("true", "false"):
        raise StartupRefused(f"{name} supports only 'true' or 'false'.")
    return value == "true"


def load_settings(environ: dict[str, str] | None = None) -> Settings:
    source = os.environ if environ is None else environ
    env = {name: value for name, value in source.items() if value != ""}  # empty = not set (.env.example)
    provider = env.get("MIRA_LLM_PROVIDER", "openai")
    zdr = env.get("MIRA_OPENROUTER_ZDR", "true")
    if zdr not in ("true", "false"):
        raise StartupRefused("MIRA_OPENROUTER_ZDR supports only 'true' or 'false'.")
    service_env = env.get("MIRA_SERVICE_ENV", "development")
    plan_model = model_id(provider, env.get("MIRA_PLAN_MODEL", REASONING_MODEL))
    choices = [model_id(provider, name.strip()) for name in env.get("MIRA_PLAN_MODEL_CHOICES", "").split(",") if name.strip()]
    return Settings(
        env=service_env,
        llm_provider=provider,
        openrouter_provider_sort=env.get("MIRA_OPENROUTER_PROVIDER_SORT") or None,
        openrouter_zdr=zdr == "true",
        provisional_differential=_flag(env, "MIRA_PROVISIONAL_DIFFERENTIAL"),
        fast_assessment=_flag(env, "MIRA_FAST_ASSESSMENT"),
        fast_therapy=_flag(env, "MIRA_FAST_THERAPY"),
        fast_copy_providers=tuple(p.strip() for p in env.get("MIRA_FAST_COPY_PROVIDERS", "").split(",") if p.strip()),
        # Required in production; development defaults to synthetic cases only.
        data_policy=env.get("MIRA_DATA_POLICY", DEVELOPMENT_DEFAULT if service_env == "development" else None),
        dev_token=env.get("MIRA_DEV_TOKEN", ""),
        # defaults: MIRA's models; through OpenRouter as openai/o1 and openai/gpt-4o
        plan_model=plan_model,
        plan_model_choices=tuple(dict.fromkeys([plan_model, *choices])),
        assess_model=model_id(provider, env.get("MIRA_ASSESS_MODEL", MEDICAL_ASSISTANT_MODEL)),
        assess_temperature=MEDICAL_ASSISTANT_TEMPERATURE,
        step_deadline_s=float(env.get("MIRA_STEP_DEADLINE_S", "12")),
        max_usd_per_step=float(env.get("MIRA_MAX_USD_PER_STEP", "0.50")),
        daily_budget_usd=float(env.get("MIRA_DAILY_BUDGET_USD", "5")),
        max_consecutive_api_errors=int(env.get("MIRA_MAX_CONSECUTIVE_API_ERRORS", "3")),
        api_error_cooldown_s=float(env.get("MIRA_API_ERROR_COOLDOWN_S", "60")),
        max_body_bytes=int(env.get("MIRA_MAX_BODY_BYTES", "65536")),
        rate_limit_per_minute=int(env.get("MIRA_RATE_LIMIT_PER_MINUTE", "30")),
        audit_dir=Path(env.get("MIRA_AUDIT_DIR", str(SERVICE_DIR / "audit"))),
        allowed_origins=tuple(o.strip() for o in env.get("MIRA_ALLOWED_ORIGINS", "").split(",") if o.strip()),
    )


def check_startup(settings: Settings, require_api_key: bool = True, environ: dict[str, str] | None = None) -> None:
    """Refuse configurations that must never serve traffic. Tests inject a mock model client and
    therefore skip only the API-key check; the environment checks always apply."""
    env = os.environ if environ is None else environ
    if settings.env not in ("development", "production"):
        raise StartupRefused(f"Unknown MIRA_SERVICE_ENV '{settings.env}'.")
    if settings.llm_provider not in PROVIDERS:
        raise StartupRefused(f"Unknown MIRA_LLM_PROVIDER '{settings.llm_provider}' (use {' or '.join(PROVIDERS)}).")
    if settings.openrouter_provider_sort not in (None, "throughput"):
        raise StartupRefused("MIRA_OPENROUTER_PROVIDER_SORT supports only 'throughput'.")
    if settings.openrouter_provider_sort is not None and settings.llm_provider != "openrouter":
        raise StartupRefused("MIRA_OPENROUTER_PROVIDER_SORT requires MIRA_LLM_PROVIDER=openrouter.")
    if not settings.openrouter_zdr and settings.llm_provider != "openrouter":
        raise StartupRefused("MIRA_OPENROUTER_ZDR=false requires MIRA_LLM_PROVIDER=openrouter.")
    if settings.fast_therapy and not settings.fast_assessment:
        raise StartupRefused("MIRA_FAST_THERAPY requires MIRA_FAST_ASSESSMENT=true.")
    if settings.fast_copy_providers and settings.llm_provider != "openrouter":
        raise StartupRefused("MIRA_FAST_COPY_PROVIDERS requires MIRA_LLM_PROVIDER=openrouter.")
    if not settings.openrouter_zdr and settings.data_policy == "openrouter-zdr":
        raise StartupRefused("MIRA_OPENROUTER_ZDR=false conflicts with the openrouter-zdr data policy.")
    key_name = API_KEY_ENV[settings.llm_provider]
    if require_api_key and not env.get(key_name):
        raise StartupRefused(f"{key_name} is empty (MIRA_LLM_PROVIDER={settings.llm_provider}).")
    bare = [origin for origin in settings.allowed_origins if "://" not in origin]
    if bare:
        # A bare extension id would never match the browser's Origin header.
        raise StartupRefused(f"MIRA_ALLOWED_ORIGINS needs full origins such as chrome-extension://<id>, got {bare}.")
    problem = policy_problem(settings.data_policy, settings.llm_provider)
    if problem:
        raise StartupRefused(problem)
    if settings.env == "production":
        # No production token verifier exists yet (crew-portal service token is a separate task).
        raise StartupRefused("MIRA_SERVICE_ENV=production is not supported: no production token verifier.")
    if not settings.dev_token:
        raise StartupRefused("MIRA_DEV_TOKEN is empty; the development verifier needs a token.")
