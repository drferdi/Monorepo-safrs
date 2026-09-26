# Architected and built by codieverse+.
import unittest

from sidelab import disease_scoring as _sl

# Patho term yang ada di _PATHO_TERMS
_PATHO_TERM = "hemoptisis"
# Hint yang cocok untuk hemoptisis
_PATHO_HINT = "tuberkulosis"


class PathoShortCircuitTests(unittest.TestCase):
    def test_active_patho_computed_from_words(self):
        """active_patho harus intersection dari words dengan _PATHO_TERMS keys."""
        active = set(_sl._PATHO_TERMS.keys()) & {_PATHO_TERM, "batuk", "demam"}
        self.assertEqual(active, {_PATHO_TERM})

    def test_patho_bonus_applied_for_matching_term(self):
        """Disease dengan nama mengandung patho hint harus dapat bonus 15.0."""
        test_name = "__test_patho_bonus__"
        _sl._DISEASE_WORD_CACHE[test_name] = {
            "name_lower": _PATHO_HINT,
            "gejala_words": [{_PATHO_TERM}],
            "pf_words": [],
            "def_words": set(),
            "all_words": {_PATHO_TERM},
        }
        d = {
            "nama": test_name,
            "body_system": "",
            "gejala_klinis": [],
            "pemeriksaan_fisik": [],
            "definisi": "",
        }
        try:
            score = _sl._score_disease_tfidf(d, {_PATHO_TERM})
            # Bonus patho 15.0 + gejala TF-IDF weight
            self.assertGreater(score, 15.0)
        finally:
            _sl._DISEASE_WORD_CACHE.pop(test_name, None)

    def test_no_patho_bonus_for_non_patho_query(self):
        """Query tanpa patho term tidak boleh dapat bonus patho."""
        test_name = "__test_no_patho__"
        _sl._DISEASE_WORD_CACHE[test_name] = {
            "name_lower": _PATHO_HINT,
            "gejala_words": [{"batuk", "demam"}],
            "pf_words": [],
            "def_words": set(),
            "all_words": {"batuk", "demam"},
        }
        d = {
            "nama": test_name,
            "body_system": "",
            "gejala_klinis": [],
            "pemeriksaan_fisik": [],
            "definisi": "",
        }
        try:
            score_no_patho = _sl._score_disease_tfidf(d, {"batuk"})
            score_with_patho = _sl._score_disease_tfidf(d, {_PATHO_TERM})
            # Score tanpa patho query tidak boleh dapat bonus 15.0
            # (score_with_patho - score_no_patho harus ada selisih signifikan)
            self.assertLess(score_no_patho, score_with_patho)
        finally:
            _sl._DISEASE_WORD_CACHE.pop(test_name, None)

    def test_patho_combo_bonus_applied(self):
        """Combo words yang subset dari query harus dapat bonus 12.0."""
        # {"batuk", "darah"} → hint "tuberkulosis"
        test_name = "__test_patho_combo__"
        _sl._DISEASE_WORD_CACHE[test_name] = {
            "name_lower": "tuberkulosis paru",
            "gejala_words": [{"batuk", "darah"}],
            "pf_words": [],
            "def_words": set(),
            "all_words": {"batuk", "darah"},
        }
        d = {
            "nama": test_name,
            "body_system": "",
            "gejala_klinis": [],
            "pemeriksaan_fisik": [],
            "definisi": "",
        }
        try:
            score = _sl._score_disease_tfidf(d, {"batuk", "darah"})
            # Combo bonus 12.0 harus ada
            self.assertGreater(score, 12.0)
        finally:
            _sl._DISEASE_WORD_CACHE.pop(test_name, None)

    def test_no_combo_bonus_when_words_incomplete(self):
        """Combo tidak terpenuhi bila hanya salah satu kata ada di query."""
        test_name = "__test_no_combo__"
        _sl._DISEASE_WORD_CACHE[test_name] = {
            "name_lower": "tuberkulosis paru",
            "gejala_words": [{"batuk"}],
            "pf_words": [],
            "def_words": set(),
            "all_words": {"batuk"},
        }
        d = {
            "nama": test_name,
            "body_system": "",
            "gejala_klinis": [],
            "pemeriksaan_fisik": [],
            "definisi": "",
        }
        try:
            score_one = _sl._score_disease_tfidf(d, {"batuk"})
            score_two = _sl._score_disease_tfidf(d, {"batuk", "darah"})
            # Tanpa combo lengkap, tidak ada bonus 12.0
            # (score_two bisa lebih besar karena darah juga memicu combo)
            # Yang penting: dengan hanya "batuk" → tidak dapat combo bonus
            self.assertLess(score_one, score_two)
        finally:
            _sl._DISEASE_WORD_CACHE.pop(test_name, None)


if __name__ == "__main__":
    unittest.main()
