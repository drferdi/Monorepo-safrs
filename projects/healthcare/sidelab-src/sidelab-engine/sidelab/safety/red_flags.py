# Architected and built by codieverse+.
import re

# ---------------------------------------------------------------------------
# Red flag detector
# ---------------------------------------------------------------------------
RED_FLAGS = [
    {
        "trigger": ["kaku leher", "neck stiff", "meningismus", "kaku kuduk"],
        "context": [
            "demam",
            "panas",
            "nyeri kepala",
            "sakit kepala",
            "muntah",
            "fotofobia",
        ],
        "alert": "[!] RED FLAG: Kaku leher + demam/nyeri kepala — CURIGA MENINGITIS BAKTERIAL (emergensi). Periksa tanda Kernig & Brudzinski. Pertimbangkan rujukan segera.",
        "disease": "Meningitis Bakterial (G00)",
    },
    {
        "trigger": [
            "nyeri kepala mendadak",
            "nyeri kepala tiba-tiba",
            "thunderclap",
            "nyeri kepala terburuk",
            "kepala mau pecah",
        ],
        "context": [],
        "alert": "[!] RED FLAG: Nyeri kepala onset mendadak/thunderclap — singkirkan SUBARACHNOID HEMORRHAGE (SAH). Rujukan emergensi ke RS.",
        "disease": "Subarachnoid Hemorrhage (I60)",
    },
    {
        "trigger": [
            "lumpuh",
            "paralisis",
            "hemiplegia",
            "tidak bisa bicara",
            "pelo",
            "afasia",
            "wajah perot",
            "mulut mencong",
            "lemah separuh tubuh",
        ],
        "context": [],
        "alert": "[!] RED FLAG: Defisit neurologis fokal — CURIGA STROKE. Protokol FAST. Rujukan emergensi.",
        "disease": "Stroke (I64)",
    },
    {
        "trigger": ["nyeri dada"],
        "context": [
            "keringat dingin",
            "menjalar ke lengan",
            "menjalar ke rahang",
            "sesak",
            "mual",
            "pingsan",
        ],
        "alert": "[!] RED FLAG: Nyeri dada + gejala penyerta — singkirkan ACS/STEMI. EKG segera.",
        "disease": "Acute Coronary Syndrome (I21)",
    },
    {
        "trigger": [
            "sesak napas berat",
            "sesak nafas berat",
            "tidak bisa bicara",
            "sianosis",
            "saturasi turun",
            "spo2 turun",
        ],
        "context": [],
        "alert": "[!] RED FLAG: Distress respirasi — stabilisasi jalan napas segera. Pertimbangkan rujukan.",
        "disease": "Distress Respirasi",
    },
    {
        "trigger": ["kejang", "kejang-kejang"],
        "context": ["demam", "panas", "tidak sadar", "lumpuh setelah kejang"],
        "alert": "[!] RED FLAG: Kejang + demam/tidak sadar — pertimbangkan Ensefalitis atau status epileptikus.",
        "disease": "Ensefalitis (G04)",
    },
    # === TRAUMA ===
    {
        "trigger": [
            "kecelakaan",
            "tabrakan",
            "jatuh dari",
            "terjatuh",
            "terbentur",
            "kepala terbentur",
            "kepala terkena",
            "trauma kepala",
            "head injury",
            "kepala membentur",
            "kena aspal",
            "terlempar",
        ],
        "context": [],
        "alert": "[!] RED FLAG: Trauma kepala — protokol ATLS. Cek GCS, pupil, defisit fokal. Curigai cedera otak (TBI). Pertimbangkan CT kepala dan rujukan emergensi.",
        "disease": "Cedera Otak Traumatik / Trauma Kapitis (S06)",
    },
    {
        "trigger": [
            # Otorrhea (darah/cairan dari telinga)
            "perdarahan telinga",
            "perdarahan di telinga",
            "darah dari telinga",
            "darah di telinga",
            "darah keluar dari telinga",
            "berdarah dari telinga",
            "telinga berdarah",
            "otorrhea",
            "otorea",
            # Rhinorrhea pasca trauma
            "rinorrhea cair",
            "cairan jernih dari hidung",
            # Frasa kombinasi telinga+hidung
            "telinga dan hidung",
            "hidung dan telinga",
            "perdarahan hidung dan telinga",
            "perdarahan di telinga dan hidung",
            "darah di hidung dan telinga",
            "darah dari telinga dan hidung",
            # Tanda klinis fraktur basis kranii
            "hemotimpanum",
            "battle sign",
            "raccoon eye",
            "raccoon eyes",
            "panda eye",
            "memar belakang telinga",
        ],
        "context": [],
        "alert": "[!] RED FLAG: Otorrhea/rhinorrhea pasca trauma — TANDA FRAKTUR BASIS KRANII. Emergensi mutlak. JANGAN tampon, JANGAN suction nasal. Posisi kepala 30°, NPO, profilaksis antibiotik, rujuk RS dengan CT scan dan bedah saraf.",
        "disease": "Fraktur Basis Kranii (S02.1)",
    },
    {
        "trigger": [
            "tidak sadar",
            "tidak sadarkan diri",
            "pingsan",
            "penurunan kesadaran",
            "tidak respon",
            "koma",
            "gcs turun",
        ],
        "context": [
            "kecelakaan",
            "tabrakan",
            "jatuh",
            "kepala",
            "trauma",
            "terbentur",
            "perdarahan",
            "muntah proyektil",
            "kejang",
        ],
        "alert": "[!] RED FLAG: Penurunan kesadaran + trauma/perdarahan — emergensi neurologis. Cek GCS, AVPU, jalan napas. Pertimbangkan TBI, stroke hemoragik, herniasi.",
        "disease": "Penurunan Kesadaran et causa suspek lesi intrakranial",
    },
    {
        "trigger": [
            "luka tembak",
            "luka tusuk",
            "perdarahan masif",
            "syok hipovolemik",
            "fraktur terbuka",
            "amputasi",
        ],
        "context": [],
        "alert": "[!] RED FLAG: Trauma berat — primary survey ABCDE, kontrol perdarahan, akses IV besar (2 jalur), resusitasi cairan. Rujuk RS dengan kemampuan trauma surgery.",
        "disease": "Trauma Mayor (T07)",
    },
]


def _detect_red_flags(query: str) -> list[str]:
    q = query.lower()
    alerts = []
    for rf in RED_FLAGS:
        trigger_hit = any(t in q for t in rf["trigger"])
        if not trigger_hit:
            continue
        if rf["context"]:
            context_hit = any(c in q for c in rf["context"])
            if not context_hit:
                continue
        alerts.append(rf["alert"])
    return alerts


_EMERGENCY_DIAGNOSIS_PATTERNS = [
    "stroke",
    "i64",
    "i63",
    "i62",
    "acute coronary",
    "acs",
    "stemi",
    "nstemi",
    "i21",
    "i22",
    "i20",
    "meningitis",
    "g00",
    "g01",
    "g02",
    "sepsis",
    "a40",
    "a41",
    "cardiac arrest",
    "henti jantung",
    "i46",
    "gagal napas",
    "respiratory failure",
    "j96",
    "anafilaksis",
    "anaphylaxis",
    "t78",
    "perdarahan masif",
    "o72",
    "o67",
    "apendisitis akut",
    "k35",
    "status epileptikus",
    "g41",
]

_EMERGENCY_HOME_CARE_PATTERNS = [
    "pulang ke rumah",
    "istirahat di rumah",
    "tirah baring di rumah",
    "rawat jalan di rumah",
    "perawatan di rumah",
]

_EMERGENCY_REFERRAL_PATTERNS = [
    "rujuk emergensi",
    "rujuk segera",
    "segera rujuk",
    "emergensi",
    "emergency",
    " igd",
    "onset <",
]


def _check_emergency_response_consistency(response: str) -> dict:
    """Check that emergency diagnoses are matched by emergency management and referral.

    VAL-CROSS-005: an emergency diagnosis without emergency referral or with
    home-care as primary plan is a clinical inconsistency.

    Returns:
        has_inconsistency: bool
        issues: list[str] — first item always contains 'emergency' when inconsistency present
        message: str — actionable summary containing 'emergency' and 'diagnosis'
    """
    # Extract DIAGNOSIS KERJA section
    diag_pat = re.compile(
        r"DIAGNOSIS KERJA:\s*\n(.*?)(?=\n[A-Z][A-Z\s/]+:\s*\n|$)",
        re.DOTALL | re.IGNORECASE,
    )
    tata_pat = re.compile(
        r"TATALAKSANA:\s*\n(.*?)(?=\n[A-Z][A-Z\s/]+:\s*\n|$)", re.DOTALL | re.IGNORECASE
    )
    rujuk_pat = re.compile(
        r"KRITERIA RUJUK:\s*\n(.*?)(?=\n[A-Z][A-Z\s/]+:\s*\n|$)",
        re.DOTALL | re.IGNORECASE,
    )

    diag_m = diag_pat.search(response)
    tata_m = tata_pat.search(response)
    rujuk_m = rujuk_pat.search(response)

    diag_text = diag_m.group(1).lower() if diag_m else ""
    tata_text = tata_m.group(1).lower() if tata_m else ""
    rujuk_text = rujuk_m.group(1).lower() if rujuk_m else ""

    is_emergency_diag = any(kw in diag_text for kw in _EMERGENCY_DIAGNOSIS_PATTERNS)
    if not is_emergency_diag:
        return {"has_inconsistency": False, "issues": [], "message": ""}

    has_home_care = any(kw in tata_text for kw in _EMERGENCY_HOME_CARE_PATTERNS)
    has_emergency_referral = any(
        kw in rujuk_text for kw in _EMERGENCY_REFERRAL_PATTERNS
    )

    specific_issues: list[str] = []
    if has_home_care:
        specific_issues.append(
            "Tatalaksana 'rawat jalan/tirah baring/pulang ke rumah' tidak sesuai untuk "
            "diagnosis emergency — pasien perlu tatalaksana aktif/observasi ketat"
        )
    if not has_emergency_referral:
        specific_issues.append(
            "Kriteria rujuk tidak mencantumkan rujukan emergensi — pasien harus dirujuk segera"
        )

    if not specific_issues:
        return {"has_inconsistency": False, "issues": [], "message": ""}

    issues = [
        "Emergency diagnosis terdeteksi — tatalaksana tidak konsisten dengan urgensi klinis"
    ] + specific_issues
    message = (
        "Emergency diagnosis detected but management does not reflect emergency urgency. "
        "Review diagnosis, therapy plan, and referral criteria for consistency."
    )
    return {"has_inconsistency": True, "issues": issues, "message": message}


def _red_flag_disease_context(query: str) -> str:
    q = query.lower()
    extra = []
    for rf in RED_FLAGS:
        trigger_hit = any(t in q for t in rf["trigger"])
        if not trigger_hit:
            continue
        if rf["context"] and not any(c in q for c in rf["context"]):
            continue
        extra.append(rf["disease"])
    if not extra:
        return ""
    return "\n=== DIAGNOSA RED FLAG — WAJIB DIPERTIMBANGKAN ===\n" + "\n".join(
        f"  {d}" for d in extra
    )


def _get_red_flag_disease_details(query: str) -> list[dict]:
    """Return structured detail (name, ICD code, alert) for each triggered red flag.

    VAL-SAFETY-002: used by post-processing to ensure emergency conditions
    appear in the diagnostic frame when red flags are present.
    """
    q = query.lower()
    details: list[dict] = []
    for rf in RED_FLAGS:
        trigger_hit = any(t in q for t in rf["trigger"])
        if not trigger_hit:
            continue
        if rf["context"] and not any(c in q for c in rf["context"]):
            continue
        disease = rf["disease"]
        # Parse ICD code from disease string like "Meningitis Bakterial (G00)"
        icd_match = re.search(r"\(([A-Z]\d{2,3}(?:\.\d+)?)\)", disease)
        icd = icd_match.group(1) if icd_match else ""
        name = re.sub(r"\s*\([^)]*\)", "", disease).strip()
        details.append(
            {
                "name": name,
                "icd": icd,
                "disease": disease,
                "alert": rf["alert"],
            }
        )
    return details


def _ensure_red_flag_in_diagnostic_frame(response: str, rf_details: list[dict]) -> str:
    """Post-process model response to ensure red flag diseases appear in the
    diagnostic frame (DIAGNOSIS BANDING at minimum, DIAGNOSIS KERJA when
    the emergency is life-threatening).

    VAL-SAFETY-002: emergency condition must appear at minimum in the
    differential and typically as the working diagnosis. The urgent
    condition must not be buried beneath routine diagnoses.
    """
    if not rf_details:
        return response

    # ── 1. Ensure red flag diseases appear in DIAGNOSIS BANDING ──
    banding_pat = re.compile(
        r"DIAGNOSIS BANDING:\s*\n(.*?)(?=\n[A-Z][A-Z\s/]+:\s*\n|$)",
        re.DOTALL,
    )

    banding_m = banding_pat.search(response)
    if banding_m:
        raw_section = banding_m.group(1)
        lower_section = raw_section.lower()

        missing: list[dict] = []
        for detail in rf_details:
            name_lower = detail["name"].lower()
            # Check if any substantial part of the disease name appears
            name_parts = [p for p in name_lower.split() if len(p) > 3]
            found = (
                any(part in lower_section for part in name_parts)
                if name_parts
                else True
            )
            # Also check ICD code presence
            if detail["icd"] and detail["icd"].lower() in lower_section:
                found = True
            if not found:
                missing.append(detail)

        if missing:
            emergency_lines: list[str] = []
            for d in missing:
                icd_str = f"[{d['icd']}] " if d["icd"] else ""
                emergency_lines.append(
                    f"{icd_str}{d['name']} — [EMERGENCY: red flag terdeteksi, wajib dipertimbangkan]"
                )

            existing_lines = [
                line.strip()
                for line in raw_section.strip().splitlines()
                if line.strip()
            ]
            new_lines = emergency_lines + existing_lines
            new_section = "DIAGNOSIS BANDING:\n" + "\n".join(new_lines) + "\n\n"
            response = (
                response[: banding_m.start()]
                + new_section
                + response[banding_m.end() :]
            )

    # ── 2. For life-threatening emergencies, check DIAGNOSIS KERJA ──
    LIFE_THREATENING = {
        "stroke",
        "acute coronary",
        "meningitis",
        "subarachnoid",
        "ensefalitis",
        "trauma kepala",
        "trauma kapitis",
        "cedera otak traumatik",
        "fraktur basis kranii",
        "penurunan kesadaran",
        "trauma mayor",
        "distress respirasi",
    }

    has_life_threatening = any(
        any(lt in d["name"].lower() for lt in LIFE_THREATENING) for d in rf_details
    )

    if has_life_threatening:
        kerja_pat = re.compile(
            r"DIAGNOSIS KERJA:\s*\n(.*?)(?=\n[A-Z][A-Z\s/]+:\s*\n|$)",
            re.DOTALL,
        )

        kerja_m = kerja_pat.search(response)
        if kerja_m:
            raw_kerja = kerja_m.group(1).strip()
            lower_kerja = raw_kerja.lower()

            # Check if any life-threatening red flag disease appears
            rf_found_in_kerja = False
            for lt_term in LIFE_THREATENING:
                if lt_term in lower_kerja:
                    rf_found_in_kerja = True
                    break
            # Also check ICD codes
            for detail in rf_details:
                if detail["icd"] and detail["icd"].lower() in lower_kerja:
                    rf_found_in_kerja = True
                    break

            if not rf_found_in_kerja:
                first_rf = rf_details[0]
                emergency_note = (
                    f"\n\n⚠ PERHATIAN KEGAWATDARURATAN: {first_rf['name']} "
                    f"harus dipertimbangkan sebagai diagnosis kerja utama "
                    f"karena red flag terdeteksi pada keluhan pasien. "
                    f"Evaluasi ulang diagnosis kerja di atas sebelum "
                    f"melanjutkan tatalaksana rawat jalan."
                )
                new_kerja = "DIAGNOSIS KERJA:\n" + raw_kerja + emergency_note + "\n\n"
                response = (
                    response[: kerja_m.start()] + new_kerja + response[kerja_m.end() :]
                )

    return response
