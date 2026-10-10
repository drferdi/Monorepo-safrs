"""Audit log and daily budget. One JSONL line per step (keyed by traceId), one file per UTC day.

A request is written only after it passed the PII re-check; nothing here prints to stdout.
"""

from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


class AuditLog:
    def __init__(self, directory: Path):
        self.directory = directory
        self._lock = threading.Lock()

    def path_for(self, day: str) -> Path:
        return self.directory / f"audit-{day}.jsonl"

    def write(self, record: dict) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        line = json.dumps({"loggedAt": datetime.now(timezone.utc).isoformat(), **record}, ensure_ascii=False)
        with self._lock, self.path_for(_today()).open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")

    def spent_today(self) -> float:
        path = self.path_for(_today())
        if not path.exists():
            return 0.0
        with path.open(encoding="utf-8") as handle:
            return sum(json.loads(line).get("costUsd") or 0.0 for line in handle if line.strip())


class DailyBudget:
    """US$ spent today; starts from today's audit file so a restart does not reset it."""

    def __init__(self, limit_usd: float, audit: AuditLog):
        self.limit_usd = limit_usd
        self._day = _today()
        self._spent = audit.spent_today()
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
