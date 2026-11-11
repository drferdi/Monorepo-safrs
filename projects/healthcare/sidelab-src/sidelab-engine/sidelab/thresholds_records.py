# Architected and built by codieverse+.
"""Typed records for `sidelab/thresholds.py`.

Total=False lets each section be missing when the JSON is sparse,
which the loader handles by returning an empty dict for that section.
"""
from __future__ import annotations

from typing import TypedDict


class PanelRates(TypedDict, total=False):
    max_disruption_panel_per_20_skenario: int
    max_lint_alert_per_20_skenario: int
    min_lint_alert_per_20_with_pasien: int
    max_per_skenario_lint_alerts: int


class VerificationRates(TypedDict, total=False):
    min_lintas_skenario_verified_rate: float
    min_fornas_verified_rate: float


class TTFTLatency(TypedDict, total=False):
    max_p95_seconds: float
    max_avg_seconds: float
    max_minute_factor: float


class Thresholds(TypedDict, total=False):
    panel_rates: PanelRates
    verification_rates: VerificationRates
    ttft_latency: TTFTLatency
