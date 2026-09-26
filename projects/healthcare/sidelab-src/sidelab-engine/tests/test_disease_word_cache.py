# Architected and built by codieverse+.
import unittest

from sidelab import disease_scoring as _sl

# Term yang TIDAK ada di _WEAK_QUERY_TERMS sehingga menjadi strong match.
_STRONG_TERM = "hemoptisis"


class DiseaseWordCacheTests(unittest.TestCase):
    def test_cache_exists_at_module_level(self):
        self.assertTrue(hasattr(_sl, "_DISEASE_WORD_CACHE"))
        self.assertIsInstance(_sl._DISEASE_WORD_CACHE, dict)

    def test_cache_entries_have_required_keys(self):
        if not _sl._DISEASE_WORD_CACHE:
            self.skipTest("No diseases loaded")
        entry = next(iter(_sl._DISEASE_WORD_CACHE.values()))
        self.assertIn("gejala_words", entry)
        self.assertIn("pf_words", entry)
        self.assertIn("def_words", entry)

    def test_gejala_words_is_list_of_sets(self):
        if not _sl._DISEASE_WORD_CACHE:
            self.skipTest("No diseases loaded")
        entry = next(iter(_sl._DISEASE_WORD_CACHE.values()))
        self.assertIsInstance(entry["gejala_words"], list)
        for item in entry["gejala_words"]:
            self.assertIsInstance(item, set)

    def test_def_words_is_a_set(self):
        if not _sl._DISEASE_WORD_CACHE:
            self.skipTest("No diseases loaded")
        entry = next(iter(_sl._DISEASE_WORD_CACHE.values()))
        self.assertIsInstance(entry["def_words"], set)

    def test_score_match_higher_than_no_match(self):
        """Disease dengan gejala yang cocok harus skor lebih tinggi dari yang tidak cocok."""
        name_hit = "__test_cache_hit__"
        name_miss = "__test_cache_miss__"
        _sl._DISEASE_WORD_CACHE[name_hit] = {
            "gejala_words": [{_STRONG_TERM}],
            "pf_words": [],
            "def_words": set(),
        }
        _sl._DISEASE_WORD_CACHE[name_miss] = {
            "gejala_words": [{"pilek", "batuk"}],
            "pf_words": [],
            "def_words": set(),
        }
        d_hit = {"nama": name_hit, "body_system": "", "gejala_klinis": [], "pemeriksaan_fisik": [], "definisi": ""}
        d_miss = {"nama": name_miss, "body_system": "", "gejala_klinis": [], "pemeriksaan_fisik": [], "definisi": ""}
        try:
            score_hit = _sl._score_disease_tfidf(d_hit, {_STRONG_TERM})
            score_miss = _sl._score_disease_tfidf(d_miss, {_STRONG_TERM})
            self.assertGreater(score_hit, score_miss, "Cache hit harus skor lebih tinggi")
        finally:
            _sl._DISEASE_WORD_CACHE.pop(name_hit, None)
            _sl._DISEASE_WORD_CACHE.pop(name_miss, None)

    def test_score_zero_for_empty_cache_entry(self):
        """Disease tanpa gejala di cache dan tanpa raw fields harus skor 0 (sebelum bonus/penalti nama)."""
        test_name = "__test_score_empty__"
        _sl._DISEASE_WORD_CACHE[test_name] = {
            "gejala_words": [],
            "pf_words": [],
            "def_words": set(),
        }
        test_disease = {
            "nama": test_name,
            "body_system": "",
            "gejala_klinis": [],
            "pemeriksaan_fisik": [],
            "definisi": "",
        }
        try:
            score = _sl._score_disease_tfidf(test_disease, {"batuk"})
            # Skor bisa 0 atau negatif (karena penalty anchor/weak), tapi tidak positif
            self.assertLessEqual(score, 0.0)
        finally:
            _sl._DISEASE_WORD_CACHE.pop(test_name, None)

    def test_pf_words_contributes_lower_score_than_gejala(self):
        """Gejala bobot 1.0x harus lebih tinggi dari pf bobot 0.6x pada term yang sama."""
        base = "__test_pf_vs_gejala__"
        _sl._DISEASE_WORD_CACHE[base + "g"] = {
            "gejala_words": [{_STRONG_TERM}],
            "pf_words": [],
            "def_words": set(),
        }
        _sl._DISEASE_WORD_CACHE[base + "p"] = {
            "gejala_words": [],
            "pf_words": [{_STRONG_TERM}],
            "def_words": set(),
        }
        d_g = {"nama": base + "g", "body_system": "", "gejala_klinis": [], "pemeriksaan_fisik": [], "definisi": ""}
        d_p = {"nama": base + "p", "body_system": "", "gejala_klinis": [], "pemeriksaan_fisik": [], "definisi": ""}
        try:
            score_g = _sl._score_disease_tfidf(d_g, {_STRONG_TERM})
            score_p = _sl._score_disease_tfidf(d_p, {_STRONG_TERM})
            self.assertGreater(score_g, score_p, "gejala score (1.0x) harus lebih tinggi dari pf score (0.6x)")
        finally:
            _sl._DISEASE_WORD_CACHE.pop(base + "g", None)
            _sl._DISEASE_WORD_CACHE.pop(base + "p", None)


if __name__ == "__main__":
    unittest.main()
