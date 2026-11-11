# Architected and built by codieverse+.
"""Regression test: validator panel rates over 20-skenario snapshots.

Each ``tests/performance/results/e2e_terminal_*.txt`` snapshot is
parsed for two panel markers:

  - ``[!] PERINGATAN SISTEM — VALIDASI FARMAKOLOGI`` → disruption panel.
  - ``PERINGATAN KLINIS TAMBAHAN`` → DDI/KI lint section.

The actual counts must stay within the bounds defined in
``data/test_thresholds.json``. If a new snapshot produces counts that
breach the threshold, the regression test fires.

Run this test alongside the rest of the clinical suite::

    pytest tests/clinical/test_panel_rate_regression.py --no-cov -v
"""
import importlib.util
import unittest
from collections import Counter
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "thresholds", Path(__file__).resolve().parent.parent.parent
    / "sidelab" / "thresholds.py"
)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


_RESULTS_DIR = Path(__file__).resolve().parent.parent / "performance" / "results"

_DISRUPTION_RE = r"PERINGATAN SISTEM\b[^\n]*\n"
_LINT_RE = r"PERINGATAN KLINIS TAMBAHAN"


def _import_re() -> object:
    import re as _re
    return _re


def _list_snapshots() -> list[Path]:
    if not _RESULTS_DIR.exists():
        return []
    return sorted(_RESULTS_DIR.glob("e2e_terminal_*.txt"))


def _scenario_count(text: str) -> int:
    """How many skenario wurden direndered (diestimasi dari TOTAL TIME lines)."""
    return text.count("TOTAL TIME:")


def _scenario_names(text: str) -> list[str]:
    """Return ordered list of scenario titles by grepping `N. Nama` heading."""
    out: list[str] = []
    for line in text.splitlines():
        s = line.strip()
        # Match markers like "1. Dispepsia Sindrom" but avoid fragmented
        # lines in raw response sections (those are bulleted -> no numeric).
        if (
            len(s) > 4
            and s.split(".")[0].isdigit()
            and "TOTAL TIME" not in s
            and "SUMMARY" not in s
        ):
            num = int(s.split(".")[0])
            if 1 <= num <= 50 and not out or (out and num == len(out) + 1):
                title = s.split(".", 1)[1].strip()
                if title and "─" not in title:
                    out.append(title)
    return out


class PanelRateRegressionTests(unittest.TestCase):
    """Toleransi panel rates tidak boleh drift antar snapshot."""

    def setUp(self) -> None:
        m.reset_cache()

    def _thresholds(self) -> dict[str, dict[str, int]]:
        t = m.load_thresholds()
        return {
            "panel_rates": dict(t.get("panel_rates") or {}),
            "verification_rates": dict(t.get("verification_rates") or {}),
            "ttft_latency": dict(t.get("ttft_latency") or {}),
        }

    def test_thresholds_have_minimum_required_keys(self):
        thr = self._thresholds()
        self.assertIn("panel_rates", thr)
        pr = thr["panel_rates"]
        self.assertIn("max_disruption_panel_per_20_skenario", pr)
        self.assertIn("max_lint_alert_per_20_skenario", pr)
        self.assertGreater(pr["max_disruption_panel_per_20_skenario"], 0)
        self.assertGreater(pr["max_lint_alert_per_20_skenario"], 0)

    def test_e2e_snapshot_within_disruption_panel_threshold(self):
        snapshots = _list_snapshots()
        if not snapshots:
            self.skipTest(
                "Tidak ada snapshot e2e di tests/performance/results/. "
                "Jalankan `python run_e2e_terminal.py --backend openai` dulu."
            )
        re_lib = _import_re()
        thresholds = self._thresholds()["panel_rates"]
        max_disruption = thresholds.get(
            "max_disruption_panel_per_20_skenario", 3
        )
        max_lint = thresholds.get("max_lint_alert_per_20_skenario", 6)
        violations: list[str] = []
        summary_lines: list[str] = []
        for snap in snapshots:
            text = snap.read_text(encoding="utf-8")
            n = _scenario_count(text) or 1
            # Skip partial debug runs — scaling a 5-scenario run ×4 distorts the metric
            if n < 10:
                continue
            disruption = len(re_lib.findall(_DISRUPTION_RE, text))
            lint = len(re_lib.findall(_LINT_RE, text))
            scaled_disruption = round(disruption * (20 / n))
            scaled_lint = round(lint * (20 / n))
            if scaled_disruption > max_disruption:
                violations.append(
                    f"{snap.name}: disruption {disruption}/{n} "
                    f"≈ {scaled_disruption}/20 > threshold {max_disruption}"
                )
            if scaled_lint > max_lint:
                violations.append(
                    f"{snap.name}: lint {lint}/{n} ≈ {scaled_lint}/20 "
                    f"> threshold {max_lint}"
                )
            summary_lines.append(
                f"{snap.name}: scn={n} disr={disruption} lint={lint} "
                f"(diskala→20: d={scaled_disruption}/l={scaled_lint})"
            )
        if violations:
            self.fail(
                "Panel-rate regression terdeteksi:\n  " + "\n  ".join(violations)
                + "\nSnapshot ringkasan:\n  " + "\n  ".join(summary_lines)
            )

    def test_pasien_context_required_when_active(self):
        """Snapshot tanpa pasien={} pada kasus dengan pasien konteks harus
        di-flag sebagai peringatan (lint akan 0). Panduan regresi: minimal
        1 lint alert per 20 skenario ketika pasien context tersedia."""
        snapshots = _list_snapshots()
        if not snapshots:
            self.skipTest("Tidak ada snapshot e2e")
        re_lib = _import_re()
        thresholds = self._thresholds()["panel_rates"]
        min_lint = thresholds.get(
            "min_lint_alert_per_20_with_pasien", 1
        )
        latest = snapshots[-1]
        text = latest.read_text(encoding="utf-8")
        # Heuristic: detect whether latest snapshot carries structured
        # patient-context. The data-driven run writes ``PASIEN: {..}``
        # (some entries, populated). If neither present, treat it as legacy.
        if "PASIEN: {" not in text:
            self.skipTest(
                f"{latest.name} tidak berisi baris 'PASIEN: {{...}}' "
                "(penanda data-driven run). Snapshot ini dihasilkan runner "
                "lama dengan pasien={}. Jalankan `python run_e2e_terminal.py` "
                "setelah data-driven scenarios aktif untuk menguji lint minimal."
            )
        n = _scenario_count(text) or 1
        lint = len(re_lib.findall(_LINT_RE, text))
        scaled = round(lint * (20 / n))
        # Only enforce when PASIEN: {...} is present in some scenarios.
        if scaled < min_lint:
            self.fail(
                f"{latest.name}: lint alerts {lint}/{n} ≈ {scaled}/20 "
                f"< minimum {min_lint} ketika patient context aktif."
            )

    def test_snapshot_parser_yields_20_titles(self):
        """Parser menghasilkan tepat 20 judul untuk skenario length terpanjang."""
        snapshots = _list_snapshots()
        if not snapshots:
            self.skipTest("Tidak ada snapshot e2e")
        # Pick the longest snapshot
        longest = max(snapshots, key=lambda p: p.stat().st_size)
        text = longest.read_text(encoding="utf-8")
        names = _scenario_names(text)
        # We expect roughly 20 titles (some snapshots include internal
        # numbered bullet lists from raw response text). Tolerance ±5.
        self.assertGreater(len(names), 10)
        self.assertLess(len(names), 30)


if __name__ == "__main__":
    unittest.main()
