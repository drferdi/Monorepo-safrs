"""Aturan kebijakan untuk pesan keluar, diporting dari `scripts/outreach.py`.

Modul ini HANYA memvalidasi. Tidak ada fungsi tulis/otorisasi -- mengubah
allowlist `.env` tetap keputusan manual di luar modul ini.
"""

from __future__ import annotations

import hashlib
import re
from pathlib import Path


class PolicyError(Exception):
    """Draf atau target melanggar kebijakan pengiriman keluar."""


ALLOW_KEY = "WHATSAPP_ALLOWED_USERS"

SCAFFOLD = ("Cronjob Response", "job_id:", "To stop or manage this job")

# Sebuah pesan keluar boleh MENYEBUT Chief ("asisten dari dr. Ferdi Iskandar")
# -- itu memang tujuan perkenalan. Yang tidak boleh adalah MENYAPA Chief,
# karena itu berarti teksnya ditulis untuk Chief tapi akan dikirim ke orang
# lain. Cocokkan hanya bentuk sapaan.
ADDRESSES_CHIEF = re.compile(
    r"(?im)^\s*(baik|siap|selamat (pagi|siang|sore|malam)|terima kasih|mohon|"
    r"halo|hai)[^.\n]*,\s*Chief\b"
    r"|,\s*Chief\s*[.!?]\s*$"
    r"|\bkepada\s+Chief\b"
)


def normalize(number: str) -> str:
    """Angka mentah saja. JID WhatsApp tidak memuat plus, spasi, atau strip."""
    n = re.sub(r"[^\d]", "", number or "")
    if n.startswith("0"):
        n = "62" + n[1:]
    if not (8 <= len(n) <= 15):
        raise PolicyError("nomor tidak masuk akal setelah dinormalisasi: " + repr(n))
    return n


def check_draft(text: str) -> None:
    """Tolak draf kosong, yang memuat perancah cron, atau yang menyapa Chief."""
    stripped = (text or "").strip()
    if not stripped:
        raise PolicyError("berkas pesan kosong")

    leaks = [m for m in SCAFFOLD if m in text]
    if leaks:
        raise PolicyError("draf memuat perancah internal cron: " + ", ".join(leaks))

    if ADDRESSES_CHIEF.search(text):
        raise PolicyError(
            "draf ini MENYAPA Chief, artinya ditulis untuk Chief tetapi akan "
            "dikirim ke orang lain. Tulis ulang, tujukan kepada penerima."
        )


def read_allowed(env_path: Path) -> list[str]:
    """Baca daftar nomor yang boleh membalas DM. Hanya baca, tidak menulis."""
    env_path = Path(env_path)
    if not env_path.exists():
        return []
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith(ALLOW_KEY + "="):
            return [x.strip() for x in line.split("=", 1)[1].split(",") if x.strip()]
    return []


def validate_target(raw: str) -> str:
    """Pastikan target adalah satu nomor WhatsApp konkret, bukan grup/daftar."""
    if not raw or not raw.strip():
        raise PolicyError("target kosong")
    candidate = raw.strip()
    if "," in candidate:
        raise PolicyError("target harus satu nomor, bukan daftar: " + repr(raw))
    if candidate.endswith("@g.us"):
        raise PolicyError("target adalah grup, bukan nomor perorangan: " + repr(raw))
    if candidate.endswith("@lid"):
        raise PolicyError("target adalah JID LID, bukan nomor WhatsApp konkret: " + repr(raw))
    return normalize(candidate)


def draft_hash(text: str) -> str:
    """Hash sha256 heksadesimal dari isi draf (UTF-8)."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
