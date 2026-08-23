#!/usr/bin/env python3
"""Membandingkan snapshot anggota grup dan melaporkan kandidat anggota baru.

Masukan adalah berkas JSON snapshot berbentuk ``{"<grup>": ["<anggota>", ...]}``
yang disiapkan operator (misalnya dari ekspor bridge). Skrip ini tidak membaca
sesi WhatsApp, tidak menyentuh runtime, dan tidak menulis apa pun kecuali
snapshot terbaru bila diminta lewat ``--save``.

Kontrak keluaran:

- Jalankan pertama (belum ada snapshot sebelumnya): keluaran kosong.
- Tidak ada perubahan: keluaran kosong.
- Ada anggota baru: satu baris per kandidat, pengenal disamarkan ke empat
  karakter terakhir. Anggota yang hilang tidak dilaporkan — bukan tugas
  skrip ini.

Kode keluar selalu 0 kecuali masukan tidak bisa dibaca (1).

Usage
-----
    member_watch.py --current current.json --previous previous.json [--save]
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def mask(identifier: str) -> str:
    """Samarkan pengenal: hanya empat karakter terakhir yang ditampilkan."""
    ident = str(identifier)
    return "..." + ident[-4:] if len(ident) > 4 else "..."


def load_snapshot(path: Path | None) -> dict[str, set[str]]:
    if path is None or not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("snapshot harus berupa objek {grup: [anggota]}")
    return {str(g): {str(m) for m in members} for g, members in data.items()}


def diff_snapshots(
    previous: dict[str, set[str]], current: dict[str, set[str]]
) -> list[tuple[str, str]]:
    """Kembalikan pasangan (grup, anggota) yang baru muncul di ``current``."""
    if not previous:
        return []
    new: list[tuple[str, str]] = []
    for group, members in sorted(current.items()):
        before = previous.get(group, set())
        for m in sorted(members - before):
            new.append((group, m))
    return new


def format_report(new: list[tuple[str, str]]) -> str:
    if not new:
        return ""
    lines = [f"kandidat anggota baru: {len(new)}"]
    for group, member in new:
        lines.append(f"  {group}: {mask(member)}")
    return "\n".join(lines) + "\n"


def save_snapshot(path: Path, snapshot: dict[str, set[str]]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    payload = {g: sorted(m) for g, m in sorted(snapshot.items())}
    tmp.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--current", required=True, type=Path)
    parser.add_argument("--previous", type=Path)
    parser.add_argument("--save", action="store_true",
                        help="tulis snapshot saat ini ke path --previous")
    args = parser.parse_args(argv)
    try:
        current = load_snapshot(args.current)
        previous = load_snapshot(args.previous)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"GAGAL: {exc}", file=sys.stderr)
        return 1
    sys.stdout.write(format_report(diff_snapshots(previous, current)))
    if args.save and args.previous is not None:
        save_snapshot(args.previous, current)
    return 0


if __name__ == "__main__":
    sys.exit(main())
