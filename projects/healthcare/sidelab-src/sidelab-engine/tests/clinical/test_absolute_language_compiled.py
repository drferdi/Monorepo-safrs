# Architected and built by codieverse+.
import unittest

from sidelab.safety import provisional


class AbsoluteLanguageCompiledTests(unittest.TestCase):
    def test_compiled_patterns_exist_at_module_level(self):
        self.assertTrue(hasattr(provisional, "_ABSOLUTE_PATTERNS_COMPILED"))

    def test_compiled_patterns_count_matches_raw(self):
        self.assertEqual(len(provisional._ABSOLUTE_PATTERNS_COMPILED), 12)

    def test_detects_diagnosis_pasti(self):
        matches = provisional._detect_absolute_language(
            "diagnosis pasti pasien mengidap diabetes"
        )
        self.assertTrue(any("pasti" in m["text"] for m in matches))

    def test_detects_definitif(self):
        matches = provisional._detect_absolute_language(
            "hasil ini definitif menunjukkan infeksi"
        )
        self.assertTrue(len(matches) > 0)

    def test_detects_telah_terbukti(self):
        matches = provisional._detect_absolute_language(
            "telah terbukti pasien menderita TB paru"
        )
        self.assertTrue(len(matches) > 0)

    def test_detects_tidak_diragukan_lagi(self):
        matches = provisional._detect_absolute_language(
            "tidak diragukan lagi kondisi ini serius"
        )
        self.assertTrue(len(matches) > 0)

    def test_no_match_on_provisional_text(self):
        text = "kemungkinan diagnosis hipertensi primer, perlu konfirmasi lebih lanjut"
        self.assertEqual(provisional._detect_absolute_language(text), [])

    def test_empty_string_returns_empty(self):
        self.assertEqual(provisional._detect_absolute_language(""), [])

    def test_match_has_required_keys(self):
        matches = provisional._detect_absolute_language("diagnosis pasti diabetes")
        self.assertTrue(len(matches) > 0)
        for m in matches:
            self.assertIn("text", m)
            self.assertIn("start", m)
            self.assertIn("end", m)
            self.assertIn("label", m)


if __name__ == "__main__":
    unittest.main()
