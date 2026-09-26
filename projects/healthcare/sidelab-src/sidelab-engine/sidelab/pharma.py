# Architected and built by codieverse+.
# Pharma text-parsing utilities — pure string/regex, no runtime DB dependency
import re

_PHARMA_ROUTE_REPLACEMENTS = (
    (r"(?i)\bper oral\b", "PO"),
    (r"(?i)\boral\b", "PO"),
    (r"(?i)\bintravena\b", "IV"),
    (r"(?i)\bintravenous\b", "IV"),
    (r"(?i)\bintramuskular\b", "IM"),
    (r"(?i)\bintramuscular\b", "IM"),
    (r"(?i)\bsubkutan\b", "SC"),
    (r"(?i)\bsubcutaneous\b", "SC"),
    (r"(?i)\bsublingual\b", "SL"),
    (r"(?i)\brektal\b", "PR"),
    (r"(?i)\brectal\b", "PR"),
    (r"(?i)\btopikal\b", "TOP"),
    (r"(?i)\btopical\b", "TOP"),
)

_PHARMA_TIMING_REPLACEMENTS = (
    (r"(?i)\(?(sebelum makan\s*\+\s*sebelum tidur)\)?", "AC + HS"),
    (r"(?i)\(?(setelah makan\s*\+\s*sebelum tidur)\)?", "PC + HS"),
    (r"(?i)\(?(sebelum makan)\)?", "AC"),
    (r"(?i)\(?(sesudah makan|setelah makan)\)?", "PC"),
    (r"(?i)\(?(sebelum tidur)\)?", "HS"),
    (r"(?i)\(?(bila perlu|jika perlu|kalau perlu|prn)\)?", "PRN"),
    (r"(?i)\(?(segera|stat)\)?", "STAT"),
    (r"(?i)\(?(saat makan)\)?", "dc"),
)


def _normalize_pharma_conventions(text: str) -> str:
    normalized = text.strip()
    for pattern, replacement in _PHARMA_ROUTE_REPLACEMENTS:
        normalized = re.sub(pattern, replacement, normalized)
    for pattern, replacement in _PHARMA_TIMING_REPLACEMENTS:
        normalized = re.sub(pattern, replacement, normalized)
    normalized = re.sub(r"\s{2,}", " ", normalized)
    normalized = re.sub(r"\s+\)", ")", normalized)
    normalized = re.sub(r"\(\s+", "(", normalized)
    normalized = re.sub(r"\s+([,/])", r"\1", normalized)
    normalized = re.sub(r"([,/])\s+", r"\1", normalized)
    return normalized.strip()


def _format_obat_indonesia(line: str) -> str:
    """Ubah format obat LLM ke format Indonesia."""
    line = _normalize_pharma_conventions(line)

    # Pattern 1: dosis tunggal
    m = re.match(
        r"^([A-Za-z][A-Za-z\s]+?)\s+"
        r"(\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ml|g|gr|iu|%|tablet|kapsul|supp)?)"
        r"(?:\s+(?P<route>PO|IV|IM|SC|SL|PR|TOP))?"
        r"\s+(?:dosis\s+tunggal|single\s+dose)"
        r"(?:\s+(?P<tail>AC \+ HS|PC \+ HS|AC|PC|HS|PRN|STAT|dc))?$",
        line,
        re.IGNORECASE,
    )
    if m:
        nama = m.group(1).strip()
        dosis = m.group(2).strip()
        route = (m.group("route") or "").upper().strip()
        tail = (m.group("tail") or "").strip()
        pieces = [nama, f"1x{dosis}"]
        if route:
            pieces.append(route)
        pieces.append("Dosis Tunggal")
        if tail:
            pieces.append(tail)
        return _normalize_pharma_conventions(" ".join(pieces))

    # Pattern 2: frekuensi + durasi
    m = re.match(
        r"^(?P<name>[A-Za-z][A-Za-z\s]+?)\s+"
        r"(?P<dose>\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ml|g|gr|iu|%|tablet|kapsul|supp)?)"
        r"(?:\s+(?P<route>PO|IV|IM|SC|SL|PR|TOP))?"
        r"\s+(?P<freq>\d+x\d+)"
        r"\s+(?P<duration>\d+\s*(?:hari|minggu|bulan|h))",
        line,
        re.IGNORECASE,
    )
    if m:
        nama = m.group("name").strip()
        dosis = m.group("dose").strip()
        frek = m.group("freq").strip()  # e.g. "3x1"
        durasi = m.group("duration").strip()
        route = (m.group("route") or "").upper().strip()
        n = frek.split("x")[0]
        tail_match = re.search(
            r"\b(AC \+ HS|PC \+ HS|AC|PC|HS|PRN|STAT|dc)\b", line, re.IGNORECASE
        )
        tail = tail_match.group(1) if tail_match else ""
        pieces = [nama, f"{n}x{dosis}"]
        if route:
            pieces.append(route)
        pieces.append(durasi)
        if tail:
            pieces.append(tail)
        return _normalize_pharma_conventions(" ".join(pieces))

    return line


_PHARMA_META_RE = re.compile(
    r"^(?:[│├└─\s]+)?(DDI|KI|Kontraindikasi|Interaksi|Catatan)\s*[:\-—]\s*(.+)$",
    re.IGNORECASE,
)


def _is_pharma_meta_line(line: str) -> bool:
    return bool(_PHARMA_META_RE.match(line.strip()))


def _is_pharma_stock_line(line: str) -> bool:
    lowered = line.strip().lower()
    return "stok" in lowered and not _is_pharma_meta_line(line)


def _is_pharma_program_line(line: str) -> bool:
    lowered = line.strip().lower()
    return "(program)" in lowered or lowered.endswith("program")


def _is_pharma_meta_continuation(line: str) -> bool:
    clean = line.strip()
    if not clean or clean.strip("= ") == "":
        return False
    if (
        _is_pharma_meta_line(clean)
        or _is_pharma_stock_line(clean)
        or _is_pharma_program_line(clean)
    ):
        return False
    if _match_pharma_drug_header(clean):
        return False
    if re.match(r"^[A-Z][A-Z\s/]+:$", clean):
        return False
    return True


def _looks_like_prescription_line(line: str) -> bool:
    clean = line.strip()
    if not clean or clean.endswith(":") or clean.strip("= ") == "":
        return False
    lowered = clean.lower()
    if "stok" in lowered or lowered.startswith("tidak ada obat"):
        return False
    has_schedule = bool(
        re.search(
            r"\b\d+(?:[.,\-]\d+)?\s*x\s*(?:\d+(?:[.,]\d+)?(?:\s*(?:mg|mcg|µg|ml|g|gr|iu|%|tablet|kapsul|supp))?|(?:/|se(?:hari|minggu|bulan)|per\s+(?:hari|minggu|bulan)))",
            clean,
            re.IGNORECASE,
        )
    )
    has_single = bool(
        re.search(r"\b(?:dosis\s+tunggal|single\s+dose)\b", clean, re.IGNORECASE)
    )
    has_route = bool(
        re.search(
            r"\b(?:PO|IV|IM|SC|SL|PR|TOP|IH|oral|per oral|rektal|rectal|sublingual|subkutan|topikal|inhalasi|inhaler|nebulisasi|tetes|tablet|kapsul|kaplet|sirup|syrup|krim|salep|gel|tetes mata|tetes telinga)\b",
            clean,
            re.IGNORECASE,
        )
    )
    has_duration = bool(
        re.search(r"\b\d+\s*(?:hari|minggu|bulan|h)\b", clean, re.IGNORECASE)
    )
    return has_single or (has_schedule and (has_route or has_duration))


def _match_pharma_drug_header(line: str) -> re.Match[str] | None:
    clean = line.strip()
    if not _looks_like_prescription_line(clean):
        return None
    # \d and \+ included so names with chemical formulas (e.g. "Antasida (Al(OH)3 + Mg(OH)2)") match
    return re.match(r"^([A-Za-z][A-Za-z\d\s()/\-\+]+?)\s+\d", clean)


def _extract_diagnosis_kerja_text(response: str) -> str:
    # Multiline: "DIAGNOSIS KERJA:\n content..."
    m = re.search(
        r"DIAGNOSIS KERJA:\s*\n(.*?)(?=\n[A-Z][A-Z\s/]+:\s*\n|$)",
        response,
        re.DOTALL | re.IGNORECASE,
    )
    if m:
        return m.group(1).strip()
    # Single-line: "DIAGNOSIS KERJA: [B86] Skabies — ..."
    m = re.search(r"DIAGNOSIS KERJA:\s*(.+?)(?:\n|$)", response, re.IGNORECASE)
    return m.group(1).strip() if m else ""


def _should_keep_pharma_candidate(name_raw: str, cluster_rule: dict | None) -> bool:
    if not cluster_rule:
        return True
    lowered = name_raw.lower()
    blocked = cluster_rule.get("blocked_drug_keywords", ())
    return not any(keyword in lowered for keyword in blocked)
