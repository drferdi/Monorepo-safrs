# Architected and built by codieverse+.
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from sidelab import fornas_loader as fl
from sidelab import pharma

# Katalog FORNAS sintetis: id berawalan "UJI-" agar tidak pernah bertabrakan dengan data asli.
_DRUGS = [
    {
        "id": "UJI-001",
        "canonical_name": "Parasetamol Uji",
        "canonical_name_en": "Paracetamol Test",
        "sinonim": ["PCT Uji", ""],
        "atc_code": "n02be01",
        "kfa_code": "kfa-001",
        "kelas_terapi": {"utama": "Analgesik Uji", "nama_id": "Analgesik Non Narkotik Uji"},
        "ketersediaan": {"fpktp": True, "fpktl": True, "prb": False, "oen": None},
        "fasilitas_penyedia": ["Puskesmas"],
    },
    {
        "id": "UJI-002",
        "canonical_name": "Ibuprofen Uji",
        "atc_code": "M01AE01",
        "kelas_terapi": {"utama": "Antiinflamasi Uji"},
        "ketersediaan": {"fpktp": False, "fpktl": True},
    },
    {"id": "", "canonical_name": "Tanpa Id Uji"},
    {
        "id": "UJI-003",
        "canonical_name": "Naproksen Uji",
        "atc_code": "M01AE02",
        "kelas_terapi": {"utama": "Antiinflamasi Uji Lain"},
    },
]


def _ids(records):
    return [r["id"] for r in records]


class PharmaFormatTests(unittest.TestCase):
    def test_single_dose_with_route_is_rendered_as_1x_dosis_tunggal(self):
        self.assertEqual(
            pharma._format_obat_indonesia("Albendazol 400 mg per oral dosis tunggal"),
            "Albendazol 1x400 mg PO Dosis Tunggal",
        )

    def test_single_dose_without_route_keeps_timing_tail(self):
        self.assertEqual(
            pharma._format_obat_indonesia("Albendazol 400 mg single dose sesudah makan"),
            "Albendazol 1x400 mg Dosis Tunggal PC",
        )


class PharmaLineClassificationTests(unittest.TestCase):
    def test_blank_and_separator_lines_are_not_meta_continuations(self):
        for line in ("", "   ", "===", "= = ="):
            with self.subTest(line=line):
                self.assertFalse(pharma._is_pharma_meta_continuation(line))

    def test_meta_stock_and_program_lines_are_not_continuations(self):
        for line in ("DDI: hindari warfarin", "Stok: 20 tablet", "OAT kategori 1 (program)"):
            with self.subTest(line=line):
                self.assertFalse(pharma._is_pharma_meta_continuation(line))

    def test_new_drug_line_and_section_header_end_a_continuation(self):
        self.assertFalse(pharma._is_pharma_meta_continuation("Parasetamol 500 mg PO 3x1 3 hari"))
        self.assertFalse(pharma._is_pharma_meta_continuation("EDUKASI PASIEN:"))

    def test_free_text_after_meta_is_a_continuation(self):
        self.assertTrue(pharma._is_pharma_meta_continuation("pantau tanda perdarahan"))

    def test_blank_header_and_separator_lines_are_not_prescriptions(self):
        for line in ("", "Terapi:", "==="):
            with self.subTest(line=line):
                self.assertFalse(pharma._looks_like_prescription_line(line))

    def test_stock_and_no_drug_lines_are_not_prescriptions_even_with_schedule(self):
        self.assertFalse(pharma._looks_like_prescription_line("Stok parasetamol 3x1 5 hari"))
        self.assertFalse(pharma._looks_like_prescription_line("Tidak ada obat 3x1 5 hari"))

    def test_single_line_diagnosis_kerja_is_extracted(self):
        response = "DIAGNOSIS KERJA: [J02.9] Faringitis akut\nTERAPI: simtomatik"
        self.assertEqual(pharma._extract_diagnosis_kerja_text(response), "[J02.9] Faringitis akut")

    def test_missing_diagnosis_kerja_returns_empty_string(self):
        self.assertEqual(pharma._extract_diagnosis_kerja_text("ANAMNESIS: batuk"), "")


class FornasPureHelperTests(unittest.TestCase):
    def test_none_and_empty_availability_values_are_false(self):
        self.assertFalse(fl._first_token_availability(None))
        self.assertFalse(fl._first_token_availability(""))
        self.assertTrue(fl._first_token_availability(True))

    def test_index_skips_drug_without_id(self):
        index = fl._build_index(_DRUGS)
        self.assertNotIn("tanpa id uji", index["by_name_lower"])
        self.assertEqual(index["by_name_lower"]["pct uji"], "UJI-001")
        self.assertNotIn("", index["by_name_lower"])

    def test_merge_enrichment_ignores_blank_values_and_replaces_lists(self):
        drug = {"id": "UJI-001", "canonical_name": "Asli", "sinonim": ["lama"], "atc_code": "X"}
        enrichment = {
            "UJI-001": {
                "id": "UJI-001",
                "canonical_name": "   ",
                "atc_code": None,
                "interaksi": [],
                "kelas_terapi": {},
                "sinonim": ["baru"],
            }
        }
        merged = fl._merge_enrichment(drug, enrichment)
        self.assertEqual(merged["canonical_name"], "Asli")
        self.assertEqual(merged["atc_code"], "X")
        self.assertEqual(merged["sinonim"], ["baru"])
        self.assertNotIn("interaksi", merged)
        self.assertNotIn("kelas_terapi", merged)
        self.assertEqual(drug["sinonim"], ["lama"])

    def test_merge_enrichment_returns_drug_unchanged_without_id_or_entry(self):
        no_id = {"canonical_name": "Tanpa Id"}
        unknown = {"id": "UJI-999"}
        enrichment = {"UJI-001": {"sinonim": ["x"]}}
        self.assertIs(fl._merge_enrichment(no_id, enrichment), no_id)
        self.assertIs(fl._merge_enrichment(unknown, enrichment), unknown)


class FindInteractionsTests(unittest.TestCase):
    DRUG = {
        "interaksi": [
            {"obat": "A", "level": "kontraindikasi"},
            {"obat": "B", "level": "Mayor"},
            {"obat": "C", "level": "moderate"},
            {"obat": "D", "level": "minor"},
            {"obat": "E", "level": "tidak_signifikan"},
            "bukan dict",
        ]
    }

    def _obat(self, severity):
        return [i["obat"] for i in fl.find_interactions(self.DRUG, severity)]

    def test_default_threshold_is_minor_and_above(self):
        self.assertEqual([i["obat"] for i in fl.find_interactions(self.DRUG)], ["A", "B", "C", "D"])

    def test_mayor_threshold_keeps_mayor_and_contraindications_case_insensitively(self):
        self.assertEqual(self._obat("mayor"), ["A", "B"])

    def test_drug_without_interactions_returns_empty_list(self):
        self.assertEqual(fl.find_interactions({"interaksi": None}), [])


class SupportsFacilityTests(unittest.TestCase):
    def test_alt2_fornas_fasilitas_list_is_honoured(self):
        self.assertTrue(fl.supports_facility({"fornas": {"fasilitas": ["FKTP"]}}, "FKTP"))

    def test_fasilitas_penyedia_matches_case_insensitively(self):
        self.assertTrue(fl.supports_facility({"fasilitas_penyedia": [" Puskesmas "]}, "PUSKESMAS"))

    def test_facility_code_maps_to_ketersediaan_flag(self):
        drug = {"ketersediaan": {"fpktp": True, "fpktl": False}}
        self.assertTrue(fl.supports_facility(drug, "FKTP"))
        self.assertFalse(fl.supports_facility(drug, "FPKTL"))

    def test_unmapped_facility_is_not_supported(self):
        drug = {"ketersediaan": {"fpktp": True}}
        self.assertFalse(fl.supports_facility(drug, "KLINIK-X"))


class FornasFileTestCase(unittest.TestCase):
    """Basis yang mengisolasi cache global loader dan sidecar enrichment."""

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.dir = Path(self._tmp.name)
        enrichment_patch = patch.object(fl, "_ENRICHMENT_PATH", self.dir / "tidak_ada.json")
        enrichment_patch.start()
        self.addCleanup(enrichment_patch.stop)
        fl.reset_fornas_cache()
        self.addCleanup(fl.reset_fornas_cache)

    def write(self, name, payload):
        path = self.dir / name
        text = payload if isinstance(payload, str) else json.dumps(payload)
        path.write_text(text, encoding="utf-8")
        return path

    def load_catalog(self, drugs=None):
        path = self.write("fornas_uji.json", {"version": "uji-1", "drugs": drugs or _DRUGS})
        return fl.load_fornas(path)


class FornasLoadCacheTests(FornasFileTestCase):
    def test_same_explicit_path_is_served_from_cache(self):
        first = self.load_catalog()
        second = fl.load_fornas(self.dir / "fornas_uji.json")
        self.assertIs(first, second)
        self.assertIs(fl._resolve_cached_path(None), first)

    def test_non_object_json_root_yields_empty_catalog(self):
        loaded = fl.load_fornas(self.write("list.json", [{"id": "UJI-001"}]))
        self.assertEqual(loaded["drugs"], [])
        self.assertEqual(loaded["index"]["by_name_lower"], {})

    def test_non_list_drugs_field_yields_no_drugs_but_keeps_version(self):
        loaded = fl.load_fornas(self.write("bad.json", {"version": "v9", "drugs": {"id": "x"}}))
        self.assertEqual(loaded["drugs"], [])
        self.assertEqual(loaded["version"], "v9")

    def test_no_default_files_yields_empty_catalog(self):
        missing = (self.dir / "a.json", self.dir / "b.json")
        with patch.object(fl, "_DEFAULT_FORNAS_PATHS", missing):
            loaded = fl.load_fornas()
        self.assertEqual(loaded["drugs"], [])
        self.assertIsNone(fl._LAST_PATH)

    def test_enrichment_sidecar_synonym_becomes_resolvable(self):
        sidecar = self.write(
            "enrich.json", {"enrichment": [{"id": "UJI-002", "sinonim": ["Brufen Uji"]}]}
        )
        with patch.object(fl, "_ENRICHMENT_PATH", sidecar):
            self.load_catalog()
            record = fl.resolve_by_name("brufen uji")
        self.assertEqual(record["id"], "UJI-002")


class FornasLookupTests(FornasFileTestCase):
    def setUp(self):
        super().setUp()
        self.load_catalog()

    def test_resolve_by_name_is_case_and_whitespace_insensitive_on_synonyms(self):
        self.assertEqual(fl.resolve_by_name("  pct UJI ")["id"], "UJI-001")
        self.assertEqual(fl.resolve_by_name("paracetamol test")["id"], "UJI-001")

    def test_resolve_by_name_rejects_empty_and_unknown_names(self):
        self.assertIsNone(fl.resolve_by_name(""))
        self.assertIsNone(fl.resolve_by_name("obat tidak ada"))

    def test_resolve_by_atc_exact_code_is_case_insensitive(self):
        self.assertEqual(_ids(fl.resolve_by_atc("N02BE01")), ["UJI-001"])

    def test_resolve_by_atc_falls_back_to_prefix_group(self):
        self.assertEqual(_ids(fl.resolve_by_atc("m01a")), ["UJI-002", "UJI-003"])

    def test_resolve_by_atc_empty_or_unknown_code_returns_empty(self):
        self.assertEqual(fl.resolve_by_atc(""), [])
        self.assertEqual(fl.resolve_by_atc("Z99"), [])

    def test_resolve_by_class_exact_matches_utama_and_nama_id(self):
        self.assertEqual(_ids(fl.resolve_by_class("Antiinflamasi Uji")), ["UJI-002"])
        self.assertEqual(_ids(fl.resolve_by_class("analgesik non narkotik uji")), ["UJI-001"])

    def test_resolve_by_class_substring_mode_matches_all_containing_classes(self):
        self.assertEqual(
            _ids(fl.resolve_by_class("antiinflamasi", exact=False)), ["UJI-002", "UJI-003"]
        )

    def test_resolve_by_class_empty_or_unknown_returns_empty(self):
        self.assertEqual(fl.resolve_by_class(""), [])
        self.assertEqual(fl.resolve_by_class("kelas tidak ada"), [])

    def test_availability_filter_requires_true_flags(self):
        self.assertEqual(_ids(fl.resolve_by_availability(fkktp=True)), ["UJI-001"])

    def test_availability_filter_false_excludes_drugs_with_flag_set(self):
        self.assertEqual(
            _ids(fl.resolve_by_availability(fkktp=False, fpkktl=True)), ["UJI-002"]
        )

    def test_availability_none_flag_counts_as_unavailable(self):
        self.assertEqual(fl.resolve_by_availability(oen=True), [])


class EnrichmentLoaderTests(FornasFileTestCase):
    def test_non_object_root_returns_empty(self):
        self.assertEqual(fl.load_enrichment(self.write("e1.json", [1, 2])), {})

    def test_non_list_enrichment_field_returns_empty(self):
        self.assertEqual(fl.load_enrichment(self.write("e2.json", {"enrichment": {"id": "x"}})), {})

    def test_non_dict_and_id_less_entries_are_skipped(self):
        path = self.write(
            "e3.json",
            {"enrichment": ["teks", {"id": "  "}, {"id": "UJI-001", "atc_code": "N02BE01"}]},
        )
        self.assertEqual(
            fl.load_enrichment(path), {"UJI-001": {"id": "UJI-001", "atc_code": "N02BE01"}}
        )

    def test_same_explicit_path_is_served_from_cache(self):
        path = self.write("e4.json", {"enrichment": [{"id": "UJI-001"}]})
        first = fl.load_enrichment(path)
        path.write_text(json.dumps({"enrichment": []}), encoding="utf-8")
        self.assertIs(fl.load_enrichment(path), first)


if __name__ == "__main__":
    unittest.main()
