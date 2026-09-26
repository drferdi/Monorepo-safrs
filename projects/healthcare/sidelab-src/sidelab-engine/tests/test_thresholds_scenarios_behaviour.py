# Architected and built by codieverse+.
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import sidelab.scenarios as scenarios
import sidelab.thresholds as thresholds

_EMPTY_THRESHOLDS = {"panel_rates": {}, "verification_rates": {}, "ttft_latency": {}}

# Nilai sintetis; sengaja berbeda dari data/test_thresholds.json agar sumbernya jelas.
_THRESHOLDS = {
    "_meta": {"schema_version": "test"},
    "panel_rates": {"max_disruption_panel_per_20_skenario": 11, "catatan": "awal"},
    "verification_rates": {"min_fornas_verified_rate": 0.25},
    "ttft_latency": {"max_p95_seconds": 9.5},
}


class _IsolatedCacheMixin:
    """Simpan dan pulihkan cache modul serta env var dengan awalan tertentu."""

    module = None
    env_prefix = ""

    def setUp(self):
        saved = (self.module._CACHE, self.module._LAST_PATH)
        self.addCleanup(self._restore_cache, saved)
        self.module.reset_cache()

        env = mock.patch.dict(os.environ)
        env.start()
        self.addCleanup(env.stop)
        for key in [k for k in os.environ if k.startswith(self.env_prefix)]:
            del os.environ[key]

        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name)

    def _restore_cache(self, saved):
        self.module._CACHE, self.module._LAST_PATH = saved

    def _write(self, name, payload):
        path = self.root / name
        text = payload if isinstance(payload, str) else json.dumps(payload)
        path.write_text(text, encoding="utf-8")
        return path


class ThresholdLoaderTests(_IsolatedCacheMixin, unittest.TestCase):
    module = thresholds
    env_prefix = "SIDELAB_THRESHOLD_"

    def test_missing_file_yields_empty_sections(self):
        self.assertEqual(thresholds.load_thresholds(self.root / "absent.json"), _EMPTY_THRESHOLDS)

    def test_malformed_json_yields_empty_sections(self):
        path = self._write("bad.json", "{not json")

        self.assertEqual(thresholds.load_thresholds(path), _EMPTY_THRESHOLDS)

    def test_non_object_json_yields_empty_sections(self):
        path = self._write("list.json", [1, 2, 3])

        self.assertEqual(thresholds.load_thresholds(path), _EMPTY_THRESHOLDS)

    def test_loads_only_the_three_known_sections(self):
        path = self._write("t.json", _THRESHOLDS)

        loaded = thresholds.load_thresholds(path)

        self.assertEqual(
            loaded,
            {
                "panel_rates": {"max_disruption_panel_per_20_skenario": 11, "catatan": "awal"},
                "verification_rates": {"min_fornas_verified_rate": 0.25},
                "ttft_latency": {"max_p95_seconds": 9.5},
            },
        )

    def test_null_section_is_loaded_as_empty_dict(self):
        path = self._write("t.json", {"panel_rates": None, "ttft_latency": {"max_avg_seconds": 4.0}})

        loaded = thresholds.load_thresholds(path)

        self.assertEqual(loaded["panel_rates"], {})
        self.assertEqual(loaded["verification_rates"], {})
        self.assertEqual(loaded["ttft_latency"], {"max_avg_seconds": 4.0})

    def test_environment_overrides_int_float_and_string_leaves_by_type(self):
        os.environ["SIDELAB_THRESHOLD_PANEL_RATES_MAX_DISRUPTION_PANEL_PER_20_SKENARIO"] = "5"
        os.environ["SIDELAB_THRESHOLD_VERIFICATION_RATES_MIN_FORNAS_VERIFIED_RATE"] = "0.4"
        os.environ["SIDELAB_THRESHOLD_TTFT_LATENCY_MAX_P95_SECONDS"] = "12"
        os.environ["SIDELAB_THRESHOLD_PANEL_RATES_CATATAN"] = "diubah"
        path = self._write("t.json", _THRESHOLDS)

        loaded = thresholds.load_thresholds(path)

        self.assertEqual(loaded["panel_rates"]["max_disruption_panel_per_20_skenario"], 5)
        self.assertEqual(loaded["verification_rates"]["min_fornas_verified_rate"], 0.4)
        self.assertEqual(loaded["ttft_latency"]["max_p95_seconds"], 12.0)
        self.assertIsInstance(loaded["ttft_latency"]["max_p95_seconds"], float)
        self.assertEqual(loaded["panel_rates"]["catatan"], "diubah")

    def test_unparseable_or_empty_override_keeps_file_value(self):
        os.environ["SIDELAB_THRESHOLD_PANEL_RATES_MAX_DISRUPTION_PANEL_PER_20_SKENARIO"] = "lima"
        os.environ["SIDELAB_THRESHOLD_VERIFICATION_RATES_MIN_FORNAS_VERIFIED_RATE"] = "abc"
        os.environ["SIDELAB_THRESHOLD_TTFT_LATENCY_MAX_P95_SECONDS"] = ""
        path = self._write("t.json", _THRESHOLDS)

        loaded = thresholds.load_thresholds(path)

        self.assertEqual(loaded["panel_rates"]["max_disruption_panel_per_20_skenario"], 11)
        self.assertEqual(loaded["verification_rates"]["min_fornas_verified_rate"], 0.25)
        self.assertEqual(loaded["ttft_latency"]["max_p95_seconds"], 9.5)

    def test_nested_section_without_override_survives_unchanged(self):
        payload = {"panel_rates": {"per_kategori": {"gastro": 2}}}
        path = self._write("t.json", payload)

        loaded = thresholds.load_thresholds(path)

        self.assertEqual(loaded["panel_rates"], {"per_kategori": {"gastro": 2}})

    def test_default_path_is_read_once_and_reread_after_reset(self):
        path = self._write("t.json", _THRESHOLDS)
        with mock.patch.object(thresholds, "_DEFAULT_PATH", path):
            first = thresholds.panel_rates()
            self._write("t.json", {"panel_rates": {"max_disruption_panel_per_20_skenario": 1}})
            cached = thresholds.panel_rates()
            thresholds.reset_cache()
            reread = thresholds.panel_rates()

        self.assertEqual(first["max_disruption_panel_per_20_skenario"], 11)
        self.assertEqual(cached["max_disruption_panel_per_20_skenario"], 11)
        self.assertEqual(reread, {"max_disruption_panel_per_20_skenario": 1})

    def test_explicit_path_bypasses_cached_default(self):
        default_path = self._write("default.json", _THRESHOLDS)
        other = self._write("other.json", {"ttft_latency": {"max_p95_seconds": 3.0}})
        with mock.patch.object(thresholds, "_DEFAULT_PATH", default_path):
            thresholds.load_thresholds()

            loaded = thresholds.load_thresholds(other)

        self.assertEqual(loaded["ttft_latency"], {"max_p95_seconds": 3.0})

    def test_section_accessors_return_matching_sections_of_default_file(self):
        path = self._write("t.json", _THRESHOLDS)
        with mock.patch.object(thresholds, "_DEFAULT_PATH", path):
            self.assertEqual(thresholds.verification_rates(), {"min_fornas_verified_rate": 0.25})
            self.assertEqual(thresholds.ttft_latency(), {"max_p95_seconds": 9.5})

    def test_missing_default_file_gives_empty_accessors(self):
        with mock.patch.object(thresholds, "_DEFAULT_PATH", self.root / "absent.json"):
            self.assertEqual(thresholds.panel_rates(), {})
            self.assertEqual(thresholds.verification_rates(), {})
            self.assertEqual(thresholds.ttft_latency(), {})


# Skenario sintetis; pasien fiktif tanpa identitas.
_SCENARIOS = {
    "items": [
        {
            "nama": " Dispepsia ",
            "query": " Ulu hati perih. ",
            "tags": ["Gastro", "", None, 7],
            "pasien": {"umur": 38, "gender": "L"},
        },
        {"nama": "ISPA", "query": "Batuk pilek dua hari.", "tags": "respirasi", "pasien": "bukan dict"},
        {"nama": "", "query": "tanpa nama"},
        {"nama": "Tanpa query"},
        "bukan entry",
        {"nama": "Hipertensi", "query": "Kepala berat.", "tags": ["kardio", "GASTRO"]},
    ]
}


class ScenarioLoaderTests(_IsolatedCacheMixin, unittest.TestCase):
    module = scenarios
    env_prefix = "SIDELAB_SCENARIO_"

    def _load_fixture(self):
        return scenarios.load_scenarios(self._write("s.json", _SCENARIOS))

    def test_keeps_only_complete_entries_with_trimmed_name_and_query(self):
        loaded = self._load_fixture()

        self.assertEqual(
            [(s["nama"], s["query"]) for s in loaded],
            [("Dispepsia", "Ulu hati perih."), ("ISPA", "Batuk pilek dua hari."), ("Hipertensi", "Kepala berat.")],
        )

    def test_tags_drop_falsy_values_and_are_stringified(self):
        loaded = self._load_fixture()

        self.assertEqual(loaded[0]["tags"], ["Gastro", "7"])

    def test_non_list_tags_and_non_dict_pasien_fall_back_to_empty(self):
        ispa = self._load_fixture()[1]

        self.assertEqual(ispa["tags"], [])
        self.assertEqual(ispa["pasien"], {})

    def test_pasien_context_is_passed_through_unchanged(self):
        self.assertEqual(self._load_fixture()[0]["pasien"], {"umur": 38, "gender": "L"})

    def test_missing_malformed_or_itemless_files_yield_no_scenarios(self):
        cases = {
            "absent": self.root / "absent.json",
            "malformed": self._write("bad.json", "[oops"),
            "list_root": self._write("list.json", [{"nama": "A", "query": "B"}]),
            "items_not_list": self._write("obj.json", {"items": {"nama": "A"}}),
        }
        for label, path in cases.items():
            with self.subTest(case=label):
                self.assertEqual(scenarios.load_scenarios(path), [])

    def test_default_path_is_cached_until_reset(self):
        path = self._write("s.json", _SCENARIOS)
        with mock.patch.object(scenarios, "_DEFAULT_PATH", path):
            first = scenarios.load_scenarios()
            self._write("s.json", {"items": [{"nama": "Baru", "query": "Q"}]})
            cached = scenarios.load_scenarios()
            scenarios.reset_cache()
            reread = scenarios.load_scenarios()

        self.assertEqual(len(first), 3)
        self.assertIs(cached, first)
        self.assertEqual([s["nama"] for s in reread], ["Baru"])

    def test_as_pairs_returns_name_query_tuples(self):
        loaded = self._load_fixture()

        self.assertEqual(
            scenarios.as_pairs(loaded),
            [("Dispepsia", "Ulu hati perih."), ("ISPA", "Batuk pilek dua hari."), ("Hipertensi", "Kepala berat.")],
        )

    def test_as_pairs_skips_items_without_name(self):
        items = [{"nama": "", "query": "x"}, {"nama": "A", "query": "B"}]

        self.assertEqual(scenarios.as_pairs(items), [("A", "B")])

    def test_with_pasien_returns_triples_with_empty_dict_when_absent(self):
        items = [
            {"nama": "A", "query": "B", "pasien": {"umur": 5}},
            {"nama": "C", "query": "D"},
            {"nama": "", "query": "E"},
        ]

        self.assertEqual(
            scenarios.with_pasien(items),
            [("A", "B", {"umur": 5}), ("C", "D", {})],
        )

    def test_helpers_default_to_the_default_fixture(self):
        path = self._write("s.json", _SCENARIOS)
        with mock.patch.object(scenarios, "_DEFAULT_PATH", path):
            pairs = scenarios.as_pairs()
            triples = scenarios.with_pasien()

        self.assertEqual(pairs[1], ("ISPA", "Batuk pilek dua hari."))
        self.assertEqual(triples[0], ("Dispepsia", "Ulu hati perih.", {"umur": 38, "gender": "L"}))

    def test_by_tag_matches_exact_tag_case_insensitively(self):
        path = self._write("s.json", _SCENARIOS)
        with mock.patch.object(scenarios, "_DEFAULT_PATH", path):
            gastro = scenarios.by_tag("gastro")
            partial = scenarios.by_tag("gast")

        self.assertEqual([s["nama"] for s in gastro], ["Dispepsia", "Hipertensi"])
        self.assertEqual(partial, [])


if __name__ == "__main__":
    unittest.main()
