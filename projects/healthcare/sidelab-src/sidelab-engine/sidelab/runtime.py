# Architected and built by codieverse+.
from __future__ import annotations

import importlib.util
import os
import sys
import uuid
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import Any

from sidelab.llm import (
    PROVIDER_REGISTRY,
    check_backend_readiness,
    default_model_for_backend,
    resolve_backend_choice,
)
from sidelab.session_store import save_session as persist_session


@dataclass(frozen=True)
class BackendSelection:
    backend: str
    model: str
    ready: bool
    label: str
    warning: str


@dataclass
class TuiRuntime:
    session_id: str
    backend: str
    model: str
    backend_ready: bool
    backend_label: str
    backend_warning: str

    def chat(
        self,
        prompt: str,
        history: list[dict[str, Any]],
        pasien: dict[str, Any],
        model: str,
        backend_key: str,
        console_override: Any = None,
    ) -> str:
        core = _load_legacy_core()
        active_backend = backend_key or self.backend
        active_model = model or self.model
        self.backend = active_backend
        self.model = active_model
        return core._chat(
            prompt,
            history,
            pasien,
            active_model,
            active_backend,
            console_override,
        )

    def save_session(
        self,
        history: list[dict[str, Any]],
        pasien: dict[str, Any],
        session_id: str,
    ) -> None:
        persist_session(
            history,
            pasien,
            session_id,
            backend=self.backend,
            model=self.model,
        )


def select_backend(raw: str | None = None) -> BackendSelection:
    backend = resolve_backend_choice(
        os.getenv("SIDELAB_DEFAULT_BACKEND", "") if raw is None else raw
    )
    model = default_model_for_backend(backend)
    ready, _missing, warning = check_backend_readiness(backend)
    label = PROVIDER_REGISTRY.get(backend, {}).get("label", backend)
    return BackendSelection(
        backend=backend,
        model=model,
        ready=ready,
        label=label,
        warning=warning,
    )


def build_tui_runtime(selection: BackendSelection | None = None) -> TuiRuntime:
    selected = selection or select_backend()
    return TuiRuntime(
        session_id=uuid.uuid4().hex[:8].upper(),
        backend=selected.backend,
        model=selected.model,
        backend_ready=selected.ready,
        backend_label=selected.label,
        backend_warning=selected.warning,
    )


def _load_legacy_core() -> ModuleType:
    key = "sidelab_legacy_core"
    if key in sys.modules:
        return sys.modules[key]

    legacy_path = Path(__file__).resolve().parent.parent / "sidelab.py"
    spec = importlib.util.spec_from_file_location(key, legacy_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load legacy clinical core: {legacy_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[key] = module
    spec.loader.exec_module(module)
    return module
