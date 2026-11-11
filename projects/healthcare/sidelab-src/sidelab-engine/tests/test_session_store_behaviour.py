# Architected and built by codieverse+.
import re
import tempfile
import unittest
from pathlib import Path

from sidelab.session_store import backend_label, get_session, list_sessions, save_session


def _write_session(directory: Path, name: str, session_id: str, patient: str = "") -> Path:
    lines = [f"SIDELAB Session {session_id}", "Tanggal: 27 September 2026 08:00"]
    if patient:
        lines.append(f"Pasien: {patient}")
    lines += ["", "=" * 60, "", "DOKTER:", "keluhan batuk", ""]
    path = directory / name
    path.write_text("\n".join(lines), encoding="utf-8")
    return path


class BackendLabelTests(unittest.TestCase):
    def test_known_backend_uses_registry_label(self):
        self.assertEqual(backend_label("local"), "Local Ollama")
        self.assertEqual(backend_label("deepseek"), "DeepSeek")

    def test_unknown_backend_falls_back_to_its_key(self):
        self.assertEqual(backend_label("mystery-backend"), "mystery-backend")


class SaveSessionBehaviourTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def test_save_creates_missing_directory_and_names_file_by_timestamp_and_id(self):
        target = self.root / "nested" / "sessions"

        path = save_session([], {}, "ABCD1234", sessions_dir=target)

        self.assertEqual(path.parent, target)
        self.assertRegex(path.name, r"^sidelab_\d{8}_\d{6}_ABCD1234\.txt$")
        self.assertTrue(path.exists())

    def test_save_omits_backend_model_and_patient_lines_when_not_provided(self):
        path = save_session(
            [{"role": "user", "content": "nyeri kepala"}],
            {},
            "S1",
            sessions_dir=self.root,
        )

        content = path.read_text(encoding="utf-8")
        self.assertTrue(content.startswith("SIDELAB Session S1\nTanggal: "))
        self.assertNotIn("Backend:", content)
        self.assertNotIn("Model:", content)
        self.assertNotIn("Pasien:", content)

    def test_save_labels_user_turns_as_dokter_and_other_turns_as_sidelab(self):
        history = [
            {"role": "user", "content": "demam tiga hari"},
            {"role": "assistant", "content": "Pantau suhu."},
            {"role": "system", "content": "catatan sistem"},
        ]

        path = save_session(history, {}, "S2", sessions_dir=self.root)

        body = path.read_text(encoding="utf-8").split("=" * 60, 1)[1]
        self.assertEqual(
            body,
            "\n\nDOKTER:\ndemam tiga hari\n\n"
            "SIDELAB:\nPantau suhu.\n\n"
            "SIDELAB:\ncatatan sistem\n\n",
        )

    def test_save_records_backend_label_and_model_in_header(self):
        path = save_session([], {}, "S4", backend="deepseek", model="deepseek-v4-flash", sessions_dir=self.root)

        header = path.read_text(encoding="utf-8").split("=" * 60, 1)[0]
        self.assertIn("\nBackend: DeepSeek\nModel: deepseek-v4-flash\n", header)

    def test_save_writes_unknown_backend_key_verbatim(self):
        path = save_session([], {}, "S3", backend="mystery", sessions_dir=self.root)

        self.assertIn("Backend: mystery\n", path.read_text(encoding="utf-8"))


class ListSessionsBehaviourTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def test_missing_directory_yields_empty_list(self):
        self.assertEqual(list_sessions(self.root / "absent"), [])

    def test_sessions_are_listed_newest_first_and_other_files_are_ignored(self):
        _write_session(self.root, "sidelab_20260101_080000_OLD.txt", "OLD")
        _write_session(self.root, "sidelab_20260927_090000_NEW.txt", "NEW")
        (self.root / "notes.txt").write_text("SIDELAB Session X", encoding="utf-8")
        (self.root / "sidelab_20260927_100000_BIN.log").write_text("x", encoding="utf-8")

        sessions = list_sessions(self.root)

        self.assertEqual([s["id"] for s in sessions], ["NEW", "OLD"])

    def test_listing_extracts_id_date_patient_and_preview(self):
        path = _write_session(
            self.root, "sidelab_20260927_090000_P1.txt", "P1", patient="nama: Pasien Uji | umur: 30"
        )

        (entry,) = list_sessions(self.root)

        self.assertEqual(entry["id"], "P1")
        self.assertEqual(entry["filename"], path.name)
        self.assertEqual(entry["date"], "27 September 2026 08:00")
        self.assertEqual(entry["patient"], "nama: Pasien Uji | umur: 30")
        self.assertEqual(entry["preview"], path.read_text(encoding="utf-8")[:200])

    def test_patient_summary_is_truncated_to_120_characters(self):
        _write_session(self.root, "sidelab_20260927_090000_P2.txt", "P2", patient="x" * 300)

        (entry,) = list_sessions(self.root)

        self.assertEqual(entry["patient"], "x" * 120)

    def test_unreadable_session_file_is_skipped_without_hiding_others(self):
        _write_session(self.root, "sidelab_20260927_090000_OK.txt", "OK")
        (self.root / "sidelab_20260927_100000_BAD.txt").write_bytes(b"\xff\xfe\xfa invalid")

        sessions = list_sessions(self.root)

        self.assertEqual([s["id"] for s in sessions], ["OK"])


class GetSessionBehaviourTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def test_returns_parsed_session_with_full_content(self):
        path = _write_session(self.root, "sidelab_20260927_090000_G1.txt", "G1")

        session = get_session(path.name, self.root)

        self.assertEqual(session["id"], "G1")
        self.assertEqual(session["filename"], path.name)
        self.assertEqual(session["date"], "27 September 2026 08:00")
        self.assertEqual(session["content"], path.read_text(encoding="utf-8"))

    def test_rejects_file_without_sidelab_prefix(self):
        (self.root / "secret.txt").write_text("SIDELAB Session X", encoding="utf-8")

        self.assertIsNone(get_session("secret.txt", self.root))

    def test_rejects_session_file_outside_the_sessions_directory(self):
        inner = self.root / "sessions"
        inner.mkdir()
        _write_session(self.root, "sidelab_20260927_090000_OUT.txt", "OUT")
        nested = inner / "sub"
        nested.mkdir()
        _write_session(nested, "sidelab_20260927_090000_SUB.txt", "SUB")

        self.assertIsNone(get_session("../sidelab_20260927_090000_OUT.txt", inner))
        self.assertIsNone(get_session("sub/sidelab_20260927_090000_SUB.txt", inner))

    def test_returns_none_for_missing_session_file(self):
        self.assertIsNone(get_session("sidelab_20260927_090000_NONE.txt", self.root))

    def test_saved_session_round_trips_through_get_session(self):
        path = save_session(
            [{"role": "user", "content": "sesak napas"}],
            {"nama": "Pasien Sintetis"},
            "RT01",
            sessions_dir=self.root,
        )

        session = get_session(path.name, self.root)

        self.assertEqual(session["id"], "RT01")
        self.assertIn("Pasien: nama: Pasien Sintetis\n", session["content"])
        self.assertRegex(session["date"], re.compile(r"\d{2} \S+ \d{4} \d{2}:\d{2}"))


if __name__ == "__main__":
    unittest.main()
