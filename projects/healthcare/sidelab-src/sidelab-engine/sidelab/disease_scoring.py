# Architected and built by codieverse+.
from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path
from typing import Any

from sidelab import vocab

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _load_diseases(path: Path | str | None = None) -> list[dict[str, Any]]:
    data_path = Path(path) if path is not None else _DATA_DIR / "penyakit.json"
    try:
        with data_path.open(encoding="utf-8") as f:
            return json.load(f).get("penyakit", [])
    except Exception:
        return []


DISEASES_FULL = _load_diseases()


def _build_idf(diseases: list[dict[str, Any]] | None = None) -> dict[str, float]:
    source = diseases if diseases is not None else DISEASES_FULL
    n = len(source) or 1
    doc_freq: dict[str, int] = defaultdict(int)
    for disease in source:
        terms_in_doc: set[str] = set()
        for gejala in disease.get("gejala_klinis", []):
            for word in vocab._text_to_words(gejala):
                terms_in_doc.add(word)
        for term in terms_in_doc:
            doc_freq[term] += 1
    return {term: math.log(n / freq) for term, freq in doc_freq.items()}


_IDF = _build_idf()


def _build_disease_word_cache(
    diseases: list[dict[str, Any]] | None = None,
) -> dict[str, dict[str, Any]]:
    source = diseases if diseases is not None else DISEASES_FULL
    cache: dict[str, dict[str, Any]] = {}
    for disease in source:
        name = disease.get("nama", "")
        if not name:
            continue
        gejala_words = [
            vocab._text_to_words(gejala) for gejala in disease.get("gejala_klinis", [])
        ]
        pf_words = [
            vocab._text_to_words(fisik)
            for fisik in disease.get("pemeriksaan_fisik", [])
        ]
        def_words = vocab._text_to_words(disease.get("definisi", ""))
        all_words: set[str] = def_words.copy()
        for words in gejala_words + pf_words:
            all_words.update(words)
        cache[name] = {
            "name_lower": name.lower().replace("nafas", "napas"),
            "gejala_words": gejala_words,
            "pf_words": pf_words,
            "def_words": def_words,
            "all_words": all_words,
        }
    return cache


_DISEASE_WORD_CACHE: dict[str, dict[str, Any]] = _build_disease_word_cache()
_PATHO_TERMS = vocab._PATHO_TERMS
_PATHO_COMBOS = vocab._PATHO_COMBOS


def _score_disease_tfidf(
    disease: dict,
    words: set[str],
    body_hints: set[str] | None = None,
    query_profile: dict | None = None,
) -> float:
    score = 0.0
    cache_entry = _DISEASE_WORD_CACHE.get(disease.get("nama", ""), {})
    name_lower = cache_entry.get("name_lower") or disease.get("nama", "").lower().replace(
        "nafas", "napas"
    )
    disease_system = disease.get("body_system", "")
    anchor_terms = {
        word
        for word in words
        if word in vocab._ANATOMIC_TERMS or word in vocab._BODY_CONTEXT
    }
    strong_terms = words - vocab._WEAK_QUERY_TERMS
    location_terms = anchor_terms | (strong_terms - vocab._WEAK_QUERY_TERMS)
    weak_match_score = 0.0
    strong_match_score = 0.0
    profile = query_profile or {}
    candidate_hints = set(profile.get("candidate_hints", set()))
    severe_cues = set(profile.get("severe_cues", set()))
    syndrome_tags = set(profile.get("syndrome_tags", set()))
    short_query = bool(profile.get("short_query"))

    if body_hints:
        if disease_system in body_hints:
            score += 12.0
        elif len([word for word in words if vocab._BODY_CONTEXT.get(word)]) >= 2:
            score -= 8.0

    for gejala_words in cache_entry.get("gejala_words", []):
        for word in words:
            if word in gejala_words:
                weight = _IDF.get(word, 5.0)
                if word in vocab._WEAK_QUERY_TERMS:
                    weak_match_score += weight * 0.25
                else:
                    strong_match_score += weight

    for pf_words in cache_entry.get("pf_words", []):
        for word in words:
            if word in pf_words:
                weight = _IDF.get(word, 5.0) * 0.6
                if word in vocab._WEAK_QUERY_TERMS:
                    weak_match_score += weight * 0.25
                else:
                    strong_match_score += weight

    def_words = cache_entry.get("def_words", set())
    for word in words:
        if word in def_words:
            weight = _IDF.get(word, 5.0) * 0.2
            if word in vocab._WEAK_QUERY_TERMS:
                weak_match_score += weight * 0.1
            else:
                strong_match_score += weight

    score += strong_match_score + weak_match_score

    for patho in words & _PATHO_TERMS.keys():
        for hint in _PATHO_TERMS[patho]:
            if hint in name_lower:
                score += 15.0
                break

    for combo_words, hints in _PATHO_COMBOS:
        if combo_words.issubset(words):
            for hint in hints:
                if hint in name_lower:
                    score += 12.0
                    break

    for word in words:
        if (
            word in name_lower
            and word not in vocab._GENERIC_TERMS
            and _IDF.get(word, 0) > 3.5
        ):
            score += _IDF.get(word, 3.5) * 2.0
            break

    if candidate_hints and any(hint in name_lower for hint in candidate_hints):
        score += 8.0 if short_query else 4.0

    for tag in syndrome_tags:
        rules = vocab._SYNDROME_SCORE_RULES.get(tag)
        if not rules:
            continue
        if any(hint in name_lower for hint in rules.get("boost", [])):
            score += 10.0 if short_query else 6.0
        if any(hint in name_lower for hint in rules.get("penalize", [])):
            score -= 8.0 if short_query else 5.0

    if weak_match_score > 0 and strong_match_score == 0 and not anchor_terms:
        score -= 6.0

    if location_terms:
        disease_terms = cache_entry.get("all_words", set())
        if not (location_terms & disease_terms) and disease_system not in (
            body_hints or set()
        ):
            score -= 7.0

    if short_query and not severe_cues:
        if any(term in name_lower for term in vocab._SEVERE_DISEASE_NAME_TERMS):
            score -= 10.0

    return score
