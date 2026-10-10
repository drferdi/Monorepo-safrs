"""jev_intent.py - classify one prompt line for an agent's prompt-submit hook (Cursor).

Reads the prompt line on stdin and prints {"answers": {"intent": {"choice", "confidence"}}}.
It uses the playbook's TypeSafe client and key handling, and records one usage line
(agent, kind "intent", action "intent:<choice>"; no prompt text) in logs/agents.jsonl.
It never fails the caller: on any problem it prints nothing and exits 0, so the hook fails open.

Usage:
  <playbook>\\.venv\\Scripts\\python.exe jev_intent.py --playbook <playbook> --agent cursor
"""
from __future__ import annotations

import argparse
import contextlib
import json
import os
import sys

from typesafe_sdk import Choice, TypeSafeError

MAX_CHARS = 200
INSTRUCTIONS = (
    "Classify the latest Cursor user prompt. Choose exactly one label for what the user wants "
    "this coding agent to do next."
)
CRITERIA = {
    "answer": "The user wants an explanation, review, or information. They do not ask to change files, "
    "run a session protocol, or connect a service.",
    "act": "The user wants the Cursor agent to implement, edit, fix, or create files or code now.",
    "routine": "The user wants session workflow: brief, plan, verify, backup, open or close a session, "
    "or daily protocol.",
    "connect": "The user wants MCP plugins, Cursor hooks or skills setup, integrations, or tool connections.",
    "other": "The request does not fit the labels above, mixes several intents, or is too incomplete to classify.",
}


def first_line(raw: str) -> str:
    for line in raw.splitlines():
        if line.strip():
            return line.strip()[:MAX_CHARS]
    return ""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--playbook", required=True)
    ap.add_argument("--agent", default="cursor", help="agent name recorded in logs/agents.jsonl")
    opts = ap.parse_args()
    text = first_line(sys.stdin.buffer.read().decode("utf-8", "replace"))
    if not text:
        return 0
    try:
        sys.path.insert(0, opts.playbook)
        # jev_mcp sits in the same folder as this script; src and typesafe_sdk come from the playbook.
        from jev_mcp import USAGE, ensure_api_key, record_usage
        from src.config import load_config
        from src.jev_client import system_one

        cfg = load_config()
        if not cfg.get("enabled", True):
            return 0
        USAGE["agent"] = opts.agent
        USAGE["log"] = os.path.join(opts.playbook, "logs", "agents.jsonl")
        ensure_api_key()
        with contextlib.redirect_stdout(sys.stderr):
            result = system_one(
                {"message": text},
                {"intent": Choice(instructions=INSTRUCTIONS, criteria=CRITERIA)},
                model=cfg.get("model") or "jev-latest",
            )
        intent = result.choices["intent"]
        record_usage({"kind": "intent"}, {"action": f"intent:{intent.choice}", "jev_used": True})
        print(json.dumps({"answers": {"intent": {"choice": intent.choice, "confidence": float(intent.confidence)}}}))
    except (TypeSafeError, SystemExit, ImportError, OSError, KeyError, ValueError) as exc:
        # SystemExit: the playbook exits when the key is missing. Anything else exits non-zero
        # with no output, which the hook also treats as "allow".
        print(f"jev_intent: Jev did not run ({type(exc).__name__})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
