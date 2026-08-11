# Sentra Corpus Engine PoC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Corpus Engine PoC from `docs/superpowers/specs/2026-08-11-medical-pdf-rag-design.md`: PDF → canonical DoclingDocument JSON → quality gate → Postgres (documents/blocks/chunks + pgvector) → cited semantic query, passing all five PoC gates.

**Architecture:** Docling parses PDFs once into lossless JSON on disk (source of truth). A CocoIndex app materializes three Sentra-owned tables in Postgres; chunks carry BGE-M3 embeddings and provenance to blocks/pages. A text quality gate scores every page before anything enters the canonical store.

**Tech Stack:** Python 3.11+ (uv), docling (MIT), cocoindex (Apache-2.0), sentence-transformers + BAAI/bge-m3 (MIT, 1024-dim), PostgreSQL :54329 + pgvector, asyncpg, pytest. Dev-only: reportlab (fixture PDFs).

## Global Constraints

- Licenses: MIT / Apache-2.0 / PostgreSQL / BSD only. No OpenRAIL-M, no NOASSERTION (spec §2–3).
- Canonical rule verbatim (spec §2): "CocoIndex manages the pipeline; it never owns Sentra's semantic schema. The DoclingDocument JSON files on disk are the source of truth. PostgreSQL holds a queryable canonical projection loaded from them. Chunks and embeddings are derivatives that may be dropped and rebuilt at any time."
- Embeddings: `BAAI/bge-m3`, `vector(1024)` (spec §5.2).
- Database: local PostgreSQL on port `54329`, pg schema `corpus_engine`.
- Corpus data lives OUTSIDE the repo: `D:\Database\sentra-corpus\raw` (PDFs), `D:\Database\sentra-corpus\canonical` (JSON + `manifest.jsonl`). Never commit PDFs, canonical JSON, `.env`, or model weights.
- New capsule `projects/corpus-engine/` must follow `docs/governance/SAFRS_PROJECT_CAPSULES.md` (template `projects/_template/`).
- Adding Python dependencies is **R2** — flag for designated review in the PR; do not weaken any SAFRS control.
- Commits: Conventional Commits. Shell: PowerShell on Windows (`;` separators, not `&&` in PowerShell 5.1).
- All capsule commands run from `projects/corpus-engine/` unless stated.
- First BGE-M3 use downloads ~2.3 GB of weights to the HF cache; integration tests need GPU or patience on CPU.

---

### Task 1: Capsule scaffold + Python project

**Files:**
- Create: `projects/corpus-engine/AGENTS.md`, `projects/corpus-engine/README.md`
- Create: `projects/corpus-engine/docs/architecture.md`, `docs/data.md`, `docs/testing.md` (copied from `projects/_template/`, placeholders replaced)
- Create: `projects/corpus-engine/pyproject.toml`, `projects/corpus-engine/.env.example`, `projects/corpus-engine/.gitignore`
- Create: `projects/corpus-engine/src/corpus_engine/__init__.py`, `projects/corpus-engine/tests/__init__.py`

**Interfaces:**
- Produces: installable package `corpus_engine`; `uv run pytest` working; env contract `POSTGRES_URL`, `CORPUS_RAW_DIR`, `CORPUS_CANONICAL_DIR`.

- [ ] **Step 1: Verify prerequisites**

Run: `uv --version` (if missing: `winget install astral-sh.uv`), then `python --version` (needs 3.11+), then check Postgres is up: `Test-NetConnection localhost -Port 54329`.

- [ ] **Step 2: Copy template and fill capsule docs**

Copy `projects/_template/*` to `projects/corpus-engine/`. In `AGENTS.md` and `README.md` replace every placeholder: objective = "Convert Sentra's medical PDF corpus into a canonical, agent-ready PostgreSQL knowledge base"; owner = Prof; in-scope paths = `projects/corpus-engine/**`; out of scope = diagnosis logic, UI, deployment; consumes = local Postgres :54329; exposes = pg schema `corpus_engine` (tables `documents`, `blocks`, `chunks`); local verification = the exact commands from this plan (`uv sync`, `uv run pytest -m "not integration"`, `uv run pytest -m integration`). State R2 note: dependency additions require designated review. Fill the three `docs/*.md` from spec §4–§9 content (architecture diagram, data locations, test strategy).

- [ ] **Step 3: Create pyproject.toml**

```toml
[project]
name = "corpus-engine"
version = "0.1.0"
description = "Sentra Corpus Engine — medical PDF corpus to agent-ready PostgreSQL"
requires-python = ">=3.11"
dependencies = [
    "docling>=2.0",
    "cocoindex>=1.0",
    "sentence-transformers>=3.0",
    "asyncpg>=0.29",
    "pgvector>=0.3",
    "python-dotenv>=1.0",
]

[dependency-groups]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.24",
    "reportlab>=4.0",
]

[tool.pytest.ini_options]
markers = ["integration: needs Postgres :54329 and model downloads"]
asyncio_mode = "auto"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/corpus_engine"]
```

- [ ] **Step 4: Create .env.example and .gitignore**

`.env.example` (placeholders only, never real credentials):

```
POSTGRES_URL=postgresql://USER:PASSWORD@localhost:54329/DBNAME
CORPUS_RAW_DIR=D:\Database\sentra-corpus\raw
CORPUS_CANONICAL_DIR=D:\Database\sentra-corpus\canonical
```

`.gitignore`:

```
.env
.venv/
__pycache__/
*.pyc
```

- [ ] **Step 5: Install and verify**

Run: `uv sync` then `uv run python -c "import docling, cocoindex, sentence_transformers; print('ok')"`
Expected: `ok`

- [ ] **Step 6: Commit**

```powershell
git add projects/corpus-engine
git commit -m "feat(corpus-engine): scaffold project capsule (R2: new Python deps)"
```

---

### Task 2: Config + canonical manifest

**Files:**
- Create: `projects/corpus-engine/src/corpus_engine/config.py`
- Create: `projects/corpus-engine/src/corpus_engine/canonical.py`
- Test: `projects/corpus-engine/tests/test_canonical.py`

**Interfaces:**
- Produces: `Config.from_env() -> Config` (fields `postgres_url: str`, `raw_dir: Path`, `canonical_dir: Path`); `file_sha256(path: Path) -> str`; `doc_id_for(path: Path) -> str`; `ManifestEntry` dataclass; `append_manifest(canonical_dir: Path, entry: ManifestEntry) -> None`; `load_manifest(canonical_dir: Path) -> dict[str, ManifestEntry]` (keyed by sha256, last write wins); `canonical_json_path(canonical_dir: Path, doc_id: str) -> Path`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_canonical.py
import json
from pathlib import Path

from corpus_engine.canonical import (
    ManifestEntry, append_manifest, canonical_json_path,
    doc_id_for, file_sha256, load_manifest,
)


def test_sha256_and_doc_id(tmp_path: Path):
    f = tmp_path / "Harrison's Internal Medicine 21e.pdf"
    f.write_bytes(b"hello")
    assert file_sha256(f) == (
        "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    )
    assert doc_id_for(f) == "harrison-s-internal-medicine-21e"


def test_manifest_roundtrip_last_wins(tmp_path: Path):
    e1 = ManifestEntry(sha256="abc", source_path="x.pdf", doc_id="x",
                       status="parsed", pages=3, quality={"verdict": "OK"})
    e2 = ManifestEntry(sha256="abc", source_path="x.pdf", doc_id="x",
                       status="needs_review", pages=3,
                       quality={"verdict": "NEEDS_REVIEW"})
    append_manifest(tmp_path, e1)
    append_manifest(tmp_path, e2)
    loaded = load_manifest(tmp_path)
    assert loaded["abc"].status == "needs_review"
    # file is JSONL with 2 lines
    lines = (tmp_path / "manifest.jsonl").read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 2
    assert json.loads(lines[0])["status"] == "parsed"


def test_canonical_json_path(tmp_path: Path):
    assert canonical_json_path(tmp_path, "doc-1") == tmp_path / "doc-1.json"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_canonical.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'corpus_engine.canonical'`

- [ ] **Step 3: Write implementation**

```python
# src/corpus_engine/config.py
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Config:
    postgres_url: str
    raw_dir: Path
    canonical_dir: Path

    @classmethod
    def from_env(cls) -> "Config":
        load_dotenv()
        url = os.getenv("POSTGRES_URL")
        raw = os.getenv("CORPUS_RAW_DIR")
        canonical = os.getenv("CORPUS_CANONICAL_DIR")
        missing = [n for n, v in [("POSTGRES_URL", url),
                                  ("CORPUS_RAW_DIR", raw),
                                  ("CORPUS_CANONICAL_DIR", canonical)] if not v]
        if missing:
            raise ValueError(f"Missing env vars: {', '.join(missing)}")
        return cls(postgres_url=url, raw_dir=Path(raw), canonical_dir=Path(canonical))
```

```python
# src/corpus_engine/canonical.py
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path


@dataclass
class ManifestEntry:
    sha256: str
    source_path: str
    doc_id: str
    status: str  # parsed | failed | needs_review
    pages: int = 0
    quality: dict = field(default_factory=dict)
    error: str = ""


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def doc_id_for(path: Path) -> str:
    stem = path.stem.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", stem).strip("-")
    return slug or "doc"


def canonical_json_path(canonical_dir: Path, doc_id: str) -> Path:
    return canonical_dir / f"{doc_id}.json"


def _manifest_path(canonical_dir: Path) -> Path:
    return canonical_dir / "manifest.jsonl"


def append_manifest(canonical_dir: Path, entry: ManifestEntry) -> None:
    canonical_dir.mkdir(parents=True, exist_ok=True)
    with _manifest_path(canonical_dir).open("a", encoding="utf-8") as f:
        f.write(json.dumps(asdict(entry), ensure_ascii=False) + "\n")


def load_manifest(canonical_dir: Path) -> dict[str, ManifestEntry]:
    path = _manifest_path(canonical_dir)
    result: dict[str, ManifestEntry] = {}
    if not path.exists():
        return result
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            data = json.loads(line)
            result[data["sha256"]] = ManifestEntry(**data)
    return result
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_canonical.py -v`
Expected: 3 PASS

- [ ] **Step 5: Commit**

```powershell
git add projects/corpus-engine/src/corpus_engine/config.py projects/corpus-engine/src/corpus_engine/canonical.py projects/corpus-engine/tests/test_canonical.py
git commit -m "feat(corpus-engine): config and canonical manifest with sha256 idempotency"
```

---

### Task 3: Fixture PDFs + Docling parse stage

**Files:**
- Create: `projects/corpus-engine/tests/fixtures/make_fixtures.py`
- Create: `projects/corpus-engine/src/corpus_engine/parse.py`
- Test: `projects/corpus-engine/tests/test_parse.py`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `parse_pdf_bytes(content: bytes, name: str) -> dict` (lossless DoclingDocument dict via `export_to_dict()`); fixture generator producing `fixture_good.pdf` (2 pages: heading "Diabetes Mellitus", paragraphs, second heading "Diagnosis") and `fixture_scan.pdf` (1 page, drawings only, no text layer). Fixtures are generated at test time into `tmp`/session dirs, NOT committed.

- [ ] **Step 1: Write fixture generator**

```python
# tests/fixtures/make_fixtures.py
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def make_good_pdf(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=A4)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(72, 780, "Diabetes Mellitus")
    c.setFont("Helvetica", 11)
    y = 750
    for i in range(12):
        c.drawString(
            72, y,
            "Diabetes mellitus is a group of metabolic disorders "
            f"characterized by chronic hyperglycemia. Sentence {i}.",
        )
        y -= 18
    c.showPage()
    c.setFont("Helvetica-Bold", 16)
    c.drawString(72, 780, "Diagnosis")
    c.setFont("Helvetica", 11)
    y = 750
    for i in range(12):
        c.drawString(
            72, y,
            "Diagnosis of diabetes requires fasting plasma glucose "
            f"of 126 mg/dL or higher. Sentence {i}.",
        )
        y -= 18
    c.save()


def make_scan_pdf(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=A4)
    # drawings only — no text layer, mimics a scanned page
    for i in range(20):
        c.line(72, 700 - i * 12, 500, 700 - i * 12)
    c.rect(72, 200, 400, 300)
    c.save()
```

- [ ] **Step 2: Write the failing parse test**

```python
# tests/test_parse.py
from pathlib import Path

import pytest

from corpus_engine.parse import parse_pdf_bytes
from tests.fixtures.make_fixtures import make_good_pdf


@pytest.fixture(scope="session")
def good_pdf(tmp_path_factory) -> Path:
    p = tmp_path_factory.mktemp("pdfs") / "fixture_good.pdf"
    make_good_pdf(p)
    return p


def test_parse_produces_lossless_docling_dict(good_pdf: Path):
    doc = parse_pdf_bytes(good_pdf.read_bytes(), name=good_pdf.name)
    assert doc["schema_name"] == "DoclingDocument"
    assert isinstance(doc.get("texts"), list) and len(doc["texts"]) > 0
    all_text = " ".join(t.get("text", "") for t in doc["texts"])
    assert "Diabetes Mellitus" in all_text
    assert "126 mg/dL" in all_text
    # provenance: every text item carries a page number
    assert all(t["prov"][0]["page_no"] >= 1 for t in doc["texts"] if t.get("prov"))
```

- [ ] **Step 3: Run test to verify it fails**

Run: `uv run pytest tests/test_parse.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'corpus_engine.parse'`

- [ ] **Step 4: Write implementation**

```python
# src/corpus_engine/parse.py
from __future__ import annotations

import functools
import io

from docling.datamodel.base_models import DocumentStream, InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.document_converter import DocumentConverter, PdfFormatOption


@functools.cache
def _converter() -> DocumentConverter:
    # do_ocr=True lets Docling OCR stray text-less (scanned) pages;
    # digital pages keep their native text layer untouched.
    options = PdfPipelineOptions(do_ocr=True)
    return DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options)}
    )


def parse_pdf_bytes(content: bytes, name: str) -> dict:
    source = DocumentStream(name=name, stream=io.BytesIO(content))
    result = _converter().convert(source)
    return result.document.export_to_dict()
```

- [ ] **Step 5: Run test to verify it passes** (first run downloads Docling layout models, takes minutes)

Run: `uv run pytest tests/test_parse.py -v`
Expected: PASS. If the exact key `schema_name` differs in the installed docling version, inspect one exported dict (`uv run python -c "..."`), adjust the assertion to the actual invariant key, and note it in the test comment — do NOT weaken the lossless-dict assertions on texts/prov.

- [ ] **Step 6: Commit**

```powershell
git add projects/corpus-engine/src/corpus_engine/parse.py projects/corpus-engine/tests
git commit -m "feat(corpus-engine): Docling parse stage with lossless export and OCR fallback"
```

---

### Task 4: Text quality gate

**Files:**
- Create: `projects/corpus-engine/src/corpus_engine/quality.py`
- Test: `projects/corpus-engine/tests/test_quality.py`

**Interfaces:**
- Consumes: DoclingDocument dict from Task 3.
- Produces: `PageQuality` dataclass (`page: int`, `chars: int`, `replacement_ratio: float`, `wordlike_ratio: float`, `verdict: str`); `assess_page(page: int, text: str) -> PageQuality`; `assess_document(doc: dict) -> DocQuality` where `DocQuality` has `verdict: str` (`OK` | `NEEDS_REVIEW`), `pages: list[PageQuality]`, `bad_page_ratio: float`, and `as_dict() -> dict`. Verdict values per page: `OK`, `OCR_FALLBACK` (empty/text-poor), `GARBLED` (mojibake). Document is `NEEDS_REVIEW` when > 20% of pages are not `OK`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_quality.py
from corpus_engine.quality import assess_document, assess_page


def test_good_page_ok():
    q = assess_page(1, "Diagnosis of diabetes requires fasting plasma glucose "
                       "of 126 mg/dL or higher, measured on two occasions.")
    assert q.verdict == "OK"
    assert q.replacement_ratio == 0.0


def test_empty_page_flags_ocr_fallback():
    assert assess_page(2, "").verdict == "OCR_FALLBACK"
    assert assess_page(3, "   \n ").verdict == "OCR_FALLBACK"


def test_mojibake_page_flags_garbled():
    garbled = "\ufffd\ufffd\ufffd gluc\ufffdse \ue001\ue002 " * 10
    assert assess_page(4, garbled).verdict == "GARBLED"


def test_gibberish_page_flags_garbled():
    gibberish = "qzxw jkqp zzxv qqwx " * 30
    q = assess_page(5, gibberish)
    assert q.verdict == "GARBLED"
    assert q.wordlike_ratio < 0.5


def _doc_with_pages(page_texts: dict[int, str]) -> dict:
    texts = []
    for page, text in page_texts.items():
        texts.append({"text": text, "prov": [{"page_no": page}]})
    return {"texts": texts, "tables": [],
            "pages": {str(p): {} for p in page_texts}}


def test_document_verdict_threshold():
    good = ("The patient presented with polyuria and polydipsia. "
            "Fasting glucose was elevated above the diagnostic threshold.")
    ok_doc = _doc_with_pages({1: good, 2: good, 3: good, 4: good, 5: ""})
    assert assess_document(ok_doc).verdict == "OK"  # 1/5 bad = 20%, not > 20%

    bad_doc = _doc_with_pages({1: good, 2: "", 3: ""})
    res = assess_document(bad_doc)
    assert res.verdict == "NEEDS_REVIEW"
    assert res.bad_page_ratio > 0.2
    assert res.as_dict()["verdict"] == "NEEDS_REVIEW"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_quality.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'corpus_engine.quality'`

- [ ] **Step 3: Write implementation**

```python
# src/corpus_engine/quality.py
from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import asdict, dataclass, field

_REPLACEMENT = re.compile(r"[\ufffd\ue000-\uf8ff]")
# a "word-like" token: 2+ letters containing at least one vowel (en/id both vowel-rich)
_WORDLIKE = re.compile(r"^[^\W\d_]{2,}$")
_VOWELS = set("aeiouAEIOU")

MIN_PAGE_CHARS = 20
GARBLED_REPLACEMENT_RATIO = 0.05
MIN_WORDLIKE_RATIO = 0.5
DOC_BAD_PAGE_THRESHOLD = 0.2


@dataclass
class PageQuality:
    page: int
    chars: int
    replacement_ratio: float
    wordlike_ratio: float
    verdict: str  # OK | OCR_FALLBACK | GARBLED


@dataclass
class DocQuality:
    verdict: str  # OK | NEEDS_REVIEW
    bad_page_ratio: float
    pages: list[PageQuality] = field(default_factory=list)

    def as_dict(self) -> dict:
        return asdict(self)


def assess_page(page: int, text: str) -> PageQuality:
    stripped = text.strip()
    chars = len(stripped)
    if chars < MIN_PAGE_CHARS:
        return PageQuality(page, chars, 0.0, 0.0, "OCR_FALLBACK")

    replacement_ratio = len(_REPLACEMENT.findall(stripped)) / chars
    tokens = stripped.split()
    wordlike = [
        t for t in tokens
        if _WORDLIKE.match(t) and any(ch in _VOWELS for ch in t)
    ]
    wordlike_ratio = len(wordlike) / len(tokens) if tokens else 0.0

    if replacement_ratio > GARBLED_REPLACEMENT_RATIO or wordlike_ratio < MIN_WORDLIKE_RATIO:
        verdict = "GARBLED"
    else:
        verdict = "OK"
    return PageQuality(page, chars, round(replacement_ratio, 4),
                       round(wordlike_ratio, 4), verdict)


def _page_texts(doc: dict) -> dict[int, str]:
    pages: dict[int, list[str]] = defaultdict(list)
    for item in doc.get("texts", []):
        prov = item.get("prov") or []
        if prov:
            pages[int(prov[0]["page_no"])].append(item.get("text", ""))
    # pages with no text items at all must still be assessed (scan pages)
    for key in doc.get("pages", {}):
        pages.setdefault(int(key), [])
    return {p: " ".join(chunks) for p, chunks in pages.items()}


def assess_document(doc: dict) -> DocQuality:
    page_results = [assess_page(p, t) for p, t in sorted(_page_texts(doc).items())]
    if not page_results:
        return DocQuality(verdict="NEEDS_REVIEW", bad_page_ratio=1.0, pages=[])
    bad = sum(1 for r in page_results if r.verdict != "OK")
    ratio = bad / len(page_results)
    verdict = "NEEDS_REVIEW" if ratio > DOC_BAD_PAGE_THRESHOLD else "OK"
    return DocQuality(verdict=verdict, bad_page_ratio=round(ratio, 4),
                      pages=page_results)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_quality.py -v`
Expected: 5 PASS

- [ ] **Step 5: Commit**

```powershell
git add projects/corpus-engine/src/corpus_engine/quality.py projects/corpus-engine/tests/test_quality.py
git commit -m "feat(corpus-engine): per-page text quality gate with document triage"
```

---

### Task 5: Block extraction (canonical projection)

**Files:**
- Create: `projects/corpus-engine/src/corpus_engine/blocks.py`
- Test: `projects/corpus-engine/tests/test_blocks.py`

**Interfaces:**
- Consumes: DoclingDocument dict (Task 3).
- Produces: `Block` dataclass (`block_id: str`, `doc_id: str`, `type: str`, `section: str`, `page: int`, `text: str`, `payload: dict`); `extract_blocks(doc: dict, doc_id: str) -> list[Block]`. `block_id` = `f"{doc_id}#{self_ref}"` (e.g. `harrison-21e##/texts/4`). `type` values: `heading`, `paragraph`, `list_item`, `caption`, `table`, `other`. `section` = heading path joined with `" > "`, built from `section_header`/`title` items in body reading order. Tables get `payload={"cells": grid_rows}` where `grid_rows: list[list[str]]`, and `text` = flattened cell text (caption + rows joined) so tables are searchable.

- [ ] **Step 1: Write the failing test** (synthetic DoclingDocument dict — stable against docling version drift; the real-PDF path is covered in Task 7's integration test)

```python
# tests/test_blocks.py
from corpus_engine.blocks import extract_blocks

DOC = {
    "schema_name": "DoclingDocument",
    "body": {"children": [
        {"$ref": "#/texts/0"}, {"$ref": "#/texts/1"},
        {"$ref": "#/texts/2"}, {"$ref": "#/texts/3"},
        {"$ref": "#/tables/0"},
    ]},
    "texts": [
        {"self_ref": "#/texts/0", "label": "section_header", "level": 1,
         "text": "Diabetes Mellitus", "prov": [{"page_no": 1}]},
        {"self_ref": "#/texts/1", "label": "text",
         "text": "Diabetes mellitus is a metabolic disorder.",
         "prov": [{"page_no": 1}]},
        {"self_ref": "#/texts/2", "label": "section_header", "level": 2,
         "text": "Diagnosis", "prov": [{"page_no": 2}]},
        {"self_ref": "#/texts/3", "label": "text",
         "text": "Fasting plasma glucose of 126 mg/dL or higher.",
         "prov": [{"page_no": 2}]},
    ],
    "tables": [
        {"self_ref": "#/tables/0", "prov": [{"page_no": 2}],
         "captions": [{"text": "Criteria for the Diagnosis of DM"}],
         "data": {"grid": [
             [{"text": "Test"}, {"text": "Threshold"}],
             [{"text": "FPG"}, {"text": ">= 126 mg/dL"}],
         ]}},
    ],
}


def test_extract_blocks_sections_and_pages():
    blocks = extract_blocks(DOC, "demo")
    by_id = {b.block_id: b for b in blocks}
    assert len(blocks) == 5

    para = by_id["demo##/texts/1"]
    assert para.type == "paragraph"
    assert para.section == "Diabetes Mellitus"
    assert para.page == 1

    diag = by_id["demo##/texts/3"]
    assert diag.section == "Diabetes Mellitus > Diagnosis"
    assert diag.page == 2


def test_extract_table_block():
    blocks = extract_blocks(DOC, "demo")
    table = next(b for b in blocks if b.type == "table")
    assert table.payload["cells"] == [["Test", "Threshold"], ["FPG", ">= 126 mg/dL"]]
    assert "Criteria for the Diagnosis of DM" in table.text
    assert "126 mg/dL" in table.text
    assert table.section == "Diabetes Mellitus > Diagnosis"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_blocks.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'corpus_engine.blocks'`

- [ ] **Step 3: Write implementation**

```python
# src/corpus_engine/blocks.py
from __future__ import annotations

from dataclasses import dataclass, field

_LABEL_TO_TYPE = {
    "section_header": "heading",
    "title": "heading",
    "text": "paragraph",
    "paragraph": "paragraph",
    "list_item": "list_item",
    "caption": "caption",
}


@dataclass
class Block:
    block_id: str
    doc_id: str
    type: str
    section: str
    page: int
    text: str
    payload: dict = field(default_factory=dict)


def _resolve(doc: dict, ref: str) -> dict | None:
    # ref like '#/texts/0' or '#/tables/2'
    try:
        _, collection, index = ref.split("/")
        return doc[collection][int(index)]
    except (ValueError, KeyError, IndexError):
        return None


def _page_of(item: dict) -> int:
    prov = item.get("prov") or []
    return int(prov[0]["page_no"]) if prov else 0


def _table_payload_and_text(item: dict) -> tuple[dict, str]:
    grid = (item.get("data") or {}).get("grid") or []
    rows = [[str(cell.get("text", "")) for cell in row] for row in grid]
    caption = " ".join(c.get("text", "") for c in item.get("captions", []))
    flat = " | ".join(" ".join(r) for r in rows)
    text = f"{caption}: {flat}" if caption else flat
    return {"cells": rows, "caption": caption}, text


def extract_blocks(doc: dict, doc_id: str) -> list[Block]:
    blocks: list[Block] = []
    heading_stack: list[tuple[int, str]] = []  # (level, title)

    for child in (doc.get("body") or {}).get("children", []):
        ref = child.get("$ref", "")
        item = _resolve(doc, ref)
        if item is None:
            continue
        self_ref = item.get("self_ref", ref)
        block_id = f"{doc_id}#{self_ref}"
        page = _page_of(item)

        if ref.startswith("#/tables/"):
            section = " > ".join(t for _, t in heading_stack)
            payload, text = _table_payload_and_text(item)
            blocks.append(Block(block_id, doc_id, "table", section, page, text, payload))
            continue

        label = item.get("label", "")
        btype = _LABEL_TO_TYPE.get(label, "other")
        text = item.get("text", "")

        if btype == "heading":
            level = int(item.get("level", 1))
            while heading_stack and heading_stack[-1][0] >= level:
                heading_stack.pop()
            section = " > ".join(t for _, t in heading_stack)
            blocks.append(Block(block_id, doc_id, btype, section, page, text))
            heading_stack.append((level, text))
        else:
            section = " > ".join(t for _, t in heading_stack)
            blocks.append(Block(block_id, doc_id, btype, section, page, text))

    return blocks
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_blocks.py -v`
Expected: 2 PASS

- [ ] **Step 5: Commit**

```powershell
git add projects/corpus-engine/src/corpus_engine/blocks.py projects/corpus-engine/tests/test_blocks.py
git commit -m "feat(corpus-engine): block extraction with section paths and lossless tables"
```

---

### Task 6: Structure-aware chunker

**Files:**
- Create: `projects/corpus-engine/src/corpus_engine/chunker.py`
- Test: `projects/corpus-engine/tests/test_chunker.py`

**Interfaces:**
- Consumes: `Block` from Task 5.
- Produces: `Chunk` dataclass (`chunk_id: str`, `doc_id: str`, `block_ids: list[str]`, `section: str`, `page_start: int`, `page_end: int`, `text: str`); `chunk_blocks(blocks: list[Block], target_words: int = 350) -> list[Chunk]`. Rules: chunks never cross section boundaries; a `table` block is always its own single chunk (never split, never merged); consecutive text blocks in one section accumulate until `target_words`; headings are prepended to their section's first chunk text but excluded from empty-only chunks. `chunk_id` = `f"{doc_id}#c{running_index:05d}"`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_chunker.py
from corpus_engine.blocks import Block
from corpus_engine.chunker import chunk_blocks


def _para(i: int, section: str, page: int, words: int = 100) -> Block:
    return Block(
        block_id=f"d##/texts/{i}", doc_id="d", type="paragraph",
        section=section, page=page,
        text=" ".join(f"word{n}" for n in range(words)),
    )


def test_chunks_respect_section_boundary():
    blocks = [
        _para(0, "Intro", 1, words=50),
        _para(1, "Intro", 1, words=50),
        _para(2, "Diagnosis", 2, words=50),
    ]
    chunks = chunk_blocks(blocks, target_words=350)
    assert len(chunks) == 2
    assert chunks[0].section == "Intro"
    assert chunks[0].block_ids == ["d##/texts/0", "d##/texts/1"]
    assert chunks[0].page_start == 1 and chunks[0].page_end == 1
    assert chunks[1].section == "Diagnosis"


def test_chunks_split_at_target_words():
    blocks = [_para(i, "Intro", 1, words=200) for i in range(4)]  # 800 words
    chunks = chunk_blocks(blocks, target_words=350)
    assert len(chunks) == 2  # 400 + 400
    assert all(len(c.text.split()) <= 450 for c in chunks)


def test_table_is_atomic_chunk():
    table = Block(
        block_id="d##/tables/0", doc_id="d", type="table",
        section="Diagnosis", page=3,
        text="Criteria: FPG | >= 126 mg/dL",
        payload={"cells": [["FPG", ">= 126 mg/dL"]]},
    )
    blocks = [_para(0, "Diagnosis", 3, words=30), table,
              _para(1, "Diagnosis", 3, words=30)]
    chunks = chunk_blocks(blocks, target_words=350)
    table_chunks = [c for c in chunks if c.block_ids == ["d##/tables/0"]]
    assert len(table_chunks) == 1
    assert "126 mg/dL" in table_chunks[0].text


def test_chunk_ids_stable_and_unique():
    blocks = [_para(i, "Intro", 1, words=200) for i in range(4)]
    chunks = chunk_blocks(blocks, target_words=350)
    assert [c.chunk_id for c in chunks] == ["d#c00000", "d#c00001"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/test_chunker.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'corpus_engine.chunker'`

- [ ] **Step 3: Write implementation**

```python
# src/corpus_engine/chunker.py
from __future__ import annotations

from dataclasses import dataclass, field

from corpus_engine.blocks import Block


@dataclass
class Chunk:
    chunk_id: str
    doc_id: str
    block_ids: list[str]
    section: str
    page_start: int
    page_end: int
    text: str


@dataclass
class _Accumulator:
    section: str
    blocks: list[Block] = field(default_factory=list)
    words: int = 0


def chunk_blocks(blocks: list[Block], target_words: int = 350) -> list[Chunk]:
    chunks: list[Chunk] = []
    doc_id = blocks[0].doc_id if blocks else ""
    acc: _Accumulator | None = None

    def flush() -> None:
        nonlocal acc
        if acc and acc.blocks:
            pages = [b.page for b in acc.blocks if b.page]
            chunks.append(Chunk(
                chunk_id=f"{doc_id}#c{len(chunks):05d}",
                doc_id=doc_id,
                block_ids=[b.block_id for b in acc.blocks],
                section=acc.section,
                page_start=min(pages) if pages else 0,
                page_end=max(pages) if pages else 0,
                text="\n".join(b.text for b in acc.blocks if b.text.strip()),
            ))
        acc = None

    for block in blocks:
        if block.type == "heading" or not block.text.strip():
            continue  # section context lives in block.section already
        if block.type == "table":
            flush()
            chunks.append(Chunk(
                chunk_id=f"{doc_id}#c{len(chunks):05d}",
                doc_id=doc_id,
                block_ids=[block.block_id],
                section=block.section,
                page_start=block.page,
                page_end=block.page,
                text=block.text,
            ))
            continue
        if acc is None or acc.section != block.section:
            flush()
            acc = _Accumulator(section=block.section)
        acc.blocks.append(block)
        acc.words += len(block.text.split())
        if acc.words >= target_words:
            flush()

    flush()
    return chunks
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/test_chunker.py -v`
Expected: 4 PASS

- [ ] **Step 5: Commit**

```powershell
git add projects/corpus-engine/src/corpus_engine/chunker.py projects/corpus-engine/tests/test_chunker.py
git commit -m "feat(corpus-engine): structure-aware chunker with atomic tables"
```

---

### Task 7: CocoIndex flow (parse → gate → load → chunk → embed → Postgres)

**Files:**
- Create: `projects/corpus-engine/src/corpus_engine/flow.py`
- Test: `projects/corpus-engine/tests/test_flow_integration.py` (marked `integration`)

**Interfaces:**
- Consumes: everything from Tasks 2–6 (exact signatures listed in those tasks).
- Produces: CocoIndex app named `CorpusEngine` in `corpus_engine.flow`; Postgres tables in pg schema `corpus_engine`: `documents(doc_id pk, sha256, source_path, title, pages, status, quality_json)`, `blocks(block_id pk, doc_id, type, section, page, text, payload_json)`, `chunks(chunk_id pk, doc_id, block_ids_json, section, page_start, page_end, text, embedding vector(1024))`. Run with `uv run cocoindex update src/corpus_engine/flow.py` (batch) — if the installed CLI expects a module target instead, `uv run cocoindex update corpus_engine.flow`; record which form works in `docs/testing.md`.

- [ ] **Step 1: Write flow implementation** (integration-tested rather than unit-TDD — it is wiring, its parts are already unit-tested)

```python
# src/corpus_engine/flow.py
from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass
from typing import Annotated, AsyncIterator

import asyncpg
from numpy.typing import NDArray

import cocoindex as coco
from cocoindex.connectors import localfs, postgres
from cocoindex.ops.sentence_transformers import SentenceTransformerEmbedder
from cocoindex.resources.file import FileLike, PatternFilePathMatcher

from corpus_engine.blocks import extract_blocks
from corpus_engine.canonical import (
    ManifestEntry, append_manifest, canonical_json_path, doc_id_for,
)
from corpus_engine.chunker import chunk_blocks
from corpus_engine.config import Config
from corpus_engine.parse import parse_pdf_bytes
from corpus_engine.quality import assess_document

import hashlib

PG_SCHEMA = "corpus_engine"
EMBED_MODEL = "BAAI/bge-m3"  # 1024-dim, MIT

PG_DB = coco.ContextKey[asyncpg.Pool]("corpus_engine_db")
EMBEDDER = coco.ContextKey[SentenceTransformerEmbedder]("embedder", detect_change=True)
CFG = coco.ContextKey[Config]("config")


@dataclass
class DocumentRow:
    doc_id: str
    sha256: str
    source_path: str
    title: str
    pages: int
    status: str  # parsed | needs_review
    quality_json: str


@dataclass
class BlockRow:
    block_id: str
    doc_id: str
    type: str
    section: str
    page: int
    text: str
    payload_json: str


@dataclass
class ChunkRow:
    chunk_id: str
    doc_id: str
    block_ids_json: str
    section: str
    page_start: int
    page_end: int
    text: str
    embedding: Annotated[NDArray, EMBEDDER]


@coco.lifespan
async def coco_lifespan(builder: coco.EnvironmentBuilder) -> AsyncIterator[None]:
    cfg = Config.from_env()
    async with asyncpg.create_pool(cfg.postgres_url) as pool:
        builder.provide(PG_DB, pool)
        builder.provide(EMBEDDER, SentenceTransformerEmbedder(EMBED_MODEL))
        builder.provide(CFG, cfg)
        yield


@coco.fn.as_async(runner=coco.GPU)
def _parse(content: bytes, name: str) -> dict:
    return parse_pdf_bytes(content, name)


@coco.fn(memo=True)
async def process_file(
    file: FileLike,
    documents: postgres.TableTarget[DocumentRow],
    blocks_t: postgres.TableTarget[BlockRow],
    chunks_t: postgres.TableTarget[ChunkRow],
) -> None:
    cfg = coco.use_context(CFG)
    content = await file.read()
    sha256 = hashlib.sha256(content).hexdigest()
    src_path = pathlib.Path(str(file.file_path.path))
    doc_id = doc_id_for(src_path)

    # stage 1: parse once; canonical JSON on disk is the source of truth
    json_path = canonical_json_path(cfg.canonical_dir, doc_id)
    if json_path.exists():
        doc = json.loads(json_path.read_text(encoding="utf-8"))
    else:
        doc = await _parse(content, src_path.name)
        cfg.canonical_dir.mkdir(parents=True, exist_ok=True)
        json_path.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")

    # stage 2: quality gate
    quality = assess_document(doc)
    n_pages = len(quality.pages)
    title = next(
        (t.get("text", "") for t in doc.get("texts", [])
         if t.get("label") in ("title", "section_header")),
        doc_id,
    )
    status = "needs_review" if quality.verdict == "NEEDS_REVIEW" else "parsed"
    append_manifest(cfg.canonical_dir, ManifestEntry(
        sha256=sha256, source_path=str(src_path), doc_id=doc_id,
        status=status, pages=n_pages, quality=quality.as_dict(),
    ))
    documents.declare_row(row=DocumentRow(
        doc_id=doc_id, sha256=sha256, source_path=str(src_path),
        title=title, pages=n_pages, status=status,
        quality_json=json.dumps(quality.as_dict()),
    ))
    if status == "needs_review":
        return  # held out: garbage never enters silently

    # stages 3-5: load blocks, chunk, embed
    block_list = extract_blocks(doc, doc_id)
    for b in block_list:
        blocks_t.declare_row(row=BlockRow(
            block_id=b.block_id, doc_id=b.doc_id, type=b.type,
            section=b.section, page=b.page, text=b.text,
            payload_json=json.dumps(b.payload, ensure_ascii=False),
        ))
    embedder = coco.use_context(EMBEDDER)
    for c in chunk_blocks(block_list):
        chunks_t.declare_row(row=ChunkRow(
            chunk_id=c.chunk_id, doc_id=c.doc_id,
            block_ids_json=json.dumps(c.block_ids),
            section=c.section, page_start=c.page_start, page_end=c.page_end,
            text=c.text,
            embedding=await embedder.embed(c.text),
        ))


@coco.fn
async def app_main(sourcedir: pathlib.Path | None = None) -> None:
    cfg = Config.from_env()
    src = sourcedir or cfg.raw_dir

    async def mount(name: str, cls, pk: list[str]):
        return await postgres.mount_table_target(
            PG_DB, table_name=name,
            table_schema=await postgres.TableSchema.from_class(cls, primary_key=pk),
            pg_schema_name=PG_SCHEMA,
        )

    documents = await mount("documents", DocumentRow, ["doc_id"])
    blocks_t = await mount("blocks", BlockRow, ["block_id"])
    chunks_t = await mount("chunks", ChunkRow, ["chunk_id"])

    files = localfs.walk_dir(
        src, recursive=True,
        path_matcher=PatternFilePathMatcher(included_patterns=["**/*.pdf"]),
        live=True,
    )
    await coco.mount_each(process_file, files.items(), documents, blocks_t, chunks_t)


app = coco.App(coco.AppConfig(name="CorpusEngine"), app_main)
```

- [ ] **Step 2: Write the integration test**

```python
# tests/test_flow_integration.py
"""Integration: needs Postgres :54329 (POSTGRES_URL in .env) + model downloads.

Runs the real CocoIndex flow over generated fixture PDFs and checks
PoC gates 1 (populate), 4 (incremental), 5 (quality routing).
"""
import json
import os
import shutil
import subprocess
from pathlib import Path

import asyncpg
import pytest

from tests.fixtures.make_fixtures import make_good_pdf, make_scan_pdf

pytestmark = pytest.mark.integration

CAPSULE = Path(__file__).resolve().parents[1]


def _run_update(env: dict) -> None:
    subprocess.run(
        ["uv", "run", "cocoindex", "update", "src/corpus_engine/flow.py"],
        cwd=CAPSULE, env=env, check=True, timeout=1800,
    )


@pytest.fixture()
def corpus_env(tmp_path: Path) -> dict:
    raw = tmp_path / "raw"; raw.mkdir()
    canonical = tmp_path / "canonical"; canonical.mkdir()
    env = os.environ.copy()
    env["CORPUS_RAW_DIR"] = str(raw)
    env["CORPUS_CANONICAL_DIR"] = str(canonical)
    assert env.get("POSTGRES_URL"), "POSTGRES_URL must be set for integration tests"
    return env


async def _fetch(env: dict, sql: str):
    conn = await asyncpg.connect(env["POSTGRES_URL"])
    try:
        return await conn.fetch(sql)
    finally:
        await conn.close()


async def test_pipeline_populates_and_is_incremental(corpus_env: dict):
    raw = Path(corpus_env["CORPUS_RAW_DIR"])
    canonical = Path(corpus_env["CORPUS_CANONICAL_DIR"])

    # --- Gate 1: one PDF in -> JSON + three tables populated
    make_good_pdf(raw / "good.pdf")
    _run_update(corpus_env)

    assert (canonical / "good.json").exists()
    docs = await _fetch(corpus_env,
        "SELECT doc_id, status FROM corpus_engine.documents")
    assert [(r["doc_id"], r["status"]) for r in docs] == [("good", "parsed")]
    blocks = await _fetch(corpus_env, "SELECT count(*) n FROM corpus_engine.blocks")
    chunks = await _fetch(corpus_env, "SELECT count(*) n FROM corpus_engine.chunks")
    assert blocks[0]["n"] > 0 and chunks[0]["n"] > 0

    # --- Gate 4: adding a second PDF must not reprocess the first
    mtime_before = (canonical / "good.json").stat().st_mtime_ns
    make_good_pdf(raw / "second.pdf")
    # give second.pdf distinct content so sha/doc_id differ:
    (raw / "second.pdf").write_bytes((raw / "second.pdf").read_bytes() + b"\n%2")
    _run_update(corpus_env)
    assert (canonical / "good.json").stat().st_mtime_ns == mtime_before
    docs = await _fetch(corpus_env,
        "SELECT doc_id FROM corpus_engine.documents ORDER BY doc_id")
    assert [r["doc_id"] for r in docs] == ["good", "second"]

    # --- Gate 5: scanned/garbage PDF is routed, never silently ingested
    make_scan_pdf(raw / "scan.pdf")
    _run_update(corpus_env)
    rows = await _fetch(corpus_env,
        "SELECT status, quality_json FROM corpus_engine.documents "
        "WHERE doc_id = 'scan'")
    assert len(rows) == 1
    quality = json.loads(rows[0]["quality_json"])
    # either OCR rescued real text (status parsed, pages scored) or it is held
    assert rows[0]["status"] in ("parsed", "needs_review")
    assert quality["pages"], "quality report must exist"
    if rows[0]["status"] == "needs_review":
        held = await _fetch(corpus_env,
            "SELECT count(*) n FROM corpus_engine.chunks WHERE doc_id = 'scan'")
        assert held[0]["n"] == 0
```

- [ ] **Step 3: Prepare the database once**

Create `.env` locally from `.env.example` with the real local dev `POSTGRES_URL` (do not commit). Then run `CREATE EXTENSION IF NOT EXISTS vector;` on the dev database via any SQL client (psql/DBCode).

- [ ] **Step 4: Run the integration test**

Run: `uv run pytest tests/test_flow_integration.py -m integration -v`
Expected: PASS (first run is slow: Docling + BGE-M3 model downloads). If the CocoIndex CLI target form differs, fix `_run_update` and note the working form in `docs/testing.md`. If `postgres.TableTarget` rejects a type (e.g. `NDArray` dims), consult CocoIndex docs via context7 and adjust the dataclass annotation — do NOT switch schema ownership away from these dataclasses.

- [ ] **Step 5: Commit**

```powershell
git add projects/corpus-engine/src/corpus_engine/flow.py projects/corpus-engine/tests/test_flow_integration.py
git commit -m "feat(corpus-engine): CocoIndex flow wiring parse, gate, load, chunk, embed"
```

---

### Task 8: HNSW index + cited query CLI

**Files:**
- Create: `projects/corpus-engine/sql/indexes.sql`
- Create: `projects/corpus-engine/src/corpus_engine/query.py`
- Test: `projects/corpus-engine/tests/test_query_integration.py` (marked `integration`)

**Interfaces:**
- Consumes: tables from Task 7; `EMBED_MODEL` constant from `corpus_engine.flow`.
- Produces: `search(pool, embedder, query: str, top_k: int = 5) -> list[Citation]` where `Citation` has `score: float`, `title: str`, `doc_id: str`, `section: str`, `page_start: int`, `page_end: int`, `text: str`; CLI `uv run python -m corpus_engine.query "<question>"`.

- [ ] **Step 1: Write indexes.sql**

```sql
-- idempotent; run after the first `cocoindex update` created the tables
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw
  ON corpus_engine.chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS blocks_doc_id_idx ON corpus_engine.blocks (doc_id);
CREATE INDEX IF NOT EXISTS chunks_doc_id_idx ON corpus_engine.chunks (doc_id);
```

- [ ] **Step 2: Write query implementation**

```python
# src/corpus_engine/query.py
from __future__ import annotations

import asyncio
import sys
from dataclasses import dataclass

import asyncpg
from pgvector.asyncpg import register_vector

from cocoindex.ops.sentence_transformers import SentenceTransformerEmbedder

from corpus_engine.config import Config
from corpus_engine.flow import EMBED_MODEL


@dataclass
class Citation:
    score: float
    title: str
    doc_id: str
    section: str
    page_start: int
    page_end: int
    text: str


async def search(
    pool: asyncpg.Pool,
    embedder: SentenceTransformerEmbedder,
    query: str,
    top_k: int = 5,
) -> list[Citation]:
    vec = await embedder.embed(query)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT d.title, c.doc_id, c.section, c.page_start, c.page_end,
                   c.text, c.embedding <=> $1 AS distance
            FROM corpus_engine.chunks c
            JOIN corpus_engine.documents d USING (doc_id)
            WHERE d.status = 'parsed'
            ORDER BY distance ASC
            LIMIT $2
            """,
            vec, top_k,
        )
    return [
        Citation(
            score=round(1.0 - float(r["distance"]), 4),
            title=r["title"], doc_id=r["doc_id"], section=r["section"],
            page_start=r["page_start"], page_end=r["page_end"], text=r["text"],
        )
        for r in rows
    ]


async def _main(query: str) -> None:
    cfg = Config.from_env()
    embedder = SentenceTransformerEmbedder(EMBED_MODEL)
    async with asyncpg.create_pool(cfg.postgres_url, init=register_vector) as pool:
        for c in await search(pool, embedder, query):
            pages = (str(c.page_start) if c.page_start == c.page_end
                     else f"{c.page_start}-{c.page_end}")
            print(f"[{c.score:.3f}] {c.title} — {c.section or '(no section)'} "
                  f"(p. {pages}, {c.doc_id})")
            print(f"    {c.text[:300]}")
            print("---")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit('usage: python -m corpus_engine.query "<question>"')
    asyncio.run(_main(" ".join(sys.argv[1:])))
```

- [ ] **Step 3: Write the failing integration test** (Gate 2: bilingual cited retrieval; Gate 3: table retrieved whole)

```python
# tests/test_query_integration.py
"""Integration: requires Task 7's pipeline to have run over the fixtures
(reuses the same DB). Applies sql/indexes.sql, then checks cited,
bilingual retrieval and table atomicity."""
import os
from pathlib import Path

import asyncpg
import pytest
from pgvector.asyncpg import register_vector

from cocoindex.ops.sentence_transformers import SentenceTransformerEmbedder

from corpus_engine.flow import EMBED_MODEL
from corpus_engine.query import search

pytestmark = pytest.mark.integration

CAPSULE = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="module")
async def pool():
    url = os.environ.get("POSTGRES_URL")
    assert url, "POSTGRES_URL must be set"
    p = await asyncpg.create_pool(url, init=register_vector)
    async with p.acquire() as conn:
        await conn.execute((CAPSULE / "sql" / "indexes.sql").read_text())
    yield p
    await p.close()


@pytest.fixture(scope="module")
def embedder():
    return SentenceTransformerEmbedder(EMBED_MODEL)


async def test_english_query_returns_citation(pool, embedder):
    results = await search(pool, embedder, "diagnostic threshold for diabetes")
    assert results, "no results — run the Task 7 pipeline first"
    top = results[0]
    assert top.doc_id and top.page_start >= 1
    assert "126" in top.text or "diabetes" in top.text.lower()


async def test_indonesian_query_returns_relevant_chunk(pool, embedder):
    # BGE-M3 is multilingual: an Indonesian query must reach English content
    results = await search(pool, embedder, "berapa ambang gula darah puasa untuk diagnosis diabetes")
    assert results
    assert any("126" in c.text or "glucose" in c.text.lower() for c in results[:3])


async def test_table_chunk_is_whole(pool, embedder):
    # any chunk whose block_ids point at a table must contain the full flat table
    rows = await pool.fetch(
        "SELECT text, block_ids_json FROM corpus_engine.chunks "
        "WHERE block_ids_json LIKE '%#/tables/%'"
    )
    for r in rows:
        assert "|" in r["text"], "table chunk must contain the full flattened grid"
```

Note: fixture PDFs draw no real detectable table; if `test_table_chunk_is_whole` finds zero rows it passes vacuously — the binding non-vacuous check is `test_table_is_atomic_chunk` in `tests/test_chunker.py`, and Gate 3 is re-run against a real textbook PDF in Task 9.

- [ ] **Step 4: Run the integration tests**

Run: `uv run pytest tests/test_query_integration.py -m integration -v`
Expected: PASS (requires Task 7 pipeline data present).

- [ ] **Step 5: Commit**

```powershell
git add projects/corpus-engine/sql/indexes.sql projects/corpus-engine/src/corpus_engine/query.py projects/corpus-engine/tests/test_query_integration.py
git commit -m "feat(corpus-engine): HNSW index and cited bilingual query CLI"
```

---

### Task 9: PoC gate run on a real medical PDF + capsule activation

**Files:**
- Modify: `projects/corpus-engine/docs/testing.md` (record gate evidence)
- Modify: `projects/corpus-engine/README.md` (usage: update → index → query)

**Interfaces:**
- Consumes: full pipeline (Tasks 1–8).
- Produces: recorded evidence that all five spec §9 gates pass; capsule activation checklist satisfied.

- [ ] **Step 1: Run the full pipeline on one real textbook PDF**

Prof supplies one real medical PDF into `D:\Database\sentra-corpus\raw\`. Run:

```powershell
uv run cocoindex update src/corpus_engine/flow.py
# apply indexes once:
# run sql/indexes.sql via SQL client
uv run python -m corpus_engine.query "criteria for the diagnosis of diabetes mellitus"
uv run python -m corpus_engine.query "tatalaksana awal ketoasidosis diabetik"
```

- [ ] **Step 2: Verify all five gates and record evidence in docs/testing.md**

Checklist to record (paste actual command output snippets):
1. Canonical JSON exists in `D:\Database\sentra-corpus\canonical\`; `documents`/`blocks`/`chunks` row counts > 0.
2. English + Indonesian queries return relevant chunks with title/section/page citations.
3. A diagnostic table chunk is retrieved whole (query for a known table; verify the full grid text in one chunk).
4. Second PDF added → first PDF's canonical JSON mtime unchanged, `cocoindex update` output shows only the new file processed.
5. `fixture_scan.pdf`-style corrupt file → status recorded, `needs_review` docs contribute zero chunks (already proven in integration tests; re-confirm against the real run's manifest).

If Gate 3 fails on the real PDF (Docling missed the table or the chunk truncated it), fix the chunker/blocks first — do not waive the gate.

- [ ] **Step 3: Update capsule docs and run repo verification**

Fill `docs/testing.md` (commands + gate evidence), `README.md` (quickstart). Then from repo root:

```powershell
pwsh scripts/safrs-verify.ps1
uv --directory projects/corpus-engine run pytest -m "not integration"
```

Expected: verification passes; unit suite green. Update `.agents/HANDOFF.md` per AGENTS.md session protocol (coordinate — another work stream may hold uncommitted HANDOFF state; merge, don't clobber).

- [ ] **Step 4: Commit**

```powershell
git add projects/corpus-engine/docs projects/corpus-engine/README.md .agents/HANDOFF.md
git commit -m "docs(corpus-engine): record PoC gate evidence and activate capsule"
```

- [ ] **Step 5: Flag R2 review**

The change set adds dependencies and a new capsule → R2. Request designated review per AGENTS.md before merging/pushing to main (if working on a branch, open the PR now and label it R2).

---

## Verification checklist (whole plan)

- Unit suite: `uv run pytest -m "not integration"` — green, no Postgres needed.
- Integration suite: `uv run pytest -m integration` — green against :54329.
- Root: `pwsh scripts/safrs-verify.ps1` — green.
- All five spec §9 gates recorded with evidence in `projects/corpus-engine/docs/testing.md`.

## Deviations from spec §5.2 (deliberate, PoC-scoped)

- `documents.specialty/language/year/meta` are omitted; `quality_json text` replaces `meta jsonb` for now. Metadata enrichment is additive later (plain `ALTER TABLE` / re-materialize, zero re-parse).
- `blocks.payload` and `chunks.block_ids` are materialized as JSON-in-`text` columns (`payload_json`, `block_ids_json`) because CocoIndex `TableSchema.from_class` type mapping for `jsonb`/arrays is unverified. If it supports them natively (check during Task 7), prefer the spec's `jsonb`/`text[]` types and rename to match spec §5.2.
- These deviations must be resolved (columns aligned to spec or spec amended) before scaling past the PoC.

## Known risks (accepted for PoC)

- CocoIndex CLI target syntax and `TableTarget` type mapping verified empirically in Task 7 (API is young); dataclass schema ownership is non-negotiable.
- Docling `export_to_dict()` key names may drift by version; tests assert invariants (texts, prov, page_no) and Task 3 documents any adjustment.
- reportlab fixtures cannot produce a Docling-detectable table; table atomicity is unit-proven (Task 6) and real-PDF-proven (Task 9 Gate 3).
