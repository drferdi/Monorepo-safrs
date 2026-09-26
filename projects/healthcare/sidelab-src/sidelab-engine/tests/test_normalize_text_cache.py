# Architected and built by codieverse+.
import unittest

from sidelab import vocab


class NormalizeTextCacheTests(unittest.TestCase):
    def setUp(self):
        vocab._normalize_text.cache_clear()

    def tearDown(self):
        vocab._normalize_text.cache_clear()

    def test_has_cache_info_attribute(self):
        self.assertTrue(hasattr(vocab._normalize_text, "cache_info"))

    def test_repeated_call_registers_as_cache_hit(self):
        vocab._normalize_text("nafas cepat demam tinggi")
        vocab._normalize_text("nafas cepat demam tinggi")
        self.assertGreaterEqual(vocab._normalize_text.cache_info().hits, 1)

    def test_nafas_normalized_to_napas(self):
        self.assertEqual(vocab._normalize_text("nafas"), "napas")

    def test_tenggorokan_normalized_to_tenggorok(self):
        self.assertIn("tenggorok", vocab._normalize_text("tenggorokan sakit"))

    def test_different_inputs_not_conflated(self):
        a = vocab._normalize_text("demam")
        b = vocab._normalize_text("batuk")
        self.assertNotEqual(a, b)


if __name__ == "__main__":
    unittest.main()
