# Architected and built by codieverse+.
import unittest

from sidelab.llm.config import render_mode_menu


class TerminalModePromptTests(unittest.TestCase):
    def test_menu_mentions_deepseek_and_local(self):
        text = render_mode_menu()
        self.assertIn("DeepSeek", text)
        self.assertIn("Local", text)


if __name__ == "__main__":
    unittest.main()
