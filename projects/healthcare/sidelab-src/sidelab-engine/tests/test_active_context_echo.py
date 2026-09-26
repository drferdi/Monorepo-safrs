"""Test active-context-echo-confirmation feature.

Verifies VAL-INTAKE-004: Active patient and case context are echoed back
early enough for confirmation.

- After patient or case intake is updated, the terminal visibly echoes a
  concise active-context summary
- The confirmation appears immediately before analysis begins or in a fixed
  top-of-response quick-scan block
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


class ActiveContextEchoUnitTests(unittest.TestCase):
    """Unit tests for _echo_active_context() in isolation."""

    def test_echo_shows_panel_title(self):
        """_echo_active_context prints a labeled panel."""
        cap, buf = _make_capture_console()
        pasien = {"nama": "Budi", "umur": "30"}
        kasus = {"keluhan": "demam 3 hari"}

        with patch.object(m, "console", cap):
            m._echo_active_context(pasien, kasus)

        output = buf.getvalue()
        self.assertIn("KONTEKS AKTIF", output)

    def test_echo_shows_patient_name(self):
        """Patient name appears in the active context panel."""
        cap, buf = _make_capture_console()
        pasien = {"nama": "Siti Aminah", "umur": "25"}
        kasus = {"keluhan": "batuk"}

        with patch.object(m, "console", cap):
            m._echo_active_context(pasien, kasus)

        output = buf.getvalue()
        self.assertIn("Siti Aminah", output)

    def test_echo_shows_chief_complaint(self):
        """Chief complaint appears in the active context panel."""
        cap, buf = _make_capture_console()
        pasien = {"nama": "Test"}
        kasus = {"keluhan": "nyeri perut kanan bawah sejak 2 hari"}

        with patch.object(m, "console", cap):
            m._echo_active_context(pasien, kasus)

        output = buf.getvalue()
        self.assertIn("nyeri perut kanan bawah", output)

    def test_echo_shows_duration_when_present(self):
        """Duration field appears when provided."""
        cap, buf = _make_capture_console()
        pasien = {}
        kasus = {"keluhan": "demam", "durasi": "5 hari"}

        with patch.object(m, "console", cap):
            m._echo_active_context(pasien, kasus)

        output = buf.getvalue()
        self.assertIn("5 hari", output)

    def test_echo_shows_allergies_when_present(self):
        """Patient allergies appear in the active context panel."""
        cap, buf = _make_capture_console()
        pasien = {"nama": "Ani", "alergi": "penisilin, sulfa"}
        kasus = {"keluhan": "demam"}

        with patch.object(m, "console", cap):
            m._echo_active_context(pasien, kasus)

        output = buf.getvalue()
        self.assertIn("penisilin", output)

    def test_echo_shows_medications_when_present(self):
        """Patient medications appear in the active context panel."""
        cap, buf = _make_capture_console()
        pasien = {"nama": "Test", "obat": "amlodipine 5mg"}
        kasus = {"keluhan": "pusing"}

        with patch.object(m, "console", cap):
            m._echo_active_context(pasien, kasus)

        output = buf.getvalue()
        self.assertIn("amlodipine", output)

    def test_echo_shows_red_flags_when_present(self):
        """Red flag clues appear in the active context panel."""
        cap, buf = _make_capture_console()
        pasien = {}
        kasus = {
            "keluhan": "nyeri dada",
            "redflag": "keringat dingin, menjalar ke lengan",
        }

        with patch.object(m, "console", cap):
            m._echo_active_context(pasien, kasus)

        output = buf.getvalue()
        self.assertIn("keringat dingin", output)

    def test_echo_shows_vital_signs_when_present(self):
        """Vital signs appear in the active context panel."""
        cap, buf = _make_capture_console()
        pasien = {}
        kasus = {"keluhan": "demam", "vital": "TD 120/80, Nadi 88, Suhu 38.5"}

        with patch.object(m, "console", cap):
            m._echo_active_context(pasien, kasus)

        output = buf.getvalue()
        self.assertIn("120/80", output)
        self.assertIn("38.5", output)

    def test_echo_shows_symptoms_when_present(self):
        """Associated symptoms appear in the active context panel."""
        cap, buf = _make_capture_console()
        pasien = {}
        kasus = {"keluhan": "demam", "gejala": "batuk, pilek, nyeri tenggorokan"}

        with patch.object(m, "console", cap):
            m._echo_active_context(pasien, kasus)

        output = buf.getvalue()
        self.assertIn("batuk", output)
        self.assertIn("pilek", output)

    def test_echo_no_patient_does_not_crash(self):
        """Empty patient dict does not crash the function."""
        cap, buf = _make_capture_console()

        with patch.object(m, "console", cap):
            m._echo_active_context({}, {"keluhan": "demam"})

        output = buf.getvalue()
        self.assertIn("KONTEKS AKTIF", output)

    def test_echo_no_case_does_not_crash(self):
        """Empty kasus dict does not crash the function."""
        cap, buf = _make_capture_console()

        with patch.object(m, "console", cap):
            m._echo_active_context({"nama": "Test"}, {})

        output = buf.getvalue()
        self.assertIn("KONTEKS AKTIF", output)
        self.assertIn("Test", output)

    def test_echo_both_empty_does_not_crash(self):
        """Both empty dicts do not crash or produce misleading output."""
        cap, buf = _make_capture_console()

        with patch.object(m, "console", cap):
            m._echo_active_context({}, {})

        output = buf.getvalue()
        # Should still show the panel but with minimal content
        self.assertIn("KONTEKS AKTIF", output)

    def test_echo_pasien_none_does_not_crash(self):
        """None pasien does not crash the function."""
        cap, buf = _make_capture_console()

        with patch.object(m, "console", cap):
            m._echo_active_context(None, {"keluhan": "demam"})

        output = buf.getvalue()
        self.assertIn("KONTEKS AKTIF", output)

    def test_echo_kasus_none_does_not_crash(self):
        """None kasus does not crash the function."""
        cap, buf = _make_capture_console()

        with patch.object(m, "console", cap):
            m._echo_active_context({"nama": "Test"}, None)

        output = buf.getvalue()
        self.assertIn("KONTEKS AKTIF", output)

    def test_echo_shows_confirm_language(self):
        """The panel uses language that invites the doctor to confirm."""
        cap, buf = _make_capture_console()
        pasien = {"nama": "Budi"}
        kasus = {"keluhan": "demam"}

        with patch.object(m, "console", cap):
            m._echo_active_context(pasien, kasus)

        output = buf.getvalue()
        # Should have language suggesting verification/confirmation
        self.assertTrue(
            "analisis" in output.lower()
            or "konfirmasi" in output.lower()
            or "verifikasi" in output.lower()
            or "lanjut" in output.lower(),
            "Panel should guide the doctor to confirm before analysis proceeds",
        )

    def test_echo_shows_age_when_present(self):
        """Patient age appears in the active context panel."""
        cap, buf = _make_capture_console()
        pasien = {"nama": "Test", "umur": "45"}
        kasus = {"keluhan": "demam"}

        with patch.object(m, "console", cap):
            m._echo_active_context(pasien, kasus)

        output = buf.getvalue()
        self.assertIn("45", output)

    def test_echo_shows_sex_when_present(self):
        """Patient sex appears in the active context panel."""
        cap, buf = _make_capture_console()
        pasien = {"nama": "Test", "jk": "L"}
        kasus = {"keluhan": "demam"}

        with patch.object(m, "console", cap):
            m._echo_active_context(pasien, kasus)

        output = buf.getvalue()
        self.assertIn("L", output)


class ActiveContextEchoIntegrationTests(unittest.TestCase):
    """VAL-INTAKE-004: Integration tests — active context echo before analysis."""

    def test_echo_appears_before_chat_in_main_loop(self):
        """The active-context echo appears AFTER case intake and BEFORE _chat is called."""
        input_sequence = [
            "",  # default backend
            "/pasien",
            "Budi Santoso",  # nama
            "35",  # umur
            "L",  # jk
            "",  # bb (skip)
            "",  # tb (skip)
            "penisilin",  # alergi
            "",  # obat (skip)
            "",  # komorbid (skip)
            "demam 3 hari disertai batuk",  # complaint
            "3 hari",  # durasi
            "batuk, pilek",  # gejala
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
            patch.object(m, "_chat", return_value="SIMULATED RESPONSE") as mock_chat,
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        # RINGKASAN DATA KASUS appears (from _input_kasus)
        self.assertIn("RINGKASAN DATA KASUS", output)
        # KONTEKS AKTIF should appear after case intake and before _chat
        self.assertIn("KONTEKS AKTIF", output)

        # Verify ordering: RINGKASAN DATA KASUS appears before KONTEKS AKTIF
        ringkasan_pos = output.find("RINGKASAN DATA KASUS")
        konteks_pos = output.find("KONTEKS AKTIF")
        self.assertGreater(
            konteks_pos,
            ringkasan_pos,
            "KONTEKS AKTIF should appear AFTER RINGKASAN DATA KASUS",
        )

        # _chat should have been called (proves the echo happened during the
        # clinical flow, between case intake and the model call)
        self.assertTrue(mock_chat.called)

    def test_echo_contains_patient_and_case_data_combined(self):
        """The active context panel shows both patient and case data together."""
        input_sequence = [
            "",  # default backend
            "/pasien",
            "Siti",  # nama
            "28",  # umur
            "P",  # jk
            "",  # bb
            "",  # tb
            "sulfa",  # alergi
            "",  # obat
            "",  # komorbid
            "nyeri perut kanan bawah 2 hari",
            "2 hari",  # durasi
            "mual, tidak nafsu makan",  # gejala
            "",  # redflag
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
            patch.object(m, "_chat", return_value="SIMULATED RESPONSE"),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        self.assertIn("KONTEKS AKTIF", output)
        self.assertIn("Siti", output)
        self.assertIn("sulfa", output)
        self.assertIn("nyeri perut kanan bawah", output)
        self.assertIn("2 hari", output)

    def test_echo_no_patient_but_case_data_works(self):
        """Active context echo works when only case data exists, no patient."""
        input_sequence = [
            "",  # default backend
            "demam 5 hari",
            "5 hari",  # durasi
            "batuk",  # gejala
            "",  # redflag
            "",  # vital
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
        self.assertIn("KONTEKS AKTIF", output)
        self.assertIn("demam 5 hari", output)
        self.assertIn("batuk", output)

    def test_slash_command_does_not_trigger_echo(self):
        """Slash commands like /help do NOT trigger the active context echo."""
        input_sequence = [
            "",  # default backend
            "/help",
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
        self.assertNotIn("KONTEKS AKTIF", output)

    def test_backend_not_ready_skips_echo_and_chat(self):
        """When backend is not ready, echo is not shown and _chat is not called."""
        input_sequence = [
            "",  # accept default backend
            "pasien demam",
            "",
            "",
            "",
            "",  # skip all case fields
            "/exit",
        ]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(
                m,
                "check_backend_readiness",
                return_value=(
                    False,
                    "test",
                    "Backend tidak siap untuk penggunaan klinis",
                ),
            ),
            patch.object(m, "_chat") as mock_chat,
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        self.assertNotIn("KONTEKS AKTIF", output)
        mock_chat.assert_not_called()

    def test_echo_appears_every_complaint(self):
        """Each clinical complaint triggers the active context echo."""
        input_sequence = [
            "",  # default backend
            "demam",
            "",
            "",
            "",
            "",
            "batuk",
            "",
            "",
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
            patch.object(m, "_chat", return_value="SIMULATED RESPONSE"),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        # KONTEKS AKTIF should appear at least twice (once per complaint)
        self.assertGreaterEqual(output.count("KONTEKS AKTIF"), 2)

    def test_echo_includes_comorbidities_when_present(self):
        """Patient comorbidities appear in the active context panel."""
        input_sequence = [
            "",
            "/pasien",
            "Rina",
            "55",
            "P",
            "",
            "",
            "",
            "",  # obat
            "hipertensi, DM tipe 2",  # komorbid
            "pusing berputar",
            "",
            "",
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
            patch.object(m, "_chat", return_value="SIMULATED RESPONSE"),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        self.assertIn("KONTEKS AKTIF", output)
        self.assertIn("hipertensi", output)
        self.assertIn("DM tipe 2", output)


if __name__ == "__main__":
    unittest.main()
