# Architected and built by codieverse+.
"""Config loader for `sidelab.pharma_validator`.

Reads `data/pharma_validator_config.json` and exposes typed knobs
that override the defaults compiled into `pharma_records.py`. This
allows clinical reviewers / product owners to retune the validator
without a code change. Each key can be overridden via environment
variable ``SIDELAB_VALIDATOR_<KEY>`` (uppercased, dots/underscores).
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from sidelab.validator_config_records import ValidatorConfig

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_DEFAULT_PATH = _DATA_DIR / "pharma_validator_config.json"

_CACHE: ValidatorConfig | None = None
_LAST_PATH: Path | None = None


def _apply_env_overrides(cfg: ValidatorConfig) -> ValidatorConfig:
    out: ValidatorConfig = dict(cfg)
    if isinstance(out.get("kausal_primer_kelas"), list):
        out["kausal_primer_kelas"] = list(out["kausal_primer_kelas"])
    if isinstance(out.get("kausal_primer_atc"), list):
        out["kausal_primer_atc"] = list(out["kausal_primer_atc"])

    def _coerce(value: str, current: object) -> object:
        if isinstance(current, bool):
            return value.lower() in ("1", "true", "yes", "on")
        if isinstance(current, int) and not isinstance(current, bool):
            try:
                return int(value)
            except ValueError:
                return current
        if isinstance(current, float):
            try:
                return float(value)
            except ValueError:
                return current
        if isinstance(current, list):
            return [x.strip() for x in value.split("|") if x.strip()]
        return value

    for k, current in list(out.items()):
        env_key = f"SIDELAB_VALIDATOR_{k}".upper().replace(".", "_")
        raw = os.environ.get(env_key)
        if raw is None or raw == "":
            continue
        out[k] = _coerce(raw, current)
    return out


def load_validator_config(
    path: Path | str | None = None,
) -> ValidatorConfig:
    """Load validator config from JSON (lazy, sticky cache)."""
    global _CACHE, _LAST_PATH
    target = Path(path) if path is not None else _DEFAULT_PATH
    if _CACHE is not None and path is None:
        return _CACHE
    if _CACHE is not None and _LAST_PATH == target and path is None:
        return _CACHE

    default: ValidatorConfig = {
        "min_verified_therapies": 3,
        "max_therapies_before_overpolypharmacy": 5,
        "kausal_primer_kelas": [],
        "kausal_primer_atc": [],
        "justifikasi_section_keyword": "JUSTIFIKASI KLINIS",
        "accept_if_two_kausal_plus_justification": False,
        "panel_emitted_when_justifikasi_accepted": "justifikasi_short_floor",
    }
    if not target.exists():
        _CACHE = default
        _LAST_PATH = target
        return default
    try:
        raw = json.loads(target.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        _CACHE = default
        _LAST_PATH = target
        return default
    if not isinstance(raw, dict):
        _CACHE = default
        _LAST_PATH = target
        return default

    out: ValidatorConfig = {
        "min_verified_therapies": int(raw.get("min_verified_therapies", 3) or 3),
        "max_therapies_before_overpolypharmacy": int(
            raw.get("max_therapies_before_overpolypharmacy", 5) or 5
        ),
        "kausal_primer_kelas": list(raw.get("kausal_primer_kelas") or []),
        "kausal_primer_atc": list(raw.get("kausal_primer_atc") or []),
        "justifikasi_section_keyword": str(
            raw.get("justifikasi_section_keyword", "JUSTIFIKASI KLINIS")
            or "JUSTIFIKASI KLINIS"
        ),
        "accept_if_two_kausal_plus_justification": bool(
            raw.get("accept_if_two_kausal_plus_justification", False)
        ),
        "panel_emitted_when_justifikasi_accepted": str(
            raw.get(
                "panel_emitted_when_justifikasi_accepted",
                "justifikasi_short_floor",
            )
            or "justifikasi_short_floor"
        ),
    }
    out = _apply_env_overrides(out)
    _CACHE = out
    _LAST_PATH = target
    return out


def reset_cache() -> None:
    global _CACHE, _LAST_PATH
    _CACHE = None
    _LAST_PATH = None
