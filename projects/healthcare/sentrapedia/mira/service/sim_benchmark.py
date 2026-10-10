"""Simulation-mode reference for Gate 1 (CLI only, never served over HTTP).

Runs the published MIRA encounter (assist/run_one_case.py: simulated patient, FHIR lookups) on
every case JSON in a folder and writes one contract-valid response per case. Only
`differential.likely` is filled; everything else is listed in `unfilled`. It also writes
`summary.jsonl` with status, latency, calls and cost per case, since Gate 1 records latency per case.

Each encounter needs roughly 35-50 model calls. Get the project owner's approval before any run.

    python -m service.sim_benchmark --cases DIR --out DIR --max-usd 8 --max-calls 80   (from assist/)

`--provider openrouter` runs the same encounter through OpenRouter (see run_one_case.py); the
result is a different experimental condition and is marked so in meta.version.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime
from functools import lru_cache
from pathlib import Path

from common.data_policy import DATA_POLICIES, DEVELOPMENT_DEFAULT

from .contract import CONTRACT_VERSION, RESPONSE, UNFILLABLE_FIELDS, errors, unavailable_response
from .postchecks import SERVICE_DIR

UPSTREAM_COMMIT = "73666b1"


@lru_cache(maxsize=1)
def icd_names() -> dict[str, str]:
    """Lower-cased English name -> code (first code wins for duplicate names)."""
    names: dict[str, str] = {}
    for entry in json.loads((SERVICE_DIR / "data" / "icd10.json").read_text(encoding="utf-8"))["icd10"]:
        names.setdefault(entry["nama_en"].strip().lower(), entry["kode"])
    return names


def simulation_response(summary: dict, cost_usd: float, version: str, model: str) -> dict:
    diagnosis = (summary.get("final_diagnosis") or "").strip()
    if summary.get("status") != "completed" or not diagnosis:
        return unavailable_response("SIMULATION_FAILED", str(summary.get("status")), version, model, cost_usd)
    code = icd_names().get(diagnosis.lower())
    unfilled = [
        {"field": field, "reason": "Simulation mode reports only the final diagnosis."}
        for field in UNFILLABLE_FIELDS
        if field != "differential.likely"
    ]
    likely = []
    if code:
        likely.append({"icd10": code, "label": diagnosis, "confidenceTier": "unknown"})
    else:
        unfilled.insert(0, {
            "field": "differential.likely",
            "reason": f"Final diagnosis could not be mapped to an ICD-10 code by exact name: {diagnosis}",
        })
    return {
        "contractVersion": CONTRACT_VERSION,
        "status": "ok",
        "differential": {"likely": likely, "alternatives": [], "cannotMiss": []},
        "evidence": [],
        "missingInformation": [],
        "nextBestActions": [],
        "disposition": None,
        "unfilled": unfilled,
        "meta": {"version": version, "model": model, "costUsd": cost_usd},
    }


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--cases", type=Path, required=True, help="folder of case JSON files")
    parser.add_argument("--out", type=Path, required=True, help="folder for the responses")
    parser.add_argument("--max-usd", type=float, required=True, help="total cost cap for the whole run")
    parser.add_argument("--max-calls", type=int, required=True, help="total model-call cap for the whole run")
    parser.add_argument("--provider", choices=("openai", "openrouter"), default="openai")
    parser.add_argument(
        "--data-policy",
        choices=DATA_POLICIES,
        default=DEVELOPMENT_DEFAULT,
        help="which case data may be sent to the provider (project owner's decision)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    import run_one_case as roc  # sets MIRA_DIAGNOSIS_DATASETS_DIR before MIRA imports
    from common.guard import ApiGuard
    from config import MEDICAL_ASSISTANT_MODEL, REASONING_MODEL
    from common.providers import model_id
    from mira_adapter import write_mira_dataset

    case_paths = sorted(args.cases.resolve().glob("*.json"))
    cases = [json.loads(path.read_text(encoding="utf-8")) for path in case_paths]
    roc.check_data_policy(args.data_policy, args.provider, cases)  # before any model call
    roc.prepare_provider(args.provider)
    physician, plan = model_id(args.provider, MEDICAL_ASSISTANT_MODEL), model_id(args.provider, REASONING_MODEL)
    version = (
        f"mira-sim/upstream-{UPSTREAM_COMMIT}+provider={args.provider}+data={args.data_policy}"
        f"+physician={physician}+plan={plan}"
        f"+contract={CONTRACT_VERSION}" + ("" if args.provider == "openai" else "+experimental")
    )
    model = f"{physician}+{plan}"
    guard = ApiGuard(max_calls=args.max_calls, max_usd=args.max_usd, provider=args.provider)
    guard.reasoning_model = REASONING_MODEL
    guard.install()
    if not roc.preflight(guard):
        sys.exit(2)

    out_dir = args.out.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    for case_path, case in zip(case_paths, cases):
        dataset_name = write_mira_dataset(case_path, roc.DATASETS_DIR)
        run_dir = roc.OUTPUTS_DIR / f"{datetime.now():%Y%m%d-%H%M%S}_{case['case_id']}_sim"
        run_dir.mkdir(parents=True, exist_ok=True)
        cost_before, calls_before, started = guard.cost_usd, len(guard.calls), time.time()
        os.chdir(run_dir)  # MIRA's HTML collector writes relative to the working directory
        roc.full_run(run_dir, dataset_name, guard, case)
        summary = json.loads((run_dir / "summary.json").read_text(encoding="utf-8"))
        cost = round(guard.cost_usd - cost_before, 6)
        response = simulation_response(summary, cost, version, model)
        problems = errors(RESPONSE, response)
        if problems:
            sys.exit(f"{case['case_id']}: response does not match the contract: {problems}")
        (out_dir / f"{case['case_id']}.mira-sim.json").write_text(json.dumps(response, indent=2) + "\n", encoding="utf-8")
        with (out_dir / "summary.jsonl").open("a", encoding="utf-8") as handle:
            handle.write(json.dumps({
                "caseId": case["case_id"],
                "status": summary.get("status"),
                "latencyS": round(time.time() - started, 1),
                "calls": len(guard.calls) - calls_before,
                "costUsd": cost,
            }) + "\n")


if __name__ == "__main__":
    main()
