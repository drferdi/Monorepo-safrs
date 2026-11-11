"""Tests for pediatric-dose-appropriate-framing feature (milestone-3).

Validates VAL-SAFETY-012:
- When the patient is a child (age < 18 years), dosing must use age-appropriate
  guidance or include a pediatric-verification requirement.
- Adult dosing must not be applied to children without adjustment/verification.
- The visible output includes a pediatric dosing note or verification prompt.

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


class PediatricDoseFramingTests(unittest.TestCase):
    """Tests for _is_pediatric and _build_pediatric_dose_instruction."""

    def test_infant_is_pediatric(self):
        """Patient age 1 year is pediatric."""
        self.assertTrue(m._is_pediatric({"umur": "1"}))

    def test_child_is_pediatric(self):
        """Patient age 10 years is pediatric."""
        self.assertTrue(m._is_pediatric({"umur": "10"}))

    def test_teenager_is_pediatric(self):
        """Patient age 17 years is pediatric."""
        self.assertTrue(m._is_pediatric({"umur": "17"}))

    def test_adult_is_not_pediatric(self):
        """Patient age 18 years is not pediatric."""
        self.assertFalse(m._is_pediatric({"umur": "18"}))

    def test_elderly_is_not_pediatric(self):
        """Patient age 65 years is not pediatric."""
        self.assertFalse(m._is_pediatric({"umur": "65"}))

    def test_no_age_is_not_pediatric(self):
        """Missing age defaults to not pediatric (handled by other guardrails)."""
        self.assertFalse(m._is_pediatric({"umur": ""}))
        self.assertFalse(m._is_pediatric({}))

    def test_pediatric_instruction_includes_verification(self):
        """Pediatric instruction must include verification requirement."""
        pasien = {"umur": "5", "jk": "L", "bb": "18"}
        instruction = m._build_pediatric_dose_instruction(pasien)
        self.assertIn("pediatri", instruction.lower())
        self.assertIn("verifikasi", instruction.lower())

    def test_pediatric_instruction_with_weight(self):
        """Pediatric instruction with weight present should mention weight-based dosing."""
        pasien = {"umur": "3", "bb": "14"}
        instruction = m._build_pediatric_dose_instruction(pasien)
        self.assertIn("kg", instruction.lower())

    def test_no_instruction_for_adult(self):
        """Adult patient should not get pediatric instruction."""
        pasien = {"umur": "30", "jk": "L"}
        instruction = m._build_pediatric_dose_instruction(pasien)
        self.assertEqual(instruction, "")

    def test_no_instruction_for_empty_age(self):
        """Empty age should not get pediatric instruction."""
        pasien = {"umur": ""}
        instruction = m._build_pediatric_dose_instruction(pasien)
        self.assertEqual(instruction, "")


if __name__ == "__main__":
    unittest.main()
