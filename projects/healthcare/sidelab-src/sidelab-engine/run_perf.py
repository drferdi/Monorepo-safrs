# Architected and built by codieverse+.
"""Standalone performance runner untuk SIDELAB.

Script ini tidak memerlukan pytest; cukup jalankan langsung:
    python run_perf.py
    python run_perf.py --backend openai --limit 3
    python run_perf.py --backend local --model medgemma:4b

Hasil disimpan ke tests/performance/results/perf_<backend>_<model>_<timestamp>.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

# Muat .env sebelum import sidelab supaya API key terdeteksi
_dotenv_path = Path(__file__).parent / ".env"
if _dotenv_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path=_dotenv_path, override=False)
    except ImportError:
        for line in _dotenv_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

from sidelab.llm.config import check_backend_readiness, default_model_for_backend
from sidelab.llm.router import build_provider
from sidelab.prompt import _build_system

from tests.performance.scenarios import SKENARIO_PUSKESMAS


def run_perf_test(
    backend: str,
    model: str,
    scenarios: list[tuple[str, str]],
    system: str,
) -> dict:
    provider = build_provider(backend)
    results = []
    t0_overall = time.monotonic()

    print(f"Backend: {backend} / {model}")
    print(f"{'No':<3} {'Skenario':<22} {'TTFT':>6} {'Total':>7} {'Token':>6} {'Tok/s':>6}")
    print("=" * 55)

    for i, (name, query) in enumerate(scenarios, 1):
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": query},
        ]
        chunks = []
        t0 = time.monotonic()
        t_first = None
        error = None
        try:
            for chunk in provider.stream_chat(messages, model=model):
                if t_first is None:
                    t_first = time.monotonic()
                chunks.append(chunk)
        except Exception as exc:
            error = str(exc)

        t_end = time.monotonic()
        full_text = "".join(chunks)
        tokens = len(full_text) // 4
        ttft = (t_first - t0) if t_first else 0.0
        total = t_end - t0
        tps = tokens / total if total > 0 and not error else 0.0

        results.append({
            "scenario": name,
            "query": query,
            "backend": backend,
            "model": model,
            "ttft_seconds": round(ttft, 2),
            "total_seconds": round(total, 2),
            "tokens": tokens,
            "tokens_per_second": round(tps, 2),
            "error": error,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        })

        status = f"{ttft:>5.1f}s {total:>6.1f}s {tokens:>6} {tps:>6.1f}"
        if error:
            status += " [ERROR]"
        print(f"{i:<3} {name:<22} {status}")

    total_elapsed = time.monotonic() - t0_overall

    ok_results = [r for r in results if not r["error"]]
    totals = [r["total_seconds"] for r in ok_results]
    ttfts = [r["ttft_seconds"] for r in ok_results]
    tokens_all = [r["tokens"] for r in ok_results]
    errors = [r for r in results if r["error"]]

    summary = {
        "avg_total_seconds": round(sum(totals) / len(totals), 2) if totals else 0.0,
        "min_total_seconds": round(min(totals), 2) if totals else 0.0,
        "max_total_seconds": round(max(totals), 2) if totals else 0.0,
        "avg_ttft_seconds": round(sum(ttfts) / len(ttfts), 2) if ttfts else 0.0,
        "avg_tokens": round(sum(tokens_all) / len(tokens_all), 2) if tokens_all else 0.0,
        "error_count": len(errors),
        "error_rate": round(len(errors) / len(results), 4) if results else 0.0,
    }

    print("=" * 55)
    print(f"{'Rata-rata':<26} {summary['avg_total_seconds']:>6.1f}s {summary['avg_tokens']:>6.0f}")
    print(f"{'Min / Max':<26} {summary['min_total_seconds']:>5.1f}s / {summary['max_total_seconds']:.1f}s")
    print(f"{'Error':<26} {summary['error_count']}/{len(results)} ({summary['error_rate']:.1%})")
    print(f"{'Wall-clock total':<26} {total_elapsed:.1f}s")

    return {
        "run_id": f"{backend}_{model}_{int(time.time())}",
        "backend": backend,
        "model": model,
        "scenario_count": len(results),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "results": results,
        "summary": summary,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="SIDELAB Performance Runner")
    parser.add_argument("--backend", default=os.getenv("PERF_BACKEND", "deepseek"), help="Backend LLM")
    parser.add_argument("--model", default=os.getenv("PERF_MODEL", ""), help="Override model")
    parser.add_argument("--limit", type=int, default=0, help="Batasi jumlah skenario (0 = semua)")
    parser.add_argument("--output-dir", default="tests/performance/results", help="Direktori output JSON")
    parser.add_argument("--no-save", action="store_true", help="Tidak menyimpan JSON")
    args = parser.parse_args()

    backend = args.backend
    model = args.model.strip() or default_model_for_backend(backend)

    # Check readiness
    is_ready, missing, warning = check_backend_readiness(backend)
    if not is_ready:
        print(f"[ERROR] Backend '{backend}' tidak siap: {warning}")
        sys.exit(1)

    scenarios = SKENARIO_PUSKESMAS[: args.limit] if args.limit > 0 else SKENARIO_PUSKESMAS
    system = _build_system({})

    data = run_perf_test(backend, model, scenarios, system)

    if not args.no_save:
        out_dir = Path(args.output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        path = out_dir / f"perf_{data['run_id']}.json"
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\n[OK] Hasil disimpan: {path}")
        print(f"[INFO] Lihat report: python tests/performance/reporter.py")


if __name__ == "__main__":
    main()
