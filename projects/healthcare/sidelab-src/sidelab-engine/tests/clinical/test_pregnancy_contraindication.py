"""Tests for pregnancy-contraindication-warnings feature (milestone-3).

Validates VAL-SAFETY-013:
- When the patient is of reproductive age (female, 12-55 years) and pregnancy status
  is unknown or not documented, pregnancy-related contraindication warnings must appear.
- Pregnancy-unsafe drugs must not be unconditional recommendations.
- The visible output includes a pregnancy verification prompt when status is unknown.

Simulated cases only. No real patient data.
"""

import importlib.util
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "sidelab_app", Path(__file__).resolve().parent.parent.parent / "sidelab.py"
)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


class PregnancyContraindicationTests(unittest.TestCase):
    """Tests for _is_reproductive_age_female and _build_pregnancy_warning."""

    def test_reproductive_age_female_detected(self):
        """Female age 25 is reproductive age."""
        self.assertTrue(m._is_reproductive_age_female({"umur": "25", "jk": "P"}))

    def test_teen_female_detected(self):
        """Female age 15 is reproductive age."""
        self.assertTrue(m._is_reproductive_age_female({"umur": "15", "jk": "P"}))

    def test_male_not_reproductive(self):
        """Male age 25 is not reproductive age female."""
        self.assertFalse(m._is_reproductive_age_female({"umur": "25", "jk": "L"}))

    def test_child_not_reproductive(self):
        """Female age 8 is not reproductive age."""
        self.assertFalse(m._is_reproductive_age_female({"umur": "8", "jk": "P"}))

    def test_elderly_not_reproductive(self):
        """Female age 60 is not reproductive age."""
        self.assertFalse(m._is_reproductive_age_female({"umur": "60", "jk": "P"}))

    def test_pregnancy_known_no_warning(self):
        """Patient with known pregnancy status should not get unknown warning."""
        pasien = {"umur": "25", "jk": "P", "komorbid": "Hamil 20 minggu"}
        warning = m._build_pregnancy_warning(pasien)
        self.assertEqual(warning, "")

    def test_pregnancy_unknown_gets_warning(self):
        """Patient with unknown pregnancy status gets warning."""
        pasien = {"umur": "25", "jk": "P"}
        warning = m._build_pregnancy_warning(pasien)
        self.assertIn("hamil", warning.lower())
        self.assertIn("verifikasi", warning.lower())

    def test_non_reproductive_no_warning(self):
        """Non-reproductive patient gets no warning."""
        pasien = {"umur": "30", "jk": "L"}
        warning = m._build_pregnancy_warning(pasien)
        self.assertEqual(warning, "")

    def test_pregnancy_warning_includes_drug_categories(self):
        """Pregnancy warning should mention FDA pregnancy categories."""
        pasien = {"umur": "30", "jk": "P"}
        warning = m._build_pregnancy_warning(pasien)
        self.assertIn("kategori", warning.lower())

    def test_breastfeeding_mentioned_as_verification(self):
        """Pregnancy warning should also mention breastfeeding verification."""
        pasien = {"umur": "28", "jk": "P"}
        warning = m._build_pregnancy_warning(pasien)
        self.assertIn("menyusui", warning.lower())


if __name__ == "__main__":
    unittest.main()
