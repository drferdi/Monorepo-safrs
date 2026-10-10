"""jev_hook.py - Claude Code PreToolUse hook: consult Jev automatically before research or subagents.

Wire it to the `WebSearch|WebFetch|Agent|Task` tools. It runs Jev at most once per session per
trigger type (research / subagent), then hands the decision to Claude as additional context.
It never blocks a tool: on any problem it exits 0 silently and the normal flow continues.

Usage (from a hook command):
  <playbook>\\.venv\\Scripts\\python.exe jev_hook.py --playbook <path-to-muse-jev-playbook>
"""
from __future__ import annotations

import argparse
import contextlib
import json
import os
import re
import sys
import tempfile

# Claude Code, Factory Droid (FetchUrl) and Grok (snake_case tool ids) names.
RESEARCH_TOOLS = {"WebSearch", "WebFetch", "FetchUrl", "web_search", "web_fetch"}
SUBAGENT_TOOLS = {"Agent", "Task", "task"}


def trigger_for(tool_name: str) -> str | None:
    if tool_name in RESEARCH_TOOLS:
        return "research"
    if tool_name in SUBAGENT_TOOLS:
        return "subagent"
    return None


def goal_from(tool_name: str, tool_input: dict) -> str:
    text = (
        tool_input.get("query")
        or tool_input.get("description")
        or tool_input.get("prompt")
        or tool_input.get("url")
        or tool_name
    )
    text = re.sub(r"\s+", " ", str(text)).strip()
    prefix = "Research: " if tool_name in RESEARCH_TOOLS else "Spawn subagent for: "
    return (prefix + text)[:300]


def marker_path(session_id: str, trigger: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9_-]", "", session_id or "nosession")[:80]
    return os.path.join(tempfile.gettempdir(), f"jev_hook_{safe}_{trigger}.done")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--playbook", required=True)
    ap.add_argument("--agent", default="claude", help="agent name recorded in logs/agents.jsonl")
    opts = ap.parse_args()
    playbook = opts.playbook
    try:
        event = json.load(sys.stdin)
    except Exception:
        return 0
    tool_name = event.get("tool_name", "")
    trigger = trigger_for(tool_name)
    if not trigger:
        return 0
    marker = marker_path(event.get("session_id", ""), trigger)
    if os.path.exists(marker):
        return 0  # already consulted Jev for this kind of step in this session
    try:
        sys.path.insert(0, playbook)
        from jev_mcp import USAGE, ensure_api_key, record_usage  # same folder as this hook
        from src.router import route_task

        USAGE["agent"] = opts.agent
        USAGE["log"] = os.path.join(playbook, "logs", "agents.jsonl")
        ensure_api_key()

        state = {
            "goal": goal_from(tool_name, event.get("tool_input") or {}),
            "kind": "research" if trigger == "research" else "coding",
            "cached_artifact": False,
            "cached_note": "",
            "prior_error": "",
            "same_error_count": 0,
            "sources_found": 0,
            "constraints": "",
        }
        with contextlib.redirect_stdout(sys.stderr):
            out = route_task(state)
        record_usage(state, out)
        with open(marker, "w", encoding="utf-8") as fh:
            fh.write(str(out.get("action")))
        context = (
            f"Jev decision for this {trigger} step: action={out.get('action')}, reason={out.get('reason')}, "
            f"mode={out.get('mode')}. In active mode, honor this action and state it in one line as "
            f"`Jev: {out.get('action')} ({out.get('reason')})`. ask_human means confirm with Gaffer first."
        )
        print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": context}}))
    except Exception as exc:
        print(f"jev_hook: Jev did not run ({type(exc).__name__}: {exc})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
