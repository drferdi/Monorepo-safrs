# Architected and built by codieverse+.
"""Pharmacology validator — defense-in-depth floor for therapy output.

Runs AFTER _format_farmakologi_tree (which already performs best-effort
backfill via cluster defaults and supportive rules). The validator
counts how many rendered drug entries are *verified* and surfaces
the verification state to the physician via a clearly labeled panel.

Verification provenance (best practice 2026):
  1. pharma_lookup.json-derived: the drug entry has resolved DDI/KI
     text (i.e. NOT the "Tidak tersedia di database lokal" placeholder).
  2. FORNAS-catalog-derived: the drug canonical name matches an entry
     in data/fornas_2026.json (or fornas.json fallback). This is the
     strongest signal because FORNAS 2026 is canonical for Indonesia.
  3. Both: a drug can be verified by both pathways; the validator
     counts such entries once toward the 3-therapy floor.

Behavior summary:
  - verified_count >= 3 && no fallback used: no panel appended.
  - verified_count >= 3 && fallback was used: brief confirmation panel.
  - verified_count < 3: prominent "GANGGUAN" panel directing the
    physician to complete the pharmacotherapy plan manually.

Why a panel, not silence: SILENT substitution of unverified drugs is
the most common failure mode reported in CDSS post-deployment audits.
Even when the system has already attempted backfill, the operator
(the prescribing physician) MUST be able to see what was filled in
and what was not.
"""
from __future__ import annotations

import re
from typing import Any

from sidelab.pharma_records import (
    EnforcementResult,
    MAX_THERAPIES_BEFORE_OVERPOLYPHARMACY,
    MIN_VERIFIED_THERAPIES,
    TherapyRecord,
)
from sidelab.validator_config import load_validator_config

_FARMA_SECTION_RE = re.compile(
    r"((?:FARMAKOLOGI|Farmakologi):\s*\n)(.*?)(?=\n[A-Za-z][A-Za-z\s/]+:\s*\n|$)",
    re.DOTALL,
)

# Each rendered drug block is: name line, "│", "├─ DDI: ...", "└─ Kontraindikasi: ..."
_DDI_LINE_RE = re.compile(
    r"^(?P<name>.+?)\n[│|]\n├─ DDI:\s*(?P<ddi>.+?)\n└─ Kontraindikasi:\s*(?P<ki>.+?)\n?$",
    re.MULTILINE,
)

_UNKNOWN_LOOKUP_LABEL = "Tidak tersedia di database lokal"


def _is_unknown_entry(ddi_value: str) -> bool:
    """True when _format_farmakologi_tree could not resolve DDI/KI from local DB."""
    return ddi_value.strip().startswith(_UNKNOWN_LOOKUP_LABEL)


def _safe_resolve_fornas(name: str) -> dict[str, Any] | None:
    """Best-effort FORNAS resolution. Never raises; returns None on failure.

    Returns a dict with keys: id, kelas_utama. None when FORNAS data
    is unavailable or the drug is not in the catalog.

    Matches hierarchically:
      1. Exact full-name match (lowered).
      2. First-token / prefix match ("Paracetamol 500 mg..." → "paracetamol").
      3. Substring match (any registered name + " " appears in input).
    """
    try:
        from sidelab.fornas_loader import load_fornas
        fornas = load_fornas()
    except Exception:  # noqa: BLE001
        return None
    if not name:
        return None
    name_l = name.strip().lower()
    if not name_l:
        return None
    drugs = fornas.get("drugs", []) or []
    by_name = (fornas.get("index", {}) or {}).get("by_name_lower", {}) or {}

    def _lookup_id_match(matcher: Any) -> dict[str, Any] | None:
        for key, drug_id in by_name.items():
            if matcher(key):
                for drug in drugs:
                    if isinstance(drug, dict) and drug.get("id") == drug_id:
                        kelas = drug.get("kelas_terapi") or {}
                        return {
                            "id": str(drug_id),
                            "kelas_utama": str(
                                kelas.get("utama", "")
                                or drug.get("kelas_terapi_utama", "")
                            ),
                        }
        return None

    # 1. Exact full-name match.
    direct = _lookup_id_match(lambda key: key == name_l)
    if direct:
        return direct
    # 2. Prefix match (full space-separated line begins with the drug name).
    prefix = _lookup_id_match(
        lambda key: name_l.startswith(key + " ") or name_l.startswith(key + ",")
    )
    if prefix:
        return prefix
    # 3. First-token match.
    first = name_l.split()[0]
    if first:
        first_match = _lookup_id_match(lambda key: key == first)
        if first_match:
            return first_match
    # 4. Substring match with minimum length guard.
    if len(first) >= 4:
        sub_match = _lookup_id_match(
            lambda key: len(key) >= 4 and (key in name_l)
        )
        if sub_match:
            return sub_match
    return None


def _parse_rendered_drugs(response: str) -> list[TherapyRecord]:
    """Parse the rendered FARMAKOLOGI tree into typed TherapyRecord entries.

    Each record carries BOTH pharma_lookup-derived verification (via
    the rendered DDI/KI placeholder heuristic) AND FORNAS-catalog
    verification (via sidelab.fornas_loader.resolve_by_name). When
    either pathway yields a hit, the record's `verified` flag is set
    to True. `source` distinguishes the dominant verification path
    so the breakdown panel can show where verification came from.
    """
    section_m = _FARMA_SECTION_RE.search(response)
    if not section_m:
        return []
    body = section_m.group(2)
    records: list[TherapyRecord] = []
    for m in _DDI_LINE_RE.finditer(body):
        name = m.group("name").strip()
        ddi = m.group("ddi").strip()
        ki = m.group("ki").strip()
        pharmacy_verified = not (
            _is_unknown_entry(ddi) or _is_unknown_entry(ki)
        )
        lookup_key = name.split()[0].lower() if name else ""
        fornas_hit = _safe_resolve_fornas(name)
        fornas_verified = fornas_hit is not None
        verified = pharmacy_verified or fornas_verified
        if fornas_verified and not pharmacy_verified:
            source: str = "fornas:catalog_hit"
            reason = (
                "Tervalidasi via FORNAS categorical catalog (DDI/KI belum ada di lookup lokal)"
            )
        elif pharmacy_verified and fornas_verified:
            source = "fornas:catalog_hit"
            reason = "Tervalidasi via lookup lokal + FORNAS"
        elif pharmacy_verified:
            source = "llm"
            reason = "DDI/KI resolved dari lookup lokal"
        else:
            source = "manual_required"
            reason = "Tidak ada verifikasi (lookup lokal atau FORNAS)"
        records.append(
            TherapyRecord(
                raw=name,
                name=name,
                canonical_name=lookup_key,
                lookup_key=lookup_key,
                has_ddi=bool(ddi) and not _is_unknown_entry(ddi),
                has_ki=bool(ki) and not _is_unknown_entry(ki),
                verified=verified,
                fell_back=_is_unknown_entry(ddi),
                source=source,  # type: ignore[typeddict-item]
                reason=reason,
                fornas_verified=fornas_verified,
                fornas_id=str((fornas_hit or {}).get("id", "")),
                fornas_kelas_utama=str((fornas_hit or {}).get("kelas_utama", "")),
            )
        )
    return records


def _render_disruption_panel(
    total: int,
    verified: int,
    shortfall: int,
    fell_back: bool,
    fornas_verified: int,
    lookup_verified: int,
    fornas_available: bool,
    min_threshold: int = MIN_VERIFIED_THERAPIES,
) -> str:
    """Render the visible panel that surfaces pharmacology shortfall."""
    lines = [
        "",
        "═══════════════════════════════════════════════════════",
        "[!] PERINGATAN SISTEM — VALIDASI FARMAKOLOGI",
        f"    Terapi tervalidasi              : {verified}/{min_threshold}",
        f"      - via FORNAS (catalog canonical): {fornas_verified}",
        f"      - via lookup lokal saja        : {lookup_verified}",
        f"    Total baris farmakologi saat ini: {total}",
        f"    Kekurangan slot minimum         : {shortfall}",
    ]
    if fornas_available:
        lines.append(
            "    FORNAS dataset                  : aktif (data/fornas_2026.json)"
        )
    if fell_back:
        lines.append(
            "    Status backfill                 : SEBAGIAN — sebagian baris "
            "berasal dari rules.json, BUKAN verifikasi FORNAS penuh."
        )
        lines.append(
            "    Dokter WAJIB memverifikasi dosis, rute, dan kontraindikasi "
            "sebelum meresepkan obat yang ditandai backfill."
        )
    lines.append("")
    lines.append("TINDAKAN YANG DIPERLUKAN:")
    lines.append(
        f"  • Dokter menambahkan/mengganti obat sampai minimal "
        f"{min_threshold} slot tervalidasi, ATAU"
    )
    lines.append(
        "  • Memberikan justifikasi klinis mengapa pharmacological "
        "intervention tidak sesuai untuk kasus ini."
    )
    lines.append("")
    lines.append(
        "Standar minimum adalah bukti klinis dapat dilacak: kausal → "
        "simptomatik → supportive."
    )
    lines.append("═══════════════════════════════════════════════════════")
    return "\n".join(lines)


def _render_confirmation_panel(
    verified: int,
    total: int,
    fell_back: int,
    fornas_verified: int,
    lookup_verified: int,
    min_threshold: int = MIN_VERIFIED_THERAPIES,
) -> str:
    """Render a brief audit panel when validation succeeded with backfill."""
    return (
        "\n═══════════════════════════════════════════════════════\n"
        f"[OK] VALIDASI FARMAKOLOGI — {verified}/{min_threshold} slot "
        f"terverifikasi ({fornas_verified} via FORNAS, {lookup_verified} via lookup lokal; "
        f"{total} baris total, {fell_back} backfill).\n"
        "═══════════════════════════════════════════════════════"
    )


def _count_by_source(records: list[TherapyRecord]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for r in records:
        src: str = r.get("source", "manual_required")
        counts[src] = counts.get(src, 0) + 1
    return counts


def _kausal_primer_hits(
    records: list[TherapyRecord],
    kelas_whitelist: list[str],
    atc_prefixes: list[str],
) -> int:
    """Count verified records whose FORNAS kelas OR ATC prefix matches
    the kausal-primer whitelist. Used by `accept_if_two_kausal_plus_justification`
    to relax the 3-therapy floor when the rationale is sound.
    """
    if not kelas_whitelist and not atc_prefixes:
        return 0
    kelas_lc = [k.lower().strip() for k in kelas_whitelist if k]
    atc_lc = [a.upper().strip() for a in atc_prefixes if a]
    hits = 0
    for r in records:
        if not r.get("verified"):
            continue
        kelas = str(r.get("fornas_kelas_utama") or "").lower()
        if kelas_lc and any(k and k in kelas for k in kelas_lc):
            hits += 1
            continue
        try:
            from sidelab.fornas_loader import resolve_by_name
            drug = resolve_by_name(r.get("canonical_name") or r.get("lookup_key") or "")
        except Exception:  # noqa: BLE001
            drug = None
        atc = str((drug or {}).get("atc_code") or "").upper()
        if atc_lc and any(atc.startswith(prefix) for prefix in atc_lc):
            hits += 1
    return hits


def _response_has_justifikasi(response: str, keyword: str) -> bool:
    """True when the response body contains a JUSTIFIKASI KLINIS section."""
    if not keyword:
        return False
    return keyword in response.upper() or keyword.upper() in response.upper()


def _render_justifikasi_floor_panel(
    verified: int,
    shortfall_to_3: int,
    kausal_primer: int,
    justifikasi_present: bool,
    kelas_whitelist: list[str],
) -> str:
    """Emit a SHORT panel acknowledging kausal-primer floor is met."""
    return (
        "\n═══════════════════════════════════════════════════════\n"
        f"[OK] VALIDASI FARMAKOLOGI — JUSTIFIKASI LANTAI SINGKAT\n"
        f"    {verified} slot tervalidasi (target 3); {kausal_primer} di antaranya "
        "teridentifikasi sebagai terapi kausal primer.\n"
        f"    Kekurangan                 : {shortfall_to_3} slot (ditutup oleh "
        "justifikasi klinis di badan respons).\n"
        f"    Kelas kausal primer acuan : {', '.join(kelas_whitelist[:3])}"
        f"{'...' if len(kelas_whitelist) > 3 else ''}\n"
        f"    JUSTIFIKASI KLINIS ada     : {'YA' if justifikasi_present else 'TIDAK'}\n"
        "    Validator menerima floor 2-terverifikasi + 1 kausal primer +\n"
        "    justifikasi klinis eksplisit, dengan syarat tidak ada backfill.\n"
        "═══════════════════════════════════════════════════════"
    )


def enforce_minimum_three_therapies(
    response: str,
    pasien: dict[str, Any] | None = None,
) -> tuple[str, EnforcementResult]:
    """Count verified drug entries and emit a panel when conditions require.

    Returns the (possibly augmented) response plus an EnforcementResult
    describing what was observed. The validator is intentionally non-
    destructive: it never rewrites the FARMAKOLOGI section, only appends
    a panel so the physician can see when the floor is not met.

    The `pasien` argument is accepted for symmetry with the surrounding
    pharmacology pipeline; the current iteration does not require it
    because _format_farmakologi_tree already filters patient-conflicting
    drugs before this validator runs.
    """
    cfg = load_validator_config()
    min_verified_floor: int = int(cfg.get("min_verified_therapies") or MIN_VERIFIED_THERAPIES)
    max_polypharm: int = int(cfg.get("max_therapies_before_overpolypharmacy") or MAX_THERAPIES_BEFORE_OVERPOLYPHARMACY)

    records = _parse_rendered_drugs(response)
    if not records:
        return response, EnforcementResult(
            verified_count=0,
            total_count=0,
            shortfall=min_verified_floor,
            fell_back=False,
            source_breakdown={},
            panel_emitted=False,
            fornas_verified_count=0,
            lookup_verified_count=0,
            fornas_available=_is_fornas_loadable(),
        )

    verified = sum(1 for r in records if r.get("verified"))
    total = len(records)
    fell_back_count = sum(1 for r in records if r.get("fell_back"))
    fornas_verified = sum(1 for r in records if r.get("fornas_verified"))
    # Lookup-only entries: pharma_lookup verified but FORNAS did not catch.
    lookup_only_verified = sum(
        1
        for r in records
        if r.get("verified")
        and r.get("source") in ("llm",)
    )
    fornas_available = _is_fornas_loadable()

    result: EnforcementResult = EnforcementResult(
        verified_count=verified,
        total_count=total,
        shortfall=max(0, min_verified_floor - verified),
        fell_back=fell_back_count > 0,
        source_breakdown=_count_by_source(records),
        panel_emitted=False,
        fornas_verified_count=fornas_verified,
        lookup_verified_count=lookup_only_verified,
        fornas_available=fornas_available,
    )

    if total > max_polypharm:
        polypharm_panel = (
            "\n═══════════════════════════════════════════════════════\n"
            f"[!] PERINGATAN POLIFARMASI — {total} entri farmakologis pada "
            "respons ini melebihi ambang praktis untuk kasus rawat jalan "
            f"({max_polypharm}). Pertimbangkan rasionalitas "
            "dan deprescribing bila memungkinkan.\n"
            "═══════════════════════════════════════════════════════"
        )
        extra_poly = ""
        if pasien:
            try:
                ddi_poly, ki_poly = _run_lint(records, pasien)
                if ddi_poly or ki_poly:
                    from sidelab.ddi_lint import render_alerts_section
                    extra_poly = render_alerts_section(ddi_poly, ki_poly)
                    result["lint_alerts"] = {
                        "ddi": [dict(a) for a in ddi_poly],
                        "ki_pasien": [dict(a) for a in ki_poly],
                    }
            except Exception:  # noqa: BLE001
                extra_poly = ""
        result["panel_emitted"] = True
        body_poly = polypharm_panel.rstrip()
        if extra_poly:
            body_poly = body_poly + "\n" + extra_poly
        return response.rstrip() + "\n" + body_poly, result

    extra = ""
    if pasien:
        try:
            ddi_alerts, ki_alerts = _run_lint(records, pasien)
            if ddi_alerts or ki_alerts:
                from sidelab.ddi_lint import render_alerts_section
                extra = render_alerts_section(ddi_alerts, ki_alerts)
            if extra:
                result["lint_alerts"] = {
                    "ddi": [dict(a) for a in ddi_alerts],
                    "ki_pasien": [dict(a) for a in ki_alerts],
                }
        except Exception:  # noqa: BLE001
            extra = ""

    if verified >= min_verified_floor:
        if fell_back_count > 0 or extra:
            result["panel_emitted"] = True
            confirmation = _render_confirmation_panel(
                verified=verified,
                total=total,
                fell_back=fell_back_count,
                fornas_verified=fornas_verified,
                lookup_verified=lookup_only_verified,
                min_threshold=min_verified_floor,
            )
            body = confirmation
            if extra:
                body = body.rstrip() + "\n" + extra
            return response.rstrip() + body, result
        return response, result

    shortfall = min_verified_floor - verified

    # Saran #4: floor relaxasi ketika 2-verified + kausal primer + justifikasi.
    if (
        cfg.get("accept_if_two_kausal_plus_justification", False)
        and verified >= 2
        and not fell_back_count
    ):
        kausal = _kausal_primer_hits(
            records,
            list(cfg.get("kausal_primer_kelas") or []),
            list(cfg.get("kausal_primer_atc") or []),
        )
        justifikasi_present = _response_has_justifikasi(
            response,
            str(cfg.get("justifikasi_section_keyword") or "JUSTIFIKASI KLINIS"),
        )
        if kausal >= 1 and justifikasi_present:
            result["floor_relaxation"] = "kausal_primer_plus_justifikasi"  # type: ignore[typeddict-item]
            result["kausal_primer_hits"] = kausal  # type: ignore[typeddict-item]
            panel = _render_justifikasi_floor_panel(
                verified=verified,
                shortfall_to_3=shortfall,
                kausal_primer=kausal,
                justifikasi_present=justifikasi_present,
                kelas_whitelist=list(cfg.get("kausal_primer_kelas") or []),
            )
            result["panel_emitted"] = True
            result["shortfall"] = 0  # Capped by relaxation.
            body = panel.rstrip()
            if extra:
                body = body + "\n" + extra
            return response.rstrip() + "\n" + body, result

    result["panel_emitted"] = True
    panel = _render_disruption_panel(
        total=total,
        verified=verified,
        shortfall=shortfall,
        fell_back=fell_back_count > 0,
        fornas_verified=fornas_verified,
        lookup_verified=lookup_only_verified,
        fornas_available=fornas_available,
        min_threshold=min_verified_floor,
    )
    body = panel.rstrip()
    if extra:
        body = body + "\n" + extra
    return response.rstrip() + "\n" + body, result


def _run_lint(
    records: list[TherapyRecord],
    pasien: dict[str, Any],
) -> tuple[list[Any], list[Any]]:
    """Run cross-drug and patient-KI lint on parsed records.

    Lazy-imported to keep pharma_validator importable when the ddi_lint
    module is removed (e.g. ad-hoc unit tests). Returns tuple of
    (ddi_alerts, ki_alerts). Either may be empty.
    """
    try:
        from sidelab.ddi_lint import (
            find_cross_drug_alerts,
            find_patient_conflicts,
        )
    except Exception:  # noqa: BLE001
        return [], []
    try:
        return find_cross_drug_alerts(records), find_patient_conflicts(records, pasien)
    except Exception:  # noqa: BLE001
        return [], []


def _is_fornas_loadable() -> bool:
    """True when the FORNAS dump is reachable on disk."""
    try:
        from sidelab.fornas_loader import load_fornas
        drugs = load_fornas().get("drugs", []) or []
    except Exception:  # noqa: BLE001
        return False
    return bool(drugs)
