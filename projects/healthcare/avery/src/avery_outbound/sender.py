"""Menyusun argv `hermes send` tanpa pernah mengeksekusinya.

Eksekusi subprocess sengaja bukan tanggung jawab modul ini -- pemanggil
(mis. operator manusia atau proses lain yang sudah lolos gate persetujuan)
yang menjalankan argv hasil `prepare_send`.
"""

from __future__ import annotations

from pathlib import Path

from .models import OutboundRequest
from .policy import PolicyError, draft_hash
from .store import Store


def build_command(req: OutboundRequest, profile: str = "avery") -> list[str]:
    """Susun argv `hermes send`, mengikat pada hash draf saat ini."""
    draft_path = Path(req.draft_path)
    current_hash = draft_hash(draft_path.read_text(encoding="utf-8"))
    if current_hash != req.draft_sha256:
        raise PolicyError(
            "hash draf berubah sejak permintaan dibuat -- pengiriman dibatalkan"
        )
    return [
        "hermes",
        "-p",
        profile,
        "send",
        "--to",
        f"whatsapp:{req.target}",
        "--file",
        req.draft_path,
    ]


def prepare_send(store: Store, request_id: str, profile: str = "avery") -> list[str]:
    """Bangun argv dan tandai permintaan sebagai terkirim (single-use)."""
    req = store.get(request_id)
    argv = build_command(req, profile=profile)
    store.mark_sent(request_id)
    return argv
