#!/usr/bin/env python3
"""Enforce the custom-app dependency direction defined in ADR-0001.

Rules (docs/adr/0001-custom-app-boundaries.md):

1. Dependency direction:
       core <- hospital, indonesia <- integrations, portal
   - core depends on no other custom app
   - hospital / indonesia may depend only on core, and must NEVER import
     from integrations or portal
   - integrations / portal may depend on core, hospital, indonesia
   (portal <-> integrations has no edge in the ADR diagram; if that edge
   becomes necessary, amend ADR-0001 first, then update ALLOWED_DEPS.)

2. Cross-app imports must go through the target app's explicit public
   surface: `<app>.public_api` (or Frappe hooks, which are strings and
   therefore not flagged here). Importing another app's internals directly
   is a violation even when the direction is allowed.

Static AST scan only — no Frappe/bench required. Run from anywhere:

    python3 scripts/check_app_boundaries.py

Exit code 0 = clean, 1 = violations found, 2 = scan error.
"""

from __future__ import annotations

import ast
import sys
from pathlib import Path

BENCH_ROOT = Path(__file__).resolve().parent.parent
APPS_DIR = BENCH_ROOT / "apps"

CUSTOM_APPS = [
    "sentra_mantra_core",
    "sentra_mantra_hospital",
    "sentra_mantra_indonesia",
    "sentra_mantra_integrations",
    "sentra_mantra_portal",
]

# ADR-0001 §2 — which custom apps each app may import from.
ALLOWED_DEPS = {
    "sentra_mantra_core": set(),
    "sentra_mantra_hospital": {"sentra_mantra_core"},
    "sentra_mantra_indonesia": {"sentra_mantra_core"},
    "sentra_mantra_integrations": {
        "sentra_mantra_core",
        "sentra_mantra_hospital",
        "sentra_mantra_indonesia",
    },
    "sentra_mantra_portal": {
        "sentra_mantra_core",
        "sentra_mantra_hospital",
        "sentra_mantra_indonesia",
    },
}

PUBLIC_SURFACE = "public_api"

SKIP_DIRS = {".git", "node_modules", "__pycache__", "dist", ".venv", "env"}


def iter_py_files(app_root: Path):
    for path in app_root.rglob("*.py"):
        if not SKIP_DIRS.intersection(path.relative_to(app_root).parts):
            yield path


def imported_modules(tree: ast.AST):
    """Yield (module_path, lineno) for every import in the tree."""
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                yield alias.name, node.lineno
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            yield node.module, node.lineno


def check_app(app: str) -> tuple[list[str], int]:
    app_root = APPS_DIR / app
    violations = []
    files_scanned = 0
    for py_file in iter_py_files(app_root):
        files_scanned += 1
        try:
            tree = ast.parse(py_file.read_text(encoding="utf-8"))
        except (SyntaxError, UnicodeDecodeError) as exc:
            violations.append(f"{py_file}: unparseable ({exc.__class__.__name__})")
            continue
        rel = py_file.relative_to(BENCH_ROOT)
        for module, lineno in imported_modules(tree):
            parts = module.split(".")
            target = parts[0]
            if target == app or target not in CUSTOM_APPS:
                continue
            if target not in ALLOWED_DEPS[app]:
                violations.append(
                    f"{rel}:{lineno}: {app} must not depend on {target} "
                    f"(ADR-0001 §2 dependency direction)"
                )
            elif len(parts) < 2 or parts[1] != PUBLIC_SURFACE:
                violations.append(
                    f"{rel}:{lineno}: import of {module} bypasses "
                    f"{target}.{PUBLIC_SURFACE} (ADR-0001 §2 public surface rule)"
                )
    return violations, files_scanned


def main() -> int:
    missing = [app for app in CUSTOM_APPS if not (APPS_DIR / app).is_dir()]
    if missing:
        print(f"ERROR: custom app(s) not found under {APPS_DIR}: {', '.join(missing)}")
        return 2

    all_violations = []
    total_files = 0
    for app in CUSTOM_APPS:
        violations, files_scanned = check_app(app)
        all_violations.extend(violations)
        total_files += files_scanned

    if all_violations:
        print(f"ADR-0001 boundary violations ({len(all_violations)}):")
        for violation in all_violations:
            print(f"  {violation}")
        print("\nFix the import, or amend docs/adr/0001-custom-app-boundaries.md first.")
        return 1

    print(f"OK: {total_files} files across {len(CUSTOM_APPS)} custom apps, no boundary violations.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
