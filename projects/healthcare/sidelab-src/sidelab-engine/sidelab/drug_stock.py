# Architected and built by codieverse+.
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_drug_mapping(path: Path | str | None = None) -> list[dict[str, Any]]:
    data_path = Path(path) if path is not None else _DATA_DIR / "drug_mapping.json"
    try:
        with data_path.open(encoding="utf-8") as f:
            return json.load(f).get("mappings", [])
    except Exception:
        return []


def build_drug_stock_match(
    mappings: list[dict[str, Any]] | None = None,
) -> dict[str, list[str]]:
    source = mappings if mappings is not None else load_drug_mapping()
    result: dict[str, list[str]] = {}
    for mapping in source:
        patterns = [
            pattern.lower().strip()
            for pattern in mapping.get("stok_match", [])
            if pattern
        ]
        if not patterns:
            continue
        for name in [mapping.get("generik", "")] + mapping.get("alias", []):
            key = name.lower().strip()
            if key:
                result[key] = patterns
    return result


DRUG_STOCK_MATCH = build_drug_stock_match()
