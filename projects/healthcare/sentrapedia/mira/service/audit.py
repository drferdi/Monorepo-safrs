"""Audit log and daily budget. One JSONL line per step (keyed by traceId), one file per UTC day.

A request is written only after it passed the PII re-check; nothing here prints to stdout.
"""

from __future__ import annotations

import json
import threading
from datetime import UTC, datetime
from pathlib import Path


def _today() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%d")


class AuditLog:
    def __init__(self, directory: Path):
        self.directory = directory
        self._lock = threading.Lock()

    def path_for(self, day: str) -> Path:
        return self.directory / f"audit-{day}.jsonl"

    def write(self, record: dict) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        line = json.dumps({"loggedAt": datetime.now(UTC).isoformat(), **record}, ensure_ascii=False)
        with self._lock, self.path_for(_today()).open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")

    def spent_today(self) -> float:
        path = self.path_for(_today())
        if not path.exists():
            return 0.0
        with path.open(encoding="utf-8") as handle:
            return sum(json.loads(line).get("costUsd") or 0.0 for line in handle if line.strip())


class DailyBudget:
    """US$ spent today; starts from today's audit file so a restart does not reset it. A running step holds its cap
    (reserve) until it settles, so steps started together cannot pass the limit between them (tech-debt row 40)."""

    def __init__(self, limit_usd: float, audit: AuditLog):
        self.limit_usd = limit_usd
        self._day = _today()
        self._spent = audit.spent_today()
        self._held = 0.0  # caps of running steps; not reset at midnight, since those steps are still running
        self._lock = threading.Lock()

    def _roll(self) -> None:
        if _today() != self._day:
            self._day, self._spent = _today(), 0.0

    def exhausted(self) -> bool:
        with self._lock:
            self._roll()
            return self._spent >= self.limit_usd

    def add(self, usd: float) -> None:
        with self._lock:
            self._roll()
            self._spent += usd

    def reserve(self, usd: float) -> bool:
        """Holds usd for a step; refused when today's spend plus the holds of running steps would pass the limit."""
        with self._lock:
            self._roll()
            if self._spent + self._held + usd > self.limit_usd:
                return False
            self._held += usd
            return True

    def settle(self, held_usd: float, spent_usd: float) -> None:
        """Releases a step's hold and charges what the step actually spent."""
        with self._lock:
            self._roll()
            self._held = max(self._held - held_usd, 0.0)
            self._spent += spent_usd
