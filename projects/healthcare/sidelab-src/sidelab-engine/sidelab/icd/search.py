# Architected and built by codieverse+.
from __future__ import annotations

import re
from typing import Optional

from .database import all_entries, get_by_code, get_children

_CODE_PATTERN = re.compile(r"^[A-Z]\d{2}(\.\d+)?$", re.IGNORECASE)


def is_code_query(query: str) -> bool:
    if not query:
        return False
    return bool(_CODE_PATTERN.match(query.strip()))


def lookup_by_code(code: str) -> Optional[dict]:
    return get_by_code(code)


def lookup_or_children(code: str) -> tuple[Optional[dict], list[dict]]:
    """Exact match first; if none, return children of that prefix.
    Useful when user types a 3-char parent code like 'E11' that has no entry
    of its own but has children E11.0-E11.9."""
    direct = get_by_code(code)
    if direct:
        return direct, []
    kids = get_children(code)
    return None, kids


def search(query: str, limit: int = 15) -> list[dict]:
    if not query:
        return []
    needle = query.strip().lower()
    if not needle:
        return []

    exact_matches: list[dict] = []
    starts: list[dict] = []
    contains: list[dict] = []

    for entry in all_entries():
        name_id = (entry.get("name_id") or "").lower()
        name_en = (entry.get("name_en") or "").lower()
        if not name_id and not name_en:
            continue
        if name_id == needle or name_en == needle:
            exact_matches.append(entry)
        elif name_id.startswith(needle) or name_en.startswith(needle):
            starts.append(entry)
        elif needle in name_id or needle in name_en:
            contains.append(entry)

    ranked = exact_matches + starts + contains
    return ranked[:limit]
