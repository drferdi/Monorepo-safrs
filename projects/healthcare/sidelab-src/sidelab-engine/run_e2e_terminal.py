# Architected and built by codieverse+.
"""End-to-end terminal test — calls the actual SIDELAB pipeline.

This runs _chat() from sidelab.py with console_override to capture the real
terminal output including red flags, RAG, pharma DDI/KI injection, and stream rendering.

Usage:
    python run_e2e_terminal.py
    python run_e2e_terminal.py --backend openai --limit 3
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

sys.path.insert(0, str(Path(__file__).parent))
from tests.conftest import load_sidelab_core
from tests.performance.scenarios import SKENARIO_WITH_PASIEN


def run_e2e(backend: str, model: str | None, limit: int) -> Path:
    core = load_sidelab_core()

    if model is None:
        from sidelab.llm.config import default_model_for_backend
        model = default_model_for_backend(backend)

    out_lines = []
    out_lines.append("SIDELAB — End-to-End Terminal Test")
    out_lines.append("=" * 60)
    out_lines.append(f"Backend: {backend}")
    out_lines.append(f"Model:   {model}")
    out_lines.append(f"Time:    {time.strftime('%Y-%m-%d %H:%M:%S')}")
    out_lines.append("")

    results = []
    scenarios = (
        SKENARIO_WITH_PASIEN[:limit] if limit > 0 else SKENARIO_WITH_PASIEN
    )

    for i, (name, query, pasien_ctx) in enumerate(scenarios, 1):
        out_lines.append("─" * 60)
        out_lines.append(f"{i}. {name}")
        out_lines.append("─" * 60)
        out_lines.append(f"QUERY: {query}")
        out_lines.append(f"PASIEN: {pasien_ctx}")
        out_lines.append("")

        # Capture all terminal output via console_override
        capture_io = StringIO()
        capture_console = Console(
            file=capture_io,
            color_system=None,
            soft_wrap=True,
            width=120,
        )

        t0 = time.monotonic()
        try:
            response_text = core._chat(
                prompt=query,
                history=[],
                pasien=pasien_ctx,
                model=model,
                backend=backend,
                console_override=capture_console,
            )
        except Exception as exc:
            response_text = f"[ERROR: {exc}]"
        t_end = time.monotonic()
        total = round(t_end - t0, 2)

        captured = capture_io.getvalue()

        out_lines.append("TERMINAL OUTPUT:")
        out_lines.append(captured if captured.strip() else "(no output captured)")
        out_lines.append("")
        out_lines.append(f"RAW RESPONSE ({len(response_text)} chars):")
        out_lines.append(response_text if response_text else "(empty)")
        out_lines.append("")
        out_lines.append(f"TOTAL TIME: {total}s")
        out_lines.append("")

        results.append({
            "scenario": name,
            "total_seconds": total,
            "response_length": len(response_text),
            "error": response_text.startswith("[ERROR:") if response_text else False,
        })

    # Summary
    out_lines.append("=" * 60)
    out_lines.append("SUMMARY")
    out_lines.append("=" * 60)
    ok = [r for r in results if not r["error"]]
    totals = [r["total_seconds"] for r in ok]
    out_lines.append(f"Scenarios: {len(results)}")
    out_lines.append(f"Errors:    {len(results) - len(ok)}")
    if totals:
        out_lines.append(f"Avg time:  {sum(totals)/len(totals):.2f}s")
        out_lines.append(f"Min time:  {min(totals):.2f}s")
        out_lines.append(f"Max time:  {max(totals):.2f}s")
    out_lines.append("")

    out_text = "\n".join(out_lines)
    out_dir = Path("tests/performance/results")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"e2e_terminal_{backend}_{model}_{int(time.time())}.txt"
    out_path.write_text(out_text, encoding="utf-8")
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description="SIDELAB End-to-End Terminal Test")
    parser.add_argument("--backend", default=os.getenv("PERF_BACKEND", "openai"))
    parser.add_argument("--model", default=os.getenv("PERF_MODEL", ""))
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    path = run_e2e(args.backend, args.model or None, args.limit)
    print(f"[OK] Report saved: {path}")


if __name__ == "__main__":
    main()
