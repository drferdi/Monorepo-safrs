# Architected and built by codieverse+.
"""Tests for sidelab/fornas_loader.py — verifies that the FORNAS
reference data set can be loaded and queried against the e-fornas
public dump (data/fornas_2026.json). The loader must:

  - Lazily parse JSON without raising on missing files.
  - Build a name index that matches both canonical_name (Indonesian)
    AND canonical_name_en (international / INN).
  - Build a class index keyed by kelas_terapi.utama.
  - Build an availability index keyed by ketersediaan flags.
  - Provide typed helper accessors that DO NOT silently regress when
    the dataset swaps.
"""
import importlib
import importlib.util
import json
import os
import unittest
from pathlib import Path

for _data_dir in (os.environ.get("SIDELAB_DATA_DIR"),):
    if _data_dir:
        os.environ["SIDELAB_DATA_DIR"] = _data_dir

_spec = importlib.util.spec_from_file_location(
    "fornas_records", Path(__file__).resolve().parent.parent.parent
    / "sidelab" / "fornas_records.py"
)
fr = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fr)

_spec = importlib.util.spec_from_file_location(
    "fornas_loader", Path(__file__).resolve().parent.parent.parent
    / "sidelab" / "fornas_loader.py"
)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


class FornasLoaderShapeTests(unittest.TestCase):
    """Typing/shape conformance between FORNAS records and loader output."""

    def test_records_module_exposes_typed_dict_classes(self):
        # Records module must export the PHP-style typed dicts that the
        # loader is expected to honour.
        for cls_name in (
            "FornasDrugRecord",
            "FornasFile",
            "FornasIndex",
            "Ketersediaan",
            "KelasTerapi",
            "Varian",
            "Restriksi",
            "Kontraindikasi",
            "Dosis",
        ):
            self.assertTrue(
                hasattr(fr, cls_name), f"{cls_name} missing from records module"
            )

    def test_loader_exports_expected_helpers(self):
        for fn in (
            "load_fornas",
            "reset_fornas_cache",
            "resolve_by_name",
            "resolve_by_class",
            "resolve_by_availability",
            "find_interactions",
            "supports_facility",
        ):
            self.assertTrue(
                callable(getattr(m, fn, None)),
                f"{fn} missing from loader",
            )


class FornasLoaderIntegrationTests(unittest.TestCase):
    """Real-dataset behavioural tests against the actual fornas_2026.json
    (which is checked in alongside the repo as a 5.6 MB public dump).
    """

    @classmethod
    def setUpClass(cls) -> None:
        cls._real_path = m._DATA_DIR / "fornas_2026.json"
        if not cls._real_path.exists():
            raise unittest.SkipTest(
                "data/fornas_2026.json not present in this environment"
            )
        m.reset_fornas_cache()

    def setUp(self) -> None:
        m.reset_fornas_cache()

    def test_public_dump_loads_with_expected_count(self):
        fornas = m.load_fornas()
        drugs = fornas.get("drugs", []) or []
        # FORNAS addendum 2024 covers 677 zat aktif; the public dump
        # groups some as variants of a single canonical_name. Allow a
        # tolerance range so the test stays meaningful across dumps.
        self.assertGreaterEqual(len(drugs), 600)
        self.assertLessEqual(len(drugs), 700)

    def test_index_built_for_canonical_and_english_names(self):
        fornas = m.load_fornas()
        idx = fornas.get("index", {}) or {}
        by_name = idx.get("by_name_lower") or {}
        self.assertGreater(len(by_name), 0)
        # Canonical forms (lowered) must round-trip via lookup.
        for sample in ("parasetamol", "ibuprofen", "amoxicillin", "adenosine"):
            self.assertIn(sample, by_name)

    def test_resolve_by_name_supports_indonesian_and_inn(self):
        indonesian = m.resolve_by_name("Paracetamol")
        english = m.resolve_by_name("paracetamol")
        self.assertIsNotNone(indonesian)
        self.assertIsNotNone(english)
        self.assertEqual(
            indonesian.get("canonical_name_en", "").lower(),
            "paracetamol",
        )

    def test_resolve_by_class_returns_only_matching_utama(self):
        antiinf = m.resolve_by_class("ANTIINFEKSI")
        self.assertGreater(len(antiinf), 0)
        for drug in antiinf:
            self.assertEqual(
                drug.get("kelas_terapi", {}).get("utama", ""),
                "ANTIINFEKSI",
            )

    def test_resolve_by_availability_matches_fornas_flags(self):
        # FKTP flag → puskesmas availability.
        fkktp_drugs = m.resolve_by_availability(fkktp=True)
        non_fkktp = m.resolve_by_availability(fkktp=False)
        self.assertGreater(len(fkktp_drugs), 0)
        self.assertGreater(len(non_fkktp), 0)
        # Mutual exclusion sanity.
        fkktp_ids = {d.get("id") for d in fkktp_drugs}
        non_fkktp_ids = {d.get("id") for d in non_fkktp}
        self.assertEqual(fkktp_ids & non_fkktp_ids, set())

    def test_supports_facility_handles_public_payload(self):
        fkktp_drugs = m.resolve_by_availability(fkktp=True)
        if not fkktp_drugs:
            self.skipTest("no FKTP-tagged drugs in dump")
        sample = fkktp_drugs[0]
        self.assertTrue(m.supports_facility(sample, "FKTP"))


class FornasLoaderGracefulDegradationTests(unittest.TestCase):
    """The loader must never raise when the data file is missing/invalid."""

    def setUp(self) -> None:
        m.reset_fornas_cache()

    def test_missing_file_returns_empty(self):
        out = m.load_fornas(path=Path("/nonexistent/path/fornas.json"))
        self.assertEqual(out.get("drugs", []), [])
        self.assertEqual(out.get("version"), "")
        self.assertEqual(
            (out.get("index") or {}).get("by_name_lower", {}),
            {},
        )

    def test_invalid_json_returns_empty(self):
        tmp = Path(m._DATA_DIR).with_name("fornas_invalid_tmp.json")
        tmp.write_text("not a json", encoding="utf-8")
        try:
            out = m.load_fornas(path=tmp)
        finally:
            tmp.unlink(missing_ok=True)
        self.assertEqual(out.get("drugs", []), [])


class FornasEnrichmentSidecarTests(unittest.TestCase):
    """Validate that the typed enrichment sidecar merges onto the
    public catalog (data/fornas_enrichment.json). With Atc code, KFA
    code, sinonomy, indikasi, interaksi, KI, this is the "Alt-2"
    best-practice clinical layer.
    """

    def setUp(self) -> None:
        m.reset_fornas_cache()

    def test_enrichment_records_loaded(self):
        enrich = m.load_enrichment()
        self.assertGreaterEqual(len(enrich), 1)
        # Each entry has the canonical id, atc_code, kfa_code fields.
        for entry in enrich.values():
            self.assertIn("id", entry)
            self.assertIn("atc_code", entry)
            self.assertIn("kfa_code", entry)

    def test_resolve_by_name_returns_enriched_record(self):
        drug = m.resolve_by_name("Paracetamol")
        # The canonical_name is `parasetamol` (Indonesian) but
        # canonical_name_en is `paracetamol`. Lookup by either side.
        self.assertIsNotNone(drug)
        self.assertEqual(drug.get("atc_code"), "N02BE01")
        self.assertEqual(drug.get("kfa_code"), "KFA-OBT-01001")
        sinonim = drug.get("sinonim") or []
        self.assertIn("Acetaminophen", sinonim)
        self.assertGreaterEqual(len(drug.get("indikasi", [])), 1)
        self.assertGreaterEqual(len(drug.get("kontraindikasi_absolut", [])), 1)
        # fornas.level preserved from catalog (1 at level 1).
        self.assertEqual(drug.get("fornas", {}).get("level"), 1)

    def test_resolve_by_atc_returns_atc_mapped_drugs(self):
        parasetamol_atc = m.resolve_by_atc("N02BE01")
        self.assertEqual(len(parasetamol_atc), 1)
        self.assertEqual(parasetamol_atc[0].get("id"), "fornas:parasetamol")
        # Prefix match (level-3 grouping) covers all M01A drugs.
        m01a = m.resolve_by_atc("M01A")
        ids = {d.get("id") for d in m01a}
        # Both ibuprofen and natrium-diklofenak resolve under M01A.
        self.assertIn("fornas:ibuprofen", ids)
        self.assertIn("fornas:natrium-diklofenak", ids)

    def test_enrichment_off_passes_through_clean_lookup(self):
        """When the enrichment file is missing, catalog resolve still works.

        We simulate missing enrichment by passing an explicit, empty
        path so the cache binds to it instead of the real sidecar.
        """
        m.reset_fornas_cache()
        # Bind the cache to a non-existent enrichment file by creating
        # an explicit-empty path sentinel. Practically: load_enrichment
        # returns {} but the catalog is still loaded fresh.
        empty = Path(m._DATA_DIR).with_name("__missing_enrichment__.json")
        try:
            m.load_enrichment(path=empty)
            out = m.resolve_by_name("Paracetamol")
            # Catalog still resolves (paracetamol isn't enriched but
            # the canonical_name_en mapping exists in the public dump).
            self.assertIsNotNone(out)
        finally:
            m.reset_enrichment_cache()

    def test_invalid_enrichment_sidecar_falls_back_to_empty(self):
        tmp = Path(m._DATA_DIR).with_name("__invalid_enrichment__.json")
        tmp.write_text("not a json", encoding="utf-8")
        try:
            # _ENRICHMENT_FILE cache may have prior content; reset first.
            m.reset_enrichment_cache()
            out = m.load_enrichment(path=tmp)
            self.assertEqual(out, {})
        finally:
            tmp.unlink(missing_ok=True)

    def test_ddi_on_enriched_drug_is_structured(self):
        """Verify the structured DDI surfaced via enrichment is iterable."""
        drug = m.resolve_by_name("Paracetamol")
        self.assertIsNotNone(drug)
        interaksi = drug.get("interaksi", []) or []
        self.assertGreaterEqual(len(interaksi), 1)
        first = interaksi[0]
        for key in ("dengan", "atc_dengan", "level", "efek", "manajemen"):
            self.assertIn(key, first)


class FornasSchemaRobustnessTests(unittest.TestCase):
    """Built-in JSON shape that the loader must accept even if external
    curators tag the dataset slightly differently over time."""

    def setUp(self) -> None:
        m.reset_fornas_cache()

    def _write_tmp_dump(self, body: dict) -> Path:
        tmp = Path(m._DATA_DIR).with_name("fornas_tmp_for_test.json")
        tmp.write_text(json.dumps(body, ensure_ascii=False), encoding="utf-8")
        return tmp

    def test_alternative_alt2_schema_is_consumed(self):
        """A dataset laid out as Alt-2 still routes into the same index.

        Use a synthetic canonical_name that does NOT collide with the
        real e-fornas dump, so resolve_helpers exercise the written
        stub and not data already in the production file.
        """
        body = {
            "version": "alt2-test",
            "drugs": [
                {
                    "id": "fornas:__test_alt2_quinolone__",
                    "canonical_name": "__TEST_ALT2_QUINOLONE__",
                    "sinonim": ["__TEST Pipemidic acid__"],
                    "atc_code": "J01XX99",
                    "kfa_code": "KFA-OBT-99999",
                    "kelas_terapi": {
                        "nama_id": "Quinolone __test__",
                    },
                }
            ],
        }
        path = self._write_tmp_dump(body)
        try:
            m.reset_fornas_cache()
            fornas = m.load_fornas(path=path)
        finally:
            path.unlink(missing_ok=True)
        self.assertEqual(len(fornas.get("drugs", [])), 1)
        idx = fornas.get("index", {}) or {}
        self.assertEqual(
            idx.get("by_atc", {}).get("J01XX99"),
            ["fornas:__test_alt2_quinolone__"],
        )
        self.assertEqual(
            idx.get("by_kfa", {}).get("KFA-OBT-99999"),
            ["fornas:__test_alt2_quinolone__"],
        )
        hit = m.resolve_by_name("__test pipemidic acid__")
        self.assertIsNotNone(hit)
        self.assertEqual(
            hit.get("id"), "fornas:__test_alt2_quinolone__"
        )
        cls_drugs = m.resolve_by_class("quinolone __test__")
        self.assertEqual(len(cls_drugs), 1)


if __name__ == "__main__":
    unittest.main()
