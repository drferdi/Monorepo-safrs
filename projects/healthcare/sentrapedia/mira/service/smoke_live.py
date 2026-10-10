"""One live step on the synthetic example request, with real model calls.

Needs the provider's key (OPENAI_API_KEY or OPENROUTER_API_KEY, from the environment or src/.env)
and the project owner's approval. With the openrouter provider (MIRA_LLM_PROVIDER or --provider), the OpenRouter preflight (public
model and zero-data-retention lists, no completion) runs first and stops the test on any problem.
One step makes at most two calls; --max-usd caps the step and the day. The step deadline is raised (default 120 s) so both
calls are measured; the output says whether the step would have met the live 12 s deadline.

    python -m service.smoke_live --max-usd 1                          (from assist/)
    python -m service.smoke_live --max-usd 1 --provider openrouter
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import replace

LIVE_DEADLINE_S = 12.0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--max-usd", type=float, required=True, help="cost cap for the step and the day")
    parser.add_argument("--deadline-s", type=float, default=120.0, help="step deadline for this measurement")
    parser.add_argument("--provider", choices=("openai", "openrouter"), help="default: MIRA_LLM_PROVIDER, else openai")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    from fastapi.testclient import TestClient

    from common.data_policy import SYNTHETIC_HEADER, SYNTHETIC_VALUE
    from common.providers import preflight_openrouter

    from .app import create_app
    from .contract import CONTRACT_DIR, RESPONSE, errors
    from .settings import load_settings

    base = load_settings({**os.environ, **({"MIRA_LLM_PROVIDER": args.provider} if args.provider else {})})
    if base.llm_provider == "openrouter":
        problems = preflight_openrouter(
            {base.plan_model: {"structured_outputs"}, base.assess_model: {"structured_outputs", "response_format", "temperature"}}
        )
        print(f"preflight (OpenRouter, no completion): {'OK' if not problems else 'FAILED'}")
        for problem in problems:
            print(f"  {problem}")
        if problems:
            sys.exit(2)
    settings = replace(
        base,
        dev_token="smoke-live",
        step_deadline_s=args.deadline_s,
        max_usd_per_step=args.max_usd,
        daily_budget_usd=args.max_usd,
    )
    request = json.loads((CONTRACT_DIR / "examples" / "mira-step-request.example.json").read_text(encoding="utf-8"))
    client = TestClient(create_app(settings))  # real OpenAI client; refuses to start without a key
    headers = {"Authorization": "Bearer smoke-live", SYNTHETIC_HEADER: SYNTHETIC_VALUE}  # the example is synthetic
    body = client.post("/v1/diagnosis/step", json=request, headers=headers).json()

    audit_files = sorted(settings.audit_dir.glob("audit-*.jsonl"))
    records = [json.loads(line) for line in audit_files[-1].read_text(encoding="utf-8").splitlines()] if audit_files else []
    record = next((r for r in reversed(records) if r.get("traceId") == request["traceId"]), {})
    calls = record.get("calls", [])

    print(f"provider: {settings.llm_provider}  data policy: {settings.data_policy}  version: {body['meta']['version']}")
    print(f"status: {body['status']}  error: {body.get('error')}")
    for call in calls:
        print(
            f"  {call['role']:<10} {call['model_served']}: {call['latency_s']} s, in={call['prompt_tokens']} "
            f"out={call['completion_tokens']} (reasoning {call['reasoning_tokens']}), US${call['cost_usd']:.4f} "
            f"({call['cost_source']}; served by {call['provider_served'] or 'not reported'})"
        )
    model_seconds = sum(call["latency_s"] for call in calls)
    within = body["status"] == "ok" and model_seconds <= LIVE_DEADLINE_S  # a failed step never met it
    print(f"step latency: {record.get('latencyMs')} ms; model time {model_seconds:.1f} s; "
          f"within the live {LIVE_DEADLINE_S:g} s deadline: {within}")
    print(f"cost: US${body['meta']['costUsd']}")
    for name in ("likely", "alternatives", "cannotMiss"):
        print(f"  {name}: {[(d['icd10'], d['label'], d['confidenceTier']) for d in body['differential'][name]]}")
    print(f"  disposition: {body['disposition']}")
    print(f"  unfilled: {[(u['field'], u['reason']) for u in body['unfilled']]}")
    print(f"contract errors: {errors(RESPONSE, body)}")


if __name__ == "__main__":
    main()
