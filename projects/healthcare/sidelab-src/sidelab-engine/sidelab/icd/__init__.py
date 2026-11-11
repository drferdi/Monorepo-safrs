# Architected and built by codieverse+.
"""ICD-10 Indonesia dictionary lookup for SIDELAB.

Public API:
    handle_icd_command(user_input, console)  -> None  (REPL handler — recommended)
    lookup_by_code(code)                     -> dict | None
    lookup_or_children(code)                 -> tuple[dict|None, list[dict]]
    search(query, limit=15)                  -> list[dict]
    is_code_query(query)                     -> bool
    metadata()                               -> dict

Integrasi minimal ke medgemma_chat.py — lihat sidelab_icd/INTEGRATION.txt.
"""

from __future__ import annotations

from .database import metadata
from .repl import handle_icd_command
from .search import (
    is_code_query,
    lookup_by_code,
    lookup_or_children,
    search,
)

__all__ = [
    "handle_icd_command",
    "lookup_by_code",
    "lookup_or_children",
    "search",
    "is_code_query",
    "metadata",
]
