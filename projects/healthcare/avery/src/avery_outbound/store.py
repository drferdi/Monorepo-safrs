"""Penyimpanan berbasis berkas untuk permintaan pengiriman keluar yang menunggu persetujuan.

Setiap permintaan hidup sebagai satu berkas JSON di `pending/<id>.json`
(direktori itu menampung SEMUA status, bukan hanya pending -- nama historis).
Semua perubahan status dicatat ke `ledger.jsonl` (append-only) tanpa pernah
memuat isi draf, hanya metadata (id, event, waktu).

Aman untuk lebih dari satu penulis (mis. cron/agen): setiap transisi status
(baca-ubah-tulis) dipagari lock per-berkas `pending/.<id>.lock` (O_CREAT|O_EXCL,
atomik di Windows dan POSIX). Lock yang lebih tua dari LOCK_STALE_SECONDS
dianggap sisa proses mati dan boleh dipecah. Transisi approve dan cancel
idempoten: mengulang transisi yang sudah terjadi mengembalikan permintaan
apa adanya tanpa menulis ulang berkas dan tanpa entri ledger baru.
mark_sent SENGAJA tetap single-use (anti kirim ganda) -- bukan idempoten.

Ledger dirotasi saat menyentuh ambang `ledger_max_bytes` (default 1 MB):
berkas berjalan di-rename menjadi `ledger.<stempel-utc>.jsonl` lalu berkas
baru dimulai; tidak ada baris yang dihapus (tetap append-only).
"""

from __future__ import annotations

import contextlib
import json
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable, Iterator, Optional

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
DEFAULT_LEDGER_MAX_BYTES = 1024 * 1024
LOCK_STALE_SECONDS = 60


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
        ledger_max_bytes: int = DEFAULT_LEDGER_MAX_BYTES,
    ):
        self.root = Path(root) if root is not None else default_root()
        self.now = now or (lambda: datetime.now(timezone.utc))
        self.ledger_max_bytes = ledger_max_bytes
        self.pending_dir = self.root / "pending"
        self.ledger_path = self.root / "ledger.jsonl"
        self.pending_dir.mkdir(parents=True, exist_ok=True)

    # -- persistensi berkas -------------------------------------------------

    def _path_for(self, request_id: str) -> Path:
        return self.pending_dir / f"{request_id}.json"

    def _lock_path_for(self, request_id: str) -> Path:
        return self.pending_dir / f".{request_id}.lock"

    @contextlib.contextmanager
    def _locked(self, request_id: str) -> Iterator[None]:
        """Lock per-berkas untuk transisi baca-ubah-tulis.

        O_CREAT|O_EXCL atomik: hanya satu proses yang berhasil membuat berkas
        lock. Deteksi stale memakai jam dinding (`time.time`), bukan `self.now`,
        karena mtime berkas selalu jam dinding. Bila dua proses memecah lock
        stale bersamaan, satu menang O_EXCL dan yang lain gagal -- itu benar,
        jangan retry.
        """
        lock_path = self._lock_path_for(request_id)
        try:
            fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError:
            try:
                age = time.time() - lock_path.stat().st_mtime
            except OSError:
                age = 0.0  # lock baru saja dilepas pemegangnya; biarkan pemanggil ulang
            if age <= LOCK_STALE_SECONDS:
                raise StoreError(
                    f"permintaan sedang dikunci proses lain: {request_id}"
                ) from None
            with contextlib.suppress(OSError):
                os.unlink(lock_path)
            try:
                fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            except FileExistsError:
                raise StoreError(
                    f"permintaan sedang dikunci proses lain: {request_id}"
                ) from None
        try:
            os.write(fd, str(os.getpid()).encode("ascii"))
            yield
        finally:
            os.close(fd)
            with contextlib.suppress(OSError):
                os.unlink(lock_path)

    def _write_atomic(self, path: Path, data: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp_path = path.parent / f".{path.name}.{uuid.uuid4().hex}.tmp"
        tmp_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp_path, path)

    def _save(self, req: OutboundRequest) -> None:
        self._write_atomic(self._path_for(req.id), req.to_dict())

    def _rotate_ledger_if_needed(self) -> None:
        """Rotasi ledger saat menyentuh ambang; tidak pernah menghapus baris.

        Gagal rename (mis. sharing violation Windows saat proses lain memegang
        handle) tidak berbahaya: berkas lewat ambang sedikit dan percobaan
        berikutnya mengulang.
        """
        try:
            size = self.ledger_path.stat().st_size
        except OSError:
            return
        if size < self.ledger_max_bytes:
            return
        stamp = self.now().strftime("%Y%m%dT%H%M%SZ")
        rotated = self.root / f"ledger.{stamp}.jsonl"
        if rotated.exists():
            rotated = self.root / f"ledger.{stamp}.{uuid.uuid4().hex[:8]}.jsonl"
        with contextlib.suppress(OSError):
            os.rename(self.ledger_path, rotated)

    def append_ledger(self, entry: LedgerEntry) -> None:
        self.root.mkdir(parents=True, exist_ok=True)
        self._rotate_ledger_if_needed()
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
        with self._locked(request_id):
            req = self.get(request_id)
            if req.status == APPROVED:
                return req  # idempoten: sudah terjadi, tanpa tulis ulang/ledger
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
        with self._locked(request_id):
            req = self.get(request_id)
            if req.status == CANCELLED:
                return req  # idempoten
            if req.status == SENT:
                raise StoreError(f"tidak bisa cancel dari status {req.status!r}")
            req.status = CANCELLED
            self._save(req)
            self._log(req.id, CANCELLED)
            return req

    def mark_sent(self, request_id: str) -> OutboundRequest:
        # SENGAJA tidak idempoten: single-use adalah pagar anti kirim ganda.
        with self._locked(request_id):
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
                try:
                    with self._locked(req.id):
                        req = self._load(path)  # baca ulang di bawah lock
                        if req.status == PENDING and self._is_expired(req):
                            self._expire(req)
                            expired.append(req)
                except StoreError:
                    continue  # sedang dipegang proses lain; sweep berikutnya
        return expired

    def list(self) -> list[OutboundRequest]:
        return [self._load(path) for path in sorted(self.pending_dir.glob("*.json"))]
