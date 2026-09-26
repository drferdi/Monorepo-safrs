# Architected and built by codieverse+.
"""Fixtures untuk performance testing SIDELAB."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

import pytest

from sidelab.llm.config import check_backend_readiness, default_model_for_backend
from sidelab.llm.router import build_provider
from sidelab.prompt import _build_system

from .scenarios import SKENARIO_PUSKESMAS

# Muat .env file secara manual supaya check_backend_readiness bisa baca API key
_env_path = Path(__file__).parent.parent.parent / ".env"
if _env_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(dotenv_path=_env_path, override=False)
    except ImportError:
        # Fallback manual parser kalau dotenv tidak tersedia
        for line in _env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())


@pytest.fixture(scope="session")
def perf_result_dir() -> Path:
    """Direktori untuk menyimpan hasil performance test (JSON/CSV)."""
    d = Path(__file__).parent / "results"
    d.mkdir(parents=True, exist_ok=True)
    return d


@pytest.fixture(scope="session")
def perf_scenarios() -> list[tuple[str, str]]:
    """20 skenario Puskesmas standar."""
    return SKENARIO_PUSKESMAS


@pytest.fixture(scope="session")
def perf_system_prompt() -> str:
    """System prompt standar untuk performance test."""
    return _build_system({})


@pytest.fixture(scope="session")
def perf_backend() -> str:
    """Backend yang diuji; bisa diatur via env PERF_BACKEND."""
    return os.getenv("PERF_BACKEND", "deepseek")


@pytest.fixture(scope="session")
def perf_model(perf_backend: str) -> str:
    """Model untuk backend yang diuji; bisa diatur via env PERF_MODEL."""
    env_model = os.getenv("PERF_MODEL", "").strip()
    if env_model:
        return env_model
    return default_model_for_backend(perf_backend)


@pytest.fixture(scope="session")
def perf_provider(perf_backend: str):
    """Build provider untuk backend yang diuji."""
    return build_provider(perf_backend)


@pytest.fixture(scope="session")
def perf_thresholds() -> dict[str, Any]:
    """Threshold performance; bisa diatur via env PERF_THRESHOLD_JSON."""
    defaults = {
        "max_ttft_seconds": 15.0,          # Time-To-First-Token
        "max_total_seconds": 60.0,         # Total latency per skenario
        "max_avg_total_seconds": 45.0,     # Rata-rata total latency
        "max_token_per_second": 5.0,       # Minimum throughput (token/detik)
        "max_fail_rate": 0.05,             # Maksimal 5% skenario boleh gagal
    }
    env = os.getenv("PERF_THRESHOLD_JSON", "").strip()
    if env:
        try:
            overrides = json.loads(env)
            defaults.update(overrides)
        except json.JSONDecodeError:
            pytest.skip(f"PERF_THRESHOLD_JSON invalid JSON: {env}")
    return defaults


@pytest.fixture(scope="session")
def perf_skip_if_not_ready(perf_backend: str) -> None:
    """Skip performance test jika backend tidak siap."""
    is_ready, missing, warning = check_backend_readiness(perf_backend)
    if not is_ready:
        pytest.skip(f"Backend '{perf_backend}' tidak siap: {warning}")


@pytest.fixture(scope="class")
def perf_benchmark(perf_result_dir: Path, perf_backend: str, perf_model: str) -> "PerfBenchmark":
    """Fixture untuk menjalankan benchmark dan menyimpan hasil."""
    return PerfBenchmark(perf_result_dir, perf_backend, perf_model)


class PerfBenchmark:
    """Helper untuk menjalankan single-scenario benchmark dan akumulasi."""

    def __init__(self, result_dir: Path, backend: str, model: str) -> None:
        self.result_dir = result_dir
        self.backend = backend
        self.model = model
        self.results: list[dict[str, Any]] = []
        self.run_id = f"{backend}_{model}_{int(time.time())}"

    def run_scenario(
        self,
        provider,
        system: str,
        name: str,
        query: str,
    ) -> dict[str, Any]:
        """Jalankan satu skenario, ukur TTFT dan total latency."""
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": query},
        ]

        chunks: list[str] = []
        t0 = time.monotonic()
        t_first: float | None = None
        error: str | None = None

        try:
            for chunk in provider.stream_chat(messages, model=self.model):
                if t_first is None:
                    t_first = time.monotonic()
                chunks.append(chunk)
        except Exception as exc:
            error = str(exc)

        t_end = time.monotonic()
        full_text = "".join(chunks)
        # Estimasi token: ~4 karakter per token (rule of thumb)
        tokens = len(full_text) // 4

        ttft = (t_first - t0) if t_first else 0.0
        total = t_end - t0
        tps = tokens / total if total > 0 and not error else 0.0

        record = {
            "scenario": name,
            "query": query,
            "backend": self.backend,
            "model": self.model,
            "ttft_seconds": round(ttft, 2),
            "total_seconds": round(total, 2),
            "tokens": tokens,
            "tokens_per_second": round(tps, 2),
            "error": error,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        }
        self.results.append(record)
        return record

    def save(self) -> Path:
        """Simpan hasil akumulasi ke JSON."""
        path = self.result_dir / f"perf_{self.run_id}.json"
        payload = {
            "run_id": self.run_id,
            "backend": self.backend,
            "model": self.model,
            "scenario_count": len(self.results),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "results": self.results,
            "summary": self._summarize(),
        }
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        return path

    def _summarize(self) -> dict[str, Any]:
        """Hitung summary statistik."""
        if not self.results:
            return {}
        totals = [r["total_seconds"] for r in self.results if not r["error"]]
        ttfts = [r["ttft_seconds"] for r in self.results if not r["error"]]
        tokens = [r["tokens"] for r in self.results if not r["error"]]
        errors = [r for r in self.results if r["error"]]

        return {
            "avg_total_seconds": round(sum(totals) / len(totals), 2) if totals else 0.0,
            "min_total_seconds": round(min(totals), 2) if totals else 0.0,
            "max_total_seconds": round(max(totals), 2) if totals else 0.0,
            "avg_ttft_seconds": round(sum(ttfts) / len(ttfts), 2) if ttfts else 0.0,
            "avg_tokens": round(sum(tokens) / len(tokens), 2) if tokens else 0.0,
            "error_count": len(errors),
            "error_rate": round(len(errors) / len(self.results), 4),
        }
