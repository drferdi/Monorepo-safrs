"""Test minimum-clinical-context-capture feature.

Verifies VAL-INTAKE-003: Case entry captures minimum clinical context
before polished output.

- Before recommendation, structured prompts capture chief complaint, duration,
  associated symptoms, red-flag clues, relevant allergies or medications,
  and vital-sign summary when known
- Structured prompts or explicit clarification questions appear before
  the final recommendation
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


class MinimumClinicalContextUnitTests(unittest.TestCase):
    """Unit tests for _input_kasus() in isolation."""

    def test_input_kasus_shows_intake_header(self):
        """_input_kasus prints a labeled intake panel before prompting."""
        cap, buf = _make_capture_console()
        inputs = iter(["", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_kasus("pasien demam 3 hari")

        output = buf.getvalue()
        self.assertIsInstance(result, dict)
        self.assertIn("INPUT DATA KASUS", output)
        self.assertIn("Enter untuk lewati", output)

    def test_input_kasus_prefills_keluhan_utama(self):
        """The initial complaint is auto-filled as keluhan utama."""
        cap, buf = _make_capture_console()
        inputs = iter(["", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_kasus("pasien demam 3 hari")

        self.assertEqual(result.get("keluhan"), "pasien demam 3 hari")

    def test_input_kasus_all_fields_present(self):
        """Every field label appears in the case intake output."""
        cap, buf = _make_capture_console()
        inputs = iter(["", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                m._input_kasus("pasien demam 3 hari")

        output = buf.getvalue()
        expected_labels = [
            "Keluhan utama",
            "Durasi",
            "Gejala penyerta",
            "Tanda bahaya",
            "Tanda vital",
        ]
        for label in expected_labels:
            self.assertIn(label, output, f"Label '{label}' should appear in output")

    def test_input_kasus_skip_all_except_keluhan(self):
        """Skipping all optional fields returns dict with only keluhan."""
        cap, buf = _make_capture_console()
        inputs = iter(["", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_kasus("pasien demam 3 hari")

        self.assertIsInstance(result, dict)
        self.assertEqual(result.get("keluhan"), "pasien demam 3 hari")
        self.assertNotIn("durasi", result)
        self.assertNotIn("gejala", result)
        self.assertNotIn("redflag", result)
        self.assertNotIn("vital", result)

    def test_input_kasus_selesai_exits_early(self):
        """Typing 'selesai' at any prompt exits intake immediately."""
        cap, buf = _make_capture_console()
        inputs = iter(["3 hari", "selesai", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_kasus("pasien demam")

        self.assertEqual(result.get("keluhan"), "pasien demam")
        self.assertEqual(result.get("durasi"), "3 hari")
        self.assertNotIn("gejala", result)
        self.assertNotIn("vital", result)

    def test_input_kasus_skip_exits_early(self):
        """Typing 'skip' at any prompt exits intake immediately."""
        cap, buf = _make_capture_console()
        inputs = iter(["1 minggu", "batuk, pilek", "skip", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_kasus("pasien demam")

        self.assertEqual(result.get("durasi"), "1 minggu")
        self.assertEqual(result.get("gejala"), "batuk, pilek")
        self.assertNotIn("redflag", result)

    def test_input_kasus_done_exits_early(self):
        """Typing 'done' at any prompt exits intake immediately."""
        cap, buf = _make_capture_console()
        inputs = iter(["2 hari", "done", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_kasus("pasien demam")

        self.assertEqual(result.get("durasi"), "2 hari")
        self.assertNotIn("gejala", result)

    def test_input_kasus_partial_fill_works(self):
        """Filling some fields works without crash."""
        cap, buf = _make_capture_console()
        inputs = iter(["5 hari", "", "nyeri kepala hebat, kaku kuduk", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_kasus("pasien demam tinggi")

        self.assertEqual(result.get("keluhan"), "pasien demam tinggi")
        self.assertEqual(result.get("durasi"), "5 hari")
        self.assertEqual(result.get("redflag"), "nyeri kepala hebat, kaku kuduk")
        self.assertNotIn("gejala", result)
        self.assertNotIn("vital", result)

    def test_input_kasus_full_fill_works(self):
        """Filling all fields returns a complete dict."""
        cap, buf = _make_capture_console()
        inputs = iter(
            [
                "3 hari",
                "mual, muntah, nyeri ulu hati",
                "riwayat NSAID, hematemesis",
                "TD 100/70, Nadi 100, RR 22, Suhu 37.5",
            ]
        )

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_kasus("pasien nyeri perut")

        self.assertEqual(result.get("keluhan"), "pasien nyeri perut")
        self.assertEqual(result.get("durasi"), "3 hari")
        self.assertEqual(result.get("gejala"), "mual, muntah, nyeri ulu hati")
        self.assertEqual(result.get("redflag"), "riwayat NSAID, hematemesis")
        self.assertEqual(result.get("vital"), "TD 100/70, Nadi 100, RR 22, Suhu 37.5")

    def test_input_kasus_shows_summary_after_intake(self):
        """After filling fields, a RINGKASAN DATA KASUS panel is shown."""
        cap, buf = _make_capture_console()
        inputs = iter(["3 hari", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                m._input_kasus("pasien demam")

        output = buf.getvalue()
        self.assertIn("RINGKASAN DATA KASUS", output)

    def test_input_kasus_shows_skipped_fields_in_summary(self):
        """Skipped fields show as '(dilewati)' in the summary panel."""
        cap, buf = _make_capture_console()
        inputs = iter(["3 hari", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                m._input_kasus("pasien demam")

        output = buf.getvalue()
        self.assertIn("dilewati", output)

    def test_input_kasus_with_empty_complaint(self):
        """Empty initial complaint still shows intake without crash.

        When initial_complaint is empty, keluhan is NOT prefilled and the user
        must enter it manually (or skip it). This test provides 5 inputs:
        keluhan, durasi, gejala, redflag, vital (skip last two).
        """
        cap, buf = _make_capture_console()
        inputs = iter(["demam 3 hari", "3 hari", "batuk", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_kasus("")

        self.assertEqual(result.get("keluhan"), "demam 3 hari")
        self.assertEqual(result.get("durasi"), "3 hari")
        self.assertEqual(result.get("gejala"), "batuk")

    def test_input_kasus_shows_pasien_allergies(self):
        """When pasien has alergi data, it is shown before case prompts."""
        cap, buf = _make_capture_console()
        inputs = iter(["", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                m._input_kasus("pasien demam", pasien={"alergi": "penisilin"})

        output = buf.getvalue()
        self.assertIn("penisilin", output)

    def test_input_kasus_shows_pasien_medications(self):
        """When pasien has obat data, it is shown before case prompts."""
        cap, buf = _make_capture_console()
        inputs = iter(["", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                m._input_kasus("pasien demam", pasien={"obat": "amlodipine"})

        output = buf.getvalue()
        self.assertIn("amlodipine", output)

    def test_input_kasus_no_pasien_context_when_none(self):
        """When pasien is None/empty, no allergy/medication lines appear."""
        cap, buf = _make_capture_console()
        inputs = iter(["", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                m._input_kasus("pasien demam", pasien=None)

        output = buf.getvalue()
        self.assertNotIn("Alergi diketahui", output)
        self.assertNotIn("Obat diketahui", output)


class BuildCasePromptTests(unittest.TestCase):
    """Unit tests for _build_case_prompt()."""

    def test_build_case_prompt_includes_keluhan(self):
        """The prompt includes chief complaint."""
        kasus = {"keluhan": "pasien demam 3 hari"}
        prompt = m._build_case_prompt(kasus, {})
        self.assertIn("KELUHAN UTAMA: pasien demam 3 hari", prompt)

    def test_build_case_prompt_includes_durasi(self):
        """The prompt includes duration."""
        kasus = {"keluhan": "demam", "durasi": "5 hari"}
        prompt = m._build_case_prompt(kasus, {})
        self.assertIn("DURASI: 5 hari", prompt)

    def test_build_case_prompt_includes_gejala(self):
        """The prompt includes associated symptoms."""
        kasus = {"keluhan": "demam", "gejala": "batuk, pilek"}
        prompt = m._build_case_prompt(kasus, {})
        self.assertIn("GEJALA PENYERTA: batuk, pilek", prompt)

    def test_build_case_prompt_includes_redflag(self):
        """The prompt includes red flag clues."""
        kasus = {"keluhan": "demam", "redflag": "kaku kuduk"}
        prompt = m._build_case_prompt(kasus, {})
        self.assertIn("TANDA BAHAYA: kaku kuduk", prompt)

    def test_build_case_prompt_includes_vital(self):
        """The prompt includes vital signs."""
        kasus = {"keluhan": "demam", "vital": "TD 120/80"}
        prompt = m._build_case_prompt(kasus, {})
        self.assertIn("TANDA VITAL: TD 120/80", prompt)

    def test_build_case_prompt_includes_pasien_alergi(self):
        """The prompt includes patient allergies."""
        kasus = {"keluhan": "demam"}
        pasien = {"alergi": "penisilin"}
        prompt = m._build_case_prompt(kasus, pasien)
        self.assertIn("ALERGI PASIEN: penisilin", prompt)

    def test_build_case_prompt_includes_pasien_obat(self):
        """The prompt includes patient medications."""
        kasus = {"keluhan": "demam"}
        pasien = {"obat": "amlodipine"}
        prompt = m._build_case_prompt(kasus, pasien)
        self.assertIn("OBAT PASIEN: amlodipine", prompt)

    def test_build_case_prompt_omits_empty_fields(self):
        """Empty/unset fields are not included in prompt."""
        kasus = {"keluhan": "demam"}
        prompt = m._build_case_prompt(kasus, {})
        self.assertNotIn("DURASI:", prompt)
        self.assertNotIn("GEJALA PENYERTA:", prompt)
        self.assertNotIn("TANDA BAHAYA:", prompt)
        self.assertNotIn("TANDA VITAL:", prompt)

    def test_build_case_prompt_fallback_to_keluhan(self):
        """When only keluhan is present, it still produces a valid prompt."""
        kasus = {"keluhan": "pasien demam"}
        prompt = m._build_case_prompt(kasus, {})
        self.assertIn("KELUHAN UTAMA", prompt)

    def test_build_case_prompt_empty_kasus(self):
        """Empty kasus dict returns empty string."""
        prompt = m._build_case_prompt({}, {})
        self.assertEqual(prompt, "")


class MinimumClinicalContextIntegrationTests(unittest.TestCase):
    """VAL-INTAKE-003: Integration tests — case intake before recommendation."""

    def test_complaint_triggers_case_intake_before_recommendation(self):
        """Entering a complaint shows case intake panel before calling _chat."""
        input_sequence = [
            "",  # default backend
            "pasien demam 3 hari",
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
        # Case intake panel should appear before the simulated response
        self.assertIn("INPUT DATA KASUS", output)
        # Summary should show the keluhan was captured
        self.assertIn("RINGKASAN DATA KASUS", output)

    def test_case_intake_before_chat_call_order(self):
        """Verify _input_kasus is called before _chat for clinical input."""
        input_sequence = [
            "",  # default backend
            "pasien demam 3 hari",
            "3 hari",
            "batuk",
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
            patch.object(m, "_chat", return_value="SIMULATED RESPONSE") as mock_chat,
        ):
            try:
                m.main()
            except StopIteration:
                pass

        # _chat should have been called at least once
        self.assertTrue(mock_chat.called)
        # The prompt passed to _chat should include the structured case context
        call_args = mock_chat.call_args
        prompt_arg = call_args[0][0] if call_args else ""
        self.assertIn("KELUHAN UTAMA", prompt_arg)
        self.assertIn("DURASI: 3 hari", prompt_arg)
        self.assertIn("GEJALA PENYERTA: batuk", prompt_arg)

    def test_case_intake_completes_and_exits_cleanly(self):
        """After case intake and simulated response, CLI exits cleanly."""
        input_sequence = [
            "",  # default backend
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
            patch.object(m, "_chat", return_value="SIMULATED RESPONSE"),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        self.assertIn("Keluar", output)

    def test_pasien_then_complaint_carries_context(self):
        """Patient data entered before complaint appears in case intake."""
        input_sequence = [
            "",  # default backend
            "/pasien",
            "Budi",  # nama
            "45",  # umur
            "L",  # jk
            "",  # bb (skip)
            "",  # tb (skip)
            "penisilin",  # alergi
            "",  # obat (skip)
            "",  # komorbid (skip)
            "pasien demam 5 hari",
            "5 hari",  # durasi
            "",
            "",
            "",  # skip rest
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
        # Case intake panel appears
        self.assertIn("INPUT DATA KASUS", output)
        # Patient allergy context shown during case intake
        self.assertIn("penisilin", output)

    def test_help_command_skips_case_intake(self):
        """Slash commands like /help do not trigger case intake."""
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
        # Help output appears but case intake does not
        self.assertIn("/pasien", output)
        self.assertNotIn("INPUT DATA KASUS", output)

    def test_backend_not_ready_skips_both_intake_and_chat(self):
        """When backend is not ready, error is shown and clinical flow is blocked.

        The backend-not-ready check fires before _input_kasus or _chat, so
        the doctor sees the error and no partial clinical output is produced.
        """
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
        # Backend not ready error should appear (both at startup and when complaint entered)
        self.assertIn("tidak siap", output.lower())
        # _chat should NOT have been called since backend is not ready
        mock_chat.assert_not_called()

    def test_multiple_complaints_each_have_intake(self):
        """Each new complaint triggers case intake."""
        input_sequence = [
            "",  # default backend
            "pasien demam",
            "",
            "",
            "",
            "",  # skip all
            "pasien batuk",
            "",
            "",
            "",
            "",  # skip all
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
        # RINGKASAN DATA KASUS appears twice (once per complaint)
        self.assertGreaterEqual(output.count("RINGKASAN DATA KASUS"), 2)


if __name__ == "__main__":
    unittest.main()
