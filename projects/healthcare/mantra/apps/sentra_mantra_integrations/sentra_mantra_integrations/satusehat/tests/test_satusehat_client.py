"""SATUSEHAT client: token acquisition, retry/backoff, and no-secret-in-output guarantees.

All HTTP calls are mocked — no network access, no real credentials.
"""

import os
from unittest import TestCase
from unittest.mock import MagicMock, patch

import requests

from sentra_mantra_integrations.satusehat import client

ENV = {
	"MANTRA_SATUSEHAT_ORG_ID": "100027810",
	"MANTRA_SATUSEHAT_CLIENT_ID": "test-client-id",
	"MANTRA_SATUSEHAT_CLIENT_SECRET": "test-client-secret-value",
	"MANTRA_SATUSEHAT_AUTH_URL": "https://example.invalid/oauth2/v1/accesstoken",
	"MANTRA_SATUSEHAT_FHIR_BASE": "https://example.invalid/fhir-r4/v1",
}


def _response(status_code=200, json_data=None):
	resp = MagicMock()
	resp.status_code = status_code
	resp.json.return_value = json_data or {}
	resp.raise_for_status.side_effect = (
		requests.HTTPError(f"HTTP {status_code}") if status_code >= 400 else None
	)
	return resp


class TestSatuSehatClient(TestCase):
	def setUp(self):
		client._TOKEN_CACHE.clear()
		self._env_patch = patch.dict(os.environ, ENV, clear=True)
		self._env_patch.start()
		self._sleep_patch = patch("sentra_mantra_integrations.satusehat.client.time.sleep")
		self._sleep_patch.start()

	def tearDown(self):
		self._sleep_patch.stop()
		self._env_patch.stop()
		client._TOKEN_CACHE.clear()

	def test_is_configured_true_when_all_env_vars_present(self):
		self.assertTrue(client.is_configured())

	def test_is_configured_false_when_missing_a_var(self):
		os.environ.pop("MANTRA_SATUSEHAT_CLIENT_SECRET", None)
		self.assertFalse(client.is_configured())

	def test_token_acquired_and_cached_without_refetching(self):
		token_response = _response(200, {"access_token": "secret-token-value", "expires_in": 14399})
		with patch(
			"sentra_mantra_integrations.satusehat.client.requests.post", return_value=token_response
		) as post:
			token = client._get_token()
		self.assertEqual(token, "secret-token-value")
		post.assert_called_once()

		with patch("sentra_mantra_integrations.satusehat.client.requests.post") as post2:
			cached_token = client._get_token()
		self.assertEqual(cached_token, "secret-token-value")
		post2.assert_not_called()

	def test_fhir_get_always_adds_org_scope(self):
		token_response = _response(200, {"access_token": "tok", "expires_in": 14399})
		bundle_response = _response(200, {"resourceType": "Bundle", "total": 6421})
		with (
			patch("sentra_mantra_integrations.satusehat.client.requests.post", return_value=token_response),
			patch(
				"sentra_mantra_integrations.satusehat.client.requests.get", return_value=bundle_response
			) as get,
		):
			result = client.fhir_get("Encounter", {"_count": 0})

		self.assertEqual(result["total"], 6421)
		called_params = get.call_args.kwargs["params"]
		self.assertEqual(called_params["service-provider"], "Organization/100027810")

	def test_400_is_never_retried_privacy_gate(self):
		token_response = _response(200, {"access_token": "tok", "expires_in": 14399})
		bad_response = _response(400, {})
		with (
			patch("sentra_mantra_integrations.satusehat.client.requests.post", return_value=token_response),
			patch(
				"sentra_mantra_integrations.satusehat.client.requests.get", return_value=bad_response
			) as get,
		):
			with self.assertRaises(client.SatuSehatClientError):
				client.fhir_get("Encounter", {})
		self.assertEqual(get.call_count, 1)

	def test_429_is_retried_up_to_max_attempts_then_raises(self):
		token_response = _response(200, {"access_token": "tok", "expires_in": 14399})
		throttled = _response(429, {})
		with (
			patch("sentra_mantra_integrations.satusehat.client.requests.post", return_value=token_response),
			patch("sentra_mantra_integrations.satusehat.client.requests.get", return_value=throttled) as get,
		):
			with self.assertRaises(client.SatuSehatClientError):
				client.fhir_get("Encounter", {})
		self.assertEqual(get.call_count, client._MAX_RETRIES)

	def test_5xx_is_retried_like_429(self):
		token_response = _response(200, {"access_token": "tok", "expires_in": 14399})
		server_error = _response(503, {})
		with (
			patch("sentra_mantra_integrations.satusehat.client.requests.post", return_value=token_response),
			patch(
				"sentra_mantra_integrations.satusehat.client.requests.get", return_value=server_error
			) as get,
		):
			with self.assertRaises(client.SatuSehatClientError):
				client.fhir_get("Encounter", {})
		self.assertEqual(get.call_count, client._MAX_RETRIES)

	def test_401_refreshes_token_once_then_succeeds(self):
		token_response = _response(200, {"access_token": "tok1", "expires_in": 14399})
		unauthorized = _response(401, {})
		ok = _response(200, {"resourceType": "Bundle", "total": 1})
		with (
			patch("sentra_mantra_integrations.satusehat.client.requests.post", return_value=token_response),
			patch(
				"sentra_mantra_integrations.satusehat.client.requests.get",
				side_effect=[unauthorized, ok],
			) as get,
		):
			result = client.fhir_get("Encounter", {})
		self.assertEqual(result["total"], 1)
		self.assertEqual(get.call_count, 2)

	def test_401_twice_raises_without_looping_forever(self):
		token_response = _response(200, {"access_token": "tok1", "expires_in": 14399})
		unauthorized = _response(401, {})
		with (
			patch("sentra_mantra_integrations.satusehat.client.requests.post", return_value=token_response),
			patch(
				"sentra_mantra_integrations.satusehat.client.requests.get",
				return_value=unauthorized,
			) as get,
		):
			with self.assertRaises(requests.HTTPError):
				client.fhir_get("Encounter", {})
		self.assertEqual(get.call_count, 2)

	def test_network_error_is_retried_then_raises_client_error(self):
		token_response = _response(200, {"access_token": "tok", "expires_in": 14399})
		with (
			patch("sentra_mantra_integrations.satusehat.client.requests.post", return_value=token_response),
			patch(
				"sentra_mantra_integrations.satusehat.client.requests.get",
				side_effect=requests.ConnectionError("unreachable"),
			) as get,
		):
			with self.assertRaises(client.SatuSehatClientError):
				client.fhir_get("Encounter", {})
		self.assertEqual(get.call_count, client._MAX_RETRIES)

	def test_api_post_sends_bearer_json_and_returns_parsed_body(self):
		token_response = _response(200, {"access_token": "tok", "expires_in": 14399})
		ok = _response(200, {"success": True, "code": 200, "data": "https://link.example/x"})
		with patch(
			"sentra_mantra_integrations.satusehat.client.requests.post",
			side_effect=[token_response, ok],
		) as post:
			result = client.api_post("https://example.invalid/ssrme/api-dto/v1/shl/get", {"patient_id": "P1"})

		self.assertEqual(result["data"], "https://link.example/x")
		api_call = post.call_args_list[-1]
		self.assertEqual(api_call.args[0], "https://example.invalid/ssrme/api-dto/v1/shl/get")
		self.assertEqual(api_call.kwargs["json"], {"patient_id": "P1"})
		self.assertEqual(api_call.kwargs["headers"]["Authorization"], "Bearer tok")

	def test_api_post_400_is_never_retried(self):
		token_response = _response(200, {"access_token": "tok", "expires_in": 14399})
		bad = _response(400, {})
		with patch(
			"sentra_mantra_integrations.satusehat.client.requests.post",
			side_effect=[token_response, bad, bad, bad],
		) as post:
			with self.assertRaises(client.SatuSehatClientError):
				client.api_post("https://example.invalid/shl/get", {})
		# 1 token call + 1 API call, no retry on the privacy-gate rejection
		self.assertEqual(post.call_count, 2)

	def test_no_secret_value_leaks_into_any_exception_message(self):
		token_response = _response(200, {"access_token": "tok", "expires_in": 14399})
		bad_response = _response(400, {})
		with (
			patch("sentra_mantra_integrations.satusehat.client.requests.post", return_value=token_response),
			patch("sentra_mantra_integrations.satusehat.client.requests.get", return_value=bad_response),
		):
			try:
				client.fhir_get("Encounter", {})
				self.fail("expected SatuSehatClientError")
			except client.SatuSehatClientError as exc:
				self.assertNotIn(ENV["MANTRA_SATUSEHAT_CLIENT_SECRET"], str(exc))
				self.assertNotIn(ENV["MANTRA_SATUSEHAT_CLIENT_ID"], str(exc))
