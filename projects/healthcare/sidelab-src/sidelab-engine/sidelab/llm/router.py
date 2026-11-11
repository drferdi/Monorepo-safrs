# Architected and built by codieverse+.
from __future__ import annotations

import os

from .config import PROVIDER_REGISTRY, normalize_backend
from .gemini_vertex_client import GeminiVertexClient
from .local_client import LocalClient
from .openai_compat_client import OpenAICompatClient


def build_provider(mode: str, api_key: str | None = None, base_url: str | None = None):
    backend = normalize_backend(mode)
    spec = PROVIDER_REGISTRY[backend]
    client_type = spec.get("client")

    if client_type == "local":
        return LocalClient()

    if client_type == "gemini_vertex":
        return GeminiVertexClient()

    # openai_compat — all remaining providers
    api_key_env = spec.get("api_key_env", "")
    resolved_key = api_key or (os.getenv(api_key_env, "") if api_key_env else "")
    base_url_env = spec.get("base_url_env", "")
    resolved_url = (
        base_url
        or (os.getenv(base_url_env) if base_url_env else None)
        or spec["base_url"]
    )
    timeout_env = spec.get("timeout_env", "")
    timeout = float((os.getenv(timeout_env) if timeout_env else None) or "600")

    return OpenAICompatClient(
        name=backend,
        label=spec["label"],
        base_url=resolved_url,
        api_key=resolved_key,
        timeout=timeout,
    )
