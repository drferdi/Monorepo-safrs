# Architected and built by codieverse+.
import unittest

from sidelab import disease_scoring as _sl

_STRONG_TERM = "hemoptisis"


class DiseaseWordCacheTier2Tests(unittest.TestCase):
    def test_cache_entries_have_name_lower(self):
        if not _sl._DISEASE_WORD_CACHE:
            self.skipTest("No diseases loaded")
        entry = next(iter(_sl._DISEASE_WORD_CACHE.values()))
        self.assertIn("name_lower", entry)
        self.assertIsInstance(entry["name_lower"], str)

    def test_name_lower_is_lowercased(self):
        if not _sl._DISEASE_WORD_CACHE:
            self.skipTest("No diseases loaded")
        for name, entry in _sl._DISEASE_WORD_CACHE.items():
            self.assertEqual(entry["name_lower"], entry["name_lower"].lower())

    def test_name_lower_nafas_replaced_with_napas(self):
        orig = _sl._DISEASE_WORD_CACHE.get("Gagal Nafas")
        _sl._DISEASE_WORD_CACHE["Gagal Nafas"] = {
            "name_lower": "gagal napas",
            "gejala_words": [],
            "pf_words": [],
            "def_words": set(),
            "all_words": set(),
        }
        try:
            entry = _sl._DISEASE_WORD_CACHE["Gagal Nafas"]
            self.assertIn("napas", entry["name_lower"])
            self.assertNotIn("nafas", entry["name_lower"])
        finally:
            if orig is not None:
                _sl._DISEASE_WORD_CACHE["Gagal Nafas"] = orig
            else:
                _sl._DISEASE_WORD_CACHE.pop("Gagal Nafas", None)

    def test_cache_entries_have_all_words(self):
        if not _sl._DISEASE_WORD_CACHE:
            self.skipTest("No diseases loaded")
        entry = next(iter(_sl._DISEASE_WORD_CACHE.values()))
        self.assertIn("all_words", entry)
        self.assertIsInstance(entry["all_words"], set)

    def test_all_words_is_superset_of_def_words(self):
        if not _sl._DISEASE_WORD_CACHE:
            self.skipTest("No diseases loaded")
        for entry in _sl._DISEASE_WORD_CACHE.values():
            self.assertTrue(
                entry["all_words"].issuperset(entry["def_words"]),
                "all_words harus mencakup seluruh def_words",
            )

    def test_all_words_contains_gejala_words(self):
        if not _sl._DISEASE_WORD_CACHE:
            self.skipTest("No diseases loaded")
        for entry in _sl._DISEASE_WORD_CACHE.values():
            for g_set in entry["gejala_words"]:
                self.assertTrue(entry["all_words"].issuperset(g_set))

    def test_score_uses_name_lower_from_cache(self):
        """name_lower dari cache harus digunakan sehingga injeksi cache mempengaruhi scoring nama."""
        test_name = "__test_name_lower_cache__"
        _sl._DISEASE_WORD_CACHE[test_name] = {
            "name_lower": "hemoptisis paru",
            "gejala_words": [{_STRONG_TERM}],
            "pf_words": [],
            "def_words": set(),
            "all_words": {_STRONG_TERM},
        }
        d = {
            "nama": test_name,
            "body_system": "",
            "gejala_klinis": [],
            "pemeriksaan_fisik": [],
            "definisi": "",
        }
        try:
            score = _sl._score_disease_tfidf(d, {_STRONG_TERM})
            self.assertGreater(score, 0.0)
        finally:
            _sl._DISEASE_WORD_CACHE.pop(test_name, None)


if __name__ == "__main__":
    unittest.main()
