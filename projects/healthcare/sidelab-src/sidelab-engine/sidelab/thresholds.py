# Architected and built by codieverse+.
"""Threshold loader for SIDELAB regression tests and metrics.

Reads `data/test_thresholds.json` and exposes typed values grouped by
domain (panel rates, verification rates, latency). Each key can be
overridden via environment variable `SIDELAB_THRESHOLD_<KEY>` (dot → underscore),
useful for ad-hoc tweaks during prompt or model experiments.

Example::

    SIDELAB_THRESHOLD_PANEL_RATES_MAX_DISRUPTION_PANEL_PER_20_SKENARIO=5

The loader is read-only and tolerant: missing keys fall back to None,
malformed JSON yields empty defaults.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from sidelab.thresholds_records import Thresholds

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_DEFAULT_PATH = _DATA_DIR / "test_thresholds.json"

_CACHE: Thresholds | None = None
_LAST_PATH: Path | None = None


def _apply_env_overrides(thresholds: Thresholds) -> Thresholds:
    """Walk every leaf and apply SIDELAB_THRESHOLD_<KEY>=value overrides."""
    out: Thresholds = dict(thresholds)

    def walk(section: dict[str, Any], prefix: str) -> None:
        for k, v in list(section.items()):
            env_key = f"SIDELAB_THRESHOLD_{prefix}{k}".upper().replace(".", "_")
            if isinstance(v, dict):
                section[k] = dict(v)
                walk(section[k], f"{k}_")
                continue
            raw = os.environ.get(env_key)
            if raw is None or raw == "":
                continue
            try:
                if isinstance(v, int) and not isinstance(v, bool):
                    section[k] = int(raw)
                elif isinstance(v, float):
                    section[k] = float(raw)
                else:
                    section[k] = raw
            except ValueError:
                # Keep original on bad override
                continue

    if "panel_rates" in out and isinstance(out["panel_rates"], dict):
        walk(out["panel_rates"], "PANEL_RATES_")
    if "verification_rates" in out and isinstance(out["verification_rates"], dict):
        walk(out["verification_rates"], "VERIFICATION_RATES_")
    if "ttft_latency" in out and isinstance(out["ttft_latency"], dict):
        walk(out["ttft_latency"], "TTFT_LATENCY_")
    return out


def load_thresholds(path: Path | str | None = None) -> Thresholds:
    """Load thresholds from JSON (lazy, sticky cache)."""
    global _CACHE, _LAST_PATH
    target = Path(path) if path is not None else _DEFAULT_PATH
    if _CACHE is not None and _LAST_PATH == target and path is None:
        return _CACHE
    if _CACHE is not None and path is None:
        return _CACHE

    empty: Thresholds = {
        "panel_rates": {},
        "verification_rates": {},
        "ttft_latency": {},
    }
    if not target.exists():
        _CACHE = empty
        _LAST_PATH = target
        return empty
    try:
        raw = json.loads(target.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        _CACHE = empty
        _LAST_PATH = target
        return empty
    if not isinstance(raw, dict):
        _CACHE = empty
        _LAST_PATH = target
        return empty

    out: Thresholds = {
        "panel_rates": dict(raw.get("panel_rates") or {}),
        "verification_rates": dict(raw.get("verification_rates") or {}),
        "ttft_latency": dict(raw.get("ttft_latency") or {}),
    }
    out = _apply_env_overrides(out)
    _CACHE = out
    _LAST_PATH = target
    return out


def reset_cache() -> None:
    global _CACHE, _LAST_PATH
    _CACHE = None
    _LAST_PATH = None


def panel_rates() -> dict[str, Any]:
    return load_thresholds().get("panel_rates") or {}


def verification_rates() -> dict[str, Any]:
    return load_thresholds().get("verification_rates") or {}


def ttft_latency() -> dict[str, Any]:
    return load_thresholds().get("ttft_latency") or {}
