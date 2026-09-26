# Architected and built by codieverse+.
import unittest

from sidelab.llm.router import build_provider


class RouterTests(unittest.TestCase):
    def test_deepseek_provider_has_deepseek_name(self):
        provider = build_provider("deepseek", api_key="x")
        self.assertEqual(provider.name, "deepseek")

    def test_local_provider_has_local_name(self):
        provider = build_provider("local", api_key=None)
        self.assertEqual(provider.name, "local")


if __name__ == "__main__":
    unittest.main()
