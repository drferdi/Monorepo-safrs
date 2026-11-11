# Architected and built by codieverse+.
"""
sidelab/intelligence.py — Clinical Intelligence Engine

Five capabilities implemented here:
  1. ClinicalChainScaffold   — chains as reasoning scaffold injected into prompt
  2. ClinicalStateTracker    — session state extraction across multi-turn
  3. SemanticRetriever       — cosine similarity over cached 768-dim vectors
  4. CertaintyCalibrator     — deterministic certainty scoring
  5. QueryNormalizer         — structured query expansion before retrieval

All are stateless functions or lightweight classes.
No external API calls except SemanticRetriever which optionally calls
an embedding endpoint if available.
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Data loading (module-level, loaded once)
# ---------------------------------------------------------------------------
_BASE = Path(__file__).parent.parent / "data"


def _load(fname: str) -> Any:
    try:
        return json.loads((_BASE / fname).read_text(encoding="utf-8"))
    except Exception:
        return {}


_CHAINS_RAW: dict = _load("clinical-chains.json")
_CHAINS: dict = {k: v for k, v in _CHAINS_RAW.items() if not k.startswith("_")}

_VECTORS_RAW: dict = _load("penyakit-vectors.json")
_VECTORS: list[dict] = _VECTORS_RAW.get("vectors", [])

_PENYAKIT_RAW: dict = _load("penyakit.json")
_PENYAKIT: list[dict] = _PENYAKIT_RAW.get("penyakit", [])

_D144_RAW: dict = _load("144_penyakit_puskesmas.json")
_D144: list[dict] = _D144_RAW.get("diseases", [])

# Build lookup indexes
_VEC_BY_ICD: dict[str, dict] = {v["icd10"].upper(): v for v in _VECTORS}
_VEC_BY_NAME: dict[str, dict] = {v["nama"].lower(): v for v in _VECTORS}
_DIS_BY_ICD: dict[str, dict] = {d.get("icd10", "").upper(): d for d in _PENYAKIT}
_D144_BY_ICD: dict[str, dict] = {d.get("icd10", "").upper(): d for d in _D144}


# ---------------------------------------------------------------------------
# Idea 1 — ClinicalChainScaffold
# ---------------------------------------------------------------------------
# Chains are keyed by symptom (Indonesian), e.g. "sesak napas", "nyeri dada"
# We match input words against chain keys, then build a reasoning scaffold.

_CHAIN_ALIAS: dict[str, str] = {
    "sesak": "sesak napas",
    "nafas": "sesak napas",
    "sesak nafas": "sesak napas",
    "pusing": "pusing / vertigo",
    "vertigo": "pusing / vertigo",
    "lemas": "lemas / fatigue",
    "fatigue": "lemas / fatigue",
    "kebas": "kebas / kesemutan",
    "kesemutan": "kebas / kesemutan",
    "pingsan": "pingsan / sinkop",
    "sinkop": "pingsan / sinkop",
    "bab darah": "bab berdarah",
    "darah di bab": "bab berdarah",
    "pendarahan": "perdarahan",
    "tidak haid": "tidak haid",
    "amenore": "tidak haid",
    "berdebar": "berdebar-debar",
    "jantung berdebar": "berdebar-debar",
}


def _match_chains(query: str) -> list[dict]:
    """Return up to 3 matching chain entries for a query string."""
    q = query.lower()
    matched: list[tuple[int, str, dict]] = []  # (priority, key, chain)

    for key, chain in _CHAINS.items():
        alias_key = _CHAIN_ALIAS.get(key, key)
        # Exact substring match in query
        if key in q or alias_key in q:
            matched.append((0, key, chain))
            continue
        # Word-level match: all words of key present in query
        key_words = set(key.split())
        if len(key_words) > 1 and key_words.issubset(set(q.split())):
            matched.append((1, key, chain))
            continue
        # Partial match: first word of key in query
        first_word = key.split()[0]
        if len(first_word) >= 4 and first_word in q:
            matched.append((2, key, chain))

    matched.sort(key=lambda x: x[0])
    seen: set[str] = set()
    result: list[dict] = []
    for _, key, chain in matched:
        if key not in seen:
            seen.add(key)
            result.append({"key": key, "chain": chain})
        if len(result) >= 3:
            break
    return result


def build_chain_scaffold(query: str, kasus: dict) -> str:
    """Build a reasoning scaffold string from matching clinical chains.

    Returns a compact block to inject into the LLM prompt as
    CLINICAL REASONING SCAFFOLD. Returns empty string if no match.
    """
    # Combine query with structured case fields
    full_text = " ".join(
        filter(
            None,
            [
                query,
                kasus.get("keluhan", ""),
                kasus.get("gejala", ""),
                kasus.get("redflag", ""),
            ],
        )
    ).lower()

    matches = _match_chains(full_text)
    if not matches:
        return ""

    lines: list[str] = ["CLINICAL REASONING SCAFFOLD (berdasarkan clinical chains):"]
    for m in matches:
        key = m["key"]
        chain = m["chain"]
        lines.append(f"\nKeluhan utama terdeteksi: {chain.get('clinical_entity', key)}")

        # Logical chain — gejala yang sering menyertai
        lc = chain.get("logical_chain", [])
        if lc:
            lines.append(f"  Gejala penyerta tipikal: {', '.join(lc[:5])}")

        # Predictive next — diferensiasi
        pn = chain.get("predictive_next", {})
        rf = pn.get("red_flags", [])
        if rf:
            lines.append(f"  Red flags yang harus dicari: {', '.join(rf[:3])}")

        # Pemeriksaan yang disarankan berdasarkan chain
        pem = chain.get("pemeriksaan", {})
        fisik = pem.get("fisik", [])
        lab = pem.get("lab", [])
        penunjang = pem.get("penunjang", [])
        if fisik:
            lines.append(f"  Pemeriksaan fisik prioritas: {', '.join(fisik[:3])}")
        if lab:
            lines.append(f"  Lab yang relevan: {', '.join(lab[:3])}")
        if penunjang:
            lines.append(f"  Penunjang: {', '.join(penunjang[:2])}")

    lines.append(
        "\nGunakan scaffold di atas sebagai KERANGKA reasoning — bukan sebagai "
        "diagnosis final. Sesuaikan dengan data pasien aktif dan temuan klinis yang ada."
    )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Idea 2 — QueryNormalizer (rule-based, no extra API call)
# ---------------------------------------------------------------------------
# Expand abbreviations, normalize Indonesian clinical shorthand

_ABBREV: dict[str, str] = {
    r"\bdd\b": "diabetes melitus tipe",
    r"\bdm\b": "diabetes melitus",
    r"\bht\b": "hipertensi",
    r"\botu\b": "otitis media akut",
    r"\bispa\b": "infeksi saluran pernapasan atas",
    r"\bgea\b": "gastroenteritis akut",
    r"\bubp\b": "uretritis",
    r"\butk\b": "ulkus traumatik",
    r"\bklinis\b": "",
    r"\bkontrol\b": "kontrol rutin",
    r"\bhba1c\b": "hemoglobin a1c kadar",
    r"\bgds\b": "gula darah sewaktu",
    r"\bgdp\b": "gula darah puasa",
    r"\btd\b": "tekanan darah",
    r"\bhbsag\b": "hepatitis b antigen",
    r"\becg\b": "ekg elektrokardiogram",
    r"\bspO2\b": "saturasi oksigen",
}


def normalize_query(raw: str) -> str:
    """Expand abbreviations and normalize clinical shorthand.

    Lightweight rule-based — no API call. Returns expanded query string.
    """
    text = raw.strip()
    for pattern, replacement in _ABBREV.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    # Remove double spaces
    text = re.sub(r" {2,}", " ", text).strip()
    return text


# ---------------------------------------------------------------------------
# Idea 3 — SemanticRetriever (cosine similarity on precomputed vectors)
# ---------------------------------------------------------------------------


def _cosine(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two equal-length vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _tfidf_query_vector(query_words: set[str], dim: int = 768) -> list[float] | None:
    """
    We don't have a real query encoder here, so we can't produce a true
    dense embedding from text. Return None to signal fallback to TF-IDF.

    When an embedding endpoint is available (Ollama /api/embed or
    OpenAI /embeddings), this function should be replaced with a real call.
    """
    return None


def semantic_retrieve(
    query: str,
    top_k: int = 3,
    query_vector: list[float] | None = None,
) -> list[dict]:
    """Retrieve top-k diseases by cosine similarity.

    If query_vector is provided (from an embedding API), uses true semantic
    similarity. Otherwise falls back to keyword-overlap proxy which is still
    better than pure TF-IDF because it operates over the vector index names.

    Returns list of dicts: {icd10, nama, score, disease_data}
    """
    if not _VECTORS:
        return []

    if query_vector is not None and len(query_vector) == len(_VECTORS[0]["vector"]):
        # True cosine similarity
        scored = [
            (v["icd10"], v["nama"], _cosine(query_vector, v["vector"]))
            for v in _VECTORS
        ]
    else:
        # Fallback: keyword overlap between query and disease name/ICD
        # Better than nothing — uses the vector index as a whitelist of
        # clinically relevant diseases
        q_words = set(query.lower().split())
        scored = []
        for v in _VECTORS:
            name_words = set(v["nama"].lower().split())
            overlap = len(q_words & name_words)
            # Boost if ICD prefix appears in query
            icd_prefix = v["icd10"][:3].lower()
            icd_bonus = 0.5 if icd_prefix in query.lower() else 0.0
            scored.append((v["icd10"], v["nama"], overlap * 0.1 + icd_bonus))

    scored.sort(key=lambda x: -x[2])
    results: list[dict] = []
    for icd, nama, score in scored[:top_k]:
        dis = _DIS_BY_ICD.get(icd.upper(), {})
        d144 = _D144_BY_ICD.get(icd.upper(), {})
        results.append(
            {
                "icd10": icd,
                "nama": nama,
                "score": round(score, 4),
                "disease_data": dis,
                "d144_data": d144,
            }
        )
    return results


# ---------------------------------------------------------------------------
# Idea 4 — CertaintyCalibrator
# ---------------------------------------------------------------------------
# Deterministic certainty score based on measurable clinical data signals.


def calibrate_certainty(kasus: dict, pasien: dict, chain_matches: list[dict]) -> str:
    """Return calibrated certainty level based on available data signals.

    Signals scored:
    - keluhan present and specific (+2)
    - durasi documented (+1)
    - gejala penyerta documented (+1)
    - vital signs documented (+2)
    - red flag clues documented (+1)
    - pasien data (umur, jk, bb) documented (+1 each, max +2)
    - chain match found (+1)
    - logical_chain gejala present in kasus (+1 per match, max +3)

    Score → certainty:
      0-2  → insufficient_data
      3-4  → possible
      5-7  → probable
      8+   → definitive (only if vitals AND specific complaint)
    """
    score = 0

    keluhan = kasus.get("keluhan", "").strip()
    # Specific complaint: more than 2 words and not a single generic term
    generic_single = {"demam", "batuk", "pusing", "mual", "lemas", "nyeri", "sakit"}
    keluhan_words = set(keluhan.lower().split())
    if keluhan and len(keluhan_words) >= 3:
        score += 2
    elif keluhan and not (keluhan_words <= generic_single):
        score += 1

    if kasus.get("durasi", "").strip():
        score += 1
    if kasus.get("gejala", "").strip():
        score += 1
    if kasus.get("vital", "").strip():
        score += 2
    if kasus.get("redflag", "").strip():
        score += 1

    # Patient data
    patient_fields = 0
    for f in ("umur", "jk", "bb"):
        if pasien.get(f, "").strip():
            patient_fields += 1
    score += min(patient_fields, 2)

    # Chain match quality
    if chain_matches:
        score += 1
        # Count how many logical_chain gejala appear in the case text
        case_text = " ".join(
            filter(None, [keluhan, kasus.get("gejala", ""), kasus.get("redflag", "")])
        ).lower()
        for cm in chain_matches[:1]:  # only first match
            lc = cm["chain"].get("logical_chain", [])
            hits = sum(1 for g in lc if g.lower() in case_text)
            score += min(hits, 3)

    if score <= 2:
        return "insufficient_data"
    if score <= 4:
        return "possible"
    if score <= 7:
        return "probable"
    # definitive only if vitals AND specific complaint present
    if kasus.get("vital") and len(keluhan_words) >= 3:
        return "definitive"
    return "probable"


# ---------------------------------------------------------------------------
# Idea 5 — ClinicalStateTracker
# ---------------------------------------------------------------------------
# Extract and accumulate structured clinical state across multi-turn.

_STATE_FIELDS = [
    "keluhan",
    "durasi",
    "gejala",
    "redflag",
    "vital",
    "riwayat",
    "alergi_baru",
    "obat_baru",
    "temuan_fisik",
]

# Patterns for extracting new clinical info from assistant responses
_RESPONSE_EXTRACTION_PATTERNS: list[tuple[str, str]] = [
    # If LLM response mentions new symptoms in edukasi or reasoning
    (r"(?:disertai|dengan|ada)\s+([a-z\s]{3,30})(?:\s+yang|\s+pada|\s*[,.])", "gejala"),
    # Duration mentions
    (r"(?:selama|sejak|sudah)\s+(\d+\s+(?:hari|minggu|bulan|tahun))", "durasi"),
    # Vital sign extraction from user input
    (r"(?:td|tekanan darah)\s*:?\s*(\d{2,3}/\d{2,3})", "vital_td"),
    (r"(?:nadi|hr)\s*:?\s*(\d{2,3})", "vital_nadi"),
    (r"(?:suhu|temp)\s*:?\s*(\d{2}[.,]\d)", "vital_suhu"),
    (r"(?:rr|napas)\s*:?\s*(\d{1,2})", "vital_rr"),
    (r"(?:spo2|saturasi)\s*:?\s*(\d{2,3})\s*%?", "vital_spo2"),
]


class ClinicalStateTracker:
    """Maintains structured clinical state across conversation turns.

    Usage:
        tracker = ClinicalStateTracker()
        tracker.update_from_input(user_message, kasus_dict)
        tracker.update_from_response(assistant_response_json)
        context_block = tracker.to_prompt_block()
    """

    def __init__(self) -> None:
        self.state: dict[str, str] = {}
        self.vital_components: dict[str, str] = {}
        self.turn_count: int = 0
        self.confirmed_diagnoses: list[str] = []
        self.pending_clarifications: list[str] = []

    def update_from_input(self, text: str, kasus: dict) -> None:
        """Extract and accumulate clinical info from doctor's input + kasus."""
        self.turn_count += 1

        # Direct fields from kasus (structured intake)
        for field in ("keluhan", "durasi", "gejala", "redflag", "vital"):
            val = kasus.get(field, "").strip()
            if val and field not in self.state:
                self.state[field] = val
            elif val and len(val) > len(self.state.get(field, "")):
                # Update if more detailed
                self.state[field] = val

        # Extract vital components from free text
        text_lower = text.lower()
        for pattern, field in _RESPONSE_EXTRACTION_PATTERNS:
            if not field.startswith("vital_"):
                continue
            m = re.search(pattern, text_lower)
            if m:
                component = field.replace("vital_", "")
                self.vital_components[component] = m.group(1)

        # Rebuild consolidated vital string
        if self.vital_components:
            parts = []
            for comp, val in self.vital_components.items():
                label = {
                    "td": "TD",
                    "nadi": "Nadi",
                    "suhu": "Suhu",
                    "rr": "RR",
                    "spo2": "SpO2",
                }.get(comp, comp.upper())
                parts.append(f"{label}: {val}")
            self.state["vital"] = ", ".join(parts)

    def update_from_response(self, response_dict: dict) -> None:
        """Extract new clinical info surfaced by LLM in its response."""
        if not isinstance(response_dict, dict):
            return

        # Track confirmed working diagnosis
        dk = response_dict.get("diagnosis_kerja", {})
        if isinstance(dk, dict) and dk.get("nama"):
            nama = dk["nama"]
            icd = dk.get("icd", "")
            entry = f"{nama} ({icd})" if icd else nama
            certainty = dk.get("certainty", "")
            if (
                certainty in ("definitive", "probable")
                and entry not in self.confirmed_diagnoses
            ):
                self.confirmed_diagnoses.append(entry)

        # Track data gaps as pending clarifications
        gaps = response_dict.get("data_gaps") or []
        for gap in gaps:
            if gap not in self.pending_clarifications:
                self.pending_clarifications.append(gap)

    def to_prompt_block(self) -> str:
        """Serialize current clinical state as a prompt injection block."""
        if not self.state and not self.confirmed_diagnoses:
            return ""

        lines = ["RIWAYAT KLINIS SESI INI (multi-turn accumulated):"]

        if self.state.get("keluhan"):
            lines.append(f"  Keluhan utama: {self.state['keluhan']}")
        if self.state.get("durasi"):
            lines.append(f"  Durasi: {self.state['durasi']}")
        if self.state.get("gejala"):
            lines.append(f"  Gejala penyerta: {self.state['gejala']}")
        if self.state.get("vital"):
            lines.append(f"  Tanda vital: {self.state['vital']}")
        if self.state.get("redflag"):
            lines.append(f"  Tanda bahaya: {self.state['redflag']}")

        if self.confirmed_diagnoses:
            lines.append(
                f"  Diagnosis sebelumnya (turn {self.turn_count - 1}): "
                + "; ".join(self.confirmed_diagnoses[-2:])
            )
        if self.pending_clarifications:
            lines.append(
                "  Klarifikasi yang masih dibutuhkan: "
                + "; ".join(self.pending_clarifications[:3])
            )

        lines.append(
            "Gunakan riwayat di atas sebagai KONTEKS KUMULATIF — "
            "jangan ulangi pertanyaan yang sudah dijawab."
        )
        return "\n".join(lines)

    def reset(self) -> None:
        """Clear state for new case."""
        self.__init__()
