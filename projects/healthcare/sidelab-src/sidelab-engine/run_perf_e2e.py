# Architected and built by codieverse+.
"""End-to-end performance test — runs the actual SIDELAB pipeline.

Usage:
    python run_perf_e2e.py
    python run_perf_e2e.py --backend openai
    python run_perf_e2e.py --limit 3

This calls _chat_inner() from sidelab.py directly, capturing:
- Red flag detection
- RAG retrieval (_retrieve_context)
- Pharma DDI/KI injection
- Stream rendering
- Full formatted terminal output
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from io import StringIO
from pathlib import Path

from dotenv import load_dotenv
from rich.console import Console

# Load .env before anything else
load_dotenv(dotenv_path=Path(".env"), override=False)

# Import sidelab core via conftest loader
sys.path.insert(0, str(Path(__file__).parent))
from tests.conftest import load_sidelab_core
from tests.performance.scenarios import SKENARIO_PUSKESMAS


def run_e2e_perf(backend: str, model: str | None, limit: int) -> Path:
    core = load_sidelab_core()

    # Use module-level defaults if not specified
    if model is None:
        from sidelab.llm.config import default_model_for_backend
        model = default_model_for_backend(backend)

    out_lines = []
    out_lines.append("SIDELAB — End-to-End Performance Test")
    out_lines.append("=" * 60)
    out_lines.append(f"Backend: {backend}")
    out_lines.append(f"Model:   {model}")
    out_lines.append(f"Time:    {time.strftime('%Y-%m-%d %H:%M:%S')}")
    out_lines.append("")

    results = []
    scenarios = SKENARIO_PUSKESMAS[:limit] if limit > 0 else SKENARIO_PUSKESMAS

    for i, (name, query) in enumerate(scenarios, 1):
        out_lines.append("─" * 60)
        out_lines.append(f"{i}. {name}")
        out_lines.append("─" * 60)
        out_lines.append(f"QUERY: {query}")
        out_lines.append("")

        # Capture console output
        capture_io = StringIO()
        capture_console = Console(
            file=capture_io,
            color_system=None,
            soft_wrap=True,
            width=120,
        )

        # Monkeypatch the global console in sidelab module
        original_console = core.console
        core.console = capture_console

        # Reset caches per scenario to mimic fresh session
        core._provider_cache.clear()
        core._system_cache["key"] = None
        core._system_cache["val"] = None

        history = []
        pasien = {}
        t0 = time.monotonic()

        try:
            response_text = core._chat_inner(
                prompt=query,
                history=history,
                pasien=pasien,
                model=model,
                backend=backend,
                _tui_mode=False,
            )
        except Exception as exc:
            response_text = f"[ERROR: {exc}]"
        finally:
            core.console = original_console

        t_end = time.monotonic()
        total = round(t_end - t0, 2)

        # Capture output
        captured = capture_io.getvalue()
        out_lines.append("TERMINAL OUTPUT:")
        out_lines.append(captured if captured else "(no console output)")
        out_lines.append("")
        out_lines.append(f"RAW RESPONSE LENGTH: {len(response_text)} chars")
        out_lines.append(f"TOTAL TIME: {total}s")
        out_lines.append("")

        results.append({
            "scenario": name,
            "query": query,
            "total_seconds": total,
            "response_length": len(response_text),
            "error": None if not response_text.startswith("[ERROR:") else response_text,
        })

    # Summary
    out_lines.append("=" * 60)
    out_lines.append("SUMMARY")
    out_lines.append("=" * 60)
    ok = [r for r in results if not r["error"]]
    totals = [r["total_seconds"] for r in ok]
    out_lines.append(f"Scenarios: {len(results)}")
    out_lines.append(f"Errors:    {len(results) - len(ok)}")
    out_lines.append(f"Avg time:  {sum(totals)/len(totals):.2f}s" if totals else "N/A")
    out_lines.append(f"Min time:  {min(totals):.2f}s" if totals else "N/A")
    out_lines.append(f"Max time:  {max(totals):.2f}s" if totals else "N/A")
    out_lines.append("")

    out_text = "\n".join(out_lines)
    out_dir = Path("tests/performance/results")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"e2e_{backend}_{model}_{int(time.time())}.txt"
    out_path.write_text(out_text, encoding="utf-8")
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description="SIDELAB End-to-End Performance Test")
    parser.add_argument("--backend", default=os.getenv("PERF_BACKEND", "openai"))
    parser.add_argument("--model", default=os.getenv("PERF_MODEL", ""))
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    path = run_e2e_perf(args.backend, args.model or None, args.limit)
    print(f"[OK] End-to-end report saved: {path}")


if __name__ == "__main__":
    main()
