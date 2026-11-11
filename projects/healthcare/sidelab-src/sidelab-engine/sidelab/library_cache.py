# Architected and built by codieverse+.
"""Small cache boundary for resolving disease library entries."""
from __future__ import annotations

from collections.abc import Callable
from typing import Any


LibraryEntry = dict[str, Any]
ResolvedLibraryEntry = dict[str, Any]
LibraryResolver = Callable[[LibraryEntry], ResolvedLibraryEntry]


def library_cache_key(entry: LibraryEntry) -> str:
    """Return the legacy cache key shape used by the monolith."""
    return (
        (entry.get("normalized_name") or entry.get("source_name", ""))
        + "|"
        + entry.get("primary_icd10", "")
        + "|"
        + entry.get("source_icd10", "")
    )


class LibraryResolverCache:
    def __init__(self, resolver: LibraryResolver) -> None:
        self._resolver = resolver
        self.cache: dict[str, ResolvedLibraryEntry] = {}

    def clear(self) -> None:
        self.cache.clear()

    def resolve(self, entry: LibraryEntry) -> ResolvedLibraryEntry:
        key = library_cache_key(entry)
        if key in self.cache:
            return self.cache[key]
        result = self._resolver(entry)
        self.cache[key] = result
        return result
