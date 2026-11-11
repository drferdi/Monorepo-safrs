# Architected and built by codieverse+.
import os
import unittest
from unittest.mock import patch

from sidelab.llm.config import render_mode_menu, resolve_backend_choice


class BackendSelectionTests(unittest.TestCase):
    def test_blank_input_defaults_to_deepseek_when_env_unset(self):
        with patch.dict(os.environ, {"SIDELAB_DEFAULT_BACKEND": ""}, clear=False):
            self.assertEqual(resolve_backend_choice(""), "deepseek")

    def test_local_choice_is_accepted(self):
        self.assertEqual(resolve_backend_choice("2"), "local")

    def test_menu_mentions_both_modes(self):
        menu = render_mode_menu()
        self.assertIn("DeepSeek", menu)
        self.assertIn("Local", menu)

    def test_new_cloud_backends_recognized(self):
        for backend in (
            "kimi",
            "qwen",
            "zhipu",
            "yi",
            "baichuan",
            "ernie",
            "spark",
            "gemini",
        ):
            with self.subTest(backend=backend):
                self.assertEqual(resolve_backend_choice(backend), backend)

    def test_aliases_resolve_correctly(self):
        self.assertEqual(resolve_backend_choice("moonshot"), "kimi")
        self.assertEqual(resolve_backend_choice("nim"), "nvidia")
        self.assertEqual(resolve_backend_choice("ollama"), "local")
        self.assertEqual(resolve_backend_choice("google"), "gemini")
        self.assertEqual(resolve_backend_choice("qianfan"), "ernie")
        self.assertEqual(resolve_backend_choice("iflytek"), "spark")

    def test_menu_lists_all_providers(self):
        menu = render_mode_menu()
        for label in (
            "Kimi",
            "Qwen",
            "Zhipu",
            "Yi",
            "Baichuan",
            "ERNIE",
            "Spark",
            "Gemini",
        ):
            with self.subTest(label=label):
                self.assertIn(label, menu)


if __name__ == "__main__":
    unittest.main()
