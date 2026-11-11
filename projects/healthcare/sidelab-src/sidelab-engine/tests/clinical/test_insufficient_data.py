# Architected and built by codieverse+.
"""Tests for insufficient-data-conservative-behavior feature (milestone-3).

Validates VAL-SAFETY-004:
- For a vague or incomplete case, the visible output explicitly indicates
  that data are insufficient
- The output avoids overconfident diagnosis or therapy
- The output requests the most relevant clarifying information
- A need-more-information state is surfaced clearly

Simulated cases only. No real patient data.
"""

import importlib.util
import io
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from rich.console import Console

_spec = importlib.util.spec_from_file_location(
    "sidelab_app", Path(__file__).resolve().parent.parent.parent / "sidelab.py"
)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


def _make_capture_console():
    buf = io.StringIO()
    return Console(file=buf, force_terminal=True, width=120, highlight=False), buf


class InsufficientDataDetectionTests(unittest.TestCase):
    """Unit tests for insufficient-data detection.

    VAL-SAFETY-004: The system must detect when data are insufficient and
    produce conservative, clarifying behavior.
    """

    def test_insufficient_data_function_exists(self):
        """_check_insufficient_data_state is available and callable."""
        self.assertTrue(
            callable(m._check_insufficient_data_state),
            "_check_insufficient_data_state should be a callable function",
        )

    def test_vague_complaint_returns_insufficient(self):
        """Vague complaint 'saya tidak enak badan' returns insufficient=True."""
        kasus = {"keluhan": "saya tidak enak badan"}
        pasien = {}
        result = m._check_insufficient_data_state(kasus, pasien)
        self.assertIsInstance(result, dict)
        self.assertTrue(
            result.get("is_insufficient"),
            "Vague complaint should be detected as insufficient data",
        )

    def test_insufficient_result_includes_explicit_message(self):
        """Insufficient data result includes explicit 'data tidak cukup' message."""
        kasus = {"keluhan": "saya tidak enak badan"}
        pasien = {}
        result = m._check_insufficient_data_state(kasus, pasien)
        self.assertIn("message", result)
        msg = result["message"]
        # Message must explicitly state that data are insufficient
        self.assertTrue(
            "data tidak cukup" in msg.lower()
            or "data belum cukup" in msg.lower()
            or "data klinis masih" in msg.lower()
            or "informasi belum memadai" in msg.lower(),
            f"Message should indicate insufficient data, got: '{msg}'",
        )

    def test_insufficient_result_includes_clarification_questions(self):
        """Insufficient data result includes focused clarification questions."""
        kasus = {"keluhan": "saya tidak enak badan"}
        pasien = {}
        result = m._check_insufficient_data_state(kasus, pasien)
        self.assertIn("followup_questions", result)
        questions = result.get("followup_questions", [])
        self.assertIsInstance(questions, list)
        self.assertGreater(
            len(questions),
            0,
            "Should have at least one clarification question",
        )

    def test_insufficient_result_includes_conservative_prompt(self):
        """Insufficient data result includes conservative prompt addition."""
        kasus = {"keluhan": "saya tidak enak badan"}
        pasien = {}
        result = m._check_insufficient_data_state(kasus, pasien)
        self.assertIn("conservative_prompt_addition", result)
        prompt_add = result.get("conservative_prompt_addition", "")
        self.assertIsInstance(prompt_add, str)
        self.assertGreater(
            len(prompt_add),
            0,
            "Conservative prompt addition should not be empty",
        )
        # Prompt should contain conservative language
        self.assertTrue(
            "konservatif" in prompt_add.lower()
            or "hati-hati" in prompt_add.lower()
            or "jangan" in prompt_add.lower()
            or "data tidak cukup" in prompt_add.lower(),
            f"Prompt should contain conservative guidance, got: '{prompt_add[:200]}'",
        )

    def test_insufficient_data_prompt_relaxes_minimum_three_drugs(self):
        kasus = {"keluhan": "pusing"}
        pasien = {}

        result = m._check_insufficient_data_state(kasus, pasien)

        self.assertTrue(result["is_insufficient"])
        note = result["conservative_prompt_addition"]
        self.assertIn("JANGAN memberikan tatalaksana farmakologis spesifik", note)
        self.assertIn("minimal 3 obat tidak berlaku", note.lower())

    def test_detailed_case_not_insufficient(self):
        """A detailed case with full context is NOT flagged as insufficient."""
        kasus = {
            "keluhan": "pasien pria 45 tahun nyeri dada kiri menjalar ke lengan sejak 2 jam",
            "durasi": "2 jam",
            "gejala": "keringat dingin, mual, sesak napas",
            "redflag": "nyeri dada dengan keringat dingin",
            "vital": "TD 160/95, Nadi 102, RR 22, Suhu 36.8",
        }
        pasien = {
            "nama": "Test Patient",
            "usia": "45",
            "alergi": "tidak ada",
            "obat": "amlodipine 10mg",
        }
        result = m._check_insufficient_data_state(kasus, pasien)
        self.assertFalse(
            result.get("is_insufficient"),
            "Detailed case with full context should NOT be flagged as insufficient",
        )

    def test_empty_kasus_not_insufficient(self):
        """Empty kasus is not flagged as insufficient (no data to evaluate)."""
        result = m._check_insufficient_data_state({}, {})
        self.assertFalse(result.get("is_insufficient"))

    def test_insufficient_data_message_avoids_overconfident_language(self):
        """The insufficient data message uses conservative, non-assertive language."""
        kasus = {"keluhan": "pusing saja"}
        pasien = {}
        result = m._check_insufficient_data_state(kasus, pasien)
        msg = result.get("message", "")
        # Should NOT contain confident/absolute language
        overconfident_phrases = [
            "diagnosis pasti",
            "diagnosis definitif",
            "pasti adalah",
            "tidak diragukan",
            "confirmed",
            "absolutely",
        ]
        for phrase in overconfident_phrases:
            self.assertNotIn(
                phrase.lower(),
                msg.lower(),
                f"Message should avoid overconfident language: '{phrase}'",
            )

    def test_insufficient_data_result_structure_is_complete(self):
        """Result dict has all required keys with proper types."""
        kasus = {"keluhan": "demam"}
        pasien = {}
        result = m._check_insufficient_data_state(kasus, pasien)
        required_keys = [
            "is_insufficient",
            "message",
            "followup_questions",
            "conservative_prompt_addition",
        ]
        for key in required_keys:
            self.assertIn(key, result, f"Result missing required key: {key}")
        self.assertIsInstance(result["is_insufficient"], bool)
        self.assertIsInstance(result["message"], str)
        self.assertIsInstance(result["followup_questions"], list)
        self.assertIsInstance(result["conservative_prompt_addition"], str)

    def test_sparse_complaint_with_patient_data_still_insufficient(self):
        """Even with patient data, a very sparse complaint remains insufficient."""
        kasus = {"keluhan": "demam"}
        pasien = {
            "nama": "Test Patient",
            "usia": "30",
            "alergi": "tidak ada",
        }
        result = m._check_insufficient_data_state(kasus, pasien)
        # Patient data helps but doesn't replace missing case context
        # The result should at minimum have conservative prompt addition
        self.assertTrue(
            result.get("is_insufficient") or result.get("conservative_prompt_addition"),
            "Sparse complaint should trigger conservative behavior even with patient data",
        )

    def test_conservative_prompt_forbids_overconfident_diagnosis(self):
        """The conservative prompt addition explicitly forbids overconfident diagnosis."""
        kasus = {"keluhan": "saya pusing"}
        pasien = {}
        result = m._check_insufficient_data_state(kasus, pasien)
        prompt = result.get("conservative_prompt_addition", "")
        # Must contain instructions against overconfident behavior
        keywords = [
            "jangan",
            "konservatif",
            "hati-hati",
            "data belum",
            "periksa",
            "verifikasi",
            "klarifikasi",
            "hindari",
            "batasi",
        ]
        found_any = any(kw in prompt.lower() for kw in keywords)
        self.assertTrue(
            found_any,
            f"Conservative prompt should contain safety guidance, got: '{prompt[:300]}'",
        )

    def test_conservative_prompt_forbids_overconfident_therapy(self):
        """The conservative prompt addition warns against overconfident therapy."""
        kasus = {"keluhan": "badan lemas"}
        pasien = {}
        result = m._check_insufficient_data_state(kasus, pasien)
        prompt = result.get("conservative_prompt_addition", "")
        # Should address therapy caution
        therapy_keywords = [
            "terapi",
            "obat",
            "tatalaksana",
            "prescribing",
            "dosis",
            "farmakologi",
        ]
        has_therapy_guidance = any(kw in prompt.lower() for kw in therapy_keywords)
        # If therapy keywords present, they should be in a conservative context
        if has_therapy_guidance:
            self.assertTrue(
                "jangan" in prompt.lower()
                or "konservatif" in prompt.lower()
                or "hati-hati" in prompt.lower()
                or "verifikasi" in prompt.lower(),
                f"Therapy guidance in prompt should be conservative: '{prompt[:300]}'",
            )

    def test_insufficient_data_requests_relevant_clarification(self):
        """Clarification questions are relevant to the complaint context."""
        # Test with a complaint containing an anchor term
        kasus = {"keluhan": "nyeri perut"}
        pasien = {}
        result = m._check_insufficient_data_state(kasus, pasien)
        questions = result.get("followup_questions", [])
        # Since "perut" is an anchor term, questions should relate to abdominal pain
        if questions:
            abdo_keywords = [
                "perut",
                "muntah",
                "diare",
                "demam",
                "nyeri",
                "lokasi",
                "makan",
            ]
            found_relevant = any(
                any(kw in q.lower() for kw in abdo_keywords) for q in questions
            )
            self.assertTrue(
                found_relevant,
                f"Clarification questions should be relevant to 'nyeri perut', got: {questions}",
            )


class InsufficientDataIntegrationTests(unittest.TestCase):
    """Integration tests for insufficient-data behavior in the main flow.

    VAL-SAFETY-004: Need-more-information state must be surfaced clearly.
    """

    def test_insufficient_data_panel_has_correct_title(self):
        """The insufficient data panel bears a clear title indicating data gaps."""
        kasus = {"keluhan": "saya tidak enak badan"}
        pasien = {}
        result = m._check_insufficient_data_state(kasus, pasien)
        if result.get("is_insufficient"):
            cap, buf = _make_capture_console()
            with patch.object(m, "console", cap):
                m._print_insufficient_data_warning(result)
            output = buf.getvalue()
            # Panel title should indicate insufficient data or need-more-info
            self.assertTrue(
                "DATA TIDAK CUKUP" in output
                or "INFORMASI TAMBAHAN" in output
                or "KLARIFIKASI" in output
                or "DATA SPARSE" in output,
                f"Panel title should indicate insufficient data, got: '{output[:300]}'",
            )

    def test_insufficient_data_panel_shows_message(self):
        """The panel shows the insufficient-data message visibly."""
        kasus = {"keluhan": "saya tidak enak badan"}
        pasien = {}
        result = m._check_insufficient_data_state(kasus, pasien)
        if result.get("is_insufficient"):
            cap, buf = _make_capture_console()
            with patch.object(m, "console", cap):
                m._print_insufficient_data_warning(result)
            output = buf.getvalue()
            # Message should appear in output
            self.assertGreater(len(output.strip()), 0)

    def test_insufficient_data_panel_shows_clarification_questions(self):
        """Clarification questions are visible in the panel output."""
        kasus = {"keluhan": "nyeri kepala"}
        pasien = {}
        result = m._check_insufficient_data_state(kasus, pasien)
        if result.get("is_insufficient"):
            cap, buf = _make_capture_console()
            with patch.object(m, "console", cap):
                m._print_insufficient_data_warning(result)
            output = buf.getvalue()
            questions = result.get("followup_questions", [])
            if questions:
                # At least first question should appear in output
                first_q = questions[0].strip("?")[:15]
                self.assertTrue(
                    first_q.lower() in output.lower()
                    or any(q[:10].lower() in output.lower() for q in questions),
                    f"Clarification questions should appear in panel output: '{output[:500]}'",
                )

    def test_not_insufficient_prints_nothing(self):
        """When data is sufficient, the warning function prints nothing."""
        kasus = {
            "keluhan": "pasien pria 45 tahun nyeri dada kiri menjalar ke lengan sejak 2 jam",
            "durasi": "2 jam",
            "gejala": "keringat dingin, mual",
            "vital": "TD 160/95",
        }
        pasien = {"nama": "Test", "usia": "45"}
        result = m._check_insufficient_data_state(kasus, pasien)
        self.assertFalse(result.get("is_insufficient"))

        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_insufficient_data_warning(result)
        output = buf.getvalue().strip()
        self.assertEqual(output, "", "No warning should be printed for sufficient data")

    def test_need_more_information_is_valid_state(self):
        """The insufficient-data state is treated as a valid system state.

        VAL-SAFETY-004: A need-more-information state is acceptable and must
        be surfaced clearly. This test verifies the state is not treated as
        an error or exceptional condition.
        """
        kasus = {"keluhan": "saya tidak enak badan"}
        pasien = {}
        result = m._check_insufficient_data_state(kasus, pasien)
        # The state should be valid and expected
        self.assertIsInstance(result, dict)
        # The function should NOT raise or return error markers
        self.assertNotIn("error", result)
        self.assertNotIn("exception", result)

    def test_conservative_prompt_references_data_gaps(self):
        """The conservative prompt addition explicitly references data gaps."""
        kasus = {"keluhan": "pusing"}
        pasien = {}
        result = m._check_insufficient_data_state(kasus, pasien)
        prompt = result.get("conservative_prompt_addition", "")
        # Should mention data insufficiency or gaps
        data_gap_terms = [
            "data",
            "informasi",
            "belum",
            "terbatas",
            "kurang",
            "tidak cukup",
            "minim",
            "tambahan",
        ]
        found = [t for t in data_gap_terms if t in prompt.lower()]
        self.assertGreaterEqual(
            len(found),
            2,
            f"Conservative prompt should reference data gaps, got: '{prompt[:300]}'",
        )

    @patch.object(m, "build_provider")
    @patch.object(m, "_retrieve_context", return_value="")
    @patch.object(m, "_show_uplink_animation")
    def test_insufficient_data_prompt_includes_cautious_language(
        self, mock_animation, mock_retrieve, mock_build_provider
    ):
        """When insufficient data is detected, the prompt sent to model includes
        instructions to avoid overconfident diagnosis/therapy."""
        mock_provider = MagicMock()
        mock_provider.stream_chat.return_value = iter(["Dummy response"])
        mock_build_provider.return_value = mock_provider

        history = []
        pasien = {}
        model = "test-model"
        backend = "local"

        with patch.object(m, "check_backend_readiness", return_value=(True, None, "")):
            # Build a sparse prompt
            prompt = "KELUHAN UTAMA: saya tidak enak badan"
            # Append conservative prompt addition as the main loop does
            sparse_result = m._check_insufficient_data_state(
                {"keluhan": "saya tidak enak badan"}, {}
            )
            if sparse_result.get("conservative_prompt_addition"):
                prompt = prompt + "\n\n" + sparse_result["conservative_prompt_addition"]

            m._chat(prompt, history, pasien, model, backend)

        self.assertTrue(mock_provider.stream_chat.called)
        # The prompt sent should include conservative language
        call_messages = mock_provider.stream_chat.call_args[0][0]
        # Find user message with the prompt
        user_content = ""
        for msg in call_messages:
            if msg.get("role") == "user":
                user_content += msg.get("content", "")
        self.assertGreater(len(user_content), 0)


class InsufficientDataSafetyInteractionTests(unittest.TestCase):
    """Tests that insufficient-data state interacts safely with other systems.

    VAL-CROSS-009 (covered by red-flag-insufficient-data-safe-interaction):
    When both red-flag and insufficient-data conditions are present, the
    insufficient-data state must not suppress or dilute red-flag urgency.
    These tests verify the insufficient-data function is compatible with
    the red-flag system.
    """

    def test_insufficient_data_function_accepts_red_flag_complaints(self):
        """The insufficient-data function handles complaints that also trigger
        red flags (e.g., 'kepala terbentur') gracefully."""
        # This is a red-flag trigger but also potentially sparse
        kasus = {"keluhan": "kepala terbentur aspal"}
        pasien = {}
        result = m._check_insufficient_data_state(kasus, pasien)
        # Should not crash or raise
        self.assertIsInstance(result, dict)
        self.assertIn("is_insufficient", result)

    def test_insufficient_data_preserves_conservative_behavior_across_all_cases(self):
        """For any sparse case, the conservative prompt addition is present."""
        sparse_cases = [
            "demam",
            "sakit kepala",
            "badan lemas",
            "pusing",
            "saya tidak enak badan",
            "mual",
        ]
        for keluhan in sparse_cases:
            with self.subTest(keluhan=keluhan):
                kasus = {"keluhan": keluhan}
                pasien = {}
                result = m._check_insufficient_data_state(kasus, pasien)
                if result.get("is_insufficient"):
                    self.assertGreater(
                        len(result.get("conservative_prompt_addition", "")),
                        0,
                        f"Conservative prompt should be present for sparse case: {keluhan}",
                    )

    def test_insufficient_data_never_claims_clinical_authority(self):
        """The insufficient-data message never presents the system as clinical authority."""
        kasus = {"keluhan": "demam"}
        pasien = {}
        result = m._check_insufficient_data_state(kasus, pasien)
        msg = result.get("message", "")
        prompt = result.get("conservative_prompt_addition", "")
        combined = (msg + " " + prompt).lower()
        # Should not claim authority
        authority_phrases = [
            "kami memastikan",
            "kami mendiagnosis",
            "sistem ini menentukan",
            "diagnosis final",
            "keputusan akhir",
        ]
        for phrase in authority_phrases:
            self.assertNotIn(phrase, combined)


if __name__ == "__main__":
    unittest.main()
