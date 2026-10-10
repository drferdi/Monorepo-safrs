"""jev_mcp.py - minimal MCP (stdio) server exposing Jev as one tool: `jev_route`.

No third-party dependencies: speaks newline-delimited JSON-RPC 2.0 over stdin/stdout.
It imports `route_task` from an existing muse-jev-playbook install and returns its decision.

Usage:
  <playbook>\\.venv\\Scripts\\python.exe jev_mcp.py --playbook <path-to-muse-jev-playbook>
"""
from __future__ import annotations

import argparse
import contextlib
import datetime
import json
import os
import sys
import traceback

PROTOCOL_FALLBACK = "2025-06-18"
KINDS = ["chat", "lookup", "research", "browser", "coding", "write", "account"]

TOOL = {
    "name": "jev_route",
    "description": (
        "Ask Jev, Gaffer's decision router, what to do next. Call it BEFORE: the first web search "
        "or browse in a task, spawning a subagent, retrying an approach that already failed, any "
        "action that needs Gaffer's approval, or choosing between materially different routes. "
        "Returns an action (chat_only, run_deterministic, research_capped, reuse_cache, stop_retry, "
        "allow_subagent, ask_human, proceed_full) with a reason. Never include secrets."
    ),
    "inputSchema": {
        "type": "object",
        "properties": {
            "goal": {"type": "string", "description": "One-line English goal, no secrets."},
            "kind": {"type": "string", "enum": KINDS},
            "cached_artifact": {"type": "boolean", "default": False},
            "cached_note": {"type": "string", "default": ""},
            "prior_error": {"type": "string", "default": ""},
            "same_error_count": {"type": "integer", "default": 0},
            "sources_found": {"type": "integer", "default": 0},
            "constraints": {"type": "string", "default": ""},
        },
        "required": ["goal", "kind"],
    },
}

# Set in main(): which agent this server instance serves, and where usage is recorded.
USAGE = {"agent": "unknown", "log": None}


def ensure_api_key() -> None:
    """Load TYPESAFE_API_KEY from the Windows user environment when the agent process lacks it.

    Desktop apps keep the environment they started with, so a key added later is invisible to
    them. The value is read into this process only; it is never printed or logged.
    """
    if os.environ.get("TYPESAFE_API_KEY") or os.name != "nt":
        return
    try:
        import winreg

        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as key:
            value, _ = winreg.QueryValueEx(key, "TYPESAFE_API_KEY")
        if value:
            os.environ["TYPESAFE_API_KEY"] = str(value)
    except OSError:
        pass


def record_usage(state: dict, out: dict) -> None:
    """Append one line per call to logs/agents.jsonl: agent, kind, action. No goal text."""
    if not USAGE["log"]:
        return
    entry = {
        "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "agent": USAGE["agent"],
        "kind": state.get("kind"),
        "action": out.get("action"),
        "jev_used": bool(out.get("jev_used")),
    }
    try:
        os.makedirs(os.path.dirname(USAGE["log"]), exist_ok=True)
        with open(USAGE["log"], "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry) + "\n")
    except OSError:
        pass


DEFAULTS = {
    "cached_artifact": False,
    "cached_note": "",
    "prior_error": "",
    "same_error_count": 0,
    "sources_found": 0,
    "constraints": "",
}


def build_state(args: dict) -> dict:
    state = {**DEFAULTS, **{k: v for k, v in (args or {}).items() if k in TOOL["inputSchema"]["properties"]}}
    state["goal"] = str(state.get("goal", "")).strip()[:300]
    if state.get("kind") not in KINDS:
        state["kind"] = "coding"
    return state


def make_router(playbook: str):
    sys.path.insert(0, playbook)
    from src.router import route_task  # noqa: E402  (imported from the playbook)

    return route_task


def call_jev(route_task, args: dict) -> dict:
    state = build_state(args)
    if not state["goal"]:
        return {"isError": True, "content": [{"type": "text", "text": "jev_route needs a non-empty goal."}]}
    try:
        # Anything the router prints must not corrupt the JSON-RPC stream on stdout.
        with contextlib.redirect_stdout(sys.stderr):
            out = route_task(state)
        record_usage(state, out)
        line = f"Jev: {out.get('action')} ({out.get('reason')})"
        return {"content": [{"type": "text", "text": line + "\n" + json.dumps(out, ensure_ascii=False)}]}
    except Exception as exc:  # report, never crash the server
        traceback.print_exc(file=sys.stderr)
        record_usage(state, {"action": "error", "jev_used": False})
        return {
            "isError": True,
            "content": [{"type": "text", "text": f"Jev did not run ({type(exc).__name__}: {exc}). Continue on the normal safe path."}],
        }


def handle(msg: dict, route_task) -> dict | None:
    method, mid = msg.get("method"), msg.get("id")
    if mid is None:  # notification (e.g. notifications/initialized): no reply
        return None
    if method == "initialize":
        version = (msg.get("params") or {}).get("protocolVersion") or PROTOCOL_FALLBACK
        result = {
            "protocolVersion": version,
            "capabilities": {"tools": {"listChanged": False}},
            "serverInfo": {"name": "jev", "version": "1.0.0"},
        }
    elif method == "ping":
        result = {}
    elif method == "tools/list":
        result = {"tools": [TOOL]}
    elif method == "tools/call":
        params = msg.get("params") or {}
        if params.get("name") != "jev_route":
            return {"jsonrpc": "2.0", "id": mid, "error": {"code": -32602, "message": "Unknown tool"}}
        result = call_jev(route_task, params.get("arguments") or {})
    else:
        return {"jsonrpc": "2.0", "id": mid, "error": {"code": -32601, "message": f"Method not found: {method}"}}
    return {"jsonrpc": "2.0", "id": mid, "result": result}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--playbook", required=True)
    ap.add_argument("--agent", default="unknown", help="agent name recorded in logs/agents.jsonl")
    opts = ap.parse_args()
    USAGE["agent"] = opts.agent
    USAGE["log"] = os.path.join(opts.playbook, "logs", "agents.jsonl")
    ensure_api_key()
    route_task = make_router(opts.playbook)
    for raw in sys.stdin:
        raw = raw.strip()
        if not raw:
            continue
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            reply = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}}
        else:
            reply = handle(msg, route_task)
        if reply is not None:
            sys.stdout.write(json.dumps(reply, ensure_ascii=False) + "\n")
            sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
