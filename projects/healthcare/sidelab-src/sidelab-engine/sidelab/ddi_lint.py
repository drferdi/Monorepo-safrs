# Architected and built by codieverse+.
"""Cross-drug DDI and patient-KI linter using the enrichment sidecar.

The linter pulls structured interaction and contraindication records
from data/fornas_enrichment.json (joined through data/fornas_2026.json)
and surfaces alerts for the validator to embed into the visible panel
before the prescriber signs off.

Best-practice alignment (2026):
  - ASHP/CDS-DDI standard severity grading
    (kontraindikasi > mayor > moderate > minor > tidak_signifikan).
  - HIMSS Population-Specific CPOE checks: kontraindikasi_relatif
    fields keyed by `tipe: "population"` allow population filters
    (lansia, kehamilan, gagal_ginjal) without hard-coded regex on
    the patient free text.

The linter is purely additive — it never rewrites the response; it
returns typed alert records that the validator's panel renderer
turns into a visible section.
"""
from __future__ import annotations

import re
from typing import Any, TypedDict

from sidelab.fornas_records import InteractionLevel
from sidelab.pharma_records import TherapyRecord

_SEVERITY_RANK: dict[str, int] = {
    "kontraindikasi": 5,
    "mayor": 4,
    "moderate": 3,
    "minor": 2,
    "tidak_signifikan": 1,
}

# Minimum token length to avoid spurious substring matches.
_MIN_KW_LEN = 4

# Population tags surfaced as inline markers in panel text.
_POPULATION_TAGS: dict[str, str] = {
    "lansia": "usia lanjut",
    "lans": "usia lanjut",
    "lanjut usia": "usia lanjut",
    "geriatri": "usia lanjut",
    "hamil": "kehamilan",
    "kehamil": "kehamilan",
    "menyusui": "menyusui",
    "anak": "pediatri",
    "pediatri": "pediatri",
    "bayi": "pediatri",
    "dewasa": "dewasa",
    # Substance/condition features that are not strict age groups
    # but signal a relevant patient profile for population-typed KI.
    "alkohol": "pengguna alkohol aktif",
    "g6pd": "defisiensi G6PD",
}

# Patient signal keywords that map a population feature (tag) back to
# the user-facing pasien field. Implemented as a list so multiple
# natural-language phrasings can resolve the same trigger.
_POPULATION_PATIENT_TRIGGERS: dict[str, list[tuple[str, list[str]]]] = {
    "kehamilan": [("komorbid", ["hamil", "gravid"])],
    "menyusui": [("komorbid", ["menyusui", "laktasi"])],
    "pediatri": [("umur_max", ["18"])],
    "usia lanjut": [("umur_min", ["65"])],
    "pengguna alkohol aktif": [
        ("komorbid", ["alkohol", "kronis", "minum", "alkoholik"])
    ],
    "defisiensi G6PD": [("komorbid", ["g6pd"])],
}


class DDIAlert(TypedDict, total=False):
    """Cross-drug interaction alert."""

    drug_a: str
    drug_b: str
    drug_a_id: str
    drug_b_id: str
    level: InteractionLevel
    effect: str
    mechanism: str
    source: str
    management: str
    matched_via: str  # "a.interaksi[b]" | "b.interaksi[a]"


class KIPatientAlert(TypedDict, total=False):
    """Patient-specific contraindication alert."""

    drug_id: str
    drug_canonical: str
    kontraindikasi_tipe: str  # absolute | relative | population
    syarat: str
    matched_field: str
    matched_snippet: str
    catatan: str
    severity_rank: int


def _tokens(text: str) -> list[str]:
    """Lower-cased tokens of length >=_MIN_KW_LEN from a free-text field."""
    if not text:
        return []
    return [
        tok.strip()
        for tok in re.split(r"[,;:/\.\(\)\s]+", text.lower())
        if len(tok.strip()) >= _MIN_KW_LEN
    ]


def _match_token(kw_a: str, kw_b: str) -> bool:
    """Two-keyword affinity: full contains or both share a substring.

    Conservative: requires minimum length on each side so that short
    fragments like 'pcr' do not over-match.
    """
    if not kw_a or not kw_b:
        return False
    if len(kw_a) < _MIN_KW_LEN or len(kw_b) < _MIN_KW_LEN:
        return False
    a, b = kw_a.lower(), kw_b.lower()
    return a in b or b in a


def _resolve_drug(name: str) -> Any:
    """Resolve a drug record by name, falling back to first-token match.

    The validator emits drug names like `Paracetamol 500 mg PO`, so
    both an exact and a first-word fallback are required.
    """
    try:
        from sidelab.fornas_loader import resolve_by_name
    except Exception:  # noqa: BLE001
        return None
    try:
        hit = resolve_by_name(name)
        if hit:
            return hit
        first = (name or "").split()
        if first:
            hit = resolve_by_name(first[0])
            if hit:
                return hit
    except Exception:  # noqa: BLE001
        return None
    return None


def _interaksi_fields_match(
    interaksi_list: list[dict[str, Any]],
    counterpart_record: Any,
) -> tuple[dict[str, Any], str] | None:
    """Find first interaksi record that matches counterpart drug by name.

    Returns (record, matched_via) where matched_via indicates which
    side carried the interaksi (a.interaksi[b] or b.interaksi[a]).
    """
    if not interaksi_list or not isinstance(counterpart_record, dict):
        return None
    cand_names: set[str] = set()
    for fld in ("canonical_name", "canonical_name_en"):
        val = counterpart_record.get(fld)
        if isinstance(val, str) and val.strip():
            cand_names.add(val.strip().lower())
    for syn in counterpart_record.get("sinonim", []) or []:
        if isinstance(syn, str) and syn.strip():
            cand_names.add(syn.strip().lower())
    all_counter_tokens: list[str] = []
    for n in cand_names:
        all_counter_tokens.extend(_tokens(n))

    for record in interaksi_list:
        if not isinstance(record, dict):
            continue
        dgn = str(record.get("dengan", "")).strip().lower()
        if not dgn:
            continue
        for cand in cand_names:
            if cand and (cand in dgn or dgn in cand):
                return record, "a.interaksi[b]"
        for tok in _tokens(dgn):
            for c_tok in all_counter_tokens:
                if _match_token(tok, c_tok):
                    return record, "a.interaksi[b]"
    return None


def find_cross_drug_alerts(records: list[TherapyRecord]) -> list[DDIAlert]:
    """Return DDI alerts for every ordered pair of distinct drugs."""
    out: list[DDIAlert] = []
    seen: set[tuple[str, str]] = set()
    for r_a in records:
        n_a = (r_a.get("lookup_key") or "").strip()
        if not n_a:
            continue
        d_a = _resolve_drug(n_a)
        if not d_a:
            continue
        a_id = str(d_a.get("id", ""))
        a_canon = str(d_a.get("canonical_name", "")).strip().lower()
        a_inter = list(d_a.get("interaksi", []) or [])
        for r_b in records:
            n_b = (r_b.get("lookup_key") or "").strip()
            if not n_b or n_b == n_a:
                continue
            pair: tuple[str, str] = (
                n_a if n_a <= n_b else n_b,
                n_b if n_a <= n_b else n_a,
            )
            if pair in seen:
                continue
            seen.add(pair)
            d_b = _resolve_drug(n_b)
            if not d_b:
                continue
            b_id = str(d_b.get("id", ""))
            b_canon = str(d_b.get("canonical_name", "")).strip().lower()
            match_a = _interaksi_fields_match(a_inter, d_b)
            if match_a is None:
                match_a = _interaksi_fields_match(
                    list(d_b.get("interaksi", []) or []), d_a
                )
                if match_a is not None:
                    hit_via = "b.interaksi[a]"
                else:
                    continue
            else:
                hit_via = "a.interaksi[b]"
            level = str(match_a[0].get("level", "minor")).lower()
            out.append(
                DDIAlert(
                    drug_a=a_canon,
                    drug_b=b_canon,
                    drug_a_id=a_id,
                    drug_b_id=b_id,
                    level=level,  # type: ignore[typeddict-item]
                    effect=str(match_a[0].get("efek", "") or match_a[0].get("effect", "")),
                    mechanism=str(match_a[0].get("mekanisme", "") or match_a[0].get("mechanism", "")),
                    source=str(match_a[0].get("sumber", "")),
                    management=str(match_a[0].get("manajemen", "")),
                    matched_via=hit_via,
                )
            )
    out.sort(
        key=lambda a: (-_SEVERITY_RANK.get(str(a.get("level", "minor")), 0),
                       a.get("drug_a", ""), a.get("drug_b", ""))
    )
    return out


def _patient_token_index(pasien: dict[str, Any]) -> dict[str, list[tuple[str, str]]]:
    """Build per-field (token, snippet) tuples for downstream KI matching."""
    out: dict[str, list[tuple[str, str]]] = {}
    for fld in ("alergi", "komorbid", "obat", "riwayat"):
        val = pasien.get(fld)
        if not isinstance(val, str) or not val.strip():
            out[fld] = []
            continue
        lowered = val.lower()
        tokens = _tokens(val)
        pairs: list[tuple[str, str]] = []
        for tok in tokens:
            if tok in lowered:
                idx = lowered.find(tok)
                start = max(0, idx - 12)
                end = min(len(val), idx + len(tok) + 12)
                snippet = val[start:end].strip(" ,;")
                pairs.append((tok, snippet))
        out[fld] = pairs
    return out


def _populasi_match(syarat: str, pasien: dict[str, Any]) -> tuple[bool, str, str]:
    """Match populasi tags in KI syarat against pasien signals.

    Returns (matched, snippet, source_field). The source_field is the
    pasien top-level key that triggered the match (e.g. ``komorbid``),
    so the panel can show where the signal came from.
    """
    s = (syarat or "").lower()
    matched_populations: list[str] = []
    for tag, marker in _POPULATION_TAGS.items():
        if tag in s:
            matched_populations.append(marker)
    if not matched_populations:
        return False, "", ""

    snippet_parts: list[str] = []
    source_field = ""
    age_raw = pasien.get("umur") or pasien.get("age")
    age_int: int | None = None
    if age_raw is not None:
        try:
            age_int = int(age_raw)
        except (TypeError, ValueError):
            age_int = None

    for pop in matched_populations:
        triggers = _POPULATION_PATIENT_TRIGGERS.get(pop, [])
        for fld, signals in triggers:
            if fld == "umur_min":
                if age_int is not None and signals and age_int >= int(signals[0]):
                    snippet_parts.append(f"usia {age_int} tahun")
                    source_field = source_field or "umur"
            elif fld == "umur_max":
                if age_int is not None and signals and age_int <= int(signals[0]):
                    snippet_parts.append(f"usia {age_int} tahun")
                    source_field = source_field or "umur"
            else:
                val = str(pasien.get(fld, "") or "")
                val_l = val.lower()
                if any(sig in val_l for sig in signals):
                    snippet_parts.append(f"'{val[:60]}'")
                    source_field = source_field or fld
    return (
        bool(snippet_parts),
        "; ".join(snippet_parts),
        source_field or "populasi",
    )


def find_patient_conflicts(
    records: list[TherapyRecord], pasien: dict[str, Any] | None
) -> list[KIPatientAlert]:
    """Find KI alerts that match the patient's profile.

    Matches against:
      - `kontraindikasi_absolut[].syarat` vs pasien.alergi/komorbid/obat
      - `kontraindikasi_relatif[].tipe == "population"` vs komorbid/umur
      - substring & partial-token affinity with >=4-char tokens
    """
    if not pasien or not isinstance(pasien, dict):
        return []
    out: list[KIPatientAlert] = []
    token_index = _patient_token_index(pasien)
    for r in records:
        n = (r.get("lookup_key") or "").strip()
        if not n:
            continue
        drug = _resolve_drug(n)
        if not drug:
            continue
        d_id = str(drug.get("id", ""))
        d_canon = str(drug.get("canonical_name", "")).strip().lower()

        for ki in drug.get("kontraindikasi_absolut", []) or []:
            if not isinstance(ki, dict):
                continue
            tipe = str(ki.get("tipe", "absolute")).lower()
            if tipe == "population":
                continue  # Handled separately under relatif.
            syarat = str(ki.get("syarat", "")).strip()
            if not syarat:
                continue
            for fld, pairs in token_index.items():
                for tok, snippet in pairs:
                    if _match_token(tok, syarat.lower()):
                        out.append(
                            KIPatientAlert(
                                drug_id=d_id,
                                drug_canonical=d_canon,
                                kontraindikasi_tipe=tipe,
                                syarat=syarat,
                                matched_field=fld,
                                matched_snippet=snippet,
                                catatan=str(ki.get("catatan", "")),
                                severity_rank=_SEVERITY_RANK.get("kontraindikasi", 5),
                            )
                        )
                        break

        for ki in drug.get("kontraindikasi_relatif", []) or []:
            if not isinstance(ki, dict):
                continue
            tipe = str(ki.get("tipe", "relative")).lower()
            syarat = str(ki.get("syarat", "")).strip()
            catatan = str(ki.get("catatan", ""))
            rank = _SEVERITY_RANK.get("mayor" if tipe == "population" else "moderate", 3)
            matched = False
            matched_field = ""
            matched_snippet = ""
            if tipe == "population":
                ok, snippet, src_field = _populasi_match(syarat, pasien)
                if ok:
                    matched = True
                    matched_field = src_field or "populasi"
                    matched_snippet = snippet
            else:
                for fld, pairs in token_index.items():
                    for tok, snip in pairs:
                        if _match_token(tok, syarat.lower()):
                            matched = True
                            matched_field = fld
                            matched_snippet = snip
                            break
                    if matched:
                        break
            if matched:
                out.append(
                    KIPatientAlert(
                        drug_id=d_id,
                        drug_canonical=d_canon,
                        kontraindikasi_tipe=tipe,
                        syarat=syarat,
                        matched_field=matched_field,
                        matched_snippet=matched_snippet,
                        catatan=catatan,
                        severity_rank=rank,
                    )
                )
    out.sort(key=lambda a: (-int(a.get("severity_rank", 0)), a.get("drug_canonical", "")))
    return out


def render_alerts_section(
    ddi_alerts: list[DDIAlert],
    ki_alerts: list[KIPatientAlert],
) -> str:
    """Render an inline alert section for the validator to append.

    Returns "" when no alerts, so callers can append unconditionally.
    """
    if not ddi_alerts and not ki_alerts:
        return ""
    lines = [
        "",
        "═══════════════════════════════════════════════════════",
        "[!] PERINGATAN KLINIS TAMBAHAN (DDI & KI)",
    ]
    if ddi_alerts:
        lines.append("")
        lines.append(f"Interaksi antar-obat terdeteksi: {len(ddi_alerts)} pasangan.")
        for alert in ddi_alerts[:8]:
            level = str(alert.get("level", "minor")).upper()
            lines.append(
                f"  • [{level}] {alert.get('drug_a', '?')} ↔ "
                f"{alert.get('drug_b', '?')}"
            )
            if alert.get("effect"):
                lines.append(f"      Efek : {alert['effect']}")
            if alert.get("mechanism"):
                lines.append(f"      Mekanisme: {alert['mechanism']}")
            if alert.get("management"):
                lines.append(f"      Manajemen: {alert['management']}")
    if ki_alerts:
        lines.append("")
        lines.append(f"Kontraindikasi spesifik pasien: {len(ki_alerts)} catatan.")
        for ki in ki_alerts[:8]:
            tipe = str(ki.get("kontraindikasi_tipe", "")).upper()
            lines.append(
                f"  • [{tipe}] {ki.get('drug_canonical', '?')} — "
                f"{ki.get('syarat', '?')}"
            )
            if ki.get("matched_field") and ki.get("matched_snippet"):
                lines.append(
                    f"      Pasien ({ki['matched_field']}): \"{ki['matched_snippet']}\""
                )
            if ki.get("catatan"):
                lines.append(f"      Catatan: {ki['catatan']}")
    lines.append("═══════════════════════════════════════════════════════")
    return "\n".join(lines)
