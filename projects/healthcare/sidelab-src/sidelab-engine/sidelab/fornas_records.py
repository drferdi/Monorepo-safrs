# Architected and built by codieverse+.
"""Typed records for the FORNAS (Formularium Nasional Indonesia) reference set.

Aligned with two reference baselines:

  1. KMK No. HK.01.07/MENKES/1818/2024 — FORNAS addendum 677 zat aktif /
     1,143 bentuk sediaan (eff. February 2025). Source of truth for
     fornas_level, fasilitas_penyedia, and restriksi_resep.
  2. HL7 FHIR R5 MedicationKnowledge — idealised shape for interaksi,
     kontraindikasi, and dosis populations. Fields are `total=False`
     so the loader can be fed the public e-fornas dataset (which does
     NOT expose ATC/KFA/dosis/interaksi) without loss of structure.
  3. data/fornas_2026.json — the current public dump from
     e-fornas.kemkes.go.id (5.6MB / ~677 drugs). Schema notes:
        - canonical_name_en: international/non-proprietary name
        - kelas_terapi: hierarki utama > sub > sub_sub > sub_sub_sub
        - ketersediaan: enum flag (fpktp/fpktl/pp/prb/oen/program/kanker)
        - fasilitas_penyedia: list[str] (FPKTP/FPKTL/PP/PRB/OEN/PROGRAM)
        - varian: detail per-formulasi (bentuk/kekuatan/satuan)

Best practice 2026 CDSS drug-reference guidance:
  - Dosages keyed by population models (total=False, optional).
  - Interactions as structured records (level + mekanisme + manajemen).
  - Contraindications typed (`absolute` vs `relative` vs `population`).
  - Lookup fast via precomputed cross-references
    (by-name, by-ATC, by-KFA, by-kelas_terapi utama).
"""
from __future__ import annotations

from typing import Literal, TypedDict

InteractionLevel = Literal[
    "kontraindikasi", "mayor", "moderate", "minor", "tidak_signifikan"
]
FacilityLevel = Literal[
    "FKTP",
    "FPKTP",
    "FPKTL",
    "PP",
    "PRB",
    "OEN",
    "PROGRAM",
    "APOTEK",
]
FornasLevel = Literal[1, 2]
KetersediaanFlag = Literal[
    "fpktp", "fpktl", "pp", "prb", "oen", "program", "kanker"
]


class ZatAktif(TypedDict, total=False):
    nama: str
    kekuatan_per_unit_mg: float
    jumlah_per_sediaan: int


class Sediaan(TypedDict, total=False):
    bentuk: str
    kekuatan: str
    satuan: str
    kode_satuan: str
    kode_sediaan: str


class KelasTerapi(TypedDict, total=False):
    """Hierarchical therapy class (e-fornas public structure)."""
    utama: str
    sub: str
    sub_sub: str
    sub_sub_sub: str
    path: str
    ids: dict[str, int]


class Ketersediaan(TypedDict, total=False):
    """Boolean flags indicating where the drug is available."""
    fpktp: bool
    fpktl: bool
    pp: bool
    prb: bool
    oen: bool
    program: bool
    kanker: bool


class Restriksi(TypedDict, total=False):
    """Per-drug / per-therapy restrictions (e-fornas public shape)."""
    kelas_terapi: list[str]
    obat: str
    sediaan: str
    peresepan_maksimal: str


class Varian(TypedDict, total=False):
    """Single formulation variant of a canonical drug."""
    id: str
    label: str
    bentuk: str
    kekuatan: str
    satuan: str
    kode_satuan: str
    kode_sediaan: str
    terapi_path: list[str]
    restriksi: Restriksi
    ketersediaan: Ketersediaan


class DosisDewasa(TypedDict, total=False):
    indikasi: str
    rentang_dosis_per_dosis_mg: list[float]
    frekuensi_per_hari: str
    interval_jam: int
    dosis_maks_harian_mg: float


class DosisPediatri(TypedDict, total=False):
    usia_bulan_range: list[int]
    hitung_per_bb: bool
    dosis_mg_per_kg_per_dosis: list[float]
    frekuensi_per_hari: str
    dosis_maks_per_hari_mg_per_kg: float
    catatan: str


class DosisGeriatri(TypedDict, total=False):
    dosis_redup_persen: int
    monitor: list[str]


class DosisGagalGinjal(TypedDict, total=False):
    egfr_ml_per_minutes: dict[str, dict[str, float | int | str]]
    catatan: str


class DosisGagalHati(TypedDict, total=False):
    kontraindikasi_threshold: str
    dosis_redup_persen: int


class Dosis(TypedDict, total=False):
    dewasa: list[DosisDewasa]
    pediatri: list[DosisPediatri]
    geriatri: DosisGeriatri
    gagal_ginjal: DosisGagalGinjal
    gagal_hati: DosisGagalHati


class Interaksi(TypedDict, total=False):
    dengan: str
    atc_dengan: str
    level: InteractionLevel
    efek: str
    mekanisme: str
    sumber: str
    manajemen: str


class Kontraindikasi(TypedDict, total=False):
    tipe: Literal["absolute", "relative", "population"]
    syarat: str
    populasi: list[str]
    catatan: str


class FornasMetadata(TypedDict, total=False):
    """FORNAS-specific availability metadata (rich-tag form)."""
    level: FornasLevel
    addendum: str
    fasilitas: list[FacilityLevel]
    restriksi_resep: str
    program_khusus: list[str]


class FornasDrugRecord(TypedDict, total=False):
    """Single canonical drug entry within the FORNAS reference set."""

    # Identity
    id: str
    canonical_name: str
    canonical_name_en: str
    sinonim: list[str]

    # Alt-2 rich (not present in public e-fornas dump — optional)
    atc_code: str
    kfa_code: str
    zat_aktif: list[ZatAktif]
    indikasi: list[str]
    dosis: Dosis
    interaksi: list[Interaksi]
    kontraindikasi_absolut: list[Kontraindikasi]
    kontraindikasi_relatif: list[Kontraindikasi]
    efek_samping_umum: list[str]
    fornas: FornasMetadata

    # Public e-fornas payload (fornas_2026.json)
    varian_count: int
    kelas_terapi: KelasTerapi
    kelas_terapi_utama: str
    kelas_terapi_path: str
    ketersediaan: Ketersediaan
    fasilitas_penyedia: list[str]
    sediaan: list[str]
    varian: list[Varian]
    stok_puskesmas_default: str
    last_reviewed: str


class FornasIndex(TypedDict, total=False):
    by_name_lower: dict[str, str]
    by_atc: dict[str, list[str]]
    by_kfa: dict[str, list[str]]
    by_class_name: dict[str, list[str]]
    by_availability: dict[str, list[str]]


class FornasFile(TypedDict, total=False):
    version: str
    schema_version: str
    updated_at: str
    source: dict[str, str]
    notes: list[str]
    metadata: dict[str, str | int]
    drugs: list[FornasDrugRecord]
    index: FornasIndex
