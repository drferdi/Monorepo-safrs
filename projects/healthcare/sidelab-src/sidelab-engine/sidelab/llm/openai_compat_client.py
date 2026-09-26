# Architected and built by codieverse+.
from __future__ import annotations

import json
import os
from typing import Iterator

import requests


class OpenAICompatClient:
    """Generic OpenAI-compatible SSE client — covers all standard Bearer-auth providers."""

    def __init__(
        self,
        name: str,
        label: str,
        base_url: str,
        api_key: str | None,
        timeout: float = 600.0,
    ) -> None:
        self.name = name  # backend key, e.g. "deepseek"
        self.label = label  # display name, e.g. "DeepSeek"
        self.base_url = base_url.rstrip("/")
        self._api_key = (api_key or "").strip()
        self._timeout = timeout

    def stream_chat(self, messages: list[dict], model: str) -> Iterator[str]:
        if not self._api_key:
            raise RuntimeError(
                f"{self.label}: API key belum diisi. Tambahkan ke .env untuk memakai provider ini."
            )

        payload: dict = {"model": model, "messages": messages, "stream": True}
        max_tokens = int(os.getenv("SIDELAB_MAX_TOKENS", "0") or "0")
        if max_tokens > 0:
            payload["max_tokens"] = max_tokens
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }
        url = f"{self.base_url}/chat/completions"

        with requests.post(
            url,
            headers=headers,
            json=payload,
            stream=True,
            timeout=self._timeout,
        ) as response:
            if response.status_code >= 400:
                detail = response.text.strip()
                try:
                    msg = json.loads(detail)
                    err = msg.get("error") or msg.get("message") or detail
                    if isinstance(err, dict):
                        err = err.get("message") or str(err)
                except json.JSONDecodeError:
                    err = detail
                raise RuntimeError(
                    f"{self.label} error ({response.status_code}): {err}"
                )

            for line in response.iter_lines(decode_unicode=True):
                if not line or line.startswith(":"):
                    continue
                if not line.startswith("data:"):
                    continue
                raw = line[5:].strip()
                if raw == "[DONE]":
                    break
                try:
                    chunk = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                for choice in chunk.get("choices", []):
                    delta = choice.get("delta") or {}
                    content = delta.get("content")
                    if content:
                        yield content
