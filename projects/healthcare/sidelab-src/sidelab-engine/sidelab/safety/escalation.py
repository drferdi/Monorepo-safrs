# Architected and built by codieverse+.
import re

# ---------------------------------------------------------------------------
# Emergency referral escalation — VAL-SAFETY-005
# ---------------------------------------------------------------------------

# Mapping of emergency red-flag disease names to referral escalation criteria
_EMERGENCY_REFERRAL_MAP: dict[str, dict[str, str]] = {
    "stroke": {
        "criteria": "FAST positif / NIHSS — onset <4.5 jam → rujuk emergensi untuk trombolisis/trombektomi",
        "urgency": "RUJUK EMERGENSI — setiap menit berarti neuron yang hilang",
    },
    "acute coronary": {
        "criteria": "EKG STEMI / TIMI risk score ≥3 — nyeri dada ongoing → rujuk emergensi ke RS dengan fasilitas kateterisasi",
        "urgency": "RUJUK EMERGENSI — time-to-balloon <90 menit adalah target",
    },
    "meningitis": {
        "criteria": "Kaku kuduk + demam / Kernig-Brudzinski positif — lumbal pungsi diagnostik → rujuk emergensi",
        "urgency": "RUJUK EMERGENSI — antibiotik IV dosis pertama sebelum rujuk bila memungkinkan",
    },
    "subarachnoid": {
        "criteria": "Thunderclap headache / SAH suspek — CT kepala non-kontras → rujuk emergensi ke RS dengan bedah saraf",
        "urgency": "RUJUK EMERGENSI — risiko rebleeding tinggi dalam 24 jam pertama",
    },
    "trauma kepala": {
        "criteria": "GCS <13 / Canadian CT Head Rule positif — CT kepala → rujuk emergensi",
        "urgency": "RUJUK EMERGENSI — penurunan GCS ≥2 poin adalah indikasi CT ulang",
    },
    "cedera otak traumatik": {
        "criteria": "GCS <13 / Canadian CT Head Rule positif — CT kepala → rujuk emergensi",
        "urgency": "RUJUK EMERGENSI — penurunan GCS ≥2 poin adalah indikasi CT ulang",
    },
    "fraktur basis kranii": {
        "criteria": "Tanda Battle / raccoon eyes / otorrhea / rhinorrhea — CT kepala → rujuk emergensi",
        "urgency": "RUJUK EMERGENSI — risiko meningitis pasca trauma, antibiotik profilaksis dipertimbangkan",
    },
    "penurunan kesadaran": {
        "criteria": "GCS <13 / penurunan kesadaran akut tanpa sebab jelas — rujuk emergensi ke RS",
        "urgency": "RUJUK EMERGENSI — airway protection adalah prioritas, pertimbangkan intubasi sebelum transport",
    },
    "distress respirasi": {
        "criteria": "SpO2 <90% persisten / gagal napas impending — stabilisasi jalan napas → rujuk emergensi",
        "urgency": "RUJUK EMERGENSI — intubasi dini dipertimbangkan sebelum transport bila GCS turun",
    },
    "trauma mayor": {
        "criteria": "Primary survey ABCDE — Revised Trauma Score / hemodinamik tidak stabil → rujuk emergensi ke RS trauma center",
        "urgency": "RUJUK EMERGENSI — golden hour, kontrol perdarahan dan resusitasi cairan selama transport",
    },
}

# Keywords that indicate only routine (non-urgent) follow-up
_ROUTINE_FOLLOWUP_KEYWORDS = [
    "kontrol",
    "follow.up",
    "poliklinik",
    "minggu",
    "bulan",
    "elektif",
]

# Keywords that indicate adequate urgent referral language is already present
_URGENT_REFERRAL_KEYWORDS = [
    "emergensi",
    "segera",
    "rujuk emergensi",
    "rujuk segera",
]


def _ensure_emergency_referral_escalation(response: str, rf_details: list[dict]) -> str:
    """Post-process model response: when emergency red flags (stroke, ACS,
    meningitis, severe trauma, unconscious) are present, ensure the KRITERIA
    RUJUK section includes urgent referral language with objective escalation
    criteria/thresholds, not routine follow-up language alone.

    VAL-SAFETY-005: Emergency referral escalation is explicit and objective.
    For simulated stroke, ACS, meningitis, severe trauma, or unconscious-patient
    cases, the visible output includes urgent referral language and objective
    escalation criteria or thresholds in the referral guidance area.
    """
    if not rf_details:
        return response

    # Determine which emergency conditions apply and gather their criteria
    matched_criteria: list[str] = []
    matched_urgency: str = ""
    for detail in rf_details:
        name_lower = detail["name"].lower()
        for key, info in _EMERGENCY_REFERRAL_MAP.items():
            if key in name_lower and info["criteria"] not in matched_criteria:
                matched_criteria.append(info["criteria"])
                if not matched_urgency:
                    matched_urgency = info["urgency"]

    if not matched_criteria:
        return response

    # Locate KRITERIA RUJUK section (may also be spelled KRITERIA RUJUKAN)
    # Capture group 1 = heading variant so we can preserve it on replacement
    rujuk_pat = re.compile(
        r"(KRITERIA RUJUK(?:AN)?):\s*\n(.*?)(?=\n[A-Z][A-Z\s/]+:\s*\n|$)",
        re.DOTALL,
    )

    rujuk_m = rujuk_pat.search(response)

    # Check if existing KRITERIA RUJUK already has adequate emergency
    # referral language with objective criteria
    if rujuk_m:
        raw_section = rujuk_m.group(2).strip()
        lower_section = raw_section.lower()

        # Has urgent language?
        has_urgent = any(uk in lower_section for uk in _URGENT_REFERRAL_KEYWORDS)

        # Has criteria terms? Check each matched criteria against section
        has_criteria = any(
            any(word in lower_section for word in c.split() if len(word) > 3)
            for c in matched_criteria
        )

        # If both urgent language AND objective criteria already present, leave unchanged
        if has_urgent and has_criteria:
            return response

    # Build emergency referral injection
    emergency_lines: list[str] = []
    emergency_lines.append("⚠ RUJUK EMERGENSI — SEGERA SETELAH STABILISASI AWAL ⚠")
    if matched_urgency:
        emergency_lines.append(matched_urgency)
    emergency_lines.append("")
    emergency_lines.append("Kriteria objektif eskalasi:")
    for i, criteria in enumerate(matched_criteria, 1):
        emergency_lines.append(f"  {i}. {criteria}")
    emergency_lines.append("")
    emergency_lines.append(
        "Kondisi klinis tambahan yang memicu rujukan: "
        "tidak respon terhadap stabilisasi awal, perburukan neurologis/"
        "kardiorespirasi selama transport, fasilitas tidak memadai untuk "
        "tatalaksana definitif."
    )

    # Preserve original heading variant (RUJUK vs RUJUKAN)
    heading = rujuk_m.group(1) if rujuk_m else "KRITERIA RUJUK"
    new_section = heading + ":\n" + "\n".join(emergency_lines) + "\n\n"

    if rujuk_m:
        # Replace existing section with enhanced version
        response = response[: rujuk_m.start()] + new_section + response[rujuk_m.end() :]
    else:
        # KRITERIA RUJUK section missing entirely — append before PROGNOSIS
        progn_pat = re.compile(r"\nPROGNOSIS:", re.IGNORECASE)
        progn_m = progn_pat.search(response)
        if progn_m:
            response = (
                response[: progn_m.start()]
                + "\n\n"
                + new_section
                + response[progn_m.start() :]
            )
        else:
            # PROGNOSIS also missing — append at end of response
            response = response.rstrip() + "\n\n" + new_section

    return response
