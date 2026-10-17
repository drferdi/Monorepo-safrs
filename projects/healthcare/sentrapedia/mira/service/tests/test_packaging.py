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

def test_pinned_files_match_upstream_and_capsule_owned_files_carry_no_pin():
    """Since 2026-10-17 the capsule owns every file that diverged from upstream (Gaffer's choice A): such an entry keeps
    its origin and origin hash but has no packaged hash. Every other entry must still be byte-identical to upstream."""
    manifest = json.loads((ROOT / "SOURCE.json").read_text(encoding="utf-8"))
    for item in manifest["files"]:
        assert (ROOT / item["path"]).is_file(), item["path"]
        if item.get("owner") == "capsule":
            assert "packagedSha256" not in item, item["path"]
        else:
            assert sha256(ROOT / item["path"]) == item["packagedSha256"] == item["sourceSha256"], item["path"]
    owned = {item["path"] for item in manifest["files"] if item.get("owner") == "capsule"}
    assert {"common/providers.py", "common/guard.py", "service/settings.py"}.isdisjoint(owned)
    for name, digest in manifest["snapshotHashes"].items():
        assert sha256(ROOT / name) == digest
    assert hashlib.sha256(planning_menu_text().encode()).hexdigest() == manifest["planningMenuSha256"]
    assert hashlib.sha256(ROUTINE_PROMPT.encode()).hexdigest() == manifest["routinePromptSha256"]

def test_installed_runtime_matches_the_pinned_dependency_closure():
    for line in (ROOT / "requirements.lock").read_text().splitlines():
        if "==" in line:
            name, version = line.split("==")
            assert importlib.metadata.version(name) == version
