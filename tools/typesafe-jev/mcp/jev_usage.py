"""jev_usage.py - how often each coding agent consulted Jev.

Reads <playbook>/logs/agents.jsonl (written by jev_mcp.py and the Opencode plugin) and prints,
per agent, calls in the window, successful Jev decisions, and the last call. Agents expected to
use Jev but silent in the window are listed so a broken wiring is visible.

Usage:  python tools/typesafe-jev/mcp/jev_usage.py [--playbook tools/typesafe-jev/playbook] [--days 7]
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
from collections import defaultdict

EXPECTED = ["claude", "codex", "cursor", "droid", "gemini", "grok", "opencode"]


def main() -> int:
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument("--playbook", default=os.path.join(here, "..", "playbook"))
    ap.add_argument("--days", type=int, default=7)
    opts = ap.parse_args()
    path = os.path.join(opts.playbook, "logs", "agents.jsonl")
    since = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=opts.days)
    stats: dict[str, dict] = defaultdict(lambda: {"calls": 0, "jev": 0, "last": ""})
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                try:
                    row = json.loads(line)
                    ts = datetime.datetime.fromisoformat(row["ts"])
                except (ValueError, KeyError):
                    continue
                if ts < since:
                    continue
                s = stats[row.get("agent", "unknown")]
                s["calls"] += 1
                s["jev"] += 1 if row.get("jev_used") else 0
                s["last"] = max(s["last"], row["ts"][:16])
    print(f"Jev usage, last {opts.days} days ({path})")
    print(f"{'agent':10} {'calls':>6} {'jev ok':>7}  last call (UTC)")
    for agent in sorted(set(EXPECTED) | set(stats)):
        s = stats.get(agent, {"calls": 0, "jev": 0, "last": "-"})
        flag = "  <- no calls" if agent in EXPECTED and not s["calls"] else ""
        print(f"{agent:10} {s['calls']:>6} {s['jev']:>7}  {s['last'] or '-'}{flag}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
