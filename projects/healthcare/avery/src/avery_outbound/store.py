"""Penyimpanan berbasis berkas untuk permintaan pengiriman keluar yang menunggu persetujuan.

Setiap permintaan hidup sebagai satu berkas JSON di `pending/<id>.json`
(direktori itu menampung SEMUA status, bukan hanya pending -- nama historis).
Semua perubahan status dicatat ke `ledger.jsonl` (append-only) tanpa pernah
memuat isi draf, hanya metadata (id, event, waktu).

Asumsi single-writer: satu operator manusia menjalankan CLI berurutan.
Transisi status adalah baca-ubah-tulis tanpa lock; bila kelak ada lebih
dari satu penulis (mis. proses otomatis), tambahkan lock per-berkas dulu.
"""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable, Optional

from .models import (
    APPROVED,
    CANCELLED,
    EXPIRED,
    PENDING,
    SENT,
    LedgerEntry,
    OutboundRequest,
)

DEFAULT_TTL_MINUTES = 15


class StoreError(Exception):
    """Operasi pada store gagal karena status/kadaluarsa tidak sesuai."""


def default_root() -> Path:
    """Lokasi default store: profil Hermes, TIDAK PERNAH di dalam repositori.

    `HERMES_HOME` di lapangan kadang menunjuk akar `.hermes` dan kadang sudah
    langsung direktori profil (catatan yang sama ada di health-check.ps1).
    Deteksi deterministik tanpa menyentuh filesystem: bila nama direktorinya
    sama dengan nama profil, anggap itu sudah direktori profil.
    """
    profile = os.environ.get("HERMES_PROFILE") or "avery"
    hermes_home = os.environ.get("HERMES_HOME")
    if hermes_home:
        base = Path(hermes_home)
        if base.name != profile:
            base = base / "profiles" / profile
    else:
        base = Path.home() / ".hermes" / "profiles" / profile
    return base / "pending" / "avery-outbound"


class Store:
    def __init__(
        self,
        root: Optional[Path] = None,
        now: Optional[Callable[[], datetime]] = None,
    ):
        self.root = Path(root) if root is not None else default_root()
        self.now = now or (lambda: datetime.now(timezone.utc))
        self.pending_dir = self.root / "pending"
        self.ledger_path = self.root / "ledger.jsonl"
        self.pending_dir.mkdir(parents=True, exist_ok=True)

    # -- persistensi berkas -------------------------------------------------

    def _path_for(self, request_id: str) -> Path:
        return self.pending_dir / f"{request_id}.json"

    def _write_atomic(self, path: Path, data: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = path.parent / f".{path.name}.{uuid.uuid4().hex}.tmp"
        tmp_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp_path, path)

    def _save(self, req: OutboundRequest) -> None:
        self._write_atomic(self._path_for(req.id), req.to_dict())

    def append_ledger(self, entry: LedgerEntry) -> None:
        self.root.mkdir(parents=True, exist_ok=True)
        with open(self.ledger_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry.to_dict(), ensure_ascii=False) + "\n")

    def _log(self, request_id: str, event: str, detail: str = "") -> None:
        self.append_ledger(
            LedgerEntry(
                ts=self.now().isoformat(),
                request_id=request_id,
                event=event,
                detail=detail,
            )
        )

    # -- operasi permintaan ---------------------------------------------------

    def create(
        self,
        target: str,
        draft_sha256: str,
        draft_path: str,
        ttl_minutes: int = DEFAULT_TTL_MINUTES,
    ) -> OutboundRequest:
        now = self.now()
        req = OutboundRequest(
            id=uuid.uuid4().hex,
            target=target,
            draft_sha256=draft_sha256,
            draft_path=str(draft_path),
            created_at=now.isoformat(),
            expires_at=(now + timedelta(minutes=ttl_minutes)).isoformat(),
            status=PENDING,
        )
        self._save(req)
        self._log(req.id, "created", f"ttl_minutes={ttl_minutes}")
        return req

    def _load(self, path: Path) -> OutboundRequest:
        return OutboundRequest.from_dict(json.loads(path.read_text(encoding="utf-8")))

    def get(self, request_id: str) -> OutboundRequest:
        path = self._path_for(request_id)
        if not path.exists():
            raise StoreError(f"permintaan tidak ditemukan: {request_id}")
        return self._load(path)

    def _is_expired(self, req: OutboundRequest) -> bool:
        expires_at = datetime.fromisoformat(req.expires_at)
        return self.now() > expires_at

    def _expire(self, req: OutboundRequest) -> None:
        """Transisi ke expired: satu jalur untuk approve/mark_sent/expire_stale."""
        req.status = EXPIRED
        self._save(req)
        self._log(req.id, EXPIRED)

    def approve(self, request_id: str) -> OutboundRequest:
        req = self.get(request_id)
        if req.status != PENDING:
            raise StoreError(f"tidak bisa approve dari status {req.status!r}")
        if self._is_expired(req):
            self._expire(req)
            raise StoreError("permintaan sudah kadaluarsa")
        req.status = APPROVED
        self._save(req)
        self._log(req.id, APPROVED)
        return req

    def cancel(self, request_id: str) -> OutboundRequest:
        req = self.get(request_id)
        if req.status in (SENT, CANCELLED):
            raise StoreError(f"tidak bisa cancel dari status {req.status!r}")
        req.status = CANCELLED
        self._save(req)
        self._log(req.id, CANCELLED)
        return req

    def mark_sent(self, request_id: str) -> OutboundRequest:
        req = self.get(request_id)
        if req.status != APPROVED:
            raise StoreError(f"tidak bisa mark_sent dari status {req.status!r}")
        if self._is_expired(req):
            self._expire(req)
            raise StoreError("permintaan sudah kadaluarsa")
        req.status = SENT
        self._save(req)
        self._log(req.id, SENT)
        return req

    def expire_stale(self) -> list[OutboundRequest]:
        expired = []
        for path in self.pending_dir.glob("*.json"):
            req = self._load(path)
            if req.status == PENDING and self._is_expired(req):
                self._expire(req)
                expired.append(req)
        return expired

    def list(self) -> list[OutboundRequest]:
        return [self._load(path) for path in sorted(self.pending_dir.glob("*.json"))]
