# Architected and built by codieverse+.
from __future__ import annotations

import json
import os
from typing import Iterator

import requests


class GeminiVertexClient:
    """Google Gemini via Vertex AI — uses Application Default Credentials (OAuth2)."""

    name = "gemini"

    def __init__(self) -> None:
        self.project = (
            os.getenv("VERTEX_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT", "")
        ).strip()
        self.location = os.getenv("VERTEX_LOCATION", "us-central1").strip()

    def _access_token(self) -> str:
        try:
            import google.auth
            import google.auth.transport.requests
        except ImportError as exc:
            raise RuntimeError(
                "google-auth belum tersedia. Install: pip install google-auth"
            ) from exc

        creds, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        creds.refresh(google.auth.transport.requests.Request())
        return creds.token

    def stream_chat(self, messages: list[dict], model: str) -> Iterator[str]:
        if not self.project:
            raise RuntimeError(
                "VERTEX_PROJECT atau GOOGLE_CLOUD_PROJECT belum diisi. Tambahkan ke .env."
            )

        token = self._access_token()
        base = (
            f"https://{self.location}-aiplatform.googleapis.com"
            f"/v1beta1/projects/{self.project}/locations/{self.location}/endpoints/openapi"
        )
        url = f"{base}/chat/completions"
        payload: dict = {"model": model, "messages": messages, "stream": True}
        max_tokens = int(os.getenv("SIDELAB_MAX_TOKENS", "0") or "0")
        if max_tokens > 0:
            payload["max_tokens"] = max_tokens
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        timeout = float(os.getenv("GEMINI_TIMEOUT", "600") or "600")

        with requests.post(
            url, headers=headers, json=payload, stream=True, timeout=timeout
        ) as response:
            if response.status_code >= 400:
                raise RuntimeError(
                    f"Gemini Vertex error ({response.status_code}): {response.text.strip()}"
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
