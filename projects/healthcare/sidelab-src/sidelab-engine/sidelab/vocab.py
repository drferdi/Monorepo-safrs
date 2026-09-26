# Architected and built by codieverse+.
# Clinical query vocabulary and scoring utilities — all pure (no DB/console deps)
import functools
import re

# ---------------------------------------------------------------------------
# Stop words — tidak digunakan sebagai fitur kliniks
# ---------------------------------------------------------------------------
_STOP = {
    "yang",
    "dan",
    "atau",
    "pada",
    "dari",
    "dengan",
    "tidak",
    "ada",
    "untuk",
    "sudah",
    "sejak",
    "selama",
    "dalam",
    "lebih",
    "sangat",
    # konteks konsultasi & demografis — bukan gejala klinis
    "pasien",
    "pria",
    "wanita",
    "laki",
    "usia",
    "umur",
    "tahun",
    "hari",
    "minggu",
    "bulan",
    "jam",
    "menit",
    "datang",
    "keluhan",
    "mengeluh",
    "mengalami",
    "dirasakan",
    "beberapa",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "kali",
    "baru",
    "lama",
    "mulai",
    # kata tindakan/kuantitas umum — tidak diskriminatif sebagai gejala
    "sering",
    "buang",
    "saat",
    "besar",
    "kecil",
    "bisa",
    "juga",
    "masih",
    "pagi",
    "malam",
    "terasa",
    "terjadi",
    "bila",
}

# Term generik yang tidak boleh dapat bonus nama penyakit
_GENERIC_TERMS = {
    "akut",
    "kronik",
    "berat",
    "ringan",
    "episodik",
    "primer",
    "sekunder",
    "parah",
    "sedang",
    "tanpa",
    "dengan",
    "tidak",
}

# Token gejala yang terlalu umum dan tidak boleh mendominasi ranking sendirian.
_WEAK_QUERY_TERMS = {
    "nyeri",
    "sakit",
    "pegal",
    "linu",
    "ngilu",
    "tekan",
    "panas",
    "demam",
    "pusing",
    "lemas",
    "mual",
    "muntah",
}

_ANATOMIC_TERMS = {
    "kepala",
    "mata",
    "telinga",
    "hidung",
    "tenggorok",
    "leher",
    "bahu",
    "dada",
    "punggung",
    "perut",
    "ulu",
    "epigastrium",
    "pinggang",
    "ginjal",
    "kemih",
    "kencing",
    "vagina",
    "rahim",
    "payudara",
    "paha",
    "lutut",
    "betis",
    "kaki",
    "tangan",
    "jari",
    "pergelangan",
    "sendi",
    "persendian",
    "otot",
    "siku",
    "tumit",
    "tumor",
    "kulit",
    "paru",
    "rlq",
    "ruq",
    "llq",
    "luq",
    "presinkop",
}

_QUERY_NORMALIZATION_MAP = {
    "persendian": "sendi",
    "per-sendi-an": "sendi",
    "nyeri persendian": "nyeri sendi",
    "sakit persendian": "nyeri sendi",
    "sendi-sendi": "sendi",
    "perut kanan bawah": "rlq",
    "kuadran kanan bawah": "rlq",
    "right lower quadrant": "rlq",
    "perut kanan atas": "ruq",
    "kuadran kanan atas": "ruq",
    "right upper quadrant": "ruq",
    "perut kiri bawah": "llq",
    "kuadran kiri bawah": "llq",
    "left lower quadrant": "llq",
    "perut kiri atas": "luq",
    "kuadran kiri atas": "luq",
    "left upper quadrant": "luq",
    "nyeri ulu hati": "nyeri epigastrium",
    "sakit ulu hati": "nyeri epigastrium",
    "ulu hati": "epigastrium",
    "kencing sakit": "disuria",
    "mau pingsan": "presinkop",
    "berkunang kunang": "presinkop",
    "berkunang-kunang": "presinkop",
    "serasa melayang": "presinkop",
    "pusing berputar": "vertigo",
    "kepala berputar": "vertigo",
}

_SHORT_QUERY_CANDIDATE_HINTS: dict[str, list[str]] = {
    "sendi": ["artritis", "osteoartritis", "gout", "mialgia"],
    "otot": ["mialgia", "fibromialgia", "myositis"],
    "kepala": ["headache", "migren", "vertigo", "stroke"],
    "epigastrium": ["dispepsia", "gastritis", "refluks", "ulkus"],
    "perut": ["dispepsia", "gastritis", "gastroenteritis", "appendisitis"],
    "rlq": ["appendisitis"],
    "ruq": ["hepatitis", "gastritis"],
    "llq": ["kolitis", "gastroenteritis"],
    "luq": ["gastritis", "dispepsia"],
    "dada": ["angina", "infark", "refluks", "mialgia"],
    "batuk": ["bronkitis", "pneumonia", "tuberkulosis", "asma"],
    "sesak": ["asma", "gagal jantung", "pneumonia", "ppok"],
    "pusing": ["vertigo", "sinkop", "hipoglikemia", "headache"],
    "vertigo": ["vertigo"],
    "presinkop": ["sinkop", "hipoglikemia", "anemia"],
    "mata": ["konjungtivitis", "mata kering", "hordeolum"],
    "kemih": ["sistitis", "pielonefritis", "batu"],
    "disuria": ["sistitis", "uretritis", "pielonefritis"],
}

_SHORT_QUERY_FOLLOWUPS: dict[str, list[str]] = {
    "sendi": [
        "sendi mana yang terkena",
        "satu sendi atau banyak sendi",
        "ada bengkak, kemerahan, atau rasa panas",
        "lebih nyeri saat gerak atau saat istirahat",
    ],
    "epigastrium": [
        "nyeri terkait makan atau saat lapar",
        "ada mual, muntah, kembung, atau rasa asam di mulut",
        "ada BAB hitam atau muntah darah",
        "nyeri menjalar ke dada atau punggung",
    ],
    "perut": [
        "lokasi nyeri perut paling dominan",
        "ada muntah, diare, konstipasi, atau demam",
        "nyeri menetap atau hilang timbul",
        "ada defans, distensi, atau BAB hitam",
    ],
    "rlq": [
        "nyeri mulai dari ulu hati atau sekitar pusar lalu pindah ke kanan bawah",
        "ada mual, muntah, atau demam",
        "nyeri bertambah saat berjalan, batuk, atau ditekan lepas",
        "ada defans atau perut tegang",
    ],
    "ruq": [
        "ada demam, ikterus, atau mual muntah",
        "nyeri setelah makan berlemak atau tidak",
        "nyeri menjalar ke bahu kanan atau punggung",
        "ada urin gelap atau feses pucat",
    ],
    "kepala": [
        "lokasi nyeri kepala dan sifat nyeri",
        "ada mual, fotofobia, defisit neurologis, atau demam",
        "mendadak sekali atau bertahap",
        "ada riwayat trauma atau hipertensi",
    ],
    "dada": [
        "nyeri seperti tertindih, terbakar, atau nyeri tekan lokal",
        "menjalar ke lengan kiri, rahang, atau punggung atau tidak",
        "dipicu aktivitas, napas, gerak, atau setelah makan",
        "ada sesak, keringat dingin, atau regurgitasi asam",
    ],
    "sesak": [
        "sejak kapan sesak muncul",
        "ada batuk, mengi, atau nyeri dada",
        "sesak saat aktivitas atau istirahat",
        "ada saturasi rendah atau napas cepat",
    ],
    "pusing": [
        "pusing berputar atau melayang",
        "ada mual, tinnitus, atau gangguan pendengaran",
        "ada lemas, pucat, atau sinkop",
        "ada defisit neurologis fokal",
    ],
    "vertigo": [
        "pusing berputar dipicu perubahan posisi atau tidak",
        "ada mual muntah, tinnitus, atau gangguan pendengaran",
        "ada nistagmus atau gangguan berjalan",
        "ada kelemahan anggota gerak atau bicara pelo",
    ],
    "presinkop": [
        "ada rasa melayang, gelap, atau mau pingsan",
        "dipicu berdiri lama, dehidrasi, atau terlambat makan",
        "ada berdebar, keringat dingin, atau pucat",
        "sempat sinkop atau hampir jatuh atau tidak",
    ],
}

_PHRASE_CANDIDATE_HINTS: dict[str, list[str]] = {
    "rlq": ["appendisitis"],
    "ruq": ["hepatitis", "gastritis"],
    "llq": ["kolitis", "gastroenteritis"],
    "luq": ["gastritis", "dispepsia"],
    "tertindih": ["angina", "infark"],
    "menjalar lengan": ["angina", "infark"],
    "lengan kiri": ["angina", "infark"],
    "keringat dingin": ["angina", "infark"],
    "regurgitasi": ["refluks", "dispepsia"],
    "asam": ["refluks", "dispepsia"],
    "terbakar": ["refluks"],
    "nyeri tekan": ["mialgia"],
    "saat ditekan": ["mialgia"],
    "saat gerak": ["mialgia"],
    "vertigo": ["vertigo"],
    "presinkop": ["sinkop", "hipoglikemia"],
    "nyeri kepala": ["headache", "migren"],
}

_PHRASE_SYNDROME_TAGS: dict[str, str] = {
    "rlq": "abdominal-rlq",
    "ruq": "abdominal-ruq",
    "llq": "abdominal-llq",
    "luq": "abdominal-luq",
    "epigastrium": "abdominal-epigastric",
    "tertindih": "chest-cardiac-like",
    "menjalar lengan": "chest-cardiac-like",
    "lengan kiri": "chest-cardiac-like",
    "keringat dingin": "chest-cardiac-like",
    "regurgitasi": "chest-gerd-like",
    "asam": "chest-gerd-like",
    "terbakar": "chest-gerd-like",
    "nyeri tekan": "chest-wall-like",
    "saat ditekan": "chest-wall-like",
    "saat gerak": "chest-wall-like",
    "vertigo": "dizziness-vertigo-like",
    "presinkop": "dizziness-presyncope-like",
    "nyeri kepala": "dizziness-headache-like",
}

_SYNDROME_SCORE_RULES: dict[str, dict[str, list[str]]] = {
    "abdominal-rlq": {
        "boost": ["appendisitis"],
        "penalize": ["gastritis", "dispepsia", "refluks"],
    },
    "abdominal-ruq": {
        "boost": ["hepatitis", "gastritis"],
        "penalize": ["appendisitis"],
    },
    "abdominal-epigastric": {
        "boost": ["dispepsia", "gastritis", "refluks"],
        "penalize": ["appendisitis", "ileus", "hernia"],
    },
    "chest-cardiac-like": {
        "boost": ["angina", "infark", "iskemik"],
        "penalize": ["refluks", "dispepsia", "mialgia"],
    },
    "chest-gerd-like": {
        "boost": ["refluks", "dispepsia", "gastritis"],
        "penalize": ["angina", "infark", "iskemik"],
    },
    "chest-wall-like": {
        "boost": ["mialgia"],
        "penalize": ["angina", "infark", "iskemik"],
    },
    "dizziness-vertigo-like": {
        "boost": ["vertigo"],
        "penalize": ["headache", "migren", "sinkop"],
    },
    "dizziness-presyncope-like": {
        "boost": ["sinkop", "hipoglik", "anemia"],
        "penalize": ["vertigo", "headache", "migren"],
    },
    "dizziness-headache-like": {
        "boost": ["headache", "migren"],
        "penalize": ["vertigo", "sinkop"],
    },
}

_SEVERE_DISEASE_NAME_TERMS = {
    "perdarahan",
    "hematemesis",
    "melena",
    "syok",
    "ruptur",
    "infark",
    "stroke",
    "meningitis",
    "anafilaksis",
    "ektopik",
    "ensefalitis",
    "karsinoma",
    "ileus",
    "obstruktif",
    "strangulata",
    "inkarserata",
}

_SEVERE_QUERY_CUES = {
    "darah",
    "perdarahan",
    "melena",
    "hematemesis",
    "pingsan",
    "sinkop",
    "sesak berat",
    "tidak sadar",
    "kelumpuhan",
    "afasia",
    "hemiplegia",
    "kejang",
    "syok",
    "kaku kuduk",
    "thunderclap",
}

# Context klinis → body system hint (query mengandung kata ini = konteks sistem tertentu)
_BODY_CONTEXT: dict[str, str] = {
    # OB/GYN
    "hamil": "SISTEM REPRODUKSI",
    "kehamilan": "SISTEM REPRODUKSI",
    "partus": "SISTEM REPRODUKSI",
    "persalinan": "SISTEM REPRODUKSI",
    "nifas": "SISTEM REPRODUKSI",
    "postpartum": "SISTEM REPRODUKSI",
    "gestasi": "SISTEM REPRODUKSI",
    "ektopik": "SISTEM REPRODUKSI",
    "menstruasi": "SISTEM REPRODUKSI",
    "haid": "SISTEM REPRODUKSI",
    "mens": "SISTEM REPRODUKSI",
    "keguguran": "SISTEM REPRODUKSI",
    "melahirkan": "SISTEM REPRODUKSI",
    "bersalin": "SISTEM REPRODUKSI",
    "lahir": "SISTEM REPRODUKSI",
    "bayi": "SISTEM REPRODUKSI",
    "janin": "SISTEM REPRODUKSI",
    "plasenta": "SISTEM REPRODUKSI",
    "trimester": "SISTEM REPRODUKSI",
    "gravida": "SISTEM REPRODUKSI",
    # Respirasi
    "batuk": "SISTEM RESPIRASI",
    "sesak": "SISTEM RESPIRASI",
    "napas": "SISTEM RESPIRASI",
    "paru": "SISTEM RESPIRASI",
    # GI
    "bab": "SALURAN PENCERNAAN",
    "feses": "SALURAN PENCERNAAN",
    "perut": "SISTEM DIGESTIF",
    "epigastrium": "SISTEM DIGESTIF",
    "rlq": "SISTEM DIGESTIF",
    "ruq": "SISTEM DIGESTIF",
    "llq": "SISTEM DIGESTIF",
    "luq": "SISTEM DIGESTIF",
    # Neurologi / kepala
    "kepala": "SISTEM SARAF",
    "migren": "SISTEM SARAF",
    "vertigo": "SISTEM SARAF",
    "kejang": "SISTEM SARAF",
    "presinkop": "SISTEM KARDIOVASKULAR",
    # Muskuloskeletal
    "sendi": "SISTEM MUSKULOSKELETAL",
    "persendian": "SISTEM MUSKULOSKELETAL",
    "otot": "SISTEM MUSKULOSKELETAL",
    "lutut": "SISTEM MUSKULOSKELETAL",
    "bahu": "SISTEM MUSKULOSKELETAL",
    "siku": "SISTEM MUSKULOSKELETAL",
    "pergelangan": "SISTEM MUSKULOSKELETAL",
    "jari": "SISTEM MUSKULOSKELETAL",
    "asam": "SISTEM MUSKULOSKELETAL",
    "gout": "SISTEM MUSKULOSKELETAL",
    "artritis": "SISTEM MUSKULOSKELETAL",
    "arthritis": "SISTEM MUSKULOSKELETAL",
    "pegal": "SISTEM MUSKULOSKELETAL",
    "ngilu": "SISTEM MUSKULOSKELETAL",
    # Indera — NEGATIF: kalau query tidak ada kata indera, kurangi skor penyakit indera
}

# Term patognomonik — langsung boost penyakit spesifik (bukan dari gejala_klinis)
# Hint adalah substring dari nama penyakit — harus cukup spesifik (minimal 6 karakter)
_PATHO_TERMS: dict[str, list[str]] = {
    "ikterus": ["hepatitis", "leptospirosis", "sirosis", "kolestasis", "malaria"],
    "jaundice": ["hepatitis", "leptospirosis"],
    "tenesmus": ["disentri", "kolitis", "amoebiasis"],
    "mengi": ["asma", "bronkitis"],
    "wheezing": ["asma"],
    "trismus": ["tetanus"],
    "disuria": ["saluran kemih", "uretritis", "sistitis", "pielonefritis"],
    "hematuria": ["saluran kemih", "batu saluran", "glomerulo", "nefritis"],
    "hemoptisis": ["tuberkulosis", "tb paru", "kanker paru"],
    "ptosis": ["miastenia"],
    "afasia": ["stroke"],
    "hemiplegia": ["stroke"],
}

# Kombinasi dua kata yang bersama-sama bersifat patognomonik
_PATHO_COMBOS: list[tuple[set[str], list[str]]] = [
    ({"batuk", "darah"}, ["tuberkulosis", "tb paru"]),
    ({"darah", "hemoptisis"}, ["tuberkulosis"]),
    ({"nyeri", "berkemih"}, ["saluran kemih", "sistitis", "pielonefritis"]),
    ({"kencing", "nyeri"}, ["saluran kemih", "sistitis"]),
    ({"tenggorok", "putih"}, ["tonsilitis", "faringitis"]),
    ({"tenggorok", "plak"}, ["tonsilitis"]),
    ({"tenggorok", "demam"}, ["tonsilitis", "faringitis", "difteri"]),
    ({"eksudat", "tonsil"}, ["tonsilitis"]),
    ({"berdenyut", "fotofobia"}, ["migren"]),
    ({"berdenyut", "sisi"}, ["migren"]),
    ({"fotofobia", "mual", "kepala"}, ["migren"]),
]

# ---------------------------------------------------------------------------
# Text normalization and query tokenization
# ---------------------------------------------------------------------------
_SPLIT = re.compile(r"[\s,;./()>=<\n\-]+")

# Sorted longest-first so multi-word phrases match before their component words.
# Without this, "persendian"→"sendi" would fire before "sakit persendian"→"nyeri sendi",
# producing "sakit sendi" instead of "nyeri sendi".
_QUERY_NORMALIZATION_SORTED = sorted(
    _QUERY_NORMALIZATION_MAP.items(), key=lambda kv: len(kv[0]), reverse=True
)


@functools.lru_cache(maxsize=512)
def _normalize_text(text: str) -> str:
    normalized = (
        text.lower()
        .replace("nafas", "napas")
        .replace("tenggorokan", "tenggorok")
        .replace("mulutnya", "mulut")
        .replace("badannya", "badan")
    )
    for raw, clean in _QUERY_NORMALIZATION_SORTED:
        normalized = normalized.replace(raw, clean)
    return normalized


def _query_words(query: str) -> set[str]:
    return {
        w for w in _SPLIT.split(_normalize_text(query)) if len(w) > 2 and w not in _STOP
    }


_text_to_words = _query_words


# ---------------------------------------------------------------------------
# Query profile and clinical summary
# ---------------------------------------------------------------------------

def _extract_query_profile(query: str) -> dict:
    normalized_query = _normalize_text(query)
    words = {w for w in _SPLIT.split(normalized_query) if len(w) > 2 and w not in _STOP}
    body_hints = {_BODY_CONTEXT[w] for w in words if w in _BODY_CONTEXT}
    weak_terms = {w for w in words if w in _WEAK_QUERY_TERMS}
    anchor_terms = {w for w in words if w in _ANATOMIC_TERMS or w in _BODY_CONTEXT}
    specific_terms = words - weak_terms
    short_query = len(words) <= 3 or len(specific_terms) <= 2
    candidate_hints: set[str] = set()
    preferred_candidate_hints: set[str] = set()
    followups: list[str] = []
    syndrome_tags: set[str] = set()
    for term in anchor_terms | specific_terms:
        for hint in _SHORT_QUERY_CANDIDATE_HINTS.get(term, []):
            candidate_hints.add(hint)
        for followup in _SHORT_QUERY_FOLLOWUPS.get(term, []):
            if followup not in followups:
                followups.append(followup)
    for phrase, hints in _PHRASE_CANDIDATE_HINTS.items():
        if phrase in normalized_query:
            candidate_hints.update(hints)
    for phrase, tag in _PHRASE_SYNDROME_TAGS.items():
        if phrase in normalized_query:
            syndrome_tags.add(tag)
    if (
        "dada" in anchor_terms
        and "chest-cardiac-like" not in syndrome_tags
        and "chest-gerd-like" not in syndrome_tags
        and "chest-wall-like" not in syndrome_tags
    ):
        syndrome_tags.add("chest-undifferentiated")
    if "pusing" in words and not any(
        tag.startswith("dizziness-") for tag in syndrome_tags
    ):
        syndrome_tags.add("dizziness-undifferentiated")
    for tag in syndrome_tags:
        rules = _SYNDROME_SCORE_RULES.get(tag, {})
        preferred_candidate_hints.update(rules.get("boost", []))
    severe_cues = {cue for cue in _SEVERE_QUERY_CUES if cue in normalized_query}
    return {
        "normalized_query": normalized_query,
        "words": words,
        "body_hints": body_hints,
        "weak_terms": weak_terms,
        "anchor_terms": anchor_terms,
        "specific_terms": specific_terms,
        "short_query": short_query,
        "candidate_hints": candidate_hints,
        "preferred_candidate_hints": preferred_candidate_hints,
        "followups": followups[:4],
        "syndrome_tags": syndrome_tags,
        "severe_cues": severe_cues,
        "generic_only": bool(words)
        and not anchor_terms
        and not (specific_terms - weak_terms),
    }


def _build_clinical_summary(query: str, profile: dict | None = None) -> str:
    if profile is None:
        profile = _extract_query_profile(query)
    lines = ["=== RINGKASAN KLINIS TERSTRUKTUR ==="]
    lines.append(f"Keluhan ternormalisasi: {profile['normalized_query']}")
    if profile["body_hints"]:
        lines.append(
            "Sistem tubuh terdeteksi: " + ", ".join(sorted(profile["body_hints"]))
        )
    if profile["anchor_terms"]:
        lines.append("Anchor klinis: " + ", ".join(sorted(profile["anchor_terms"])))
    if profile["specific_terms"]:
        lines.append(
            "Token klinis spesifik: " + ", ".join(sorted(profile["specific_terms"]))
        )
    if profile["candidate_hints"]:
        lines.append(
            "Klaster kandidat awal: " + ", ".join(sorted(profile["candidate_hints"]))
        )
    if profile["preferred_candidate_hints"]:
        lines.append(
            "Prioritas kandidat: "
            + ", ".join(sorted(profile["preferred_candidate_hints"]))
        )
    if profile["syndrome_tags"]:
        lines.append("Pola klinis awal: " + ", ".join(sorted(profile["syndrome_tags"])))
    if profile["generic_only"]:
        lines.append(
            "Status data: keluhan masih terlalu umum, prioritaskan pertanyaan klarifikasi sebelum mengunci diagnosis."
        )
    elif profile["short_query"]:
        lines.append(
            "Status data: informasi masih singkat, diagnosis kerja harus konservatif dan boleh berupa dugaan awal."
        )
    if profile["followups"]:
        lines.append("Klarifikasi prioritas: " + " | ".join(profile["followups"]))
    return "\n".join(lines)


def _disease_matches_candidate_hints(disease: dict, candidate_hints: set[str]) -> bool:
    if not candidate_hints:
        return False
    name_lower = disease.get("nama", "").lower().replace("nafas", "napas")
    return any(hint in name_lower for hint in candidate_hints)


def _prioritize_scored_candidates(
    scored: list[tuple[float, dict]], profile: dict
) -> list[tuple[float, dict]]:
    if not scored:
        return scored
    preferred_hints = profile.get("preferred_candidate_hints", set())
    general_hints = profile.get("candidate_hints", set())
    if preferred_hints:
        preferred = [
            (s, d)
            for s, d in scored
            if _disease_matches_candidate_hints(d, preferred_hints)
        ]
        if preferred:
            remainder = [
                (s, d)
                for s, d in scored
                if not _disease_matches_candidate_hints(d, preferred_hints)
            ]
            return preferred + remainder
    if profile.get("short_query") and general_hints:
        preferred = [
            (s, d)
            for s, d in scored
            if _disease_matches_candidate_hints(d, general_hints)
        ]
        if len(preferred) >= 2:
            remainder = [
                (s, d)
                for s, d in scored
                if not _disease_matches_candidate_hints(d, general_hints)
            ]
            return preferred + remainder
    return scored
