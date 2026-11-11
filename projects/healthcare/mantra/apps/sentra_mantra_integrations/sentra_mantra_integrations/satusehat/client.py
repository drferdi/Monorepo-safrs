"""SATUSEHAT (FHIR R4) HTTP client — OAuth2 token acquisition + read-only FHIR GET.

Env-only credentials (ADR-0002 S1): values are read via os.getenv and are never
logged, printed, or persisted. Retries with capped exponential backoff on
429/5xx/network errors; refreshes the access token once on 401; never retries
on 400 — SATUSEHAT's org-scope privacy gate is a permanent rejection, not a
transient failure.
"""

from __future__ import annotations

import os
import time
from typing import Any

import requests

_TOKEN_CACHE: dict[str, Any] = {}
_TOKEN_EXPIRY_MARGIN_SECONDS = 60
_MAX_RETRIES = 3
_BACKOFF_BASE_SECONDS = 1.0
_REQUEST_TIMEOUT_SECONDS = 30

_REQUIRED_ENV_VARS = (
	"MANTRA_SATUSEHAT_ORG_ID",
	"MANTRA_SATUSEHAT_CLIENT_ID",
	"MANTRA_SATUSEHAT_CLIENT_SECRET",
	"MANTRA_SATUSEHAT_AUTH_URL",
	"MANTRA_SATUSEHAT_FHIR_BASE",
)


class SatuSehatConfigError(Exception):
	"""Raised when required SATUSEHAT env vars are missing."""


class SatuSehatClientError(Exception):
	"""Raised for non-retryable or retry-exhausted SATUSEHAT API errors."""


def _env(name: str, required: bool = True) -> str | None:
	value = os.getenv(name)
	if required and not value:
		raise SatuSehatConfigError(f"Missing required env var: {name}")
	return value


def is_configured() -> bool:
	"""Whether the minimum SATUSEHAT env vars are present. Never exposes values."""
	return all(os.getenv(name) for name in _REQUIRED_ENV_VARS)


def org_id() -> str:
	return _env("MANTRA_SATUSEHAT_ORG_ID")


def _auth_url() -> str:
	return _env("MANTRA_SATUSEHAT_AUTH_URL")


def _fhir_base() -> str:
	return _env("MANTRA_SATUSEHAT_FHIR_BASE").rstrip("/")


def _fetch_token() -> dict[str, Any]:
	"""POST client_credentials grant. Never logs client_id/client_secret."""
	client_id = _env("MANTRA_SATUSEHAT_CLIENT_ID")
	client_secret = _env("MANTRA_SATUSEHAT_CLIENT_SECRET")
	response = requests.post(
		_auth_url(),
		params={"grant_type": "client_credentials"},
		data={"client_id": client_id, "client_secret": client_secret},
		timeout=_REQUEST_TIMEOUT_SECONDS,
	)
	response.raise_for_status()
	payload = response.json()
	expires_in = int(payload.get("expires_in") or 0)
	return {
		"access_token": payload["access_token"],
		"expires_at": time.time() + expires_in - _TOKEN_EXPIRY_MARGIN_SECONDS,
	}


def _get_token(force_refresh: bool = False) -> str:
	cached = _TOKEN_CACHE.get("token")
	if not force_refresh and cached and cached["expires_at"] > time.time():
		return cached["access_token"]
	token = _fetch_token()
	_TOKEN_CACHE["token"] = token
	return token["access_token"]


def _is_retryable_status(status_code: int) -> bool:
	return status_code == 429 or 500 <= status_code < 600


def _sleep_backoff(attempt: int) -> None:
	time.sleep(_BACKOFF_BASE_SECONDS * (2 ** (attempt - 1)))


def _request(
	url: str,
	params: dict[str, Any] | None,
	method: str = "GET",
	json_body: dict[str, Any] | None = None,
) -> Any:
	token_refreshed = False
	attempt = 0
	while True:
		attempt += 1
		try:
			headers = {
				"Authorization": f"Bearer {_get_token()}",
				"Accept": "application/json" if method == "POST" else "application/fhir+json",
			}
			if method == "POST":
				response = requests.post(
					url,
					json=json_body,
					headers=headers,
					timeout=_REQUEST_TIMEOUT_SECONDS,
				)
			else:
				response = requests.get(
					url,
					params=params,
					headers=headers,
					timeout=_REQUEST_TIMEOUT_SECONDS,
				)
		except (requests.ConnectionError, requests.Timeout) as exc:
			if attempt >= _MAX_RETRIES:
				raise SatuSehatClientError(f"Network error calling SATUSEHAT: {url}") from exc
			_sleep_backoff(attempt)
			continue

		if response.status_code == 400:
			# Privacy/org-scope gate rejection by design — never retried.
			raise SatuSehatClientError(f"SATUSEHAT rejected the request (HTTP 400): {url}")

		if response.status_code == 401 and not token_refreshed:
			token_refreshed = True
			_get_token(force_refresh=True)
			continue

		if _is_retryable_status(response.status_code):
			if attempt >= _MAX_RETRIES:
				raise SatuSehatClientError(
					f"SATUSEHAT transient error (HTTP {response.status_code}): {url}"
				)
			_sleep_backoff(attempt)
			continue

		response.raise_for_status()
		return response.json()


def fhir_get(resource_path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
	"""Read-only, always org-scoped FHIR GET against a relative resource path."""
	scoped_params = dict(params or {})
	scoped_params.setdefault("service-provider", f"Organization/{org_id()}")
	url = f"{_fhir_base()}/{resource_path.lstrip('/')}"
	return _request(url, scoped_params)


def fhir_get_absolute(url: str) -> dict[str, Any]:
	"""Follow a FHIR Bundle 'next' link exactly as given (already org-scoped by the server)."""
	return _request(url, None)


def api_post(url: str, json_body: dict[str, Any]) -> dict[str, Any]:
	"""Authenticated JSON POST to a non-FHIR SATUSEHAT API (e.g. SmartHealth link).

	Same retry/401/400 semantics as reads; the body may carry patient identity,
	so it is never logged and never included in exception messages.
	"""
	return _request(url, None, method="POST", json_body=json_body)
