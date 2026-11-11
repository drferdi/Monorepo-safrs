# Architected and built by codieverse+.
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from sidelab.safety.intake_pipeline import build_clinical_intake_context
from sidelab.safety.output_contract import commit_final_response
from sidelab.safety.output_pipeline import finalize_clinical_output

_spec = importlib.util.spec_from_file_location(
    "sidelab_app", Path(__file__).resolve().parent.parent.parent / "sidelab.py"
)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


class OutputPipelineTests(unittest.TestCase):
    def test_output_contract_commits_final_response_to_history_once(self):
        history = [{"role": "user", "content": "raw augmented prompt"}]
        final_text = "FINAL RESPONSE\nPERINGATAN — DATA KLINIS TIDAK DIDUKUNG INPUT DOKTER"

        returned = commit_final_response(
            history,
            final_text,
            visible_prompt="dokter prompt",
        )

        self.assertEqual(returned, final_text)
        self.assertEqual(history[0]["content"], "dokter prompt")
        self.assertEqual(history[-1], {"role": "assistant", "content": final_text})
        self.assertEqual(len([m for m in history if m["role"] == "assistant"]), 1)

    def test_fabricated_vital_warning_is_persisted(self):
        response = (
            "DIAGNOSIS KERJA:\n"
            "Dugaan awal hipertensi\n\n"
            "TATALAKSANA:\n"
            "Pantau TD 120/80"
        )

        result = finalize_clinical_output(
            response=response,
            prompt="pusing",
            kasus={"keluhan": "pusing"},
            pasien={},
            rf_details=[],
            apply_pharma=False,
        )

        self.assertTrue(result.warnings["fabrication"]["has_fabrication"])
        self.assertIn("PERINGATAN", result.text.upper())
        self.assertIn("TD 120/80", result.text)

    def test_red_flag_is_injected_into_diagnostic_frame(self):
        response = (
            "DIAGNOSIS BANDING:\n"
            "[J00] Nasofaringitis akut — keluhan umum\n\n"
            "DIAGNOSIS KERJA:\n"
            "[J00] Nasofaringitis akut — perlu evaluasi\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol rutin bila memburuk\n"
        )
        rf_details = [
            {
                "name": "Stroke",
                "icd": "I64",
                "disease": "Stroke (I64)",
                "alert": "RED FLAG: Defisit neurologis fokal",
            }
        ]

        result = finalize_clinical_output(
            response=response,
            prompt="wajah perot pelo",
            kasus={"keluhan": "wajah perot pelo"},
            pasien={},
            rf_details=rf_details,
            apply_pharma=False,
        )

        self.assertIn("Stroke", result.text)
        self.assertIn("RUJUK EMERGENSI", result.text)

    def test_absolute_language_gets_provisional_caveat(self):
        response = (
            "DIAGNOSIS KERJA:\n"
            "Diagnosis pasti diabetes mellitus\n\n"
            "PROGNOSIS:\n"
            "Baik"
        )

        result = finalize_clinical_output(
            response=response,
            prompt="lemas",
            kasus={"keluhan": "lemas"},
            pasien={},
            rf_details=[],
            apply_pharma=False,
        )

        self.assertIn("PEMBINGKAIAN PROVISIONAL", result.text)
        self.assertIn("HIPOTESIS", result.text)

    def test_finalizer_is_idempotent_for_fabrication_warning(self):
        first = finalize_clinical_output(
            response="TATALAKSANA:\nPantau TD 120/80",
            prompt="pusing",
            kasus={"keluhan": "pusing"},
            pasien={},
            rf_details=[],
            apply_pharma=False,
        ).text
        second = finalize_clinical_output(
            response=first,
            prompt="pusing",
            kasus={"keluhan": "pusing"},
            pasien={},
            rf_details=[],
            apply_pharma=False,
        ).text

        self.assertEqual(
            second.upper().count("TIDAK DIDUKUNG INPUT DOKTER"),
            1,
        )

    def test_finalizer_is_idempotent_for_provisional_caveat(self):
        first = finalize_clinical_output(
            response="DIAGNOSIS KERJA:\nDiagnosis pasti diabetes mellitus\n",
            prompt="lemas",
            kasus={"keluhan": "lemas"},
            pasien={},
            rf_details=[],
            apply_pharma=False,
        ).text
        second = finalize_clinical_output(
            response=first,
            prompt="lemas",
            kasus={"keluhan": "lemas"},
            pasien={},
            rf_details=[],
            apply_pharma=False,
        ).text

        self.assertEqual(second.count("PEMBINGKAIAN PROVISIONAL"), 1)

    def test_finalizer_is_idempotent_for_emergency_consistency_panel(self):
        response = (
            "DIAGNOSIS KERJA:\n"
            "[I64] Stroke — defisit neurologis fokal\n\n"
            "KRITERIA RUJUK:\n"
            "Kontrol rutin bila memburuk\n"
        )

        first = finalize_clinical_output(
            response=response,
            prompt="wajah perot pelo",
            kasus={"keluhan": "wajah perot pelo"},
            pasien={},
            rf_details=[],
            apply_pharma=False,
        ).text
        second = finalize_clinical_output(
            response=first,
            prompt="wajah perot pelo",
            kasus={"keluhan": "wajah perot pelo"},
            pasien={},
            rf_details=[],
            apply_pharma=False,
        ).text

        self.assertEqual(second.count("VAL-CROSS-005"), 1)

    def test_finalizer_is_idempotent_for_pharmacology_validation_panel(self):
        response = (
            "DIAGNOSIS KERJA:\n"
            "Dugaan awal nyeri muskuloskeletal\n\n"
            "FARMAKOLOGI:\n"
            "Ibuprofen 3x400 mg PO 5 hari PC\n"
        )

        first = finalize_clinical_output(
            response=response,
            prompt="nyeri lutut",
            kasus={"keluhan": "nyeri lutut", "durasi": "1 hari"},
            pasien={},
            rf_details=[],
            pharma_format_fn=m._format_farmakologi_tree,
            allow_pharma_backfill=False,
            enforce_pharma_floor=True,
        ).text
        second = finalize_clinical_output(
            response=first,
            prompt="nyeri lutut",
            kasus={"keluhan": "nyeri lutut", "durasi": "1 hari"},
            pasien={},
            rf_details=[],
            pharma_format_fn=m._format_farmakologi_tree,
            allow_pharma_backfill=False,
            enforce_pharma_floor=True,
        ).text

        self.assertEqual(second.count("VALIDASI FARMAKOLOGI"), 1)


class CliPipelineSourceTests(unittest.TestCase):
    def test_intake_pipeline_module_builds_context_with_injected_dependencies(self):
        result = build_clinical_intake_context(
            "pusing",
            {},
            kasus={"keluhan": "pusing"},
            build_case_prompt=lambda kasus, pasien: "KELUHAN UTAMA: pusing",
            check_insufficient_data_state=lambda kasus, pasien: {
                "is_insufficient": True,
                "conservative_prompt_addition": "DATA TIDAK CUKUP",
            },
            detect_sparse_complaint=lambda kasus: {
                "is_sparse": True,
                "conservative_prompt_addition": "DATA SPARSE",
            },
            detect_uncertain_context=lambda kasus, pasien: {
                "is_uncertain": True,
                "provisional_language_instruction": "GUNAKAN HIPOTESIS",
            },
            build_no_fabrication_instruction=lambda kasus, pasien: (
                "PANDUAN KEJUJURAN DATA"
            ),
        )

        self.assertEqual(result["kasus"], {"keluhan": "pusing"})
        self.assertIn("KELUHAN UTAMA: pusing", result["augmented_prompt"])
        self.assertIn("DATA TIDAK CUKUP", result["augmented_prompt"])
        self.assertNotIn("DATA SPARSE", result["augmented_prompt"])
        self.assertIn("GUNAKAN HIPOTESIS", result["augmented_prompt"])
        self.assertIn("PANDUAN KEJUJURAN DATA", result["augmented_prompt"])

    def test_chat_inner_uses_shared_finalizer_before_rendering(self):
        source = Path("sidelab.py").read_text(encoding="utf-8")
        finalizer_pos = source.index("finalize_clinical_output(")
        renderer_pos = source.index("renderer = StreamRenderer()", finalizer_pos)

        self.assertLess(finalizer_pos, renderer_pos)
        self.assertIn("\"vital\": prompt", source)
        self.assertIn("commit_final_response(", source)

    def test_main_passes_structured_case_into_chat_finalizer(self):
        source = Path("sidelab.py").read_text(encoding="utf-8")

        self.assertIn(
            "_chat(\n                augmented_prompt, history, pasien, model, backend, kasus=kasus\n            )",
            source,
        )

    def test_tui_wrapper_passes_case_and_safety_prompt_to_chat(self):
        marker_console = object()

        with patch.object(m, "_chat", return_value="final") as mock_chat:
            result = m._chat_tui_with_safety_prompt(
                "pusing",
                [],
                {},
                "test-model",
                "local",
                marker_console,
            )

        self.assertEqual(result, "final")
        call = mock_chat.call_args
        prompt = call.args[0]
        self.assertIn("KELUHAN UTAMA: pusing", prompt)
        self.assertIn("PANDUAN KEJUJURAN DATA", prompt)
        self.assertEqual(call.kwargs["kasus"], {"keluhan": "pusing"})
        self.assertIs(call.kwargs["console_override"], marker_console)

    def test_shared_intake_context_builds_case_and_all_guardrail_prompt_parts(self):
        result = m._build_clinical_intake_context(
            "pusing",
            {},
            kasus={"keluhan": "pusing"},
        )

        self.assertEqual(result["kasus"], {"keluhan": "pusing"})
        self.assertIn("KELUHAN UTAMA: pusing", result["augmented_prompt"])
        self.assertIn("DATA TIDAK CUKUP", result["augmented_prompt"])
        self.assertIn("PANDUAN KEJUJURAN DATA", result["augmented_prompt"])
        self.assertTrue(result["insufficient_result"]["is_insufficient"])

    def test_tui_wrapper_delegates_prompt_construction_to_shared_helper(self):
        marker_console = object()
        built = {
            "kasus": {"keluhan": "nyeri"},
            "augmented_prompt": "BUILT PROMPT",
            "insufficient_result": {},
            "sparse_result": {},
            "uncertain_ctx": {},
            "no_fab_instruction": "",
        }

        with (
            patch.object(m, "_build_clinical_intake_context", return_value=built) as mock_build,
            patch.object(m, "_chat", return_value="final") as mock_chat,
        ):
            result = m._chat_tui_with_safety_prompt(
                "nyeri",
                [],
                {},
                "test-model",
                "local",
                marker_console,
            )

        self.assertEqual(result, "final")
        mock_build.assert_called_once_with("nyeri", {})
        self.assertEqual(mock_chat.call_args.args[0], "BUILT PROMPT")
        self.assertEqual(mock_chat.call_args.kwargs["kasus"], {"keluhan": "nyeri"})

    def test_insufficient_data_can_skip_pharma_backfill_and_floor(self):
        response = (
            "DIAGNOSIS KERJA:\n"
            "Dugaan awal osteoartritis\n\n"
            "FARMAKOLOGI:\n"
            "Ibuprofen 3x400 mg PO 5 hari PC\n"
        )

        result = finalize_clinical_output(
            response=response,
            prompt="nyeri sendi",
            kasus={"keluhan": "nyeri sendi"},
            pasien={},
            rf_details=[],
            pharma_format_fn=m._format_farmakologi_tree,
            allow_pharma_backfill=False,
            enforce_pharma_floor=False,
        )

        self.assertIn("Ibuprofen", result.text)
        self.assertNotIn("Vitamin B kompleks", result.text)
        self.assertNotIn("VALIDASI FARMAKOLOGI", result.text)

    @patch.object(m, "build_provider")
    @patch.object(m, "_retrieve_context", return_value="")
    @patch.object(m, "_show_uplink_animation")
    def test_sparse_cases_do_not_force_pharma_backfill_or_minimum_panel(
        self, mock_animation, mock_retrieve, mock_build_provider
    ):
        sparse_cases = ["pusing", "tidak enak badan", "nyeri"]
        response = (
            "DIAGNOSIS KERJA:\n"
            "Dugaan awal nyeri muskuloskeletal\n\n"
            "FARMAKOLOGI:\n"
            "Ibuprofen 3x400 mg PO 5 hari PC\n\n"
            "RENCANA:\n"
            "Lengkapi anamnesis dan pemeriksaan fisik sebelum terapi definitif."
        )

        with patch.object(m, "check_backend_readiness", return_value=(True, None, "")):
            for complaint in sparse_cases:
                with self.subTest(complaint=complaint):
                    m._provider_cache.clear()
                    mock_provider = MagicMock()
                    mock_provider.stream_chat.return_value = iter([response])
                    mock_build_provider.return_value = mock_provider

                    result = m._chat(
                        complaint,
                        [],
                        {},
                        "test-model",
                        "local",
                        kasus={"keluhan": complaint},
                    )

                    self.assertIn("Ibuprofen", result)
                    self.assertNotIn("Vitamin B kompleks", result)
                    self.assertNotIn("VALIDASI FARMAKOLOGI", result)
                    self.assertIn("Lengkapi", result)

    @patch.object(m, "build_provider")
    @patch.object(m, "_retrieve_context", return_value="")
    @patch.object(m, "_show_uplink_animation")
    def test_chat_return_value_matches_committed_history_final_output(
        self, mock_animation, mock_retrieve, mock_build_provider
    ):
        mock_provider = MagicMock()
        mock_provider.stream_chat.return_value = iter(
            ["TATALAKSANA:\nPantau TD 120/80"]
        )
        mock_build_provider.return_value = mock_provider
        history = []

        with patch.object(m, "check_backend_readiness", return_value=(True, None, "")):
            result = m._chat(
                "pusing",
                history,
                {},
                "test-model",
                "local",
                kasus={"keluhan": "pusing"},
            )

        self.assertEqual(history[-1]["content"], result)
        self.assertIn("TIDAK DIDUKUNG INPUT DOKTER", result.upper())


class OutputPersistenceTests(unittest.TestCase):
    def test_final_warning_reaches_last_response_save_send_and_copy_source(self):
        result = finalize_clinical_output(
            response="TATALAKSANA:\nPantau TD 120/80",
            prompt="pusing",
            kasus={"keluhan": "pusing"},
            pasien={},
            rf_details=[],
            apply_pharma=False,
        )
        last_response = result.text
        history = [{"role": "assistant", "content": last_response}]

        self.assertIn("TIDAK DIDUKUNG INPUT DOKTER", last_response.upper())

        with tempfile.TemporaryDirectory() as tmpdir:
            with patch.object(m, "SESSIONS_DIR", Path(tmpdir)):
                m._save_session(history, {}, "test-session")
            saved_text = next(Path(tmpdir).glob("*.txt")).read_text(encoding="utf-8")

        telegram_text = m.format_message(last_response, {}, "test-session")
        tui_source = Path("sidelab/tui.py").read_text(encoding="utf-8")

        self.assertIn("TIDAK DIDUKUNG INPUT DOKTER", saved_text.upper())
        self.assertIn("TIDAK DIDUKUNG INPUT DOKTER", telegram_text.upper())
        self.assertIn("self._copy_text(self._last_response)", tui_source)
