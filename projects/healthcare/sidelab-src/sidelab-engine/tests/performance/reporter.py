# Architected and built by codieverse+.
"""Reporter untuk hasil performance test SIDELAB.

Usage:
    python tests/performance/reporter.py
    python tests/performance/reporter.py --latest
    python tests/performance/reporter.py --compare perf_a.json perf_b.json
    python tests/performance/reporter.py --csv

Menghasilkan tabel perbandingan latency, TTFT, token/sec, dan error rate
antara run performance yang tersimpan di tests/performance/results/.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any


RESULT_DIR = Path(__file__).parent / "results"


def load_result(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def discover_results() -> list[Path]:
    if not RESULT_DIR.exists():
        return []
    files = sorted(RESULT_DIR.glob("perf_*.json"), key=lambda p: p.stat().st_mtime)
    return files


def format_table(rows: list[dict[str, Any]], headers: list[str]) -> str:
    """Simple text table formatter."""
    if not rows:
        return "(no data)"
    col_widths = [len(h) for h in headers]
    for row in rows:
        for i, h in enumerate(headers):
            val = str(row.get(h, ""))
            col_widths[i] = max(col_widths[i], len(val))

    lines = []
    sep = "+" + "+".join("-" * (w + 2) for w in col_widths) + "+"
    lines.append(sep)
    header_line = "| " + " | ".join(h.ljust(col_widths[i]) for i, h in enumerate(headers)) + " |"
    lines.append(header_line)
    lines.append(sep)
    for row in rows:
        line = "| " + " | ".join(str(row.get(h, "")).ljust(col_widths[i]) for i, h in enumerate(headers)) + " |"
        lines.append(line)
    lines.append(sep)
    return "\n".join(lines)


def print_latest_report() -> None:
    files = discover_results()
    if not files:
        print("Belum ada hasil performance test. Jalankan pytest tests/performance/ terlebih dahulu.")
        sys.exit(1)

    latest = files[-1]
    data = load_result(latest)
    summary = data.get("summary", {})
    results = data.get("results", [])

    print(f"\n=== Performance Report: {data['run_id']} ===")
    print(f"Backend : {data['backend']}")
    print(f"Model   : {data['model']}")
    print(f"File    : {latest.name}")
    print(f"Waktu   : {data['timestamp']}")
    print(f"Skenario: {data['scenario_count']}")
    print()

    print("--- Summary ---")
    print(f"  Avg Total Latency : {summary.get('avg_total_seconds', 0):.2f}s")
    print(f"  Min Total Latency : {summary.get('min_total_seconds', 0):.2f}s")
    print(f"  Max Total Latency : {summary.get('max_total_seconds', 0):.2f}s")
    print(f"  Avg TTFT          : {summary.get('avg_ttft_seconds', 0):.2f}s")
    print(f"  Avg Tokens        : {summary.get('avg_tokens', 0):.0f}")
    print(f"  Error Count       : {summary.get('error_count', 0)}")
    print(f"  Error Rate        : {summary.get('error_rate', 0):.2%}")
    print()

    print("--- Per-Scenario Breakdown ---")
    rows = []
    for r in results:
        rows.append({
            "Scenario": r["scenario"],
            "TTFT(s)": r["ttft_seconds"],
            "Total(s)": r["total_seconds"],
            "Tokens": r["tokens"],
            "Tok/s": r["tokens_per_second"],
            "Error": r["error"] or "-",
        })
    print(format_table(rows, ["Scenario", "TTFT(s)", "Total(s)", "Tokens", "Tok/s", "Error"]))

    # List slowest scenarios
    print("\n--- Top 3 Slowest ---")
    sorted_by_total = sorted(results, key=lambda x: x["total_seconds"], reverse=True)
    for r in sorted_by_total[:3]:
        print(f"  {r['scenario']:<22} {r['total_seconds']:>6.2f}s  ({r['ttft_seconds']:.2f}s TTFT)")



def print_comparison(path_a: Path, path_b: Path) -> None:
    da = load_result(path_a)
    db = load_result(path_b)

    sa = da.get("summary", {})
    sb = db.get("summary", {})

    print(f"\n=== Comparison ===")
    print(f"A: {da['run_id']} ({da['backend']} / {da['model']})")
    print(f"B: {db['run_id']} ({db['backend']} / {db['model']})")
    print()

    headers = ["Metric", "A", "B", "Delta", "Delta%"]
    metrics = [
        ("Avg Total (s)", "avg_total_seconds"),
        ("Min Total (s)", "min_total_seconds"),
        ("Max Total (s)", "max_total_seconds"),
        ("Avg TTFT (s)", "avg_ttft_seconds"),
        ("Avg Tokens", "avg_tokens"),
        ("Error Rate", "error_rate"),
    ]

    rows = []
    for label, key in metrics:
        a = sa.get(key, 0)
        b = sb.get(key, 0)
        delta = b - a
        delta_pct = ((b - a) / a * 100) if a else 0
        rows.append({
            "Metric": label,
            "A": f"{a:.2f}",
            "B": f"{b:.2f}",
            "Delta": f"{delta:+.2f}",
            "Delta%": f"{delta_pct:+.1f}%",
        })
    print(format_table(rows, headers))

    # Per-scenario comparison
    print("\n--- Per-Scenario Delta ---")
    ra = {r["scenario"]: r for r in da.get("results", [])}
    rb = {r["scenario"]: r for r in db.get("results", [])}
    common = sorted(set(ra) & set(rb))
    rows = []
    for name in common:
        a = ra[name]
        b = rb[name]
        d_total = b["total_seconds"] - a["total_seconds"]
        d_ttft = b["ttft_seconds"] - a["ttft_seconds"]
        d_tps = b["tokens_per_second"] - a["tokens_per_second"]
        rows.append({
            "Scenario": name,
            "A_total": a["total_seconds"],
            "B_total": b["total_seconds"],
            "Δ_total": f"{d_total:+.2f}",
            "Δ_TTFT": f"{d_ttft:+.2f}",
            "Δ_tok/s": f"{d_tps:+.2f}",
        })
    print(format_table(rows, ["Scenario", "A_total", "B_total", "Δ_total", "Δ_TTFT", "Δ_tok/s"]))


def export_csv(out_path: Path) -> None:
    files = discover_results()
    if not files:
        print("Belum ada hasil performance test.")
        sys.exit(1)
    rows = []
    for f in files:
        d = load_result(f)
        for r in d.get("results", []):
            rows.append({
                "run_id": d["run_id"],
                "backend": d["backend"],
                "model": d["model"],
                "timestamp": d["timestamp"],
                "scenario": r["scenario"],
                "ttft_seconds": r["ttft_seconds"],
                "total_seconds": r["total_seconds"],
                "tokens": r["tokens"],
                "tokens_per_second": r["tokens_per_second"],
                "error": r["error"] or "",
            })
    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"CSV exported: {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="SIDELAB Performance Reporter")
    parser.add_argument("--latest", action="store_true", help="Tampilkan report terbaru")
    parser.add_argument("--compare", nargs=2, metavar=("FILE_A", "FILE_B"), help="Bandingkan 2 run")
    parser.add_argument("--csv", action="store_true", help="Export semua hasil ke CSV")
    parser.add_argument("--output", default="performance_history.csv", help="Path CSV output")
    args = parser.parse_args()

    if args.compare:
        a = Path(args.compare[0])
        b = Path(args.compare[1])
        if not a.exists():
            a = RESULT_DIR / a
        if not b.exists():
            b = RESULT_DIR / b
        print_comparison(a, b)
    elif args.csv:
        export_csv(Path(args.output))
    else:
        print_latest_report()


if __name__ == "__main__":
    main()
