#!/usr/bin/env python3
"""
SideLab CDSS Engine — FastAPI REST wrapper
Exposes the SideLab clinical intelligence engine as a JSON API.
"""
from __future__ import annotations

import asyncio
import io
import os
import re
import sys
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Optional

# ── FastAPI ───────────────────────────────────────────────────────────────
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# ── Engine path setup ─────────────────────────────────────────────────────
ENGINE_DIR = Path(__file__).parent
sys.path.insert(0, str(ENGINE_DIR))
os.chdir(str(ENGINE_DIR))  # data/ paths are relative to ENGINE_DIR

os.environ.setdefault("SIDELAB_DEFAULT_BACKEND", "openai")
os.environ.setdefault("SIDELAB_MAX_TOKENS", "1800")  # enough for all 9 sections

# ── Patch OpenRouter into provider registry BEFORE any sidelab import ─────
from sidelab.llm import config as _llm_config  # noqa: E402

_OPENROUTER_FREE_FALLBACK = (
    "openai/gpt-oss-20b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "google/gemma-4-31b-it:free",
    "tencent/hy3:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
)

_llm_config.PROVIDER_REGISTRY["openai"] = {
    "label": "OpenAI",
    "base_url": "https://api.openai.com/v1",
    "api_key_env": "OPENAI_API_KEY",
    "models": ("gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4.1"),
    "default_model": "gpt-4o-mini",
    "client": "openai_compat",
}

_llm_config.PROVIDER_REGISTRY["openrouter"] = {
    "label": "OpenRouter",
    "base_url": "https://openrouter.ai/api/v1",
    "base_url_env": "OPENROUTER_BASE_URL",
    "api_key_env": "OPENROUTER_API_KEY",
    "timeout_env": "OPENROUTER_TIMEOUT",
    "models": _OPENROUTER_FREE_FALLBACK,
    "default_model": os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-20b:free"),
    "model_env": "OPENROUTER_MODEL",
    "client": "openai_compat",
}

# Patch normalize_backend so "openrouter" is valid
_orig_normalize = _llm_config.normalize_backend


def _normalize_patched(raw: str) -> str:
    if str(raw).lower().strip() == "openrouter":
        return "openrouter"
    return _orig_normalize(raw)


_llm_config.normalize_backend = _normalize_patched

# ── Now load sidelab.py DIRECTLY (bypass sidelab/ package which shadows it) ──
import importlib.util as _ilu  # noqa: E402

_spec = _ilu.spec_from_file_location("sidelab_core", ENGINE_DIR / "sidelab.py")
_core = _ilu.module_from_spec(_spec)
_spec.loader.exec_module(_core)  # type: ignore[union-attr]

# Patch router module's normalize reference too
from sidelab.llm import router as _llm_router  # noqa: E402
_llm_router.normalize_backend = _normalize_patched

# Red flag detector (deterministic, no LLM needed)
from sidelab.safety.red_flags import (  # noqa: E402
    _detect_red_flags,
    _get_red_flag_disease_details,
)
from sidelab.safety.output_pipeline import finalize_clinical_output  # noqa: E402
from sidelab.intelligence import (  # noqa: E402
    build_chain_scaffold,
    semantic_retrieve,
    calibrate_certainty,
    _match_chains,
)
from sidelab.session_store import (  # noqa: E402
    get_session as get_session_file,
    list_sessions,
    save_session as persist_session_file,
)


# ── Safety post-processing helper ─────────────────────────────────────────
def _apply_safety_pipeline(raw_text: str, complaint: str, patient: dict) -> tuple[str, list[str]]:
    """Run finalize_clinical_output on raw model output.

    Returns (safe_text, red_flag_alerts).  Falls back to raw_text if the
    safety pipeline raises — never blocks clinical output entirely.
    """
    rf_details = _get_red_flag_disease_details(complaint)
    red_flag_alerts = [d["alert"] for d in rf_details]
    kasus = {"keluhan": complaint}
    try:
        pharma_fn = getattr(_core, "_format_farmakologi_tree", None)
        finalized = finalize_clinical_output(
            response=raw_text,
            prompt=complaint,
            kasus=kasus,
            pasien=patient,
            rf_details=rf_details,
            pharma_format_fn=pharma_fn,
            apply_pharma=pharma_fn is not None,
            enforce_pharma_floor=pharma_fn is not None,
        )
        return finalized.text, red_flag_alerts
    except Exception:
        return raw_text, red_flag_alerts


def _compute_certainty(complaint: str, patient: dict) -> str:
    """Compute certainty level from available clinical data."""
    try:
        kasus = {"keluhan": complaint}
        chains = _match_chains(complaint.lower())
        return calibrate_certainty(kasus, patient, chains)
    except Exception:
        return "possible"

# ── Thread executor (single worker — avoids global-state races in sidelab) ─
_executor = ThreadPoolExecutor(max_workers=1)
_consult_lock = threading.Lock()

# ── FastAPI app ───────────────────────────────────────────────────────────
app = FastAPI(title="SideLab CDSS Engine", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3001",
        "http://localhost:3001",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# ── Pydantic models ───────────────────────────────────────────────────────
class PatientData(BaseModel):
    nama: str = Field(default="", max_length=200)
    umur: str = Field(default="", max_length=50)
    jk: str = Field(default="", max_length=20)
    bb: str = Field(default="", max_length=20)
    tb: str = Field(default="", max_length=20)
    alergi: str = Field(default="", max_length=500)
    komorbid: str = Field(default="", max_length=500)
    obat: str = Field(default="", max_length=500)


class ConsultRequest(BaseModel):
    complaint: str = Field(..., min_length=1, max_length=5000)
    patient: PatientData = PatientData()
    history: list[dict] = Field(default_factory=list, max_length=50)
    backend: str = Field(default="openrouter", max_length=50)
    model: Optional[str] = Field(default=None, max_length=100)


class ConsultResponse(BaseModel):
    raw: str
    sections: dict
    red_flags: list[str]
    history: list[dict]
    certainty: str = "possible"


# ── Clinical output parser ────────────────────────────────────────────────
_SECTION_KEYS = [
    "RINGKASAN KASUS",
    "DIAGNOSIS BANDING",
    "DIAGNOSIS KERJA",
    "ANJURAN PEMERIKSAAN",
    "TATALAKSANA",
    "FARMAKOLOGI",
    "EDUKASI PASIEN",
    "KRITERIA RUJUK",
    "PROGNOSIS",
]

_SECTION_PATTERN = re.compile(
    r"(" + "|".join(re.escape(k) for k in _SECTION_KEYS) + r")\s*:",
    re.IGNORECASE,
)


def _parse_clinical_output(text: str) -> dict[str, Any]:
    """Split the structured SideLab text output into a dict of sections."""
    if not text.strip():
        return {}

    parts: dict[str, str] = {}
    # Find all section header positions
    matches = list(_SECTION_PATTERN.finditer(text))
    for i, m in enumerate(matches):
        key = m.group(1).upper().strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        content = text[start:end].strip()
        parts[key] = content

    # ── DIAGNOSIS BANDING ─────────────────────────────────────────────────
    # Handle both newline-per-item and inline "[ICD] Name - reason. [ICD]..." formats
    dx_banding = []
    if "DIAGNOSIS BANDING" in parts:
        raw_db = parts["DIAGNOSIS BANDING"]
        # Split by ICD-10 bracket start — handles inline model output
        chunks = re.split(r"(?=\[[A-Z]\d)", raw_db)
        for chunk in chunks:
            chunk = chunk.strip().rstrip(". ")
            if not chunk:
                continue
            m = re.match(r"\[([^\]]+)\]\s*(.+?)\s*[-—–]\s*(.+)", chunk, re.DOTALL)
            if m:
                dx_banding.append({
                    "icd10": m.group(1).strip(),
                    "name": m.group(2).strip()[:80],
                    "reason": m.group(3).strip()[:200],
                })
            elif chunk and not chunk.startswith("["):
                dx_banding.append({"icd10": "", "name": chunk[:120], "reason": ""})

    # ── DIAGNOSIS KERJA ───────────────────────────────────────────────────
    dx_kerja = {}
    if "DIAGNOSIS KERJA" in parts:
        raw_dk = parts["DIAGNOSIS KERJA"].strip()
        m = re.match(r"\[([^\]]+)\]\s*(.+?)\s*[-—–]\s*(.+)", raw_dk, re.DOTALL)
        if m:
            dx_kerja = {
                "icd10": m.group(1).strip(),
                "name": m.group(2).strip()[:80],
                "reason": m.group(3).strip()[:300],
            }
        else:
            dx_kerja = {"icd10": "", "name": raw_dk[:120], "reason": ""}

    # ── FARMAKOLOGI ───────────────────────────────────────────────────────
    # Model outputs inline: "Syr DrugA Fx Dose; DDI: ...; KI: ...; Syr DrugB Fx Dose; DDI: ..."
    # OR newline-per-drug: "DrugA\nDDI: ...\nKI: ..."
    _DRUG_FORMS = r"(?:Syr|Tab|Caps|Inj|Krim|Supp|Drop|Neb|Salep|Puyer|Sol|Gel|Patch)"
    drugs = []
    if "FARMAKOLOGI" in parts:
        raw_f = parts["FARMAKOLOGI"]

        # ① Try structured newline format first (drug / DDI: / KI: on separate lines)
        lines = [l.strip() for l in raw_f.splitlines() if l.strip()]
        if len(lines) >= 3 and any(l.upper().startswith("DDI:") for l in lines):
            i = 0
            while i < len(lines):
                line = lines[i]
                if re.match(r"(?i)^(ddi|ki):", line):
                    i += 1
                    continue
                ddi_line = lines[i + 1] if i + 1 < len(lines) else ""
                ki_line  = lines[i + 2] if i + 2 < len(lines) else ""
                if ddi_line.upper().startswith("DDI:") and ki_line.upper().startswith("KI:"):
                    drugs.append({"drug": line, "ddi": ddi_line[4:].strip(), "ki": ki_line[3:].strip()})
                    i += 3
                else:
                    drugs.append({"drug": line, "ddi": "", "ki": ""})
                    i += 1

        else:
            # ② Inline format — split by drug-form prefix OR by DDI: delimiter
            # Strategy: split whole blob into per-drug chunks at each form-keyword boundary
            # Pattern: "Syr X ...; DDI: ...; KI: ...; Tab Y ..."
            # Split at semicolon/period followed by a drug-form keyword
            chunks = re.split(
                rf"(?<=[;.])\s*(?={_DRUG_FORMS}\b)",
                raw_f,
            )
            # Also try splitting on "Syr|Tab|..." at word boundary if no matches
            if len(chunks) <= 1:
                chunks = re.split(rf"(?<!^)(?=\b{_DRUG_FORMS}\b)", raw_f)

            for chunk in chunks:
                chunk = chunk.strip().rstrip(";. ")
                if not chunk:
                    continue
                # Extract DDI and KI — allow both ";" and "." as separators
                m = re.search(
                    r"^(.+?)(?:[;.]\s*)DDI:\s*(.+?)(?:[;.]\s*)KI:\s*(.+?)$",
                    chunk, re.IGNORECASE | re.DOTALL,
                )
                if m:
                    drugs.append({
                        "drug": m.group(1).strip(),
                        "ddi": m.group(2).strip().rstrip(";. "),
                        "ki":  m.group(3).strip().rstrip(";. "),
                    })
                elif chunk:
                    # No DDI/KI found — store as plain drug line
                    drugs.append({"drug": chunk, "ddi": "", "ki": ""})

    # ── Generic list sections ─────────────────────────────────────────────
    def _split_items(text_blob: str) -> list[str]:
        """Split section content into individual items.
        Handles both newline-separated and sentence-separated (model inline) formats.
        """
        if not text_blob:
            return []
        # Prefer newline-split
        lines = [l.strip().lstrip("-•·*0123456789.) ").strip()
                 for l in text_blob.splitlines() if l.strip()]
        if len(lines) >= 2:
            return [l for l in lines if l]
        # Inline: split by ". " followed by capital letter or number
        pieces = re.split(r"\.\s+(?=[A-Z\(])", text_blob)
        result = []
        for p in pieces:
            p = p.strip().lstrip("-•·*0123456789.) ").rstrip(". ")
            if p:
                result.append(p)
        return result if result else [text_blob.strip()]

    def _lines(key: str) -> list[str]:
        if key not in parts:
            return []
        return _split_items(parts[key])

    return {
        "ringkasan": parts.get("RINGKASAN KASUS", ""),
        "diagnosis_banding": dx_banding,
        "diagnosis_kerja": dx_kerja,
        "pemeriksaan": _lines("ANJURAN PEMERIKSAAN"),
        "tatalaksana": _lines("TATALAKSANA"),
        "farmakologi": drugs,
        "edukasi": _lines("EDUKASI PASIEN"),
        "kriteria_rujuk": _lines("KRITERIA RUJUK"),
        "prognosis": parts.get("PROGNOSIS", ""),
        "_raw_sections": parts,
    }


# ── Direct OpenRouter clinical call (bypasses sidelab post-processing) ────
def _build_cdss_system(patient: dict, complaint: str = "") -> str:
    """Build the structured CDSS system prompt."""
    pasien_str = ""
    if patient:
        parts = []
        for key, label in [
            ("nama", "Nama"), ("umur", "Umur"), ("jk", "JK"),
            ("bb", "BB"), ("tb", "TB"), ("alergi", "Alergi"),
            ("obat", "Obat"), ("komorbid", "Komorbid"),
        ]:
            if patient.get(key):
                suffix = " kg" if key == "bb" else (" cm" if key == "tb" else "")
                parts.append(f"{label}: {patient[key]}{suffix}")
        if parts:
            pasien_str = "DATA PASIEN:\n" + " | ".join(parts) + "\n\n"

    intelligence_block = ""
    if complaint.strip():
        kasus = {"keluhan": complaint}
        chain_scaffold = build_chain_scaffold(complaint, kasus)
        retrieved = semantic_retrieve(complaint, top_k=3)
        if chain_scaffold:
            intelligence_block += chain_scaffold + "\n\n"
        if retrieved:
            ref_lines = ["DATA REFERENSI (disease knowledge base):"]
            for r in retrieved:
                icd = r.get("icd10", "")
                nama = r.get("nama", "")
                ref_lines.append(f"  [{icd}] {nama}")
            intelligence_block += "\n".join(ref_lines) + "\n\n"

    return (
        f"{pasien_str}"
        f"{intelligence_block}"
        "Kamu adalah SIDELAB, asisten klinis FKTP/Puskesmas Indonesia. "
        "Panduan: SKDI, FORNAS 2023, PPK IDI. Bahasa Indonesia formal. "
        "Gunakan DATA REFERENSI bila tersedia.\n\n"
        "KESELAMATAN:\n"
        "1. Kondisi jiwa-mengancam (stroke, ACS/IMA, meningitis, SAH, distress napas) HARUS masuk DIAGNOSIS KERJA — TIDAK BOLEH dikubur di banding.\n"
        "2. Pada data minimal, buat 1-2 diagnosis konservatif satu sistem.\n"
        "3. Data singkat/umum — diagnosis konservatif, prioritaskan klarifikasi.\n\n"
        "FORMAT WAJIB — tulis PERSIS 9 header ini, masing-masing di baris baru diikuti titik dua:\n"
        "RINGKASAN KASUS:\n"
        "DIAGNOSIS BANDING:\n"
        "DIAGNOSIS KERJA:\n"
        "ANJURAN PEMERIKSAAN:\n"
        "TATALAKSANA:\n"
        "FARMAKOLOGI:\n"
        "EDUKASI PASIEN:\n"
        "KRITERIA RUJUK:\n"
        "PROGNOSIS:\n\n"
        "ATURAN FORMAT:\n"
        "- RINGKASAN KASUS: 2-3 kalimat padat, keluhan utama, durasi, konteks klinis.\n"
        "- DIAGNOSIS BANDING: Min 2 entri. Format tiap baris: [ICD-10] Nama — alasan klinis\n"
        "- DIAGNOSIS KERJA: 1 diagnosis. Format: [ICD-10] Nama — alasan vs banding\n"
        "- ANJURAN PEMERIKSAAN: Tiap baris: Nama pemeriksaan — temuan yang dicari\n"
        "- TATALAKSANA: Non-farmakologi, 1 langkah per baris.\n"
        "- FARMAKOLOGI: Tiap obat tepat 3 baris berurutan:\n"
        "  Baris 1: FORMAT RESEP SINGKAT → [Bentuk] NamaObat Fx[Dosis][Satuan] [durasi]\n"
        "    Bentuk: Syr / Tab / Caps / Inj / Krim / Supp / Drop / Neb\n"
        "    F = frekuensi per hari (1x, 2x, 3x, 4x)\n"
        "    Satuan sirup: CTH (= 5 ml). Satuan tablet: mg atau tab.\n"
        "    Bila ada data BB pasien, hitung dosis aktual berdasarkan BB.\n"
        "    SEDIAAN BERDASARKAN USIA (WAJIB DIPATUHI):\n"
        "      - Pasien DEWASA (umur ≥12 tahun atau tidak disebutkan umurnya): HARUS Tab/Caps/Inj. DILARANG Syr/Drop kecuali ada kondisi disfagia/NGT eksplisit.\n"
        "      - Pasien ANAK (<12 tahun): boleh Syr/Drop; hitung dosis per BB.\n"
        "    Contoh anak: Syr Paracetamol 4x1 CTH 3 hari\n"
        "    Contoh dewasa: Tab Paracetamol 3x500 mg 3 hari\n"
        "    Contoh antibiotik anak: Syr Amoksisilin 3x1.5 CTH 7 hari\n"
        "    Contoh injeksi: Inj Ketorolac 30 mg iv 3x1 3 hari\n"
        "  Baris 2: DDI: interaksi signifikan atau tidak signifikan\n"
        "  Baris 3: KI: kontraindikasi utama atau tidak ada absolut\n"
        "  Wajib min 2 obat bila data klinis cukup. Hanya FORNAS 2023.\n"
        "- EDUKASI PASIEN: 1 poin per baris.\n"
        "- KRITERIA RUJUK: 1 kondisi per baris. Sebutkan algoritma/skor relevan bila ada.\n"
        "- PROGNOSIS: 1-2 kalimat singkat, faktor penentu.\n\n"
        "PENTING: Selesaikan SEMUA 9 bagian. Jangan berhenti di tengah. Jangan gunakan markdown bold/bullet (**, ##, *). "
        "Jangan gunakan karakter non-Latin/Cyrillic. Tiap item 1 baris padat."
    )


def _normalize_text(text: str | None) -> str:
    """Fix mojibake and strip garbage characters."""
    if not text:
        return ""
    # Fix UTF-8 bytes decoded as Latin-1
    if isinstance(text, str):
        try:
            text = text.encode("latin-1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass

    # Normalize spacing/dashes
    text = (text
        .replace("\u202f", " ")
        .replace("\u00a0", " ")
        .replace("\u2014", " - ")
        .replace("\u2013", " - ")
    )

    # Strip Cyrillic / unexpected non-Latin blocks (keep Latin, Greek medical symbols, CJK not expected)
    import unicodedata
    cleaned = []
    for ch in text:
        cp = ord(ch)
        # Keep: ASCII + extended Latin + common punctuation + ICD chars
        if cp < 0x0500:  # below Cyrillic block
            cleaned.append(ch)
        elif ch in "°±×÷":
            cleaned.append(ch)
        else:
            cleaned.append(" ")  # replace Cyrillic/garbage with space

    text = re.sub(r" {2,}", " ", "".join(cleaned))
    return text


def _get_api_config(backend: str) -> tuple[str, str]:
    """Return (endpoint_url, api_key) for the given backend."""
    cfg = _llm_config.PROVIDER_REGISTRY.get(backend, {})
    key_env = cfg.get("api_key_env", "")
    api_key = os.getenv(key_env, "")
    base_url = cfg.get("base_url", "https://openrouter.ai/api/v1")
    url = f"{base_url}/chat/completions"
    return url, api_key


def _direct_consult(
    complaint: str,
    patient: dict,
    history: list[dict],
    backend: str,
    model: str,
) -> str:
    """Call provider API directly with our controlled prompt. Returns raw clinical text."""
    import urllib.request as _ureq
    import json as _json

    url, api_key = _get_api_config(backend)
    if not api_key:
        raise RuntimeError(
            f"API key untuk backend '{backend}' tidak ditemukan. "
            f"Tambahkan {_llm_config.PROVIDER_REGISTRY.get(backend, {}).get('api_key_env', 'API_KEY')} ke environment secrets."
        )

    system_msg = _build_cdss_system(patient, complaint)
    messages: list[dict] = [{"role": "system", "content": system_msg}]
    for h in history[-4:]:
        if h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": str(h["content"])[:800]})
    messages.append({"role": "user", "content": complaint})

    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "max_tokens": 1800,
        "temperature": 0.3,
    }

    req = _ureq.Request(
        url,
        data=_json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )
    with _ureq.urlopen(req, timeout=120) as resp:
        result = _json.loads(resp.read())

    if "error" in result:
        err = result["error"]
        msg = err.get("message") if isinstance(err, dict) else str(err)
        raise RuntimeError(f"{backend} error: {msg}")

    raw = result["choices"][0]["message"]["content"]
    return _normalize_text(raw)


# ── Consultation worker (runs in thread) ──────────────────────────────────
def _run_consult(
    complaint: str,
    patient: dict,
    history: list[dict],
    backend: str,
    model: str,
) -> tuple[str, list[dict]]:
    history_copy = list(history)

    # Use direct call for known backends — bypasses sidelab post-processing which truncates output
    if backend in ("openrouter", "openai"):
        raw = _direct_consult(complaint, patient, history_copy, backend, model)
    else:
        # Fallback: use sidelab _chat for other backends
        from rich.console import Console
        buf = io.StringIO()
        mock_console = Console(file=buf, force_terminal=False, no_color=True, width=120)
        with _consult_lock:
            raw = _core._chat(
                complaint, history_copy, patient, model, backend,
                console_override=mock_console,
            )
        if not raw:
            console_output = buf.getvalue().strip()
            clean = re.sub(r"\[[^\]]*\]", "", console_output).strip()
            raise RuntimeError(clean or "Engine mengembalikan respons kosong.")
        raw = _normalize_text(raw)

    # Append to history for follow-up turns
    history_copy.append({"role": "user", "content": complaint})
    history_copy.append({"role": "assistant", "content": raw})

    return raw, history_copy


# ── Routes ────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "engine": "SideLab CDSS", "version": "0.1.0"}


def _fetch_openrouter_free_models() -> list[str]:
    """Fetch live free models from OpenRouter /models — returns fallback list on any error."""
    import urllib.request, urllib.error, json as _json
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if not api_key:
        return list(_OPENROUTER_FREE_FALLBACK)
    try:
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = _json.loads(resp.read())
        # Filter: pricing.prompt == "0" means free
        free = [
            m["id"] for m in data.get("data", [])
            if str(m.get("pricing", {}).get("prompt", "1")) == "0"
            and m["id"].endswith(":free")
        ]
        # Prefer quality models: sort by rough tier (NVIDIA ultra > super > nano, others alphabetically)
        tier_order = {
            "nvidia/nemotron-3-ultra": 0,
            "nvidia/nemotron-3-super": 1,
            "openai/gpt-oss": 2,
            "google/gemma-4-31b": 3,
            "qwen/qwen3": 4,
        }
        def _tier(m: str) -> int:
            for prefix, rank in tier_order.items():
                if m.startswith(prefix):
                    return rank
            return 99

        free.sort(key=lambda m: (_tier(m), m))
        return free if free else list(_OPENROUTER_FREE_FALLBACK)
    except Exception:
        return list(_OPENROUTER_FREE_FALLBACK)


@app.get("/backends")
def list_backends():
    # Dynamically resolve the current live free models for OpenRouter
    live_free = _fetch_openrouter_free_models()

    backends = []
    for key, spec in _llm_config.PROVIDER_REGISTRY.items():
        if key == "local":
            continue  # skip Ollama (not available in cloud env)
        models = live_free if key == "openrouter" else list(spec.get("models", []))
        default = models[0] if models else spec.get("default_model", "")
        backends.append({
            "id": key,
            "label": spec.get("label", key),
            "models": models,
            "default_model": default,
        })
    return {"backends": backends}


@app.post("/consult/stream")
async def consult_stream(req: ConsultRequest):
    """Server-Sent Events endpoint — streams tokens then sends final parsed JSON."""
    from starlette.concurrency import iterate_in_threadpool
    import json as _json

    if not req.complaint.strip():
        raise HTTPException(status_code=400, detail="Keluhan tidak boleh kosong")

    backend   = req.backend or "openai"
    model     = req.model or _llm_config.PROVIDER_REGISTRY.get(backend, {}).get("default_model", "")
    patient   = req.patient.model_dump()
    red_flags = _detect_red_flags(req.complaint)
    endpoint, api_key = _get_api_config(backend)

    if not api_key:
        key_env = _llm_config.PROVIDER_REGISTRY.get(backend, {}).get("api_key_env", "API_KEY")
        raise HTTPException(status_code=500, detail=f"{key_env} tidak ditemukan")

    system_msg = _build_cdss_system(patient, req.complaint)
    messages: list[dict] = [{"role": "system", "content": system_msg}]
    for h in req.history[-4:]:
        if h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": str(h["content"])[:800]})
    messages.append({"role": "user", "content": req.complaint})

    payload = {
        "model": model, "messages": messages,
        "stream": True, "max_tokens": 1800, "temperature": 0.3,
    }

    def _sync_sse_generator():
        """Sync generator — runs in thread pool via iterate_in_threadpool."""
        import requests as _req

        buf: list[str] = []
        try:
            resp = _req.post(
                endpoint,
                json=payload,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                stream=True,
                timeout=120,
            )
            if resp.status_code >= 400:
                err_text = resp.text[:300]
                yield f"data: {_json.dumps({'error': f'{backend} {resp.status_code}: {err_text}'})}\n\n"
                return

            for line in resp.iter_lines(decode_unicode=True):
                if not line or line.startswith(":"):
                    continue
                if not line.startswith("data:"):
                    continue
                raw = line[5:].strip()
                if raw == "[DONE]":
                    break
                try:
                    chunk = _json.loads(raw)
                    token = (chunk.get("choices") or [{}])[0].get("delta", {}).get("content") or ""
                    if token:
                        buf.append(token)
                        yield f"data: {_json.dumps({'t': token})}\n\n"
                except Exception:
                    pass

        except Exception as exc:
            yield f"data: {_json.dumps({'error': str(exc)})}\n\n"
            return

        # Final event — safety-pipelined text + parsed sections
        raw_text  = _normalize_text("".join(buf))
        safe_text, rf_alerts = _apply_safety_pipeline(raw_text, req.complaint, patient)
        all_flags = red_flags + [a for a in rf_alerts if a not in red_flags]
        sections  = _parse_clinical_output(safe_text)
        history_out = list(req.history)
        history_out.append({"role": "user",      "content": req.complaint})
        history_out.append({"role": "assistant", "content": safe_text})
        final = {
            "done": True, "raw": safe_text, "sections": sections,
            "red_flags": all_flags, "history": history_out,
            "certainty": _compute_certainty(req.complaint, patient),
        }
        yield f"data: {_json.dumps(final)}\n\n"

    return StreamingResponse(
        iterate_in_threadpool(_sync_sse_generator()),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/consult", response_model=ConsultResponse)
async def consult(req: ConsultRequest):
    if not req.complaint.strip():
        raise HTTPException(status_code=400, detail="Keluhan tidak boleh kosong")

    backend = req.backend or "openrouter"
    model = req.model or _llm_config.PROVIDER_REGISTRY.get(backend, {}).get("default_model", "")

    patient = req.patient.model_dump()

    # Deterministic red flag check (fast, no LLM)
    red_flags = _detect_red_flags(req.complaint)

    loop = asyncio.get_event_loop()
    try:
        raw, new_history = await loop.run_in_executor(
            _executor,
            _run_consult,
            req.complaint,
            patient,
            req.history,
            backend,
            model,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Engine error: {str(e)}")

    safe_text, rf_alerts = _apply_safety_pipeline(raw, req.complaint, patient)
    all_flags = red_flags + [a for a in rf_alerts if a not in red_flags]
    new_history[-1]["content"] = safe_text
    sections = _parse_clinical_output(safe_text)

    return ConsultResponse(
        raw=safe_text,
        sections=sections,
        red_flags=all_flags,
        history=new_history,
        certainty=_compute_certainty(req.complaint, patient),
    )


# ── Session persistence endpoints ─────────────────────────────────────────
@app.get("/sessions")
def api_list_sessions() -> dict:
    return {"sessions": list_sessions()}


@app.get("/sessions/{filename}")
def api_get_session(filename: str) -> dict:
    result = get_session_file(filename)
    if result is None:
        raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
    return result


@app.post("/sessions/save")
async def api_save_session(req: ConsultRequest) -> dict:
    patient = req.patient.model_dump()
    session_id = uuid.uuid4().hex[:8].upper()
    filepath = persist_session_file(
        req.history,
        patient,
        session_id,
        backend=req.backend,
        model=req.model or "",
    )
    return {"id": session_id, "path": str(filepath)}


# ── Entry point ───────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("CDSS_PORT", "5000"))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
