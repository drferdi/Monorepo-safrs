#!/usr/bin/env python3
"""Install the ADR-0001 boundary check as a git pre-commit hook in each
custom app repo (apps/sentra_mantra_*).

Git hooks live in .git/hooks and are NOT versioned, so every fresh clone of
a custom app must re-run this installer once:

    python3 scripts/install_boundary_hooks.py

Idempotent: re-running overwrites only hooks carrying our MARKER line; an
existing hand-written pre-commit hook is left untouched and reported so it
can be merged manually.
"""

from __future__ import annotations

import os
import stat
import sys
from pathlib import Path

BENCH_ROOT = Path(__file__).resolve().parent.parent

CUSTOM_APPS = [
    "sentra_mantra_core",
    "sentra_mantra_hospital",
    "sentra_mantra_indonesia",
    "sentra_mantra_integrations",
    "sentra_mantra_portal",
]

MARKER = "# ADR-0001-boundary-hook"

HOOK_BODY = f"""#!/bin/sh
{MARKER} — installed by scripts/install_boundary_hooks.py; do not edit by hand.
# Blocks commits in this app repo when any custom app violates the
# dependency direction / public-surface rules of ADR-0001.
# hooks -> .git -> <app> -> apps -> bench root (derived from this file's own
# location so the hook works no matter what directory it is invoked from)
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
BENCH_ROOT="$(cd "$HOOK_DIR/../../../.." && pwd)"
CHECKER="$BENCH_ROOT/scripts/check_app_boundaries.py"
if [ ! -f "$CHECKER" ]; then
    echo "pre-commit: boundary checker not found at $CHECKER — skipping (bench layout changed?)"
    exit 0
fi
# probe by actually executing: on Windows, the Microsoft Store "python3"
# alias stub passes `command -v` but cannot run anything
for PY in python3 python py; do
    if "$PY" -c "import sys" >/dev/null 2>&1; then
        exec "$PY" "$CHECKER"
    fi
done
echo "pre-commit: no working python interpreter found - cannot run ADR-0001 boundary check" >&2
exit 1
"""


def main() -> int:
    failures = []
    for app in CUSTOM_APPS:
        hooks_dir = BENCH_ROOT / "apps" / app / ".git" / "hooks"
        if not hooks_dir.is_dir():
            failures.append(f"{app}: no .git/hooks directory (not a git repo?)")
            continue
        hook_path = hooks_dir / "pre-commit"
        if hook_path.exists() and MARKER not in hook_path.read_text(encoding="utf-8"):
            failures.append(
                f"{app}: existing pre-commit hook is not ours — merge manually: {hook_path}"
            )
            continue
        hook_path.write_text(HOOK_BODY, encoding="utf-8", newline="\n")
        hook_path.chmod(hook_path.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        print(f"installed: {app}")

    if failures:
        print("\nNOT installed:")
        for failure in failures:
            print(f"  {failure}")
        return 1
    print("\nAll 5 custom app repos have the ADR-0001 pre-commit hook.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
