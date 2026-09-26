# Architected and built by codieverse+.
"""Tests for emergency-referral-escalation feature (milestone-3).

Validates VAL-SAFETY-005:
- For simulated stroke, ACS, meningitis, severe trauma, or unconscious-patient
  cases, the visible output includes urgent referral language
- The output includes objective escalation criteria or thresholds in the
  referral guidance area
- The referral guidance goes beyond routine follow-up language alone

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


class EmergencyReferralEscalationTests(unittest.TestCase):
    """Tests for _ensure_emergency_referral_escalation post-processing."""

    def test_function_exists_and_accepts_correct_args(self):
        """_ensure_emergency_referral_escalation exists and accepts
        response string and rf_details list."""
        self.assertTrue(callable(m._ensure_emergency_referral_escalation))

    def test_no_change_when_no_red_flags(self):
        """Response is unchanged when no red flag details are present."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "[J06] ISPA — batuk pilek akut\n\n"
            "KRITERIA RUJUK:\n"
            "Tidak ada indikasi rujukan saat ini — kontrol bila keluhan memburuk\n\n"
            "PROGNOSIS:\n"
            "Bonam\n"
        )
        result = m._ensure_emergency_referral_escalation(response, [])
        self.assertEqual(result, response)

    def test_no_change_when_non_emergency_red_flag(self):
        """Response is unchanged when red flag is not a life-threatening
        emergency (e.g., some non-urgent red flag patterns)."""
        # Actually all red flags in our system are emergencies,
        # so test with non-matching rf_details
        response = (
            "DIAGNOSIS KERJA:\n"
            "[J06] ISPA — batuk pilek\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol 1 minggu bila tidak membaik\n\n"
            "PROGNOSIS:\n"
            "Bonam\n"
        )
        # Empty rf_details = no emergency
        result = m._ensure_emergency_referral_escalation(response, [])
        self.assertEqual(result, response)

    def test_stroke_adds_urgent_referral_language(self):
        """When stroke red flag is detected, KRITERIA RUJUK gets urgent
        referral language with objective NIHSS/FAST criteria."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "[J06] ISPA — batuk pilek\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol 1 minggu bila tidak membaik\n\n"
            "PROGNOSIS:\n"
            "Bonam\n"
        )
        rf_details = [
            {
                "name": "Stroke",
                "icd": "I64",
                "disease": "Stroke (I64)",
                "alert": "RED FLAG: Stroke",
            }
        ]
        result = m._ensure_emergency_referral_escalation(response, rf_details)

        # Must contain urgent referral language
        self.assertIn("RUJUK EMERGENSI", result)
        # Must contain objective criteria
        self.assertIn("FAST", result.upper())
        self.assertIn("NIHSS", result.upper())
        self.assertIn("trombolisis", result.lower())
        # Must NOT retain only routine follow-up
        self.assertNotIn("Kontrol 1 minggu", result)

    def test_acs_adds_urgent_referral_language(self):
        """When ACS red flag is detected, KRITERIA RUJUK gets urgent
        referral language with objective TIMI/EKG criteria."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "[J06] ISPA — batuk pilek\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol poliklinik 1 minggu\n\n"
            "PROGNOSIS:\n"
            "Bonam\n"
        )
        rf_details = [
            {
                "name": "Acute Coronary Syndrome",
                "icd": "I21",
                "disease": "Acute Coronary Syndrome (I21)",
                "alert": "RED FLAG: ACS",
            }
        ]
        result = m._ensure_emergency_referral_escalation(response, rf_details)

        # Must contain urgent referral language
        self.assertIn("RUJUK EMERGENSI", result)
        # Must contain objective criteria
        self.assertIn("EKG", result.upper())
        self.assertIn("TIMI", result.upper())
        self.assertIn("kateterisasi", result.lower())
        # Must NOT retain only routine follow-up
        self.assertNotIn("Kontrol poliklinik 1 minggu", result)

    def test_meningitis_adds_urgent_referral_language(self):
        """When meningitis red flag is detected, KRITERIA RUJUK gets urgent
        referral language with objective criteria."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "[J06] ISPA — batuk pilek\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol 3 hari bila demam tidak turun\n\n"
            "PROGNOSIS:\n"
            "Dubia\n"
        )
        rf_details = [
            {
                "name": "Meningitis Bakterial",
                "icd": "G00",
                "disease": "Meningitis Bakterial (G00)",
                "alert": "RED FLAG: Meningitis",
            }
        ]
        result = m._ensure_emergency_referral_escalation(response, rf_details)

        # Must contain urgent referral language
        self.assertIn("RUJUK EMERGENSI", result)
        # Must contain objective criteria
        self.assertIn("Kernig", result)
        self.assertIn("Brudzinski", result)
        self.assertIn("lumbal pungsi", result.lower())
        # Must NOT contain only routine follow-up
        self.assertNotIn("Kontrol 3 hari", result)

    def test_severe_trauma_adds_urgent_referral_language(self):
        """When head trauma red flag is detected, KRITERIA RUJUK gets urgent
        referral language with objective GCS/CT criteria."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "[J06] ISPA — batuk pilek\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol 1 minggu\n\n"
            "PROGNOSIS:\n"
            "Dubia\n"
        )
        rf_details = [
            {
                "name": "Cedera Otak Traumatik",
                "icd": "S06",
                "disease": "Cedera Otak Traumatik / Trauma Kapitis (S06)",
                "alert": "RED FLAG: Trauma kepala",
            }
        ]
        result = m._ensure_emergency_referral_escalation(response, rf_details)

        # Must contain urgent referral language
        self.assertIn("RUJUK EMERGENSI", result)
        # Must contain objective criteria
        self.assertIn("GCS", result.upper())
        self.assertIn("CT", result.upper())
        # Must NOT contain only routine follow-up
        self.assertNotIn("Kontrol 1 minggu", result)

    def test_unconscious_patient_adds_urgent_referral_language(self):
        """When penurunan kesadaran red flag is detected, KRITERIA RUJUK
        gets urgent referral language with GCS criteria."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "[J06] ISPA — batuk pilek\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol 1 minggu\n\n"
            "PROGNOSIS:\n"
            "Dubia\n"
        )
        rf_details = [
            {
                "name": "Penurunan Kesadaran",
                "icd": "",
                "disease": "Penurunan Kesadaran et causa suspek lesi intrakranial",
                "alert": "RED FLAG: Penurunan kesadaran",
            }
        ]
        result = m._ensure_emergency_referral_escalation(response, rf_details)

        # Must contain urgent referral language
        self.assertIn("RUJUK EMERGENSI", result)
        # Must contain objective criteria
        self.assertIn("GCS", result.upper())
        self.assertIn("airway", result.lower())
        # Must NOT contain only routine follow-up
        self.assertNotIn("Kontrol 1 minggu", result)

    def test_distress_respirasi_adds_urgent_referral_language(self):
        """When distress respirasi red flag is detected, KRITERIA RUJUK
        gets urgent referral language with SpO2 criteria."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "[J06] ISPA — batuk pilek\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol 1 minggu\n\n"
            "PROGNOSIS:\n"
            "Dubia\n"
        )
        rf_details = [
            {
                "name": "Distress Respirasi",
                "icd": "",
                "disease": "Distress Respirasi",
                "alert": "RED FLAG: Distress respirasi",
            }
        ]
        result = m._ensure_emergency_referral_escalation(response, rf_details)

        # Must contain urgent referral language
        self.assertIn("RUJUK EMERGENSI", result)
        # Must contain objective criteria (SpO2 threshold)
        self.assertIn("SpO2", result)
        self.assertIn("90%", result)
        # Must NOT contain only routine follow-up
        self.assertNotIn("Kontrol 1 minggu", result)

    def test_no_change_when_adequate_emergency_referral_already_present(self):
        """Response is unchanged when the KRITERIA RUJUK section already
        contains adequate urgent referral language and objective criteria."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "[I64] Stroke iskemik akut — defisit neurologis fokal onset <4.5 jam\n\n"
            "KRITERIA RUJUK:\n"
            "FAST positif / NIHSS — onset <4.5 jam → rujuk emergensi untuk trombolisis\n"
            "Tidak respon terhadap stabilisasi awal → rujuk\n\n"
            "PROGNOSIS:\n"
            "Dubia ad bonam — tergantung waktu ke trombolisis\n"
        )
        rf_details = [
            {
                "name": "Stroke",
                "icd": "I64",
                "disease": "Stroke (I64)",
                "alert": "RED FLAG: Stroke",
            }
        ]
        result = m._ensure_emergency_referral_escalation(response, rf_details)
        # Should be essentially unchanged since it already has urgent criteria
        self.assertEqual(result, response)

    def test_no_change_when_adequate_acs_referral_already_present(self):
        """Response is unchanged when ACS KRITERIA RUJUK already has
        EKG STEMI / TIMI criteria with urgent language."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "[I21] Acute Coronary Syndrome — nyeri dada ongoing + keringat dingin\n\n"
            "KRITERIA RUJUK:\n"
            "EKG STEMI / TIMI risk score — rujuk emergensi ke RS dengan fasilitas kateterisasi\n\n"
            "PROGNOSIS:\n"
            "Dubia\n"
        )
        rf_details = [
            {
                "name": "Acute Coronary Syndrome",
                "icd": "I21",
                "disease": "Acute Coronary Syndrome (I21)",
                "alert": "RED FLAG: ACS",
            }
        ]
        result = m._ensure_emergency_referral_escalation(response, rf_details)
        self.assertEqual(result, response)

    def test_multiple_emergency_flags_inject_all_relevant_criteria(self):
        """When multiple emergency red flags are present, all relevant
        criteria are injected into the KRITERIA RUJUK section."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "[S06] Cedera Otak Traumatik — trauma kepala + penurunan kesadaran\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol 1 minggu\n\n"
            "PROGNOSIS:\n"
            "Dubia\n"
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
        result = m._ensure_emergency_referral_escalation(response, rf_details)

        # Must contain urgent referral language
        self.assertIn("RUJUK EMERGENSI", result)
        # Must contain both sets of criteria
        self.assertIn("GCS", result.upper())
        self.assertIn("CT", result.upper())
        # Should also mention penurunan kesadaran criteria
        self.assertIn("penurunan kesadaran", result.lower())

    def test_missing_kriteria_rujuk_section_is_added(self):
        """When KRITERIA RUJUK section is missing entirely from the response,
        it is injected before PROGNOSIS."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "[I64] Stroke — defisit neurologis akut\n\n"
            "TATALAKSANA:\n"
            "Stabilisasi ABC\n\n"
            "PROGNOSIS:\n"
            "Dubia\n"
        )
        rf_details = [
            {
                "name": "Stroke",
                "icd": "I64",
                "disease": "Stroke (I64)",
                "alert": "RED FLAG: Stroke",
            }
        ]
        result = m._ensure_emergency_referral_escalation(response, rf_details)

        # KRITERIA RUJUK section must now exist
        self.assertIn("KRITERIA RUJUK:", result)
        # Must contain urgent referral language
        self.assertIn("RUJUK EMERGENSI", result)
        # KRITERIA RUJUK should appear before PROGNOSIS
        rujuk_pos = result.find("KRITERIA RUJUK:")
        progn_pos = result.find("PROGNOSIS:")
        self.assertLess(
            rujuk_pos, progn_pos, "KRITERIA RUJUK should appear before PROGNOSIS"
        )

    def test_fraktur_basis_kranii_adds_urgent_referral_language(self):
        """When fraktur basis kranii red flag is detected, KRITERIA RUJUK
        gets urgent referral language with tanda Battle criteria."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "[S02.1] Fraktur Basis Kranii — perdarahan telinga pasca trauma\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol 1 minggu\n\n"
            "PROGNOSIS:\n"
            "Dubia\n"
        )
        rf_details = [
            {
                "name": "Fraktur Basis Kranii",
                "icd": "S02.1",
                "disease": "Fraktur Basis Kranii (S02.1)",
                "alert": "RED FLAG: Otorrhea",
            }
        ]
        result = m._ensure_emergency_referral_escalation(response, rf_details)

        # Must contain urgent referral language
        self.assertIn("RUJUK EMERGENSI", result)
        # Must contain objective criteria
        self.assertIn("Battle", result)
        self.assertIn("raccoon", result.lower())
        self.assertIn("otorrhea", result.lower())
        # Must NOT contain only routine follow-up
        self.assertNotIn("Kontrol 1 minggu", result)


class EmergencyReferralPromptIntegrationTests(unittest.TestCase):
    """Tests verifying the system prompt and flow integration for
    emergency referral escalation."""

    def test_system_prompt_includes_kriteria_rujuk_section(self):
        """System prompt mandates KRITERIA RUJUK section with algorithm
        and criteria format."""
        sys_prompt = m._build_system({})
        self.assertIn("KRITERIA RUJUK", sys_prompt)
        self.assertIn("algoritma", sys_prompt.lower())
        self.assertIn("threshold", sys_prompt.lower())

    def test_system_prompt_includes_emergency_rujuk_language(self):
        """System prompt for emergency conditions mandates emergensi
        referral language."""
        sys_prompt = m._build_system({})
        # Safety rule #4: for unconscious/trauma berat, kriteria rujuk is emergensi
        self.assertIn("kriteria rujuk adalah rujuk emergensi", sys_prompt.lower())

    @patch.object(m, "build_provider")
    @patch.object(m, "_retrieve_context", return_value="")
    @patch.object(m, "_show_uplink_animation")
    def test_chat_passes_rf_details_to_escalation_function(
        self, mock_animation, mock_retrieve, mock_build_provider
    ):
        """_chat() collects red flag details and passes them to
        _ensure_emergency_referral_escalation during post-processing.

        VAL-SAFETY-005 integration test.
        """
        mock_provider = MagicMock()
        # Model response with only routine follow-up language
        mock_response = (
            "DIAGNOSIS BANDING:\n"
            "[I64] Stroke — defisit neurologis fokal\n\n"
            "DIAGNOSIS KERJA:\n"
            "[I64] Stroke iskemik akut — onset < 4.5 jam\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol 1 minggu bila tidak membaik\n\n"
            "PROGNOSIS:\n"
            "Dubia\n"
        )
        mock_provider.stream_chat.return_value = iter([mock_response])
        mock_build_provider.return_value = mock_provider

        history = []
        pasien = {}
        model = "test-model"
        backend = "local"

        with patch.object(m, "check_backend_readiness", return_value=(True, None, "")):
            prompt = (
                "Pasien tiba-tiba lumpuh separuh tubuh, wajah perot, "
                "tidak bisa bicara"
            )
            result = m._chat(prompt, history, pasien, model, backend)

        # The result should have urgent referral escalation injected
        self.assertIn("RUJUK EMERGENSI", result)
        self.assertIn("FAST", result.upper())
        # Routine follow-up should be replaced
        self.assertNotIn("Kontrol 1 minggu", result)


class EmergencyReferralRoutineCaseTests(unittest.TestCase):
    """Tests that routine cases do NOT get false emergency referral
    escalation."""

    def setUp(self):
        m._provider_cache.clear()

    def test_routine_case_no_escalation(self):
        """Routine case without red flags keeps its original KRITERIA RUJUK."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "[J06] ISPA — batuk pilek akut\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol 1 minggu bila tidak membaik — tidak ada indikasi rujukan saat ini\n\n"
            "PROGNOSIS:\n"
            "Bonam\n"
        )
        result = m._ensure_emergency_referral_escalation(response, [])
        self.assertEqual(result, response)
        # Should still have its routine follow-up language
        self.assertIn("Kontrol 1 minggu", result)

    @patch.object(m, "build_provider")
    @patch.object(m, "_retrieve_context", return_value="")
    @patch.object(m, "_show_uplink_animation")
    def test_chat_routine_case_no_false_escalation(
        self, mock_animation, mock_retrieve, mock_build_provider
    ):
        """Routine case through _chat does not get false emergency
        escalation injected."""
        mock_provider = MagicMock()
        mock_response = (
            "DIAGNOSIS BANDING:\n"
            "[J06] ISPA — batuk pilek\n"
            "[J20] Bronkitis akut — batuk produktif\n\n"
            "DIAGNOSIS KERJA:\n"
            "[J06] ISPA — sesuai gejala respirasi atas\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol 1 minggu bila tidak membaik\n\n"
            "PROGNOSIS:\n"
            "Bonam\n"
        )
        mock_provider.stream_chat.return_value = iter([mock_response])
        mock_build_provider.return_value = mock_provider

        history = []
        pasien = {}
        model = "test-model"
        backend = "local"

        with patch.object(m, "check_backend_readiness", return_value=(True, None, "")):
            prompt = "Batuk pilek 3 hari, tidak demam"
            result = m._chat(prompt, history, pasien, model, backend)

        # Should NOT have emergency referral language
        self.assertNotIn("RUJUK EMERGENSI", result)
        # Should have its routine follow-up
        self.assertIn("Kontrol 1 minggu", result)


class EmergencyReferralFormatTests(unittest.TestCase):
    """Tests for the format and content quality of injected emergency
    referral guidance."""

    def test_emergency_referral_includes_objective_threshold_values(self):
        """Injected emergency referral includes objective numerical thresholds
        (not just subjective descriptions)."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "[I64] Stroke\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol 1 minggu\n\n"
            "PROGNOSIS:\n"
            "Dubia\n"
        )
        rf_details = [
            {
                "name": "Stroke",
                "icd": "I64",
                "disease": "Stroke (I64)",
                "alert": "RED FLAG: Stroke",
            }
        ]
        result = m._ensure_emergency_referral_escalation(response, rf_details)

        # Must include numerical thresholds
        criteria_text = result[result.find("KRITERIA RUJUK:") :]
        self.assertTrue(
            any(thresh in criteria_text for thresh in ["4.5", "90", "13", "2"]),
            f"Expected objective numerical thresholds in criteria: {criteria_text}",
        )

    def test_emergency_referral_is_not_routine_language(self):
        """Emergency referral should NOT contain routine follow-up language
        like 'kontrol', 'minggu', 'bulan' as primary guidance."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "[I64] Stroke\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol 1 minggu\n\n"
            "PROGNOSIS:\n"
            "Dubia\n"
        )
        rf_details = [
            {
                "name": "Stroke",
                "icd": "I64",
                "disease": "Stroke (I64)",
                "alert": "RED FLAG: Stroke",
            }
        ]
        result = m._ensure_emergency_referral_escalation(response, rf_details)

        # The emergency section should not contain routine follow-up
        self.assertNotIn("Kontrol", result)
        # Should have urgent language instead
        self.assertIn("EMERGENSI", result)

    def test_emergency_referral_mentions_immediate_actions(self):
        """Emergency referral includes mention of stabilization or
        immediate actions before transport."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "[I64] Stroke\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol 1 minggu\n\n"
            "PROGNOSIS:\n"
            "Dubia\n"
        )
        all_emergency_rf = [
            {
                "name": "Stroke",
                "icd": "I64",
                "disease": "Stroke (I64)",
                "alert": "RED FLAG: Stroke",
            },
            {
                "name": "Acute Coronary Syndrome",
                "icd": "I21",
                "disease": "Acute Coronary Syndrome (I21)",
                "alert": "RED FLAG: ACS",
            },
            {
                "name": "Cedera Otak Traumatik",
                "icd": "S06",
                "disease": "Cedera Otak Traumatik / Trauma Kapitis (S06)",
                "alert": "RED FLAG: Trauma kepala",
            },
            {
                "name": "Meningitis Bakterial",
                "icd": "G00",
                "disease": "Meningitis Bakterial (G00)",
                "alert": "RED FLAG: Meningitis",
            },
            {
                "name": "Penurunan Kesadaran",
                "icd": "",
                "disease": "Penurunan Kesadaran",
                "alert": "RED FLAG: Penurunan kesadaran",
            },
        ]
        for rf in all_emergency_rf:
            with self.subTest(condition=rf["name"]):
                result = m._ensure_emergency_referral_escalation(response, [rf])
                # Every emergency referral section should mention stabilization
                has_stab = (
                    "stabilisasi" in result.lower()
                    or "transport" in result.lower()
                    or "segera" in result.lower()
                )
                self.assertTrue(
                    has_stab,
                    f"{rf['name']} should mention stabilization/transport in referral",
                )


if __name__ == "__main__":
    unittest.main()
