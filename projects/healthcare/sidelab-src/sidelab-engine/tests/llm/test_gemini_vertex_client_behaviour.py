# Architected and built by codieverse+.
import os
import sys
import types
import unittest
from unittest.mock import MagicMock, patch

from sidelab.llm.gemini_vertex_client import GeminiVertexClient

_MESSAGES = [{"role": "user", "content": "hai"}]


class FakeResponse:
    def __init__(self, status_code=200, lines=None, text=""):
        self.status_code = status_code
        self._lines = lines or []
        self.text = text

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def iter_lines(self, decode_unicode=True):
        yield from self._lines


def _fake_google_modules(token="fake-vertex-token"):
    """Modul google.auth palsu: tidak ada kredensial atau jaringan sungguhan."""
    creds = MagicMock()
    creds.token = token
    google_mod = types.ModuleType("google")
    auth_mod = types.ModuleType("google.auth")
    transport_mod = types.ModuleType("google.auth.transport")
    requests_mod = types.ModuleType("google.auth.transport.requests")
    auth_mod.default = MagicMock(return_value=(creds, "synthetic-project"))
    requests_mod.Request = MagicMock(name="Request")
    google_mod.auth = auth_mod
    auth_mod.transport = transport_mod
    transport_mod.requests = requests_mod
    modules = {
        "google": google_mod,
        "google.auth": auth_mod,
        "google.auth.transport": transport_mod,
        "google.auth.transport.requests": requests_mod,
    }
    return modules, auth_mod, requests_mod, creds


_ENV = {
    "VERTEX_PROJECT": "synthetic-project",
    "GOOGLE_CLOUD_PROJECT": "",
    "VERTEX_LOCATION": "asia-southeast2",
    "SIDELAB_MAX_TOKENS": "",
    "GEMINI_TIMEOUT": "",
}


class GeminiVertexConfigTests(unittest.TestCase):
    def test_project_falls_back_to_google_cloud_project_when_vertex_project_empty(self):
        env = dict(_ENV, VERTEX_PROJECT="", GOOGLE_CLOUD_PROJECT="  fallback-project  ")
        with patch.dict(os.environ, env):
            client = GeminiVertexClient()
        self.assertEqual(client.project, "fallback-project")

    def test_location_defaults_to_us_central1_when_unset(self):
        with patch.dict(os.environ, _ENV):
            os.environ.pop("VERTEX_LOCATION")
            client = GeminiVertexClient()
        self.assertEqual(client.location, "us-central1")

    @patch("sidelab.llm.gemini_vertex_client.requests.post")
    def test_missing_project_raises_before_any_http_request(self, mock_post):
        env = dict(_ENV, VERTEX_PROJECT="", GOOGLE_CLOUD_PROJECT="")
        with patch.dict(os.environ, env):
            client = GeminiVertexClient()
            with self.assertRaises(RuntimeError) as ctx:
                list(client.stream_chat(_MESSAGES, "gemini-2.0-flash"))
        self.assertIn("VERTEX_PROJECT", str(ctx.exception))
        mock_post.assert_not_called()


class GeminiVertexAuthTests(unittest.TestCase):
    def test_access_token_raises_runtime_error_when_google_auth_missing(self):
        blocked = {
            "google": None,
            "google.auth": None,
            "google.auth.transport": None,
            "google.auth.transport.requests": None,
        }
        with patch.dict(sys.modules, blocked):
            with self.assertRaises(RuntimeError) as ctx:
                GeminiVertexClient()._access_token()
        self.assertIn("google-auth", str(ctx.exception))

    def test_access_token_refreshes_default_credentials_with_cloud_platform_scope(self):
        modules, auth_mod, requests_mod, creds = _fake_google_modules("tok-123")
        with patch.dict(sys.modules, modules):
            token = GeminiVertexClient()._access_token()
        self.assertEqual(token, "tok-123")
        auth_mod.default.assert_called_once_with(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        creds.refresh.assert_called_once_with(requests_mod.Request.return_value)


class GeminiVertexStreamTests(unittest.TestCase):
    def _stream(self, mock_post, env_overrides=None):
        modules, _auth, _req, _creds = _fake_google_modules("tok-abc")
        env = dict(_ENV, **(env_overrides or {}))
        with patch.dict(os.environ, env), patch.dict(sys.modules, modules):
            client = GeminiVertexClient()
            return list(client.stream_chat(_MESSAGES, "gemini-2.0-flash"))

    @patch("sidelab.llm.gemini_vertex_client.requests.post")
    def test_request_targets_regional_openapi_endpoint_with_bearer_token(self, mock_post):
        mock_post.return_value = FakeResponse(lines=["data: [DONE]"])
        self._stream(mock_post)
        args, kwargs = mock_post.call_args
        self.assertEqual(
            args[0],
            "https://asia-southeast2-aiplatform.googleapis.com/v1beta1/projects/"
            "synthetic-project/locations/asia-southeast2/endpoints/openapi/chat/completions",
        )
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer tok-abc")
        self.assertTrue(kwargs["stream"])
        self.assertEqual(
            kwargs["json"],
            {"model": "gemini-2.0-flash", "messages": _MESSAGES, "stream": True},
        )

    @patch("sidelab.llm.gemini_vertex_client.requests.post")
    def test_timeout_defaults_to_600_seconds_when_env_blank(self, mock_post):
        mock_post.return_value = FakeResponse(lines=[])
        self._stream(mock_post)
        self.assertEqual(mock_post.call_args.kwargs["timeout"], 600.0)

    @patch("sidelab.llm.gemini_vertex_client.requests.post")
    def test_timeout_and_max_tokens_are_taken_from_env(self, mock_post):
        mock_post.return_value = FakeResponse(lines=[])
        self._stream(mock_post, {"GEMINI_TIMEOUT": "45", "SIDELAB_MAX_TOKENS": "256"})
        kwargs = mock_post.call_args.kwargs
        self.assertEqual(kwargs["timeout"], 45.0)
        self.assertEqual(kwargs["json"]["max_tokens"], 256)

    @patch("sidelab.llm.gemini_vertex_client.requests.post")
    def test_zero_max_tokens_is_not_sent_in_payload(self, mock_post):
        mock_post.return_value = FakeResponse(lines=[])
        self._stream(mock_post, {"SIDELAB_MAX_TOKENS": "0"})
        self.assertNotIn("max_tokens", mock_post.call_args.kwargs["json"])

    @patch("sidelab.llm.gemini_vertex_client.requests.post")
    def test_http_error_status_raises_with_code_and_body(self, mock_post):
        mock_post.return_value = FakeResponse(status_code=403, text=" permission denied \n")
        with self.assertRaises(RuntimeError) as ctx:
            self._stream(mock_post)
        self.assertEqual(
            str(ctx.exception), "Gemini Vertex error (403): permission denied"
        )

    @patch("sidelab.llm.gemini_vertex_client.requests.post")
    def test_sse_parser_skips_noise_and_stops_at_done(self, mock_post):
        mock_post.return_value = FakeResponse(
            lines=[
                "",
                ": keep-alive comment",
                "event: message",
                "data: {not json}",
                'data: {"choices": [{"delta": {"content": "Halo"}}]}',
                'data: {"choices": [{"delta": {}}]}',
                'data: {"choices": [{"delta": null}]}',
                'data: {"choices": [{"delta": {"content": ""}}]}',
                'data: {"choices": [{"delta": {"content": " dok"}}]}',
                "data: [DONE]",
                'data: {"choices": [{"delta": {"content": "setelah DONE"}}]}',
            ]
        )
        self.assertEqual(self._stream(mock_post), ["Halo", " dok"])


if __name__ == "__main__":
    unittest.main()
