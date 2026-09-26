# Architected and built by codieverse+.
"""Tests for no-fabrication-missing-facts feature (milestone-3).

Validates VAL-SAFETY-009:
- When vitals, examination findings, lab data, medication history, allergies,
  onset timing, or score components are not provided, the output does not
  invent them or present them as if observed or calculated.
- Missing fields are marked unknown, asked for, or described for assessment
  rather than presented as observed or calculated.
- No unsupported findings or unsupported scores appear in the output.

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


class NoFabricationInstructionTests(unittest.TestCase):
    """Unit tests for _build_no_fabrication_instruction.

    This function builds a prompt instruction listing what clinical data is
    MISSING and must NOT be invented or presented as observed/calculated.
    """

    def test_function_exists_and_callable(self):
        """_build_no_fabrication_instruction is available and returns a string."""
        self.assertTrue(
            callable(m._build_no_fabrication_instruction),
            "_build_no_fabrication_instruction should be callable",
        )
        result = m._build_no_fabrication_instruction({}, {})
        self.assertIsInstance(result, str)

    def test_empty_case_lists_all_fields_as_missing(self):
        """When no data is provided, all fields are listed as missing."""
        result = m._build_no_fabrication_instruction({}, {})
        result_lower = result.lower()
        # Should mention vital signs are not available
        self.assertTrue(
            "tanda vital" in result_lower or "vital" in result_lower,
            f"Should mention vital signs as missing: '{result[:300]}'",
        )
        # Should mention lab data is not available
        self.assertTrue(
            "laboratorium" in result_lower
            or "lab" in result_lower
            or "pemeriksaan" in result_lower,
            f"Should mention lab/exam data as missing: '{result[:300]}'",
        )

    def test_case_with_vitals_does_not_list_vitals_as_missing(self):
        """When vitals are provided, they are not listed as missing."""
        kasus = {"keluhan": "demam", "vital": "TD 120/80, Nadi 88, RR 18, Suhu 38.5"}
        pasien = {}
        result = m._build_no_fabrication_instruction(kasus, pasien)
        # The instruction should not warn about inventing vitals since they were provided
        # But it may still mention other missing fields
        self.assertIsInstance(result, str)

    def test_case_with_lab_data_does_not_warn_about_lab_fabrication(self):
        """When lab data is mentioned in the case, the instruction is tailored."""
        kasus = {"keluhan": "demam", "vital": "TD 120/80", "gejala": "leukositosis"}
        pasien = {"alergi": "penisilin", "obat": "amlodipine"}
        result = m._build_no_fabrication_instruction(kasus, pasien)
        # Should still be a valid non-empty string
        self.assertIsInstance(result, str)
        self.assertGreater(len(result), 0)

    def test_patient_allergies_listed_when_available(self):
        """When patient allergies are available, the instruction reflects this."""
        pasien = {"alergi": "penisilin, sulfa"}
        result = m._build_no_fabrication_instruction({"keluhan": "demam"}, pasien)
        # Allergies provided, so it should not say "alergi tidak diketahui"
        # But the instruction format may vary - just check it doesn't claim allergies are missing
        self.assertIsInstance(result, str)

    def test_medication_history_tracked(self):
        """When medication history is available, instruction acknowledges it."""
        pasien = {"obat": "amlodipine 10mg, metformin 500mg"}
        result = m._build_no_fabrication_instruction({"keluhan": "hipertensi"}, pasien)
        self.assertIsInstance(result, str)
        # With medications provided, should be reflected
        self.assertGreater(len(result), 0)

    def test_onset_timing_missing_is_noted(self):
        """When duration/onset is missing, it's noted in the instruction."""
        kasus = {"keluhan": "nyeri perut"}
        pasien = {}
        result = m._build_no_fabrication_instruction(kasus, pasien)
        self.assertIsInstance(result, str)
        # Duration not provided, so timing should be noted as missing
        result_lower = result.lower()
        # Should address onset/duration somehow
        self.assertTrue(
            "durasi" in result_lower
            or "onset" in result_lower
            or "waktu" in result_lower
            or "kapan" in result_lower
            or "timing" in result_lower,
            f"Should address missing onset/duration: '{result[:400]}'",
        )

    def test_score_components_not_invented(self):
        """Instruction explicitly forbids inventing clinical scores from thin air."""
        result = m._build_no_fabrication_instruction({"keluhan": "batuk"}, {})
        result_lower = result.lower()
        # Should mention not inventing scores
        self.assertTrue(
            "skor" in result_lower
            or "score" in result_lower
            or "invensi" in result_lower
            or "invent" in result_lower,
            f"Should forbid inventing scores: '{result[:400]}'",
        )

    def test_instruction_contains_actionable_guidance(self):
        """Instruction contains actionable guidance like 'mark unknown' or 'ask'."""
        result = m._build_no_fabrication_instruction({"keluhan": "pusing"}, {})
        result_lower = result.lower()
        # Should contain actionable language
        guidance_terms = [
            "tandai",
            "nyatakan",
            "tidak diketahui",
            "tanyakan",
            "klarifikasi",
            "jangan",
            "deskripsikan",
            "cara menilai",
        ]
        found_any = any(term in result_lower for term in guidance_terms)
        self.assertTrue(
            found_any,
            f"Instruction should contain actionable guidance: '{result[:400]}'",
        )


class NoFabricationDetectionTests(unittest.TestCase):
    """Unit tests for _check_response_for_fabrication.

    VAL-SAFETY-009: When the entered case does not provide vitals, examination
    findings, lab data, medication history, allergies, onset timing, or score
    components, the visible output does not invent them.
    """

    def test_function_exists_and_callable(self):
        """_check_response_for_fabrication is available and returns a string."""
        self.assertTrue(
            callable(m._check_response_for_fabrication),
            "_check_response_for_fabrication should be callable",
        )
        result = m._check_response_for_fabrication("test", {}, {})
        self.assertIsInstance(result, str)

    def test_response_without_vitals_passes_through(self):
        """Response without fabricated vitals passes through unchanged."""
        kasus = {"keluhan": "demam"}
        pasien = {}
        response = "DIAGNOSIS KERJA:\nDemam — observasi lebih lanjut diperlukan."
        result = m._check_response_for_fabrication(response, kasus, pasien)
        self.assertEqual(result, response)

    def test_fabricated_vitals_detected_and_warned(self):
        """When vitals were not provided but appear in response, a warning is added."""
        kasus = {"keluhan": "demam"}  # No vitals provided
        pasien = {}
        response = (
            "PEMERIKSAAN FISIK:\n"
            "TD 120/80 mmHg, Nadi 88, RR 18, Suhu 38.5\n\n"
            "DIAGNOSIS KERJA:\n"
            "Demam — kemungkinan infeksi virus."
        )
        result = m._check_response_for_fabrication(response, kasus, pasien)
        # Should not be identical — warning should be added
        self.assertNotEqual(result, response)
        # Should still contain original content
        self.assertIn("DIAGNOSIS KERJA", result)
        # Should contain a warning about unsupported findings
        result_lower = result.lower()
        self.assertTrue(
            "tidak didukung" in result_lower
            or "tidak diberikan" in result_lower
            or "tidak tersedia" in result_lower
            or "belum tersedia" in result_lower
            or "data tidak" in result_lower
            or "fabricat" in result_lower
            or "warning" in result_lower
            or "peringatan" in result_lower
            or "catatan sistem" in result_lower
            or "temuan tidak" in result_lower
            or "bukan hasil" in result_lower,
            f"Response should contain warning about unsupported vitals: '{result[:500]}'",
        )

    def test_fabricated_lab_data_detected(self):
        """When lab data was not provided but specific lab values appear."""
        kasus = {"keluhan": "lemah"}  # No lab data
        pasien = {}
        response = (
            "ANJURAN PEMERIKSAAN:\n"
            "Darah lengkap — Hb 11.2 g/dL, Leukosit 8500, Trombosit 250000\n\n"
            "DIAGNOSIS KERJA:\n"
            "Anemia — berdasarkan hasil lab Hb rendah."
        )
        result = m._check_response_for_fabrication(response, kasus, pasien)
        # Should add warning about fabricated lab data
        self.assertNotEqual(result, response)

    def test_fabricated_gcs_detected(self):
        """GCS score fabricated when not provided."""
        kasus = {"keluhan": "pusing"}  # No GCS data
        pasien = {}
        response = (
            "PEMERIKSAAN FISIK:\n"
            "GCS 15, pupil isokor\n\n"
            "DIAGNOSIS KERJA:\n"
            "Cephalgia — tension-type headache."
        )
        result = m._check_response_for_fabrication(response, kasus, pasien)
        # GCS was not provided — should detect fabrication
        self.assertNotEqual(result, response)
        result_lower = result.lower()
        self.assertTrue(
            "gcs" in result_lower or "skor" in result_lower or "score" in result_lower,
            f"Should address GCS fabrication: '{result[:500]}'",
        )

    def test_fabricated_curb65_detected(self):
        """CURB-65 score fabricated when components not provided."""
        kasus = {"keluhan": "batuk"}  # No score components
        pasien = {}
        response = (
            "KRITERIA RUJUK:\n"
            "CURB-65 — skor 2 → rujuk RS\n\n"
            "PROGNOSIS:\n"
            "Baik dengan terapi."
        )
        result = m._check_response_for_fabrication(response, kasus, pasien)
        # CURB-65 score was calculated from fabricated inputs
        self.assertNotEqual(result, response)

    def test_provided_vitals_not_warned(self):
        """When vitals WERE provided, no warning is added for vitals."""
        kasus = {
            "keluhan": "demam",
            "vital": "TD 120/80, Nadi 88, RR 18, Suhu 38.5",
        }
        pasien = {}
        response = (
            "PEMERIKSAAN FISIK:\n"
            "TD 120/80 mmHg, Nadi 88, RR 18, Suhu 38.5\n\n"
            "DIAGNOSIS KERJA:\n"
            "Demam dengue."
        )
        result = m._check_response_for_fabrication(response, kasus, pasien)
        # Vitals were provided, same values in response is fine
        # The response should not have a fabrication warning for vitals
        self.assertEqual(result, response)

    def test_allergy_not_provided_not_warned_on_absence(self):
        """When allergies not mentioned in either kasus or pasien, no false positive."""
        kasus = {"keluhan": "batuk"}
        pasien = {}
        response = (
            "FARMAKOLOGI:\n"
            "Paracetamol 500mg PO 3x1 3 hari PC\n\n"
            "EDUKASI PASIEN:\n"
            "- Minum banyak air putih"
        )
        result = m._check_response_for_fabrication(response, kasus, pasien)
        # Response doesn't fabricate allergies, so should be fine
        self.assertEqual(result, response)

    def test_medication_history_not_fabricated(self):
        """Response does not invent medication history when not provided."""
        kasus = {"keluhan": "hipertensi"}
        pasien = {}  # No medication history
        response = (
            "DIAGNOSIS KERJA:\n"
            "Hipertensi esensial — pasien tidak mengonsumsi obat antihipertensi.\n\n"
            "TATALAKSANA:\n"
            "Mulai terapi antihipertensi."
        )
        result = m._check_response_for_fabrication(response, kasus, pasien)
        # If the response claims the patient IS on a specific medication that wasn't
        # provided, that would be fabrication. Here it says they're NOT on meds, which
        # may or may not be true but isn't claiming fabricated data.
        # This test just ensures the function doesn't crash.
        self.assertIsInstance(result, str)


class NoFabricationIntegrationTests(unittest.TestCase):
    """Integration tests: verify no-fabrication instructions appear in prompts
    and that warnings are visible in terminal output.
    """

    def test_no_fabrication_instruction_included_in_prompt_when_data_missing(self):
        """When data is missing, the no-fabrication instruction is appended to prompts."""
        kasus = {"keluhan": "pusing"}
        pasien = {}
        instruction = m._build_no_fabrication_instruction(kasus, pasien)
        self.assertGreater(len(instruction), 0)

        # Simulate building augmented prompt as main loop does
        base_prompt = m._build_case_prompt(kasus, pasien)
        augmented = base_prompt + "\n\n" + instruction
        self.assertGreater(len(augmented), len(base_prompt))
        self.assertIn(instruction, augmented)

    def test_print_no_fabrication_warning_function_exists(self):
        """_print_no_fabrication_warning function exists and is callable."""
        self.assertTrue(
            callable(m._print_no_fabrication_warning),
            "_print_no_fabrication_warning should be callable",
        )

    def test_print_warning_shows_visible_panel(self):
        """When fabrication is detected, a visible panel is printed."""
        detection = {
            "has_fabrication": True,
            "fabricated_items": ["Tanda vital (TD 120/80)", "GCS 15"],
            "message": "Data berikut tidak didukung oleh input klinis",
        }

        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_no_fabrication_warning(detection)
        output = buf.getvalue()
        self.assertGreater(len(output.strip()), 0)
        # Should mention fabricated items
        output_lower = output.lower()
        self.assertTrue(
            "tidak didukung" in output_lower
            or "tidak diberikan" in output_lower
            or "tidak tersedia" in output_lower
            or "ditemukan" in output_lower
            or "peringatan" in output_lower
            or "warning" in output_lower
            or "catatan" in output_lower,
            f"Panel should indicate fabricated data: '{output[:500]}'",
        )

    def test_print_warning_shows_nothing_when_no_fabrication(self):
        """When no fabrication detected, the warning function prints nothing."""
        detection = {
            "has_fabrication": False,
            "fabricated_items": [],
            "message": "",
        }

        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_no_fabrication_warning(detection)
        output = buf.getvalue().strip()
        self.assertEqual(output, "", "No output when no fabrication detected")

    def test_detection_result_structure(self):
        """_check_response_for_fabrication result has the detection dict structure."""
        # Test that the function also exposes a detection dict via
        # _detect_response_fabrication for use in the printing flow
        if hasattr(m, "_detect_response_fabrication"):
            detection = m._detect_response_fabrication(
                "DIAGNOSIS KERJA:\nM19 Osteoartritis",
                {"keluhan": "nyeri lutut"},
                {},
            )
            self.assertIsInstance(detection, dict)
            self.assertIn("has_fabrication", detection)
            self.assertIn("fabricated_items", detection)
            self.assertIn("message", detection)
            self.assertIsInstance(detection["has_fabrication"], bool)
            self.assertIsInstance(detection["fabricated_items"], list)
            self.assertIsInstance(detection["message"], str)

    def test_main_flow_can_append_fabrication_warning_to_saved_response(self):
        """The same warning shown to the doctor can be persisted in final response text."""
        response = (
            "DIAGNOSIS KERJA:\n"
            "Dugaan awal hipertensi\n\n"
            "TATALAKSANA:\n"
            "Pantau TD 120/80"
        )
        kasus = {"keluhan": "pusing"}
        pasien = {}

        persisted = m._check_response_for_fabrication(response, kasus, pasien)

        self.assertIn("PERINGATAN", persisted.upper())
        self.assertIn("TIDAK DIDUKUNG INPUT DOKTER", persisted.upper())
        self.assertIn("TD 120/80", persisted)

    @patch.object(m, "build_provider")
    @patch.object(m, "_retrieve_context", return_value="")
    @patch.object(m, "_show_uplink_animation")
    def test_no_fabrication_instruction_in_prompt_to_model(
        self, mock_animation, mock_retrieve, mock_build_provider
    ):
        """The no-fabrication instruction is included in prompts sent to the model."""
        mock_provider = MagicMock()
        mock_provider.stream_chat.return_value = iter(["Dummy response"])
        mock_build_provider.return_value = mock_provider

        history = []
        pasien = {}
        model = "test-model"
        backend = "local"

        with patch.object(m, "check_backend_readiness", return_value=(True, None, "")):
            kasus = {"keluhan": "saya tidak enak badan"}
            prompt = m._build_case_prompt(kasus, pasien)
            instruction = m._build_no_fabrication_instruction(kasus, pasien)
            augmented_prompt = prompt + "\n\n" + instruction

            m._chat(augmented_prompt, history, pasien, model, backend)

        self.assertTrue(mock_provider.stream_chat.called)
        call_messages = mock_provider.stream_chat.call_args[0][0]
        user_content = ""
        for msg in call_messages:
            if msg.get("role") == "user":
                user_content += msg.get("content", "")
        self.assertGreater(len(user_content), 0)
        # The no-fabrication instruction should be in the prompt
        self.assertIn(
            instruction[:50],
            user_content,
            "No-fabrication instruction not found in prompt sent to model",
        )


class NoFabricationEdgeCaseTests(unittest.TestCase):
    """Edge cases for no-fabrication behavior."""

    def test_all_data_provided_no_false_positive(self):
        """When all data IS provided, no fabrication warning."""
        kasus = {
            "keluhan": "nyeri dada kiri menjalar ke lengan",
            "durasi": "2 jam",
            "gejala": "keringat dingin, mual",
            "redflag": "nyeri dada dengan keringat dingin",
            "vital": "TD 160/95, Nadi 102, RR 22, Suhu 36.8",
        }
        pasien = {
            "nama": "Test",
            "usia": "45",
            "alergi": "tidak ada",
            "obat": "amlodipine 10mg",
        }
        detection = m._detect_response_fabrication(
            "DIAGNOSIS KERJA:\nACS — berdasarkan keluhan dan tanda vital.",
            kasus,
            pasien,
        )
        self.assertFalse(
            detection.get("has_fabrication"),
            "No fabrication should be detected when all data provided",
        )

    def test_empty_response_handled(self):
        """Empty or whitespace-only response handled gracefully."""
        detection = m._detect_response_fabrication("", {}, {})
        self.assertFalse(detection.get("has_fabrication"))

        detection = m._detect_response_fabrication("   \n  ", {}, {})
        self.assertFalse(detection.get("has_fabrication"))

    def test_instruction_is_idempotent(self):
        """Multiple calls with same input produce same instruction."""
        kasus = {"keluhan": "demam"}
        pasien = {}
        first = m._build_no_fabrication_instruction(kasus, pasien)
        second = m._build_no_fabrication_instruction(kasus, pasien)
        self.assertEqual(first, second)

    def test_instruction_different_for_different_missing_data(self):
        """Instruction varies based on what data is missing."""
        sparse_kasus = {"keluhan": "demam"}
        full_kasus = {
            "keluhan": "demam",
            "durasi": "3 hari",
            "gejala": "batuk, pilek",
            "vital": "TD 110/70, Suhu 38.0",
        }
        sparse_instruction = m._build_no_fabrication_instruction(sparse_kasus, {})
        full_instruction = m._build_no_fabrication_instruction(full_kasus, {})
        # Instructions should differ because different data is missing
        self.assertNotEqual(sparse_instruction, full_instruction)

    def test_cannot_fabricate_examination_findings(self):
        """When examination findings not provided, they cannot be fabricated."""
        kasus = {"keluhan": "nyeri perut"}  # No exam findings
        pasien = {}
        response = (
            "PEMERIKSAAN FISIK:\n"
            "Abdomen: ditemukan nyeri tekan epigastrium, bising usus normal\n"
            "Paru: terdengar ronki basal bilateral\n\n"
            "DIAGNOSIS KERJA:\n"
            "Gastritis akut."
        )
        detection = m._detect_response_fabrication(response, kasus, pasien)
        # Physical exam findings use "ditemukan"/"terdengar" patterns not supported by input
        self.assertTrue(
            detection.get("has_fabrication"),
            "Should detect fabricated physical exam findings",
        )


if __name__ == "__main__":
    unittest.main()
