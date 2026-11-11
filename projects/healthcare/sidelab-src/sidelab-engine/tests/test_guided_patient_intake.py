"""Test guided-patient-intake feature.

Verifies VAL-INTAKE-002: Patient intake is guided and safe to skip.

- The /pasien command presents labeled prompts for minimum stored patient facts
- The flow makes it clear that unknown fields may be skipped
- Skipping optional values does not crash the app or trap in a loop
- After completing intake, the doctor returns to the main prompt successfully
"""

import importlib.util
import io
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


class GuidedPatientIntakeTests(unittest.TestCase):
    """VAL-INTAKE-002: Patient intake is guided and safe to skip."""

    # ------------------------------------------------------------------
    # Unit tests for _input_pasien() in isolation
    # ------------------------------------------------------------------

    def test_input_pasien_shows_intake_header(self):
        """_input_pasien prints a labeled intake panel before prompting."""
        cap, buf = _make_capture_console()
        inputs = iter(["", "", "", "", "", "", "", ""])  # skip all

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        output = buf.getvalue()
        self.assertIsInstance(result, dict)
        self.assertEqual(len(result), 0)
        self.assertIn("INPUT DATA PASIEN", output)
        self.assertIn("Enter untuk lewati", output)

    def test_input_pasien_shows_prompt_labels(self):
        """Every field label appears in the intake output."""
        cap, buf = _make_capture_console()
        inputs = iter(["", "", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                m._input_pasien()

        output = buf.getvalue()
        expected_labels = [
            "Nama pasien",
            "Umur",
            "Jenis kelamin",
            "Berat badan",
            "Tinggi badan",
            "Alergi",
            "Obat",
            "Riwayat penyakit penyerta",
        ]
        for label in expected_labels:
            self.assertIn(label, output, f"Label '{label}' should appear in output")

    def test_input_pasien_skip_all_returns_empty_dict(self):
        """Skipping all fields returns an empty dict without crash."""
        cap, buf = _make_capture_console()
        inputs = iter(["", "", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertIsInstance(result, dict)
        self.assertEqual(len(result), 0)

    def test_input_pasien_selesai_exits_early(self):
        """Typing 'selesai' at any prompt exits intake immediately."""
        cap, buf = _make_capture_console()
        # Fill first field, then type 'selesai' at second
        inputs = iter(["Budi", "selesai", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertEqual(result.get("nama"), "Budi")
        # 'umur' and later fields should NOT be in result
        self.assertNotIn("umur", result)
        self.assertNotIn("jk", result)

    def test_input_pasien_skip_exits_early(self):
        """Typing 'skip' at any prompt exits intake immediately."""
        cap, buf = _make_capture_console()
        inputs = iter(["Ani", "25", "skip", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertEqual(result.get("nama"), "Ani")
        self.assertEqual(result.get("umur"), "25")
        self.assertNotIn("jk", result)

    def test_input_pasien_done_exits_early(self):
        """Typing 'done' at any prompt exits intake immediately."""
        cap, buf = _make_capture_console()
        inputs = iter(["Citra", "done", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertEqual(result.get("nama"), "Citra")
        self.assertNotIn("umur", result)

    def test_input_pasien_partial_fill_works(self):
        """Filling some fields and skipping others works without crash."""
        cap, buf = _make_capture_console()
        inputs = iter(["Dewi", "30", "P", "", "", "penisilin", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertEqual(result.get("nama"), "Dewi")
        self.assertEqual(result.get("umur"), "30")
        self.assertEqual(result.get("jk"), "P")
        self.assertNotIn("bb", result)
        self.assertNotIn("tb", result)
        self.assertEqual(result.get("alergi"), "penisilin")
        self.assertNotIn("obat", result)
        self.assertNotIn("komorbid", result)

    def test_input_pasien_full_fill_works(self):
        """Filling all fields returns a complete dict."""
        cap, buf = _make_capture_console()
        inputs = iter(
            [
                "Eko",
                "45",
                "L",
                "70",
                "170",
                "sulfa",
                "amlodipine 5mg",
                "hipertensi, DM tipe 2",
            ]
        )

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertEqual(result.get("nama"), "Eko")
        self.assertEqual(result.get("umur"), "45")
        self.assertEqual(result.get("jk"), "L")
        self.assertEqual(result.get("bb"), "70")
        self.assertEqual(result.get("tb"), "170")
        self.assertEqual(result.get("alergi"), "sulfa")
        self.assertEqual(result.get("obat"), "amlodipine 5mg")
        self.assertEqual(result.get("komorbid"), "hipertensi, DM tipe 2")

    def test_input_pasien_jk_normalizes_lowercase(self):
        """JK lowercase 'l' or 'p' is uppercased to 'L' or 'P'."""
        for raw, expected in [("l", "L"), ("p", "P"), ("L", "L"), ("P", "P")]:
            cap, buf = _make_capture_console()
            inputs = iter(["Test", "", raw, "", "", "", "", ""])

            with patch.object(m, "console", cap):
                with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                    result = m._input_pasien()

            self.assertEqual(
                result.get("jk"),
                expected,
                f"JK '{raw}' should normalize to '{expected}'",
            )

    def test_input_pasien_jk_nonstandard_shows_correction(self):
        """Non-standard JK values trigger a correction prompt and re-ask.

        After structured-input-validation, non-standard JK (not L or P) triggers
        a human-readable correction prompt and keeps the doctor on the JK field
        until a valid value or skip. This is safer than silently accepting nonsense.
        """
        cap, buf = _make_capture_console()
        # X is invalid → correction, then L is valid → accepted — 9 inputs total
        inputs = iter(["Test", "", "X", "L", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        output = buf.getvalue()
        self.assertEqual(result.get("jk"), "L")
        self.assertIn("Harus L atau P", output)

    def test_input_pasien_returns_empty_when_nothing_entered(self):
        """Empty input across all fields returns empty dict and shows a message."""
        cap, buf = _make_capture_console()
        inputs = iter(["", "", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        output = buf.getvalue()
        self.assertEqual(len(result), 0)
        self.assertIn("Tidak ada data pasien", output)

    def test_input_pasien_shows_summary_after_intake(self):
        """After filling fields, a RINGKASAN DATA PASIEN panel is shown."""
        cap, buf = _make_capture_console()
        inputs = iter(["Fajar", "", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        output = buf.getvalue()
        self.assertEqual(result.get("nama"), "Fajar")
        self.assertIn("RINGKASAN DATA PASIEN", output)

    def test_input_pasien_summary_shows_skipped_fields(self):
        """Skipped fields show as '(dilewati)' in the summary panel."""
        cap, buf = _make_capture_console()
        inputs = iter(["Gita", "", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                m._input_pasien()

        output = buf.getvalue()
        self.assertIn("dilewati", output)

    # ------------------------------------------------------------------
    # Integration tests via main() loop
    # ------------------------------------------------------------------

    def test_pasien_command_returns_to_main_prompt(self):
        """After /pasien completes, the startup message confirms main prompt is active.

        The captured output shows "Ketik keluhan pasien" (startup banner) before
        intake and "Data pasien tersimpan" after, proving the main loop continued
        through and past the /pasien command flow.
        """
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
        # Startup banner appears before intake
        self.assertIn("Ketik keluhan pasien", output)
        # "Tidak ada data pasien" confirms intake completed (all fields skipped)
        self.assertIn("Tidak ada data pasien", output)
        # Program exits cleanly (proves /exit was reached after /pasien)
        self.assertIn("Keluar", output)

    def test_pasien_command_fills_partial_and_continues(self):
        """Partial /pasien fill doesn't crash; doctor can continue to next command."""
        input_sequence = [
            "",  # default backend
            "/pasien",
            "Hadi",  # nama
            "",  # umur (skip)
            "",  # jk (skip)
            "",  # bb (skip)
            "",  # tb (skip)
            "",  # alergi (skip)
            "",  # obat (skip)
            "",  # komorbid (skip)
            "/help",  # show help to prove we returned to main prompt
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
        # Should show help (proves we returned to main prompt and /help works)
        self.assertIn("/pasien", output)
        self.assertIn("/help", output)
        # Should show "Data pasien tersimpan"
        self.assertIn("Data pasien tersimpan", output)

    def test_pasien_command_selesai_early_and_continues(self):
        """Typing 'selesai' during /pasien returns to main prompt.

        After entering 'Indah' for nama and 'selesai' at umur, the intake
        summary panel appears and the CLI continues to process /exit.
        """
        input_sequence = [
            "",
            "/pasien",
            "Indah",
            "selesai",  # exit early at umur
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
        # Summary panel confirms early exit with captured data
        self.assertIn("RINGKASAN DATA PASIEN", output)
        self.assertIn("Indah", output)
        # /exit was processed, proving the loop continued after early intake exit
        self.assertIn("Keluar", output)

    def test_pasien_command_empty_does_not_crash(self):
        """Empty /pasien (all skips) does not crash the CLI.

        Verifies that skipping every field returns to the main prompt cleanly
        and the CLI can process subsequent commands like /exit.
        """
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
            "",  # skip all 8 fields
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
        # Empty intake message confirms all fields were skipped without crash
        self.assertIn("Tidak ada data pasien", output)
        # /exit was processed, proving the loop continued after intake
        self.assertIn("Keluar", output)

    def test_pasien_then_complaint_works(self):
        """After /pasien with partial data, a complaint can be submitted without crash.

        The intake completes successfully and the CLI continues to process
        the subsequent complaint and /exit command.
        """
        input_sequence = [
            "",
            "/pasien",
            "Joko",
            "35",
            "L",
            "",
            "",
            "",
            "",
            "",  # partial fill
            "pasien demam 3 hari",  # submit complaint → triggers case intake
            "",  # durasi (skip)
            "",  # gejala (skip)
            "",  # redflag (skip)
            "",  # vital (skip)
            "/exit",
        ]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value="SIMULATED RESPONSE"),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        # Intake summary confirms patient data was stored
        self.assertIn("Data pasien tersimpan", output)
        self.assertIn("Joko", output)
        # Program exits cleanly after complaint processing
        self.assertIn("Keluar", output)

    def test_pasien_twice_overwrites_previous_data(self):
        """Running /pasien twice should replace previous patient data."""
        input_sequence = [
            "",
            "/pasien",
            "Kiki",
            "20",
            "P",
            "",
            "",
            "",
            "",
            "",  # first patient
            "/pasien",
            "Lala",
            "",
            "",
            "",
            "",
            "",
            "",
            "",  # second patient, only name
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
        # Second patient name should appear
        self.assertIn("Lala", output)
        # "Data pasien tersimpan" appears twice
        self.assertGreaterEqual(output.count("Data pasien tersimpan"), 2)

    def test_pasien_medications_field_present(self):
        """The intake shows a medications (obat) prompt."""
        cap, buf = _make_capture_console()
        inputs = iter(["", "", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                m._input_pasien()

        output = buf.getvalue()
        self.assertIn("Obat", output)

    def test_pasien_comorbid_field_present(self):
        """The intake shows a comorbidities (komorbid) prompt."""
        cap, buf = _make_capture_console()
        inputs = iter(["", "", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                m._input_pasien()

        output = buf.getvalue()
        self.assertIn("Riwayat penyakit penyerta", output)

    def test_build_system_includes_obat_and_komorbid(self):
        """_build_system includes obat and komorbid in the system prompt."""
        pasien = {
            "nama": "Test",
            "umur": "30",
            "obat": "paracetamol",
            "komorbid": "asma",
        }
        sys_prompt = m._build_system(pasien)
        self.assertIn("Obat dikonsumsi: paracetamol", sys_prompt)
        self.assertIn("Komorbid: asma", sys_prompt)

    def test_build_system_omits_missing_obat_komorbid(self):
        """_build_system does not include obat/komorbid when not in pasien dict."""
        pasien = {"nama": "Test", "umur": "30"}
        sys_prompt = m._build_system(pasien)
        self.assertNotIn("Obat dikonsumsi", sys_prompt)
        self.assertNotIn("Komorbid", sys_prompt)


if __name__ == "__main__":
    unittest.main()
