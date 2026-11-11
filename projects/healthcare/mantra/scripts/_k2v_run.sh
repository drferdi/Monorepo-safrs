#!/usr/bin/env bash
# K2v read-only slot parity runner (dev container).
# Writes scripts/_k2v_out.json for Playwright all-days screenshots.
set -euo pipefail
cd /workspace
OUT=/workspace/scripts/_k2v_out.json
bench --site mantra.localhost console <<'PY'
import json
import importlib.util
spec = importlib.util.spec_from_file_location(
	"k2v_verify", "/workspace/scripts/_k2v_verify_slots.py"
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
data = mod.run()
path = "/workspace/scripts/_k2v_out.json"
with open(path, "w", encoding="utf-8") as f:
	json.dump(data, f, indent=2, default=str, ensure_ascii=False)
print(json.dumps({"wrote": path, "diffs": data.get("diffs"), "today": data.get("today_weekday")}, indent=2))
PY
test -f "$OUT"
echo "OK: $OUT"
