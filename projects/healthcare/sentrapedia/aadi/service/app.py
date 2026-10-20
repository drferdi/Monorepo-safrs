"""HTTP entry point. Run with the factory:

    python -m uvicorn --factory service.app:create_app --app-dir assist --host 127.0.0.1 --port 8765
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
import time
from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from common.data_policy import SYNTHETIC_HEADER, is_synthetic_request
from common.guard import PRICES
from common.providers import OPENROUTER_BASE_URL, OPENROUTER_HEADERS, model_id

from . import SERVICE_VERSION
from .audit import AuditLog, DailyBudget
from .auth import DevTokenVerifier, RateLimiter, bearer_token
from .contract import CONTRACT_VERSION, REQUEST, THERAPY_REQUEST, errors
from .engine import ApiErrorBreaker, StepEngine
from .privacy import pii_kinds
from .settings import Settings, StartupRefused, check_startup, load_settings

log = logging.getLogger("aadi_service")

# Optional per-step planning model, chosen by a developer or admin in Med Assist; checked
# against Settings.plan_model_choices. The request contract (owned by Med Assist) is unchanged.
PLAN_MODEL_HEADER = "X-AADI-Plan-Model"
GROUNDING_CAPABILITY = "theoracle-grounding-v2"
TARGETED_THERAPY_CAPABILITY = "theoracle-targeted-therapy-v1"
# Gaffer, 2026-10-18: the ledger keeps metadata and hashes, never the case text, for 14 days.
AUDIT_RETENTION_DAYS = 14
DISCONNECT_POLL_S = 0.5
# A DOI is a citation, not an identifier: AHA DOIs end in 16 digits, which read as a NIK (Gaffer, 2026-10-19). The
# gateway's passage filter (src/lib/theoracle-grounding.ts) removes the same pattern, so it never sends what this refuses.
DOI = re.compile(r"\b(?:doi:\s*)?10\.\d{4,9}/\s?[^\s\"<>]+|\bdoi:\s*[^\s\"<>]+", re.IGNORECASE)


def digest(value) -> str:
    """SHA-256 of canonical JSON, so a ledger line can be matched to a request without storing it."""
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()


def scanned_text(payload: dict) -> str:
    """The request parts that carry case or passage text. Ids, hashes and the traceId are random hex: about 1 in 735
    random UUIDs matched a phone pattern, which refused synthetic cases at random."""
    evidence = [
        {"text": DOI.sub(" ", item["text"]), **{key: item["source"][key] for key in ("title", "docSource", "origin")}}
        for item in (payload.get("grounding") or {}).get("evidence", [])
    ]
    return json.dumps({"case": payload["case"], "diagnosis": payload.get("diagnosis"), "evidence": evidence}, ensure_ascii=False)


async def hung_up(request: Request) -> None:
    """Returns once the caller has closed the connection; Starlette reports a disconnect only when asked."""
    while not await request.is_disconnected():
        await asyncio.sleep(DISCONNECT_POLL_S)


def prune_audit(directory: Path) -> None:
    """Deletes day files older than AUDIT_RETENTION_DAYS; other files stay."""
    today = datetime.now(UTC).date()
    for path in directory.glob("audit-*.jsonl"):
        try:
            day = datetime.strptime(path.stem.removeprefix("audit-"), "%Y-%m-%d").date()
        except ValueError:
            continue
        if (today - day).days > AUDIT_RETENTION_DAYS:
            path.unlink()


def create_app(settings: Settings | None = None, client=None) -> FastAPI:
    settings = settings or load_settings()
    check_startup(settings, require_api_key=client is None)
    model = settings.assess_model.split("/")[-1]
    if settings.llm_provider == "openai" and not any(model.startswith(prefix) for prefix in PRICES):
        # This route reports no cost, so an unpriced model would be billed at o1's price and trip every step budget.
        raise StartupRefused(f"No price is registered for {settings.assess_model}; add it to PRICES in common/guard.py.")
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
    prune_audit(settings.audit_dir)
    audit = AuditLog(settings.audit_dir)
    engine = StepEngine(
        settings,
        client,
        DailyBudget(settings.daily_budget_usd, audit),
        ApiErrorBreaker(settings.max_consecutive_api_errors, settings.api_error_cooldown_s),
    )
    app = FastAPI(title="AADI reasoning service", version=SERVICE_VERSION, docs_url=None, redoc_url=None)
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
            "capabilities": [GROUNDING_CAPABILITY, TARGETED_THERAPY_CAPABILITY],
        }

    async def handle(request: Request, validator, run) -> JSONResponse:
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
        problems = errors(validator, payload)
        if problems:
            return JSONResponse({"detail": "invalid request", "errors": problems}, status_code=400)

        started = time.monotonic()
        trace_id = payload["traceId"]
        if settings.data_policy == "synthetic-only" and not is_synthetic_request(request.headers.get(SYNTHETIC_HEADER)):
            # The case may be real: refuse before any model call and keep it out of the audit log.
            response = engine.unavailable(
                "DATA_POLICY", f"AADI_DATA_POLICY=synthetic-only accepts only requests marked {SYNTHETIC_HEADER}: synthetic."
            )
            audit.write({"traceId": trace_id, "principal": principal, "dataPolicy": settings.data_policy,
                         "status": "unavailable", "errorCode": "DATA_POLICY", "costUsd": 0.0})
            return JSONResponse(response)
        kinds = pii_kinds(scanned_text(payload))
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
                # Never forwarded: only models in AADI_PLAN_MODEL_CHOICES (and the default) are called.
                response = engine.unavailable("MODEL_NOT_ALLOWED", f"{PLAN_MODEL_HEADER} is not an allowed planning model.")
                audit.write({"traceId": trace_id, "principal": principal, "dataPolicy": settings.data_policy,
                             "status": "unavailable", "errorCode": "MODEL_NOT_ALLOWED", "costUsd": 0.0})
                return JSONResponse(response)
            step_engine = engine.with_plan_model(plan_model)

        guards = []  # the engine hands over the step's guard before any call
        work = asyncio.create_task(run(step_engine, payload, guards.append))
        watch = asyncio.create_task(hung_up(request))
        await asyncio.wait({work, watch}, return_when=asyncio.FIRST_COMPLETED)
        watch.cancel()
        if not work.done():
            # The caller hung up (the gateway gave up on this step): stop its calls instead of paying for an
            # answer nobody reads. Uvicorn lets the handler run on otherwise (row 46). The engine charges the cap.
            work.cancel()
            await asyncio.gather(work, return_exceptions=True)
            guard = guards[0]
            response = step_engine.unavailable("CLIENT_DISCONNECTED", "The caller hung up; the step was cancelled.", guard)
            calls, notes = guard.calls, []
        else:
            try:
                response, guard, notes = work.result()
                calls = guard.calls
            except Exception as exc:  # any internal failure is an 'unavailable' answer, never a 500
                log.warning("step failed internally: %s", type(exc).__name__)
                # The calls made before the crash were paid: the answer and the ledger carry them (row 40).
                guard = guards[0] if guards else None
                response = step_engine.unavailable("INTERNAL_ERROR", type(exc).__name__, guard)
                calls, notes = (guard.calls if guard else []), []
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
                "requestSha256": digest(payload),
                "responseSha256": digest(response),
            }
        )
        return JSONResponse(response)

    @app.post("/v1/diagnosis/step")
    async def step(request: Request) -> JSONResponse:
        return await handle(request, REQUEST, lambda e, p, track: e.run(p["case"], p.get("grounding"), p.get("omitTherapy", False), track))

    @app.post("/v1/therapy/step")
    async def therapy_step(request: Request) -> JSONResponse:
        return await handle(request, THERAPY_REQUEST, lambda e, p, track: e.run_therapy(p["case"], p["diagnosis"], p["grounding"], track))

    return app
