#!/usr/bin/env bash
# SAFRS PreToolUse hook: block sensitive-path edits and lockfile edits.
# Reads a JSON event from stdin, prints '{}' to allow, or a cancel payload to block.
# Robust on this WSL bash: uses `cat` + `python3` (no jq dependency).
set -uo pipefail

input="$(cat)"
export CLINE_HOOK_INPUT="$input"

# python3 reads the event from the env var and prints the final JSON decision.
python3 - <<'PYEOF'
import json, os, re, sys

try:
    d = json.loads(os.environ.get("CLINE_HOOK_INPUT", "{}"))
    t = d.get("tool_call", {})
    tool = t.get("name", "") or ""
    i = t.get("input", {}) or {}
    def get_path():
        for k in ("file_path", "filePath", "path", "target_path", "rename"):
            if i.get(k):
                return str(i[k])
        return ""
    file = get_path()
    cmd = str(i.get("command", "") or "")
except Exception:
    tool, file, cmd = "", "", ""

MUTATE = {
    "write_to_file", "edit_file", "multi_edit", "apply_diff",
    "insert_content", "insert_content_multiple", "renaming", "delete_file",
}

def is_env_file(p):
    p = str(p).replace("\\", "/")
    base = p.rsplit("/", 1)[-1]
    # Block live env files (.env, .env.local, ...), never `.env.example`.
    return bool(re.match(r"^\.env($|\.)", base)) and not base.startswith(".env.example")

# 0) Live .env files are off-limits for BOTH reads and writes.
if tool in MUTATE and is_env_file(file):
    print('{"cancel": true, "errorMessage": "SAFRS: .env is off-limits to agents (live credentials). Chief authorization required."}')
    sys.exit(0)
if tool == "read_files":
    files = i.get("files") or []
    if any(is_env_file(f) for f in files):
        print('{"cancel": true, "errorMessage": "SAFRS: .env is off-limits to agents (live credentials). Chief authorization required."}')
        sys.exit(0)

# Guard shell commands that touch .env or reset the DB.
if tool == "run_commands":
    if re.search(r"\.env|db:reset|drop database", cmd, re.I):
        print('{"cancel": true, "errorMessage": "SAFRS: guarded shell command blocked (.env / db:reset) requires Chief authorization."}')
        sys.exit(0)
    print("{}")
    sys.exit(0)

if tool not in MUTATE:
    print("{}")
    sys.exit(0)

if not file:
    print("{}")
    sys.exit(0)

norm = file.replace("\\", "/")
base = norm.rsplit("/", 1)[-1]

# 2) KB directory: reads allowed, edits blocked.
if re.search(r"(^|/)\.agents/knowledge/", norm):
    print('{"cancel": true, "errorMessage": "SAFRS: .agents/knowledge/ edits require Chief approval."}')
    sys.exit(0)

# 3) Lockfiles: never hand-edited; regenerate with pnpm.
if base in ("pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lockb"):
    print('{"cancel": true, "errorMessage": "SAFRS: lockfiles must be regenerated with pnpm, not hand-edited."}')
    sys.exit(0)

print("{}")
PYEOF
exit 0