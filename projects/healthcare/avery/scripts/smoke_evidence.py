#!/usr/bin/env python
"""
smoke_evidence.py -- pembantu stdlib-only untuk capability-smoke.ps1.

Membaca state.db (SQLite) Hermes secara read-only dan mencetak JSON ringkas
berisi status discoverable/callable/consumed untuk satu prompt oneshot.
TIDAK PERNAH mencetak isi kolom `content` -- hanya nama tool, hitungan,
status, dan session_id.

Usage:
    python smoke_evidence.py --db <path-to-state.db> --since <epoch-float> \
        --expect tool1,tool2,...

Output (stdout): satu baris JSON:
    {
      "discoverable": bool,
      "callable": bool,
      "consumed": bool,
      "tools_called": ["toolA", "toolB", ...],
      "session_id": "..." | null
    }
"""
import argparse
import json
import os
import sqlite3
import sys


def parse_args(argv):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--db", required=True, help="Path ke state.db")
    p.add_argument("--since", required=True, type=float, help="Epoch UTC (detik) awal pencarian")
    p.add_argument("--expect", required=True, help="Daftar nama tool yang diharapkan, dipisah koma")
    return p.parse_args(argv)


def to_ro_uri(path):
    # sqlite3 URI mode butuh path absolut dengan forward slashes.
    abs_path = os.path.abspath(path)
    normalized = abs_path.replace("\\", "/")
    if not normalized.startswith("/"):
        normalized = "/" + normalized
    return "file:" + normalized + "?mode=ro"


def function_names_from_tool_calls(raw):
    """Ekstrak nama fungsi dari kolom tool_calls (JSON) tanpa substring match."""
    names = []
    if not raw:
        return names
    try:
        data = json.loads(raw)
    except (ValueError, TypeError):
        return names
    if not isinstance(data, list):
        return names
    for item in data:
        if not isinstance(item, dict):
            continue
        fn = item.get("function")
        if isinstance(fn, dict):
            name = fn.get("name")
            if isinstance(name, str):
                names.append(name)
    return names


def main(argv):
    args = parse_args(argv)
    expected = [t.strip() for t in args.expect.split(",") if t.strip()]

    con = sqlite3.connect(to_ro_uri(args.db), uri=True)
    cur = con.cursor()

    # Pilih session terbaru dengan aktivitas setelah `since`, kecuali sesi cron.
    cur.execute(
        """
        SELECT session_id, MAX(timestamp) AS last_ts
        FROM messages
        WHERE timestamp > ? AND session_id NOT LIKE 'cron_%'
        GROUP BY session_id
        ORDER BY last_ts DESC
        LIMIT 1
        """,
        (args.since,),
    )
    row = cur.fetchone()
    result = {
        "discoverable": False,
        "callable": False,
        "consumed": False,
        "tools_called": [],
        "session_id": None,
    }

    if row is None:
        con.close()
        print(json.dumps(result))
        return 0

    session_id = row[0]
    result["session_id"] = session_id

    cur.execute(
        """
        SELECT role, tool_call_id, tool_name, tool_calls, timestamp
        FROM messages
        WHERE session_id = ?
        ORDER BY timestamp
        """,
        (session_id,),
    )
    rows = cur.fetchall()
    con.close()

    all_called_names = set()
    # assistant rows: (timestamp, set_of_function_names)
    assistant_calls = []
    # tool rows: (timestamp, tool_call_id, tool_name)
    tool_results = []
    # assistant response timestamps (any assistant row, used to detect "consumed")
    assistant_timestamps = []

    for role, tool_call_id, tool_name, tool_calls_raw, ts in rows:
        if role == "assistant":
            assistant_timestamps.append(ts)
            names = function_names_from_tool_calls(tool_calls_raw)
            if names:
                assistant_calls.append((ts, set(names)))
                all_called_names.update(names)
        elif role == "tool":
            if tool_name:
                all_called_names.add(tool_name)
                tool_results.append((ts, tool_call_id, tool_name))

    result["tools_called"] = sorted(all_called_names)

    discoverable = False
    callable_ = False
    consumed = False

    for tool in expected:
        if tool in all_called_names:
            discoverable = True

        if any(tool in names for _, names in assistant_calls):
            callable_ = True

        for tool_ts, _tc_id, tname in tool_results:
            if tname != tool:
                continue
            # consumed: ada baris assistant SETELAH baris tool ini di sesi yang sama.
            if any(a_ts > tool_ts for a_ts in assistant_timestamps):
                consumed = True
                break

    result["discoverable"] = discoverable
    result["callable"] = callable_
    result["consumed"] = consumed

    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
