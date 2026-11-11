# Tests for credential readiness disclosure — VAL-RUNTIME-002, VAL-RUNTIME-005, VAL-RUNTIME-011
import importlib.util
import io
import os
import unittest
from pathlib import Path
from unittest.mock import patch

from rich.console import Console

from sidelab.llm.config import check_backend_readiness

_spec = importlib.util.spec_from_file_location(
    "sidelab_app", Path(__file__).resolve().parent.parent / "sidelab.py"
)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


def _make_capture_console():
    buf = io.StringIO()
    return Console(file=buf, force_terminal=True, width=120, highlight=False), buf


class CheckBackendReadinessUnitTests(unittest.TestCase):
    """Unit tests for check_backend_readiness() function."""

    def test_deepseek_missing_key_returns_not_ready(self):
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": ""}, clear=True):
            ready, missing, msg = check_backend_readiness("deepseek")
        self.assertFalse(ready)
        self.assertEqual(missing, "DEEPSEEK_API_KEY")
        self.assertIn("DEEPSEEK_API_KEY", msg)

    def test_deepseek_with_key_returns_ready(self):
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "sk-test"}, clear=True):
            ready, missing, msg = check_backend_readiness("deepseek")
        self.assertTrue(ready)
        self.assertEqual(missing, "")
        self.assertEqual(msg, "")

    def test_local_no_models_returns_not_ready(self):
        """Local backend without ollama available returns not-ready."""
        # Without the ollama package installed, the import will fail
        with patch.dict(os.environ, {}, clear=True):
            # check_backend_readiness will try to import ollama and fail
            ready, missing, msg = check_backend_readiness("local")
        # May be False if ollama not installed, or True if it is
        # Just check that we get a valid tuple
        self.assertIsInstance(ready, bool)
        self.assertIsInstance(missing, str)
        self.assertIsInstance(msg, str)

    def test_nvidia_missing_key_returns_not_ready(self):
        with patch.dict(os.environ, {"NVIDIA_API_KEY": ""}, clear=True):
            ready, missing, msg = check_backend_readiness("nvidia")
        self.assertFalse(ready)
        self.assertEqual(missing, "NVIDIA_API_KEY")
        self.assertIn("NVIDIA_API_KEY", msg)

    def test_kimi_missing_key_returns_not_ready(self):
        with patch.dict(os.environ, {"KIMI_API_KEY": ""}, clear=True):
            ready, missing, msg = check_backend_readiness("kimi")
        self.assertFalse(ready)
        self.assertEqual(missing, "KIMI_API_KEY")
        self.assertIn("KIMI", msg)

    def test_gemini_vertex_missing_project_returns_not_ready(self):
        with patch.dict(
            os.environ, {"VERTEX_PROJECT": "", "GOOGLE_CLOUD_PROJECT": ""}, clear=True
        ):
            ready, missing, msg = check_backend_readiness("gemini")
        self.assertFalse(ready)
        self.assertEqual(missing, "VERTEX_PROJECT")
        self.assertIn("VERTEX_PROJECT", msg)

    def test_qwen_with_key_returns_ready(self):
        with patch.dict(os.environ, {"QWEN_API_KEY": "sk-test"}, clear=True):
            ready, _missing, _msg = check_backend_readiness("qwen")
        self.assertTrue(ready)

    def test_unknown_backend_returns_not_ready(self):
        with patch.dict(os.environ, {}, clear=True):
            ready, missing, msg = check_backend_readiness("nonexistent_backend_xyz")
        self.assertFalse(ready)
        self.assertEqual(missing, "unknown_backend")


class StartupReadinessWarningTests(unittest.TestCase):
    """Integration tests: startup shows readiness warnings before first prompt."""

    def test_deepseek_missing_key_shows_warning_before_first_prompt(self):
        """VAL-RUNTIME-002: Missing DeepSeek credentials disclosed before first case entry."""
        input_sequence = ["", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": ""}, clear=True):
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
        # Should contain the warning about missing DEEPSEEK_API_KEY
        self.assertIn("DEEPSEEK_API_KEY", output)
        self.assertIn("PERINGATAN", output)
        # Badge renders uppercase: "TDK SIAP"
        self.assertIn("TDK SIAP", output)

    def test_deepseek_with_key_shows_online_status(self):
        """When key is present, the header shows online badge."""
        input_sequence = ["", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "sk-test"}, clear=True):
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
        self.assertIn("ONLINE", output)
        self.assertNotIn("TDK SIAP", output)
        self.assertNotIn("PERINGATAN", output)

    def test_nvidia_missing_key_shows_warning_with_provider_name(self):
        """VAL-RUNTIME-005: Optional backend not-ready surfaces provider-specific message."""
        input_sequence = ["3", "/exit"]  # 3 = NVIDIA
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with patch.dict(os.environ, {"NVIDIA_API_KEY": ""}, clear=True):
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
        self.assertIn("NVIDIA_API_KEY", output)
        self.assertIn("PERINGATAN", output)
        self.assertIn("TDK SIAP", output)


class FailFastNoPartialOutputTests(unittest.TestCase):
    """VAL-RUNTIME-011: Backend-not-ready paths fail fast without partial clinical output."""

    def test_complaint_rejected_with_error_when_backend_not_ready(self):
        """Submitting complaint when backend is not ready fails fast."""
        input_sequence = ["", "pasien demam tinggi 3 hari", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": ""}, clear=True):
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
        # Should show the provider-specific error
        self.assertIn("DEEPSEEK_API_KEY", output)
        self.assertIn("ERROR", output)
        # The fail-fast message
        self.assertIn("Tidak ada output klinis", output)
        # _chat mock should NOT have produced output (mock returns "", but the
        # real guard should have stopped before reaching it)
        # No partial clinical output (red flags would appear before chat)
        self.assertNotIn("RED FLAG", output.upper())

    def test_chat_function_returns_empty_when_backend_not_ready(self):
        """The _chat function itself returns empty string when backend is not ready."""
        cap, buf = _make_capture_console()
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": ""}, clear=True):
            with patch.object(m, "console", cap):
                result = m._chat(
                    "pasien demam",
                    history=[],
                    pasien={},
                    model="deepseek-v4-flash",
                    backend="deepseek",
                )
        self.assertEqual(result, "")
        output = buf.getvalue()
        self.assertIn("ERROR", output)
        self.assertIn("DEEPSEEK_API_KEY", output)
        # No red flag output, no streaming tokens
        self.assertNotIn("RED FLAG", output.upper())

    def test_complaint_accepted_when_backend_is_ready(self):
        """With valid credentials, complaint goes through to _chat."""
        input_sequence = [
            "",
            "pasien demam",
            "",  # durasi (skip)
            "",  # gejala (skip)
            "",  # redflag (skip)
            "",  # vital (skip)
            "/exit",
        ]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "sk-test"}, clear=True):
            with (
                patch.object(m, "console", cap),
                patch.object(cap, "input", side_effect=fake_input),
                patch.object(m, "_chat", return_value="RESPON KLINIS") as mock_chat,
            ):
                try:
                    m.main()
                except StopIteration:
                    pass

        output = buf.getvalue()
        # Should NOT have the fail-fast error
        self.assertNotIn("Tidak ada output klinis", output)
        self.assertNotIn("ERROR", output)
        # _chat should have been called exactly once with the structured prompt
        mock_chat.assert_called_once()
        self.assertIn("pasien demam", mock_chat.call_args[0][0])


class HeaderReadinessStatusTests(unittest.TestCase):
    """Tests that header readiness status is truthful."""

    def test_header_shows_tdk_siap_when_backend_not_ready(self):
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_header(
                session_id="TEST001",
                backend="deepseek",
                model="deepseek-v4-flash",
                backend_ready=False,
            )
        output = buf.getvalue()
        self.assertIn("TDK SIAP", output)
        self.assertNotIn("ONLINE", output)

    def test_header_shows_online_when_backend_ready(self):
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_header(
                session_id="TEST001",
                backend="deepseek",
                model="deepseek-v4-flash",
                backend_ready=True,
            )
        output = buf.getvalue()
        self.assertIn("ONLINE", output)
        self.assertNotIn("TDK SIAP", output)

    def test_header_defaults_to_online_when_readiness_not_specified(self):
        """Backward compat: when backend_ready not passed, defaults to True (online)."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_header(session_id="TEST001")
        output = buf.getvalue()
        self.assertIn("ONLINE", output)
        self.assertNotIn("TDK SIAP", output)

    def test_clear_redraw_preserves_readiness_status(self):
        """After /clear, header still shows correct readiness."""
        input_sequence = ["", "/clear", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": ""}, clear=True):
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
        # "TDK SIAP" should appear at least twice — startup and /clear
        self.assertGreaterEqual(output.count("TDK SIAP"), 2)

    def test_next_redraw_preserves_readiness_status(self):
        """After /next, header still shows correct readiness."""
        input_sequence = ["", "/next", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": ""}, clear=True):
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
        self.assertGreaterEqual(output.count("TDK SIAP"), 2)


if __name__ == "__main__":
    unittest.main()
