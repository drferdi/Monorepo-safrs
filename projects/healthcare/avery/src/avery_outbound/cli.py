"""CLI untuk broker pengiriman keluar terikat-persetujuan.

Kode keluar: 0 sukses, 1 kesalahan kebijakan/pemakaian, 3 penerima tidak
diotorisasi (bukan salah pakai -- ini gerbang otorisasi eksplisit).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .policy import PolicyError, check_draft, draft_hash, read_allowed, validate_target
from .sender import build_command
from .store import Store, StoreError


def _mask(number: str) -> str:
    return "..." + number[-4:] if len(number) >= 4 else "..." + number


def cmd_prepare(args: argparse.Namespace) -> int:
    try:
        target = validate_target(args.to)
        text = Path(args.file).read_text(encoding="utf-8")
        check_draft(text)
    except PolicyError as e:
        print("GAGAL: " + str(e), file=sys.stderr)
        return 1

    if args.env:
        allowed = read_allowed(Path(args.env))
        if allowed and target not in allowed:
            print(
                "GAGAL: penerima belum diotorisasi (" + _mask(target) + ")",
                file=sys.stderr,
            )
            return 3

    store = Store(root=args.root) if args.root else Store()
    req = store.create(
        target=target,
        draft_sha256=draft_hash(text),
        draft_path=str(Path(args.file).resolve()),
    )
    print(req.id)
    return 0


def cmd_approve(args: argparse.Namespace) -> int:
    store = Store(root=args.root) if args.root else Store()
    try:
        req = store.approve(args.id)
    except StoreError as e:
        print("GAGAL: " + str(e), file=sys.stderr)
        return 1
    print(f"disetujui: {req.id} -> {_mask(req.target)}")
    return 0


def cmd_cancel(args: argparse.Namespace) -> int:
    store = Store(root=args.root) if args.root else Store()
    try:
        req = store.cancel(args.id)
    except StoreError as e:
        print("GAGAL: " + str(e), file=sys.stderr)
        return 1
    print(f"dibatalkan: {req.id}")
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    store = Store(root=args.root) if args.root else Store()
    if args.id:
        try:
            reqs = [store.get(args.id)]
        except StoreError as e:
            print("GAGAL: " + str(e), file=sys.stderr)
            return 1
    else:
        reqs = store.list()

    for req in reqs:
        if req.status == "approved":
            # Satu-satunya keluaran yang memuat nomor penuh: argv ini memang
            # harus disalin apa adanya oleh manusia ke terminal. Keluaran lain
            # selalu disamarkan.
            try:
                argv = build_command(req)
                print(" ".join(argv))
            except PolicyError as e:
                print("GAGAL: " + str(e), file=sys.stderr)
                return 1
        else:
            print(f"{req.id} status={req.status} target={_mask(req.target)}")
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    store = Store(root=args.root) if args.root else Store()
    for req in store.list():
        print(f"{req.id} status={req.status} target={_mask(req.target)}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="avery-outbound", description=__doc__)
    parser.add_argument("--root", help="lokasi store, override default profil Hermes")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("prepare", help="buat permintaan pengiriman pending")
    p.add_argument("--to", required=True)
    p.add_argument("--file", required=True)
    p.add_argument("--env", help="path .env untuk cek allowlist")
    p.set_defaults(func=cmd_prepare)

    a = sub.add_parser("approve", help="setujui permintaan pending")
    a.add_argument("id")
    a.set_defaults(func=cmd_approve)

    c = sub.add_parser("cancel", help="batalkan permintaan")
    c.add_argument("id")
    c.set_defaults(func=cmd_cancel)

    s = sub.add_parser("status", help="tampilkan status/argv permintaan yang disetujui")
    s.add_argument("id", nargs="?")
    s.set_defaults(func=cmd_status)

    lst = sub.add_parser("list", help="daftar semua permintaan")
    lst.set_defaults(func=cmd_list)

    return parser


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
