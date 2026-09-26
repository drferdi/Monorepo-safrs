#!/usr/bin/env python3
"""Static lifecycle checks for the SAFRS project contract (standard library only).

The real runtime is a Frappe bench in the dev container (`.devcontainer/`), built from the
upstream commits pinned in `bench-apps.lock.json`. These checks prove what can be proven
without Docker, MariaDB, or a bench: ADR-0001 boundaries, the upstream lock, the
compose file, and the absence of legacy paths.

    python scripts/capsule_check.py install|test|run|deploy-dry-run

Python syntax is checked by the contract `build` (`python -m compileall`).
"""

from __future__ import annotations

import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCK = ROOT / "bench-apps.lock.json"
COMPOSE = ROOT / ".devcontainer" / "docker-compose.yml"
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "env", "test-results", "playwright-report"}
TEXT_SUFFIXES = {".py", ".js", ".ts", ".mjs", ".json", ".md", ".sh", ".bat", ".yml", ".yaml", ".html", ".txt"}
SITE = "mantra.localhost"
sys.dont_write_bytecode = True

_spec = importlib.util.spec_from_file_location("check_app_boundaries", ROOT / "scripts" / "check_app_boundaries.py")
check_app_boundaries = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(check_app_boundaries)


def iter_files(base: Path, suffixes: set[str]):
    for path in base.rglob("*"):
        if path.is_file() and path.suffix in suffixes and not SKIP_DIRS.intersection(path.relative_to(ROOT).parts):
            yield path


def load_lock() -> dict:
    return json.loads(LOCK.read_text(encoding="utf-8"))


def python_in_range(spec: str) -> bool:
    """`spec` has the form '>=3.10,<3.15'."""
    low_major, low_minor, high_major, high_minor = map(
        int, re.fullmatch(r">=(\d+)\.(\d+),<(\d+)\.(\d+)", spec).groups()
    )
    return (low_major, low_minor) <= sys.version_info[:2] < (high_major, high_minor)


def install() -> list[str]:
    spec = load_lock()["bench"]["python"]
    if not python_in_range(spec):
        return [f"Python {sys.version.split()[0]} is outside the bench range {spec}."]
    missing = [app for app in check_app_boundaries.CUSTOM_APPS if not (ROOT / "apps" / app).is_dir()]
    if missing:
        return [f"Custom app folder missing: {', '.join(missing)}"]
    print(f"Python {sys.version.split()[0]} fits {spec}; the checks need no packages. "
          "A working bench is built in the dev container from bench-apps.lock.json.")
    return []


def check_lock() -> list[str]:
    errors = []
    for app in load_lock()["apps"]:
        name = app.get("name", "?")
        if not re.fullmatch(r"https://github\.com/[\w.-]+/[\w.-]+\.git", app.get("repository", "")):
            errors.append(f"bench-apps.lock.json: {name} has no public HTTPS repository URL.")
        if not re.fullmatch(r"[0-9a-f]{40}", app.get("commit", "")):
            errors.append(f"bench-apps.lock.json: {name} commit is not a full 40-character hash.")
        if not app.get("ref"):
            errors.append(f"bench-apps.lock.json: {name} has no ref.")
    return errors


def check_compose() -> list[str]:
    errors = []
    text = COMPOSE.read_text(encoding="utf-8")
    for image in re.findall(r"^\s*image:\s*(\S+)", text, re.MULTILINE):
        tag = image.rsplit(":", 1)[1] if ":" in image.rsplit("/", 1)[-1] else ""
        if tag in {"", "latest"}:
            errors.append(f"docker-compose.yml: image {image} is not pinned to a version tag.")
    for key, value in re.findall(r"^\s*-?\s*(\w*PASSWORD\w*)\s*[:=]\s*(.+)$", text, re.MULTILINE):
        if not value.strip().startswith("${"):
            errors.append(f"docker-compose.yml: {key} is a literal value, not an environment variable.")
    return errors


def check_legacy_paths() -> list[str]:
    pattern = re.compile(r"[A-Za-z]:[\\/]+Devops\b", re.IGNORECASE)
    errors = []
    for path in iter_files(ROOT, TEXT_SUFFIXES):
        if path == Path(__file__).resolve():
            continue
        if pattern.search(path.read_text(encoding="utf-8", errors="ignore")):
            errors.append(f"{path.relative_to(ROOT)}: hard-codes an absolute legacy path.")
    return errors


def check_app_json() -> list[str]:
    errors = []
    for path in iter_files(ROOT / "apps", {".json"}):
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            errors.append(f"{path.relative_to(ROOT)}: invalid JSON ({exc})")
    return errors


def test() -> list[str]:
    boundary_status = check_app_boundaries.main()
    errors = [] if boundary_status == 0 else ["ADR-0001 boundary check failed (see above)."]
    for name, check in [("upstream lock", check_lock), ("compose file", check_compose),
                        ("legacy paths", check_legacy_paths), ("app JSON", check_app_json)]:
        found = check()
        print(f"{name}: {'OK' if not found else f'{len(found)} problem(s)'}")
        errors.extend(found)
    return errors


def run() -> list[str]:
    procfile = ROOT / "Procfile"
    entries = [line.strip() for line in procfile.read_text(encoding="utf-8").splitlines() if line.strip()]
    bad = [line for line in entries if not line.split(":", 1)[1].strip().startswith("bench ")]
    if bad:
        return [f"Procfile entry does not start bench: {line}" for line in bad]
    print(f"Procfile defines {len(entries)} bench processes. Start the runtime with matra.bat "
          f"(Windows) or `docker compose -f .devcontainer/docker-compose.yml up -d` and "
          f"`bench start` inside the frappe container; the site is {SITE}.")
    return []


def deploy_dry_run() -> list[str]:
    lock = load_lock()
    print("Deployment plan (dry run, nothing is executed):")
    for app in lock["apps"]:
        print(f"  bench get-app {app['repository']} --branch {app['ref']}  # then checkout {app['commit']}")
    for app in check_app_boundaries.CUSTOM_APPS:
        print(f"  bench get-app ./apps/{app}")
    print(f"  bench --site {SITE} migrate  # only on a disposable or approved site, never a real hospital database")
    return []


COMMANDS = {"install": install, "test": test, "run": run, "deploy-dry-run": deploy_dry_run}


def main(argv: list[str]) -> int:
    if len(argv) != 1 or argv[0] not in COMMANDS:
        print(f"usage: python scripts/capsule_check.py {'|'.join(COMMANDS)}")
        return 2
    errors = COMMANDS[argv[0]]()
    for error in errors:
        print(f"ERROR: {error}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
