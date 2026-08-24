"""Struktur data untuk permintaan pengiriman keluar (outbound) yang menunggu persetujuan.

Sengaja tidak menyimpan isi pesan (`draft_path` hanya menunjuk ke berkas,
`draft_sha256` mengikat isinya) supaya ledger dan berkas status tidak
kebocoran isi draf.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict


# Konstanta status -- satu-satunya sumber string status; jangan tulis literal.
PENDING = "pending"
APPROVED = "approved"
SENT = "sent"
CANCELLED = "cancelled"
EXPIRED = "expired"
STATUSES = (PENDING, APPROVED, SENT, CANCELLED, EXPIRED)


@dataclass
class OutboundRequest:
    id: str
    target: str
    draft_sha256: str
    draft_path: str
    created_at: str
    expires_at: str
    status: str

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "OutboundRequest":
        return cls(
            id=data["id"],
            target=data["target"],
            draft_sha256=data["draft_sha256"],
            draft_path=data["draft_path"],
            created_at=data["created_at"],
            expires_at=data["expires_at"],
            status=data["status"],
        )


@dataclass
class LedgerEntry:
    ts: str
    request_id: str
    event: str
    detail: str

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "LedgerEntry":
        return cls(
            ts=data["ts"],
            request_id=data["request_id"],
            event=data["event"],
            detail=data["detail"],
        )
