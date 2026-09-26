# Architected and built by codieverse+.
"""
SIDELAB — Advanced Universal Diagnostic & Responsive Expert Yield
Sentra SideLab Project · Clinical Intelligence Platform
Architected by dr Ferdi Iskandar
"""

import functools
import json
import math
import os
import re
import subprocess
import sys
import textwrap
import threading
import time
import uuid
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from rich import box as rbox
from rich.console import Console
from rich.panel import Panel
from rich.rule import Rule
from rich.table import Table
from rich.text import Text

from sidelab.library_cache import LibraryResolverCache

# ---------------------------------------------------------------------------
# Telegram Notification (optional — safe to fail)
# ---------------------------------------------------------------------------
try:
    from sidelab.notify.message_builder import format_message
    from sidelab.notify.notification_gateway import gateway
except ImportError:

    class _NoOpGateway:
        def publish(self, text: str) -> None:
            pass

    gateway = _NoOpGateway()

    def format_message(text: str, pasien: dict, session_id: str) -> str:
        return text


try:
    from sidelab.icd import handle_icd_command

    _ICD_AVAILABLE = True
except ImportError:
    _ICD_AVAILABLE = False

    def handle_icd_command(user_input: str, console: Console) -> None:
        console.print("  [!] sidelab_icd tidak tersedia.", style="bright_red")


from sidelab.llm import (
    PROVIDER_REGISTRY,
    build_provider,
    check_backend_readiness,
    default_model_for_backend,
    render_mode_menu,
    resolve_backend_choice,
)
from sidelab.llm.local_client import available_models as local_available_models

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
SESSIONS_DIR = BASE_DIR / "sessions"
SESSIONS_DIR.mkdir(exist_ok=True)

# ---------------------------------------------------------------------------
# Audio notification — fire-and-forget sound at end of each AI response
# ---------------------------------------------------------------------------
NOTIF_SOUND_PATH = BASE_DIR / "sounds" / "notif.mp3"


def _play_notification_sound() -> None:
    """Putar notif.mp3 secara async via PowerShell MediaPlayer.
    Fire-and-forget: gagal diam-diam, tidak pernah raise."""
    if not NOTIF_SOUND_PATH.exists():
        return
    if sys.platform != "win32":
        return
    try:
        uri = NOTIF_SOUND_PATH.resolve().as_uri()
        ps_cmd = (
            "Add-Type -AssemblyName PresentationCore;"
            "$p = New-Object System.Windows.Media.MediaPlayer;"
            f"$p.Open([Uri]'{uri}');"
            "$p.Play();"
            "Start-Sleep -Seconds 4"
        )
        subprocess.Popen(
            ["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-Command", ps_cmd],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
AI_NAME = "SIDELAB"
DISPLAY_MODEL = "SideLab CDS v1"
DEFAULT_MODEL = PROVIDER_REGISTRY["local"]["default_model"]
MAX_HISTORY = 12
SEP = "=" * 70

# Onyx & Platinum — monochromatic luxury
C_BORDER = "#9EAAB8"  # Platinum     (border, frame)
C_NAME = "#C8D4DC"  # Platinum Bright (title/name)
C_LABEL = "#686870"  # Medium Grey  (labels)
C_VALUE = "#F4F4F6"  # Near White   (values)
C_DIM = "#484850"  # Dim Onyx     (secondary/dim)
C_PANEL = "#0C0C10"  # Onyx
C_PANEL_ALT = "#101014"
C_INFO = "#88A8C0"  # Cool Steel Blue
C_SUCCESS = "#6A9478"  # Sage
C_WARN = "#B8A878"  # Warm Platinum
C_ALERT = "#B87878"  # Muted Rose
C_META = "#A0ACB8"  # Cool Platinum Grey

# Palet section — monokromatik platinum, hierarki klinis jelas
SECTION_STYLES = {
    "RINGKASAN KASUS": C_META,  # cool platinum — ringkasan pembuka
    "ANAMNESIS": C_INFO,  # steel blue
    "PEMERIKSAAN FISIK": C_INFO,  # steel blue
    "ANJURAN PEMERIKSAAN": "#90B0C0",  # cool slate
    "DIAGNOSIS BANDING": "#B0A888",  # warm platinum-khaki — diferensial
    "DIAGNOSIS KERJA": C_NAME,  # platinum bright — keputusan utama
    "TATALAKSANA": C_INFO,  # steel blue
    "FARMAKOLOGI": C_INFO,  # steel blue
    "EDUKASI PASIEN": "#C0B888",  # platinum warm — edukasi adalah pilar compliance
    "KRITERIA RUJUK": C_ALERT,  # muted rose — peringatan
    "PROGNOSIS": C_LABEL,  # medium grey — outcome
}

ITEM_STYLES = {}  # semua item plain white — hanya header section yang berwarna

# Warna judul — platinum tegas
_TITLE_COLOR = "#9EAAB8"

# ---------------------------------------------------------------------------
# Session-level caches — diisi saat runtime, bukan saat import
# ---------------------------------------------------------------------------
_provider_cache: dict = {}  # backend → provider instance
_system_cache: dict = {"key": None, "val": None}  # pasien_key → system prompt str

_BADGE_TONES = {
    "info": ("#141418", C_INFO),
    "success": ("#141A16", C_SUCCESS),
    "warn": ("#1E1C14", C_WARN),
    "alert": ("#201414", C_ALERT),
    "muted": ("#181818", C_LABEL),
}

# ---------------------------------------------------------------------------
# Console
# ---------------------------------------------------------------------------
console = Console(highlight=False)


def _backend_label(backend: str) -> str:
    return PROVIDER_REGISTRY.get(backend, {}).get("label", backend)


def _print_backend_menu() -> str:
    console.print()
    console.print(
        Panel(
            render_mode_menu(),
            box=rbox.ROUNDED,
            border_style=C_INFO,
            padding=(1, 2),
            title=_panel_title("BACKEND INFERENCE"),
            style=f"on {C_PANEL}",
        )
    )
    default_label = _backend_label(resolve_backend_choice(""))
    choice = console.input(f"  Pilih mode [Enter={default_label}] > ").strip()
    backend = resolve_backend_choice(choice)
    console.print(f"  Mode aktif: {_backend_label(backend)}", style="dim grey50")
    console.print()
    return backend


def _get_backend_models(backend: str) -> list[str]:
    spec = PROVIDER_REGISTRY.get(backend, {})
    if spec.get("client") == "local":
        return local_available_models() or [spec.get("default_model", "medgemma:4b")]
    return list(spec.get("models", ()))


# ---------------------------------------------------------------------------
# Markdown stripper
# ---------------------------------------------------------------------------
_MD_HEADING = re.compile(r"^#{1,6}\s+(.+)$", re.MULTILINE)
_MD_BOLD = re.compile(r"\*{1,3}(.+?)\*{1,3}")
_MD_CODE = re.compile(r"`{1,3}(.+?)`{1,3}", re.DOTALL)
_MD_BULLET = re.compile(r"^\s*[-*+]\s+", re.MULTILINE)
_MD_BLOCKQ = re.compile(r"^\s*>\s+", re.MULTILINE)
_MD_HR = re.compile(r"^[-*_]{3,}\s*$", re.MULTILINE)


def _strip_markdown(text: str) -> str:
    text = _MD_HEADING.sub(lambda m: m.group(1).upper() + ":", text)
    text = _MD_BOLD.sub(r"\1", text)
    text = _MD_CODE.sub(r"\1", text)
    text = _MD_BULLET.sub("  ", text)
    text = _MD_BLOCKQ.sub("  ", text)
    text = _MD_HR.sub("", text)
    return text


# ---------------------------------------------------------------------------
# Safety detection layer — extracted to sidelab/safety/
# ---------------------------------------------------------------------------
from sidelab.safety import (
    RED_FLAGS,
    _EMERGENCY_DIAGNOSIS_PATTERNS,
    _EMERGENCY_HOME_CARE_PATTERNS,
    _EMERGENCY_REFERRAL_PATTERNS,
    _detect_red_flags,
    _check_emergency_response_consistency,
    _red_flag_disease_context,
    _get_red_flag_disease_details,
    _ensure_red_flag_in_diagnostic_frame,
    _ROUTINE_OUTPATIENT_DIAGNOSES,
    _ROUTINE_OUTPATIENT_PATTERNS,
    _is_trauma_red_flag,
    _suppress_routine_diagnoses_for_trauma,
    _EMERGENCY_REFERRAL_MAP,
    _ROUTINE_FOLLOWUP_KEYWORDS,
    _URGENT_REFERRAL_KEYWORDS,
    _ensure_emergency_referral_escalation,
    _ABSOLUTE_PATTERNS_RAW,
    _ABSOLUTE_PATTERNS_COMPILED,
    _detect_absolute_language,
    _enforce_provisional_language,
    finalize_clinical_output,
)
from sidelab.safety.intake_pipeline import (
    build_clinical_intake_context as _build_intake_context,
)
from sidelab.safety.output_contract import commit_final_response

# ---------------------------------------------------------------------------
# Database loader
# ---------------------------------------------------------------------------
def _load_db() -> dict:
    db = {
        "diseases_full": [],
        "diseases_144": [],
        "obat": [],
        "stok": [],
        "chains": {},
        "drug_map": [],
        "disease_vectors": {},
    }
    try:
        with open(DATA_DIR / "penyakit.json", encoding="utf-8") as f:
            db["diseases_full"] = json.load(f).get("penyakit", [])
    except Exception:
        pass
    try:
        with open(DATA_DIR / "144_penyakit_puskesmas.json", encoding="utf-8") as f:
            db["diseases_144"] = json.load(f).get("diseases", [])
    except Exception:
        pass
    try:
        with open(DATA_DIR / "obat_data.json", encoding="utf-8") as f:
            db["obat"] = json.load(f)
    except Exception:
        pass
    try:
        with open(DATA_DIR / "stok_obat.json", encoding="utf-8") as f:
            db["stok"] = json.load(f).get("stok_obat", [])
    except Exception:
        pass
    try:
        with open(DATA_DIR / "clinical-chains.json", encoding="utf-8") as f:
            db["chains"] = json.load(f)
    except Exception:
        pass
    try:
        with open(DATA_DIR / "drug_mapping.json", encoding="utf-8") as f:
            db["drug_map"] = json.load(f).get("mappings", [])
    except Exception:
        pass
    try:
        with open(DATA_DIR / "penyakit-vectors-nomic.json", encoding="utf-8") as f:
            _vdata = json.load(f)
            db["disease_vectors"] = {
                e["nama"]: e["vector"]
                for e in _vdata.get("vectors", [])
                if "nama" in e and "vector" in e
            }
    except Exception:
        pass
    return db


print(
    "  \033[2;38;2;104;104;112mMemuat basis data klinis SIDELAB...\033[0m",
    end="",
    flush=True,
)
DB = _load_db()
print("\r\033[2K", end="", flush=True)

# Index 144 diseases by id for quick pharma lookup
_D144_INDEX = {d["id"]: d for d in DB["diseases_144"] if "id" in d}

# Pre-built stok map — avoid per-query rebuild dari 277 entri
_STOK_MAP: dict = {s["nama_obat"].lower(): s for s in DB["stok"]}

# Normalized drug→stok_match map dari drug_mapping.json.
# Key: lowercase generik/alias name. Value: list of lowercase stok_match prefixes.
# Digunakan agar matching tidak bergantung pada prefix 6-karakter yang rawan false positive.
_DRUG_STOK_MATCH: dict[str, list[str]] = {}
for _dm in DB["drug_map"]:
    _patterns = [s.lower() for s in _dm.get("stok_match", []) if s]
    if not _patterns:
        continue
    for _nm in [_dm.get("generik", "")] + _dm.get("alias", []):
        _key = _nm.lower().strip()
        if _key:
            _DRUG_STOK_MATCH[_key] = _patterns
del _dm, _patterns, _nm, _key

# Pre-computed 768-dim semantic vectors (nomic-embed-text) untuk hybrid retrieval
_DISEASE_VECTORS: dict[str, list[float]] = DB.get("disease_vectors", {})


def _build_icd_indexes() -> tuple[dict, dict, dict, dict]:
    """Bangun 4 dict index ICD saat startup — O(1) pengganti linear scan."""
    full_exact: dict[str, dict] = {}
    full_prefix: dict[str, dict] = {}
    for d in DB["diseases_full"]:
        c = d.get("icd10", "").upper().strip()
        if c:
            full_exact[c] = d
            cp = c.split(".")[0][:3]
            if cp not in full_prefix:
                full_prefix[cp] = d

    d144_exact: dict[str, dict] = {}
    d144_prefix: dict[str, dict] = {}
    for d in DB["diseases_144"]:
        c = d.get("icd10", "").upper().strip()
        if c:
            d144_exact[c] = d
            cp = c.split(".")[0][:3]
            if cp not in d144_prefix:
                d144_prefix[cp] = d

    return full_exact, full_prefix, d144_exact, d144_prefix


_FULL_ICD_EXACT, _FULL_ICD_PREFIX, _D144_ICD_EXACT, _D144_ICD_PREFIX = (
    _build_icd_indexes()
)


def _load_ranked_library() -> dict:
    try:
        with open(DATA_DIR / "top100_puskesmas_diseases.json", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"source": {}, "items": []}


RANKED_LIBRARY = _load_ranked_library()


def _load_library_supplemental() -> dict:
    try:
        with open(
            DATA_DIR / "library_supplemental_entries.json", encoding="utf-8"
        ) as f:
            return json.load(f).get("entries", {})
    except Exception:
        return {}


LIBRARY_SUPPLEMENTAL = _load_library_supplemental()


def _normalize_library_key(text: str) -> str:
    text = (text or "").lower()
    text = text.replace("’", "'").replace("nafas", "napas")
    text = re.sub(r"[^a-z0-9\s]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


_FULL_BY_NAME = {
    _normalize_library_key(d.get("nama", "")): d
    for d in DB["diseases_full"]
    if d.get("nama")
}
_D144_BY_NAME = {
    _normalize_library_key(d.get("name", "")): d
    for d in DB["diseases_144"]
    if d.get("name")
}

_LIBRARY_DETAIL_OVERRIDES = {
    "rinitis akut": {
        "full_name": "Nasofaringitis Akut (Common Cold)",
    },
    "fraktur terbuka": {
        "d144_name": "Fraktur Terbuka Grade 1",
    },
    "fraktur tertutup": {
        "notes": [
            "Fraktur tertutup sangat sering membutuhkan X-ray dan penilaian ortopedi."
        ],
    },
    "gangguan psikotik": {
        "full_name": "Skizofrenia",
    },
    "vertigo": {
        "full_name": "Vertigo (Benign paroxysmal positional vertigo)",
    },
    "demam dengue": {
        "d144_icd10": "A90",
    },
    "vulnus": {
        "full_name": "Vulnus laseratum, punctum",
    },
    "pioderma": {
        "full_name": "Abses folikel rambut atau kelenjar sebasea",
    },
    "gangguan anxietas": {
        "d144_name": "Gangguan Campuran Anxietas dan Depresi",
    },
    "tinea corporis": {
        "full_name": "Tinea korporis",
        "d144_name": "Dermatofitosis (Tinea Korporis/Kruris/Pedis)",
    },
    "tinea pedis": {
        "full_name": "Tinea pedis",
        "d144_name": "Dermatofitosis (Tinea Korporis/Kruris/Pedis)",
    },
    "tinea ungium": {
        "full_name": "Tinea unguium",
    },
    "bronkopneumonia": {
        "full_name": "Pneumonia, bronkopneumonia",
        "d144_name": "Pneumonia",
    },
    "tumor payudara": {
        "full_name": "Karsinoma Mammae (Kanker Payudara)",
    },
    "sinusitis akut": {
        "d144_name": "Sinusitis Akut",
    },
    "hiperurisemia gout arthritis": {
        "full_name": "Hiperurisemia",
    },
    "hiperurisemia gout athritis": {
        "full_name": "Hiperurisemia",
    },
    "benda asing di telinga": {
        "full_name": "Benda asing",
    },
    "rinitis vasomotor": {
        "primary_icd10": "J30.0",
    },
    "konjungtivitis infeksi": {
        "primary_icd10": "H10.9",
    },
    "pitiriasis versikolor": {
        "primary_icd10": "B36.0",
    },
    "refluks gastroesofageal": {
        "primary_icd10": "K21.9",
    },
    "otitis media akut": {
        "primary_icd10": "H65",
    },
    "angina pektoris stabil": {
        "primary_icd10": "I20.9",
    },
    "gagal jantung akut dan kronik": {
        "primary_icd10": "I50.9",
    },
    "low vision": {
        "primary_icd10": "H54",
        "notes": [
            "Belum ada entri low vision yang eksplisit di knowledge base lokal saat ini."
        ],
    },
    "kejang demam": {
        "d144_icd10": "R56.0",
    },
    "mata kering": {
        "primary_icd10": "H04.1",
    },
    "stroke": {
        "primary_icd10": "I63.9",
    },
    "demam berdarah dengue": {
        "primary_icd10": "A91",
    },
    "gangguan campuran anxietas dan depresi": {
        "d144_name": "Gangguan Campuran Anxietas dan Depresi",
    },
    "varisela": {
        "full_name": "Varisela tanpa komplikasi",
        "d144_name": "Varisela (Cacar Air) tanpa Komplikasi",
    },
    "konjungtivitis alergi": {
        "full_name": "Konjungtivitis",
        "d144_name": "Konjungtivitis",
        "primary_icd10": "H10.1",
    },
    "fimosis": {
        "primary_icd10": "N47",
    },
    "hipoglikemia": {
        "primary_icd10": "E16.2",
    },
    "pielonefritis tanpa komplikasi": {
        "primary_icd10": "N10",
    },
    "perdarahan gastrointestinal": {
        "primary_icd10": "K92.9",
    },
    "retinopati diabetik": {
        "primary_icd10": "H36.0",
        "notes": [
            "Belum ada entri retinopati diabetik yang eksplisit di knowledge base lokal saat ini."
        ],
    },
    "otitis media supuratif kronik": {
        "notes": [
            "Database lokal belum memiliki entri OMSK yang eksplisit. Detail pustaka memakai data terdekat bila tersedia dan tetap perlu verifikasi klinis."
        ],
    },
    "dermatitis kontak alergi": {
        "notes": [
            "Database lokal belum memiliki entri dermatitis kontak alergi yang berdiri sendiri. Gunakan ranking ini sebagai penanda prioritas kurasi berikutnya."
        ],
    },
    "penyakit paru obstruktif kronis": {
        "notes": [
            "Database lokal belum memiliki entri PPOK yang berdiri sendiri di pustaka inti. Gunakan data ranking ini sebagai penanda prioritas kurasi berikutnya."
        ],
    },
    "hipertrofi prostat": {
        "notes": [
            "Belum ada entri BPH atau hipertrofi prostat yang eksplisit di knowledge base lokal saat ini."
        ],
    },
    "gangguan perkembangan dan perilaku pada anak dan remaja": {
        "notes": [
            "Entri ini masih bersifat programatik dan mewakili spektrum perkembangan atau perilaku anak. Perlu kurasi lanjutan bila ingin dijadikan pustaka klinis rinci."
        ],
    },
    "pterygium": {
        "notes": [
            "Belum ada entri pterygium yang eksplisit di knowledge base lokal saat ini."
        ],
    },
    "tirotoksikosis": {
        "notes": [
            "Belum ada entri tirotoksikosis yang eksplisit di knowledge base lokal saat ini."
        ],
        "primary_icd10": "E05.9",
    },
    "kanker serviks": {
        "notes": [
            "Belum ada entri kanker serviks yang eksplisit di knowledge base lokal saat ini."
        ],
        "primary_icd10": "C53.9",
    },
    "katarak pada pasien dewasa": {
        "notes": [
            "Belum ada entri katarak dewasa yang eksplisit di knowledge base lokal saat ini."
        ],
    },
    "liken simpleks kronik neurodermatitis sirkumripta": {
        "notes": [
            "Belum ada entri lichen simplex chronicus yang eksplisit di knowledge base lokal saat ini."
        ],
    },
    "thalasemia": {
        "notes": [
            "Belum ada entri thalasemia yang eksplisit di knowledge base lokal saat ini."
        ],
    },
    "kanker paru": {
        "notes": [
            "Belum ada entri kanker paru yang eksplisit di knowledge base lokal saat ini."
        ],
    },
    "hepatitis b": {
        "notes": [
            "Belum ada entri hepatitis B yang eksplisit di knowledge base lokal saat ini."
        ],
    },
    "hifema": {
        "notes": [
            "Belum ada entri hifema yang eksplisit di knowledge base lokal saat ini."
        ],
    },
}


def _find_full_by_icd(icd10: str) -> dict | None:
    icd = (icd10 or "").upper().strip()
    if not icd:
        return None
    if icd in _FULL_ICD_EXACT:
        return _FULL_ICD_EXACT[icd]
    return _FULL_ICD_PREFIX.get(icd.split(".")[0][:3])


def _find_144_by_icd(icd10: str) -> dict | None:
    icd = (icd10 or "").upper().strip()
    if not icd:
        return None
    if icd in _D144_ICD_EXACT:
        return _D144_ICD_EXACT[icd]
    return _D144_ICD_PREFIX.get(icd.split(".")[0][:3])


_library_resolver_cache: LibraryResolverCache | None = None
_resolved_cache: dict[str, dict] = {}


def _resolve_library_entry_uncached(entry: dict) -> dict:
    key = _normalize_library_key(
        entry.get("normalized_name") or entry.get("source_name", "")
    )
    override = _LIBRARY_DETAIL_OVERRIDES.get(key, {})
    primary_icd10 = override.get("primary_icd10", entry.get("primary_icd10", ""))
    supplemental = LIBRARY_SUPPLEMENTAL.get(key, {})

    full = None
    d144 = None
    full_source = "missing"
    d144_source = "missing"

    full_name = override.get("full_name")
    if full_name:
        full = _FULL_BY_NAME.get(_normalize_library_key(full_name))
        if full:
            full_source = "core"
    if not full:
        full = _FULL_BY_NAME.get(
            _normalize_library_key(entry.get("normalized_name", ""))
        )
        if full:
            full_source = "core"
    if not full:
        full = _FULL_BY_NAME.get(_normalize_library_key(entry.get("source_name", "")))
        if full:
            full_source = "core"
    if not full:
        full = _find_full_by_icd(primary_icd10)
        if full:
            full_source = "core"
    if not full and supplemental.get("full"):
        full = supplemental.get("full")
        full_source = "supplemental"

    d144_name = override.get("d144_name")
    if d144_name:
        d144 = _D144_BY_NAME.get(_normalize_library_key(d144_name))
        if d144:
            d144_source = "core"
    d144_icd10 = override.get("d144_icd10")
    if not d144 and d144_icd10:
        d144 = _find_144_by_icd(d144_icd10)
        if d144:
            d144_source = "core"
    if not d144:
        d144 = _D144_BY_NAME.get(
            _normalize_library_key(entry.get("normalized_name", ""))
        )
        if d144:
            d144_source = "core"
    if not d144:
        d144 = _D144_BY_NAME.get(_normalize_library_key(entry.get("source_name", "")))
        if d144:
            d144_source = "core"
    if not d144:
        d144 = _find_144_by_icd(primary_icd10)
        if d144:
            d144_source = "core"
    if not d144 and supplemental.get("d144"):
        d144 = supplemental.get("d144")
        d144_source = "supplemental"

    return {
        "entry": entry,
        "full": full,
        "d144": d144,
        "notes": override.get("notes", []),
        "full_source": full_source,
        "d144_source": d144_source,
    }


def _resolve_library_entry(entry: dict) -> dict:
    global _library_resolver_cache, _resolved_cache
    if (
        _library_resolver_cache is None
        or _library_resolver_cache.cache is not _resolved_cache
    ):
        _library_resolver_cache = LibraryResolverCache(
            lambda current_entry: _resolve_library_entry_uncached(current_entry)
        )
        _library_resolver_cache.cache = _resolved_cache
    return _library_resolver_cache.resolve(entry)


def _library_lines(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [line.strip() for line in value.splitlines() if line.strip()]
    if isinstance(value, list):
        lines: list[str] = []
        for item in value:
            if isinstance(item, str):
                clean = item.strip()
                if clean:
                    lines.append(clean)
            elif isinstance(item, dict):
                compact = ", ".join(
                    f"{k}: {v}"
                    for k, v in item.items()
                    if isinstance(v, str) and v.strip()
                )
                if compact:
                    lines.append(compact)
        return lines
    return []


def _library_pharma_lines(d144: dict | None) -> list[str]:
    if not d144:
        return []
    pharmacotherapy = d144.get("pharmacotherapy", {})
    lines: list[str] = []
    for key, label in [
        ("first_line", "Lini 1"),
        ("second_line", "Lini 2"),
        ("prophylaxis", "Profilaksis"),
    ]:
        for item in pharmacotherapy.get(key, [])[:4]:
            if not isinstance(item, dict):
                continue
            drug_name = item.get("drug", "")
            parts = [
                drug_name,
                item.get("dose", ""),
                item.get("route", ""),
                item.get("frequency", ""),
                item.get("duration", ""),
            ]
            line = " ".join(
                part.strip() for part in parts if isinstance(part, str) and part.strip()
            )
            if line:
                lines.append(f"{label}: {line}")
                # VAL-SAFETY-006: inject DDI + Kontraindikasi for every drug
                found = _lookup_pharma_info(drug_name)
                lines.append("│")
                if found:
                    lines.append(f"├─ DDI: {found['ddi']}")
                    lines.append(f"└─ Kontraindikasi: {found['ki']}")
                else:
                    lines.append("├─ DDI: Tidak tersedia di database lokal")
                    lines.append("└─ Kontraindikasi: Tidak tersedia di database lokal")
                lines.append("")
    return lines


def _library_source_marker(resolved: dict) -> str:
    full_source = resolved["full_source"]
    d144_source = resolved["d144_source"]
    if full_source == "core" and d144_source == "core":
        return "[C]"
    if full_source == "supplemental" or d144_source == "supplemental":
        return "[S]"
    return "[M]"


def _library_system_bucket(entry: dict, resolved: dict) -> str:
    full = resolved["full"] or {}
    d144 = resolved["d144"] or {}
    key = _normalize_library_key(
        entry.get("normalized_name") or entry.get("source_name", "")
    )
    body = " ".join(
        [
            str(full.get("body_system", "")),
            str(d144.get("system", "")),
            " ".join(str(tag) for tag in d144.get("tags", [])),
        ]
    ).lower()

    if (
        "indera" in body
        or "mata" in body
        or key
        in {
            "low vision",
            "mata kering",
            "katarak pada pasien dewasa",
            "retinopati diabetik",
            "konjungtivitis alergi",
            "konjungtivitis infeksi",
            "hifema",
            "pterygium",
            "blefaritis",
            "hordeolum",
        }
    ):
        return "mata"
    if (
        "saraf" in body
        or "neurolog" in body
        or key
        in {"vertigo", "tension headache", "stroke", "bell palsy", "kejang demam"}
    ):
        return "saraf"
    if (
        "respirasi" in body
        or "paru" in body
        or key
        in {
            "penyakit paru obstruktif kronis",
            "bronkopneumonia",
            "kanker paru",
            "asma bronkial",
            "influenza",
            "faringitis akut",
            "sinusitis akut",
            "rinitis akut",
            "rinitis alergi",
            "rinitis vasomotor",
        }
    ):
        return "respirasi"
    if (
        "kardiovaskular" in body
        or "jantung" in body
        or key
        in {
            "hipertensi esensial",
            "infark miokard",
            "angina pektoris stabil",
            "gagal jantung akut dan kronik",
        }
    ):
        return "kardiovaskular"
    if (
        "digestif" in body
        or "pencernaan" in body
        or "digest" in body
        or key
        in {
            "gastritis",
            "gastroenteritis kolera dan giardiasis",
            "ulkus mulut",
            "demam tifoid",
            "refluks gastroesofageal",
            "perdarahan gastrointestinal",
        }
    ):
        return "digestif"
    if (
        "endokrin" in body
        or "metabol" in body
        or "nutrisi" in body
        or key
        in {
            "diabetes mellitus tipe 2",
            "diabetes mellitus tipe 1",
            "lipidemia",
            "hiperurisemia gout arthritis",
            "hiperurisemia gout athritis",
            "hipoglikemia",
            "tirotoksikosis",
            "malnutrisi energi protein",
        }
    ):
        return "endokrin"
    if (
        "integumen" in body
        or "kulit" in body
        or key
        in {
            "dermatitis atopik",
            "dermatitis kontak alergi",
            "dermatitis kontak iritan",
            "liken simpleks kronik neurodermatitis sirkumripta",
            "tinea corporis",
            "tinea pedis",
            "tinea ungium",
            "pitiriasis versikolor",
            "urtikaria",
            "pioderma",
            "impetigo",
            "luka bakar derajat i dan ii",
            "skabies",
            "milaria",
            "dermatitis popok",
            "dermatitis seboroik",
        }
    ):
        return "kulit"
    if (
        "reproduksi" in body
        or "obstetri" in body
        or "ginek" in body
        or key
        in {
            "mastitis",
            "kanker serviks",
            "tumor payudara",
            "anemia defisiensi besi pada kehamilan",
        }
    ):
        return "obgyn"
    if "tht" in body or key in {
        "serumen prop",
        "otitis media supuratif kronik",
        "otitis eksterna",
        "otitis media akut",
        "epistaksis",
        "benda asing di telinga",
    }:
        return "tht"
    if (
        "ginjal" in body
        or "urolog" in body
        or key
        in {
            "infeksi saluran kemih",
            "hipertrofi prostat",
            "fimosis",
            "pielonefritis tanpa komplikasi",
        }
    ):
        return "urologi"
    return "umum"


def _library_search_terms(entry: dict, resolved: dict) -> set[str]:
    full = resolved["full"] or {}
    d144 = resolved["d144"] or {}
    terms = {
        _normalize_library_key(entry.get("source_name", "")),
        _normalize_library_key(entry.get("normalized_name", "")),
        _normalize_library_key(entry.get("primary_icd10", "")),
        _normalize_library_key(entry.get("source_icd10", "")),
        _normalize_library_key(full.get("nama", "")),
        _normalize_library_key(d144.get("name", "")),
        _library_system_bucket(entry, resolved),
    }
    for tag in d144.get("tags", []):
        terms.add(_normalize_library_key(str(tag)))
    body_system = full.get("body_system")
    if body_system:
        terms.add(_normalize_library_key(str(body_system)))
    return {term for term in terms if term}


def _search_library_items(items: list[dict], query: str) -> list[dict]:
    q = _normalize_library_key(query)
    if not q:
        return items
    scored: list[tuple[int, int, dict]] = []
    q_tokens = q.split()
    for item in items:
        resolved = _resolve_library_entry(item)
        terms = _library_search_terms(item, resolved)
        score = 0
        for term in terms:
            if term == q:
                score = max(score, 120)
            elif q in term:
                score = max(score, 90)
            elif term in q:
                score = max(score, 75)
            else:
                overlap = sum(1 for token in q_tokens if token in term)
                if overlap:
                    score = max(score, overlap * 20)
        if score:
            scored.append((score, -item.get("total_cases", 0), item))
    scored.sort(key=lambda x: (-x[0], x[1], x[2].get("rank", 999)))
    return [item for _, _, item in scored]


def _filter_library_items(items: list[dict], system_filter: str | None) -> list[dict]:
    if not system_filter or system_filter == "all":
        return items
    filtered: list[dict] = []
    for item in items:
        resolved = _resolve_library_entry(item)
        if _library_system_bucket(item, resolved) == system_filter:
            filtered.append(item)
    return filtered


_LIBRARY_FILTER_OPTIONS = (
    "mata",
    "saraf",
    "respirasi",
    "kardiovaskular",
    "digestif",
    "endokrin",
    "kulit",
    "obgyn",
    "tht",
    "urologi",
    "all",
)


def _print_library_list(
    items: list[dict],
    title: str,
    page: int = 1,
    page_size: int = 50,
    system_filter: str | None = None,
    search_query: str | None = None,
) -> None:
    source = RANKED_LIBRARY.get("source", {})
    total_items = len(items)
    total_pages = max((total_items + page_size - 1) // page_size, 1)
    page = max(1, min(page, total_pages))
    start_idx = (page - 1) * page_size
    visible_items = items[start_idx : start_idx + page_size]

    console.print()
    console.print(
        Panel(
            Text(title, style="bold #7CB9E8"),
            box=rbox.ROUNDED,
            border_style="#274C77",
            padding=(0, 1),
            expand=True,
            style=f"on {C_PANEL}",
        )
    )
    if source:
        summary = Table.grid(expand=True)
        summary.add_column(ratio=1)
        summary.add_row(
            _kv_line(
                [
                    ("Sumber", str(source.get("sheet", "-"))),
                    (
                        "Periode",
                        f"{source.get('period_from', '-')} s/d {source.get('period_to', '-')}",
                    ),
                ]
            )
        )
        summary.add_row(
            _kv_line(
                [
                    ("Halaman", f"{page}/{total_pages}"),
                    (
                        "Ranking",
                        f"{start_idx + 1}-{start_idx + len(visible_items)} dari {total_items}",
                    ),
                ]
            )
        )
        if system_filter and system_filter != "all":
            summary.add_row(_kv_line([("Filter sistem", system_filter)]))
        if search_query:
            summary.add_row(_kv_line([("Pencarian", search_query)]))
        console.print(
            Panel(
                summary,
                box=rbox.ROUNDED,
                border_style=C_DIM,
                padding=(0, 1),
                style=f"on {C_PANEL_ALT}",
            )
        )
        console.print()

    list_table = Table(
        box=rbox.SIMPLE_HEAVY,
        border_style=C_DIM,
        expand=True,
        show_header=True,
        header_style=f"bold {C_META}",
        pad_edge=False,
    )
    list_table.add_column("#", width=4, justify="right")
    list_table.add_column("Sumber", width=8, justify="center")
    list_table.add_column("Penyakit", ratio=5)
    list_table.add_column("ICD", width=8)
    list_table.add_column("Kasus", width=8, justify="right")
    list_table.add_column("Sistem", ratio=2)

    for item in visible_items:
        name = item.get("normalized_name") or item.get("source_name", "-")
        code = item.get("primary_icd10", "-")
        total = item.get("total_cases", 0)
        resolved = _resolve_library_entry(item)
        marker = _library_source_marker(resolved)
        system_bucket = _library_system_bucket(item, resolved)
        list_table.add_row(
            str(item.get("rank", 0)),
            marker,
            f"[{C_VALUE}]{name}[/]",
            f"[{C_META}]{code}[/]",
            f"[{C_VALUE}]{total}[/]",
            f"[{C_INFO}]{system_bucket}[/]",
        )
    console.print(
        Panel(
            list_table,
            box=rbox.ROUNDED,
            border_style=C_DIM,
            padding=(0, 1),
            style=f"on {C_PANEL}",
        )
    )
    console.print()
    helper = Table.grid(expand=True)
    helper.add_column(ratio=1)
    helper.add_row(
        Text(
            "Navigasi: nomor untuk buka | n halaman berikutnya | p halaman sebelumnya | Enter kembali",
            style="dim grey70",
        )
    )
    helper.add_row(
        Text(f"Filter cepat: {' | '.join(_LIBRARY_FILTER_OPTIONS)}", style="dim grey70")
    )
    helper.add_row(
        Text("Pencarian cerdas: nama, ICD, tag, atau sistem klinis", style="dim grey70")
    )
    helper.add_row(
        Text(
            "Marker sumber: [C]=core, [S]=supplemental terlibat, [M]=metadata only",
            style="dim grey70",
        )
    )
    console.print(
        Panel(
            helper,
            box=rbox.ROUNDED,
            border_style=C_DIM,
            padding=(0, 1),
            style=f"on {C_PANEL_ALT}",
        )
    )
    console.print()


def _print_library_detail(entry: dict) -> None:
    resolved = _resolve_library_entry(entry)
    full = resolved["full"]
    d144 = resolved["d144"]
    notes = resolved["notes"]
    full_source = resolved["full_source"]
    d144_source = resolved["d144_source"]

    title_name = entry.get("normalized_name") or entry.get("source_name", "Unknown")
    icd10 = entry.get("primary_icd10", "-")
    total = entry.get("total_cases", 0)
    system_bucket = _library_system_bucket(entry, resolved)
    if full_source == "core" and d144_source == "core":
        source_visual = "core/core"
    elif full_source == "supplemental" and d144_source == "supplemental":
        source_visual = "supplemental/supplemental"
    elif full_source == "missing" and d144_source == "missing":
        source_visual = "missing"
    else:
        source_visual = f"{full_source}/{d144_source}"

    sections: list[tuple[str, list[str]]] = [
        (
            "IDENTITAS PUSTAKA",
            [
                f"Ranking kasus: #{entry.get('rank', '-')}",
                f"Nama sumber: {entry.get('source_name', '-')}",
                f"Nama normalisasi: {title_name}",
                f"ICD-10 utama: {icd10}",
                f"Total kasus: {total}",
                f"Sistem klinis: {system_bucket}",
                f"Sumber detail: {source_visual}",
            ],
        ),
    ]

    definisi_lines = _library_lines(full.get("definisi") if full else None)
    if definisi_lines:
        sections.append(("DEFINISI", definisi_lines[:2]))

    gejala_lines = _library_lines(full.get("gejala_klinis") if full else None)
    if gejala_lines:
        sections.append(("GAMBARAN KLINIS", gejala_lines[:8]))

    fisik_lines = _library_lines(full.get("pemeriksaan_fisik") if full else None)
    if fisik_lines:
        sections.append(("PEMERIKSAAN FISIK", fisik_lines[:6]))

    red_flag_lines = _library_lines(full.get("red_flags") if full else None)
    if red_flag_lines:
        sections.append(("RED FLAGS", red_flag_lines[:6]))

    non_pharma_lines = _library_lines(d144.get("non_pharmacotherapy") if d144 else None)
    if non_pharma_lines:
        sections.append(("TATALAKSANA NON-FARMAKOLOGI", non_pharma_lines[:6]))

    pharma_lines = _library_pharma_lines(d144)
    if pharma_lines:
        sections.append(("FARMAKOTERAPI", pharma_lines[:8]))

    referral_lines = []
    referral_lines.extend(
        _library_lines(full.get("kriteria_rujukan") if full else None)
    )
    referral_lines.extend(
        _library_lines(d144.get("referral_criteria") if d144 else None)
    )
    if referral_lines:
        deduped: list[str] = []
        seen: set[str] = set()
        for line in referral_lines:
            norm = _normalize_library_key(line)
            if norm and norm not in seen:
                seen.add(norm)
                deduped.append(line)
        sections.append(("KRITERIA RUJUK", deduped[:8]))

    if d144 and d144.get("tags"):
        sections.append(("TAGS", [", ".join(d144.get("tags", []))]))

    if notes:
        sections.append(("CATATAN KURASI", notes))

    if not full and not d144:
        sections.append(
            (
                "STATUS DATA",
                [
                    "Detail klinis lengkap belum ditemukan di database lokal SIDELAB. Entri ini masih tampil karena termasuk top 50 beban kasus."
                ],
            )
        )

    _print_template(
        f"LIBRARY 100 — {title_name.upper()} [{icd10}]",
        "#7CB9E8",
        sections,
    )


def _open_library(
    page: int = 1,
    page_size: int = 50,
    title: str = "PUSTAKA 100 PENYAKIT PRIORITAS PUSKESMAS",
) -> None:
    base_items = RANKED_LIBRARY.get("items", [])
    if not base_items:
        console.print("  Pustaka ranked diseases belum tersedia.", style="bright_red")
        console.print()
        return

    current_page = page
    current_filter = "all"
    current_query = ""
    while True:
        filtered_items = _filter_library_items(base_items, current_filter)
        if current_query:
            filtered_items = _search_library_items(filtered_items, current_query)
        _print_library_list(
            filtered_items,
            title=title,
            page=current_page,
            page_size=page_size,
            system_filter=current_filter,
            search_query=current_query,
        )
        choice = console.input(
            "  Pilih nomor / cari nama (Enter untuk kembali): "
        ).strip()
        if not choice:
            console.print()
            return

        if choice.lower() == "n":
            max_page = max((len(filtered_items) + page_size - 1) // page_size, 1)
            current_page = min(current_page + 1, max_page)
            console.print()
            continue
        if choice.lower() == "p":
            current_page = max(current_page - 1, 1)
            console.print()
            continue
        lowered_choice = choice.lower()
        if lowered_choice in _LIBRARY_FILTER_OPTIONS:
            current_filter = lowered_choice
            current_query = ""
            current_page = 1
            console.print()
            continue

        selected = None
        if choice.isdigit():
            idx = int(choice)
            selected = next(
                (item for item in filtered_items if item.get("rank") == idx), None
            )
        else:
            current_query = choice
            current_page = 1
            matches = _search_library_items(
                _filter_library_items(base_items, current_filter), current_query
            )
            if len(matches) == 1:
                selected = matches[0]
            elif len(matches) > 1:
                console.print()
                console.print("  Ditemukan beberapa kandidat:", style="#7CB9E8")
                for item in matches[:8]:
                    console.print(
                        f"  {item.get('rank', 0):>2}. {item.get('normalized_name', item.get('source_name', '-'))}",
                        style="grey82",
                    )
                console.print()
                continue
            elif (
                lowered_choice.endswith("i")
                and lowered_choice not in _LIBRARY_FILTER_OPTIONS
            ):
                console.print(
                    f"  Filter '{choice}' tidak dikenal. Gunakan salah satu: {' | '.join(_LIBRARY_FILTER_OPTIONS)}",
                    style="bright_red",
                )
                console.print()
                current_query = ""
                continue

        if not selected:
            console.print("  Entri tidak ditemukan.", style="bright_red")
            console.print()
            continue

        _print_library_detail(selected)
        back = console.input("  Tekan Enter untuk kembali ke daftar: ")
        if back is not None:
            console.print()


# ---------------------------------------------------------------------------
# RAG v3 — TF-IDF scoring (term specificity aware)
# ---------------------------------------------------------------------------
_STOP = {
    "yang",
    "dan",
    "atau",
    "pada",
    "dari",
    "dengan",
    "tidak",
    "ada",
    "untuk",
    "sudah",
    "sejak",
    "selama",
    "dalam",
    "lebih",
    "sangat",
    # konteks konsultasi & demografis — bukan gejala klinis
    "pasien",
    "pria",
    "wanita",
    "laki",
    "usia",
    "umur",
    "tahun",
    "hari",
    "minggu",
    "bulan",
    "jam",
    "menit",
    "datang",
    "keluhan",
    "mengeluh",
    "mengalami",
    "dirasakan",
    "beberapa",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "kali",
    "sudah",
    "baru",
    "lama",
    "mulai",
    # kata tindakan/kuantitas umum — tidak diskriminatif sebagai gejala
    "sering",
    "buang",
    "saat",
    "besar",
    "kecil",
    "sudah",
    "bisa",
    "baru",
    "juga",
    "masih",
    "pagi",
    "malam",
    "terasa",
    "terasa",
    "terjadi",
    "bila",
}

# Term generik yang tidak boleh dapat bonus nama penyakit
_GENERIC_TERMS = {
    "akut",
    "kronik",
    "berat",
    "ringan",
    "episodik",
    "primer",
    "sekunder",
    "parah",
    "sedang",
    "tanpa",
    "dengan",
    "tidak",
}

# Token gejala yang terlalu umum dan tidak boleh mendominasi ranking sendirian.
_WEAK_QUERY_TERMS = {
    "nyeri",
    "sakit",
    "pegal",
    "linu",
    "ngilu",
    "tekan",
    "panas",
    "demam",
    "pusing",
    "lemas",
    "mual",
    "muntah",
}

_ANATOMIC_TERMS = {
    "kepala",
    "mata",
    "telinga",
    "hidung",
    "tenggorok",
    "leher",
    "bahu",
    "dada",
    "punggung",
    "perut",
    "ulu",
    "epigastrium",
    "pinggang",
    "ginjal",
    "kemih",
    "kencing",
    "vagina",
    "rahim",
    "payudara",
    "paha",
    "lutut",
    "betis",
    "kaki",
    "tangan",
    "jari",
    "pergelangan",
    "sendi",
    "persendian",
    "otot",
    "siku",
    "tumit",
    "tumor",
    "kulit",
    "paru",
    "rlq",
    "ruq",
    "llq",
    "luq",
    "presinkop",
}

_QUERY_NORMALIZATION_MAP = {
    "persendian": "sendi",
    "per-sendi-an": "sendi",
    "nyeri persendian": "nyeri sendi",
    "sakit persendian": "nyeri sendi",
    "sendi-sendi": "sendi",
    "perut kanan bawah": "rlq",
    "kuadran kanan bawah": "rlq",
    "right lower quadrant": "rlq",
    "perut kanan atas": "ruq",
    "kuadran kanan atas": "ruq",
    "right upper quadrant": "ruq",
    "perut kiri bawah": "llq",
    "kuadran kiri bawah": "llq",
    "left lower quadrant": "llq",
    "perut kiri atas": "luq",
    "kuadran kiri atas": "luq",
    "left upper quadrant": "luq",
    "nyeri ulu hati": "nyeri epigastrium",
    "sakit ulu hati": "nyeri epigastrium",
    "ulu hati": "epigastrium",
    "kencing sakit": "disuria",
    "mau pingsan": "presinkop",
    "berkunang kunang": "presinkop",
    "berkunang-kunang": "presinkop",
    "serasa melayang": "presinkop",
    "pusing berputar": "vertigo",
    "kepala berputar": "vertigo",
}

_SHORT_QUERY_CANDIDATE_HINTS: dict[str, list[str]] = {
    "sendi": ["artritis", "osteoartritis", "gout", "mialgia"],
    "otot": ["mialgia", "fibromialgia", "myositis"],
    "kepala": ["headache", "migren", "vertigo", "stroke"],
    "epigastrium": ["dispepsia", "gastritis", "refluks", "ulkus"],
    "perut": ["dispepsia", "gastritis", "gastroenteritis", "appendisitis"],
    "rlq": ["appendisitis"],
    "ruq": ["hepatitis", "gastritis"],
    "llq": ["kolitis", "gastroenteritis"],
    "luq": ["gastritis", "dispepsia"],
    "dada": ["angina", "infark", "refluks", "mialgia"],
    "batuk": ["bronkitis", "pneumonia", "tuberkulosis", "asma"],
    "sesak": ["asma", "gagal jantung", "pneumonia", "ppok"],
    "pusing": ["vertigo", "sinkop", "hipoglikemia", "headache"],
    "vertigo": ["vertigo"],
    "presinkop": ["sinkop", "hipoglikemia", "anemia"],
    "mata": ["konjungtivitis", "mata kering", "hordeolum"],
    "kemih": ["sistitis", "pielonefritis", "batu"],
    "disuria": ["sistitis", "uretritis", "pielonefritis"],
}

_SHORT_QUERY_FOLLOWUPS: dict[str, list[str]] = {
    "sendi": [
        "sendi mana yang terkena",
        "satu sendi atau banyak sendi",
        "ada bengkak, kemerahan, atau rasa panas",
        "lebih nyeri saat gerak atau saat istirahat",
    ],
    "epigastrium": [
        "nyeri terkait makan atau saat lapar",
        "ada mual, muntah, kembung, atau rasa asam di mulut",
        "ada BAB hitam atau muntah darah",
        "nyeri menjalar ke dada atau punggung",
    ],
    "perut": [
        "lokasi nyeri perut paling dominan",
        "ada muntah, diare, konstipasi, atau demam",
        "nyeri menetap atau hilang timbul",
        "ada defans, distensi, atau BAB hitam",
    ],
    "rlq": [
        "nyeri mulai dari ulu hati atau sekitar pusar lalu pindah ke kanan bawah",
        "ada mual, muntah, atau demam",
        "nyeri bertambah saat berjalan, batuk, atau ditekan lepas",
        "ada defans atau perut tegang",
    ],
    "ruq": [
        "ada demam, ikterus, atau mual muntah",
        "nyeri setelah makan berlemak atau tidak",
        "nyeri menjalar ke bahu kanan atau punggung",
        "ada urin gelap atau feses pucat",
    ],
    "kepala": [
        "lokasi nyeri kepala dan sifat nyeri",
        "ada mual, fotofobia, defisit neurologis, atau demam",
        "mendadak sekali atau bertahap",
        "ada riwayat trauma atau hipertensi",
    ],
    "dada": [
        "nyeri seperti tertindih, terbakar, atau nyeri tekan lokal",
        "menjalar ke lengan kiri, rahang, atau punggung atau tidak",
        "dipicu aktivitas, napas, gerak, atau setelah makan",
        "ada sesak, keringat dingin, atau regurgitasi asam",
    ],
    "sesak": [
        "sejak kapan sesak muncul",
        "ada batuk, mengi, atau nyeri dada",
        "sesak saat aktivitas atau istirahat",
        "ada saturasi rendah atau napas cepat",
    ],
    "pusing": [
        "pusing berputar atau melayang",
        "ada mual, tinnitus, atau gangguan pendengaran",
        "ada lemas, pucat, atau sinkop",
        "ada defisit neurologis fokal",
    ],
    "vertigo": [
        "pusing berputar dipicu perubahan posisi atau tidak",
        "ada mual muntah, tinnitus, atau gangguan pendengaran",
        "ada nistagmus atau gangguan berjalan",
        "ada kelemahan anggota gerak atau bicara pelo",
    ],
    "presinkop": [
        "ada rasa melayang, gelap, atau mau pingsan",
        "dipicu berdiri lama, dehidrasi, atau terlambat makan",
        "ada berdebar, keringat dingin, atau pucat",
        "sempat sinkop atau hampir jatuh atau tidak",
    ],
}

_PHRASE_CANDIDATE_HINTS: dict[str, list[str]] = {
    "rlq": ["appendisitis"],
    "ruq": ["hepatitis", "gastritis"],
    "llq": ["kolitis", "gastroenteritis"],
    "luq": ["gastritis", "dispepsia"],
    "tertindih": ["angina", "infark"],
    "menjalar lengan": ["angina", "infark"],
    "lengan kiri": ["angina", "infark"],
    "keringat dingin": ["angina", "infark"],
    "regurgitasi": ["refluks", "dispepsia"],
    "asam": ["refluks", "dispepsia"],
    "terbakar": ["refluks"],
    "nyeri tekan": ["mialgia"],
    "saat ditekan": ["mialgia"],
    "saat gerak": ["mialgia"],
    "vertigo": ["vertigo"],
    "presinkop": ["sinkop", "hipoglikemia"],
    "nyeri kepala": ["headache", "migren"],
}

_PHRASE_SYNDROME_TAGS: dict[str, str] = {
    "rlq": "abdominal-rlq",
    "ruq": "abdominal-ruq",
    "llq": "abdominal-llq",
    "luq": "abdominal-luq",
    "epigastrium": "abdominal-epigastric",
    "tertindih": "chest-cardiac-like",
    "menjalar lengan": "chest-cardiac-like",
    "lengan kiri": "chest-cardiac-like",
    "keringat dingin": "chest-cardiac-like",
    "regurgitasi": "chest-gerd-like",
    "asam": "chest-gerd-like",
    "terbakar": "chest-gerd-like",
    "nyeri tekan": "chest-wall-like",
    "saat ditekan": "chest-wall-like",
    "saat gerak": "chest-wall-like",
    "vertigo": "dizziness-vertigo-like",
    "presinkop": "dizziness-presyncope-like",
    "nyeri kepala": "dizziness-headache-like",
}

_SYNDROME_SCORE_RULES: dict[str, dict[str, list[str]]] = {
    "abdominal-rlq": {
        "boost": ["appendisitis"],
        "penalize": ["gastritis", "dispepsia", "refluks"],
    },
    "abdominal-ruq": {
        "boost": ["hepatitis", "gastritis"],
        "penalize": ["appendisitis"],
    },
    "abdominal-epigastric": {
        "boost": ["dispepsia", "gastritis", "refluks"],
        "penalize": ["appendisitis", "ileus", "hernia"],
    },
    "chest-cardiac-like": {
        "boost": ["angina", "infark", "iskemik"],
        "penalize": ["refluks", "dispepsia", "mialgia"],
    },
    "chest-gerd-like": {
        "boost": ["refluks", "dispepsia", "gastritis"],
        "penalize": ["angina", "infark", "iskemik"],
    },
    "chest-wall-like": {
        "boost": ["mialgia"],
        "penalize": ["angina", "infark", "iskemik"],
    },
    "dizziness-vertigo-like": {
        "boost": ["vertigo"],
        "penalize": ["headache", "migren", "sinkop"],
    },
    "dizziness-presyncope-like": {
        "boost": ["sinkop", "hipoglik", "anemia"],
        "penalize": ["vertigo", "headache", "migren"],
    },
    "dizziness-headache-like": {
        "boost": ["headache", "migren"],
        "penalize": ["vertigo", "sinkop"],
    },
}

_SEVERE_DISEASE_NAME_TERMS = {
    "perdarahan",
    "hematemesis",
    "melena",
    "syok",
    "ruptur",
    "infark",
    "stroke",
    "meningitis",
    "anafilaksis",
    "ektopik",
    "ensefalitis",
    "karsinoma",
    "ileus",
    "obstruktif",
    "strangulata",
    "inkarserata",
}

_SEVERE_QUERY_CUES = {
    "darah",
    "perdarahan",
    "melena",
    "hematemesis",
    "pingsan",
    "sinkop",
    "sesak berat",
    "tidak sadar",
    "kelumpuhan",
    "afasia",
    "hemiplegia",
    "kejang",
    "syok",
    "kaku kuduk",
    "thunderclap",
}

# Context klinis → body system hint (query mengandung kata ini = konteks sistem tertentu)
_BODY_CONTEXT: dict[str, str] = {
    # OB/GYN
    "hamil": "SISTEM REPRODUKSI",
    "kehamilan": "SISTEM REPRODUKSI",
    "partus": "SISTEM REPRODUKSI",
    "persalinan": "SISTEM REPRODUKSI",
    "nifas": "SISTEM REPRODUKSI",
    "postpartum": "SISTEM REPRODUKSI",
    "gestasi": "SISTEM REPRODUKSI",
    "ektopik": "SISTEM REPRODUKSI",
    "menstruasi": "SISTEM REPRODUKSI",
    "haid": "SISTEM REPRODUKSI",
    "mens": "SISTEM REPRODUKSI",
    "keguguran": "SISTEM REPRODUKSI",
    "melahirkan": "SISTEM REPRODUKSI",
    "bersalin": "SISTEM REPRODUKSI",
    "lahir": "SISTEM REPRODUKSI",
    "bayi": "SISTEM REPRODUKSI",
    "janin": "SISTEM REPRODUKSI",
    "plasenta": "SISTEM REPRODUKSI",
    "trimester": "SISTEM REPRODUKSI",
    "gravida": "SISTEM REPRODUKSI",
    # Respirasi
    "batuk": "SISTEM RESPIRASI",
    "sesak": "SISTEM RESPIRASI",
    "napas": "SISTEM RESPIRASI",
    "paru": "SISTEM RESPIRASI",
    # GI
    "bab": "SALURAN PENCERNAAN",
    "feses": "SALURAN PENCERNAAN",
    "perut": "SISTEM DIGESTIF",
    "epigastrium": "SISTEM DIGESTIF",
    "rlq": "SISTEM DIGESTIF",
    "ruq": "SISTEM DIGESTIF",
    "llq": "SISTEM DIGESTIF",
    "luq": "SISTEM DIGESTIF",
    # Neurologi / kepala
    "kepala": "SISTEM SARAF",
    "migren": "SISTEM SARAF",
    "vertigo": "SISTEM SARAF",
    "kejang": "SISTEM SARAF",
    "presinkop": "SISTEM KARDIOVASKULAR",
    # Muskuloskeletal
    "sendi": "SISTEM MUSKULOSKELETAL",
    "persendian": "SISTEM MUSKULOSKELETAL",
    "otot": "SISTEM MUSKULOSKELETAL",
    "lutut": "SISTEM MUSKULOSKELETAL",
    "bahu": "SISTEM MUSKULOSKELETAL",
    "siku": "SISTEM MUSKULOSKELETAL",
    "pergelangan": "SISTEM MUSKULOSKELETAL",
    "jari": "SISTEM MUSKULOSKELETAL",
    "asam": "SISTEM MUSKULOSKELETAL",
    "gout": "SISTEM MUSKULOSKELETAL",
    "artritis": "SISTEM MUSKULOSKELETAL",
    "arthritis": "SISTEM MUSKULOSKELETAL",
    "pegal": "SISTEM MUSKULOSKELETAL",
    "ngilu": "SISTEM MUSKULOSKELETAL",
    # Indera — NEGATIF: kalau query tidak ada kata indera, kurangi skor penyakit indera
}

# Term patognomonik — langsung boost penyakit spesifik (bukan dari gejala_klinis)
# Hint adalah substring dari nama penyakit — harus cukup spesifik (minimal 6 karakter)
_PATHO_TERMS: dict[str, list[str]] = {
    "ikterus": ["hepatitis", "leptospirosis", "sirosis", "kolestasis", "malaria"],
    "jaundice": ["hepatitis", "leptospirosis"],
    "tenesmus": ["disentri", "kolitis", "amoebiasis"],
    "mengi": ["asma", "bronkitis"],
    "wheezing": ["asma"],
    "trismus": ["tetanus"],
    "disuria": ["saluran kemih", "uretritis", "sistitis", "pielonefritis"],
    "hematuria": ["saluran kemih", "batu saluran", "glomerulo", "nefritis"],
    "hemoptisis": ["tuberkulosis", "tb paru", "kanker paru"],
    "ptosis": ["miastenia"],
    "afasia": ["stroke"],
    "hemiplegia": ["stroke"],
}

# Kombinasi dua kata yang bersama-sama bersifat patognomonik
_PATHO_COMBOS: list[tuple[set[str], list[str]]] = [
    ({"batuk", "darah"}, ["tuberkulosis", "tb paru"]),
    ({"darah", "hemoptisis"}, ["tuberkulosis"]),
    ({"nyeri", "berkemih"}, ["saluran kemih", "sistitis", "pielonefritis"]),
    ({"kencing", "nyeri"}, ["saluran kemih", "sistitis"]),
    ({"tenggorok", "putih"}, ["tonsilitis", "faringitis"]),
    ({"tenggorok", "plak"}, ["tonsilitis"]),
    ({"tenggorok", "demam"}, ["tonsilitis", "faringitis", "difteri"]),
    ({"eksudat", "tonsil"}, ["tonsilitis"]),
    ({"berdenyut", "fotofobia"}, ["migren"]),
    ({"berdenyut", "sisi"}, ["migren"]),
    ({"fotofobia", "mual", "kepala"}, ["migren"]),
]


def _build_idf() -> dict[str, float]:
    """Hitung IDF untuk setiap term dari gejala_klinis di seluruh database."""
    N = len(DB["diseases_full"]) or 1
    doc_freq: dict[str, int] = defaultdict(int)
    for d in DB["diseases_full"]:
        terms_in_doc: set[str] = set()
        for gejala in d.get("gejala_klinis", []):
            g = gejala.lower().replace("nafas", "napas")
            for w in re.split(r"[\s,;./()>=<]+", g):
                if len(w) > 2:
                    terms_in_doc.add(w)
        for t in terms_in_doc:
            doc_freq[t] += 1
    return {t: math.log(N / f) for t, f in doc_freq.items()}


_IDF = _build_idf()


@functools.lru_cache(maxsize=512)
def _normalize_text(text: str) -> str:
    normalized = (
        text.lower()
        .replace("nafas", "napas")
        .replace("tenggorokan", "tenggorok")
        .replace("mulutnya", "mulut")
        .replace("badannya", "badan")
    )
    for raw, clean in _QUERY_NORMALIZATION_MAP.items():
        normalized = normalized.replace(raw, clean)
    return normalized


def _query_words(query: str) -> set[str]:
    return {
        w for w in _SPLIT.split(_normalize_text(query)) if len(w) > 2 and w not in _STOP
    }


_SPLIT = re.compile(r"[\s,;./()>=<\n\-]+")


def _text_to_words(text: str) -> set[str]:
    return {
        w for w in _SPLIT.split(_normalize_text(text)) if len(w) > 2 and w not in _STOP
    }


def _build_disease_word_cache() -> dict:
    cache: dict = {}
    for d in DB["diseases_full"]:
        name = d.get("nama", "")
        if not name:
            continue
        gejala_words = [_text_to_words(g) for g in d.get("gejala_klinis", [])]
        pf_words = [_text_to_words(p) for p in d.get("pemeriksaan_fisik", [])]
        def_words = _text_to_words(d.get("definisi", ""))
        all_words: set[str] = def_words.copy()
        for s in gejala_words + pf_words:
            all_words.update(s)
        cache[name] = {
            "name_lower": name.lower().replace("nafas", "napas"),
            "gejala_words": gejala_words,
            "pf_words": pf_words,
            "def_words": def_words,
            "all_words": all_words,
        }
    return cache


_DISEASE_WORD_CACHE: dict = _build_disease_word_cache()


def _extract_query_profile(query: str) -> dict:
    normalized_query = _normalize_text(query)
    words = _query_words(query)
    body_hints = {_BODY_CONTEXT[w] for w in words if w in _BODY_CONTEXT}
    weak_terms = {w for w in words if w in _WEAK_QUERY_TERMS}
    anchor_terms = {w for w in words if w in _ANATOMIC_TERMS or w in _BODY_CONTEXT}
    specific_terms = words - weak_terms
    short_query = len(words) <= 3 or len(specific_terms) <= 2
    candidate_hints: set[str] = set()
    preferred_candidate_hints: set[str] = set()
    followups: list[str] = []
    syndrome_tags: set[str] = set()
    for term in anchor_terms | specific_terms:
        for hint in _SHORT_QUERY_CANDIDATE_HINTS.get(term, []):
            candidate_hints.add(hint)
        for followup in _SHORT_QUERY_FOLLOWUPS.get(term, []):
            if followup not in followups:
                followups.append(followup)
    for phrase, hints in _PHRASE_CANDIDATE_HINTS.items():
        if phrase in normalized_query:
            candidate_hints.update(hints)
    for phrase, tag in _PHRASE_SYNDROME_TAGS.items():
        if phrase in normalized_query:
            syndrome_tags.add(tag)
    if (
        "dada" in anchor_terms
        and "chest-cardiac-like" not in syndrome_tags
        and "chest-gerd-like" not in syndrome_tags
        and "chest-wall-like" not in syndrome_tags
    ):
        syndrome_tags.add("chest-undifferentiated")
    if "pusing" in words and not any(
        tag.startswith("dizziness-") for tag in syndrome_tags
    ):
        syndrome_tags.add("dizziness-undifferentiated")
    for tag in syndrome_tags:
        rules = _SYNDROME_SCORE_RULES.get(tag, {})
        preferred_candidate_hints.update(rules.get("boost", []))
    severe_cues = {cue for cue in _SEVERE_QUERY_CUES if cue in normalized_query}
    return {
        "normalized_query": normalized_query,
        "words": words,
        "body_hints": body_hints,
        "weak_terms": weak_terms,
        "anchor_terms": anchor_terms,
        "specific_terms": specific_terms,
        "short_query": short_query,
        "candidate_hints": candidate_hints,
        "preferred_candidate_hints": preferred_candidate_hints,
        "followups": followups[:4],
        "syndrome_tags": syndrome_tags,
        "severe_cues": severe_cues,
        "generic_only": bool(words)
        and not anchor_terms
        and not (specific_terms - weak_terms),
    }


def _build_clinical_summary(query: str, profile: dict | None = None) -> str:
    if profile is None:
        profile = _extract_query_profile(query)
    lines = ["=== RINGKASAN KLINIS TERSTRUKTUR ==="]
    lines.append(f"Keluhan ternormalisasi: {profile['normalized_query']}")
    if profile["body_hints"]:
        lines.append(
            "Sistem tubuh terdeteksi: " + ", ".join(sorted(profile["body_hints"]))
        )
    if profile["anchor_terms"]:
        lines.append("Anchor klinis: " + ", ".join(sorted(profile["anchor_terms"])))
    if profile["specific_terms"]:
        lines.append(
            "Token klinis spesifik: " + ", ".join(sorted(profile["specific_terms"]))
        )
    if profile["candidate_hints"]:
        lines.append(
            "Klaster kandidat awal: " + ", ".join(sorted(profile["candidate_hints"]))
        )
    if profile["preferred_candidate_hints"]:
        lines.append(
            "Prioritas kandidat: "
            + ", ".join(sorted(profile["preferred_candidate_hints"]))
        )
    if profile["syndrome_tags"]:
        lines.append("Pola klinis awal: " + ", ".join(sorted(profile["syndrome_tags"])))
    if profile["generic_only"]:
        lines.append(
            "Status data: keluhan masih terlalu umum, prioritaskan pertanyaan klarifikasi sebelum mengunci diagnosis."
        )
    elif profile["short_query"]:
        lines.append(
            "Status data: informasi masih singkat, diagnosis kerja harus konservatif dan boleh berupa dugaan awal."
        )
    if profile["followups"]:
        lines.append("Klarifikasi prioritas: " + " | ".join(profile["followups"]))
    return "\n".join(lines)


def _disease_matches_candidate_hints(disease: dict, candidate_hints: set[str]) -> bool:
    if not candidate_hints:
        return False
    name_lower = disease.get("nama", "").lower().replace("nafas", "napas")
    return any(hint in name_lower for hint in candidate_hints)


def _prioritize_scored_candidates(
    scored: list[tuple[float, dict]], profile: dict
) -> list[tuple[float, dict]]:
    if not scored:
        return scored
    preferred_hints = set(profile.get("preferred_candidate_hints", set()))
    general_hints = set(profile.get("candidate_hints", set()))
    if preferred_hints:
        preferred = [
            (s, d)
            for s, d in scored
            if _disease_matches_candidate_hints(d, preferred_hints)
        ]
        if preferred:
            remainder = [
                (s, d)
                for s, d in scored
                if not _disease_matches_candidate_hints(d, preferred_hints)
            ]
            return preferred + remainder
    if profile.get("short_query") and general_hints:
        preferred = [
            (s, d)
            for s, d in scored
            if _disease_matches_candidate_hints(d, general_hints)
        ]
        if len(preferred) >= 2:
            remainder = [
                (s, d)
                for s, d in scored
                if not _disease_matches_candidate_hints(d, general_hints)
            ]
            return preferred + remainder
    return scored


def _score_disease_tfidf(
    disease: dict,
    words: set[str],
    body_hints: set[str] | None = None,
    query_profile: dict | None = None,
) -> float:
    """TF-IDF score dengan tiga sumber:
    - gejala_klinis  : bobot penuh (1.0x)
    - pemeriksaan_fisik: bobot sedang (0.6x)
    - definisi       : bobot rendah (0.2x) — fallback
    + patho bonus    : term patognomonik langsung boost penyakit relevan
    + body context   : boost penyakit di sistem yang sesuai konteks query
    """
    score = 0.0
    _dcache = _DISEASE_WORD_CACHE.get(disease.get("nama", ""), {})
    name_lower = _dcache.get("name_lower") or disease.get("nama", "").lower().replace("nafas", "napas")
    disease_system = disease.get("body_system", "")
    anchor_terms = {w for w in words if w in _ANATOMIC_TERMS or w in _BODY_CONTEXT}
    strong_terms = words - _WEAK_QUERY_TERMS
    location_terms = anchor_terms | (strong_terms - _WEAK_QUERY_TERMS)
    weak_match_score = 0.0
    strong_match_score = 0.0
    profile = query_profile or {}
    candidate_hints = set(profile.get("candidate_hints", set()))
    severe_cues = set(profile.get("severe_cues", set()))
    syndrome_tags = set(profile.get("syndrome_tags", set()))
    short_query = bool(profile.get("short_query"))

    # Body system context boost (sebelum scoring lain — efek aditif)
    if body_hints:
        if disease_system in body_hints:
            score += 12.0
        elif body_hints and disease_system not in body_hints:
            # Kalau ada konteks sistem yang kuat, penalti penyakit sistem lain
            # Hanya penalti jika ada 2+ hint word (konteks kuat)
            if len([w for w in words if _BODY_CONTEXT.get(w)]) >= 2:
                score -= 8.0

    # 1. gejala_klinis — bobot penuh
    for g_words in _dcache.get("gejala_words", []):
        for w in words:
            if w in g_words:
                weight = _IDF.get(w, 5.0)
                if w in _WEAK_QUERY_TERMS:
                    weak_match_score += weight * 0.25
                else:
                    strong_match_score += weight

    # 2. pemeriksaan_fisik — bobot 0.6x
    for pf_words in _dcache.get("pf_words", []):
        for w in words:
            if w in pf_words:
                weight = _IDF.get(w, 5.0) * 0.6
                if w in _WEAK_QUERY_TERMS:
                    weak_match_score += weight * 0.25
                else:
                    strong_match_score += weight

    # 3. definisi — bobot 0.2x (diturunkan dari 0.3 untuk kurangi false positive)
    def_words = _dcache.get("def_words", set())
    if def_words:
        for w in words:
            if w in def_words:
                weight = _IDF.get(w, 5.0) * 0.2
                if w in _WEAK_QUERY_TERMS:
                    weak_match_score += weight * 0.1
                else:
                    strong_match_score += weight

    score += strong_match_score + weak_match_score

    # 4a. Pathognomonic single-term bonus — only iterate terms present in query
    for patho in words & _PATHO_TERMS.keys():
        for hint in _PATHO_TERMS[patho]:
            if hint in name_lower:
                score += 15.0
                break

    # 4b. Pathognomonic combo bonus (dua kata bersama = indikator kuat)
    for combo_words, hints in _PATHO_COMBOS:
        if combo_words.issubset(words):
            for hint in hints:
                if hint in name_lower:
                    score += 12.0
                    break

    # 5. Bonus nama penyakit — threshold naik ke IDF > 3.5 (cegah false positive)
    for w in words:
        if w in name_lower and w not in _GENERIC_TERMS and _IDF.get(w, 0) > 3.5:
            score += _IDF.get(w, 3.5) * 2.0
            break

    # Bonus kandidat awal untuk keluhan pendek yang sudah punya anchor sistem/lokasi.
    if candidate_hints and any(hint in name_lower for hint in candidate_hints):
        score += 8.0 if short_query else 4.0

    # Bias berbasis pola klinis pendek seperti RLQ, chest pain subtype, dan tipe pusing.
    for tag in syndrome_tags:
        rules = _SYNDROME_SCORE_RULES.get(tag)
        if not rules:
            continue
        if any(hint in name_lower for hint in rules.get("boost", [])):
            score += 10.0 if short_query else 6.0
        if any(hint in name_lower for hint in rules.get("penalize", [])):
            score -= 8.0 if short_query else 5.0

    # Penalti bila kecocokan hanya digerakkan oleh token umum seperti "nyeri".
    if weak_match_score > 0 and strong_match_score == 0 and not anchor_terms:
        score -= 6.0

    # Penalti ekstra bila query punya anchor anatomi/sistem, tetapi penyakit tidak menyentuh anchor itu.
    if location_terms:
        disease_terms = _dcache.get("all_words", set())
        if not (location_terms & disease_terms) and disease_system not in (
            body_hints or set()
        ):
            score -= 7.0

    # Penyakit berat tidak boleh mudah naik pada query singkat tanpa red flag pendukung.
    if short_query and not severe_cues:
        if any(term in name_lower for term in _SEVERE_DISEASE_NAME_TERMS):
            score -= 10.0

    return score


def _get_pharma_detail(icd10: str) -> dict | None:
    """Farmakologi dari 144_penyakit_puskesmas berdasarkan ICD-10 prefix 3 karakter."""
    prefix = (icd10 or "")[:3].upper()
    if not prefix:
        return None
    d = _D144_ICD_PREFIX.get(prefix)
    return d.get("pharmacotherapy") if d else None


# ---------------------------------------------------------------------------
# RAG v4 — Chain-based architecture
# Prinsip: MedGemma tahu diagnosis, RAG inject operational context
# 1. Detect clinical entity dari chains (symptom key matching)
# 2. Ambil candidate disease names dari predictive_next chains
# 3. Fuzzy-match ke diseases_full → inject PPK + FORNAS + stok
# 4. TF-IDF sebagai fallback jika tidak ada chain match
# ---------------------------------------------------------------------------


def _normalize_name(s: str) -> str:
    return re.sub(r"[^a-z0-9\s]", "", s.lower().replace("nafas", "napas"))


def _name_match_score(disease_name: str, candidate: str) -> int:
    """Berapa kata dari candidate (>=4 char) yang ada di disease_name."""
    dn = _normalize_name(disease_name)
    cand_words = [w for w in _normalize_name(candidate).split() if len(w) >= 4]
    return sum(1 for w in cand_words if w in dn)


def _find_diseases_for_candidates(candidate_names: list[str]) -> list[dict]:
    """Fuzzy-match daftar nama dari predictive_next ke diseases_full."""
    found_ids: set[str] = set()
    results: list[tuple[int, dict]] = []

    for candidate in candidate_names:
        best_score = 0
        best_disease: dict | None = None
        for d in DB["diseases_full"]:
            did = d.get("id", d.get("nama", ""))
            if did in found_ids:
                continue
            s = _name_match_score(d.get("nama", ""), candidate)
            if s > best_score:
                best_score = s
                best_disease = d
        if best_disease and best_score >= 1:
            did = best_disease.get("id", best_disease.get("nama", ""))
            if did not in found_ids:
                found_ids.add(did)
                results.append((best_score, best_disease))

    results.sort(key=lambda x: -x[0])
    return [d for _, d in results]


def _build_disease_block(d: dict) -> list[str]:
    """Buat blok PPK untuk satu penyakit."""
    lines = [f"\n{d['nama']} [{d.get('icd10','')}]"]

    gejala = d.get("gejala_klinis", [])
    if gejala:
        clean = [g for g in gejala[:4] if isinstance(g, str) and len(g) < 120]
        if clean:
            lines.append("Gejala: " + ", ".join(clean))

    pf = d.get("pemeriksaan_fisik", [])
    if pf:
        clean = [p for p in pf[:3] if isinstance(p, str) and 5 < len(p) < 120]
        if clean:
            lines.append("Pem.fisik: " + " | ".join(clean))

    rf = d.get("red_flags", [])
    if rf:
        clean = [r for r in rf[:2] if isinstance(r, str) and 5 < len(r) < 120]
        if clean:
            lines.append("Red flags: " + " | ".join(clean))

    kr = d.get("kriteria_rujukan", "")
    if kr and isinstance(kr, str) and len(kr) > 10:
        lines.append(f"Rujukan: {kr[:150]}")

    pharma = _get_pharma_detail(d.get("icd10", ""))
    if pharma:
        fl = pharma.get("first_line", [])
        if fl:
            lines.append("Farmakoterapi lini 1:")
            for drug in fl[:3]:
                lines.append(
                    f"  {drug.get('drug','')} {drug.get('dose','')} "
                    f"{drug.get('route','')} {drug.get('frequency','')}"
                )

    return lines


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


_EMBED_CACHE: dict[str, list[float] | None] = {}
_FASTEMBED_MODEL = None  # None=belum dicoba, False=gagal, object=loaded


def _warmup_fastembed() -> None:
    global _FASTEMBED_MODEL
    if not _DISEASE_VECTORS:
        return
    try:
        from fastembed import TextEmbedding
        _FASTEMBED_MODEL = TextEmbedding("nomic-ai/nomic-embed-text-v1.5")
    except Exception:
        _FASTEMBED_MODEL = False


import threading as _threading
_threading.Thread(target=_warmup_fastembed, daemon=True).start()
del _threading


def _embed_query_semantic(text: str) -> list[float] | None:
    global _FASTEMBED_MODEL
    key = text.strip()
    if key in _EMBED_CACHE:
        return _EMBED_CACHE[key]

    # Primary: fastembed (ONNX, no server, offline-first)
    if _FASTEMBED_MODEL is not False:
        try:
            if _FASTEMBED_MODEL is None:
                from fastembed import TextEmbedding

                _FASTEMBED_MODEL = TextEmbedding("nomic-ai/nomic-embed-text-v1.5")
            vec = list(_FASTEMBED_MODEL.embed([text]))[0].tolist()
            _EMBED_CACHE[key] = vec
            return vec
        except Exception:
            _FASTEMBED_MODEL = False

    # Fallback: Ollama HTTP API
    try:
        import urllib.request as _ureq

        payload = json.dumps({"model": "nomic-embed-text", "prompt": text}).encode()
        req = _ureq.Request(
            "http://localhost:11434/api/embeddings",
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        with _ureq.urlopen(req, timeout=3) as r:
            vec = json.loads(r.read())["embedding"]
        _EMBED_CACHE[key] = vec
        return vec
    except Exception:
        _EMBED_CACHE[key] = None
        return None


def _retrieve_context(query: str) -> str:
    profile = _extract_query_profile(query)
    words = profile["words"]
    stok_map = _STOK_MAP
    body_hints: set[str] = profile["body_hints"]

    # === Hybrid TF-IDF + semantic scoring ===
    q_vec = _embed_query_semantic(query) if _DISEASE_VECTORS else None
    scored: list[tuple[float, dict]] = []
    for d in DB["diseases_full"]:
        tfidf_s = _score_disease_tfidf(d, words, body_hints if body_hints else None, profile)
        sem_s = 0.0
        if q_vec is not None:
            d_vec = _DISEASE_VECTORS.get(d.get("nama", ""))
            if d_vec:
                sem_s = _cosine(q_vec, d_vec)
        combined = tfidf_s + sem_s * 20.0
        if tfidf_s >= 3.5 or sem_s >= 0.60:
            scored.append((combined, d))
    scored.sort(key=lambda x: -x[0])
    scored = _prioritize_scored_candidates(scored, profile)

    # Deduplikasi per ICD-10 prefix + nama awal
    seen_key: set[tuple] = set()
    top_diseases: list[dict] = []
    for _, d in scored:
        k = (d.get("icd10", "")[:3], d.get("nama", "")[:10].lower())
        if k not in seen_key:
            seen_key.add(k)
            top_diseases.append(d)
        if len(top_diseases) >= 3:
            break

    # === Build context ===
    lines: list[str] = [_build_clinical_summary(query, profile)]

    if top_diseases:
        lines.append("=== REFERENSI KLINIS (SKDI / PPK IDI) ===")
        for d in top_diseases:
            lines.extend(_build_disease_block(d))

    # Stok obat: berdasarkan farmakoterapi penyakit yang ditemukan (bukan keyword)
    drug_names_to_check: list[str] = []
    for d in top_diseases:
        pharma = _get_pharma_detail(d.get("icd10", ""))
        if pharma:
            for drug in pharma.get("first_line", []) + pharma.get("second_line", []):
                nm = drug.get("drug", "").lower()
                if nm and nm not in drug_names_to_check:
                    drug_names_to_check.append(nm)

    stok_lines: list[str] = []
    seen_stok: set[str] = set()
    for drug_nm in drug_names_to_check[:12]:
        stok_patterns = _DRUG_STOK_MATCH.get(drug_nm)
        for stok_nm, stok in stok_map.items():
            if stok_nm in seen_stok:
                continue
            if stok_patterns:
                matched = any(stok_nm.startswith(p) for p in stok_patterns)
            else:
                matched = drug_nm[:6] in stok_nm
            if matched:
                seen_stok.add(stok_nm)
                stok_lines.append(
                    f"  {stok['nama_obat']} {stok.get('kekuatan','')}"
                    f": stok {stok['stok_tersedia']} {stok['satuan']}"
                )
                break

    if stok_lines:
        lines.append("\n=== STOK OBAT ===")
        lines.extend(stok_lines[:8])

    # Red flag injection
    rf_ctx = _red_flag_disease_context(query)
    if rf_ctx:
        lines.append(rf_ctx)

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# System prompt — SIDELAB Protocol v1 — extracted to sidelab/prompt.py
# ---------------------------------------------------------------------------
from sidelab.prompt import _build_system


# ---------------------------------------------------------------------------
# Hanging indent printer
# ---------------------------------------------------------------------------
_NUM_PREFIX = re.compile(r"^(\d+\.\s+)")


def _section_line_rich(stripped: str, section: str) -> Text:
    """Title section: nomor dim+warna, judul bold+warna, ekor warna (tidak bold)."""
    esc = re.escape(section)
    m = re.match(
        rf"^(?P<pfx>\s*(?:\d+\.\s*)?)(?P<title>{esc})(?P<after>.*)$",
        stripped,
        re.IGNORECASE,
    )
    color = SECTION_STYLES[section]
    t = Text()
    if not m:
        t.append(stripped, style=f"bold {color}")
        return t
    pfx = m.group("pfx") or ""
    title = m.group("title")
    after = m.group("after") or ""
    if pfx:
        t.append(pfx, style=f"dim {color}")
    t.append(title, style=f"bold {color}")
    if after:
        t.append(after, style=color)
    return t


def _print_hanging(text: str, style: str) -> None:
    m = _NUM_PREFIX.match(text)
    if m:
        prefix = m.group(1)
        subsequent = " " * len(prefix)
        width = (console.width or 80) - 1
        wrapped = textwrap.fill(
            text,
            width=width,
            initial_indent="",
            subsequent_indent=subsequent,
            break_long_words=False,
            break_on_hyphens=False,
        )
        console.print(wrapped, style=style)
    else:
        console.print(text, style=style)


# ---------------------------------------------------------------------------
# Stateful stream renderer
# ---------------------------------------------------------------------------
_SUB_BRANCH = re.compile(
    r"^(?P<lbl>DDI|KI|Kontraindikasi|Indikasi|Dosis|Catatan|Note|Why|Alasan|Mekanisme)\s*[:\-—]\s*(?P<body>.+)$",
    re.IGNORECASE,
)

_ICD_HEAD = re.compile(r"^[A-Z]\d{1,3}(?:\.\d+)?\b")
_DRUG_HEAD = re.compile(
    r"\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ml|g|gr|iu|%)\b|\b\d+\s*x\s*\d+\b",
    re.IGNORECASE,
)


def _looks_like_header(text: str) -> bool:
    """Heuristik: apakah baris ini header item baru (bukan continuation prose)?"""
    # Normalisasi: buang prefix nomor "1. " dan kurung [G44.2] sebelum cek
    t = re.sub(r"^\s*\d+\.\s*", "", text)
    t = re.sub(r"^\s*\[([^\]]+)\]\s*", r"\1 ", t).strip()
    if _ICD_HEAD.match(t):
        return True
    if _DRUG_HEAD.search(t):
        return True
    first = t.split()[0] if t.split() else ""
    if len(first) >= 4 and first.isupper() and first.isalpha():
        return True
    return False


def _pure_color(style: str) -> str:
    """Strip 'bold ' prefix dari nilai SECTION_STYLES untuk dipakai sebagai foreground saja."""
    return style.replace("bold ", "").strip() or "bright_white"


def _highlight_sentiment(text: str, base_style: str = "") -> Text:
    """Highlight kata 'baik' → hijau bold, 'buruk' → merah bold."""
    t = Text(text, style=base_style or None)
    for m in re.finditer(r"(?i)\bbaik\b", text):
        t.stylize("bold bright_green", m.start(), m.end())
    for m in re.finditer(r"(?i)\bburuk\b", text):
        t.stylize("bold bright_red", m.start(), m.end())
    return t


from sidelab.pharma import (
    _PHARMA_ROUTE_REPLACEMENTS,
    _PHARMA_TIMING_REPLACEMENTS,
    _normalize_pharma_conventions,
    _format_obat_indonesia,
    _is_pharma_meta_line,
    _is_pharma_stock_line,
    _is_pharma_program_line,
    _is_pharma_meta_continuation,
    _looks_like_prescription_line,
    _match_pharma_drug_header,
)
from sidelab.pharma_validator import enforce_minimum_three_therapies


def _lookup_pharma_info(name_raw: str) -> dict | None:
    name_raw = name_raw.strip().lower()
    for key, data in _PHARMA_LOOKUP.items():
        if key in name_raw or name_raw.startswith(key):
            return data
    return None


from sidelab.pharma import _extract_diagnosis_kerja_text


def _pick_supportive_pharma(
    response: str,
    role: str = "vitamin",
) -> tuple[str, dict, str] | tuple[None, None, None]:
    diagnosis_text = _extract_diagnosis_kerja_text(response).lower()
    if not diagnosis_text:
        return None, None, None
    for rule in _PHARMA_SUPPORTIVE_RULES:
        if rule.get("role", "vitamin") != role:
            continue
        if any(
            re.search(r"\b" + re.escape(kw) + r"\b", diagnosis_text)
            for kw in rule["keywords"]
        ):
            info = _PHARMA_LOOKUP.get(rule["lookup_key"])
            if info:
                return rule["line"], info, rule["lookup_key"]
    return None, None, None


def _get_pharma_cluster_rule(response: str) -> dict | None:
    diagnosis_text = _extract_diagnosis_kerja_text(response).lower()
    if not diagnosis_text:
        # Fallback: cari keyword di RINGKASAN KASUS jika DIAGNOSIS KERJA absen
        m = re.search(
            r"RINGKASAN KASUS:\s*(.+?)(?=\n[A-Z][A-Z\s/]+:|$)",
            response,
            re.DOTALL | re.IGNORECASE,
        )
        diagnosis_text = m.group(1).lower() if m else ""
    for rule in _PHARMA_CLUSTER_RULES:
        if any(keyword in diagnosis_text for keyword in rule["keywords"]):
            return rule
    return None


from sidelab.pharma import _should_keep_pharma_candidate


# Kelompok klinis — digunakan untuk inject divider antar blok besar
_SECTION_GROUP: dict[str, str] = {
    "DIAGNOSIS BANDING": "dd",
    "DIAGNOSIS KERJA": "diagnosis",
    "TATALAKSANA": "terapi",
    "FARMAKOLOGI": "terapi",
}
_GROUP_DIVIDER: dict[str, tuple[str, str]] = {
    "dd":        ("  DIFERENSIAL",              "#B0A888"),
    "diagnosis": ("  DIAGNOSIS",                "#C8D4DC"),
    "terapi":    ("  TERAPI",                   "#88A8C0"),
}


class StreamRenderer:
    def __init__(self) -> None:
        self.current_section: str | None = None
        self.current_group: str | None = None
        self.section_count = 0
        self.last_was_blank = True
        self.in_item = False

    def _detect_section(self, line: str) -> str | None:
        upper = line.strip().upper()
        for s in sorted(SECTION_STYLES.keys(), key=len, reverse=True):
            if upper == s or upper.startswith(s + ":"):
                return s
            if (
                upper.startswith(s + " —")
                or upper.startswith(s + " –")
                or upper.startswith(s + " -")
            ):
                return s
            if re.match(rf"^\d+\.\s*{re.escape(s)}\s*[—:–\-]?", upper):
                return s
        return None

    def _maybe_blank(self) -> None:
        if not self.last_was_blank:
            console.print()
            self.last_was_blank = True

    def flush(self, buf: str) -> None:
        if not buf.strip():
            self._maybe_blank()
            return

        clean = _strip_markdown(buf)
        stripped = clean.strip()
        section = self._detect_section(clean)

        if section:
            if self.section_count > 0:
                self._maybe_blank()
            new_group = _SECTION_GROUP.get(section)
            if new_group and new_group != self.current_group:
                label, color = _GROUP_DIVIDER[new_group]
                console.print(Rule(label, style=f"dim {color}", characters="─"))
                self.current_group = new_group
                self.last_was_blank = False
            self.current_section = section
            self.section_count += 1
            self.in_item = False
            console.print(_section_line_rich(stripped, section))
            self.last_was_blank = False
            return

        if stripped.startswith("[!]"):
            console.print(stripped, style="bold bright_red")
            self.last_was_blank = False
            self.in_item = False
            return

        sub = _SUB_BRANCH.match(stripped)
        if sub and self.in_item:
            self._render_sub_branch(sub.group("lbl").upper(), sub.group("body").strip())
            self.last_was_blank = False
            return

        # Continuation: di dalam section, baris tidak terlihat seperti header baru → jadi branch
        if self.current_section and self.in_item and not _looks_like_header(stripped):
            self._render_branch(stripped)
            self.last_was_blank = False
            return

        self._render_item(stripped)
        self.in_item = True
        self.last_was_blank = False

    # ---- rendering helpers --------------------------------------------------
    def _section_color(self) -> str:
        sec = self.current_section
        return _pure_color(
            SECTION_STYLES.get(sec, "bright_white") if sec else "bright_white"
        )

    def _render_item(self, line: str) -> None:
        head_raw = re.sub(r"^\s*\d+\.\s*", "", line)
        head_raw = re.sub(r"\[([^\]]+)\]", r"\1", head_raw)
        head_raw = head_raw.strip()

        head, tail = self._split_head_tail(head_raw)

        if tail:
            t = Text()
            t.append(head, style="bold bright_white")
            console.print(t)
            self._render_branch(tail)
        else:
            console.print(_highlight_sentiment(head_raw, "bold bright_white"))

    def _split_head_tail(self, text: str) -> tuple[str, str | None]:
        """Coba pisah jadi head + tail. Urutan separator: em-dash, en-dash, ' - ', ': '."""
        for pat in (r"\s+—\s+", r"\s+–\s+", r"\s+-\s+", r"\s*:\s+"):
            m = re.search(pat, text)
            if not m:
                continue
            head = text[: m.start()].strip()
            tail = text[m.end() :].strip()
            if 2 <= len(head) <= 110 and tail:
                return head, tail
        return text, None

    def _render_sub_branch(self, label: str, body: str) -> None:
        # Label penting (KI = kontraindikasi, DDI = interaksi) → highlight ringan via warna section
        important = label.upper() in {"KI", "KONTRAINDIKASI", "DDI"}
        color = self._section_color() if important else "grey50"
        self._render_branch(
            body, branch_color=color, label=label, label_emphasize=important
        )

    def _render_branch(
        self,
        text: str,
        branch_color: str = "grey50",
        label: str | None = None,
        label_emphasize: bool = False,
    ) -> None:
        width = (console.width or 80) - 1
        first_indent = "  └ "
        cont_indent = "    "
        body = f"{label}: {text}" if label else text
        wrapped = textwrap.fill(
            body,
            width=width,
            initial_indent=first_indent,
            subsequent_indent=cont_indent,
            break_long_words=False,
            break_on_hyphens=False,
        )
        for i, ln in enumerate(wrapped.split("\n")):
            t = Text()
            if i == 0:
                t.append("  └ ", style=branch_color)
                content = ln[len(first_indent) :]
                if label and content.upper().startswith(label.upper() + ":"):
                    cut = len(label) + 1
                    t.append(content[:cut], style=f"bold {branch_color}")
                    rest = content[cut:]
                    t.append(_highlight_sentiment(rest, "bright_white"))
                else:
                    t.append(_highlight_sentiment(content, "bright_white"))
            else:
                t.append(cont_indent, style=branch_color)
                t.append(_highlight_sentiment(ln[len(cont_indent) :], "bright_white"))
            console.print(t)


def _title_sidelab_colored() -> Text:
    t = Text()
    t.append("SIDELAB", style=f"bold {C_VALUE}")
    return t


def _header_title_row() -> Text:
    t = _title_sidelab_colored()
    t.append("  ·  ", style=C_DIM)
    t.append("Sentra SideLab Project", style=f"bold {C_INFO}")
    t.append("  ", style=C_DIM)
    t.append("Clinical Intelligence Console", style=f"italic {C_META}")
    return t


def _badge(label: str, tone: str = "muted") -> Text:
    bg, fg = _BADGE_TONES.get(tone, _BADGE_TONES["muted"])
    return Text(f" {label.upper()} ", style=f"bold {fg} on {bg}")


def _kv_line(pairs: list[tuple[str, str]]) -> Text:
    t = Text()
    for idx, (label, value) in enumerate(pairs):
        if idx:
            t.append("  •  ", style=C_DIM)
        t.append(f"{label}: ", style=C_LABEL)
        t.append(value, style=C_VALUE)
    return t


def _section_badge(section: str, color: str) -> Text:
    return Text(f" {section} ", style=f"bold {color} on {C_PANEL_ALT}")


def _panel_title(label: str, color: str = C_INFO) -> str:
    return f"[bold {color}]{label}[/]"


# ---------------------------------------------------------------------------
# UI helpers
# ---------------------------------------------------------------------------
def _print_header(
    session_id: str,
    pasien: dict | None = None,
    backend: str | None = None,
    model: str | None = None,
    backend_ready: bool = True,
) -> None:
    now = datetime.now().strftime("%A, %d %b %Y  %H:%M")
    has_patient = pasien is not None and bool(pasien.get("nama"))
    patient_label = pasien.get("nama") if has_patient else "-"
    patient_mode = "PASIEN AKTIF" if has_patient else "TANPA PASIEN"
    backend_label_text = _backend_label(backend) if backend else "-"
    model_text = model if model else DISPLAY_MODEL
    ready_label = "online" if backend_ready else "tdk siap"
    ready_style = "success" if backend_ready else "alert"

    top = Text()
    top.append_text(_header_title_row())
    top.append("   ", style=C_DIM)
    top.append_text(_badge(ready_label, ready_style))
    top.append(" ", style=C_DIM)
    top.append_text(_badge(patient_mode, "info" if has_patient else "muted"))

    meta1 = _kv_line(
        [
            ("Backend", backend_label_text),
            ("Model", model_text),
            ("Session", session_id),
            ("Waktu", now),
        ]
    )
    meta2 = _kv_line(
        [
            ("Pasien", patient_label),
            ("Architect", "dr Ferdi Iskandar"),
        ]
    )

    grid = Table.grid(expand=True)
    grid.add_row(top)
    grid.add_row(Text(""))
    grid.add_row(meta1)
    grid.add_row(meta2)

    console.print()
    console.print(
        Panel(
            grid,
            box=rbox.ROUNDED,
            border_style=C_BORDER,
            padding=(1, 2),
            expand=True,
            title=_panel_title("SENTRA SIDELAB PROJECT"),
            subtitle=f"[{C_DIM}]Clinical Decision Intelligence · Primary Healthcare FKTP[/]",
            style=f"on {C_PANEL}",
        )
    )
    console.print()


def _print_command_footer() -> None:
    """Footer ringkas — daftar slash command, ditampilkan setelah tiap response."""
    klinis = ["/soap", "/triage", "/rujuk", "/edukasi"]
    pustaka = ["/library20", "/library50", "/library100", "/tree"]
    sistem = [
        "/pasien",
        "/next",
        "/save",
        "/history",
        "/send",
        "/model",
        "/clear",
        "/help",
        "/exit",
    ]

    grid = Table.grid(expand=True)
    grid.add_column(ratio=1)
    grid.add_column(ratio=4)
    grid.add_row(_badge("klinis", "info"), Text("  ".join(klinis), style="grey82"))
    grid.add_row(_badge("pustaka", "warn"), Text("  ".join(pustaka), style="grey82"))
    grid.add_row(_badge("sistem", "muted"), Text("  ".join(sistem), style="grey82"))

    console.print(
        Panel(
            grid,
            box=rbox.ROUNDED,
            border_style=C_DIM,
            padding=(0, 1),
            title=_panel_title("COMMANDS"),
            style=f"on {C_PANEL}",
        )
    )


def _print_help() -> None:
    console.print()
    table = Table.grid(expand=True)
    table.add_column(style="bold #86B8D8", width=14)
    table.add_column(style="grey82")
    cmds = [
        ("/soap", "Template SOAP note kosong"),
        ("/triage", "Template triage ESI 5 level"),
        ("/rujuk", "Pohon kriteria rujukan (emergensi/urgent/elektif)"),
        ("/edukasi", "Pohon topik edukasi pasien"),
        ("/library20", "Shortcut 20 penyakit tersering untuk akses cepat harian"),
        ("/library50", "Pustaka ranking 1-50 dengan filter sistem dan search cerdas"),
        ("/library100", "Pustaka ranking 1-100 dengan navigasi, filter, dan search"),
        ("/tree", "Directory tree Sentra SideLab"),
        ("/pasien", "Input data pasien aktif"),
        ("/next", "Kasus baru — reset pasien dan riwayat"),
        ("/history", "Tampilkan riwayat percakapan"),
        ("/save", "Simpan sesi ke file"),
        ("/send", "Kirim output terakhir ke Telegram"),
        ("/icd", "Kamus ICD-10 Indonesia — contoh: /icd I10 atau /icd hipertensi"),
        ("/model", "Ganti model Ollama"),
        ("/clear", "Bersihkan layar"),
        ("/help", "Tampilkan bantuan ini"),
        ("/exit", "Keluar"),
    ]
    for cmd, desc in cmds:
        table.add_row(cmd, desc)
    console.print(
        Panel(
            table,
            box=rbox.ROUNDED,
            border_style=C_DIM,
            padding=(1, 2),
            title=_panel_title("PERINTAH TERSEDIA"),
            style=f"on {C_PANEL}",
        )
    )
    console.print()


# ---------------------------------------------------------------------------
# Static clinical templates (tree-style printers)
# ---------------------------------------------------------------------------
def _print_template(
    title: str, title_color: str, sections: list[tuple[str, list[str]]]
) -> None:
    """Print template blocks with calmer, more legible command-center styling."""
    console.print()
    console.print(
        Panel(
            Text(title, style=f"bold {title_color}"),
            box=rbox.ROUNDED,
            border_style=title_color,
            padding=(0, 1),
            expand=True,
            style=f"on {C_PANEL}",
        )
    )
    for sec_name, items in sections:
        console.print()
        console.print(_section_badge(sec_name, title_color))
        for item in items:
            t = Text()
            t.append("  · ", style=C_DIM)
            t.append(item, style=C_VALUE)
            console.print(t)
    console.print()
    console.print(Rule(style=C_DIM, characters="─"))
    console.print()


def _print_soap_template() -> None:
    _print_template(
        "SOAP NOTE — TEMPLATE",
        "#7CB9E8",
        [
            (
                "S — SUBJECTIVE",
                [
                    "Keluhan utama (CC):",
                    "Riwayat penyakit sekarang (HPI):",
                    "Riwayat penyakit dahulu (PMH):",
                    "Riwayat keluarga / sosial:",
                    "Alergi / pengobatan saat ini:",
                ],
            ),
            (
                "O — OBJECTIVE",
                [
                    "Vital sign: TD ___/___ HR ___ RR ___ T ___ SpO2 ___",
                    "Keadaan umum / GCS:",
                    "Pemeriksaan fisik per sistem:",
                    "Hasil penunjang (lab/imaging):",
                ],
            ),
            (
                "A — ASSESSMENT",
                [
                    "Diagnosis kerja (ICD-10):",
                    "Diagnosis banding:",
                    "Severity / staging:",
                ],
            ),
            (
                "P — PLAN",
                [
                    "Pemeriksaan tambahan:",
                    "Tatalaksana non-farmakologi:",
                    "Farmakoterapi:",
                    "Edukasi pasien:",
                    "Kontrol / follow-up:",
                    "Kriteria rujuk bila:",
                ],
            ),
        ],
    )


def _print_triage_template() -> None:
    _print_template(
        "TRIAGE — ESI (Emergency Severity Index)",
        "#C44536",
        [
            (
                "ESI-1  RESUSITASI  (life-threatening, intervensi segera)",
                [
                    "Henti napas / henti jantung",
                    "Tidak sadar berat (GCS <8)",
                    "Distress respirasi berat / sianosis",
                    "Syok (hipoperfusi sistemik)",
                    "Trauma multipel berat",
                ],
            ),
            (
                "ESI-2  EMERGENT  (high risk, tunggu maks 10 menit)",
                [
                    "Nyeri dada suspect ACS / aritmia berat",
                    "Stroke onset akut (FAST positif)",
                    "Sepsis / suspek meningitis",
                    "Confused, letargi, disorientasi baru",
                    "Nyeri berat (skala ≥7/10)",
                    "Asma berat / SpO2 90-94%",
                ],
            ),
            (
                "ESI-3  URGENT  (≥2 resources)",
                [
                    "Butuh lab + imaging + IV / observasi",
                    "Vital sign borderline (HR/RR/TD)",
                    "Demam tinggi tanpa fokus jelas",
                    "Nyeri sedang (4-6/10)",
                ],
            ),
            (
                "ESI-4  LESS URGENT  (1 resource)",
                [
                    "Butuh 1 pemeriksaan penunjang saja",
                    "Laserasi sederhana, perlu hecting",
                ],
            ),
            (
                "ESI-5  NON URGENT  (tidak butuh resource)",
                [
                    "Pemeriksaan klinis sederhana",
                    "Resep ulang / kontrol rutin",
                ],
            ),
        ],
    )


def _print_rujuk_tree() -> None:
    _print_template(
        "KRITERIA RUJUKAN — PPK 1 → RUMAH SAKIT",
        "#C44536",
        [
            (
                "EMERGENSI  (rujuk segera setelah stabilisasi)",
                [
                    "Distress respirasi / SpO2 <90% persisten",
                    "Nyeri dada cardiac / suspek ACS / STEMI",
                    "Stroke akut window <4.5 jam (kandidat trombolisis)",
                    "Trauma kapitis + penurunan kesadaran",
                    "Perdarahan masif tidak terkontrol",
                    "Keracunan berat / overdosis",
                    "Persalinan dengan komplikasi (perdarahan, eklampsia)",
                    "Status epileptikus",
                    "Syok dari sebab apapun",
                ],
            ),
            (
                "URGENT  (rujuk dalam 24 jam)",
                [
                    "Demam tifoid dengan komplikasi",
                    "DBD dengan warning sign / DSS",
                    "Infeksi berat butuh IV antibiotik prolonged",
                    "DKA / HHS / hipoglikemia berulang",
                    "Hipertensi krisis tanpa target organ damage",
                    "Pneumonia berat (CURB-65 ≥2)",
                    "Kehamilan risiko tinggi",
                ],
            ),
            (
                "ELEKTIF  (rujuk berjadwal)",
                [
                    "Diagnosis tidak tegas setelah evaluasi PPK 1",
                    "Butuh pemeriksaan spesialistik (USG, endoskopi, CT)",
                    "Butuh tindakan / pembedahan elektif",
                    "Penyakit kronis untuk evaluasi spesialis",
                    "Tidak respon terapi standar 2 minggu",
                    "Permintaan second opinion atas indikasi",
                ],
            ),
        ],
    )


def _print_edukasi_tree() -> None:
    _print_template(
        "TOPIK EDUKASI PASIEN",
        "#7CB9E8",
        [
            (
                "GAYA HIDUP",
                [
                    "Pola makan seimbang (Isi Piringku Kemenkes)",
                    "Aktivitas fisik minimal 150 menit/minggu",
                    "Berhenti merokok dan paparan asap rokok",
                    "Batasi alkohol",
                    "Tidur cukup 7-8 jam, kelola stres",
                ],
            ),
            (
                "KEPATUHAN PENGOBATAN",
                [
                    "Minum obat sesuai dosis, frekuensi, dan waktu",
                    "Jangan berhenti obat tanpa konsultasi dokter",
                    "Lapor segera jika ada efek samping",
                    "Simpan obat di tempat aman, jauh dari anak",
                    "Bawa daftar obat saat kontrol",
                ],
            ),
            (
                "TANDA BAHAYA  (segera kembali ke fasyankes)",
                [
                    "Demam tinggi persisten / menggigil hebat",
                    "Nyeri memburuk atau menyebar",
                    "Sesak napas / sulit bicara dalam kalimat",
                    "Penurunan kesadaran / linglung",
                    "Perdarahan tidak normal",
                    "Muntah persisten / tidak bisa makan minum",
                ],
            ),
            (
                "PENCEGAHAN",
                [
                    "Cuci tangan 6 langkah dengan sabun",
                    "Etika batuk dan bersin",
                    "Imunisasi sesuai jadwal Kemenkes",
                    "Pemeriksaan kesehatan berkala (skrining)",
                    "Pakai masker bila gejala ISPA",
                ],
            ),
            (
                "KONTROL ULANG",
                [
                    "Datang sesuai jadwal yang ditentukan",
                    "Bawa kartu kontrol, obat, hasil pemeriksaan",
                    "Catat keluhan yang muncul antar kunjungan",
                    "Hubungi fasyankes bila tidak bisa hadir",
                ],
            ),
        ],
    )


def _print_dir_tree() -> None:
    """Tampilkan directory tree project SIDELAB."""

    console.print()
    console.print(SEP, style="grey50")
    console.print(f"DIRECTORY TREE — {BASE_DIR.name}/", style=f"bold {C_NAME}")
    console.print(SEP, style="grey50")
    console.print()

    def _walk(path: Path, prefix: str = "") -> None:
        try:
            entries = sorted(
                path.iterdir(),
                key=lambda p: (not p.is_dir(), p.name.lower()),
            )
        except PermissionError:
            return
        # Skip hidden + cache dirs
        entries = [
            e
            for e in entries
            if not e.name.startswith(".") and e.name not in {"__pycache__", "sessions"}
        ]
        for i, entry in enumerate(entries):
            last = i == len(entries) - 1
            connector = "└── " if last else "├── "
            t = Text()
            t.append(prefix, style="grey50")
            t.append(connector, style="grey50")
            if entry.is_dir():
                t.append(entry.name + "/", style=f"bold {C_NAME}")
            else:
                t.append(entry.name, style="bright_white")
            console.print(t)
            if entry.is_dir():
                ext = "    " if last else "│   "
                _walk(entry, prefix + ext)

    t = Text()
    t.append(BASE_DIR.name + "/", style=f"bold {C_NAME}")
    console.print(t)
    _walk(BASE_DIR)
    console.print()
    console.print(SEP, style="grey50")
    console.print()


def _validate_numeric_field(
    val: str,
    field_label: str,
    min_val: float = 0,
    max_val: float = 999,
    allow_decimal: bool = False,
) -> tuple[bool, str]:
    """Validate a numeric input field and return (is_valid, cleaned_value).

    Strips common unit suffixes like 'tahun', 'th', 'kg', 'cm', 'bulan'.
    Shows a human-readable correction prompt on invalid input.
    Never raises — always returns a tuple.
    """
    cleaned = val.strip()

    # strip common unit suffixes
    for suffix in ["tahun", "th", "kg", "cm", "bulan", "bln"]:
        if cleaned.lower().endswith(" " + suffix):
            cleaned = cleaned[: -(len(suffix) + 1)].strip()
            break
        if cleaned.lower().endswith(suffix):
            cleaned = cleaned[: -len(suffix)].strip()
            break

    if not cleaned:
        return False, val

    # try to parse as float (or int)
    try:
        if allow_decimal:
            num = float(cleaned)
        else:
            num = float(cleaned)
            if num != int(num):
                console.print(
                    f"    [!] {field_label} harus berupa angka bulat. "
                    f'"{val}" tidak valid.',
                    style="bright_red",
                )
                console.print(
                    "    [dim]Masukkan angka yang benar, atau Enter untuk lewati.[/dim]"
                )
                return False, val
            num = int(num)
        # Reject special float values that break int conversion
        if math.isinf(num) or math.isnan(num):
            console.print(
                f"    [!] {field_label} harus berupa angka. "
                f'"{val}" tidak dikenali.',
                style="bright_red",
            )
            console.print(
                "    [dim]Masukkan angka yang benar, atau Enter untuk lewati.[/dim]"
            )
            return False, val
    except (ValueError, OverflowError):
        console.print(
            f"    [!] {field_label} harus berupa angka. " f'"{val}" tidak dikenali.',
            style="bright_red",
        )
        console.print(
            "    [dim]Masukkan angka yang benar, atau Enter untuk lewati.[/dim]"
        )
        return False, val

    if num < min_val:
        console.print(
            f"    [!] {field_label} harus ≥ {min_val}: " f'"{val}" terlalu kecil.',
            style="bright_red",
        )
        console.print(
            "    [dim]Masukkan angka yang benar, atau Enter untuk lewati.[/dim]"
        )
        return False, val

    if num > max_val:
        console.print(
            f"    [!] {field_label} harus ≤ {max_val}: " f'"{val}" terlalu besar.',
            style="bright_red",
        )
        console.print(
            "    [dim]Masukkan angka yang benar, atau Enter untuk lewati.[/dim]"
        )
        return False, val

    # Return integer representation when the decimal part is zero
    if num == int(num):
        return True, str(int(num))
    return True, str(num)


def _input_pasien() -> dict:
    """Guided patient intake with labeled prompts and safe-skip behavior.

    Presents minimum stored patient facts (demographics, allergies, medications,
    comorbidities) using Rich-styled panels. Each field shows a skip hint and
    typing 'selesai' exits early. Returns a dict of collected fields or an empty
    dict when nothing is entered. Never crashes on empty or partial input.
    """
    fields: list[tuple[str, str, str | None]] = [
        ("nama", "Nama pasien", None),
        ("umur", "Umur (tahun)", None),
        ("jk", "Jenis kelamin (L/P)", None),
        ("bb", "Berat badan (kg)", None),
        ("tb", "Tinggi badan (cm)", None),
        ("alergi", "Alergi obat/makanan", None),
        ("obat", "Obat yang sedang dikonsumsi", None),
        ("komorbid", "Riwayat penyakit penyerta", None),
    ]

    console.print()
    console.print(
        Panel(
            Text(
                "Isi data pasien di bawah. Setiap kolom boleh dikosongkan (Enter).\n"
                "Ketik [bold]selesai[/bold] kapan saja untuk menyimpan dan kembali.",
                style=f"{C_META}",
            ),
            box=rbox.ROUNDED,
            border_style=C_INFO,
            padding=(1, 2),
            title=_panel_title("INPUT DATA PASIEN"),
            style=f"on {C_PANEL}",
        )
    )

    pasien: dict = {}
    for key, label_text, _hint in fields:
        while True:
            prompt = Text()
            prompt.append(f"  {label_text}", style=f"bold {C_VALUE}")
            prompt.append("  ", style=C_DIM)
            prompt.append("(Enter untuk lewati)", style=f"dim {C_LABEL}")
            console.print(prompt)

            val = console.input("  > ").strip()

            if val.lower() in ("selesai", "skip", "done"):
                break
            if not val:
                break  # empty = skip this field

            # ---- structured validation ----
            if key == "umur":
                ok, cleaned = _validate_numeric_field(
                    val, "Umur", min_val=0, max_val=150
                )
                if ok:
                    pasien[key] = cleaned
                    break
                # invalid → correction already printed, loop re-asks
                continue

            if key == "bb":
                ok, cleaned = _validate_numeric_field(
                    val, "Berat badan", min_val=0.5, max_val=500, allow_decimal=True
                )
                if ok:
                    pasien[key] = cleaned
                    break
                continue

            if key == "tb":
                ok, cleaned = _validate_numeric_field(
                    val, "Tinggi badan", min_val=1, max_val=300, allow_decimal=True
                )
                if ok:
                    pasien[key] = cleaned
                    break
                continue

            if key == "jk":
                val_upper = val.upper()
                if val_upper in ("L", "P"):
                    pasien[key] = val_upper
                    break
                else:
                    console.print(
                        f"    [!] Harus L atau P. "
                        f'"{val}" bukan jenis kelamin yang dikenal.',
                        style="bright_red",
                    )
                    console.print(
                        "    [dim]Ketik L (laki-laki) atau P (perempuan), "
                        "atau Enter untuk lewati.[/dim]"
                    )
                    continue

            # non-structured fields — accept as-is
            pasien[key] = val
            break

        # selesai / skip / done at the prompt level exits the entire intake
        if val.lower() in ("selesai", "skip", "done"):
            break

    # ---- intake summary ----
    console.print()
    if pasien:
        summary = Table.grid(expand=True)
        summary.add_column(style=f"bold {C_LABEL}", width=16)
        summary.add_column(style=C_VALUE)
        for key, label_text, _hint in fields:
            if key in pasien:
                summary.add_row(f"  {label_text}", pasien[key])
            else:
                summary.add_row(
                    f"  {label_text}",
                    Text("(dilewati)", style=f"dim {C_LABEL}"),
                )
        console.print(
            Panel(
                summary,
                box=rbox.ROUNDED,
                border_style=C_INFO,
                padding=(1, 2),
                title=_panel_title("RINGKASAN DATA PASIEN"),
                style=f"on {C_PANEL}",
            )
        )
        console.print("  Data pasien tersimpan.", style="dim grey50")
    else:
        console.print(
            "  [dim]Tidak ada data pasien yang diisi.[/dim]",
        )
    console.print()
    return pasien


def _parse_pasien_inline(args: str) -> dict | None:
    """Parse pasien cepat dari satu baris teks.

    Format yang didukung (bebas urutan):
      /pasien L 45               → JK=L, umur=45
      /pasien P 32 nama:Ny.Sari  → JK=P, umur=32, nama=Ny.Sari
      /pasien nama:Budi umur:54 jk:L alergi:penisilin
    Mengembalikan dict jika minimal ada 1 field terisi, None jika tidak dapat di-parse.
    """
    result: dict = {}
    tokens = args.strip().split()
    if not tokens:
        return None

    remaining: list[str] = []
    for tok in tokens:
        if ":" in tok:
            k, _, v = tok.partition(":")
            k = k.lower().strip()
            v = v.strip()
            key_map = {
                "nama": "nama",
                "name": "nama",
                "umur": "umur",
                "usia": "umur",
                "age": "umur",
                "jk": "jk",
                "sex": "jk",
                "gender": "jk",
                "bb": "bb",
                "berat": "bb",
                "weight": "bb",
                "tb": "tb",
                "tinggi": "tb",
                "height": "tb",
                "alergi": "alergi",
                "allergy": "alergi",
                "obat": "obat",
                "komorbid": "komorbid",
            }
            if k in key_map and v:
                field = key_map[k]
                if field == "jk":
                    v = v.upper()
                    if v not in ("L", "P"):
                        continue
                result[field] = v
        else:
            remaining.append(tok)

    # Positional: token non-key → interpretasi JK dan umur
    for tok in remaining:
        if tok.upper() in ("L", "P") and "jk" not in result:
            result["jk"] = tok.upper()
        elif re.match(r"^\d{1,3}$", tok) and "umur" not in result:
            umur = int(tok)
            if 0 < umur <= 150:
                result["umur"] = tok
        elif re.match(r"^\d{1,3}(th|thn|tahun)?$", tok, re.I) and "umur" not in result:
            m = re.match(r"^(\d{1,3})", tok)
            if m:
                result["umur"] = m.group(1)
        elif tok and "nama" not in result and not tok.isdigit():
            # Token yang tidak dikenal dan belum ada nama → asumsikan nama
            result["nama"] = tok

    return result if result else None


def _build_case_prompt(kasus: dict, pasien: dict) -> str:
    """Build a structured clinical prompt from case context and patient data.

    Composes the chief complaint, duration, associated symptoms, red-flag clues,
    vital-sign summary, and relevant patient allergies/medications into a single
    prompt block that precedes the reference context and model inference.
    """
    lines = []
    if kasus.get("keluhan"):
        lines.append(f"KELUHAN UTAMA: {kasus['keluhan']}")
    if kasus.get("durasi"):
        lines.append(f"DURASI: {kasus['durasi']}")
    if kasus.get("gejala"):
        lines.append(f"GEJALA PENYERTA: {kasus['gejala']}")
    if kasus.get("redflag"):
        lines.append(f"TANDA BAHAYA: {kasus['redflag']}")
    if kasus.get("vital"):
        lines.append(f"TANDA VITAL: {kasus['vital']}")
    if pasien:
        if pasien.get("alergi"):
            lines.append(f"ALERGI PASIEN: {pasien['alergi']}")
        if pasien.get("obat"):
            lines.append(f"OBAT PASIEN: {pasien['obat']}")
    if not lines:
        return ""
    return "\n".join(lines)


def _input_kasus(
    initial_complaint: str = "",
    pasien: dict | None = None,
) -> dict:
    """Guided case intake with labeled prompts and safe-skip behavior.

    Presents structured case context prompts (chief complaint, duration,
    associated symptoms, red-flag clues, vital signs) using Rich-styled panels.
    Each field shows a skip hint and typing 'selesai' exits early.
    Shows relevant patient allergies/medications when available from pasien data.
    Returns a dict of collected fields. Never crashes on empty or partial input.
    """
    fields: list[tuple[str, str, str | None]] = [
        ("keluhan", "Keluhan utama", None),
        ("durasi", "Durasi keluhan", None),
        ("gejala", "Gejala penyerta", None),
        ("redflag", "Tanda bahaya (red flags)", None),
        ("vital", "Tanda vital (TD, Nadi, RR, Suhu)", None),
    ]

    # Show existing patient context (allergies, medications) when available
    if pasien:
        alergi = pasien.get("alergi")
        obat = pasien.get("obat")
        if alergi or obat:
            console.print()
            console.print(f"  [dim]Alergi diketahui: {alergi or '(tidak ada)'}[/dim]")
            console.print(f"  [dim]Obat diketahui: {obat or '(tidak ada)'}[/dim]")

    console.print()
    console.print(
        Panel(
            Text(
                "Isi data kasus di bawah. Setiap kolom boleh dikosongkan (Enter).\n"
                "Ketik [bold]selesai[/bold] kapan saja untuk melanjutkan ke analisis.",
                style=f"{C_META}",
            ),
            box=rbox.ROUNDED,
            border_style=C_INFO,
            padding=(1, 2),
            title=_panel_title("INPUT DATA KASUS"),
            style=f"on {C_PANEL}",
        )
    )

    kasus: dict = {}
    for key, label_text, _hint in fields:
        prompt = Text()
        prompt.append(f"  {label_text}", style=f"bold {C_VALUE}")
        prompt.append("  ", style=C_DIM)
        prompt.append("(Enter untuk lewati)", style=f"dim {C_LABEL}")

        # Keluhan utama is pre-filled from the doctor's initial complaint
        if key == "keluhan" and initial_complaint:
            console.print(prompt)
            console.print(
                "  [dim](terisi dari input awal)[/dim]",
            )
            kasus[key] = initial_complaint
            continue

        console.print(prompt)
        val = console.input("  > ").strip()

        if val.lower() in ("selesai", "skip", "done"):
            break
        if val:
            kasus[key] = val

    # ---- intake summary ----
    console.print()
    if kasus:
        summary = Table.grid(expand=True)
        summary.add_column(style=f"bold {C_LABEL}", width=20)
        summary.add_column(style=C_VALUE)
        for key, label_text, _hint in fields:
            if key in kasus:
                summary.add_row(f"  {label_text}", kasus[key])
            else:
                summary.add_row(
                    f"  {label_text}",
                    Text("(dilewati)", style=f"dim {C_LABEL}"),
                )
        console.print(
            Panel(
                summary,
                box=rbox.ROUNDED,
                border_style=C_INFO,
                padding=(1, 2),
                title=_panel_title("RINGKASAN DATA KASUS"),
                style=f"on {C_PANEL}",
            )
        )
    else:
        console.print(
            "  [dim]Tidak ada data kasus yang diisi.[/dim]",
        )
    console.print()
    return kasus


def _echo_active_context(
    pasien: dict | None = None,
    kasus: dict | None = None,
) -> None:
    """Echo a concise active-context summary before analysis begins.

    Displays the combined patient and case context that the system is about
    to reason on, so the doctor can confirm the intended patient and case
    before relying on recommendations. This catches wrong-patient or
    wrong-case use early (VAL-INTAKE-004).
    """
    pasien = pasien or {}
    kasus = kasus or {}

    has_patient = bool(pasien)
    has_case = bool(kasus)

    summary = Table.grid(expand=True)
    summary.add_column(style=f"bold {C_LABEL}", width=18)
    summary.add_column(style=C_VALUE)

    # ---- patient context ----
    if has_patient:
        nama = pasien.get("nama", "-")
        summary.add_row("  Pasien", nama)
        if pasien.get("umur"):
            summary.add_row("  Umur", pasien["umur"])
        if pasien.get("jk"):
            summary.add_row("  Jenis kelamin", pasien["jk"])
        if pasien.get("alergi"):
            summary.add_row(
                "  Alergi",
                Text(pasien["alergi"], style=C_WARN),
            )
        if pasien.get("obat"):
            summary.add_row("  Obat", pasien["obat"])
        if pasien.get("komorbid"):
            summary.add_row("  Komorbid", pasien["komorbid"])
        if has_case:
            summary.add_row("", "")  # spacer

    # ---- case context ----
    if has_case:
        keluhan = kasus.get("keluhan", "-")
        summary.add_row("  Keluhan utama", keluhan)
        if kasus.get("durasi"):
            summary.add_row("  Durasi", kasus["durasi"])
        if kasus.get("gejala"):
            summary.add_row("  Gejala penyerta", kasus["gejala"])
        if kasus.get("redflag"):
            summary.add_row(
                "  Tanda bahaya",
                Text(kasus["redflag"], style=C_ALERT),
            )
        if kasus.get("vital"):
            summary.add_row("  Tanda vital", kasus["vital"])

    if not has_patient and not has_case:
        summary.add_row(
            "  Status",
            Text("(belum ada data pasien atau kasus)", style=f"dim {C_LABEL}"),
        )

    console.print()
    console.print(
        Panel(
            summary,
            box=rbox.ROUNDED,
            border_style=C_SUCCESS,
            padding=(1, 2),
            title=_panel_title("KONTEKS AKTIF — Verifikasi Sebelum Analisis"),
            subtitle=f"[{C_DIM}]Pastikan pasien dan keluhan sudah benar sebelum melanjutkan[/]",
            style=f"on {C_PANEL}",
        )
    )
    console.print()


def _detect_sparse_complaint(kasus: dict) -> dict:
    """Detect whether the case data is too sparse for a confident diagnosis.

    Returns a dict with:
    - is_sparse: bool — True when the complaint is too short/generic
    - message: str — human-readable sparse-data message
    - followup_questions: list[str] — focused clarification questions
    - conservative_prompt_addition: str — prompt addition for the LLM

    A complaint is considered sparse when:
    - The keluhan is very short (<=3 words) with no specific/anatomical terms, or
    - The keluhan contains only weak/generic terms (nyeri, demam, pusing, etc.)
      and no additional case fields (durasi, gejala, redflag, vital) were filled.
    """
    keluhan = kasus.get("keluhan", "")
    if not keluhan:
        return {
            "is_sparse": False,
            "message": "",
            "followup_questions": [],
            "conservative_prompt_addition": "",
        }

    profile = _extract_query_profile(keluhan)

    # A case is sparse if:
    #   generic_only: all terms are weak/generic, no anatomy or specific terms
    #   OR short_query with very few specific terms
    is_generic = profile.get("generic_only", False)
    is_short = profile.get("short_query", False)

    # If additional case fields (durasi, gejala, redflag, vital) are filled
    # with substantial content, the case is no longer sparse even if the
    # initial complaint was short.
    has_durasi = bool(kasus.get("durasi", "").strip())
    has_gejala = bool(kasus.get("gejala", "").strip())
    has_redflag = bool(kasus.get("redflag", "").strip())
    has_vital = bool(kasus.get("vital", "").strip())
    additional_context_count = sum([has_durasi, has_gejala, has_redflag, has_vital])

    # If at least 2 additional fields are filled, the case has enough
    # context to proceed without a sparse warning.
    if additional_context_count >= 2:
        return {
            "is_sparse": False,
            "message": "",
            "followup_questions": [],
            "conservative_prompt_addition": "",
        }

    if not is_generic and not is_short:
        return {
            "is_sparse": False,
            "message": "",
            "followup_questions": [],
            "conservative_prompt_addition": "",
        }

    # Build the sparse-data message
    if is_generic:
        message = (
            "Data klinis masih sangat terbatas. Keluhan terlalu umum "
            "tanpa lokasi atau sistem tubuh yang jelas. "
            "Interpretasi akan dijaga konservatif — mohon berikan informasi "
            "tambahan bila tersedia."
        )
    else:
        message = (
            "Data klinis masih singkat. Informasi yang tersedia belum cukup "
            "untuk diagnosis spesifik. Interpretasi akan bersifat dugaan awal "
            "dan konservatif."
        )

    # Collect followup questions from the query profile
    followup_questions: list[str] = list(profile.get("followups", []))

    # If no specific followups, add generic ones based on the complaint nature
    if not followup_questions:
        if is_generic:
            followup_questions = [
                "Lokasi atau bagian tubuh mana yang dikeluhkan?",
                "Sejak kapan keluhan muncul?",
                "Apakah ada gejala lain yang menyertai?",
                "Apakah ada riwayat penyakit sebelumnya yang relevan?",
            ]
        else:
            followup_questions = [
                "Bisakah dijelaskan lebih rinci tentang keluhan ini?",
                "Apakah ada faktor yang memperberat atau meringankan?",
                "Apakah ada gejala penyerta seperti demam, mual, atau lainnya?",
            ]

    # Build the conservative prompt addition
    conservative_prompt_addition = (
        "PERINGATAN SISTEM: Data klinis yang tersedia masih SANGAT TERBATAS.\n"
        "- JANGAN melompat ke diagnosis spesifik tanpa bukti lokasi/anatomi yang jelas.\n"
        "- Diagnosis kerja HARUS konservatif (dugaan awal/working hypothesis), bukan diagnosis definitif.\n"
        "- Prioritaskan KLARIFIKASI dan pertanyaan lanjutan di bagian awal respons.\n"
        "- JANGAN memaksakan diagnosis banding lintas sistem tanpa data pendukung.\n"
        "- Jika perlu, nyatakan secara eksplisit bahwa data belum cukup dan sebutkan "
        "informasi tambahan apa yang dibutuhkan untuk mempersempit diagnosis.\n"
        "- Diagnosis banding dan tatalaksana harus dibatasi pada klaster sistem "
        "yang paling mungkin berdasarkan data yang ada."
    )

    return {
        "is_sparse": True,
        "message": message,
        "followup_questions": followup_questions,
        "conservative_prompt_addition": conservative_prompt_addition,
    }


def _print_sparse_clarification(sparse_result: dict) -> None:
    """Print a visible sparse-data clarification panel.

    Shows the sparse-data message and focused clarification questions
    so the doctor sees them before the LLM response (VAL-INTAKE-005).
    """
    if not sparse_result.get("is_sparse"):
        return

    message = sparse_result.get("message", "")
    followups = sparse_result.get("followup_questions", [])

    summary = Table.grid(expand=True)
    summary.add_column(style=C_VALUE)

    summary.add_row(
        Text(message, style=f"italic {C_WARN}"),
    )

    if followups:
        summary.add_row("")
        summary.add_row(
            Text("Pertanyaan klarifikasi:", style=f"bold {C_INFO}"),
        )
        for i, q in enumerate(followups, 1):
            summary.add_row(
                Text(f"  {i}. {q}", style=C_VALUE),
            )

    console.print()
    console.print(
        Panel(
            summary,
            box=rbox.ROUNDED,
            border_style=C_WARN,
            padding=(1, 2),
            title=_panel_title("DATA SPARSE — Klarifikasi Diperlukan"),
            subtitle=f"[{C_DIM}]Interpretasi akan dijaga konservatif[/]",
            style=f"on {C_PANEL}",
        )
    )
    console.print()


# ---------------------------------------------------------------------------
# Insufficient-data state — VAL-SAFETY-004
# ---------------------------------------------------------------------------


def _check_insufficient_data_state(kasus: dict, pasien: dict) -> dict:
    """Evaluate whether clinical data are insufficient for safe assessment.

    Returns a dict with:
    - is_insufficient: bool — True when data are too thin for confident output
    - message: str — human-readable insufficient-data message
    - followup_questions: list[str] — most relevant clarifying questions
    - conservative_prompt_addition: str — safety instructions for the LLM

    A case is considered insufficient when:
    - The complaint is too short, generic, or vague (delegates to
      _detect_sparse_complaint for word-level analysis), or
    - Critical clinical context is missing: no anatomical anchor, no duration,
      no associated symptoms, and no supplemental patient data (allergies,
      medications, vitals).

    This is a clinical-safety guardrail that runs deterministically before any
    model-dependent reasoning. The system must never produce an overconfident
    diagnosis or therapy when data are insufficient.
    """
    keluhan = kasus.get("keluhan", "")
    if not keluhan:
        return {
            "is_insufficient": False,
            "message": "",
            "followup_questions": [],
            "conservative_prompt_addition": "",
        }

    # Leverage the existing sparse-complaint detection for word-level analysis
    sparse = _detect_sparse_complaint(kasus)
    is_sparse = sparse.get("is_sparse", False)

    # Count how many additional case fields have meaningful content
    has_durasi = bool(kasus.get("durasi", "").strip())
    has_gejala = bool(kasus.get("gejala", "").strip())
    has_redflag = bool(kasus.get("redflag", "").strip())
    has_vital = bool(kasus.get("vital", "").strip())
    additional_fields = sum([has_durasi, has_gejala, has_redflag, has_vital])

    # Profile the keluhan for specificity
    profile = _extract_query_profile(keluhan)
    anchor_terms = profile.get("anchor_terms", set())
    specific_terms = profile.get("specific_terms", set()) - profile.get(
        "weak_terms", set()
    )
    has_anchor = bool(anchor_terms)
    has_specific = bool(specific_terms)

    # --- Determine insufficiency ---
    # 1. If the sparse detector says sparse and there are < 2 additional
    #    fields plus no patient safety data, it's insufficient.
    # 2. If the complaint is very short (≤2 words) and no additional fields,
    #    it's insufficient regardless of sparse detector result.
    # 3. If the complaint has no anatomical anchor AND no specific terms
    #    (purely generic), it's insufficient.
    # 4. If two or more additional fields are filled with substance, the
    #    case is NOT considered insufficient even if the initial complaint
    #    is short.

    if additional_fields >= 2:
        return {
            "is_insufficient": False,
            "message": "",
            "followup_questions": [],
            "conservative_prompt_addition": "",
        }

    is_insufficient = False

    # Very short complaint with no supporting fields
    words = profile.get("words", set())
    if len(words) <= 2 and additional_fields == 0:
        is_insufficient = True

    # Known sparse from existing detector
    if is_sparse:
        is_insufficient = True

    # Purely generic complaint (no anatomy, no specific terms)
    if not has_anchor and not has_specific:
        is_insufficient = True

    if not is_insufficient:
        return {
            "is_insufficient": False,
            "message": "",
            "followup_questions": [],
            "conservative_prompt_addition": "",
        }

    # --- Build the insufficient-data message ---
    if not has_anchor and len(words) <= 3:
        message = (
            "DATA TIDAK CUKUP — Keluhan terlalu umum tanpa lokasi anatomi "
            "atau sistem tubuh yang jelas. Interpretasi klinis tidak dapat "
            "dilakukan secara bermakna tanpa informasi tambahan. "
            "Mohon berikan detail lebih lanjut."
        )
    elif is_sparse and additional_fields == 0:
        message = (
            "DATA TIDAK CUKUP — Informasi klinis yang tersedia masih "
            "sangat terbatas. Durasi, gejala penyerta, dan tanda vital "
            "belum tersedia. Diagnosis spesifik tidak dapat ditegakkan "
            "tanpa data pendukung yang memadai."
        )
    else:
        message = (
            "DATA TIDAK CUKUP — Beberapa informasi klinis penting masih "
            "kurang. Interpretasi akan dijaga sangat konservatif. Mohon "
            "lengkapi data berikut bila tersedia."
        )

    # --- Collect focused clarification questions ---
    followup_questions: list[str] = list(profile.get("followups", []))

    if not followup_questions:
        if has_anchor:
            followup_questions = [
                "Sejak kapan keluhan ini muncul?",
                "Apakah ada gejala lain yang menyertai?",
                "Apakah ada faktor yang memperberat atau meringankan?",
                "Apakah ada riwayat penyakit sebelumnya yang relevan?",
            ]
        else:
            followup_questions = [
                "Lokasi atau bagian tubuh mana yang dikeluhkan?",
                "Sejak kapan keluhan muncul?",
                "Apakah ada gejala lain yang menyertai?",
                "Apakah ada riwayat alergi atau obat yang sedang dikonsumsi?",
            ]

    # --- Build conservative prompt addition ---
    conservative_lines = [
        "PERINGATAN SISTEM — DATA KLINIS TIDAK CUKUP:",
        "- JANGAN memberikan diagnosis spesifik atau definitif. Data yang tersedia tidak memadai.",
        "- Nyatakan secara eksplisit di awal respons bahwa DATA BELUM CUKUP untuk diagnosis.",
        "- Batasi diagnosis kerja pada DUGAAN AWAL (working hypothesis) yang paling konservatif.",
        "- JANGAN memberikan tatalaksana farmakologis spesifik tanpa data pendukung.",
        "- Pada DATA TIDAK CUKUP, target minimal 3 obat tidak berlaku; prioritaskan klarifikasi, observasi, dan verifikasi dokter.",
        "- Jika memberikan opsi terapi, AKHIRI dengan: 'Semua saran di atas bersifat dugaan awal. Verifikasi data pasien sebelum tindakan.'",
        "- Prioritaskan PERTANYAAN KLARIFIKASI untuk memperoleh data yang dibutuhkan.",
        "- Diagnosis banding harus dibatasi pada klaster sistem yang paling mungkin.",
        "- JANGAN memaksakan diagnosis lintas sistem tanpa data pendukung.",
        "- HINDARI bahasa absolut atau final. Gunakan bahasa tentatif dan review-oriented.",
    ]
    conservative_prompt_addition = "\n".join(conservative_lines)

    return {
        "is_insufficient": True,
        "message": message,
        "followup_questions": followup_questions,
        "conservative_prompt_addition": conservative_prompt_addition,
    }


# ---------------------------------------------------------------------------
# M3 Patient-Safety Helpers — extracted to sidelab/safety/patient_safety.py
from sidelab.safety.patient_safety import (
    _is_pediatric,
    _is_reproductive_age_female,
    _build_pediatric_dose_instruction,
    _build_pregnancy_warning,
    _check_dose_critical_data,
    _build_provisional_dose_instruction,
)
def _evaluate_red_flag_and_insufficient_data(kasus: dict, pasien: dict) -> dict:
    """Combine red-flag and insufficient-data evaluation.

    VAL-CROSS-009: when both states are present, red flag takes priority.
    Returns:
        has_red_flag: bool
        is_insufficient: bool
        priority: "red_flag" | "insufficient_data" | "none"
        message: str — "red flag" appears before "data" when both present
        prompt_addition: str — "emergency" and "red flag" before "data gaps"
    """
    keluhan = kasus.get("keluhan", "")
    alerts = _detect_red_flags(keluhan)
    has_red_flag = len(alerts) > 0

    insufficient_result = _check_insufficient_data_state(kasus, pasien)
    is_insufficient = insufficient_result.get("is_insufficient", False)

    if has_red_flag:
        priority = "red_flag"
        if is_insufficient:
            message = (
                "⚠ RED FLAG TERDETEKSI — Tangani sebagai kasus emergency terlebih dahulu. "
                "Data klinis juga tidak lengkap; ketidaklengkapan data tidak menunda "
                "penanganan emergency."
            )
            prompt_addition = (
                "EMERGENCY PRIORITY — RED FLAG DETECTED: treat this as a potential emergency. "
                "Do not delay emergency assessment for data gaps. "
                "After emergency framing, note data gaps and request clarification."
            )
        else:
            message = f"⚠ RED FLAG TERDETEKSI: {alerts[0]}"
            prompt_addition = (
                "EMERGENCY PRIORITY — RED FLAG DETECTED: frame response as emergency. "
                "Prioritize emergency differential and urgent referral criteria."
            )
    elif is_insufficient:
        priority = "insufficient_data"
        message = insufficient_result.get("message", "DATA TIDAK CUKUP")
        prompt_addition = insufficient_result.get("conservative_prompt_addition", "")
    else:
        priority = "none"
        message = ""
        prompt_addition = ""

    return {
        "has_red_flag": has_red_flag,
        "is_insufficient": is_insufficient,
        "priority": priority,
        "message": message,
        "prompt_addition": prompt_addition,
    }


def _print_insufficient_data_warning(result: dict) -> None:
    """Print a visible insufficient-data safety panel.

    VAL-SAFETY-004: A need-more-information state must be surfaced clearly.
    This panel makes the insufficient-data state unambiguous — the doctor
    should never miss that the system considers the data inadequate for
    confident clinical reasoning.

    Does nothing if result is not marked as insufficient.
    """
    if not result.get("is_insufficient"):
        return

    message = result.get("message", "")
    followups = result.get("followup_questions", [])

    summary = Table.grid(expand=True)
    summary.add_column(style=C_VALUE)

    # Main message — prominent and explicit
    summary.add_row(
        Text(message, style=f"bold {C_WARN}"),
    )

    if followups:
        summary.add_row("")
        summary.add_row(
            Text(
                "Informasi yang paling dibutuhkan saat ini:",
                style=f"bold {C_INFO}",
            ),
        )
        for i, q in enumerate(followups, 1):
            summary.add_row(
                Text(f"  {i}. {q}", style=C_VALUE),
            )

    summary.add_row("")
    summary.add_row(
        Text(
            "⚠ Sistem tidak dapat memberikan diagnosis atau terapi yang andal "
            "dengan data saat ini. Keputusan klinis tetap pada dokter.",
            style=f"italic {C_ALERT}",
        ),
    )

    console.print()
    console.print(
        Panel(
            summary,
            box=rbox.HEAVY,
            border_style=C_WARN,
            padding=(1, 2),
            title=_panel_title("DATA TIDAK CUKUP — Informasi Tambahan Diperlukan"),
            subtitle=f"[{C_DIM}]Interpretasi dijaga sangat konservatif[/]",
            style=f"on {C_PANEL}",
        )
    )
    console.print()


# ---------------------------------------------------------------------------
# No-fabrication guardrail — VAL-SAFETY-009
# ---------------------------------------------------------------------------

# Patterns that indicate potentially fabricated clinical data in model output
# No-fabrication guardrail pure logic — extracted to sidelab/safety/fabrication.py
from sidelab.safety.fabrication import (
    _FABRICATION_PATTERNS,
    _field_has_data,
    _build_no_fabrication_instruction,
    _detect_response_fabrication,
    _describe_fabricated_item,
    _check_response_for_fabrication,
)
def _print_no_fabrication_warning(detection: dict) -> None:
    """Print a visible no-fabrication safety panel in the terminal.

    This is called before the model response is displayed when the
    no-fabrication instruction is being applied (i.e., data is missing).
    It reminds the doctor that some clinical data may be marked unknown.

    Does nothing if detection has no fabrication.

    VAL-SAFETY-009: The visible output surfaces unsupported-data concerns.
    """
    if not detection.get("has_fabrication"):
        return

    fabricated = detection.get("fabricated_items", [])
    message = detection.get("message", "")

    summary = Table.grid(expand=True)
    summary.add_column(style=C_VALUE)

    summary.add_row(
        Text(
            "⚠ DATA TIDAK DIDUKUNG INPUT — Verifikasi Diperlukan",
            style=f"bold {C_WARN}",
        ),
    )
    summary.add_row("")
    summary.add_row(Text(message, style=C_VALUE))

    if fabricated:
        summary.add_row("")
        for item in fabricated[:5]:
            summary.add_row(Text(f"  • {item}", style=f"dim {C_WARN}"))

    summary.add_row("")
    summary.add_row(
        Text(
            "Dokter harus memverifikasi data sebelum digunakan. "
            "Keputusan klinis tetap pada dokter.",
            style=f"italic {C_ALERT}",
        ),
    )

    console.print()
    console.print(
        Panel(
            summary,
            box=rbox.HEAVY,
            border_style=C_WARN,
            padding=(1, 2),
            title=_panel_title("PERINGATAN — DATA BELUM TERVERIFIKASI"),
            style=f"on {C_PANEL}",
        )
    )
    console.print()


def _detect_uncertain_context(kasus: dict, pasien: dict) -> dict:
    """Determine whether the current case context is uncertain/incomplete/high-risk.

    Returns a dict with:
    - is_uncertain: bool — True when the case is uncertain
    - reason: str — human-readable reason for uncertainty
    - provisional_language_instruction: str — prompt instruction for the LLM
      to use tentative/provisional language

    A case is uncertain when:
    - Data are insufficient (delegates to _check_insufficient_data_state)
    - Red flags are present (high-risk/emergency)
    - Findings are ambiguous/mixed (contradictory symptoms)

    VAL-SAFETY-008: In uncertain cases, the visible wording must remain
    provisional and review-oriented, using tentative language and
    physician-review framing instead of clinically absolute or
    final-sounding conclusions.
    """
    is_uncertain = False
    reasons: list[str] = []

    # 1. Check insufficient data
    insufficient = _check_insufficient_data_state(kasus, pasien)
    if insufficient.get("is_insufficient"):
        is_uncertain = True
        reasons.append("data klinis tidak cukup")

    # 2. Check red flags (high-risk)
    keluhan = kasus.get("keluhan", "")
    alerts = _detect_red_flags(keluhan)
    if alerts:
        is_uncertain = True
        alert_names = [
            a.replace("ALERT: ", "").split(":")[0].strip()[:30] for a in alerts
        ]
        reason_text = "red flag terdeteksi: " + ", ".join(alert_names[:3])
        reasons.append(reason_text)

    # 3. Check ambiguous/mixed findings
    gejala = kasus.get("gejala", "")
    if gejala:
        ambiguous_markers = [
            "kadang",
            "terkadang",
            "bergantian",
            "berpindah",
            "tidak jelas",
            "samar",
            "ragu",
            "mungkin",
            "bisa jadi",
            "entah",
            "atau",
            "antara",
        ]
        marker_count = sum(1 for m in ambiguous_markers if m in gejala.lower())
        if marker_count >= 2:
            is_uncertain = True
            reasons.append("temuan klinis ambigu/bercampur")

    if not is_uncertain:
        return {
            "is_uncertain": False,
            "reason": "",
            "provisional_language_instruction": "",
        }

    # Build provisional language instruction
    provisional_instruction = (
        "PERINGATAN SISTEM — KASUS TIDAK PASTI (UNCERTAIN CONTEXT):\n"
        "- Data yang tersedia tidak cukup untuk kesimpulan definitif.\n"
        "- GUNAKAN BAHASA TENTATIF DAN REVIEW-ORIENTED dalam seluruh output.\n"
        "- HINDARI frasa absolut seperti 'diagnosis pasti', 'sudah jelas', "
        "'tidak diragukan lagi', 'definitif', 'terbukti', 'dapat dipastikan'.\n"
        "- Gunakan frasa tentatif: 'kemungkinan', 'dicurigai', "
        "'dugaan awal', 'perlu dipertimbangkan', 'dapat dievaluasi lebih lanjut'.\n"
        "- Akhiri setiap kesimpulan klinis dengan catatan bahwa "
        "keputusan akhir tetap pada dokter penanggung jawab.\n"
        "- Diagnosis kerja harus dinyatakan sebagai HIPOTESIS AWAL, "
        "bukan kesimpulan final.\n"
        "- Terapi harus dibingkai sebagai SARAN AWAL yang memerlukan "
        "verifikasi dan persetujuan dokter."
    )

    return {
        "is_uncertain": True,
        "reason": "; ".join(reasons),
        "provisional_language_instruction": provisional_instruction,
    }


def _build_clinical_intake_context(
    user_input: str,
    pasien: dict,
    kasus: dict | None = None,
) -> dict:
    """Build the shared case prompt and safety instructions for CLI/TUI."""
    return _build_intake_context(
        user_input,
        pasien,
        kasus=kasus,
        build_case_prompt=_build_case_prompt,
        check_insufficient_data_state=_check_insufficient_data_state,
        detect_sparse_complaint=_detect_sparse_complaint,
        detect_uncertain_context=_detect_uncertain_context,
        build_no_fabrication_instruction=_build_no_fabrication_instruction,
    )


def _save_session(
    history: list,
    pasien: dict,
    session_id: str,
    backend: str = "",
    model: str = "",
) -> None:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = SESSIONS_DIR / f"sidelab_{ts}_{session_id}.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(f"SIDELAB Session {session_id}\n")
        f.write(f"Tanggal: {datetime.now().strftime('%d %B %Y %H:%M')}\n")
        if backend:
            f.write(f"Backend: {_backend_label(backend)}\n")
        if model:
            f.write(f"Model: {model}\n")
        # Only write patient data when meaningful fields exist (has nama)
        if pasien and pasien.get("nama"):
            f.write(
                "Pasien: " + " | ".join(f"{k}: {v}" for k, v in pasien.items()) + "\n"
            )
        f.write("\n" + "=" * 60 + "\n\n")
        for msg in history:
            role = "DOKTER" if msg["role"] == "user" else "SIDELAB"
            f.write(f"{role}:\n{msg['content']}\n\n")
    console.print(f"  Tersimpan: {filename}", style="dim grey50")


# ---------------------------------------------------------------------------
# Dual-line uplink animation
# ---------------------------------------------------------------------------
def _show_uplink_animation(stop_event: threading.Event | None = None) -> None:
    """Dual progress bar — tampilkan instant full bars, opsional animasi di thread."""
    width = 36
    label1 = "SideLab Engine Processing"
    label2 = "SideLab Intelligence Online"

    c1 = "\033[38;2;136;168;192m"
    c2 = "\033[38;2;200;212;220m"
    dim_lbl = "\033[2;38;2;104;104;112m"
    dim_trk = "\033[38;2;48;48;56m"
    rst = "\033[0m"
    fill_ch = "▰"
    track_ch = "▱"
    label_w = max(len(label1), len(label2))

    if stop_event is None:
        # Mode instant — tampilkan bar penuh langsung, tanpa sleep
        bar1 = f"{c1}{fill_ch * width}{rst}"
        bar2 = f"{c2}{fill_ch * width}{rst}"
        sys.stdout.write(f"\n  {bar1}  {dim_lbl}{label1:<{label_w}}{rst}\n")
        sys.stdout.write(f"  {bar2}  {dim_lbl}{label2:<{label_w}}{rst}\n\n")
        sys.stdout.flush()
        return

    # Mode thread — animasi berjalan sampai stop_event di-set
    frames = 28
    sys.stdout.write("\n\n")
    for f in range(frames):
        if stop_event.is_set():
            # Hapus 2 baris animasi
            sys.stdout.write("\033[2A\r\033[2K\n\r\033[2K\033[1A")
            sys.stdout.flush()
            return
        p1 = min(f / max(frames - 8, 1), 1.0)
        p2 = min(max(f - 5, 0) / max(frames - 8, 1), 1.0)
        n1 = int(p1 * width)
        n2 = int(p2 * width)
        bar1 = f"{c1}{fill_ch * n1}{rst}{dim_trk}{track_ch * (width - n1)}{rst}"
        bar2 = f"{c2}{fill_ch * n2}{rst}{dim_trk}{track_ch * (width - n2)}{rst}"
        sys.stdout.write("\033[2A\r")
        sys.stdout.write(f"  {bar1}  {dim_lbl}{label1:<{label_w}}{rst}\n")
        sys.stdout.write(f"\r  {bar2}  {dim_lbl}{label2:<{label_w}}{rst}\n")
        sys.stdout.flush()
        time.sleep(0.06)
    # Loop selesai normal — biarkan bar penuh terlihat
    sys.stdout.write("\n")
    sys.stdout.flush()


# ---------------------------------------------------------------------------
# Streaming chat
# ---------------------------------------------------------------------------
def _chat(
    prompt: str,
    history: list,
    pasien: dict,
    model: str,
    backend: str,
    console_override=None,
    kasus: dict | None = None,
) -> str:
    """Clinical chat — console_override diset TUI agar output masuk ke RichLog."""
    global console
    _orig_console = console
    _tui_mode = console_override is not None
    if _tui_mode:
        console = console_override

    try:
        result = _chat_inner(
            prompt, history, pasien, model, backend, _tui_mode, kasus=kasus
        )
        if not _tui_mode:
            _print_command_footer()
        return result
    except Exception as e:
        console.print(f"[!] Error: {e}", style="bright_red")
        console.print()
        if not _tui_mode:
            _print_command_footer()
        return ""
    finally:
        console = _orig_console


def _chat_inner(
    prompt: str,
    history: list,
    pasien: dict,
    model: str,
    backend: str,
    _tui_mode: bool = False,
    kasus: dict | None = None,
) -> str:
    _dbg = os.getenv("SIDELAB_DEBUG_TIMING") == "1"
    _t0 = time.monotonic()

    # Defensive: fail fast if backend is not ready — no partial clinical output
    backend_ready, _missing, readiness_warning = check_backend_readiness(backend)
    if _dbg:
        print(f"[TIMING] check_backend_readiness: {(time.monotonic()-_t0)*1000:.0f}ms", flush=True)
    if not backend_ready:
        console.print()
        console.print(
            f"  [bold bright_red]ERROR: {readiness_warning}[/bold bright_red]"
        )
        console.print(
            "  [dim]Backend tidak siap. Tidak ada output klinis yang dihasilkan.[/dim]",
        )
        console.print()
        return ""

    # Red flag check — tampilkan sebelum model menjawab
    # VAL-SAFETY-001 / VAL-CROSS-003: urgent warning before routine structured
    # reasoning. Panel makes the emergency signal unmistakable in the terminal.
    _t1 = time.monotonic()
    alerts = _detect_red_flags(prompt)
    # VAL-SAFETY-002: save structured details for post-model diagnostic-frame injection
    rf_details = _get_red_flag_disease_details(prompt)
    if _dbg:
        print(f"[TIMING] red_flags: {(time.monotonic()-_t1)*1000:.0f}ms", flush=True)
    if alerts:
        console.print()
        # Header: unmistakable emergency banner
        console.print(
            Panel(
                Text(
                    "⚠ PERINGATAN KEGAWATDARURATAN — RED FLAG DETECTED ⚠",
                    style="bold bright_red",
                    justify="center",
                ),
                box=rbox.HEAVY,
                border_style="bright_red",
                padding=(0, 2),
                expand=True,
                style=f"on {C_PANEL}",
            )
        )
        # Individual alert lines
        for alert in alerts:
            console.print(f"  {alert}", style="bold bright_red")
        # Footer separator reinforces the emergency boundary
        console.print(Rule(style="bright_red", characters="━"))
        console.print(
            "  [bold bright_red]⚠ Lanjutkan dengan kewaspadaan tinggi. "
            "Keputusan klinis tetap pada dokter.[/bold bright_red]"
        )
        console.print()

    ctx = _retrieve_context(prompt)
    augmented = f"{prompt}\n\n[DATA REFERENSI]\n{ctx}" if ctx else prompt

    history.append({"role": "user", "content": augmented})
    # Trim by count
    if len(history) > MAX_HISTORY:
        history[:] = history[-MAX_HISTORY:]
    # Trim by total char length — cegah context bloat dari response panjang
    while sum(len(m["content"]) for m in history) > 8000 and len(history) > 2:
        history[:] = history[2:]  # buang pasangan user+assistant terlama

    # Cache system prompt per pasien — hindari rebuild setiap query
    _pasien_key = str(sorted(pasien.items())) if pasien else ""
    if _system_cache["key"] != _pasien_key:
        _system_cache["key"] = _pasien_key
        _system_cache["val"] = _build_system(pasien)
    messages = [{"role": "system", "content": _system_cache["val"]}] + history

    if not _tui_mode:
        console.print()
        _show_uplink_animation()
        console.print()

    full_response = ""
    _t_start = time.monotonic()

    try:
        # Cache provider per backend — hindari rebuild HTTP client setiap query
        if backend not in _provider_cache:
            _provider_cache[backend] = build_provider(backend)
        provider = _provider_cache[backend]

        for token in provider.stream_chat(messages, model=model):
            full_response += token

    except Exception:
        raise

    # Finalize before rendering so doctors, history, /save, /send, and /copy
    # observe the same guarded clinical output.
    case_context = (
        kasus
        if kasus is not None
        else {
            "keluhan": prompt,
            "gejala": prompt,
            "vital": prompt,
            "durasi": prompt,
            "obat": prompt,
            "alergi": prompt,
        }
    )
    safety_case = kasus if kasus is not None else {"keluhan": prompt}
    insufficient_context = _check_insufficient_data_state(
        safety_case,
        pasien,
    ).get("is_insufficient", False)
    finalized = finalize_clinical_output(
        response=full_response,
        prompt=prompt,
        kasus=case_context,
        pasien=pasien,
        rf_details=rf_details,
        deduplicate_fn=_deduplicate_differential,
        pharma_format_fn=_format_farmakologi_tree,
        apply_pharma=True,
        allow_pharma_backfill=not insufficient_context,
        enforce_pharma_floor=not insufficient_context,
    )
    full_response = finalized.text

    renderer = StreamRenderer()
    for line in full_response.splitlines():
        renderer.flush(line)

    if not _tui_mode:
        elapsed = time.monotonic() - _t_start
        console.print()
        console.print(
            f"  [dim {C_DIM}]Dijawab dalam {elapsed:.1f}s  ·  "
            "/next kasus baru  /save simpan  /rujuk kriteria  /help perintah[/]"
        )
        console.print()

    full_response = commit_final_response(
        history,
        full_response,
        visible_prompt=prompt,
    )
    _play_notification_sound()
    return full_response


# ---------------------------------------------------------------------------
# Pharmacology tree formatter
# ---------------------------------------------------------------------------


def _load_pharma_data() -> tuple[dict, list, list]:
    try:
        with open(DATA_DIR / "pharma_lookup.json", encoding="utf-8") as f:
            lookup: dict = json.load(f)
    except Exception:
        lookup = {}
    try:
        with open(DATA_DIR / "pharma_rules.json", encoding="utf-8") as f:
            rules: dict = json.load(f)
    except Exception:
        rules = {}
    return lookup, rules.get("supportive", []), rules.get("cluster", [])


_PHARMA_LOOKUP, _PHARMA_SUPPORTIVE_RULES, _PHARMA_CLUSTER_RULES = _load_pharma_data()


def _check_patient_drug_conflict(drug_name: str, pasien: dict | None) -> dict | None:
    """Check if a candidate drug conflicts with patient-specific safety data.

    VAL-SAFETY-010: returns {"reason": str, "alternative": str} when a conflict
    is detected via allergy, comorbidity, or current medication; None when safe.
    """
    if not pasien:
        return None

    drug = drug_name.lower()
    _alergi = pasien.get("alergi") or ""
    _komorbid = pasien.get("komorbid") or ""
    _obat = pasien.get("obat") or ""
    alergi = (" ".join(_alergi) if isinstance(_alergi, list) else _alergi).lower()
    komorbid = (" ".join(_komorbid) if isinstance(_komorbid, list) else _komorbid).lower()
    obat = (" ".join(_obat) if isinstance(_obat, list) else _obat).lower()

    # Penicillin allergy → amoxicillin/ampicillin blocked
    _penisilin = ["penisilin", "penicillin", "beta-laktam", "betalaktam"]
    _amoksi = ["amoxic", "amoks", "ampici", "ampisil"]
    if any(k in alergi for k in _penisilin) and any(k in drug for k in _amoksi):
        return {
            "reason": "Hipersensitivitas penisilin/beta-laktam — risiko reaksi anafilaksis",
            "alternative": "Azithromisin, eritromisin, atau doksisiklin sesuai indikasi",
        }

    # Sulfa allergy → cotrimoxazole blocked
    if "sulfa" in alergi and any(
        k in drug for k in ["cotrim", "kotrim", "trimeth", "sulfameth"]
    ):
        return {
            "reason": "Hipersensitivitas sulfa — risiko Stevens-Johnson syndrome",
            "alternative": "Antibiotik alternatif sesuai pola sensitivitas lokal",
        }

    # NSAID-sensitive asthma → ibuprofen blocked
    if "ibuprofen" in drug and ("nsaid" in komorbid or "asma nsaid" in komorbid):
        return {
            "reason": "Asma NSAID-sensitif — ibuprofen dapat memicu bronkospasme berat",
            "alternative": "Parasetamol sebagai analgesik-antipiretik alternatif",
        }

    # Active peptic ulcer → ibuprofen blocked
    if "ibuprofen" in drug and "ulkus peptikum" in komorbid:
        return {
            "reason": "Ulkus peptikum aktif — NSAID meningkatkan risiko perdarahan GI",
            "alternative": "Parasetamol sebagai analgesik alternatif yang lebih aman",
        }

    # Preeclampsia/eclampsia → methylergometrine blocked
    _ergo = ["methylergomet", "methylergom", "metilergomet", "methylergo"]
    _eklampsia = ["preeklampsia", "eklampsia", "eclampsia", "pre-eklampsia"]
    if any(k in drug for k in _ergo) and any(k in komorbid for k in _eklampsia):
        return {
            "reason": "Preeklampsia/eklampsia — methylergometrine memperburuk vasokonstriksi dan hipertensi",
            "alternative": "Oksitosin untuk penanganan perdarahan postpartum pada pasien hipertensi",
        }

    # Warfarin current medication → amoxicillin blocked (INR interaction)
    if "warfarin" in obat and any(k in drug for k in _amoksi):
        return {
            "reason": "Interaksi warfarin-amoksisilin — dapat ↑ INR dan meningkatkan risiko perdarahan",
            "alternative": "Monitor INR ketat; pertimbangkan azithromisin jika antibiotik diperlukan",
        }

    return None


def _format_farmakologi_tree(
    response: str,
    pasien: dict | None = None,
    allow_backfill: bool = True,
) -> str:
    """
    Parse section FARMAKOLOGI, deteksi nama obat per baris,
    dan reformat menjadi tree ASCII dengan DDI + Kontraindikasi.
    """
    section_pat = re.compile(
        r"((?:FARMAKOLOGI|Farmakologi):\s*\n)(.*?)(?=\n[A-Z][A-Z\s/]+:\s*\n|$)",
        re.DOTALL,
    )
    m = section_pat.search(response)
    if not m:
        return response

    header = m.group(1)
    raw_body = m.group(2)
    lines = [ln.strip() for ln in raw_body.splitlines() if ln.strip()]

    tree_lines: list[str] = [header.rstrip()]
    cluster_rule = _get_pharma_cluster_rule(response)
    drug_names_seen: set[str] = set()
    body_entries: list[tuple[str, str, dict | None]] = []
    any_drug_attempted = False
    # Pre-merge split-line: "DrugName dose\n└ route freq" → satu baris,
    # agar loop utama tidak salah klasifikasi sebagai meta_continuation.
    _merged: list[str] = []
    _k = 0
    while _k < len(lines):
        _ln = lines[_k]
        if not _match_pharma_drug_header(_ln) and _k + 1 < len(lines):
            _next = lines[_k + 1]
            _next_core = re.sub(r"^[│├└─\s]+", "", _next).strip()
            if _next_core and not _is_pharma_meta_line(_next):
                _combined = _ln.strip() + " " + _next_core
                if _match_pharma_drug_header(_combined):
                    _merged.append(_combined)
                    _k += 2
                    continue
        _merged.append(_ln)
        _k += 1
    lines = _merged

    i = 0
    while i < len(lines):
        line = lines[i]
        match = _match_pharma_drug_header(line)
        if not match:
            lowered = line.strip().lower()
            if (
                not _is_pharma_meta_line(line)
                and not _is_pharma_meta_continuation(line)
                and not _is_pharma_stock_line(line)
                and not line.endswith(":")
                and line.strip("= ") != ""
                and not lowered.startswith("tidak ada obat")
            ):
                body_entries.append(("raw", line, None))
            i += 1
            continue

        any_drug_attempted = True
        formatted_line = _format_obat_indonesia(line)
        name_raw = match.group(1).strip().lower()
        found = _lookup_pharma_info(name_raw)

        # Konsumsi meta line model yang mengikuti obat ini agar tidak dobel.
        j = i + 1
        while j < len(lines) and (
            _is_pharma_meta_line(lines[j]) or _is_pharma_meta_continuation(lines[j])
        ):
            j += 1
        if _should_keep_pharma_candidate(name_raw, cluster_rule):
            if _check_patient_drug_conflict(name_raw, pasien) is None:
                body_entries.append(("drug", formatted_line, found))
                drug_names_seen.add(name_raw)
        i = j

    if cluster_rule and allow_backfill:
        for default_line in cluster_rule.get("defaults", ()):
            if sum(1 for kind, _, _ in body_entries if kind == "drug") >= 3:
                break
            default_match = _match_pharma_drug_header(default_line)
            if not default_match:
                continue
            default_name = default_match.group(1).strip().lower()
            if any(
                default_name in key or key in default_name for key in drug_names_seen
            ):
                continue
            if _check_patient_drug_conflict(default_name, pasien) is not None:
                continue
            body_entries.append(
                (
                    "drug",
                    _format_obat_indonesia(default_line),
                    _lookup_pharma_info(default_name),
                )
            )
            drug_names_seen.add(default_name)

    drug_count = sum(1 for kind, _, _ in body_entries if kind == "drug")

    if any_drug_attempted and allow_backfill:
        for _role in ("adjuvant", "vitamin", "supplement"):
            if drug_count >= 3:
                break
            s_line, s_info, s_key = _pick_supportive_pharma(response, _role)
            if s_line and s_info and s_key:
                if (
                    not any(s_key in key or key in s_key for key in drug_names_seen)
                    and _check_patient_drug_conflict(s_key, pasien) is None
                ):
                    body_entries.append(
                        ("drug", _format_obat_indonesia(s_line), s_info)
                    )
                    drug_names_seen.add(s_key)
                    drug_count += 1

    for kind, line_text, found in body_entries:
        if kind == "raw":
            tree_lines.append(line_text)
            continue
        formatted_line = line_text
        tree_lines.append(formatted_line)
        tree_lines.append("│")
        if not found:
            tree_lines.append("├─ DDI: Tidak tersedia di database lokal")
            tree_lines.append("└─ Kontraindikasi: Tidak tersedia di database lokal")
            tree_lines.append("")
            continue
        tree_lines.append(f"├─ DDI: {found['ddi']}")
        tree_lines.append(f"└─ Kontraindikasi: {found['ki']}")
        tree_lines.append("")

    new_section = "\n".join(tree_lines).rstrip() + "\n\n"
    return response[: m.start()] + new_section + response[m.end() :]


# ---------------------------------------------------------------------------
# Deduplication engine for DIAGNOSIS BANDING
# ---------------------------------------------------------------------------
_ICD_RE = re.compile(r"\b([A-Z]\d{2,3}(?:\.\d+)?)\b")


def _deduplicate_differential(response: str, query: str) -> str:
    """
    Parse section DIAGNOSIS BANDING, hapus duplikat berdasarkan kode ICD-10,
    dan inject fallback dari database lokal bila hasil < 3 item.
    """
    # 1. Cari section DIAGNOSIS BANDING
    section_pat = re.compile(
        r"DIAGNOSIS BANDING:\s*\n(.*?)\n(?=[A-Z][A-Z\s/]+:\s*\n|$)",
        re.DOTALL,
    )
    m = section_pat.search(response)
    if not m:
        return response

    raw_section = m.group(1)
    lines = raw_section.strip().splitlines()

    # 2. Ekstrak baris unik berdasarkan kode ICD-10
    seen_icd: set[str] = set()
    unique_lines: list[str] = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        icd_match = _ICD_RE.search(line)
        icd = icd_match.group(1).upper() if icd_match else ""
        if icd:
            if icd in seen_icd:
                continue
            seen_icd.add(icd)
        unique_lines.append(line)

    # 3. Fallback ke database lokal bila < 3 diagnosis
    if len(unique_lines) < 3:
        profile = _extract_query_profile(query)
        words = profile["words"]
        body_hints = profile["body_hints"]
        scored: list[tuple[float, dict]] = []
        for d in DB["diseases_full"]:
            s = _score_disease_tfidf(
                d, words, body_hints if body_hints else None, profile
            )
            if s >= 3.5:
                if body_hints and d.get("body_system", "") not in body_hints:
                    continue
                scored.append((s, d))
        scored.sort(key=lambda x: -x[0])
        scored = _prioritize_scored_candidates(scored, profile)

        for _, d in scored:
            icd = d.get("icd10", "")
            if icd and icd.upper() in seen_icd:
                continue
            # Buat baris diagnosis banding standar
            nama = d.get("nama", "")
            gejala = d.get("gejala_klinis", [])
            alasan = gejala[0] if gejala else "sesuai kriteria klinis"
            baris = f"[{icd}] {nama} — {alasan}"
            unique_lines.append(baris)
            if icd:
                seen_icd.add(icd.upper())
            target_count = 2 if profile["generic_only"] else 3
            if len(unique_lines) >= target_count:
                break

    # 4. Reconstruct section
    new_section = "DIAGNOSIS BANDING:\n" + "\n".join(unique_lines) + "\n\n"
    cleaned = response[: m.start()] + new_section + response[m.end() :]
    return cleaned


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def main() -> None:
    session_id = uuid.uuid4().hex[:8].upper()
    history: list = []
    pasien: dict = {}
    last_response: str = ""

    _print_header(session_id)
    backend = _print_backend_menu()
    model = default_model_for_backend(backend)
    backend_ready, _missing, readiness_warning = check_backend_readiness(backend)
    if not backend_ready:
        console.print()
        console.print(
            f"  [bold bright_red]⚠ PERINGATAN: {readiness_warning}[/bold bright_red]"
        )
        console.print(
            "  [dim]Backend tidak siap untuk penggunaan klinis. Periksa konfigurasi Anda.[/dim]",
        )
        console.print()
    _print_header(session_id, backend=backend, model=model, backend_ready=backend_ready)
    console.print(
        f"  Mode aktif: {_backend_label(backend)} | Model: {model}",
        style="dim grey50",
    )
    if backend_ready:
        console.print(
            "  Ketik keluhan pasien atau /help untuk daftar perintah.",
            style="dim grey50",
        )
    else:
        console.print(
            "  [bright_red]Backend tidak siap — keluhan klinis akan ditolak sampai konfigurasi diperbaiki.[/bright_red]",
        )
    console.print()
    _print_command_footer()
    console.print()
    _play_notification_sound()  # startup ready chime — fire-and-forget

    while True:
        # Status pasien aktif — compact reminder sebelum setiap prompt
        if pasien:
            _parts = []
            if pasien.get("nama"):
                _parts.append(pasien["nama"])
            if pasien.get("umur"):
                _parts.append(f"{pasien['umur']}th")
            if pasien.get("jk"):
                _parts.append(pasien["jk"])
            if _parts:
                console.print(
                    f"  [dim {C_DIM}]Pasien aktif: {' · '.join(_parts)}[/]",
                )
        try:
            user_input = console.input(
                f"[bold {C_NAME}]INPUT DOKTER >[/bold {C_NAME}] "
            ).strip()
        except (EOFError, KeyboardInterrupt):
            console.print("\n  Keluar.", style="dim grey50")
            break

        if not user_input:
            continue

        cmd = user_input.lower()

        if cmd == "/exit":
            console.print("  Keluar.", style="dim grey50")
            break
        elif cmd == "/help":
            _print_help()
            _print_command_footer()
        elif cmd == "/soap":
            _print_soap_template()
        elif cmd == "/triage":
            _print_triage_template()
        elif cmd == "/rujuk":
            _print_rujuk_tree()
        elif cmd == "/edukasi":
            _print_edukasi_tree()
        elif cmd == "/library50":
            _open_library(
                page=1, page_size=50, title="PUSTAKA 50 PENYAKIT PRIORITAS PUSKESMAS"
            )
        elif cmd == "/library20":
            _open_library(
                page=1, page_size=20, title="TOP 20 PENYAKIT TERSERING PUSKESMAS"
            )
        elif cmd == "/library100":
            _open_library(
                page=1, page_size=50, title="PUSTAKA 100 PENYAKIT PRIORITAS PUSKESMAS"
            )
        elif cmd == "/tree":
            _print_dir_tree()
        elif cmd == "/clear":
            console.clear()
            _print_header(
                session_id,
                pasien=pasien,
                backend=backend,
                model=model,
                backend_ready=backend_ready,
            )
        elif cmd == "/next":
            history.clear()
            pasien = {}
            session_id = uuid.uuid4().hex[:8].upper()
            last_response = ""
            console.clear()
            _print_header(
                session_id, backend=backend, model=model, backend_ready=backend_ready
            )
            console.print("  Kasus baru dimulai.", style="dim grey50")
            console.print(
                f"  Mode aktif: {_backend_label(backend)} | Model: {model}",
                style="dim grey50",
            )
            if backend_ready:
                console.print(
                    "  Ketik keluhan pasien atau /help untuk daftar perintah.",
                    style="dim grey50",
                )
            else:
                console.print(
                    "  [bright_red]Backend tidak siap — keluhan klinis akan ditolak sampai konfigurasi diperbaiki.[/bright_red]",
                )
            console.print()
            _print_command_footer()
            console.print()
        elif cmd == "/pasien" or user_input.lower().startswith("/pasien "):
            inline_args = user_input[len("/pasien") :].strip()
            if inline_args:
                parsed = _parse_pasien_inline(inline_args)
                if parsed:
                    pasien = parsed
                    parts = []
                    if pasien.get("nama"):
                        parts.append(pasien["nama"])
                    if pasien.get("umur"):
                        parts.append(f"{pasien['umur']}th")
                    if pasien.get("jk"):
                        parts.append(pasien["jk"])
                    summary_str = " · ".join(parts) if parts else "(data minimal)"
                    console.print(
                        f"  [dim]Pasien: {summary_str}  — gunakan /pasien (tanpa argumen) untuk wizard lengkap.[/dim]"
                    )
                    console.print()
                else:
                    console.print(
                        "  [dim]Format tidak dikenali — membuka wizard.[/dim]"
                    )
                    pasien = _input_pasien()
            else:
                pasien = _input_pasien()
            # Refresh header to show updated patient state
            _print_header(
                session_id,
                pasien=pasien if pasien.get("nama") else None,
                backend=backend,
                model=model,
                backend_ready=backend_ready,
            )
        elif cmd == "/history":
            console.print()
            console.print(SEP, style="grey50")
            console.print("RIWAYAT PERCAKAPAN", style="#7CB9E8")
            console.print(SEP, style="grey50")
            for msg in history:
                label = "DOKTER" if msg["role"] == "user" else "SIDELAB"
                style = "bright_cyan" if msg["role"] == "user" else "bright_yellow"
                preview = msg["content"][:150].replace("\n", " ")
                console.print(f"  {label}: {preview}", style=style)
            console.print(SEP, style="grey50")
            console.print()
        elif cmd == "/save":
            _save_session(history, pasien, session_id, backend=backend, model=model)
            gateway.publish(f"💾 Session saved: `{session_id}`")
        elif cmd == "/send":
            if not last_response:
                console.print("  Belum ada output untuk dikirim.", style="dim grey50")
                console.print()
                continue
            msg = format_message(last_response, pasien, session_id)
            gateway.publish(msg)
            console.print("  Terkirim ke Telegram.", style="dim grey50")
            console.print()
        elif cmd == "/model":
            try:
                available = _get_backend_models(backend)
                console.print()
                for i, m in enumerate(available, 1):
                    marker = "  <-- aktif" if m == model else ""
                    console.print(f"  {i}. {m}{marker}", style="grey82")
                choice = console.input("Pilih nomor (Enter batal): ").strip()
                if choice.isdigit():
                    idx = int(choice) - 1
                    if 0 <= idx < len(available):
                        model = available[idx]
                        console.print("  Model diganti.", style="dim grey50")
                        _print_header(
                            session_id,
                            pasien=pasien,
                            backend=backend,
                            model=model,
                            backend_ready=backend_ready,
                        )
                console.print()
            except Exception as e:
                console.print(f"  [!] Gagal: {e}", style="bright_red")
        elif cmd == "/icd" or cmd.startswith("/icd "):
            handle_icd_command(user_input, console)
        else:
            # Fail fast if backend is not ready — no partial clinical output
            if not backend_ready:
                console.print()
                console.print(
                    f"  [bold bright_red]ERROR: {readiness_warning}[/bold bright_red]"
                )
                console.print(
                    "  [dim]Backend tidak siap. Tidak ada output klinis yang dihasilkan.[/dim]",
                )
                console.print()
                continue
            # Structured case intake — capture minimum clinical context
            # before producing a polished recommendation (VAL-INTAKE-003)
            kasus = _input_kasus(user_input, pasien)

            # Echo active context for doctor confirmation before analysis
            # so wrong-patient or wrong-case use is caught early (VAL-INTAKE-004)
            _echo_active_context(pasien, kasus)

            # Run clinical-safety insufficient-data check and intake-level
            # sparse-complaint detection before LLM responds.
            # VAL-SAFETY-004: insufficient-data guardrail (clinical safety).
            # VAL-INTAKE-005: sparse complaint clarification (intake UX).
            intake_context = _build_clinical_intake_context(
                user_input,
                pasien,
                kasus=kasus,
            )
            insufficient_result = intake_context["insufficient_result"]
            sparse_result = intake_context["sparse_result"]

            if insufficient_result.get("is_insufficient"):
                # Show the stronger clinical-safety DATA TIDAK CUKUP panel
                _print_insufficient_data_warning(insufficient_result)
            elif sparse_result.get("is_sparse"):
                # Fall back to intake-level DATA SPARSE panel
                _print_sparse_clarification(sparse_result)

            augmented_prompt = intake_context["augmented_prompt"]

            last_response = _chat(
                augmented_prompt, history, pasien, model, backend, kasus=kasus
            )

            # VAL-SAFETY-009: post-process response to detect fabricated data
            # that the model may have invented (vitals, lab, scores, exam
            # findings not present in the original input). Keep the visible
            # panel and persisted response aligned so /save, /send, and /copy
            # carry the same safety warning the doctor saw.
            if last_response:
                fab_detection = _detect_response_fabrication(
                    last_response, kasus, pasien
                )
                warning_already_visible = (
                    "TIDAK DIDUKUNG INPUT DOKTER" in last_response.upper()
                )
                if fab_detection.get("has_fabrication") and not warning_already_visible:
                    _print_no_fabrication_warning(fab_detection)


def _chat_tui_with_safety_prompt(
    user_input: str,
    history: list,
    pasien: dict,
    model: str,
    backend: str,
    console_override,
) -> str:
    """TUI chat wrapper that mirrors CLI safety prompt preparation."""
    intake_context = _build_clinical_intake_context(user_input, pasien)

    return _chat(
        intake_context["augmented_prompt"],
        history,
        pasien,
        model,
        backend,
        console_override=console_override,
        kasus=intake_context["kasus"],
    )


def main_tui() -> None:
    """Launch Textual TUI mode — full-screen split-panel interface."""
    from sidelab.tui import SidelabApp

    backend = resolve_backend_choice(None)  # baca dari env SIDELAB_DEFAULT_BACKEND
    model = default_model_for_backend(backend)
    backend_ready, _, _ = check_backend_readiness(backend)
    session_id = uuid.uuid4().hex[:8].upper()

    app = SidelabApp(
        chat_fn=_chat_tui_with_safety_prompt,
        save_fn=_save_session,
        backend_label=_backend_label(backend),
        model=model,
        session_id=session_id,
        backend_ready=backend_ready,
    )
    app.run()


if __name__ == "__main__":
    import argparse as _argparse

    _ap = _argparse.ArgumentParser(add_help=False)
    _ap.add_argument("--tui", action="store_true")
    _ap.add_argument("--terminal", action="store_true")
    _args, _ = _ap.parse_known_args()

    if _args.terminal:
        main()
    else:
        main_tui()  # TUI adalah default
