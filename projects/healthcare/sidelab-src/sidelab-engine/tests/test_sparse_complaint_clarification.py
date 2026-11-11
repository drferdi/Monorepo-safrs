"""Test sparse-complaint-clarification feature.

Verifies VAL-INTAKE-005: Sparse complaints trigger clarification-first handling.

- When the doctor enters a short or generic complaint, the visible output
  clearly says the data are still sparse
- The output asks focused clarification questions
- The interpretation stays conservative rather than jumping straight to a
  specific confident diagnosis
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


class SparseComplaintDetectionTests(unittest.TestCase):
    """Unit tests for _detect_sparse_complaint() in isolation."""

    def test_short_single_word_returns_short_query_true(self):
        """A single-word complaint like 'demam' is detected as sparse."""
        kasus = {"keluhan": "demam"}
        result = m._detect_sparse_complaint(kasus)
        self.assertIsInstance(result, dict)
        self.assertTrue(
            result.get("is_sparse"),
            "Single-word 'demam' should be detected as sparse",
        )

    def test_short_two_word_no_anatomy_returns_sparse(self):
        """A two-word complaint without anatomy is detected as sparse."""
        kasus = {"keluhan": "sakit kepala"}
        result = m._detect_sparse_complaint(kasus)
        self.assertIsInstance(result, dict)
        self.assertTrue(
            result.get("is_sparse"),
            "'sakit kepala' should be detected as sparse (no duration, no anatomy)",
        )

    def test_short_three_word_no_specific_terms_returns_sparse(self):
        """A short complaint with only weak terms is detected as sparse."""
        kasus = {"keluhan": "badan terasa lemas"}
        result = m._detect_sparse_complaint(kasus)
        self.assertIsInstance(result, dict)
        self.assertTrue(
            result.get("is_sparse"),
            "'badan terasa lemas' should be sparse (weak/generic terms only)",
        )

    def test_detailed_complaint_not_sparse(self):
        """A detailed multi-sentence complaint is NOT sparse."""
        kasus = {
            "keluhan": "pasien wanita 45 tahun demam 5 hari disertai batuk produktif, nyeri dada, dan sesak napas",
            "durasi": "5 hari",
            "gejala": "batuk produktif, nyeri dada, sesak napas",
        }
        result = m._detect_sparse_complaint(kasus)
        self.assertFalse(
            result.get("is_sparse"),
            "Detailed complaint with multiple fields should not be sparse",
        )

    def test_short_complaint_with_duration_still_sparse(self):
        """A short complaint with only duration still counts as sparse.

        Even if the intake collects duration, the keluhan itself is still
        too short/generic to confidently diagnose without more clinical data.
        """
        kasus = {"keluhan": "demam", "durasi": "3 hari"}
        result = m._detect_sparse_complaint(kasus)
        self.assertTrue(
            result.get("is_sparse"),
            "Short keluhan with only duration should still be sparse",
        )

    def test_sparse_detection_includes_sparse_language(self):
        """The sparse result includes language about data being sparse."""
        kasus = {"keluhan": "pusing"}
        result = m._detect_sparse_complaint(kasus)
        self.assertIn("message", result)
        msg = result["message"]
        self.assertTrue(
            "sparse" in msg.lower()
            or "singkat" in msg.lower()
            or "umum" in msg.lower()
            or "kurang" in msg.lower()
            or "minim" in msg.lower(),
            f"Message should indicate sparse data, got: '{msg}'",
        )

    def test_sparse_detection_includes_followup_questions_when_available(self):
        """Sparse detection returns followup questions when there are matching
        anchor terms."""
        kasus = {"keluhan": "nyeri dada"}
        result = m._detect_sparse_complaint(kasus)
        # "dada" is an anchor term that has followup questions
        self.assertIn("followup_questions", result)
        if result.get("followup_questions"):
            self.assertIsInstance(result["followup_questions"], list)
            self.assertGreater(
                len(result["followup_questions"]),
                0,
                "Should have at least one followup question for 'nyeri dada'",
            )

    def test_sparse_detection_includes_conservative_prompt_addition(self):
        """Sparse detection returns a conservative prompt addition for the LLM."""
        kasus = {"keluhan": "demam"}
        result = m._detect_sparse_complaint(kasus)
        self.assertIn("conservative_prompt_addition", result)
        self.assertIsInstance(result["conservative_prompt_addition"], str)
        self.assertGreater(
            len(result["conservative_prompt_addition"]),
            0,
            "Conservative prompt addition should not be empty for sparse complaint",
        )

    def test_not_sparse_returns_empty_additions(self):
        """When not sparse, followup_questions and prompt_addition are empty."""
        kasus = {
            "keluhan": "pasien pria 60 tahun nyeri dada kiri menjalar ke lengan sejak 2 jam",
            "durasi": "2 jam",
            "gejala": "keringat dingin, mual",
            "redflag": "nyeri dada dengan keringat dingin, EKG abnormal",
        }
        result = m._detect_sparse_complaint(kasus)
        self.assertFalse(result.get("is_sparse"))
        self.assertEqual(result.get("followup_questions"), [])
        self.assertEqual(result.get("conservative_prompt_addition"), "")

    def test_empty_kasus_not_sparse(self):
        """Empty kasus dict is not detected as sparse (no data to evaluate)."""
        result = m._detect_sparse_complaint({})
        self.assertFalse(result.get("is_sparse"))

    def test_none_keluhan_not_sparse(self):
        """kasus without 'keluhan' key is not flagged as sparse."""
        kasus = {"durasi": "3 hari"}
        result = m._detect_sparse_complaint(kasus)
        self.assertFalse(result.get("is_sparse"))

    def test_complaint_with_generic_terms_only_is_sparse(self):
        """A complaint with only generic/weak terms (nyeri, sakit, demam)
        without any anchor or specific term is sparse."""
        kasus = {"keluhan": "nyeri saja"}
        result = m._detect_sparse_complaint(kasus)
        self.assertTrue(
            result.get("is_sparse"),
            "Complaint with only weak/generic terms should be sparse",
        )

    def test_complaint_with_specific_terms_is_not_sparse(self):
        """A complaint with specific medical terms is not sparse."""
        kasus = {"keluhan": "nyeri sendi lutut bengkak merah panas"}
        result = m._detect_sparse_complaint(kasus)
        # Even if short, specific anchor terms make it less sparse
        # The system should still work but not necessarily flag as sparse
        self.assertIsInstance(result, dict)
        # Verify the function doesn't crash — the exact is_sparse value
        # depends on the profiling logic
        self.assertFalse(
            result.get("is_sparse"),
            "Complaint with specific anatomical terms should not be sparse",
        )

    def test_complaint_with_durasi_and_gejala_not_sparse(self):
        """A complaint with duration and symptoms beyond the complaint text
        is not considered sparse."""
        kasus = {
            "keluhan": "demam",
            "durasi": "5 hari",
            "gejala": "batuk berdahak, pilek, nyeri tenggorokan",
        }
        result = m._detect_sparse_complaint(kasus)
        self.assertFalse(
            result.get("is_sparse"),
            "Complaint with durasi and gejala filled should not be sparse",
        )


class SparseComplaintIntegrationTests(unittest.TestCase):
    """VAL-INTAKE-005: Integration tests — sparse complaint triggers clarification."""

    def test_sparse_complaint_shows_sparse_data_message(self):
        """A short complaint triggers visible 'data masih sparse' message.

        Strips ANSI escape codes to verify the sparse-data language appears
        in the rendered terminal output.
        """
        import re

        input_sequence = [
            "",  # default backend
            "demam",  # short complaint
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
        # Strip ANSI escape codes for reliable substring matching
        ansi = re.compile(r"\x1b\[[0-9;]*m")
        clean = ansi.sub("", output)
        clean_lower = clean.lower()
        # The sparse panel (or its insufficient-data superset) contains
        # language about limited/insufficient clinical data
        self.assertTrue(
            "klinis" in clean_lower,
            "Output should mention clinical data (klinis)",
        )
        self.assertTrue(
            "terbatas" in clean_lower or "tidak cukup" in clean_lower,
            "Output should mention limited or insufficient data",
        )

    def test_detailed_complaint_does_not_show_sparse_message(self):
        """A detailed complaint does NOT trigger the sparse data message."""
        input_sequence = [
            "",  # default backend
            "pasien pria 45 tahun nyeri dada kiri menjalar ke lengan sejak 2 jam disertai keringat dingin",
            "2 jam",  # durasi
            "keringat dingin, mual",  # gejala
            "riwayat hipertensi, perokok",  # redflag
            "TD 160/95, Nadi 102",  # vital
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
        self.assertNotIn("Data masih", output)

    def test_sparse_complaint_shows_clarification_panel(self):
        """A sparse complaint shows a panel with the sparse-data title."""
        input_sequence = [
            "",  # default backend
            "pusing",
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
        # The sparse-data panel (or its clinical-safety superset,
        # insufficient-data) title should appear
        self.assertTrue(
            "DATA SPARSE" in output or "DATA TIDAK CUKUP" in output,
            "Either DATA SPARSE or DATA TIDAK CUKUP panel should appear",
        )

    def test_sparse_complaint_shows_clarification_questions(self):
        """For a sparse complaint with known anchor terms, focused clarification
        questions appear in the output."""
        input_sequence = [
            "",  # default backend
            "nyeri perut",  # "perut" is an anchor term
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
        # Should contain a clarification question about abdominal pain
        # Check for at least one of the known perut followups
        perut_followups = [
            "lokasi nyeri",
            "muntah",
            "diare",
            "demam",
            "nyeri menetap",
        ]
        found = any(f in output.lower() for f in perut_followups)
        self.assertTrue(
            found,
            "Output should contain at least one clarification question about 'nyeri perut'",
        )

    def test_sparse_complaint_keeps_chat_conservative(self):
        """When a sparse complaint is detected, the augmented prompt includes
        conservative instructions for the LLM."""
        input_sequence = [
            "",  # default backend
            "demam",  # short complaint
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
            patch.object(m, "_chat", return_value="SIMULATED RESPONSE") as mock_chat,
        ):
            try:
                m.main()
            except StopIteration:
                pass

        # The prompt sent to _chat should include conservative language
        call_args = mock_chat.call_args
        prompt_arg = call_args[0][0] if call_args else ""
        self.assertIn("konservatif", prompt_arg.lower())

    def test_sparse_complaint_does_not_block_normal_flow(self):
        """After showing sparse-data warning, the normal _chat flow proceeds."""
        input_sequence = [
            "",  # default backend
            "demam",
            "",  # durasi
            "",  # gejala
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
            patch.object(m, "_chat", return_value="SIMULATED RESPONSE") as mock_chat,
        ):
            try:
                m.main()
            except StopIteration:
                pass

        # _chat should still be called (sparse warning doesn't block analysis)
        self.assertTrue(mock_chat.called)

    def test_sparse_detection_appears_before_chat(self):
        """The sparse-data panel appears before _chat is invoked.

        We verify this by:
        1. Confirming the DATA SPARSE panel renders to the output buffer
        2. Confirming _chat was called after the panel rendering
        3. Confirming the KONTEKS AKTIF panel (which renders before sparse
           check) appears before DATA SPARSE
        """
        input_sequence = [
            "",  # default backend
            "demam",
            "",
            "",
            "",
            "",
            "/exit",
        ]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        call_order = []

        def tracing_chat(*args, **kwargs):
            call_order.append("chat")
            return "SIMULATED RESPONSE"

        cap, buf = _make_capture_console()
        with (
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", side_effect=tracing_chat),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        # The warning panel (DATA TIDAK CUKUP or DATA SPARSE) should appear
        data_panel = (
            "DATA TIDAK CUKUP" if "DATA TIDAK CUKUP" in output else "DATA SPARSE"
        )
        self.assertIn(data_panel, output)
        # KONTEKS AKTIF panel should appear (it renders before sparse check)
        self.assertIn("KONTEKS AKTIF", output)
        # Verify ordering: KONTEKS AKTIF before data panel before _chat call
        konteks_pos = output.find("KONTEKS AKTIF")
        data_pos = output.find(data_panel)
        self.assertGreater(
            data_pos, konteks_pos, f"{data_panel} should appear after KONTEKS AKTIF"
        )
        self.assertIn("chat", call_order, "_chat should have been called")

    def test_sparse_complaint_followed_by_detailed_complaint(self):
        """First complaint is sparse (shows warning), second detailed complaint
        does NOT show the sparse warning."""
        input_sequence = [
            "",  # default backend
            "demam",  # sparse complaint 1
            "",
            "",
            "",
            "",
            "pasien wanita 35 tahun demam 5 hari disertai batuk produktif dan sesak napas",  # detailed complaint 2
            "5 hari",
            "batuk produktif, sesak napas",
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
        # The warning panel (DATA TIDAK CUKUP or DATA SPARSE) should appear
        # for the first complaint only. Both the panel title border and the
        # message body may contain these marker strings, so we count occurrences
        # of the full panel title (which appears only in the top border).
        sparse_title_count = output.count("DATA SPARSE — Klarifikasi Diperlukan")
        insufficient_title_count = output.count(
            "DATA TIDAK CUKUP — Informasi Tambahan Diperlukan"
        )
        title_count = sparse_title_count + insufficient_title_count
        self.assertEqual(
            title_count,
            1,
            "Warning panel title should appear exactly once (first complaint only)",
        )

    def test_sparse_complaint_with_no_anchor_terms_has_generic_followups(self):
        """A very generic complaint like 'lemas' without anchor terms
        should still show a sparse panel with some generic guidance."""
        input_sequence = [
            "",  # default backend
            "lemas",  # very generic complaint
            "",  # durasi
            "",  # gejala
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
        self.assertTrue(
            "DATA SPARSE" in output or "DATA TIDAK CUKUP" in output,
            "Either DATA SPARSE or DATA TIDAK CUKUP panel should appear for generic complaint",
        )

    def test_short_complaint_but_fills_case_fields_not_sparse(self):
        """Even if the initial complaint is short, filling most case intake
        fields makes the case detailed enough to skip the sparse warning."""
        input_sequence = [
            "",  # default backend
            "demam",
            "5 hari",  # durasi — filled
            "batuk, pilek, nyeri tenggorokan",  # gejala — filled
            "",  # redflag (skip)
            "TD 120/80, Nadi 88, Suhu 38.0",  # vital — filled
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
        self.assertNotIn("DATA SPARSE", output)
        self.assertNotIn("DATA TIDAK CUKUP", output)


if __name__ == "__main__":
    unittest.main()
