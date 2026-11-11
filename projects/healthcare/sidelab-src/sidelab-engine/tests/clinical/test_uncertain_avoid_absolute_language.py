# Architected and built by codieverse+.
"""Tests for uncertain-avoid-absolute-language feature (milestone-3).

Validates VAL-SAFETY-008:
- In incomplete, mixed, or high-risk cases, the visible wording remains
  provisional and review-oriented
- The output uses tentative language and physician-review framing
- The output avoids clinically absolute or final-sounding conclusions

Simulated cases only. No real patient data.
"""

import importlib.util
import io
import unittest
from pathlib import Path

from rich.console import Console

_spec = importlib.util.spec_from_file_location(
    "sidelab_app", Path(__file__).resolve().parent.parent.parent / "sidelab.py"
)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


def _make_capture_console():
    buf = io.StringIO()
    return Console(file=buf, force_terminal=True, width=120, highlight=False), buf


# ---------------------------------------------------------------------------
# Unit tests: _detect_uncertain_context
# ---------------------------------------------------------------------------


class UncertainContextDetectionTests(unittest.TestCase):
    """Tests for _detect_uncertain_context — determines if case is uncertain."""

    def test_function_exists(self):
        """_detect_uncertain_context is available and callable."""
        self.assertTrue(
            callable(m._detect_uncertain_context),
            "_detect_uncertain_context should be a callable function",
        )

    def test_insufficient_data_is_uncertain(self):
        """Vague complaint without supporting data: context is uncertain."""
        kasus = {"keluhan": "saya tidak enak badan"}
        pasien = {}
        result = m._detect_uncertain_context(kasus, pasien)
        self.assertIsInstance(result, dict)
        self.assertTrue(
            result.get("is_uncertain"),
            "Insufficient-data case should be detected as uncertain context",
        )

    def test_red_flag_case_is_uncertain(self):
        """Red-flag (stroke) case: context is uncertain."""
        kasus = {
            "keluhan": "Pasien tiba-tiba lumpuh separuh tubuh, tidak bisa bicara",
            "durasi": "2 jam",
            "gejala": "wajah perot, lemah lengan kanan",
        }
        pasien = {}
        result = m._detect_uncertain_context(kasus, pasien)
        self.assertTrue(
            result.get("is_uncertain"),
            "Red-flag case should be detected as uncertain/high-risk context",
        )

    def test_mixed_findings_is_uncertain(self):
        """Case with conflicting/ambiguous symptoms: context is uncertain."""
        kasus = {
            "keluhan": "demam naik turun, kadang menggigil, kadang berkeringat",
            "durasi": "1 minggu",
            "gejala": "kadang diare, kadang sembelit, nyeri berpindah-pindah",
        }
        pasien = {}
        result = m._detect_uncertain_context(kasus, pasien)
        self.assertTrue(
            result.get("is_uncertain"),
            "Mixed/ambiguous-symptom case should be detected as uncertain",
        )

    def test_routine_case_is_not_uncertain(self):
        """Well-defined routine case: context is NOT uncertain."""
        kasus = {
            "keluhan": "batuk pilek",
            "durasi": "3 hari",
            "gejala": "demam ringan, hidung tersumbat, bersin",
            "redflag": "tidak ada",
            "vital": "TD 120/80, Nadi 80, RR 18, Suhu 37.5",
        }
        pasien = {"nama": "Test", "umur": "30"}
        result = m._detect_uncertain_context(kasus, pasien)
        self.assertFalse(
            result.get("is_uncertain"),
            "Well-defined routine case should NOT be detected as uncertain",
        )

    def test_result_includes_reason(self):
        """Uncertain context result includes a reason for uncertainty."""
        kasus = {"keluhan": "saya tidak enak badan"}
        pasien = {}
        result = m._detect_uncertain_context(kasus, pasien)
        self.assertIn("reason", result)
        self.assertIsInstance(result["reason"], str)
        self.assertGreater(len(result["reason"]), 0)

    def test_result_includes_provisional_instruction(self):
        """Uncertain context result includes provisional language instruction."""
        kasus = {"keluhan": "saya tidak enak badan"}
        pasien = {}
        result = m._detect_uncertain_context(kasus, pasien)
        self.assertIn("provisional_language_instruction", result)
        instruction = result.get("provisional_language_instruction", "")
        self.assertIsInstance(instruction, str)
        self.assertGreater(len(instruction), 0)


# ---------------------------------------------------------------------------
# Unit tests: _detect_absolute_language
# ---------------------------------------------------------------------------


class AbsoluteLanguageDetectionTests(unittest.TestCase):
    """Tests for _detect_absolute_language — finds absolute/final-sounding phrases."""

    def test_function_exists(self):
        """_detect_absolute_language is available and callable."""
        self.assertTrue(
            callable(m._detect_absolute_language),
            "_detect_absolute_language should be a callable function",
        )

    def test_detects_diagnosis_pasti(self):
        """ "Diagnosis pasti" should be flagged as absolute language."""
        text = "Diagnosis pasti pada pasien ini adalah pneumonia komunitas."
        matches = m._detect_absolute_language(text)
        self.assertGreater(len(matches), 0, "Should detect 'diagnosis pasti'")

    def test_detects_tidak_diragukan(self):
        """ "tidak diragukan lagi" should be flagged as absolute language."""
        text = "Tidak diragukan lagi ini adalah kasus ISPA."
        matches = m._detect_absolute_language(text)
        self.assertGreater(len(matches), 0, "Should detect 'tidak diragukan'")

    def test_detects_sudah_jelas(self):
        """ "sudah jelas" in diagnostic context should be flagged."""
        text = "Sudah jelas pasien menderita hipertensi esensial."
        matches = m._detect_absolute_language(text)
        self.assertGreater(len(matches), 0, "Should detect 'sudah jelas'")

    def test_detects_definitif(self):
        """ "definitif" should be flagged as absolute language."""
        text = "Terapi definitif untuk kondisi ini adalah antibiotik spektrum luas."
        matches = m._detect_absolute_language(text)
        self.assertGreater(len(matches), 0, "Should detect 'definitif'")

    def test_detects_telah_terbukti(self):
        """ "telah terbukti" should be flagged as absolute language."""
        text = "Telah terbukti bahwa pasien mengalami infeksi bakteri."
        matches = m._detect_absolute_language(text)
        self.assertGreater(len(matches), 0, "Should detect 'telah terbukti'")

    def test_detects_sudah_dapat_dipastikan(self):
        """ "sudah dapat dipastikan" should be flagged."""
        text = "Sudah dapat dipastikan diagnosisnya adalah diabetes melitus tipe 2."
        matches = m._detect_absolute_language(text)
        self.assertGreater(len(matches), 0, "Should detect 'sudah dapat dipastikan'")

    def test_detects_harus_dengan_pasti(self):
        """ "harus" + diagnostic context should be flagged."""
        text = "Pasien harus menderita apendisitis akut berdasarkan gejala."
        matches = m._detect_absolute_language(text)
        self.assertGreater(
            len(matches), 0, "Should detect 'harus' in diagnostic context"
        )

    def test_tentative_language_not_flagged(self):
        """Tentative/provisional language should NOT be flagged."""
        tentative_texts = [
            "Kemungkinan diagnosis kerja adalah ISPA, menunggu konfirmasi lebih lanjut.",
            "Dicurigai adanya infeksi saluran kemih berdasarkan gejala yang ada.",
            "Diagnosis banding mencakup beberapa kemungkinan yang perlu dipertimbangkan.",
            "Duagaan awal mengarah ke gastritis, namun perlu evaluasi lebih lanjut.",
            "Saran awal untuk terapi simtomatik sambil menunggu hasil pemeriksaan.",
        ]
        for text in tentative_texts:
            with self.subTest(text=text[:50]):
                matches = m._detect_absolute_language(text)
                self.assertEqual(
                    len(matches),
                    0,
                    f"Tentative text should not be flagged: '{text[:60]}...'",
                )

    def test_no_matches_in_neutral_text(self):
        """Plain clinical description without absolute claims: no matches."""
        text = (
            "Pasien datang dengan keluhan batuk dan pilek selama 3 hari. "
            "Pemeriksaan fisik menunjukkan faring hiperemis. "
            "Tidak ada tanda bahaya atau kegawatdaruratan."
        )
        matches = m._detect_absolute_language(text)
        self.assertEqual(
            len(matches), 0, "Neutral clinical text should have no matches"
        )


# ---------------------------------------------------------------------------
# Unit tests: _enforce_provisional_language
# ---------------------------------------------------------------------------


class EnforceProvisionalLanguageTests(unittest.TestCase):
    """Tests for _enforce_provisional_language — post-processing to add provisional framing."""

    def test_function_exists(self):
        """_enforce_provisional_language is available and callable."""
        self.assertTrue(
            callable(m._enforce_provisional_language),
            "_enforce_provisional_language should be a callable function",
        )

    def test_adds_provisional_framing_when_absolute_language_found(self):
        """When absolute language is detected, provisional caveat is added."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "M19.9 Osteoartritis — diagnosis pasti berdasarkan nyeri sendi mekanik\n\n"
            "TATALAKSANA:\n"
            "Tirah baring\n\n"
            "FARMAKOLOGI:\n"
            "Paracetamol 500mg PO 3x1 5 hari PC\n\n"
        )
        result = m._enforce_provisional_language(response)
        # Should have added provisional framing
        self.assertNotEqual(result, response, "Response should be modified")
        # Should contain physician-review or tentative framing
        has_framing = (
            "tinjauan dokter" in result.lower()
            or "belum final" in result.lower()
            or "bersifat sementara" in result.lower()
            or "verifikasi" in result.lower()
            or "review" in result.lower()
            or "keputusan klinis" in result.lower()
        )
        self.assertTrue(
            has_framing, f"Result should contain provisional framing: {result[:200]}"
        )

    def test_no_modification_when_no_absolute_language(self):
        """When no absolute language detected, response is not modified."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "Kemungkinan ISPA — berdasarkan gejala batuk pilek demam ringan\n\n"
            "TATALAKSANA:\n"
            "Istirahat cukup\n\n"
            "Semua saran di atas bersifat dugaan awal. "
            "Keputusan klinis tetap pada dokter.\n"
        )
        result = m._enforce_provisional_language(response)
        self.assertEqual(
            result,
            response,
            "Response without absolute language should not be modified",
        )

    def test_adds_physician_review_note(self):
        """Added framing includes physician-review language."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "Jelas ini adalah pneumonia — sudah terbukti dari gejala\n\n"
            "FARMAKOLOGI:\n"
            "Amoxicillin 500mg PO 3x1 7 hari PC\n\n"
        )
        result = m._enforce_provisional_language(response)
        self.assertIn("dokter", result.lower(), "Should reference physician review")

    def test_handles_multiple_absolute_matches(self):
        """Multiple absolute-language matches all get provisional framing."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "Diagnosis pasti stroke iskemik — tidak diragukan lagi\n\n"
            "DIAGNOSIS BANDING:\n"
            "Sudah jelas bukan TIA karena gejala menetap\n\n"
        )
        result = m._enforce_provisional_language(response)
        # Should still be a valid string
        self.assertIsInstance(result, str)
        self.assertGreater(
            len(result), len(response), "Result should be longer with added framing"
        )


# ---------------------------------------------------------------------------
# Integration tests: full response handling
# ---------------------------------------------------------------------------


class ProvisionalLanguageIntegrationTests(unittest.TestCase):
    """Integration tests ensuring uncertain cases produce provisional output.

    These tests verify the end-to-end flow: when an uncertain case is detected,
    the prompt is augmented with provisional-language instructions and the
    post-processing enforces provisional wording in the final output.
    """

    def test_uncertain_context_injects_provisional_instruction_to_prompt(self):
        """When uncertain, prompt gets provisional-language instruction appended."""
        kasus = {"keluhan": "saya tidak enak badan"}
        pasien = {}
        uncertain = m._detect_uncertain_context(kasus, pasien)
        self.assertTrue(uncertain.get("is_uncertain"))

        instruction = uncertain.get("provisional_language_instruction", "")
        self.assertIn("tentatif", instruction.lower())
        self.assertIn("review", instruction.lower())

    def test_provisional_instruction_mentions_physician(self):
        """Provisional language instruction references physician role."""
        kasus = {"keluhan": "saya tidak enak badan"}
        pasien = {}
        uncertain = m._detect_uncertain_context(kasus, pasien)
        instruction = uncertain.get("provisional_language_instruction", "")
        self.assertIn("dokter", instruction.lower())

    def test_provisional_instruction_avoids_absolute_commands(self):
        """Provisional instruction itself avoids absolute language about its own authority."""
        kasus = {"keluhan": "saya tidak enak badan"}
        pasien = {}
        uncertain = m._detect_uncertain_context(kasus, pasien)
        instruction = uncertain.get("provisional_language_instruction", "")
        # The instruction should frame itself as system guidance, not clinical authority
        self.assertTrue(
            "sistem" in instruction.lower() or "peringatan" in instruction.lower(),
            "Instruction should identify as system guidance",
        )

    def test_high_risk_red_flag_gets_provisional_instruction(self):
        """Red-flag/high-risk cases also get provisional language instruction."""
        kasus = {
            "keluhan": "Pasien tiba-tiba tidak bisa bicara, wajah perot",
            "durasi": "1 jam",
            "gejala": "lemah lengan dan tungkai kanan",
        }
        pasien = {}
        uncertain = m._detect_uncertain_context(kasus, pasien)
        self.assertTrue(uncertain.get("is_uncertain"))
        instruction = uncertain.get("provisional_language_instruction", "")
        self.assertGreater(len(instruction), 0)


# ---------------------------------------------------------------------------
# Edge-case tests
# ---------------------------------------------------------------------------


class AbsoluteLanguageEdgeCaseTests(unittest.TestCase):
    """Edge-case tests for absolute language detection."""

    def test_tidak_ada_di_kepustakaan_not_flagged(self):
        """ "tidak ada" in neutral context should NOT be flagged."""
        text = "Tidak ada riwayat alergi obat pada pasien."
        matches = m._detect_absolute_language(text)
        self.assertEqual(len(matches), 0, "Neutral 'tidak ada' should not be flagged")

    def test_pasti_in_patient_quote_not_flagged_alone(self):
        """ "pasti" embedded in a longer qualified sentence should be cautious."""
        text = "Belum dapat dipastikan apakah ini infeksi bakteri atau viral."
        matches = m._detect_absolute_language(text)
        self.assertEqual(
            len(matches),
            0,
            "'Belum dapat dipastikan' expresses uncertainty, not absolute certainty",
        )

    def test_empty_string_no_matches(self):
        """Empty string returns no matches."""
        matches = m._detect_absolute_language("")
        self.assertEqual(len(matches), 0)

    def test_whitespace_only_no_matches(self):
        """Whitespace-only string returns no matches."""
        matches = m._detect_absolute_language("   \n  \t  ")
        self.assertEqual(len(matches), 0)

    def test_each_match_includes_position(self):
        """Each match includes the text and its position."""
        text = "Diagnosis pasti pneumonia. Terapi definitif dengan antibiotik."
        matches = m._detect_absolute_language(text)
        for match in matches:
            self.assertIn("text", match)
            self.assertIn("start", match)
            self.assertIn("end", match)
            self.assertIsInstance(match["text"], str)
            self.assertIsInstance(match["start"], int)
            self.assertIsInstance(match["end"], int)


if __name__ == "__main__":
    unittest.main()
