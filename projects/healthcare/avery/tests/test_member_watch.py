"""Uji perbandingan snapshot anggota (scripts/member_watch.py)."""

import importlib.util
import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location(
    "member_watch", REPO_ROOT / "scripts" / "member_watch.py")
member_watch = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(member_watch)


class DiffTests(unittest.TestCase):
    def test_jalankan_pertama_kosong(self):
        self.assertEqual(member_watch.diff_snapshots({}, {"g": {"a"}}), [])
        self.assertEqual(member_watch.format_report([]), "")

    def test_tanpa_perubahan_kosong(self):
        snap = {"g": {"a", "b"}}
        self.assertEqual(member_watch.diff_snapshots(snap, snap), [])

    def test_anggota_baru_dilaporkan_sebagai_kandidat(self):
        new = member_watch.diff_snapshots({"g": {"a"}}, {"g": {"a", "628123456789"}})
        self.assertEqual(new, [("g", "628123456789")])
        report = member_watch.format_report(new)
        self.assertIn("kandidat", report)
        self.assertNotIn("628123456789", report)
        self.assertIn("...6789", report)

    def test_anggota_hilang_tidak_dilaporkan(self):
        self.assertEqual(member_watch.diff_snapshots({"g": {"a", "b"}}, {"g": {"a"}}), [])


class CliTests(unittest.TestCase):
    def test_save_menulis_snapshot_atomik(self):
        with tempfile.TemporaryDirectory() as d:
            cur = Path(d) / "cur.json"; prev = Path(d) / "prev.json"
            cur.write_text(json.dumps({"g": ["a"]}), encoding="utf-8")
            out = io.StringIO()
            with redirect_stdout(out):
                rc = member_watch.main(["--current", str(cur), "--previous", str(prev), "--save"])
            self.assertEqual(rc, 0)
            self.assertEqual(out.getvalue(), "")
            self.assertEqual(json.loads(prev.read_text(encoding="utf-8")), {"g": ["a"]})
            self.assertFalse(list(Path(d).glob("*.tmp")))

    def test_masukan_rusak_keluar_1(self):
        with tempfile.TemporaryDirectory() as d:
            cur = Path(d) / "cur.json"; cur.write_text("{bukan json", encoding="utf-8")
            with redirect_stdout(io.StringIO()):
                self.assertEqual(member_watch.main(["--current", str(cur)]), 1)


if __name__ == "__main__":
    unittest.main()
