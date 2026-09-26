# Architected and built by codieverse+.
from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Optional

_DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "icd10_indonesia.json"

_codes_by_key: Optional[dict[str, dict]] = None
_all_entries: Optional[list[dict]] = None
_metadata: Optional[dict] = None
_load_lock = threading.Lock()


def _load() -> None:
    global _codes_by_key, _all_entries, _metadata
    if _codes_by_key is not None:
        return
    with _load_lock:
        if _codes_by_key is not None:  # double-check setelah acquire lock
            return
        if not _DATA_FILE.exists():
            _codes_by_key = {}
            _all_entries = []
            _metadata = {"total_codes": 0, "missing_file": True}
            return
        with _DATA_FILE.open(encoding="utf-8") as fh:
            payload = json.load(fh)
        entries = payload.get("codes", [])
        _all_entries = entries
        codes_by_key: dict[str, dict] = {}
        invalid_entries = 0
        for entry in entries:
            if not isinstance(entry, dict):
                invalid_entries += 1
                continue
            code = entry.get("code")
            if not isinstance(code, str) or not code.strip():
                invalid_entries += 1
                continue
            codes_by_key[code.strip().upper()] = entry
        _codes_by_key = codes_by_key
        base_metadata = payload.get("_metadata", {})
        _metadata = {
            **base_metadata,
            "total_codes": len(codes_by_key),
            "invalid_entries": invalid_entries,
        }


def all_entries() -> list[dict]:
    _load()
    return _all_entries or []


def get_by_code(code: str) -> Optional[dict]:
    _load()
    if not code or not _codes_by_key:
        return None
    return _codes_by_key.get(code.strip().upper())


def get_children(parent_code: str) -> list[dict]:
    _load()
    if not parent_code or not _all_entries:
        return []
    parent = parent_code.strip().upper()
    return [e for e in _all_entries if e.get("parent_code") == parent]


def metadata() -> dict:
    _load()
    return _metadata or {}
