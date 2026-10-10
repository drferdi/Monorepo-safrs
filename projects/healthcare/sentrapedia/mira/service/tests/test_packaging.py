"""Snapshot and runtime closure integrity, independent of the external MIRA folder."""
import hashlib
import importlib.metadata
import json
from pathlib import Path

from service.menu import planning_menu_text
from routines import ROUTINE_PROMPT

ROOT = Path(__file__).resolve().parents[2]

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def test_packaged_engine_and_schemas_match_the_recorded_source():
    manifest = json.loads((ROOT / "SOURCE.json").read_text(encoding="utf-8"))
    for item in manifest["files"]:
        assert sha256(ROOT / item["path"]) == item["packagedSha256"], item["path"]
        if item["path"] not in ["service/__init__.py", "service/menu.py", "service/tests/test_components.py", "service/tests/test_data_policy.py", "routines.py", "config.py"]:
            assert item["packagedSha256"] == item["sourceSha256"]
    for name, digest in manifest["snapshotHashes"].items():
        assert sha256(ROOT / name) == digest
    assert hashlib.sha256(planning_menu_text().encode()).hexdigest() == manifest["planningMenuSha256"]
    assert hashlib.sha256(ROUTINE_PROMPT.encode()).hexdigest() == manifest["routinePromptSha256"]

def test_installed_runtime_matches_the_pinned_dependency_closure():
    for line in (ROOT / "requirements.lock").read_text().splitlines():
        if "==" in line:
            name, version = line.split("==")
            assert importlib.metadata.version(name) == version
