# Architected and built by codieverse+.
# M3 Patient-Safety Helpers — VAL-SAFETY-010 / 011 / 012 / 013


def _is_pediatric(pasien: dict) -> bool:
    """Return True when patient age < 18 years."""
    try:
        return 0 < int(pasien.get("umur") or 0) < 18
    except (ValueError, TypeError):
        return False


def _is_reproductive_age_female(pasien: dict) -> bool:
    """Return True when patient is female aged 12–55 (inclusive)."""
    try:
        age = int(pasien.get("umur") or 0)
    except (ValueError, TypeError):
        return False
    return pasien.get("jk", "") == "P" and 12 <= age <= 55


def _build_pediatric_dose_instruction(pasien: dict) -> str:
    """Return a dosing instruction addendum for pediatric patients.

    VAL-SAFETY-012: dosing for patients < 18 must be weight-based or
    explicitly marked as requiring pediatric verification.

    Returns "" for adults or when age is absent.
    """
    if not _is_pediatric(pasien):
        return ""
    bb = (pasien.get("bb") or "").strip()
    umur = pasien.get("umur", "")
    if bb:
        return (
            f"[PEDIATRI] Pasien anak {umur} tahun — dosis harus dihitung berdasarkan "
            f"berat badan {bb} kg. Verifikasi dosis pediatri sebelum resep diterbitkan."
        )
    return (
        f"[PEDIATRI] Pasien anak {umur} tahun — dosis dewasa tidak dapat diterapkan. "
        "Verifikasi dosis pediatri dan berat badan pasien sebelum tatalaksana."
    )


def _build_pregnancy_warning(pasien: dict) -> str:
    """Return a pregnancy-status warning for reproductive-age females.

    VAL-SAFETY-013: when pregnancy status is unknown, warn about pregnancy
    categories and advise verification before prescribing.

    Returns "" if patient is male, non-reproductive age, or pregnancy is documented.
    """
    if not _is_reproductive_age_female(pasien):
        return ""
    komorbid = (pasien.get("komorbid") or "").lower()
    # Documented statuses: pregnant, post-partum, using contraception, breastfeeding
    known_statuses = [
        "hamil",
        "gravid",
        "partus",
        "menyusui",
        "kontrasepsi",
        "menopause",
        "kb",
    ]
    if any(k in komorbid for k in known_statuses):
        return ""
    return (
        "⚠ STATUS KEHAMILAN TIDAK DIKETAHUI — Verifikasi status hamil/menyusui wajib "
        "dilakukan sebelum meresepkan obat. Kategori keamanan obat pada kehamilan "
        "(kategori A/B/C/D/X) harus dipertimbangkan. Hindari obat kontraindikasi kehamilan "
        "hingga status menyusui dan kehamilan dikonfirmasi."
    )


def _check_dose_critical_data(pasien: dict | None) -> dict:
    """Identify missing data that make precise dosing unsafe.

    VAL-SAFETY-011: returns is_provisional=True with a list of missing_fields
    when weight, renal function, or pregnancy status are absent for patients
    who need them.

    missing_fields values: "bb", "renal", "pregnancy", "all"
    """
    if pasien is None:
        return {"is_provisional": True, "missing_fields": ["all"]}

    missing: list[str] = []

    # Pediatric: weight required for dosing
    if _is_pediatric(pasien):
        bb = (pasien.get("bb") or "").strip()
        if not bb:
            missing.append("bb")

    # Renal risk: need renal function data
    komorbid = (pasien.get("komorbid") or "").lower()
    renal_risk_keywords = [
        "gagal ginjal",
        "ckd",
        "chronic kidney",
        "ginjal kronik",
        "hemodialisis",
        "dialisis",
    ]
    if any(k in komorbid for k in renal_risk_keywords):
        # Renal function documented if egfr/kreatinin/gfr appears in any field
        all_data = " ".join(str(v) for v in pasien.values()).lower()
        renal_data_keywords = ["egfr", "gfr", "kreatinin", "creatinine", "cl cr"]
        if not any(k in all_data for k in renal_data_keywords):
            missing.append("renal")

    # Reproductive-age female: pregnancy status required
    if _is_reproductive_age_female(pasien):
        known_statuses = [
            "hamil",
            "gravid",
            "partus",
            "menyusui",
            "kontrasepsi",
            "menopause",
            "kb",
            "tidak hamil",
        ]
        if not any(k in komorbid for k in known_statuses):
            missing.append("pregnancy")

    is_provisional = bool(missing)
    return {"is_provisional": is_provisional, "missing_fields": missing}


def _build_provisional_dose_instruction(pasien: dict) -> str:
    """Return LLM system-prompt addendum when dose-critical data are missing.

    VAL-SAFETY-011: instructs LLM to use provisional framing rather than
    precise ready-to-prescribe doses.

    Returns "" when all critical data are present.
    """
    result = _check_dose_critical_data(pasien)
    if not result.get("is_provisional"):
        return ""
    missing = result.get("missing_fields", [])
    if "all" in missing:
        return (
            "[PROVISIONAL DOSING] Data pasien tidak tersedia — semua dosis bersifat "
            "provisional/estimasi. Verifikasi bb, umur, fungsi renal, dan status kehamilan "
            "sebelum meresepkan."
        )
    parts = []
    if "bb" in missing:
        parts.append("berat badan (bb)")
    if "renal" in missing:
        parts.append("fungsi renal (eGFR/kreatinin)")
    if "pregnancy" in missing:
        parts.append("status kehamilan")
    fields_str = ", ".join(parts)
    return (
        f"[PROVISIONAL DOSING] Data kritis tidak lengkap: {fields_str} belum tersedia. "
        "Semua anjuran dosis bersifat provisional. Verifikasi data tersebut sebelum "
        "tatalaksana farmakologis ditetapkan."
    )
