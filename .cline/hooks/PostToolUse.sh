#!/usr/bin/env bash
# SAFRS PostToolUse hook: auto-format edited code files with Biome.
# Reads a JSON event from stdin; prints '{}' (PostToolUse supports a "context" field).
set -uo pipefail

input="$(cat)"
export CLINE_HOOK_INPUT="$input"

# python3 extracts the edited file path (if any) to stdout.
file="$(python3 - <<'PYEOF'
import json, os, sys
try:
    d = json.loads(os.environ.get("CLINE_HOOK_INPUT", "{}"))
    t = d.get("tool_call", {})
    tool = t.get("name", "") or ""
    MUTATE = ("write_to_file", "edit_file", "multi_edit", "apply_diff",
              "insert_content", "insert_content_multiple")
    i = t.get("input", {}) or {}
    if tool in MUTATE:
        for k in ("file_path", "filePath", "path", "target_path"):
            if i.get(k):
                p = str(i[k])
                if p.endswith((".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json")):
                    print(p)
                break
except Exception:
    pass
PYEOF
)"

if [ -n "$file" ] && [ -f "$file" ]; then
  # stderr is for logs; stdout must remain valid JSON. Don't fail the hook on lint issues.
  pnpm exec biome check --write "$file" >/dev/null 2>&1 || true
fi

printf '%s\n' '{}'
exit 0