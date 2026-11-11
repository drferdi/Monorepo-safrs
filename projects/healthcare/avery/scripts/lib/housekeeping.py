"""Avery Automated Session Housekeeping & Threshold Guard.

Enforces token threshold limits (default: 40,000 tokens) and auto-rotates bloated
messaging sessions, cleans up obsolete debug dumps, and optimizes SQLite state.db
while strictly preserving persistent memories (MEMORY.md, USER.md) and canonical skills.
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

DEFAULT_TOKEN_THRESHOLD = 40000
DEFAULT_MAX_AGE_HOURS = 24


def get_hermes_home(profile: str = "avery") -> Path:
    user_home = Path.home()
    hermes_home = user_home / ".hermes" / "profiles" / profile
    if not hermes_home.exists():
        repo_home = (
            Path(__file__).resolve().parents[2]
            / "runtime"
            / "hermes-home"
            / "profiles"
            / profile
        )
        if repo_home.exists():
            return repo_home
    return hermes_home


def clean_bloated_sessions(
    db_path: Path,
    token_threshold: int = DEFAULT_TOKEN_THRESHOLD,
    max_age_hours: int = DEFAULT_MAX_AGE_HOURS,
    dry_run: bool = True,
) -> dict:
    if not db_path.exists():
        return {"status": "error", "message": f"Database not found: {db_path}"}

    con = sqlite3.connect(str(db_path))
    try:
        cur = con.cursor()
        tables = [
            r[0]
            for r in cur.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        ]
        if "gateway_routing" not in tables:
            return {"status": "ok", "pruned": 0, "inspected": 0, "entries": []}

        rows = cur.execute(
            "SELECT scope, session_key, entry_json, updated_at FROM gateway_routing"
        ).fetchall()
        now = datetime.datetime.now()

        to_reset = []
        inspected = len(rows)

        for scope, session_key, entry_json, updated_at in rows:
            try:
                data = json.loads(entry_json)
            except Exception:
                continue

            last_tokens = data.get("last_prompt_tokens", 0)
            session_id = data.get("session_id", "unknown")
            created_at_str = data.get("created_at") or updated_at
            
            is_bloated = last_tokens > token_threshold
            is_stale = False

            if created_at_str:
                try:
                    dt = datetime.datetime.fromisoformat(created_at_str.split(".")[0])
                    if (now - dt).total_seconds() > (max_age_hours * 3600):
                        is_stale = True
                except Exception:
                    pass

            if is_bloated or is_stale:
                reason = "bloated" if is_bloated else "stale"
                to_reset.append(
                    {
                        "scope": scope,
                        "session_key": session_key,
                        "session_id": session_id,
                        "tokens": last_tokens,
                        "reason": reason,
                    }
                )

        if not dry_run:
            if to_reset:
                for item in to_reset:
                    cur.execute(
                        "DELETE FROM gateway_routing WHERE session_key = ?",
                        (item["session_key"],),
                    )
            # Clear restart auto-resume flags from all remaining sessions so no synthetic apology messages trigger on reboot
            remaining = cur.execute("SELECT scope, session_key, entry_json FROM gateway_routing").fetchall()
            for r_scope, r_key, r_json in remaining:
                try:
                    d = json.loads(r_json)
                    if d.get("resume_pending") or d.get("resume_reason") or d.get("active_turn_token"):
                        d["resume_pending"] = False
                        d["resume_reason"] = None
                        d["last_resume_marked_at"] = None
                        d["active_turn_token"] = None
                        d["active_turn_started_at"] = None
                        cur.execute(
                            "UPDATE gateway_routing SET entry_json = ? WHERE session_key = ?",
                            (json.dumps(d), r_key),
                        )
                except Exception:
                    pass

            # Clear pending delivery obligations to prevent leftover apology spam
            if "delivery_obligations" in tables:
                cur.execute("DELETE FROM delivery_obligations WHERE state != 'delivered'")

            con.commit()

        return {
            "status": "ok",
            "inspected": inspected,
            "pruned": len(to_reset),
            "entries": to_reset,
        }
    finally:
        con.close()


def clean_debug_dumps(
    sessions_dir: Path, max_age_hours: int = DEFAULT_MAX_AGE_HOURS, dry_run: bool = True
) -> dict:
    if not sessions_dir.exists():
        return {"deleted_files": 0, "freed_bytes": 0}

    now = datetime.datetime.now()
    cutoff = now - datetime.timedelta(hours=max_age_hours)
    deleted_files = 0
    freed_bytes = 0

    for dump_file in sessions_dir.glob("request_dump_*.json"):
        try:
            mtime = datetime.datetime.fromtimestamp(dump_file.stat().st_mtime)
            size = dump_file.stat().st_size
            if mtime < cutoff:
                if not dry_run:
                    dump_file.unlink(missing_ok=True)
                deleted_files += 1
                freed_bytes += size
        except Exception:
            pass

    return {"deleted_files": deleted_files, "freed_bytes": freed_bytes}


def run_hermes_optimize(profile: str = "avery") -> dict:
    runtime_root = (
        Path.home() / ".hermes-web-ui" / "desktop-runtime" / "hermes"
    )
    if not runtime_root.exists():
        return {"status": "skipped", "reason": "Hermes runtime directory not found"}

    versions = [v for v in runtime_root.iterdir() if v.is_dir()]
    if not versions:
        return {"status": "skipped", "reason": "No installed Hermes version found"}

    versions.sort()
    latest_py = versions[-1] / "win-x64" / "python" / "venv" / "Scripts" / "python.exe"
    if not latest_py.exists():
        return {"status": "skipped", "reason": f"Python executable missing: {latest_py}"}

    results = {}
    try:
        res = subprocess.run(
            [
                str(latest_py),
                "-m",
                "hermes_cli.main",
                "--profile",
                profile,
                "sessions",
                "clean-markers",
                "--no-backup",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        results["clean_markers"] = "ok" if res.returncode == 0 else res.stderr.strip()
    except Exception as e:
        results["clean_markers"] = str(e)

    try:
        res = subprocess.run(
            [
                str(latest_py),
                "-m",
                "hermes_cli.main",
                "--profile",
                profile,
                "sessions",
                "optimize",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        results["optimize_db"] = "ok" if res.returncode == 0 else res.stderr.strip()
    except Exception as e:
        results["optimize_db"] = str(e)

    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Avery Session Housekeeping & Token-Cap Guard")
    parser.add_argument("--profile", default="avery", help="Hermes profile name")
    parser.add_argument(
        "--token-threshold",
        type=int,
        default=DEFAULT_TOKEN_THRESHOLD,
        help="Max prompt tokens threshold before session auto-reset (default: 40000)",
    )
    parser.add_argument(
        "--max-age-hours",
        type=int,
        default=DEFAULT_MAX_AGE_HOURS,
        help="Max session idle age in hours before reset (default: 24)",
    )
    parser.add_argument(
        "--execute", action="store_true", help="Execute cleanup (default is dry-run)"
    )
    args = parser.parse_args()

    hermes_home = get_hermes_home(args.profile)
    db_path = hermes_home / "state.db"
    sessions_dir = hermes_home / "sessions"

    is_dry = not args.execute
    mode_str = "DRY-RUN (Simulasi)" if is_dry else "EKSEKUSI (Pembersihan Aktif)"

    print(f"=== Avery Session Housekeeping ({args.profile}) ===")
    print(f"Mode            : {mode_str}")
    print(f"Target Directory: {hermes_home}")
    print(f"Token Threshold : {args.token_threshold:,} tokens")
    print(f"Max Idle Age    : {args.max_age_hours} jam\n")

    routing_res = clean_bloated_sessions(
        db_path, args.token_threshold, args.max_age_hours, dry_run=is_dry
    )
    print(f"[1/3] Sesi Routing Terinspeksi: {routing_res.get('inspected', 0)} sesi")
    if routing_res.get("entries"):
        for entry in routing_res["entries"]:
            action = "Akan di-reset" if is_dry else "Telah di-reset"
            print(
                f"  - {action}: {entry['session_key']} (tokens: {entry['tokens']:,}, alasan: {entry['reason']})"
            )
    else:
        print("  ✓ Semua sesi routing sehat di bawah ambang batas.")

    dump_res = clean_debug_dumps(sessions_dir, args.max_age_hours, dry_run=is_dry)
    freed_kb = dump_res["freed_bytes"] / 1024
    dump_action = "Akan dibersihkan" if is_dry else "Telah dibersihkan"
    print(
        f"\n[2/3] Debug Request Dumps: {dump_res['deleted_files']} berkas ({freed_kb:.1f} KB) {dump_action}"
    )

    if not is_dry:
        print("\n[3/3] Menjalankan optimasi database Hermes (FTS5 + VACUUM)...")
        opt_res = run_hermes_optimize(args.profile)
        print(f"  clean-markers: {opt_res.get('clean_markers')}")
        print(f"  optimize-db  : {opt_res.get('optimize_db')}")
    else:
        print("\n[3/3] Optimasi database Hermes: dilewati pada mode dry-run.")

    print("\n✓ Housekeeping selesai.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
