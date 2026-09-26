# Architected and built by codieverse+.
from datetime import datetime


def _greeting() -> str:
    hour = datetime.now().hour
    if 5 <= hour < 11:
        return "pagi"
    elif 11 <= hour < 15:
        return "siang"
    elif 15 <= hour < 19:
        return "sore"
    else:
        return "malam"


def is_referral(response_text: str) -> bool:
    return "RUJUK" in response_text.upper()


def format_message(response_text: str, pasien: dict, session_id: str) -> str:
    if is_referral(response_text):
        return format_referral(response_text, pasien, session_id)
    return format_normal(response_text, session_id)


def format_normal(response_text: str, session_id: str) -> str:
    ts = datetime.now().strftime("%d %b %Y, %H:%M")
    header = f"📋 *SIDELAB Output*\n_{ts}_ | Session: `{session_id}`\n\n"
    return header + response_text[:3800]


def format_referral(response_text: str, pasien: dict, session_id: str) -> str:
    greeting = _greeting()
    nama = pasien.get("nama", "-")
    umur = pasien.get("umur", "-")
    jk = pasien.get("jk", "-")
    bb = pasien.get("bb", "-")
    tb = pasien.get("tb", "-")
    alergi = pasien.get("alergi", "-")

    # Extract KRITERIA RUJUK section from output
    rujuk_section = ""
    upper_text = response_text.upper()
    if "KRITERIA RUJUK" in upper_text:
        parts = upper_text.split("KRITERIA RUJUK")
        if len(parts) > 1:
            # Get original-cased text from the split point
            start_idx = response_text.upper().find("KRITERIA RUJUK")
            if start_idx != -1:
                end_idx = start_idx + len("KRITERIA RUJUK") + 1500
                rujuk_section = response_text[start_idx:end_idx]

    body = f"""Selamat {greeting} dokter,

Saya dr Ferdi Iskandar dari Puskesmas Balowerti kota Kediri ijin mengirimkan pasien :

Atas nama: {nama}
Umur: {umur} tahun
Jenis Kelamin: {jk}
BB: {bb} kg
TB: {tb} cm
Alergi: {alergi}

{rujuk_section}

Mohon arahan dan tindak lanjut lebih lanjut dokter.

Terima kasih.
dr Ferdi Iskandar
Puskesmas Balowerti
Kota Kediri
"""
    return body[:4000]
