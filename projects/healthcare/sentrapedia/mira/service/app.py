"""HTTP entry point. Run with the factory:

    python -m uvicorn --factory service.app:create_app --app-dir assist --host 127.0.0.1 --port 8765
"""

from __future__ import annotations

import json
import logging
import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from common.data_policy import SYNTHETIC_HEADER, is_synthetic_request
from common.providers import OPENROUTER_BASE_URL, OPENROUTER_HEADERS, model_id

from . import SERVICE_VERSION
from .audit import AuditLog, DailyBudget
from .auth import DevTokenVerifier, RateLimiter, bearer_token
from .contract import CONTRACT_VERSION, REQUEST, errors
from .engine import ApiErrorBreaker, StepEngine
from .privacy import pii_kinds
from .settings import Settings, check_startup, load_settings

log = logging.getLogger("mira_service")

# Optional per-step planning model, chosen by a developer or admin in Med Assist; checked
# against Settings.plan_model_choices. The request contract (owned by Med Assist) is unchanged.
PLAN_MODEL_HEADER = "X-MIRA-Plan-Model"
GROUNDING_CAPABILITY = "oracle-grounding-v1"


def create_app(settings: Settings | None = None, client=None) -> FastAPI:
    settings = settings or load_settings()
    check_startup(settings, require_api_key=client is None)
    if client is None:
        from openai import AsyncOpenAI

        if settings.llm_provider == "openrouter":
            client = AsyncOpenAI(
                api_key=os.environ["OPENROUTER_API_KEY"],
                base_url=OPENROUTER_BASE_URL,
                default_headers=OPENROUTER_HEADERS,
                max_retries=0,
            )
        else:
            client = AsyncOpenAI(max_retries=0)

    verifier = DevTokenVerifier(settings.dev_token)
    limiter = RateLimiter(settings.rate_limit_per_minute)
    audit = AuditLog(settings.audit_dir)
    engine = StepEngine(
        settings,
        client,
        DailyBudget(settings.daily_budget_usd, audit),
        ApiErrorBreaker(settings.max_consecutive_api_errors, settings.api_error_cooldown_s),
    )
    app = FastAPI(title="MIRA reasoning service", version=SERVICE_VERSION, docs_url=None, redoc_url=None)
    # Med Assist sends no cookies (credentials: 'omit'); only listed origins get CORS headers.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type", PLAN_MODEL_HEADER, SYNTHETIC_HEADER],
    )

    @app.get("/healthz")
    async def healthz() -> dict:
        return {
            "status": "ok",
            "version": engine.version,
            "contractVersion": CONTRACT_VERSION,
            "capabilities": [GROUNDING_CAPABILITY],
        }

    @app.post("/v1/diagnosis/step")
    async def step(request: Request) -> JSONResponse:
        principal = verifier.verify(bearer_token(request.headers.get("authorization")))
        if principal is None:
            return JSONResponse({"detail": "unauthorized"}, status_code=401)
        if not limiter.allow(principal):
            return JSONResponse({"detail": "rate limit exceeded"}, status_code=429)
        body = await request.body()
        if len(body) > settings.max_body_bytes:
            return JSONResponse({"detail": "request too large"}, status_code=413)
        try:
            payload = json.loads(body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JSONResponse({"detail": "invalid JSON"}, status_code=400)
        problems = errors(REQUEST, payload)
        if problems:
            return JSONResponse({"detail": "invalid request", "errors": problems}, status_code=400)

        started = time.monotonic()
        trace_id = payload["traceId"]
        if settings.data_policy == "synthetic-only" and not is_synthetic_request(request.headers.get(SYNTHETIC_HEADER)):
            # The case may be real: refuse before any model call and keep it out of the audit log.
            response = engine.unavailable(
                "DATA_POLICY", f"MIRA_DATA_POLICY=synthetic-only accepts only requests marked {SYNTHETIC_HEADER}: synthetic."
            )
            audit.write({"traceId": trace_id, "principal": principal, "dataPolicy": settings.data_policy,
                         "status": "unavailable", "errorCode": "DATA_POLICY", "costUsd": 0.0})
            return JSONResponse(response)
        kinds = pii_kinds(json.dumps(payload, ensure_ascii=False))
        if kinds:
            response = engine.unavailable("PII_DETECTED", "Blocked before any model call: " + ", ".join(kinds))
            audit.write({"traceId": trace_id, "principal": principal, "dataPolicy": settings.data_policy,
                         "status": "unavailable", "errorCode": "PII_DETECTED", "costUsd": 0.0})
            return JSONResponse(response)
        step_engine = engine
        chosen = request.headers.get(PLAN_MODEL_HEADER)
        if chosen is not None:
            plan_model = model_id(settings.llm_provider, chosen.strip())
            if plan_model not in settings.plan_model_choices:
                # Never forwarded: only models in MIRA_PLAN_MODEL_CHOICES (and the default) are called.
                response = engine.unavailable("MODEL_NOT_ALLOWED", f"{PLAN_MODEL_HEADER} is not an allowed planning model.")
                audit.write({"traceId": trace_id, "principal": principal, "dataPolicy": settings.data_policy,
                             "status": "unavailable", "errorCode": "MODEL_NOT_ALLOWED", "costUsd": 0.0})
                return JSONResponse(response)
            step_engine = engine.with_plan_model(plan_model)

        try:
            response, guard, notes = await step_engine.run(payload["case"], payload.get("grounding"))
            calls = guard.calls
        except Exception as exc:  # any internal failure is an 'unavailable' answer, never a 500
            log.warning("step failed internally: %s", type(exc).__name__)
            response, calls, notes = step_engine.unavailable("INTERNAL_ERROR", type(exc).__name__), [], []
        audit.write(
            {
                "traceId": trace_id,
                "principal": principal,
                "provider": settings.llm_provider,
                "dataPolicy": settings.data_policy,
                "models": {"plan": step_engine.settings.plan_model, "assessment": settings.assess_model},
                "status": response["status"],
                "errorCode": response.get("error", {}).get("code"),
                "latencyMs": round((time.monotonic() - started) * 1000),
                "costUsd": response["meta"]["costUsd"],
                "costSource": sorted({call["cost_source"] for call in calls}) or None,
                "calls": calls,
                "postcheckNotes": notes,
                "request": payload,
                "response": response,
            }
        )
        return JSONResponse(response)

    return app
