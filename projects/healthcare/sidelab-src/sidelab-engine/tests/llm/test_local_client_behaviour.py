# Architected and built by codieverse+.
import os
import sys
import types
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from sidelab.llm.local_client import LocalClient, available_models

_MESSAGES = [{"role": "user", "content": "hai"}]


def _working_ollama(chunks=None, models=None):
    """Modul ollama palsu yang berperilaku seperti server lokal yang hidup."""
    fake = types.ModuleType("ollama")
    fake.chat = MagicMock(return_value=iter(chunks or []))
    fake.list = MagicMock(
        return_value=SimpleNamespace(
            models=[SimpleNamespace(model=name) for name in (models or [])]
        )
    )
    return fake


class LocalClientStreamTests(unittest.TestCase):
    def test_yields_only_non_empty_message_content(self):
        fake = _working_ollama(
            chunks=[
                {"message": {"content": "Halo"}},
                {"message": {"content": ""}},
                {},
                {"message": {"content": " dok"}},
            ]
        )
        with patch.dict(sys.modules, {"ollama": fake}), patch.dict(
            os.environ, {"SIDELAB_MAX_TOKENS": ""}
        ):
            tokens = list(LocalClient().stream_chat(_MESSAGES, "qwen2.5:7b"))
        self.assertEqual(tokens, ["Halo", " dok"])

    def test_options_is_none_when_max_tokens_unset(self):
        fake = _working_ollama()
        with patch.dict(sys.modules, {"ollama": fake}), patch.dict(
            os.environ, {"SIDELAB_MAX_TOKENS": ""}
        ):
            list(LocalClient().stream_chat(_MESSAGES, "qwen2.5:7b"))
        fake.chat.assert_called_once_with(
            model="qwen2.5:7b", messages=_MESSAGES, stream=True, options=None
        )

    def test_max_tokens_env_is_forwarded_as_num_predict(self):
        fake = _working_ollama()
        with patch.dict(sys.modules, {"ollama": fake}), patch.dict(
            os.environ, {"SIDELAB_MAX_TOKENS": "128"}
        ):
            list(LocalClient().stream_chat(_MESSAGES, "qwen2.5:7b"))
        self.assertEqual(fake.chat.call_args.kwargs["options"], {"num_predict": 128})

    def test_server_failure_is_wrapped_as_local_ollama_error(self):
        # conftest memasang ollama palsu yang chat()-nya melempar ConnectionError.
        with self.assertRaises(RuntimeError) as ctx:
            list(LocalClient().stream_chat(_MESSAGES, "qwen2.5:7b"))
        self.assertTrue(str(ctx.exception).startswith("Local Ollama error:"))
        self.assertIsInstance(ctx.exception.__cause__, ConnectionError)

    def test_missing_ollama_package_raises_install_hint(self):
        with patch.dict(sys.modules, {"ollama": None}):
            with self.assertRaises(RuntimeError) as ctx:
                list(LocalClient().stream_chat(_MESSAGES, "qwen2.5:7b"))
        self.assertIn("Ollama package belum tersedia", str(ctx.exception))


class AvailableModelsTests(unittest.TestCase):
    def test_lists_model_names_from_running_server(self):
        fake = _working_ollama(models=["qwen2.5:7b", "llama3.2:3b"])
        with patch.dict(sys.modules, {"ollama": fake}):
            self.assertEqual(available_models(), ["qwen2.5:7b", "llama3.2:3b"])

    def test_returns_empty_list_when_server_unreachable(self):
        # Fake conftest: list() melempar ConnectionError.
        self.assertEqual(available_models(), [])

    def test_returns_empty_list_when_package_not_installed(self):
        with patch.dict(sys.modules, {"ollama": None}):
            self.assertEqual(available_models(), [])


if __name__ == "__main__":
    unittest.main()
