# DeepSeek Live E2E Path Tests — VAL-RUNTIME-003
# Verifies that with valid credentials, a simulated case produces a normal
# clinical response without backend-credential or transport failure.
#
# Requires: DEEPSEEK_API_KEY in environment or .env
# Marked with @pytest.mark.live — skipped when live credentials are unavailable.

import importlib.util
import io
import os
import unittest
from pathlib import Path
from unittest.mock import patch

import pytest
from dotenv import load_dotenv
from rich.console import Console

# Load .env from project root
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_env_path)

# Load sidelab module
_spec = importlib.util.spec_from_file_location(
    "sidelab_app", Path(__file__).resolve().parent.parent.parent / "sidelab.py"
)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


def _make_capture_console():
    buf = io.StringIO()
    return Console(file=buf, force_terminal=True, width=120, highlight=False), buf


@pytest.mark.live
class DeepSeekLiveE2ETests(unittest.TestCase):
    """VAL-RUNTIME-003: DeepSeek live path works end to end.

    These tests require a valid DEEPSEEK_API_KEY in the environment.
    They make real API calls to DeepSeek.
    """

    @classmethod
    def setUpClass(cls):
        cls.api_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
        if not cls.api_key:
            raise unittest.SkipTest(
                "DEEPSEEK_API_KEY not set — skipping live E2E tests"
            )

    def test_chat_produces_normal_clinical_response(self):
        """With valid credentials, _chat produces a non-empty streamed response
        without credential or transport failure."""
        # Simple simulated case — fever, cough, headache
        prompt = (
            "Pasien laki-laki 35 tahun, demam 3 hari, batuk kering, "
            "nyeri kepala, tidak ada riwayat alergi obat."
        )

        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            result = m._chat(
                prompt,
                history=[],
                pasien={},
                model="deepseek-v4-flash",
                backend="deepseek",
            )

        output = buf.getvalue()

        # Must produce a non-empty response
        self.assertTrue(
            len(result) > 50,
            f"Response too short ({len(result)} chars): {result[:200]}",
        )

        # Must NOT contain credential or transport errors
        self.assertNotIn("ERROR", output)
        self.assertNotIn("401", output)
        self.assertNotIn("403", output)
        self.assertNotIn("Authentication", output)
        self.assertNotIn("Invalid API", output)
        self.assertNotIn("Tidak ada output klinis", output)

        # Should contain clinical content (Indonesian medical terms)
        combined = (output + result).lower()
        # At least some clinical terms should appear
        clinical_terms = [
            "diagnosis",
            "terapi",
            "pemeriksaan",
            "edukasi",
            "demam",
            "batuk",
            "gejala",
            "pasien",
        ]
        found_terms = [t for t in clinical_terms if t in combined]
        self.assertTrue(
            len(found_terms) >= 2,
            f"Expected at least 2 clinical terms, found: {found_terms}",
        )

    def test_no_transport_or_credential_failure_in_response(self):
        """The response must not contain API error signatures."""
        prompt = (
            "Pasien perempuan 28 tahun, nyeri perut kanan bawah sejak 2 hari, "
            "mual, tidak ada demam."
        )

        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            result = m._chat(
                prompt,
                history=[],
                pasien={},
                model="deepseek-v4-flash",
                backend="deepseek",
            )

        output = buf.getvalue()
        combined = output + result

        # Transport / credential failure signatures
        # Use word-boundary patterns to avoid false positives
        # (e.g. "500 mg" is a clinical dosage, not an HTTP 500 error)
        failure_patterns = [
            "http 401",
            "http 403",
            "http 500",
            "http 502",
            "http 503",
            "status 401",
            "status 403",
            "status 500",
            "401 unauthorized",
            "403 forbidden",
            "connection refused",
            "connection timeout",
            "invalid api key",
            "authentication failed",
            "rate limit",
            "quota exceeded",
            "insufficient_quota",
            "account blocked",
        ]
        for pattern in failure_patterns:
            self.assertNotIn(
                pattern,
                combined.lower(),
                f"Found failure pattern '{pattern}' in response",
            )

    def test_backend_readiness_returns_ready(self):
        """check_backend_readiness returns ready for DeepSeek with valid key."""
        ready, missing, msg = m.check_backend_readiness("deepseek")
        self.assertTrue(ready, f"Backend not ready: {msg}")
        self.assertEqual(missing, "")
        self.assertEqual(msg, "")


@pytest.mark.live
class DeepSeekLiveStartupFlowTests(unittest.TestCase):
    """Verify DeepSeek mode is active and session proceeds normally."""

    @classmethod
    def setUpClass(cls):
        cls.api_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
        if not cls.api_key:
            raise unittest.SkipTest(
                "DEEPSEEK_API_KEY not set — skipping live E2E tests"
            )

    def test_mode_aktif_shows_deepseek(self):
        """The CLI should show 'Mode aktif: DeepSeek' at startup."""
        input_sequence = ["", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        self.assertIn("Mode aktif: DeepSeek", output)
        self.assertIn("DeepSeek", output)

    def test_header_shows_online_with_valid_credentials(self):
        """With valid credentials, header shows ONLINE badge."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_header(
                session_id="E2E001",
                backend="deepseek",
                model="deepseek-v4-flash",
                backend_ready=True,
            )
        output = buf.getvalue()
        self.assertIn("ONLINE", output)
        self.assertNotIn("TDK SIAP", output)
        self.assertIn("DeepSeek", output)
        self.assertIn("deepseek-v4-flash", output)


if __name__ == "__main__":
    unittest.main()
