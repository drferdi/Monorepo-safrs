# Test config default backend and model honoring (VAL-RUNTIME-009)
import importlib.util
import io
import os
import unittest
from pathlib import Path
from unittest.mock import patch

from rich.console import Console

from sidelab.llm.config import (
    PROVIDER_REGISTRY,
    default_model_for_backend,
    normalize_backend,
    render_mode_menu,
    resolve_backend_choice,
)

_spec = importlib.util.spec_from_file_location(
    "sidelab_app", Path(__file__).resolve().parent.parent / "sidelab.py"
)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


def _make_capture_console():
    buf = io.StringIO()
    return Console(file=buf, force_terminal=True, width=120, highlight=False), buf


# ---------------------------------------------------------------------------
# Unit tests: config-level functions
# ---------------------------------------------------------------------------
class ConfigDefaultBackendUnitTests(unittest.TestCase):
    """Tests that SIDELAB_DEFAULT_BACKEND env var is honored at the config level."""

    def test_blank_input_honors_env_default_backend_nvidia(self):
        with patch.dict(os.environ, {"SIDELAB_DEFAULT_BACKEND": "nvidia"}, clear=True):
            self.assertEqual(resolve_backend_choice(""), "nvidia")

    def test_blank_input_honors_env_default_backend_local(self):
        with patch.dict(os.environ, {"SIDELAB_DEFAULT_BACKEND": "local"}, clear=True):
            self.assertEqual(resolve_backend_choice(""), "local")

    def test_blank_input_honors_env_default_backend_kimi(self):
        with patch.dict(os.environ, {"SIDELAB_DEFAULT_BACKEND": "kimi"}, clear=True):
            self.assertEqual(resolve_backend_choice(""), "kimi")

    def test_blank_input_honors_env_default_backend_case_insensitive(self):
        with patch.dict(
            os.environ, {"SIDELAB_DEFAULT_BACKEND": "DeepSeek"}, clear=True
        ):
            self.assertEqual(resolve_backend_choice(""), "deepseek")

    def test_blank_input_falls_back_to_deepseek_when_env_invalid(self):
        with patch.dict(
            os.environ, {"SIDELAB_DEFAULT_BACKEND": "nonexistent"}, clear=True
        ):
            self.assertEqual(resolve_backend_choice(""), "deepseek")

    def test_blank_input_falls_back_to_deepseek_when_env_unset(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(resolve_backend_choice(""), "deepseek")

    def test_explicit_choice_overrides_env_default(self):
        with patch.dict(os.environ, {"SIDELAB_DEFAULT_BACKEND": "nvidia"}, clear=True):
            self.assertEqual(resolve_backend_choice("local"), "local")

    def test_normalize_backend_blank_honors_env(self):
        with patch.dict(os.environ, {"SIDELAB_DEFAULT_BACKEND": "nvidia"}, clear=True):
            self.assertEqual(normalize_backend(""), "nvidia")

    def test_normalize_backend_none_honors_env(self):
        with patch.dict(os.environ, {"SIDELAB_DEFAULT_BACKEND": "qwen"}, clear=True):
            self.assertEqual(normalize_backend(None), "qwen")


class ConfigDefaultModelUnitTests(unittest.TestCase):
    """Tests that provider-specific model env vars are honored at the config level."""

    def test_deepseek_model_env_honored(self):
        with patch.dict(os.environ, {"DEEPSEEK_MODEL": "deepseek-v4-pro"}, clear=True):
            self.assertEqual(default_model_for_backend("deepseek"), "deepseek-v4-pro")

    def test_nvidia_model_env_honored(self):
        with patch.dict(
            os.environ,
            {"NVIDIA_MODEL": "nvidia/llama-3.3-nemotron-super-49b-v1"},
            clear=True,
        ):
            self.assertEqual(
                default_model_for_backend("nvidia"),
                "nvidia/llama-3.3-nemotron-super-49b-v1",
            )

    def test_kimi_model_env_honored(self):
        with patch.dict(os.environ, {"KIMI_MODEL": "moonshot-v1-128k"}, clear=True):
            self.assertEqual(default_model_for_backend("kimi"), "moonshot-v1-128k")

    def test_model_falls_back_to_provider_default_when_env_unset(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(
                default_model_for_backend("deepseek"),
                PROVIDER_REGISTRY["deepseek"]["default_model"],
            )
            self.assertEqual(
                default_model_for_backend("nvidia"),
                PROVIDER_REGISTRY["nvidia"]["default_model"],
            )

    def test_model_env_honored_even_when_backend_is_none(self):
        with patch.dict(
            os.environ,
            {
                "SIDELAB_DEFAULT_BACKEND": "gemini",
                "GEMINI_MODEL": "gemini-1.5-pro-001",
            },
            clear=True,
        ):
            self.assertEqual(default_model_for_backend(None), "gemini-1.5-pro-001")


class CombinedDefaultBackendAndModelTests(unittest.TestCase):
    """Tests that both SIDELAB_DEFAULT_BACKEND and model env vars are honored together."""

    def test_nvidia_default_with_custom_model(self):
        env = {
            "SIDELAB_DEFAULT_BACKEND": "nvidia",
            "NVIDIA_MODEL": "nvidia/nemotron-mini-4b-instruct",
        }
        with patch.dict(os.environ, env, clear=True):
            backend = resolve_backend_choice("")
            model = default_model_for_backend(backend)
            self.assertEqual(backend, "nvidia")
            self.assertEqual(model, "nvidia/nemotron-mini-4b-instruct")

    def test_deepseek_default_with_custom_model(self):
        env = {
            "SIDELAB_DEFAULT_BACKEND": "deepseek",
            "DEEPSEEK_MODEL": "deepseek-v4-pro",
        }
        with patch.dict(os.environ, env, clear=True):
            backend = resolve_backend_choice("")
            model = default_model_for_backend(backend)
            self.assertEqual(backend, "deepseek")
            self.assertEqual(model, "deepseek-v4-pro")

    def test_kimi_default_with_custom_model(self):
        env = {
            "SIDELAB_DEFAULT_BACKEND": "kimi",
            "KIMI_MODEL": "moonshot-v1-32k",
        }
        with patch.dict(os.environ, env, clear=True):
            backend = resolve_backend_choice("")
            model = default_model_for_backend(backend)
            self.assertEqual(backend, "kimi")
            self.assertEqual(model, "moonshot-v1-32k")

    def test_qwen_default_with_custom_model(self):
        env = {
            "SIDELAB_DEFAULT_BACKEND": "qwen",
            "QWEN_MODEL": "qwen-max",
        }
        with patch.dict(os.environ, env, clear=True):
            backend = resolve_backend_choice("")
            model = default_model_for_backend(backend)
            self.assertEqual(backend, "qwen")
            self.assertEqual(model, "qwen-max")

    def test_zhipu_default_with_custom_model(self):
        env = {
            "SIDELAB_DEFAULT_BACKEND": "zhipu",
            "ZHIPU_MODEL": "glm-4-plus",
        }
        with patch.dict(os.environ, env, clear=True):
            backend = resolve_backend_choice("")
            model = default_model_for_backend(backend)
            self.assertEqual(backend, "zhipu")
            self.assertEqual(model, "glm-4-plus")

    def test_yi_default_with_custom_model(self):
        env = {
            "SIDELAB_DEFAULT_BACKEND": "yi",
            "YI_MODEL": "yi-large",
        }
        with patch.dict(os.environ, env, clear=True):
            backend = resolve_backend_choice("")
            model = default_model_for_backend(backend)
            self.assertEqual(backend, "yi")
            self.assertEqual(model, "yi-large")

    def test_baichuan_default_with_custom_model(self):
        env = {
            "SIDELAB_DEFAULT_BACKEND": "baichuan",
            "BAICHUAN_MODEL": "Baichuan4-Turbo",
        }
        with patch.dict(os.environ, env, clear=True):
            backend = resolve_backend_choice("")
            model = default_model_for_backend(backend)
            self.assertEqual(backend, "baichuan")
            self.assertEqual(model, "Baichuan4-Turbo")

    def test_ernie_default_with_custom_model(self):
        env = {
            "SIDELAB_DEFAULT_BACKEND": "ernie",
            "ERNIE_MODEL": "ernie-3.5-8k",
        }
        with patch.dict(os.environ, env, clear=True):
            backend = resolve_backend_choice("")
            model = default_model_for_backend(backend)
            self.assertEqual(backend, "ernie")
            self.assertEqual(model, "ernie-3.5-8k")

    def test_spark_default_with_custom_model(self):
        env = {
            "SIDELAB_DEFAULT_BACKEND": "spark",
            "SPARK_MODEL": "4.0Ultra",
        }
        with patch.dict(os.environ, env, clear=True):
            backend = resolve_backend_choice("")
            model = default_model_for_backend(backend)
            self.assertEqual(backend, "spark")
            self.assertEqual(model, "4.0Ultra")

    def test_gemini_default_with_custom_model(self):
        env = {
            "SIDELAB_DEFAULT_BACKEND": "gemini",
            "GEMINI_MODEL": "gemini-1.5-flash-001",
        }
        with patch.dict(os.environ, env, clear=True):
            backend = resolve_backend_choice("")
            model = default_model_for_backend(backend)
            self.assertEqual(backend, "gemini")
            self.assertEqual(model, "gemini-1.5-flash-001")

    def test_local_default_with_custom_model(self):
        env = {
            "SIDELAB_DEFAULT_BACKEND": "local",
            "SIDELAB_LOCAL_MODEL": "llama3.2:1b",
        }
        with patch.dict(os.environ, env, clear=True):
            backend = resolve_backend_choice("")
            model = default_model_for_backend(backend)
            self.assertEqual(backend, "local")
            self.assertEqual(model, "llama3.2:1b")


# ---------------------------------------------------------------------------
# Menu rendering tests: default label matches configured backend
# ---------------------------------------------------------------------------
class MenuDefaultLabelTests(unittest.TestCase):
    """Tests that the menu's "Tekan Enter untuk ..." line matches the configured default."""

    def test_menu_default_label_matches_default_backend_deepseek(self):
        with patch.dict(
            os.environ, {"SIDELAB_DEFAULT_BACKEND": "deepseek"}, clear=True
        ):
            menu = render_mode_menu()
            self.assertIn("Tekan Enter untuk DeepSeek.", menu)

    def test_menu_default_label_matches_default_backend_nvidia(self):
        with patch.dict(os.environ, {"SIDELAB_DEFAULT_BACKEND": "nvidia"}, clear=True):
            menu = render_mode_menu()
            self.assertIn("Tekan Enter untuk NVIDIA NIM.", menu)

    def test_menu_default_label_matches_default_backend_local(self):
        with patch.dict(os.environ, {"SIDELAB_DEFAULT_BACKEND": "local"}, clear=True):
            menu = render_mode_menu()
            self.assertIn("Tekan Enter untuk Local Ollama.", menu)

    def test_menu_default_label_matches_default_backend_kimi(self):
        with patch.dict(os.environ, {"SIDELAB_DEFAULT_BACKEND": "kimi"}, clear=True):
            menu = render_mode_menu()
            self.assertIn("Tekan Enter untuk Kimi (Moonshot AI).", menu)

    def test_menu_default_label_matches_default_backend_gemini(self):
        with patch.dict(os.environ, {"SIDELAB_DEFAULT_BACKEND": "gemini"}, clear=True):
            menu = render_mode_menu()
            self.assertIn("Tekan Enter untuk Google Gemini (Vertex AI).", menu)

    def test_menu_falls_back_to_deepseek_when_env_invalid(self):
        with patch.dict(
            os.environ, {"SIDELAB_DEFAULT_BACKEND": "unknown_backend"}, clear=True
        ):
            menu = render_mode_menu()
            self.assertIn("Tekan Enter untuk DeepSeek.", menu)

    def test_menu_falls_back_to_deepseek_when_env_unset(self):
        with patch.dict(os.environ, {}, clear=True):
            menu = render_mode_menu()
            self.assertIn("Tekan Enter untuk DeepSeek.", menu)


# ---------------------------------------------------------------------------
# Integration tests: full CLI startup flow with env vars
# ---------------------------------------------------------------------------
class StartupFlowWithEnvDefaultsTests(unittest.TestCase):
    """Tests the full CLI startup flow with env-driven defaults."""

    def test_env_default_backend_selected_when_pressing_enter(self):
        """Pressing Enter with SIDELAB_DEFAULT_BACKEND=nvidia selects NVIDIA."""
        env = {
            "SIDELAB_DEFAULT_BACKEND": "nvidia",
            "NVIDIA_MODEL": "nvidia/nemotron-mini-4b-instruct",
            "NVIDIA_API_KEY": "test-key",
        }
        input_sequence = ["", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.dict(os.environ, env, clear=True),
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        # Default label in menu should show NVIDIA NIM
        self.assertIn("Tekan Enter untuk NVIDIA NIM.", output)
        # Active backend disclosure should show NVIDIA NIM
        self.assertIn("Mode aktif: NVIDIA NIM", output)
        # Header should show NVIDIA NIM as backend
        self.assertIn("NVIDIA NIM", output)
        # Active model disclosure should show the configured model
        self.assertIn("nvidia/nemotron-mini-4b-instruct", output)

    def test_env_default_deepseek_with_custom_model_shows_in_header(self):
        """DeepSeek default with DEEPSEEK_MODEL=deepseek-v4-pro shows in disclosures."""
        env = {
            "SIDELAB_DEFAULT_BACKEND": "deepseek",
            "DEEPSEEK_MODEL": "deepseek-v4-pro",
            "DEEPSEEK_API_KEY": "test-key",
        }
        input_sequence = ["", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.dict(os.environ, env, clear=True),
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        self.assertIn("Tekan Enter untuk DeepSeek.", output)
        self.assertIn("Mode aktif: DeepSeek", output)
        self.assertIn("deepseek-v4-pro", output)

    def test_env_default_local_with_custom_model_shows_in_disclosures(self):
        """Local default with SIDELAB_LOCAL_MODEL shows in disclosures."""
        env = {
            "SIDELAB_DEFAULT_BACKEND": "local",
            "SIDELAB_LOCAL_MODEL": "custom-local-model:latest",
        }
        input_sequence = ["", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.dict(os.environ, env, clear=True),
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        self.assertIn("Tekan Enter untuk Local Ollama.", output)
        self.assertIn("Mode aktif: Local Ollama", output)
        self.assertIn("custom-local-model:latest", output)

    def test_env_default_kimi_with_custom_model_shows_in_disclosures(self):
        """Kimi default with KIMI_MODEL shows in disclosures."""
        env = {
            "SIDELAB_DEFAULT_BACKEND": "kimi",
            "KIMI_MODEL": "moonshot-v1-128k",
            "KIMI_API_KEY": "test-key",
        }
        input_sequence = ["", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.dict(os.environ, env, clear=True),
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        self.assertIn("Tekan Enter untuk Kimi (Moonshot AI).", output)
        self.assertIn("Mode aktif: Kimi (Moonshot AI)", output)
        self.assertIn("moonshot-v1-128k", output)

    def test_env_default_gemini_with_custom_model_shows_in_disclosures(self):
        """Gemini default with GEMINI_MODEL shows in disclosures."""
        env = {
            "SIDELAB_DEFAULT_BACKEND": "gemini",
            "GEMINI_MODEL": "gemini-1.5-pro-001",
            "VERTEX_PROJECT": "test-project",
        }
        input_sequence = ["", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.dict(os.environ, env, clear=True),
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        self.assertIn("Tekan Enter untuk Google Gemini (Vertex AI).", output)
        self.assertIn("Mode aktif: Google Gemini (Vertex AI)", output)
        self.assertIn("gemini-1.5-pro-001", output)

    def test_default_label_active_backend_and_model_all_agree(self):
        """All three disclosures (default label, active backend, active model) agree."""
        env = {
            "SIDELAB_DEFAULT_BACKEND": "qwen",
            "QWEN_MODEL": "qwen-max",
            "QWEN_API_KEY": "test-key",
        }
        input_sequence = ["", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.dict(os.environ, env, clear=True),
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        # Default label
        self.assertIn("Tekan Enter untuk Qwen (Alibaba).", output)
        # Active backend disclosure
        self.assertIn("Mode aktif: Qwen (Alibaba)", output)
        # Active model disclosure
        self.assertIn("qwen-max", output)
        # No mention of deepseek as active (proves default wasn't silently used)
        self.assertNotIn("Mode aktif: DeepSeek", output)

    def test_pressing_enter_does_not_require_manual_typing(self):
        """Pressing Enter (empty input) selects default without manual backend name typing."""
        env = {
            "SIDELAB_DEFAULT_BACKEND": "baichuan",
            "BAICHUAN_MODEL": "Baichuan4",
            "BAICHUAN_API_KEY": "test-key",
        }
        input_sequence = ["", "/exit"]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.dict(os.environ, env, clear=True),
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        # The default label says "Tekan Enter untuk Baichuan AI."
        self.assertIn("Tekan Enter untuk Baichuan AI.", output)
        # After pressing Enter, the active mode is Baichuan AI
        self.assertIn("Mode aktif: Baichuan AI", output)
        self.assertIn("Baichuan4", output)


# ---------------------------------------------------------------------------
# Edge case tests
# ---------------------------------------------------------------------------
class DefaultConfigEdgeCaseTests(unittest.TestCase):
    """Edge cases for default backend/model configuration."""

    def test_only_model_env_set_without_backend_env_still_works(self):
        """When only DEEPSEEK_MODEL is set but SIDELAB_DEFAULT_BACKEND is not,
        pressing Enter still selects deepseek with the custom model."""
        env = {"DEEPSEEK_MODEL": "deepseek-v4-pro"}
        with patch.dict(os.environ, env, clear=True):
            backend = resolve_backend_choice("")
            model = default_model_for_backend(backend)
            self.assertEqual(backend, "deepseek")
            self.assertEqual(model, "deepseek-v4-pro")

    def test_model_env_for_wrong_provider_not_used(self):
        """When SIDELAB_DEFAULT_BACKEND=nvidia, only NVIDIA_MODEL is used,
        not DEEPSEEK_MODEL."""
        env = {
            "SIDELAB_DEFAULT_BACKEND": "nvidia",
            "NVIDIA_MODEL": "nvidia/nemotron-mini-4b-instruct",
            "DEEPSEEK_MODEL": "deepseek-v4-pro",
        }
        with patch.dict(os.environ, env, clear=True):
            backend = resolve_backend_choice("")
            model = default_model_for_backend(backend)
            self.assertEqual(backend, "nvidia")
            self.assertEqual(model, "nvidia/nemotron-mini-4b-instruct")
            # DeepSeek model should not leak in
            self.assertNotEqual(model, "deepseek-v4-pro")

    def test_default_backend_env_with_trailing_whitespace(self):
        with patch.dict(
            os.environ, {"SIDELAB_DEFAULT_BACKEND": "  nvidia  "}, clear=True
        ):
            self.assertEqual(resolve_backend_choice(""), "nvidia")

    def test_default_model_env_with_trailing_whitespace(self):
        env = {
            "SIDELAB_DEFAULT_BACKEND": "deepseek",
            "DEEPSEEK_MODEL": "  deepseek-v4-pro  ",
        }
        with patch.dict(os.environ, env, clear=True):
            self.assertEqual(
                default_model_for_backend("deepseek"), "  deepseek-v4-pro  "
            )


if __name__ == "__main__":
    unittest.main()
