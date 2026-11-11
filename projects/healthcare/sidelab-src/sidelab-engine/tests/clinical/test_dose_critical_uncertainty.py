"""Tests for dose-critical-uncertainty-provisional feature (milestone-3).

Validates VAL-SAFETY-011:
- When dose-critical data (weight, age, renal function, pregnancy status) is missing,
  the visible dosing output is provisional/non-specific rather than precise ready-to-prescribe.
- The system marks dosing as provisional and asks for missing data instead of giving exact doses.

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


class DoseCriticalUncertaintyTests(unittest.TestCase):
    """Tests for _check_dose_critical_data and provisional dosing behavior."""

    def test_weight_missing_makes_dose_provisional(self):
        """Patient without weight: pediatric dosing must be provisional."""
        pasien = {"umur": "5", "jk": "L"}  # no bb
        result = m._check_dose_critical_data(pasien)
        self.assertTrue(result.get("is_provisional", False))
        self.assertIn("bb", result.get("missing_fields", []))

    def test_weight_present_dose_ok(self):
        """Patient with weight: dosing can be specific."""
        pasien = {"umur": "5", "jk": "L", "bb": "18"}
        result = m._check_dose_critical_data(pasien)
        self.assertFalse(result.get("is_provisional", False))
        self.assertNotIn("bb", result.get("missing_fields", []))

    def test_renal_missing_makes_dose_provisional(self):
        """Patient with renal risk but no renal data: dosing must be provisional."""
        pasien = {"umur": "65", "komorbid": "Gagal ginjal kronik"}
        result = m._check_dose_critical_data(pasien)
        self.assertTrue(result.get("is_provisional", False))
        self.assertIn("renal", result.get("missing_fields", []))

    def test_pregnancy_unknown_makes_dose_provisional(self):
        """Reproductive-age patient with unknown pregnancy: dosing must be provisional."""
        pasien = {"umur": "25", "jk": "P"}  # no pregnancy status
        result = m._check_dose_critical_data(pasien)
        self.assertTrue(result.get("is_provisional", False))
        self.assertIn("pregnancy", result.get("missing_fields", []))

    def test_no_patient_data_is_provisional(self):
        """No patient data at all: dosing is always provisional."""
        result = m._check_dose_critical_data(None)
        self.assertTrue(result.get("is_provisional", False))

    def test_provisional_instruction_in_prompt(self):
        """Provisional dosing instruction must appear in system prompt when data missing."""
        pasien = {"umur": "3", "jk": "L"}  # no bb
        instruction = m._build_provisional_dose_instruction(pasien)
        self.assertIn("provisional", instruction.lower())
        self.assertIn("bb", instruction.lower())

    def test_no_provisional_when_data_complete(self):
        """When all critical data present, no provisional instruction needed."""
        pasien = {"umur": "10", "jk": "L", "bb": "30", "komorbid": "Tidak ada"}
        instruction = m._build_provisional_dose_instruction(pasien)
        self.assertEqual(instruction, "")


if __name__ == "__main__":
    unittest.main()
