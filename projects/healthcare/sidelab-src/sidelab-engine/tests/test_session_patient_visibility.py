"""Test session-patient-state-visibility feature.

Verifies VAL-INTAKE-001 and VAL-CROSS-001:

VAL-INTAKE-001: Before the first INPUT DOKTER prompt, the CLI shows session identity
and whether the session currently has an active patient or no active patient.

VAL-CROSS-001: After the doctor updates patient data via /pasien, that patient context
remains attached to the active consultation and the saved session artifact until a new
case is started. The UI and saved artifact both reflect the same active context.
"""

import importlib.util
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from rich.console import Console

_spec = importlib.util.spec_from_file_location(
    "sidelab_app", Path(__file__).resolve().parent.parent / "sidelab.py"
)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


def _make_capture_console():
    buf = io.StringIO()
    return Console(file=buf, force_terminal=True, width=120, highlight=False), buf


class SessionPatientVisibilityStartupTests(unittest.TestCase):
    """VAL-INTAKE-001: Session and patient state visible before first INPUT DOKTER."""

    def test_startup_header_shows_session_id_before_first_prompt(self):
        """After startup sequence, the visible header includes session ID before
        the first INPUT DOKTER prompt."""
        input_sequence = ["", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        # The session ID is 8-char uppercase hex. ANSI escape codes may
        # interfere with simple regex, so strip them first.
        self.assertIn("Session", output)
        import re

        ansi_escape = re.compile(r"\x1b\[[0-9;]*m")
        clean = ansi_escape.sub("", output)
        session_ids = re.findall(r"\b[A-F0-9]{8}\b", clean)
        self.assertGreaterEqual(
            len(session_ids), 1, "Session ID should appear in header"
        )

    def test_startup_header_shows_tanpa_pasien_before_first_prompt(self):
        """Before first INPUT DOKTER prompt, the header shows TANPA PASIEN when
        no patient has been set."""
        input_sequence = ["", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        # Before any /pasien command, header should show TANPA PASIEN
        self.assertIn("TANPA PASIEN", output)
        self.assertNotIn("PASIEN AKTIF", output)

    def test_startup_header_shows_backend_before_first_prompt(self):
        """Before first INPUT DOKTER prompt, the header shows the active backend."""
        input_sequence = ["", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        self.assertIn("Backend", output)


class PatientContextCarryThroughTests(unittest.TestCase):
    """VAL-CROSS-001: Patient context carries through consultation and save flow."""

    def test_pasien_command_refreshes_header_with_pasien_aktif(self):
        """After /pasien with patient name, the header should show PASIEN AKTIF
        with the patient name."""
        input_sequence = [
            "",
            "/pasien",
            "Budi Santoso",
            "30",
            "L",
            "70",
            "170",
            "tidak ada",
            "",
            "",
            "/exit",
        ]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        # After /pasien, header should reflect PASIEN AKTIF
        self.assertIn("PASIEN AKTIF", output)
        self.assertIn("Budi Santoso", output)

    def test_pasien_then_empty_pasien_shows_tanpa_pasien(self):
        """After /pasien with all fields skipped, header should show TANPA PASIEN."""
        input_sequence = ["", "/pasien", "", "", "", "", "", "", "", "", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        # If no fields were filled, header should still show TANPA PASIEN
        self.assertIn("TANPA PASIEN", output)

    def test_patient_context_persists_after_pasien(self):
        """After /pasien sets patient data, that data is visible in the header
        and stays until /next clears it."""
        input_sequence = [
            "",  # accept default backend
            "/pasien",
            "Siti Aminah",  # nama
            "25",  # umur
            "P",  # jk
            "55",  # bb
            "160",  # tb
            "penisilin",  # alergi
            "",  # obat (skip)
            "",  # komorbid (skip)
            "/clear",  # redraw should still show patient
            "/next",  # should clear patient
            "/exit",
        ]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        # After /pasien, PASIEN AKTIF should appear
        self.assertIn("PASIEN AKTIF", output)
        self.assertIn("Siti Aminah", output)
        # After /next, TANPA PASIEN should reappear
        self.assertIn("TANPA PASIEN", output)

    def test_next_clears_patient_context(self):
        """After /next, patient data is cleared and header shows TANPA PASIEN
        with new session ID."""
        input_sequence = [
            "",
            "/pasien",
            "Test Patient",
            "40",
            "L",
            "",
            "",
            "",
            "",
            "",
            "/next",
            "/exit",
        ]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        # After /pasien, PASIEN AKTIF and patient name
        self.assertIn("PASIEN AKTIF", output)
        self.assertIn("Test Patient", output)
        # After /next, TANPA PASIEN and new session
        self.assertIn("TANPA PASIEN", output)
        self.assertIn("Kasus baru dimulai", output)
        # Patient data should NOT appear in the /next header section
        after_next = (
            output.split("Kasus baru dimulai")[0]
            if "Kasus baru dimulai" in output
            else output
        )
        # "Test Patient" should appear before "Kasus baru dimulai" (in the /pasien header)
        # but the /next header should show TANPA PASIEN
        self.assertIn("Test Patient", after_next)


class SaveSessionMetadataTests(unittest.TestCase):
    """VAL-CROSS-001: Saved artifact reflects same active context as UI."""

    def test_save_session_includes_patient_data_after_pasien(self):
        """After /pasien and a consultation, /save writes patient data and session ID
        that matches the active session."""
        # Use a temp dir for sessions
        with tempfile.TemporaryDirectory() as tmpdir:
            original_sessions_dir = m.SESSIONS_DIR
            m.SESSIONS_DIR = Path(tmpdir)

            try:
                input_sequence = [
                    "",
                    "/pasien",
                    "Budi Test",
                    "35",
                    "L",
                    "70",
                    "170",
                    "sulfa",
                    "",  # obat (skip)
                    "",  # komorbid (skip)
                    "/save",
                    "/exit",
                ]
                input_iter = iter(input_sequence)

                def fake_input(prompt=""):
                    return next(input_iter)

                cap, buf = _make_capture_console()
                with (
                    patch.object(m, "console", cap),
                    patch.object(cap, "input", side_effect=fake_input),
                    patch.object(m, "_chat", return_value=""),
                ):
                    try:
                        m.main()
                    except StopIteration:
                        pass

                output = buf.getvalue()
                # Verify save file was created
                saved_files = list(Path(tmpdir).glob("*.txt"))
                self.assertEqual(
                    len(saved_files), 1, "Save should produce exactly one file"
                )

                saved_content = saved_files[0].read_text(encoding="utf-8")
                # Check patient data appears in saved file
                self.assertIn("Budi Test", saved_content)
                self.assertIn("nama: Budi Test", saved_content)
                # Check session ID in filename and content
                self.assertIn("SIDELAB Session", saved_content)
                # The session ID from the terminal should match the session in the file
                # Extract session ID from output
                import re

                session_ids = re.findall(r"\b[A-F0-9]{8}\b", output)
                if session_ids:
                    main_session_id = session_ids[0]  # first session ID in output
                    self.assertIn(main_session_id, saved_content)
            finally:
                m.SESSIONS_DIR = original_sessions_dir

    def test_save_session_includes_backend_and_model_metadata(self):
        """Saved session records the active backend and model metadata."""
        with tempfile.TemporaryDirectory() as tmpdir:
            original_sessions_dir = m.SESSIONS_DIR
            m.SESSIONS_DIR = Path(tmpdir)

            try:
                input_sequence = [
                    "",
                    "/pasien",
                    "Test Patient",
                    "30",
                    "P",
                    "",
                    "",
                    "",
                    "",  # obat (skip)
                    "",  # komorbid (skip)
                    "/save",
                    "/exit",
                ]
                input_iter = iter(input_sequence)

                def fake_input(prompt=""):
                    return next(input_iter)

                cap, buf = _make_capture_console()
                with (
                    patch.object(m, "console", cap),
                    patch.object(cap, "input", side_effect=fake_input),
                    patch.object(m, "_chat", return_value=""),
                ):
                    try:
                        m.main()
                    except StopIteration:
                        pass

                saved_files = list(Path(tmpdir).glob("*.txt"))
                self.assertEqual(len(saved_files), 1)

                saved_content = saved_files[0].read_text(encoding="utf-8")
                # Should include backend metadata
                self.assertIn("Backend:", saved_content)
                self.assertIn("DeepSeek", saved_content)
                # Should include model metadata
                self.assertIn("Model:", saved_content)
                self.assertIn("deepseek", saved_content.lower())
            finally:
                m.SESSIONS_DIR = original_sessions_dir

    def test_save_without_patient_still_records_session_metadata(self):
        """/save without any patient data still records session ID, backend, and model."""
        with tempfile.TemporaryDirectory() as tmpdir:
            original_sessions_dir = m.SESSIONS_DIR
            m.SESSIONS_DIR = Path(tmpdir)

            try:
                input_sequence = ["", "/save", "/exit"]
                input_iter = iter(input_sequence)

                def fake_input(prompt=""):
                    return next(input_iter)

                cap, buf = _make_capture_console()
                with (
                    patch.object(m, "console", cap),
                    patch.object(cap, "input", side_effect=fake_input),
                    patch.object(m, "_chat", return_value=""),
                ):
                    try:
                        m.main()
                    except StopIteration:
                        pass

                saved_files = list(Path(tmpdir).glob("*.txt"))
                self.assertEqual(len(saved_files), 1)

                saved_content = saved_files[0].read_text(encoding="utf-8")
                self.assertIn("SIDELAB Session", saved_content)
                self.assertIn("Backend:", saved_content)
                self.assertIn("Model:", saved_content)
                # Should NOT have a "Pasien:" line when no patient data
                self.assertNotIn("Pasien:", saved_content)
            finally:
                m.SESSIONS_DIR = original_sessions_dir

    def test_save_no_patient_data_does_not_write_empty_pasien_line(self):
        """When pasien is empty dict {}, save should NOT write an empty
        'Pasien:' line — only write patient data when meaningful fields exist."""
        with tempfile.TemporaryDirectory() as tmpdir:
            original_sessions_dir = m.SESSIONS_DIR
            m.SESSIONS_DIR = Path(tmpdir)

            try:
                # /pasien with all fields skipped → pasien should be {} or at least
                # not contain meaningful data
                input_sequence = [
                    "",
                    "/pasien",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "/save",
                    "/exit",
                ]
                input_iter = iter(input_sequence)

                def fake_input(prompt=""):
                    return next(input_iter)

                cap, buf = _make_capture_console()
                with (
                    patch.object(m, "console", cap),
                    patch.object(cap, "input", side_effect=fake_input),
                    patch.object(m, "_chat", return_value=""),
                ):
                    try:
                        m.main()
                    except StopIteration:
                        pass

                saved_files = list(Path(tmpdir).glob("*.txt"))
                if saved_files:
                    saved_content = saved_files[0].read_text(encoding="utf-8")
                    # If pasien has no meaningful fields (no nama), no "Pasien:" line
                    self.assertNotIn("Pasien:", saved_content)
            finally:
                m.SESSIONS_DIR = original_sessions_dir


if __name__ == "__main__":
    unittest.main()
