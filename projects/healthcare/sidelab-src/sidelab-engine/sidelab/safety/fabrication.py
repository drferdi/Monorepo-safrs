# Architected and built by codieverse+.
# No-fabrication guardrail — VAL-SAFETY-009
import re

# Patterns that indicate potentially fabricated clinical data in model output
_FABRICATION_PATTERNS: list[tuple[str, str, str]] = [
    # (field_name, data_source_key, regex_pattern)
    # Vital signs — TD with numeric values
    (
        "tanda_vital",
        "vital",
        r"\bTD\s*\d{2,3}\s*/\s*\d{2,3}\b",
    ),
    # Heart rate / Nadi
    (
        "tanda_vital",
        "vital",
        r"\bNadi\s*\d{2,3}\b",
    ),
    # Respiratory rate
    (
        "tanda_vital",
        "vital",
        r"\bRR\s*\d{1,2}\b",
    ),
    # Temperature with numeric value
    (
        "tanda_vital",
        "vital",
        r"\bSuhu\s*\d{2}(?:[.,]\d)?\b",
    ),
    # GCS score (Glasgow Coma Scale)
    (
        "skor_klinis",
        "vital",
        r"\bGCS\s*(?::\s*)?\d{1,2}\b",
    ),
    # CURB-65 score with numeric value
    (
        "skor_klinis",
        "vital",
        r"\bCURB[-\s]?65\b\s*[—\-\s:]*\s*(?:skor\s*)?\d\b",
    ),
    # Laboratory values — Hemoglobin
    (
        "lab",
        "gejala",
        r"\bHb\s*(?::\s*)?\d{1,2}[.,]\d\s*(?:g/?dL|gr%)",
    ),
    # Leukocytes
    (
        "lab",
        "gejala",
        r"\bLeukosit\s*(?::\s*)?\d{3,6}\b",
    ),
    # Thrombocytes
    (
        "lab",
        "gejala",
        r"\bTrombosit\s*(?::\s*)?\d{4,7}\b",
    ),
    # Blood glucose
    (
        "lab",
        "gejala",
        r"\bGDS\s*(?::\s*)?\d{2,4}\b",
    ),
    # Creatinine
    (
        "lab",
        "gejala",
        r"\b(?:Kreatinin|Creatinine)\s*(?::\s*)?\d{1,2}[.,]\d\b",
    ),
    # SpO2 saturation
    (
        "tanda_vital",
        "vital",
        r"\bSpO2\s*(?::\s*)?\d{2,3}\s*%",
    ),
    # NIHSS score
    (
        "skor_klinis",
        "vital",
        r"\bNIHSS\s*(?::\s*)?\d{1,2}\b",
    ),
    # qSOFA score
    (
        "skor_klinis",
        "vital",
        r"\bqSOFA\s*(?::\s*)?\d\b",
    ),
    # Wells score
    (
        "skor_klinis",
        "vital",
        r"\bWells\s*(?::\s*)?(?:score\s*)?\d{1,2}\b",
    ),
    # TIMI score
    (
        "skor_klinis",
        "vital",
        r"\bTIMI\s*(?::\s*)?(?:risk\s*)?(?:score\s*)?\d{1,2}\b",
    ),
    # CHA2DS2-VASc score
    (
        "skor_klinis",
        "vital",
        r"\bCHA2DS2[-\s]?VASc?\s*(?::\s*)?\d\b",
    ),
    # HAS-BLED score
    (
        "skor_klinis",
        "vital",
        r"\bHAS[-\s]?BLED\s*(?::\s*)?\d\b",
    ),
    # Specific physical exam findings with "ditemukan" / "didapatkan" pattern
    (
        "pemeriksaan_fisik",
        "keluhan",
        r"\b(?:ditemukan|didapatkan|terdapat|tampak|terdengar|teraba)\s+(?:ronki|"
        r"wheezing|krepitasi|murmur|gallop|edema|ascites|hepatomegali|splenomegali)\b",
    ),
    # BMI with calculated value
    (
        "skor_klinis",
        "vital",
        r"\bBMI\s*(?::\s*)?\d{2}[.,]\d\b",
    ),
]


def _field_has_data(kasus: dict, pasien: dict, source_key: str) -> bool:
    """Check whether a specific data source has been provided by the doctor.

    Checks both kasus and pasien dicts for the given source key.
    """
    value = kasus.get(source_key, "").strip()
    if value:
        return True
    value = pasien.get(source_key, "").strip()
    if value:
        return True
    return False


def _build_no_fabrication_instruction(kasus: dict, pasien: dict) -> str:
    """Build a prompt instruction listing what clinical data is MISSING.

    This instruction explicitly tells the LLM what data it MUST NOT invent
    or present as if observed/calculated. Instead, missing data should be
    marked unknown, asked for, or the assessment approach described.

    Returns an empty string when all fields are provided (rare in practice).

    VAL-SAFETY-009: Missing facts and score inputs must never be fabricated.
    """
    missing_fields: list[str] = []

    # Check each clinical data category
    if not _field_has_data(kasus, pasien, "vital"):
        missing_fields.append(
            "TANDA VITAL (TD, Nadi, RR, Suhu, SpO2) — "
            "tidak tersedia dari input dokter"
        )
    else:
        missing_fields.append(
            "TANDA VITAL — hanya gunakan nilai yang TERSEDIA di input di atas. "
            "JANGAN tambahkan nilai baru"
        )

    # Examination findings — tracked via keluhan/gejala context
    if not kasus.get("keluhan", "").strip():
        missing_fields.append(
            "TEMUAN PEMERIKSAAN FISIK — tidak ada data objektif dari dokter"
        )
    else:
        missing_fields.append(
            "TEMUAN PEMERIKSAAN FISIK — hanya laporkan temuan yang eksplisit "
            "disebutkan di input. JANGAN mengarang temuan auskultasi, palpasi, "
            "inspeksi, atau perkusi yang tidak disebutkan"
        )

    # Lab data
    if (
        not _field_has_data(kasus, pasien, "gejala")
        and not kasus.get("vital", "").strip()
    ):
        missing_fields.append(
            "DATA LABORATORIUM — tidak tersedia. JANGAN menyebutkan nilai lab "
            "spesifik (Hb, Leukosit, Trombosit, GDS, Kreatinin, dll). "
            "Jika relevan, tulis 'data laboratorium belum tersedia' atau "
            "'perlu pemeriksaan laboratorium untuk...'"
        )
    else:
        lab_related = (kasus.get("gejala", "") + " " + kasus.get("vital", "")).lower()
        has_lab_values = any(
            term in lab_related
            for term in ["hb ", "leukosit", "trombosit", "gds", "kreatinin", "lab "]
        )
        if not has_lab_values:
            missing_fields.append(
                "DATA LABORATORIUM — tidak ada nilai lab spesifik di input. "
                "JANGAN menyebutkan angka hasil lab. Gunakan frasa "
                "'data laboratorium belum tersedia' bila relevan"
            )

    # Medication history
    if not _field_has_data(kasus, pasien, "obat"):
        missing_fields.append(
            "RIWAYAT OBAT — tidak tersedia dari input. JANGAN mengklaim "
            "pasien mengonsumsi obat tertentu. Tanyakan bila relevan, "
            "atau nyatakan 'riwayat obat tidak diketahui'"
        )

    # Allergies
    if not _field_has_data(kasus, pasien, "alergi"):
        missing_fields.append(
            "RIWAYAT ALERGI — tidak tersedia dari input. JANGAN menyebutkan "
            "alergi spesifik. Tanyakan bila relevan, atau nyatakan "
            "'riwayat alergi tidak diketahui'"
        )

    # Onset timing / duration
    if not kasus.get("durasi", "").strip():
        missing_fields.append(
            "ONSET / DURASI — tidak tersedia dari input. JANGAN menyebutkan "
            "onset atau durasi spesifik. Tanyakan: 'Sejak kapan keluhan muncul?'"
        )

    # Score components
    missing_fields.append(
        "SKOR KLINIS (GCS, CURB-65, NIHSS, qSOFA, Wells, TIMI, BMI, "
        "CHA2DS2-VASc, HAS-BLED, dll) — JANGAN menghitung atau menampilkan "
        "skor spesifik jika komponen skor tidak tersedia di input. "
        "Tulis 'skor X memerlukan data Y yang belum tersedia' atau "
        "'nilai skor tidak dapat dihitung karena data tidak lengkap'. "
        "Jelaskan cara menilai skor tersebut bila relevan untuk rujukan."
    )

    if not missing_fields:
        # All data available — still include a general anti-fabrication reminder
        return (
            "PANDUAN KEJUJURAN DATA — WAJIB:\n"
            "- HANYA gunakan data klinis yang TERSEDIA di input di atas.\n"
            "- JANGAN mengarang temuan pemeriksaan, nilai lab, skor, "
            "atau tanda vital yang tidak diberikan.\n"
            "- Jika data tidak cukup untuk menyimpulkan sesuatu, "
            "NYATAKAN keterbatasan tersebut.\n"
        )

    lines = [
        "PANDUAN KEJUJURAN DATA — DATA BERIKUT TIDAK TERSEDIA DAN TIDAK BOLEH DIINVENSI:"
    ]
    for field in missing_fields:
        lines.append(f"  ✗ {field}")

    lines.append("")
    lines.append(
        "ATURAN: Untuk data yang tidak tersedia, GUNAKAN salah satu pendekatan berikut:"
    )
    lines.append("  1. Tandai sebagai 'tidak diketahui' atau 'belum tersedia'")
    lines.append("  2. Tanyakan kepada dokter untuk melengkapinya")
    lines.append("  3. Deskripsikan cara menilai atau memperoleh data tersebut")
    lines.append(
        "JANGAN PERNAH menyajikan data yang tidak diberikan sebagai "
        "temuan yang sudah diamati atau dihitung."
    )

    return "\n".join(lines)


def _detect_response_fabrication(response: str, kasus: dict, pasien: dict) -> dict:
    """Detect potentially fabricated clinical data in the model response.

    Scans the model response for patterns that indicate clinical data
    (vitals, lab values, scores, exam findings) that were not present
    in the original case/patient input.

    Returns a dict with:
    - has_fabrication: bool
    - fabricated_items: list[str] — human-readable descriptions of what
      appears to be fabricated
    - message: str — summary message for the warning panel

    VAL-SAFETY-009: No unsupported findings or unsupported scores.
    """
    if not response or not response.strip():
        return {
            "has_fabrication": False,
            "fabricated_items": [],
            "message": "",
        }

    fabricated_items: list[str] = []
    seen_categories: set[str] = set()

    for category, source_key, pattern_str in _FABRICATION_PATTERNS:
        if category in seen_categories:
            continue
        # Check if this data was provided in the input
        if _field_has_data(kasus, pasien, source_key):
            # Data was provided — still check for specific patterns that
            # go beyond what was given (e.g., specific lab values)
            source_value = (
                kasus.get(source_key, "") + " " + pasien.get(source_key, "")
            ).lower()
            # If the specific pattern (e.g., "Hb 11.2") is NOT found in the
            # source input but IS found in the response, it may be fabricated
            pat = re.compile(pattern_str, re.IGNORECASE)
            resp_matches = pat.findall(response)
            if resp_matches:
                # For each match, check if it appears in the source input
                for match_text in resp_matches:
                    match_lower = match_text.lower()
                    if match_lower not in source_value:
                        # This specific value was not provided — potential fabrication
                        item_desc = _describe_fabricated_item(category, match_text)
                        if item_desc not in fabricated_items:
                            fabricated_items.append(item_desc)
                        seen_categories.add(category)
                        break  # One match per category is enough
            continue

        # Data was NOT provided at all — any match is potential fabrication
        pat = re.compile(pattern_str, re.IGNORECASE)
        resp_matches = pat.findall(response)
        if resp_matches:
            item_desc = _describe_fabricated_item(category, resp_matches[0])
            if item_desc not in fabricated_items:
                fabricated_items.append(item_desc)
            seen_categories.add(category)

    if not fabricated_items:
        return {
            "has_fabrication": False,
            "fabricated_items": [],
            "message": "",
        }

    message = (
        "Data klinis berikut ditemukan dalam respons tetapi TIDAK didukung "
        "oleh input dokter. Data ini mungkin diinvensi oleh model dan HARUS "
        "diverifikasi sebelum digunakan untuk keputusan klinis:"
    )

    return {
        "has_fabrication": True,
        "fabricated_items": fabricated_items[:8],  # Cap at 8 items
        "message": message,
    }


def _describe_fabricated_item(category: str, match_text: str) -> str:
    """Return a human-readable description for a potentially fabricated item."""
    match_clean = match_text.strip()
    labels = {
        "tanda_vital": f"Tanda vital ({match_clean})",
        "skor_klinis": f"Skor klinis ({match_clean})",
        "lab": f"Nilai laboratorium ({match_clean})",
        "pemeriksaan_fisik": f"Temuan pemeriksaan fisik ({match_clean})",
    }
    return labels.get(category, f"{category} ({match_clean})")


def _check_response_for_fabrication(response: str, kasus: dict, pasien: dict) -> str:
    """Post-process model response to add warnings about fabricated data.

    When potentially fabricated clinical data is detected in the model
    response, this function appends a visible warning section at the end
    of the response.

    Returns the (possibly modified) response string.

    VAL-SAFETY-009: Missing facts must not be presented as observed or
    calculated. The response may mark them unknown, ask for them, or
    describe how to assess them.
    """
    detection = _detect_response_fabrication(response, kasus, pasien)
    if not detection.get("has_fabrication"):
        return response

    fabricated = detection.get("fabricated_items", [])
    message = detection.get("message", "")

    lines = ["", "", "═══════════════════════════════════════════════════════"]
    lines.append("⚠ PERINGATAN — DATA KLINIS TIDAK DIDUKUNG INPUT DOKTER ⚠")
    lines.append("")
    lines.append(message)
    lines.append("")
    for i, item in enumerate(fabricated, 1):
        lines.append(f"  {i}. {item}")
    lines.append("")
    lines.append(
        "TINDAKAN: Dokter HARUS memverifikasi semua data di atas sebelum "
        "digunakan. Data ini TIDAK berasal dari input kasus dan mungkin "
        "merupakan halusinasi model. Keputusan klinis tetap pada dokter."
    )
    lines.append("═══════════════════════════════════════════════════════")

    return response.rstrip() + "\n" + "\n".join(lines)
