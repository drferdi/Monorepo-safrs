"""Tests for red-flag-insufficient-data-safe-interaction feature (milestone-3).

Validates VAL-CROSS-009:
- When a complaint triggers both red-flag AND insufficient-data conditions,
  red-flag warning must appear FIRST, diagnostic frame must focus on emergency,
  and data gaps must be noted separately.
- Insufficient-data does NOT suppress red-flag urgency.
- The system prioritizes emergency safety over completeness of data.

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


class RedFlagInsufficientDataInteractionTests(unittest.TestCase):
    """Tests for safe interaction between red-flag and insufficient-data states."""

    def test_red_flag_first_when_both_present(self):
        """Vague stroke complaint: red flag detected + insufficient data.
        Red flag must take precedence over insufficient-data state."""
        kasus = {"keluhan": "lumpuh", "durasi": "", "gejala": "", "vital": ""}
        pasien = {}

        # Red flag should be detected
        alerts = m._detect_red_flags(kasus["keluhan"])
        self.assertTrue(len(alerts) > 0, "Red flag should be detected for 'lumpuh'")

        # Insufficient data should also be detected
        insufficient = m._check_insufficient_data_state(kasus, pasien)
        self.assertTrue(
            insufficient.get("is_insufficient", False),
            "Insufficient data should be detected for vague complaint",
        )

        # The combined result should prioritize red flag
        combined = m._evaluate_red_flag_and_insufficient_data(kasus, pasien)
        self.assertTrue(combined.get("has_red_flag", False))
        self.assertTrue(combined.get("is_insufficient", False))
        self.assertEqual(combined.get("priority"), "red_flag")
        self.assertIn("red flag", combined.get("message", "").lower())

    def test_insufficient_data_alone_no_red_flag(self):
        """Pure vague complaint without red flag: only insufficient data."""
        kasus = {"keluhan": "saya tidak enak badan", "durasi": "", "gejala": ""}
        pasien = {}

        alerts = m._detect_red_flags(kasus["keluhan"])
        self.assertEqual(len(alerts), 0)

        combined = m._evaluate_red_flag_and_insufficient_data(kasus, pasien)
        self.assertFalse(combined.get("has_red_flag", False))
        self.assertTrue(combined.get("is_insufficient", False))
        self.assertEqual(combined.get("priority"), "insufficient_data")

    def test_red_flag_alone_no_insufficient(self):
        """Clear stroke complaint with sufficient data: only red flag."""
        kasus = {
            "keluhan": "lumpuh separuh tubuh dan tidak bisa bicara",
            "durasi": "2 jam",
            "gejala": "wajah perot, mulut mencong",
            "vital": "TD 160/90, Nadi 88, RR 20, Suhu 36.8",
        }
        pasien = {"umur": "65", "jk": "L"}

        alerts = m._detect_red_flags(kasus["keluhan"])
        self.assertTrue(len(alerts) > 0)

        combined = m._evaluate_red_flag_and_insufficient_data(kasus, pasien)
        self.assertTrue(combined.get("has_red_flag", False))
        self.assertFalse(combined.get("is_insufficient", False))
        self.assertEqual(combined.get("priority"), "red_flag")

    def test_neither_red_flag_nor_insufficient(self):
        """Routine complaint with sufficient data: neither state."""
        kasus = {
            "keluhan": "demam dan batuk sejak 3 hari",
            "durasi": "3 hari",
            "gejala": "pilek, sakit tenggorokan",
            "vital": "TD 120/80, Nadi 80, RR 18, Suhu 38.2",
        }
        pasien = {"umur": "30", "jk": "L"}

        combined = m._evaluate_red_flag_and_insufficient_data(kasus, pasien)
        self.assertFalse(combined.get("has_red_flag", False))
        self.assertFalse(combined.get("is_insufficient", False))
        self.assertEqual(combined.get("priority"), "none")

    def test_message_includes_both_when_red_flag_priority(self):
        """When both present with red-flag priority, message mentions both."""
        kasus = {"keluhan": "lumpuh", "durasi": ""}
        pasien = {}

        combined = m._evaluate_red_flag_and_insufficient_data(kasus, pasien)
        message = combined.get("message", "").lower()
        self.assertIn("red flag", message)
        self.assertIn("data", message)
        # Red flag should be mentioned before/above data gaps
        red_flag_pos = message.find("red flag")
        data_gap_pos = message.find("data")
        self.assertLess(red_flag_pos, data_gap_pos)

    def test_prompt_addition_prioritizes_emergency(self):
        """The prompt addition for LLM should prioritize emergency framing."""
        kasus = {"keluhan": "lumpuh", "durasi": ""}
        pasien = {}

        combined = m._evaluate_red_flag_and_insufficient_data(kasus, pasien)
        prompt_addition = combined.get("prompt_addition", "").lower()
        self.assertIn("emergency", prompt_addition)
        self.assertIn("red flag", prompt_addition)
        # Emergency should be mentioned prominently (before or near data-gap language)
        # The key point is both are present and emergency is the clear priority
        emergency_pos = prompt_addition.find("emergency")
        data_gap_pos = prompt_addition.find("data gaps")
        if data_gap_pos == -1:
            data_gap_pos = prompt_addition.find("data")
        # Accept if emergency is mentioned before data, or if data-gap is not present
        self.assertTrue(
            emergency_pos < data_gap_pos or data_gap_pos == -1,
            f"Emergency should come before data-gap language in: {prompt_addition}",
        )


if __name__ == "__main__":
    unittest.main()
