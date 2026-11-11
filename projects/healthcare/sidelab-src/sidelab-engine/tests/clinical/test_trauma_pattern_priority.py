# Architected and built by codieverse+.
"""Tests for trauma-pattern-priority feature (milestone-3).

Validates VAL-SAFETY-003:
- For simulated head-trauma or decreased-consciousness cases, the visible
  output prioritizes trauma-related or neurologic emergency considerations
- Routine infection or minor outpatient diagnoses are not presented as
  the main answer

Simulated cases only. No real patient data.
"""

import importlib.util
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

_spec = importlib.util.spec_from_file_location(
    "sidelab_app", Path(__file__).resolve().parent.parent.parent / "sidelab.py"
)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


class TraumaPatternPriorityTests(unittest.TestCase):
    """Tests that trauma/neurologic emergencies are prioritized over routine
    outpatient diagnoses when head-trauma/decreased-consciousness patterns
    are present.
    """

    def test_suppress_routine_returns_response_unchanged_when_no_trauma_flags(self):
        """Response is unchanged when no trauma-related red flags are present."""
        response = (
            "DIAGNOSIS BANDING:\n"
            "[J06] ISPA — batuk pilek akut\n\n"
            "DIAGNOSIS KERJA:\n"
            "[J06] ISPA — sesuai gejala respirasi atas\n\n"
            "TATALAKSANA:\n"
            "Istirahat cukup\n"
        )
        # Non-trauma red flag details (e.g., stroke)
        rf_details = [
            {
                "name": "Stroke",
                "icd": "I64",
                "disease": "Stroke (I64)",
                "alert": "RED FLAG: Stroke",
            }
        ]
        result = m._suppress_routine_diagnoses_for_trauma(response, rf_details)
        self.assertEqual(result, response)

    def test_suppress_routine_no_change_when_diagnosis_is_trauma_appropriate(self):
        """Response is unchanged when DIAGNOSIS KERJA is already trauma-appropriate."""
        response = (
            "DIAGNOSIS BANDING:\n"
            "[S06] Cedera Otak Traumatik — trauma kepala dengan penurunan kesadaran\n"
            "[S02.1] Fraktur Basis Kranii — perdarahan telinga\n\n"
            "DIAGNOSIS KERJA:\n"
            "[S06] Cedera Otak Traumatik — sesuai mekanisme trauma dan penurunan GCS\n\n"
            "TATALAKSANA:\n"
            "Stabilisasi ABC\n"
        )
        rf_details = [
            {
                "name": "Cedera Otak Traumatik",
                "icd": "S06",
                "disease": "Cedera Otak Traumatik / Trauma Kapitis (S06)",
                "alert": "RED FLAG: Trauma kepala",
            },
            {
                "name": "Penurunan Kesadaran",
                "icd": "",
                "disease": "Penurunan Kesadaran et causa suspek lesi intrakranial",
                "alert": "RED FLAG: Penurunan kesadaran",
            },
        ]
        result = m._suppress_routine_diagnoses_for_trauma(response, rf_details)
        # Should not have added trauma-priority warning since diagnosis is already appropriate
        self.assertNotIn("PERHATIAN PRIORITAS TRAUMA", result)

    def test_suppress_routine_warns_when_ispa_is_main_answer_for_trauma(self):
        """When trauma patterns present but DIAGNOSIS KERJA is ISPA, a warning
        is added that prioritizes trauma considerations over routine infection."""
        response = (
            "DIAGNOSIS BANDING:\n"
            "[J06] ISPA — batuk dan pilek akut\n"
            "[J20] Bronkitis akut — batuk produktif\n\n"
            "DIAGNOSIS KERJA:\n"
            "[J06] ISPA — sesuai gejala respirasi atas\n\n"
            "TATALAKSANA:\n"
            "Istirahat cukup\n"
        )
        rf_details = [
            {
                "name": "Cedera Otak Traumatik",
                "icd": "S06",
                "disease": "Cedera Otak Traumatik / Trauma Kapitis (S06)",
                "alert": "RED FLAG: Trauma kepala",
            },
        ]
        result = m._suppress_routine_diagnoses_for_trauma(response, rf_details)

        # Should contain the trauma-priority warning
        self.assertIn("PERHATIAN PRIORITAS TRAUMA", result)
        self.assertIn("trauma", result.lower())
        self.assertIn("cedera otak", result.lower())
        # Should retain original response content
        self.assertIn("ISPA", result)

    def test_suppress_routine_warns_when_urti_is_main_answer_for_trauma(self):
        """When trauma patterns present but DIAGNOSIS KERJA is a routine
        upper respiratory infection, a warning is added."""
        response = (
            "DIAGNOSIS BANDING:\n"
            "[J00] Nasofaringitis akut — common cold\n"
            "[J31] Rinitis kronis — kemungkinan alergi\n\n"
            "DIAGNOSIS KERJA:\n"
            "[J00] Nasofaringitis akut — sesuai gejala\n\n"
            "TATALAKSANA:\n"
            "Paracetamol 500mg\n"
        )
        rf_details = [
            {
                "name": "Cedera Otak Traumatik",
                "icd": "S06",
                "disease": "Cedera Otak Traumatik / Trauma Kapitis (S06)",
                "alert": "RED FLAG: Trauma kepala",
            },
            {
                "name": "Fraktur Basis Kranii",
                "icd": "S02.1",
                "disease": "Fraktur Basis Kranii (S02.1)",
                "alert": "RED FLAG: Otorrhea",
            },
        ]
        result = m._suppress_routine_diagnoses_for_trauma(response, rf_details)

        # Should contain the trauma-priority warning
        self.assertIn("PERHATIAN PRIORITAS TRAUMA", result)

    def test_suppress_routine_warns_when_furunkel_is_main_answer_for_trauma(self):
        """When trauma patterns present but DIAGNOSIS KERJA is furunkel or
        minor skin infection, a warning is added."""
        response = (
            "DIAGNOSIS BANDING:\n"
            "[L02] Furunkel — abses kulit\n"
            "[L08] Infeksi kulit — selulitis ringan\n\n"
            "DIAGNOSIS KERJA:\n"
            "[L02] Furunkel — benjolan nyeri dengan pus\n\n"
            "TATALAKSANA:\n"
            "Kompres hangat\n"
        )
        rf_details = [
            {
                "name": "Cedera Otak Traumatik",
                "icd": "S06",
                "disease": "Cedera Otak Traumatik / Trauma Kapitis (S06)",
                "alert": "RED FLAG: Trauma kepala",
            },
        ]
        result = m._suppress_routine_diagnoses_for_trauma(response, rf_details)

        # Should contain the trauma-priority warning
        self.assertIn("PERHATIAN PRIORITAS TRAUMA", result)

    def test_suppress_routine_warns_when_decreased_consciousness_with_routine_dx(self):
        """Decreased consciousness + trauma context with routine diagnosis
        as main answer triggers trauma-priority warning."""
        response = (
            "DIAGNOSIS BANDING:\n"
            "[R51] Cephalgia — nyeri kepala\n"
            "[G44] Tension headache — nyeri kepala tegang\n\n"
            "DIAGNOSIS KERJA:\n"
            "[R51] Cephalgia — nyeri kepala non-spesifik\n\n"
            "TATALAKSANA:\n"
            "Paracetamol 500mg\n"
        )
        rf_details = [
            {
                "name": "Penurunan Kesadaran",
                "icd": "",
                "disease": "Penurunan Kesadaran et causa suspek lesi intrakranial",
                "alert": "RED FLAG: Penurunan kesadaran + trauma",
            },
            {
                "name": "Cedera Otak Traumatik",
                "icd": "S06",
                "disease": "Cedera Otak Traumatik / Trauma Kapitis (S06)",
                "alert": "RED FLAG: Trauma kepala",
            },
        ]
        result = m._suppress_routine_diagnoses_for_trauma(response, rf_details)

        # Should contain the trauma-priority warning
        self.assertIn("PERHATIAN PRIORITAS TRAUMA", result)
        self.assertIn("penurunan kesadaran", result.lower())

    def test_suppress_routine_warns_when_minor_outpatient_dx_for_trauma(self):
        """Various minor outpatient diagnoses as main answer for trauma
        all trigger trauma-priority warning."""
        minor_dx_cases = [
            (
                "DIAGNOSIS KERJA:\n[M79.1] Mialgia — nyeri otot\n\n"
                "TATALAKSANA:\nKompres hangat\n"
            ),
            (
                "DIAGNOSIS KERJA:\n[K30] Dispepsia — nyeri ulu hati\n\n"
                "TATALAKSANA:\nAntasida\n"
            ),
            (
                "DIAGNOSIS KERJA:\n[H81] Vertigo — pusing berputar\n\n"
                "TATALAKSANA:\nBetahistin\n"
            ),
            (
                "DIAGNOSIS KERJA:\n[F51] Insomnia — sulit tidur\n\n"
                "TATALAKSANA:\nSleep hygiene\n"
            ),
        ]
        rf_details = [
            {
                "name": "Cedera Otak Traumatik",
                "icd": "S06",
                "disease": "Cedera Otak Traumatik / Trauma Kapitis (S06)",
                "alert": "RED FLAG: Trauma kepala",
            },
        ]
        for response in minor_dx_cases:
            with self.subTest(response=response[:80]):
                result = m._suppress_routine_diagnoses_for_trauma(response, rf_details)
                self.assertIn(
                    "PERHATIAN PRIORITAS TRAUMA",
                    result,
                    f"Warning missing for: {response[:80]}",
                )

    def test_suppress_routine_warns_when_differential_has_emergency_but_kerja_inappropriate(
        self,
    ):
        """Even when DIAGNOSIS BANDING contains emergency conditions, if
        DIAGNOSIS KERJA is a routine diagnosis, a warning is added."""
        response = (
            "DIAGNOSIS BANDING:\n"
            "[S06] Cedera Otak Traumatik — mekanisme trauma + penurunan kesadaran\n"
            "[I62] Perdarahan Subdural — penurunan kesadaran progresif\n"
            "[J06] ISPA — kebetulan batuk ringan\n\n"
            "DIAGNOSIS KERJA:\n"
            "[J06] ISPA — pasien mengeluh batuk dan pilek\n\n"
            "TATALAKSANA:\n"
            "Paracetamol dan istirahat\n"
        )
        rf_details = [
            {
                "name": "Cedera Otak Traumatik",
                "icd": "S06",
                "disease": "Cedera Otak Traumatik / Trauma Kapitis (S06)",
                "alert": "RED FLAG: Trauma kepala",
            },
            {
                "name": "Penurunan Kesadaran",
                "icd": "",
                "disease": "Penurunan Kesadaran et causa suspek lesi intrakranial",
                "alert": "RED FLAG: Penurunan kesadaran",
            },
        ]
        result = m._suppress_routine_diagnoses_for_trauma(response, rf_details)

        # Warning should be present because DIAGNOSIS KERJA is still ISPA
        self.assertIn("PERHATIAN PRIORITAS TRAUMA", result)

    def test_suppress_routine_no_warning_when_kerja_is_neurologic_emergency(self):
        """No warning when DIAGNOSIS KERJA is a neurologic emergency that
        matches trauma context."""
        response = (
            "DIAGNOSIS BANDING:\n"
            "[I62] Perdarahan Subdural Akut — penurunan kesadaran pasca trauma\n"
            "[S06] Kontusio Serebri — cedera fokal dengan edema\n\n"
            "DIAGNOSIS KERJA:\n"
            "[I62] Perdarahan Subdural Akut — penurunan GCS pasca trauma kepala\n\n"
            "TATALAKSANA:\n"
            "Stabilisasi ABC, rujuk emergensi ke RS\n"
        )
        rf_details = [
            {
                "name": "Cedera Otak Traumatik",
                "icd": "S06",
                "disease": "Cedera Otak Traumatik / Trauma Kapitis (S06)",
                "alert": "RED FLAG: Trauma kepala",
            },
            {
                "name": "Penurunan Kesadaran",
                "icd": "",
                "disease": "Penurunan Kesadaran et causa suspek lesi intrakranial",
                "alert": "RED FLAG: Penurunan kesadaran",
            },
        ]
        result = m._suppress_routine_diagnoses_for_trauma(response, rf_details)

        # Should NOT contain trauma-priority warning since diagnosis is already
        # neurologic emergency
        self.assertNotIn("PERHATIAN PRIORITAS TRAUMA", result)

    def test_trauma_red_flag_details_are_identified(self):
        """Trauma-related red flags (#7, #8, #9) are correctly identified
        by the suppress function."""
        trauma_details = [
            {
                "name": "Cedera Otak Traumatik",
                "icd": "S06",
                "disease": "Cedera Otak Traumatik / Trauma Kapitis (S06)",
            },
            {
                "name": "Fraktur Basis Kranii",
                "icd": "S02.1",
                "disease": "Fraktur Basis Kranii (S02.1)",
            },
            {
                "name": "Penurunan Kesadaran",
                "icd": "",
                "disease": "Penurunan Kesadaran et causa suspek lesi intrakranial",
            },
        ]
        for detail in trauma_details:
            with self.subTest(detail=detail["name"]):
                self.assertTrue(
                    m._is_trauma_red_flag(detail),
                    f"{detail['name']} should be identified as trauma red flag",
                )

    def test_non_trauma_red_flag_details_are_not_identified(self):
        """Non-trauma red flags (stroke, ACS, meningitis) are not identified
        as trauma-related."""
        non_trauma_details = [
            {"name": "Stroke", "icd": "I64", "disease": "Stroke (I64)"},
            {
                "name": "Acute Coronary Syndrome",
                "icd": "I21",
                "disease": "Acute Coronary Syndrome (I21)",
            },
            {
                "name": "Meningitis Bakterial",
                "icd": "G00",
                "disease": "Meningitis Bakterial (G00)",
            },
            {
                "name": "Subarachnoid Hemorrhage",
                "icd": "I60",
                "disease": "Subarachnoid Hemorrhage (I60)",
            },
            {"name": "Ensefalitis", "icd": "G04", "disease": "Ensefalitis (G04)"},
            {"name": "Distress Respirasi", "icd": "", "disease": "Distress Respirasi"},
            {"name": "Trauma Mayor", "icd": "T07", "disease": "Trauma Mayor (T07)"},
        ]
        for detail in non_trauma_details:
            with self.subTest(detail=detail["name"]):
                # Trauma Mayor (T07) is a general trauma but NOT head-trauma/neurologic
                # So it should be excluded from the trauma-specific check
                if detail["name"] == "Trauma Mayor":
                    self.assertFalse(
                        m._is_trauma_red_flag(detail),
                        f"{detail['name']} should NOT be identified as head-trauma red flag",
                    )
                else:
                    self.assertFalse(
                        m._is_trauma_red_flag(detail),
                        f"{detail['name']} should NOT be identified as trauma red flag",
                    )

    def test_suppress_routine_empty_when_no_rf_details(self):
        """Response is unchanged when no red flag details at all."""
        response = "DIAGNOSIS KERJA:\n[J06] ISPA — batuk pilek\n"
        result = m._suppress_routine_diagnoses_for_trauma(response, [])
        self.assertEqual(result, response)


class TraumaPatternIntegrationTests(unittest.TestCase):
    """Integration tests that verify trauma-pattern-priority in the _chat flow."""

    def setUp(self):
        m._provider_cache.clear()

    @patch.object(m, "build_provider")
    @patch.object(m, "_retrieve_context", return_value="")
    @patch.object(m, "_show_uplink_animation")
    def test_chat_with_trauma_prompt_suppresses_routine_diagnosis(
        self, mock_animation, mock_retrieve, mock_build_provider
    ):
        """_chat() with head-trauma prompt processes response through
        _suppress_routine_diagnoses_for_trauma when red flags are detected."""
        mock_provider = MagicMock()
        # Model inappropriately outputs ISPA as main diagnosis for trauma case
        mock_response = (
            "DIAGNOSIS BANDING:\n"
            "[J06] ISPA — batuk dan pilek\n"
            "[J20] Bronkitis — batuk produktif\n\n"
            "DIAGNOSIS KERJA:\n"
            "[J06] ISPA — sesuai gejala\n\n"
            "TATALAKSANA:\n"
            "Paracetamol\n"
        )
        mock_provider.stream_chat.return_value = iter([mock_response])
        mock_build_provider.return_value = mock_provider

        history = []
        pasien = {}
        model = "test-model"
        backend = "local"

        with patch.object(m, "check_backend_readiness", return_value=(True, None, "")):
            prompt = "Kecelakaan motor, kepala terbentur aspal, penurunan kesadaran, tidak sadar"
            result = m._chat(prompt, history, pasien, model, backend)

        # The result should include trauma-priority warning since the model
        # output ISPA as main answer for a trauma case
        self.assertIn("PERHATIAN PRIORITAS TRAUMA", result)

    @patch.object(m, "build_provider")
    @patch.object(m, "_retrieve_context", return_value="")
    @patch.object(m, "_show_uplink_animation")
    def test_chat_trauma_appropriate_dx_no_false_positive(
        self, mock_animation, mock_retrieve, mock_build_provider
    ):
        """_chat() with trauma prompt where model gives appropriate
        diagnosis does NOT trigger false positive warning."""
        mock_provider = MagicMock()
        mock_response = (
            "DIAGNOSIS BANDING:\n"
            "[S06] Cedera Otak Traumatik — trauma kepala dengan penurunan kesadaran\n"
            "[I62] Perdarahan Subdural — sakit kepala progresif\n\n"
            "DIAGNOSIS KERJA:\n"
            "[S06] Cedera Otak Traumatik — mekanisme trauma + penurunan GCS\n\n"
            "TATALAKSANA:\n"
            "Stabilisasi, rujuk emergensi\n"
        )
        mock_provider.stream_chat.return_value = iter([mock_response])
        mock_build_provider.return_value = mock_provider

        history = []
        pasien = {}
        model = "test-model"
        backend = "local"

        with patch.object(m, "check_backend_readiness", return_value=(True, None, "")):
            prompt = "Kecelakaan, kepala terbentur, tidak sadar, penurunan kesadaran"
            result = m._chat(prompt, history, pasien, model, backend)

        # Should NOT trigger trauma-priority warning since diagnosis is appropriate
        self.assertNotIn("PERHATIAN PRIORITAS TRAUMA", result)


if __name__ == "__main__":
    unittest.main()
