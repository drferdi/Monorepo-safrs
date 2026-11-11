# Architected and built by codieverse+.
import re

_ABSOLUTE_PATTERNS_RAW: list[tuple[str, str]] = [
    (r"diagnosis\s+(pasti|definitif)\b", "diagnosis pasti/definitif"),
    (r"tidak\s+diragukan\s+lagi", "tidak diragukan lagi"),
    (
        r"sudah\s+jelas\s+\w+(?:\s+\w+){0,3}\s*(?:menderita|mengidap|adalah|merupakan)",
        "sudah jelas [diagnosis]",
    ),
    (r"\bdefinitif\b", "definitif"),
    (r"(?:telah|sudah)\s+terbukti", "telah/sudah terbukti"),
    (r"(?<!belum\s)(?:sudah\s+)?dapat\s+dipastikan", "dapat dipastikan"),
    (
        r"(?:sudah\s+)?pasti\s+(?:menderita|mengidap|adalah|merupakan)",
        "pasti [diagnosis]",
    ),
    (r"tidak\s+ada\s+keraguan", "tidak ada keraguan"),
    (r"\bmutlak\b", "mutlak"),
    (r"(?:diagnosis|kesimpulan)\s+final", "final"),
    (r"harus\s+(?:menderita|mengidap)", "harus [diagnosis]"),
    (
        r"tidak\s+mungkin\s+(?:menderita|mengidap|adalah)",
        "tidak mungkin [diagnosis]",
    ),
]
_ABSOLUTE_PATTERNS_COMPILED: tuple[tuple, ...] = tuple(
    (re.compile(p, re.IGNORECASE), label) for p, label in _ABSOLUTE_PATTERNS_RAW
)


def _detect_absolute_language(text: str) -> list[dict]:
    """Detect clinically absolute or final-sounding phrases in text.

    Returns a list of dicts, each containing:
    - text: str — the matched absolute phrase
    - start: int — character position where it starts
    - end: int — character position where it ends

    VAL-SAFETY-008: In uncertain cases, clinically absolute or
    final-sounding conclusions must be avoided. This function provides
    the detection substrate for provisional-language enforcement.
    """
    if not text or not text.strip():
        return []

    matches: list[dict] = []
    seen_positions: set[tuple[int, int]] = set()

    for pat, label in _ABSOLUTE_PATTERNS_COMPILED:
        for m in pat.finditer(text):
            pos = (m.start(), m.end())
            if pos not in seen_positions:
                seen_positions.add(pos)
                matches.append(
                    {
                        "text": m.group(0).strip(),
                        "start": m.start(),
                        "end": m.end(),
                        "label": label,
                    }
                )

    # Sort by position
    matches.sort(key=lambda x: x["start"])
    return matches


def _enforce_provisional_language(response: str) -> str:
    """Post-process model response to enforce provisional language.

    VAL-SAFETY-008: When absolute/final-sounding language is detected in
    the response, this function adds a physician-review provisional
    framing note to remind the reader that conclusions are not final.

    Returns the (possibly modified) response string.
    """
    if not response or not response.strip():
        return response

    matches = _detect_absolute_language(response)
    if not matches:
        return response

    # Build a provisional caveat that will be inserted at the end of the
    # DIAGNOSIS KERJA section or before FARMAKOLOGI — wherever it fits
    # naturally without breaking section structure.
    provisional_caveat = (
        "\n\n[CATATAN SISTEM — PEMBINGKAIAN PROVISIONAL]\n"
        "Bahasa absolut atau final-sounding terdeteksi dalam respons di atas. "
        "Semua kesimpulan klinis dalam respons ini bersifat SEMENTARA dan "
        "merupakan SARAN AWAL untuk ditinjau dokter. Diagnosis kerja adalah "
        "HIPOTESIS, bukan kesimpulan final. Keputusan klinis tetap pada "
        "dokter penanggung jawab.\n"
    )

    # Try to insert after the DIAGNOSIS KERJA section but before FARMAKOLOGI
    # to avoid disrupting the drug formatting pipeline.
    farma_pat = re.compile(r"\nFARMAKOLOGI:", re.IGNORECASE)
    farma_m = farma_pat.search(response)
    if farma_m:
        response = (
            response[: farma_m.start()]
            + provisional_caveat
            + response[farma_m.start() :]
        )
    else:
        # No FARMAKOLOGI section — try before PROGNOSIS
        progn_pat = re.compile(r"\nPROGNOSIS:", re.IGNORECASE)
        progn_m = progn_pat.search(response)
        if progn_m:
            response = (
                response[: progn_m.start()]
                + provisional_caveat
                + response[progn_m.start() :]
            )
        else:
            # Append at end as fallback
            response = response.rstrip() + provisional_caveat

    return response
