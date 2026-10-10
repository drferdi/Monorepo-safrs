"""Token verification and a per-token rate limit.

Only the development verifier exists. A production verifier (a short-lived service token issued
by the crew portal) is a separate task; until then the service refuses to start in production
(settings.check_startup).
"""

from __future__ import annotations

import hashlib
import hmac
import time
from collections import defaultdict, deque
from typing import Protocol


class TokenVerifier(Protocol):
    def verify(self, token: str | None) -> str | None:
        """Return a stable principal id for a valid token, or None."""


class DevTokenVerifier:
    """Accepts one static token from MIRA_DEV_TOKEN (MIRA_SERVICE_ENV=development only)."""

    def __init__(self, token: str):
        if not token:
            raise ValueError("development token is empty")
        self._token = token.encode()

    def verify(self, token: str | None) -> str | None:
        if token and hmac.compare_digest(token.encode(), self._token):
            return "dev-" + hashlib.sha256(self._token).hexdigest()[:8]
        return None


def bearer_token(authorization: str | None) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip() or None
    return None


class RateLimiter:
    """Sliding one-minute window per principal, in memory (one process)."""

    def __init__(self, per_minute: int, clock=time.monotonic):
        self.per_minute = per_minute
        self._clock = clock
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, principal: str) -> bool:
        now = self._clock()
        hits = self._hits[principal]
        while hits and now - hits[0] >= 60:
            hits.popleft()
        if len(hits) >= self.per_minute:
            return False
        hits.append(now)
        return True
