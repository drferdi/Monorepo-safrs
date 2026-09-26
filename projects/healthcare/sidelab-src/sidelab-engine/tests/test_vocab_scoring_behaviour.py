# Architected and built by codieverse+.
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from sidelab import disease_scoring as _sl
from sidelab import vocab

# Token sintetis yang tidak ada di _IDF, sehingga bobotnya default 5.0 dan
# tidak termasuk _WEAK_QUERY_TERMS, _BODY_CONTEXT, atau _ANATOMIC_TERMS.
_STRONG = "zqa"
_NAME = "Penyakit Uji"
_SYSTEM = "SISTEM UJI"


def _entry(name_lower, gejala=(), pf=(), defn=(), extra=()):
    gejala_words = [set(g) for g in gejala]
    pf_words = [set(p) for p in pf]
    all_words = set(defn) | set(extra)
    for words in gejala_words + pf_words:
        all_words |= words
    return {
        "name_lower": name_lower,
        "gejala_words": gejala_words,
        "pf_words": pf_words,
        "def_words": set(defn),
        "all_words": all_words,
    }


def _score(entry, words, name=_NAME, body_hints=None, profile=None, idf=None):
    disease = {"nama": name, "body_system": _SYSTEM}
    with patch.dict(_sl._DISEASE_WORD_CACHE, {name: entry}), patch.dict(
        _sl._IDF, idf or {}
    ):
        return _sl._score_disease_tfidf(disease, set(words), body_hints, profile)


class LoadDiseasesTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.dir = Path(self._tmp.name)

    def test_missing_file_returns_empty_list(self):
        self.assertEqual(_sl._load_diseases(self.dir / "tidak_ada.json"), [])

    def test_malformed_json_returns_empty_list(self):
        path = self.dir / "rusak.json"
        path.write_text("{bukan json", encoding="utf-8")
        self.assertEqual(_sl._load_diseases(path), [])

    def test_file_without_penyakit_key_returns_empty_list(self):
        path = self.dir / "kosong.json"
        path.write_text(json.dumps({"lain": [1]}), encoding="utf-8")
        self.assertEqual(_sl._load_diseases(path), [])

    def test_valid_file_returns_penyakit_list(self):
        path = self.dir / "ok.json"
        path.write_text(json.dumps({"penyakit": [{"nama": "Uji"}]}), encoding="utf-8")
        self.assertEqual(_sl._load_diseases(str(path)), [{"nama": "Uji"}])


class DiseaseWordCacheBuildTests(unittest.TestCase):
    def test_nameless_disease_is_skipped_and_nafas_normalized_in_name(self):
        cache = _sl._build_disease_word_cache(
            [
                {"nama": "", "gejala_klinis": ["batuk"]},
                {
                    "nama": "Sesak Nafas Uji",
                    "gejala_klinis": ["batuk kering"],
                    "pemeriksaan_fisik": ["ronki basah"],
                    "definisi": "infeksi saluran",
                },
            ]
        )
        self.assertEqual(list(cache), ["Sesak Nafas Uji"])
        entry = cache["Sesak Nafas Uji"]
        self.assertEqual(entry["name_lower"], "sesak napas uji")
        self.assertEqual(
            entry["all_words"], {"batuk", "kering", "ronki", "basah", "infeksi", "saluran"}
        )


class ScoreBodySystemTests(unittest.TestCase):
    def test_matching_body_system_adds_twelve(self):
        entry = _entry("penyakit uji", extra=[_STRONG])
        base = _score(entry, [_STRONG])
        hinted = _score(entry, [_STRONG], body_hints={_SYSTEM})
        self.assertEqual(hinted - base, 12.0)

    def test_other_system_with_two_body_context_words_subtracts_eight(self):
        entry = _entry("penyakit uji", extra=["batuk", "sesak"])
        base = _score(entry, ["batuk", "sesak"])
        mismatched = _score(entry, ["batuk", "sesak"], body_hints={"SISTEM LAIN"})
        self.assertEqual(mismatched - base, -8.0)

    def test_other_system_with_single_body_context_word_has_no_penalty(self):
        entry = _entry("penyakit uji", extra=["batuk", _STRONG])
        base = _score(entry, ["batuk", _STRONG])
        mismatched = _score(entry, ["batuk", _STRONG], body_hints={"SISTEM LAIN"})
        self.assertEqual(mismatched, base)


class ScoreTermWeightTests(unittest.TestCase):
    def test_strong_symptom_match_uses_full_idf_weight(self):
        entry = _entry("penyakit uji", gejala=[[_STRONG]])
        self.assertEqual(_score(entry, [_STRONG]), 5.0)

    def test_weak_symptom_only_match_is_quartered_and_penalised(self):
        entry = _entry("penyakit uji", gejala=[["demam"]])
        score = _score(entry, ["demam"], idf={"demam": 2.0})
        self.assertAlmostEqual(score, 2.0 * 0.25 - 6.0)

    def test_weak_only_penalty_waived_when_anatomic_anchor_present(self):
        entry = _entry("penyakit uji", gejala=[["demam"]], extra=["kepala"])
        score = _score(entry, ["demam", "kepala"], idf={"demam": 2.0})
        self.assertAlmostEqual(score, 2.0 * 0.25)

    def test_physical_exam_match_weighs_sixty_percent(self):
        strong = _score(_entry("penyakit uji", pf=[[_STRONG]]), [_STRONG])
        weak = _score(
            _entry("penyakit uji", pf=[["demam"]]), ["demam"], idf={"demam": 2.0}
        )
        self.assertAlmostEqual(strong, 5.0 * 0.6)
        self.assertAlmostEqual(weak, 2.0 * 0.6 * 0.25 - 6.0)

    def test_definition_match_weighs_twenty_percent_and_weak_terms_ten_percent_of_that(self):
        entry = _entry("penyakit uji", defn=[_STRONG, "demam"])
        strong = _score(entry, [_STRONG])
        weak = _score(entry, ["demam"], idf={"demam": 2.0})
        self.assertAlmostEqual(strong, 5.0 * 0.2)
        self.assertAlmostEqual(weak, 2.0 * 0.2 * 0.1 - 6.0)


class ScoreNameBonusTests(unittest.TestCase):
    def test_rare_query_word_in_disease_name_adds_double_idf_once(self):
        entry = _entry("penyakit zqa zqb", extra=["zqa", "zqb"])
        score = _score(
            entry, ["zqa", "zqb"], name="Penyakit Zqa Zqb", idf={"zqa": 4.0, "zqb": 4.0}
        )
        self.assertEqual(score, 8.0)

    def test_common_query_word_in_name_gets_no_bonus(self):
        entry = _entry("penyakit zqa", extra=["zqa"])
        self.assertEqual(_score(entry, ["zqa"], name="Penyakit Zqa", idf={"zqa": 3.0}), 0.0)

    def test_generic_term_in_name_gets_no_bonus(self):
        entry = _entry("faringitis akut", extra=["akut"])
        score = _score(entry, ["akut"], name="Faringitis Akut", idf={"akut": 4.0})
        self.assertEqual(score, 0.0)


class ScoreProfileTests(unittest.TestCase):
    def test_candidate_hint_boost_is_larger_for_short_queries(self):
        entry = _entry("penyakit uji", extra=[_STRONG])
        short = _score(entry, [_STRONG], profile={"candidate_hints": {"uji"}, "short_query": True})
        long_ = _score(entry, [_STRONG], profile={"candidate_hints": {"uji"}, "short_query": False})
        self.assertEqual(short, 8.0)
        self.assertEqual(long_, 4.0)

    def test_rlq_syndrome_boosts_appendicitis(self):
        name = "Appendisitis Uji"
        entry = _entry("appendisitis uji", extra=[_STRONG])
        tags = {"syndrome_tags": {"abdominal-rlq"}}
        short = _score(entry, [_STRONG], name=name, profile=dict(tags, short_query=True))
        long_ = _score(entry, [_STRONG], name=name, profile=dict(tags, short_query=False))
        self.assertEqual(short, 10.0)
        self.assertEqual(long_, 6.0)

    def test_rlq_syndrome_penalises_gastritis(self):
        name = "Gastritis Uji"
        entry = _entry("gastritis uji", extra=[_STRONG])
        tags = {"syndrome_tags": {"abdominal-rlq"}}
        short = _score(entry, [_STRONG], name=name, profile=dict(tags, short_query=True))
        long_ = _score(entry, [_STRONG], name=name, profile=dict(tags, short_query=False))
        self.assertEqual(short, -8.0)
        self.assertEqual(long_, -5.0)

    def test_unknown_syndrome_tag_does_not_change_score(self):
        entry = _entry("gastritis uji", extra=[_STRONG])
        score = _score(
            entry, [_STRONG], name="Gastritis Uji", profile={"syndrome_tags": {"tag-tidak-dikenal"}}
        )
        self.assertEqual(score, 0.0)

    def test_short_query_without_red_flags_down_ranks_severe_disease_name(self):
        name = "Stroke Uji"
        entry = _entry("stroke uji", extra=[_STRONG])
        calm = _score(entry, [_STRONG], name=name, profile={"short_query": True})
        red_flag = _score(
            entry, [_STRONG], name=name, profile={"short_query": True, "severe_cues": {"kejang"}}
        )
        self.assertEqual(calm, -10.0)
        self.assertEqual(red_flag, 0.0)


class QueryProfileTests(unittest.TestCase):
    def test_lone_pusing_is_tagged_dizziness_undifferentiated(self):
        profile = vocab._extract_query_profile("pusing")
        self.assertEqual(profile["syndrome_tags"], {"dizziness-undifferentiated"})

    def test_specific_dizziness_tag_suppresses_undifferentiated(self):
        profile = vocab._extract_query_profile("pusing vertigo")
        self.assertEqual(profile["syndrome_tags"], {"dizziness-vertigo-like"})

    def test_weak_only_complaint_summary_asks_for_clarification(self):
        summary = vocab._build_clinical_summary("demam mual")
        self.assertIn("Status data: keluhan masih terlalu umum", summary)
        self.assertNotIn("informasi masih singkat", summary)


class CandidateHintMatchTests(unittest.TestCase):
    def test_empty_hints_never_match(self):
        self.assertFalse(vocab._disease_matches_candidate_hints({"nama": "Asma"}, set()))

    def test_hint_matches_after_nafas_normalisation(self):
        disease = {"nama": "Sesak Nafas Uji"}
        self.assertTrue(vocab._disease_matches_candidate_hints(disease, {"napas"}))
        self.assertFalse(vocab._disease_matches_candidate_hints(disease, {"migren"}))


class PrioritizeCandidatesTests(unittest.TestCase):
    def setUp(self):
        self.a = (9.0, {"nama": "Gastritis"})
        self.b = (8.0, {"nama": "Appendisitis"})
        self.c = (7.0, {"nama": "Dispepsia"})
        self.d = (6.0, {"nama": "Refluks Gastroesofageal"})
        self.scored = [self.a, self.b, self.c, self.d]

    def test_empty_list_is_returned_as_is(self):
        empty = []
        self.assertIs(vocab._prioritize_scored_candidates(empty, {}), empty)

    def test_preferred_hints_move_matches_first_keeping_relative_order(self):
        profile = {"preferred_candidate_hints": {"appendisitis", "refluks"}}
        result = vocab._prioritize_scored_candidates(self.scored, profile)
        self.assertEqual(result, [self.b, self.d, self.a, self.c])

    def test_preferred_hints_without_match_leave_order_unchanged(self):
        profile = {"preferred_candidate_hints": {"migren"}, "short_query": False}
        result = vocab._prioritize_scored_candidates(self.scored, profile)
        self.assertEqual(result, self.scored)

    def test_short_query_general_hints_reorder_when_two_or_more_match(self):
        profile = {"candidate_hints": {"dispepsia", "refluks"}, "short_query": True}
        result = vocab._prioritize_scored_candidates(self.scored, profile)
        self.assertEqual(result, [self.c, self.d, self.a, self.b])

    def test_short_query_single_general_match_does_not_reorder(self):
        profile = {"candidate_hints": {"dispepsia"}, "short_query": True}
        result = vocab._prioritize_scored_candidates(self.scored, profile)
        self.assertEqual(result, self.scored)

    def test_general_hints_ignored_for_long_queries(self):
        profile = {"candidate_hints": {"dispepsia", "refluks"}, "short_query": False}
        result = vocab._prioritize_scored_candidates(self.scored, profile)
        self.assertEqual(result, self.scored)


if __name__ == "__main__":
    unittest.main()
