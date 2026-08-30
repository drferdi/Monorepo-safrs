"""Uji scripts/smoke_evidence.py terhadap state.db tiruan (skema messages Hermes)."""

import importlib.util
import io
import json
import sqlite3
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location(
    "smoke_evidence", REPO_ROOT / "scripts" / "smoke_evidence.py")
smoke_evidence = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(smoke_evidence)


def _make_db(path, rows):
    con = sqlite3.connect(path)
    con.execute(
        "CREATE TABLE messages (session_id TEXT, role TEXT, tool_call_id TEXT, "
        "tool_name TEXT, tool_calls TEXT, timestamp REAL, content TEXT)")
    con.executemany(
        "INSERT INTO messages (session_id, role, tool_call_id, tool_name, tool_calls, timestamp, content) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)", rows)
    con.commit()
    con.close()


def _run(db, since, expect):
    buf = io.StringIO()
    with redirect_stdout(buf):
        code = smoke_evidence.main(["--db", str(db), "--since", str(since), "--expect", expect])
    return code, json.loads(buf.getvalue().strip().splitlines()[-1])


class SmokeEvidenceTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Path(self.tmp.name) / "state.db"

    def tearDown(self):
        self.tmp.cleanup()

    def test_consumed_when_tool_result_followed_by_assistant(self):
        call = json.dumps([{"id": "c1", "function": {"name": "read_file", "arguments": "{}"}}])
        _make_db(self.db, [
            ("s1", "user", None, None, None, 100.0, "x"),
            ("s1", "assistant", None, None, call, 101.0, ""),
            ("s1", "tool", "c1", "read_file", None, 102.0, "{}"),
            ("s1", "assistant", None, None, None, 103.0, "selesai"),
        ])
        code, out = _run(self.db, 50, "read_file")
        self.assertEqual(code, 0)
        self.assertTrue(out["discoverable"])
        self.assertTrue(out["callable"])
        self.assertTrue(out["consumed"])
        self.assertEqual(out["session_id"], "s1")
        self.assertNotIn("content", out)

    def test_not_consumed_without_following_assistant(self):
        call = json.dumps([{"id": "c1", "function": {"name": "cronjob", "arguments": "{}"}}])
        _make_db(self.db, [
            ("s1", "assistant", None, None, call, 101.0, ""),
            ("s1", "tool", "c1", "cronjob", None, 102.0, "{}"),
        ])
        _, out = _run(self.db, 50, "cronjob")
        self.assertTrue(out["callable"])
        self.assertFalse(out["consumed"])

    def test_ignores_cron_sessions_and_old_rows(self):
        _make_db(self.db, [
            ("cron_abc", "tool", "c1", "terminal", None, 200.0, "{}"),
            ("old", "tool", "c2", "terminal", None, 10.0, "{}"),
        ])
        _, out = _run(self.db, 50, "terminal")
        self.assertIsNone(out["session_id"])
        self.assertFalse(out["discoverable"])


class PatchManifestTest(unittest.TestCase):
    """Manifest patch Hermes harus konsisten dengan berkas patch-nya."""

    def test_manifest_matches_patch(self):
        pdir = REPO_ROOT / "patches" / "hermes-0.20.5"
        manifest = json.loads((pdir / "manifest.json").read_text(encoding="utf-8"))
        specs = manifest.get("patches") or [manifest]
        self.assertTrue(specs)
        for spec in specs:
            patch_text = (pdir / spec["patch"]).read_text(encoding="utf-8")
            self.assertTrue(spec["files"])
            for entry in spec["files"]:
                self.assertIn(f"b/{entry['path']}", patch_text)
                for key in ("sha256_before", "sha256_after"):
                    self.assertRegex(entry[key], r"^[0-9a-f]{64}$")
                self.assertNotEqual(entry["sha256_before"], entry["sha256_after"])


if __name__ == "__main__":
    unittest.main()
