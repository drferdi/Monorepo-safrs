# Architected and built by codieverse+.
"""Karakterisasi perilaku sidelab/intelligence.py.

Semua tes memakai data klinis sintetis: indeks modul (_CHAINS, _VECTORS, _DIS_BY_ICD,
_D144_BY_ICD, _BASE) ditambal dengan unittest.mock sehingga klaim tidak bergantung pada isi
data/ yang bisa berubah. Modul ini tidak melakukan panggilan HTTP apa pun
(_tfidf_query_vector selalu mengembalikan None), jadi tidak ada endpoint yang perlu dipalsukan.
"""
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from sidelab import intelligence as _intel

# ---------------------------------------------------------------------------
# Fixture sintetis
# ---------------------------------------------------------------------------

_CHEST_CHAIN = {
    "clinical_entity": "Nyeri Dada Sintetis",
    "logical_chain": ["Sesak napas", "Palpitasi", "Keringat dingin", "Mual", "Pusing", "Batuk"],
    "predictive_next": {"red_flags": ["RF satu", "RF dua", "RF tiga", "RF empat"]},
    "pemeriksaan": {
        "fisik": ["Fisik satu", "Fisik dua", "Fisik tiga", "Fisik empat"],
        "lab": ["Lab satu", "Lab dua", "Lab tiga", "Lab empat"],
        "penunjang": ["Penunjang satu", "Penunjang dua", "Penunjang tiga"],
    },
}

_FEVER_CHAIN = {
    "clinical_entity": "Demam Sintetis",
    "logical_chain": ["Menggigil"],
}

_VECTORS = [
    {"icd10": "J06", "nama": "Infeksi saluran napas atas", "vector": [1.0, 0.0, 0.0]},
    {"icd10": "A09", "nama": "Diare akut", "vector": [0.0, 1.0, 0.0]},
    {"icd10": "I10", "nama": "Hipertensi esensial", "vector": [1.0, 1.0, 0.0]},
]

_DIS_BY_ICD = {"J06": {"nama": "ISPA sintetis", "icd10": "J06"}}
_D144_BY_ICD = {"I10": {"nama": "Hipertensi sintetis", "icd10": "I10"}}


def _patch_chains(chains):
    return mock.patch.object(_intel, "_CHAINS", chains)


def _patch_vectors(vectors=None):
    stack = [
        mock.patch.object(_intel, "_VECTORS", _VECTORS if vectors is None else vectors),
        mock.patch.object(_intel, "_DIS_BY_ICD", _DIS_BY_ICD),
        mock.patch.object(_intel, "_D144_BY_ICD", _D144_BY_ICD),
    ]
    return stack


class _VectorPatchMixin:
    def _start_vector_patches(self, vectors=None):
        for patcher in _patch_vectors(vectors):
            patcher.start()
            self.addCleanup(patcher.stop)


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------


class LoadDataTests(unittest.TestCase):
    def test_load_parses_json_file_from_data_dir(self):
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp, "chains.json").write_text('{"demam": {"x": 1}}', encoding="utf-8")
            with mock.patch.object(_intel, "_BASE", Path(tmp)):
                self.assertEqual(_intel._load("chains.json"), {"demam": {"x": 1}})

    def test_load_returns_empty_dict_when_file_is_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch.object(_intel, "_BASE", Path(tmp)):
                self.assertEqual(_intel._load("tidak-ada.json"), {})

    def test_load_returns_empty_dict_when_json_is_malformed(self):
        with tempfile.TemporaryDirectory() as tmp:
            Path(tmp, "rusak.json").write_text("{bukan json", encoding="utf-8")
            with mock.patch.object(_intel, "_BASE", Path(tmp)):
                self.assertEqual(_intel._load("rusak.json"), {})

    def test_chain_index_excludes_metadata_keys_starting_with_underscore(self):
        meta_keys = [k for k in _intel._CHAINS_RAW if k.startswith("_")]
        self.assertTrue(meta_keys, "clinical-chains.json is expected to carry metadata keys")
        for key in meta_keys:
            self.assertNotIn(key, _intel._CHAINS)


# ---------------------------------------------------------------------------
# ClinicalChainScaffold — _match_chains
# ---------------------------------------------------------------------------


class MatchChainsTests(unittest.TestCase):
    def test_key_substring_in_query_is_matched(self):
        with _patch_chains({"nyeri dada": _CHEST_CHAIN}):
            result = _intel._match_chains("Pasien Nyeri Dada kiri sejak pagi")
        self.assertEqual(result, [{"key": "nyeri dada", "chain": _CHEST_CHAIN}])

    def test_query_without_any_key_word_returns_empty_list(self):
        with _patch_chains({"nyeri dada": _CHEST_CHAIN, "demam": _FEVER_CHAIN}):
            self.assertEqual(_intel._match_chains("gatal di kulit lengan"), [])

    def test_multiword_key_with_all_words_present_out_of_order_ranks_above_partial_match(self):
        chains = {"nyeri perut": {}, "dada berdebar": {}}
        with _patch_chains(chains):
            result = _intel._match_chains("berdebar di dada lalu nyeri")
        # "dada berdebar" = semua kata ada (prioritas 1); "nyeri perut" = kata pertama saja
        # (prioritas 2), walau urutan dict menaruhnya lebih dulu.
        self.assertEqual([m["key"] for m in result], ["dada berdebar", "nyeri perut"])

    def test_first_word_shorter_than_four_chars_does_not_give_partial_match(self):
        with _patch_chains({"bab hitam": {}}):
            self.assertEqual(_intel._match_chains("bab cair tiga kali"), [])

    def test_matches_are_ordered_by_priority_and_capped_at_three(self):
        chains = {
            "nyeri perut": {},  # prioritas 2
            "dada berdebar": {},  # prioritas 1
            "demam": {},  # prioritas 0
            "sesak napas": {},  # prioritas 2
        }
        with _patch_chains(chains):
            result = _intel._match_chains("demam berdebar dada nyeri sesak")
        self.assertEqual(
            [m["key"] for m in result], ["demam", "dada berdebar", "nyeri perut"]
        )


# ---------------------------------------------------------------------------
# ClinicalChainScaffold — build_chain_scaffold
# ---------------------------------------------------------------------------


class BuildChainScaffoldTests(unittest.TestCase):
    def test_no_matching_chain_returns_empty_string(self):
        with _patch_chains({"nyeri dada": _CHEST_CHAIN}):
            self.assertEqual(_intel.build_chain_scaffold("gatal kulit", {}), "")

    def test_kasus_keluhan_field_triggers_chain_when_query_does_not(self):
        with _patch_chains({"nyeri dada": _CHEST_CHAIN}):
            scaffold = _intel.build_chain_scaffold("kontrol ulang", {"keluhan": "nyeri dada"})
        self.assertIn("Keluhan utama terdeteksi: Nyeri Dada Sintetis", scaffold)

    def test_kasus_redflag_field_triggers_chain(self):
        with _patch_chains({"demam": _FEVER_CHAIN}):
            scaffold = _intel.build_chain_scaffold(
                "kontrol ulang", {"gejala": "lemas", "redflag": "demam tinggi"}
            )
        self.assertIn("Keluhan utama terdeteksi: Demam Sintetis", scaffold)

    def test_scaffold_lists_are_truncated_to_documented_limits(self):
        with _patch_chains({"nyeri dada": _CHEST_CHAIN}):
            lines = _intel.build_chain_scaffold("nyeri dada", {}).split("\n")
        self.assertIn(
            "  Gejala penyerta tipikal: Sesak napas, Palpitasi, Keringat dingin, Mual, Pusing",
            lines,
        )
        self.assertIn("  Red flags yang harus dicari: RF satu, RF dua, RF tiga", lines)
        self.assertIn("  Pemeriksaan fisik prioritas: Fisik satu, Fisik dua, Fisik tiga", lines)
        self.assertIn("  Lab yang relevan: Lab satu, Lab dua, Lab tiga", lines)
        self.assertIn("  Penunjang: Penunjang satu, Penunjang dua", lines)
        joined = "\n".join(lines)
        for dropped in ("Batuk", "RF empat", "Fisik empat", "Lab empat", "Penunjang tiga"):
            self.assertNotIn(dropped, joined)

    def test_chain_without_entity_or_optional_sections_uses_key_and_only_frame_lines(self):
        with _patch_chains({"kejang": {}}):
            scaffold = _intel.build_chain_scaffold("anak kejang", {})
        self.assertEqual(
            scaffold,
            "CLINICAL REASONING SCAFFOLD (berdasarkan clinical chains):\n"
            "\nKeluhan utama terdeteksi: kejang\n"
            "\nGunakan scaffold di atas sebagai KERANGKA reasoning — bukan sebagai "
            "diagnosis final. Sesuaikan dengan data pasien aktif dan temuan klinis yang ada.",
        )

    def test_scaffold_renders_one_block_per_matched_chain_in_match_order(self):
        with _patch_chains({"demam": _FEVER_CHAIN, "nyeri dada": _CHEST_CHAIN}):
            scaffold = _intel.build_chain_scaffold("nyeri dada dan demam", {})
        self.assertLess(
            scaffold.index("Keluhan utama terdeteksi: Demam Sintetis"),
            scaffold.index("Keluhan utama terdeteksi: Nyeri Dada Sintetis"),
        )
        self.assertIn("  Gejala penyerta tipikal: Menggigil", scaffold)


# ---------------------------------------------------------------------------
# QueryNormalizer
# ---------------------------------------------------------------------------


class NormalizeQueryTests(unittest.TestCase):
    def test_expands_metabolic_abbreviations_case_insensitively(self):
        self.assertEqual(
            _intel.normalize_query("Pasien HT dengan DM, cek GDP dan HbA1c"),
            "Pasien hipertensi dengan diabetes melitus, cek gula darah puasa "
            "dan hemoglobin a1c kadar",
        )

    def test_expands_vital_and_lab_abbreviations(self):
        self.assertEqual(
            _intel.normalize_query("td 150/90 SpO2 95% gds 210"),
            "tekanan darah 150/90 saturasi oksigen 95% gula darah sewaktu 210",
        )

    def test_expands_diagnosis_and_exam_abbreviations(self):
        self.assertEqual(
            _intel.normalize_query("ispa atau gea, hbsag dan ecg"),
            "infeksi saluran pernapasan atas atau gastroenteritis akut, "
            "hepatitis b antigen dan ekg elektrokardiogram",
        )

    def test_abbreviation_inside_longer_word_is_left_untouched(self):
        self.assertEqual(_intel.normalize_query("dmx htn tdk"), "dmx htn tdk")

    def test_strips_edges_and_collapses_repeated_spaces(self):
        self.assertEqual(_intel.normalize_query("   demam    tinggi   "), "demam tinggi")


# ---------------------------------------------------------------------------
# SemanticRetriever
# ---------------------------------------------------------------------------


class CosineTests(unittest.TestCase):
    def test_identical_vectors_have_similarity_one(self):
        self.assertAlmostEqual(_intel._cosine([0.3, 0.4], [0.3, 0.4]), 1.0)

    def test_orthogonal_vectors_have_similarity_zero(self):
        self.assertEqual(_intel._cosine([1.0, 0.0], [0.0, 1.0]), 0.0)

    def test_zero_magnitude_vector_on_either_side_gives_zero(self):
        self.assertEqual(_intel._cosine([0.0, 0.0], [1.0, 2.0]), 0.0)
        self.assertEqual(_intel._cosine([1.0, 2.0], [0.0, 0.0]), 0.0)

    def test_query_encoder_placeholder_signals_fallback_with_none(self):
        self.assertIsNone(_intel._tfidf_query_vector({"demam", "batuk"}))


class SemanticRetrieveTests(_VectorPatchMixin, unittest.TestCase):
    def test_empty_vector_index_returns_empty_list(self):
        self._start_vector_patches(vectors=[])
        self.assertEqual(_intel.semantic_retrieve("demam", query_vector=[1.0, 0.0, 0.0]), [])

    def test_query_vector_ranks_by_cosine_similarity_with_rounded_scores(self):
        self._start_vector_patches()
        result = _intel.semantic_retrieve("apa saja", top_k=2, query_vector=[1.0, 0.0, 0.0])
        self.assertEqual(
            [(r["icd10"], r["nama"], r["score"]) for r in result],
            [("J06", "Infeksi saluran napas atas", 1.0), ("I10", "Hipertensi esensial", 0.7071)],
        )

    def test_results_attach_disease_and_d144_records_or_empty_dicts(self):
        self._start_vector_patches()
        result = _intel.semantic_retrieve("apa saja", top_k=2, query_vector=[1.0, 0.0, 0.0])
        self.assertEqual(result[0]["disease_data"], _DIS_BY_ICD["J06"])
        self.assertEqual(result[0]["d144_data"], {})
        self.assertEqual(result[1]["disease_data"], {})
        self.assertEqual(result[1]["d144_data"], _D144_BY_ICD["I10"])

    def test_query_vector_of_wrong_length_falls_back_to_keyword_overlap(self):
        self._start_vector_patches()
        result = _intel.semantic_retrieve("diare akut", top_k=1, query_vector=[1.0, 0.0])
        self.assertEqual([(r["icd10"], r["score"]) for r in result], [("A09", 0.2)])

    def test_keyword_fallback_scores_word_overlap_plus_icd_prefix_bonus(self):
        self._start_vector_patches()
        result = _intel.semantic_retrieve("hipertensi esensial i10", top_k=1)
        self.assertEqual([(r["icd10"], r["score"]) for r in result], [("I10", 0.7)])

    def test_keyword_fallback_icd_prefix_alone_outranks_single_word_overlap(self):
        self._start_vector_patches()
        result = _intel.semantic_retrieve("kode j06 dengan diare", top_k=2)
        self.assertEqual(
            [(r["icd10"], r["score"]) for r in result], [("J06", 0.5), ("A09", 0.1)]
        )


# ---------------------------------------------------------------------------
# CertaintyCalibrator
# ---------------------------------------------------------------------------

_THREE_WORD_KELUHAN = "nyeri dada kiri"
_FULL_PASIEN = {"umur": "54", "jk": "L", "bb": "70"}


class CalibrateCertaintyTests(unittest.TestCase):
    def test_empty_case_is_insufficient_data(self):
        self.assertEqual(_intel.calibrate_certainty({}, {}, []), "insufficient_data")

    def test_single_generic_complaint_scores_nothing(self):
        # "demam" (0) + durasi (1) + gejala (1) = 2
        kasus = {"keluhan": "demam", "durasi": "2 hari", "gejala": "menggigil"}
        self.assertEqual(_intel.calibrate_certainty(kasus, {}, []), "insufficient_data")

    def test_two_word_specific_complaint_scores_one_point(self):
        # "nyeri dada" (1) + durasi (1) + gejala (1) = 3
        kasus = {"keluhan": "nyeri dada", "durasi": "2 hari", "gejala": "sesak"}
        self.assertEqual(_intel.calibrate_certainty(kasus, {}, []), "possible")

    def test_two_generic_words_complaint_scores_nothing(self):
        # "demam batuk" (0) + durasi (1) + gejala (1) = 2
        kasus = {"keluhan": "demam batuk", "durasi": "2 hari", "gejala": "pilek"}
        self.assertEqual(_intel.calibrate_certainty(kasus, {}, []), "insufficient_data")

    def test_specific_complaint_with_duration_is_possible(self):
        # keluhan 3 kata (2) + durasi (1) = 3
        kasus = {"keluhan": _THREE_WORD_KELUHAN, "durasi": "2 hari"}
        self.assertEqual(_intel.calibrate_certainty(kasus, {}, []), "possible")

    def test_patient_fields_are_capped_at_two_points(self):
        # keluhan 3 kata (2) + pasien min(3, 2) = 4; tanpa batas akan menjadi 5 (probable)
        kasus = {"keluhan": _THREE_WORD_KELUHAN}
        self.assertEqual(_intel.calibrate_certainty(kasus, _FULL_PASIEN, []), "possible")

    def test_vitals_documented_raise_case_to_probable(self):
        # keluhan (2) + durasi (1) + gejala (1) + vital (2) = 6
        kasus = {
            "keluhan": _THREE_WORD_KELUHAN,
            "durasi": "2 jam",
            "gejala": "keringat dingin",
            "vital": "TD 150/90",
        }
        self.assertEqual(_intel.calibrate_certainty(kasus, {}, []), "probable")

    def test_high_score_with_vitals_and_specific_complaint_is_definitive(self):
        # keluhan (2) + durasi (1) + gejala (1) + vital (2) + redflag (1) + pasien (2) = 9
        kasus = {
            "keluhan": _THREE_WORD_KELUHAN,
            "durasi": "2 jam",
            "gejala": "keringat dingin",
            "vital": "TD 150/90",
            "redflag": "menjalar ke lengan",
        }
        self.assertEqual(_intel.calibrate_certainty(kasus, _FULL_PASIEN, []), "definitive")

    def test_high_score_without_vitals_stays_probable(self):
        # keluhan (2) + durasi + gejala + redflag (3) + pasien (2) + chain (1) = 8, tanpa vital
        kasus = {
            "keluhan": _THREE_WORD_KELUHAN,
            "durasi": "2 jam",
            "gejala": "keringat dingin",
            "redflag": "menjalar ke lengan",
        }
        chains = [{"key": "x", "chain": {"logical_chain": []}}]
        self.assertEqual(_intel.calibrate_certainty(kasus, _FULL_PASIEN, chains), "probable")

    def test_high_score_with_vitals_but_two_word_complaint_stays_probable(self):
        # keluhan 2 kata (1) + durasi + gejala + redflag (3) + vital (2) + pasien (2) = 8
        kasus = {
            "keluhan": "nyeri dada",
            "durasi": "2 jam",
            "gejala": "keringat dingin",
            "vital": "TD 150/90",
            "redflag": "menjalar ke lengan",
        }
        self.assertEqual(_intel.calibrate_certainty(kasus, _FULL_PASIEN, []), "probable")

    def test_only_first_chain_match_logical_chain_hits_are_counted(self):
        kasus = {"keluhan": _THREE_WORD_KELUHAN}
        with_hits = {"key": "a", "chain": {"logical_chain": ["Nyeri dada", "Kiri"]}}
        without_hits = {"key": "b", "chain": {"logical_chain": ["Demam"]}}
        # keluhan (2) + chain (1) + 2 hit = 5
        self.assertEqual(
            _intel.calibrate_certainty(kasus, {}, [with_hits, without_hits]), "probable"
        )
        # keluhan (2) + chain (1) + 0 hit = 3
        self.assertEqual(
            _intel.calibrate_certainty(kasus, {}, [without_hits, with_hits]), "possible"
        )

    def test_logical_chain_hits_are_found_in_gejala_and_redflag_text(self):
        # keluhan generik (0) + gejala (1) + redflag (1) + chain (1) + 2 hit = 5
        kasus = {"keluhan": "nyeri", "gejala": "sesak napas", "redflag": "sinkop"}
        chains = [{"key": "a", "chain": {"logical_chain": ["Sesak napas", "Sinkop"]}}]
        self.assertEqual(_intel.calibrate_certainty(kasus, {}, chains), "probable")


# ---------------------------------------------------------------------------
# ClinicalStateTracker
# ---------------------------------------------------------------------------


class StateTrackerInputTests(unittest.TestCase):
    def test_each_input_increments_turn_count(self):
        tracker = _intel.ClinicalStateTracker()
        tracker.update_from_input("halo", {})
        tracker.update_from_input("lanjut", {})
        self.assertEqual(tracker.turn_count, 2)

    def test_structured_kasus_fields_are_adopted_and_stripped(self):
        tracker = _intel.ClinicalStateTracker()
        tracker.update_from_input(
            "",
            {"keluhan": " nyeri dada ", "durasi": "2 hari", "gejala": "sesak", "redflag": ""},
        )
        self.assertEqual(
            tracker.state, {"keluhan": "nyeri dada", "durasi": "2 hari", "gejala": "sesak"}
        )

    def test_longer_value_replaces_earlier_field_value(self):
        tracker = _intel.ClinicalStateTracker()
        tracker.update_from_input("", {"keluhan": "nyeri dada"})
        tracker.update_from_input("", {"keluhan": "nyeri dada kiri menjalar ke lengan"})
        self.assertEqual(tracker.state["keluhan"], "nyeri dada kiri menjalar ke lengan")

    def test_empty_later_value_does_not_erase_earlier_field(self):
        tracker = _intel.ClinicalStateTracker()
        tracker.update_from_input("", {"keluhan": "nyeri dada"})
        tracker.update_from_input("", {"keluhan": ""})
        self.assertEqual(tracker.state["keluhan"], "nyeri dada")

    def test_vital_components_are_extracted_and_consolidated_in_fixed_order(self):
        tracker = _intel.ClinicalStateTracker()
        tracker.update_from_input("TD: 120/80 nadi 88 suhu 37,8 rr 20 SpO2 98%", {})
        self.assertEqual(
            tracker.state["vital"], "TD: 120/80, Nadi: 88, Suhu: 37,8, RR: 20, SpO2: 98"
        )

    def test_vital_components_accumulate_and_update_across_turns(self):
        tracker = _intel.ClinicalStateTracker()
        tracker.update_from_input("td 130/85", {})
        tracker.update_from_input("nadi 92", {})
        tracker.update_from_input("tekanan darah 120/80", {})
        self.assertEqual(tracker.vital_components, {"td": "120/80", "nadi": "92"})
        self.assertEqual(tracker.state["vital"], "TD: 120/80, Nadi: 92")

    def test_text_without_vital_pattern_leaves_vital_unset(self):
        tracker = _intel.ClinicalStateTracker()
        tracker.update_from_input("pasien mengeluh gatal di lengan", {})
        self.assertNotIn("vital", tracker.state)
        self.assertEqual(tracker.vital_components, {})


class StateTrackerResponseTests(unittest.TestCase):
    def test_non_dict_response_changes_nothing(self):
        tracker = _intel.ClinicalStateTracker()
        tracker.update_from_response("teks bebas")
        self.assertEqual(tracker.confirmed_diagnoses, [])
        self.assertEqual(tracker.pending_clarifications, [])

    def test_probable_diagnosis_is_confirmed_once_with_icd_suffix(self):
        tracker = _intel.ClinicalStateTracker()
        response = {"diagnosis_kerja": {"nama": "Pneumonia", "icd": "J18.9", "certainty": "probable"}}
        tracker.update_from_response(response)
        tracker.update_from_response(response)
        self.assertEqual(tracker.confirmed_diagnoses, ["Pneumonia (J18.9)"])

    def test_definitive_diagnosis_without_icd_uses_name_only(self):
        tracker = _intel.ClinicalStateTracker()
        tracker.update_from_response(
            {"diagnosis_kerja": {"nama": "Gastritis", "certainty": "definitive"}}
        )
        self.assertEqual(tracker.confirmed_diagnoses, ["Gastritis"])

    def test_possible_or_missing_certainty_is_not_confirmed(self):
        tracker = _intel.ClinicalStateTracker()
        tracker.update_from_response(
            {"diagnosis_kerja": {"nama": "Dispepsia", "icd": "K30", "certainty": "possible"}}
        )
        tracker.update_from_response({"diagnosis_kerja": {"nama": "Migren", "icd": "G43"}})
        self.assertEqual(tracker.confirmed_diagnoses, [])

    def test_non_dict_diagnosis_kerja_is_ignored(self):
        tracker = _intel.ClinicalStateTracker()
        tracker.update_from_response({"diagnosis_kerja": "Pneumonia"})
        self.assertEqual(tracker.confirmed_diagnoses, [])

    def test_data_gaps_are_accumulated_without_duplicates_and_none_is_tolerated(self):
        tracker = _intel.ClinicalStateTracker()
        tracker.update_from_response({"data_gaps": ["suhu", "riwayat alergi"]})
        tracker.update_from_response({"data_gaps": ["riwayat alergi", "nadi"]})
        tracker.update_from_response({"data_gaps": None})
        self.assertEqual(tracker.pending_clarifications, ["suhu", "riwayat alergi", "nadi"])


class StateTrackerPromptBlockTests(unittest.TestCase):
    _FOOTER = (
        "Gunakan riwayat di atas sebagai KONTEKS KUMULATIF — "
        "jangan ulangi pertanyaan yang sudah dijawab."
    )

    def test_empty_tracker_renders_empty_block(self):
        self.assertEqual(_intel.ClinicalStateTracker().to_prompt_block(), "")

    def test_block_renders_only_populated_state_fields(self):
        tracker = _intel.ClinicalStateTracker()
        tracker.update_from_input("", {"keluhan": "nyeri dada"})
        self.assertEqual(
            tracker.to_prompt_block(),
            "RIWAYAT KLINIS SESI INI (multi-turn accumulated):\n"
            "  Keluhan utama: nyeri dada\n" + self._FOOTER,
        )

    def test_block_renders_all_state_fields_in_fixed_order(self):
        tracker = _intel.ClinicalStateTracker()
        tracker.update_from_input(
            "",
            {
                "keluhan": "nyeri dada",
                "durasi": "2 jam",
                "gejala": "keringat dingin",
                "redflag": "menjalar ke lengan",
                "vital": "TD 150/90",
            },
        )
        lines = tracker.to_prompt_block().split("\n")
        self.assertEqual(
            lines[1:6],
            [
                "  Keluhan utama: nyeri dada",
                "  Durasi: 2 jam",
                "  Gejala penyerta: keringat dingin",
                "  Tanda vital: TD 150/90",
                "  Tanda bahaya: menjalar ke lengan",
            ],
        )

    def test_block_shows_last_two_diagnoses_and_first_three_gaps(self):
        tracker = _intel.ClinicalStateTracker()
        tracker.update_from_input("", {"keluhan": "batuk lama"})
        tracker.update_from_input("", {})
        for nama in ("Diagnosis A", "Diagnosis B", "Diagnosis C"):
            tracker.update_from_response(
                {"diagnosis_kerja": {"nama": nama, "certainty": "probable"}}
            )
        tracker.update_from_response({"data_gaps": ["gap 1", "gap 2", "gap 3", "gap 4"]})
        lines = tracker.to_prompt_block().split("\n")
        diagnosis_line = next(line for line in lines if "Diagnosis sebelumnya" in line)
        self.assertTrue(diagnosis_line.endswith("): Diagnosis B; Diagnosis C"))
        self.assertIn("  Klarifikasi yang masih dibutuhkan: gap 1; gap 2; gap 3", lines)
        self.assertEqual(lines[-1], self._FOOTER)


class StateTrackerResetTests(unittest.TestCase):
    def test_reset_clears_every_accumulated_attribute(self):
        tracker = _intel.ClinicalStateTracker()
        tracker.update_from_input("td 120/80", {"keluhan": "nyeri dada"})
        tracker.update_from_response(
            {
                "diagnosis_kerja": {"nama": "Angina", "certainty": "probable"},
                "data_gaps": ["EKG"],
            }
        )
        tracker.reset()
        self.assertEqual(tracker.state, {})
        self.assertEqual(tracker.vital_components, {})
        self.assertEqual(tracker.turn_count, 0)
        self.assertEqual(tracker.confirmed_diagnoses, [])
        self.assertEqual(tracker.pending_clarifications, [])
        self.assertEqual(tracker.to_prompt_block(), "")


if __name__ == "__main__":
    unittest.main()
