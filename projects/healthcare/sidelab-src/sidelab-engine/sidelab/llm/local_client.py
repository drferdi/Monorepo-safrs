# Architected and built by codieverse+.
from __future__ import annotations

import os
from typing import Iterator


class LocalClient:
    name = "local"

    def stream_chat(self, messages: list[dict], model: str) -> Iterator[str]:
        try:
            import ollama
        except ImportError as exc:
            raise RuntimeError(
                "Ollama package belum tersedia. Install dependencies untuk memakai mode Local."
            ) from exc

        try:
            options: dict = {}
            max_tokens = int(os.getenv("SIDELAB_MAX_TOKENS", "0") or "0")
            if max_tokens > 0:
                options["num_predict"] = max_tokens
            stream = ollama.chat(model=model, messages=messages, stream=True, options=options or None)
            for chunk in stream:
                token = chunk.get("message", {}).get("content", "")
                if token:
                    yield token
        except Exception as exc:
            raise RuntimeError(f"Local Ollama error: {exc}") from exc


def available_models() -> list[str]:
    try:
        import ollama
    except ImportError:
        return []

    try:
        return [m.model for m in ollama.list().models]
    except Exception:
        return []
