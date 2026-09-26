# Architected and built by codieverse+.
import re

# ---------------------------------------------------------------------------
# Trauma pattern priority — VAL-SAFETY-003
# ---------------------------------------------------------------------------

# Diagnoses that are clearly inappropriate as main answer for trauma cases
_ROUTINE_OUTPATIENT_DIAGNOSES = [
    # ICD codes for routine/minor conditions
    "J00",  # Nasofaringitis akut (common cold)
    "J01",  # Sinusitis akut
    "J02",  # Faringitis akut
    "J03",  # Tonsilitis akut
    "J04",  # Laringitis/Trakeitis akut
    "J05",  # Laringitis obstruktif akut (croup)
    "J06",  # ISPA (infeksi saluran pernapasan akut atas)
    "J20",  # Bronkitis akut
    "J30",  # Rinitis vasomotor/alergi
    "J31",  # Rinitis/sinusitis kronis
    "L02",  # Furunkel/abses kulit
    "L03",  # Selulitis
    "L08",  # Infeksi kulit lokal lain
    "M79.1",  # Mialgia
    "K30",  # Dispepsia
    "H81",  # Vertigo
    "F51",  # Insomnia/gangguan tidur non-organik
    "R51",  # Cephalgia/nyeri kepala non-spesifik
    "G44",  # Tension-type headache / sindrom nyeri kepala lain
    "G43",  # Migrain
]

# Textual patterns for routine/minor outpatient diagnoses (in Indonesian and English)
_ROUTINE_OUTPATIENT_PATTERNS = [
    "ispa",
    "infeksi saluran pernapasan",
    "common cold",
    "furunkel",
    "furuncle",
    "bisul",
    "mialgia",
    "myalgia",
    "dispepsia",
    "dyspepsia",
    "vertigo",
    "insomnia",
    "nasofaringitis",
    "faringitis",
    "tonsilitis",
    "rhinitis",
    "sinusitis",
    "bronkitis akut",
    "selulitis ringan",
    "infeksi kulit",
    "cephalgia",
    "tension headache",
    "nyeri kepala tegang",
    "migren",
    "migraine",
]


def _is_trauma_red_flag(detail: dict) -> bool:
    """Check if a red-flag detail is specifically head-trauma or
    decreased-consciousness / neurologic emergency related.

    Covers RED_FLAG patterns #7 (trauma kepala), #8 (fraktur basis kranii),
    and #9 (penurunan kesadaran dengan konteks trauma).
    """
    name = detail.get("name", "").lower()
    icd = detail.get("icd", "")
    trauma_names = {
        "cedera otak traumatik",
        "trauma kapitis",
        "fraktur basis kranii",
        "penurunan kesadaran",
    }
    trauma_icds = {"S06", "S02.1"}
    return any(t in name for t in trauma_names) or icd in trauma_icds


def _suppress_routine_diagnoses_for_trauma(
    response: str, rf_details: list[dict]
) -> str:
    """Post-process model response: when trauma/neurologic red flags are
    present but the DIAGNOSIS KERJA is a routine/minor outpatient diagnosis,
    insert a visible trauma-priority warning.

    VAL-SAFETY-003: For head-trauma or decreased-consciousness cases, the
    visible output prioritizes trauma-related or neurologic emergency
    considerations and does not present routine infection or minor
    outpatient diagnoses as the main answer.
    """
    if not rf_details:
        return response

    # Only apply to trauma/neurologic red flags
    trauma_rf = [d for d in rf_details if _is_trauma_red_flag(d)]
    if not trauma_rf:
        return response

    # Extract DIAGNOSIS KERJA section
    kerja_pat = re.compile(
        r"DIAGNOSIS KERJA:\s*\n(.*?)(?=\n[A-Z][A-Z\s/]+:\s*\n|$)",
        re.DOTALL,
    )
    kerja_m = kerja_pat.search(response)
    if not kerja_m:
        return response

    raw_kerja = kerja_m.group(1).strip()
    lower_kerja = raw_kerja.lower()

    # Check if DIAGNOSIS KERJA contains a routine/minor outpatient diagnosis
    is_routine = False
    for icd in _ROUTINE_OUTPATIENT_DIAGNOSES:
        if icd.lower() in lower_kerja:
            is_routine = True
            break
    if not is_routine:
        for pattern in _ROUTINE_OUTPATIENT_PATTERNS:
            if pattern in lower_kerja:
                is_routine = True
                break

    if not is_routine:
        return response

    # Build trauma-priority warning
    rf_names = [d["name"] for d in trauma_rf]
    rf_names_str = ", ".join(rf_names)
    warning = (
        f"\n\n⚠ PERHATIAN PRIORITAS TRAUMA — RED FLAG TERDETEKSI: {rf_names_str}.\n"
        f"Diagnosis kerja di atas ({raw_kerja.split(chr(10))[0] if raw_kerja else raw_kerja}) "
        f"tampaknya tidak memperhitungkan konteks trauma/kegawatdaruratan neurologis "
        f"yang terdeteksi pada keluhan pasien.\n"
        f"TRAUMA KEPALA / KEGAWATDARURATAN NEUROLOGIS harus menjadi prioritas "
        f"diagnosis — BUKAN diagnosis infeksi ringan atau rawat jalan minor.\n"
        f"Evaluasi ulang diagnosis kerja. Pertimbangkan cedera otak traumatik (TBI), "
        f"perdarahan intrakranial, atau fraktur basis kranii sebagai diagnosis utama.\n"
        f"Jika ragu, RUJUK EMERGENSI."
    )

    new_kerja = "DIAGNOSIS KERJA:\n" + raw_kerja + warning + "\n\n"
    response = response[: kerja_m.start()] + new_kerja + response[kerja_m.end() :]
    return response
