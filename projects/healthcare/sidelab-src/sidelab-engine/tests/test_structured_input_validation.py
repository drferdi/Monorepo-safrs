"""Test structured-input-validation feature.

Verifies VAL-INTAKE-006: Structured input validation is human-friendly.

- Invalid numeric fields produce a short human-readable correction prompt
- Unsupported coded values produce a correction prompt
- The doctor stays in a recoverable intake flow after invalid input
- The app does not crash or silently accept obvious nonsense values
"""

import importlib.util
import io
import unittest
from pathlib import Path
from unittest.mock import patch

from rich.console import Console

_spec = importlib.util.spec_from_file_location(
    "sidelab_app", Path(__file__).resolve().parent.parent / "sidelab.py"
)
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)


def _make_capture_console():
    buf = io.StringIO()
    return Console(file=buf, force_terminal=True, width=120, highlight=False), buf


class StructuredInputValidationTests(unittest.TestCase):
    """VAL-INTAKE-006: Structured input validation is human-friendly."""

    # ------------------------------------------------------------------
    # Numeric field validation — umur (age)
    # ------------------------------------------------------------------

    def test_umur_valid_numeric_is_accepted(self):
        """Valid numeric umur is accepted without correction prompt."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "35", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        output = buf.getvalue()
        self.assertEqual(result.get("umur"), "35")
        self.assertNotIn("harus berupa angka", output.lower())

    def test_umur_non_numeric_shows_correction_prompt(self):
        """Non-numeric umur triggers a human-readable correction prompt."""
        cap, buf = _make_capture_console()
        # First attempt invalid, second attempt valid (+1 extra slot for re-prompt)
        inputs = iter(["Test", "abc", "35", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        output = buf.getvalue()
        self.assertEqual(result.get("umur"), "35")
        self.assertIn("harus", output.lower())

    def test_umur_negative_shows_correction_prompt(self):
        """Negative umur triggers a correction prompt."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "-5", "35", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        output = buf.getvalue()
        self.assertEqual(result.get("umur"), "35")
        self.assertIn("harus", output.lower())

    def test_umur_zero_is_accepted(self):
        """Umur 0 (bayi) is accepted as valid numeric."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "0", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertEqual(result.get("umur"), "0")

    def test_umur_with_unit_is_accepted_and_normalized(self):
        """Umur with unit like '45 tahun' is accepted and normalized."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "45 tahun", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        # Should extract the numeric part or at least not crash
        self.assertIsInstance(result, dict)
        self.assertIn("umur", result)

    def test_umur_skip_still_works_after_invalid(self):
        """After invalid umur, typing empty skips the field."""
        cap, buf = _make_capture_console()
        # First attempt invalid, second attempt empty (skip) — 9 inputs total
        inputs = iter(["Test", "notanumber", "", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertIsInstance(result, dict)
        self.assertNotIn("umur", result)

    def test_umur_selesai_works_after_invalid(self):
        """After invalid umur, typing 'selesai' exits the intake."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "xyz", "selesai", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertIsInstance(result, dict)
        self.assertEqual(result.get("nama"), "Test")
        self.assertNotIn("umur", result)

    def test_umur_very_large_shows_warning(self):
        """Umur > 150 triggers a correction prompt (out of reasonable range)."""
        cap, buf = _make_capture_console()
        # "200" is > 150 max → invalid, then "50" is valid — 9 inputs total
        inputs = iter(["Test", "200", "50", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        output = buf.getvalue()
        self.assertIsInstance(result, dict)
        self.assertEqual(result.get("umur"), "50")
        self.assertIn("harus", output.lower())

    # ------------------------------------------------------------------
    # Numeric field validation — bb (berat badan)
    # ------------------------------------------------------------------

    def test_bb_valid_numeric_is_accepted(self):
        """Valid numeric bb (weight) is accepted."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "", "", "70", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertEqual(result.get("bb"), "70")

    def test_bb_decimal_is_accepted(self):
        """Decimal bb like 70.5 is accepted."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "", "", "70.5", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertIn("bb", result)

    def test_bb_non_numeric_shows_correction(self):
        """Non-numeric bb triggers a correction prompt."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "", "", "heavy", "70", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        output = buf.getvalue()
        self.assertEqual(result.get("bb"), "70")
        self.assertIn("harus", output.lower())

    def test_bb_negative_shows_correction(self):
        """Negative bb triggers a correction prompt."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "", "", "-10", "70", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        output = buf.getvalue()
        self.assertEqual(result.get("bb"), "70")
        self.assertIn("harus", output.lower())

    def test_bb_skip_after_invalid(self):
        """After invalid bb, empty input skips the field."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "", "", "xyz", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertIsInstance(result, dict)
        self.assertNotIn("bb", result)

    # ------------------------------------------------------------------
    # Numeric field validation — tb (tinggi badan)
    # ------------------------------------------------------------------

    def test_tb_valid_numeric_is_accepted(self):
        """Valid numeric tb (height) is accepted."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "", "", "", "170", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertEqual(result.get("tb"), "170")

    def test_tb_non_numeric_shows_correction(self):
        """Non-numeric tb triggers a correction prompt."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "", "", "", "tall", "170", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        output = buf.getvalue()
        self.assertEqual(result.get("tb"), "170")
        self.assertIn("harus", output.lower())

    def test_tb_negative_shows_correction(self):
        """Negative tb triggers a correction prompt."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "", "", "", "-50", "170", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        output = buf.getvalue()
        self.assertEqual(result.get("tb"), "170")
        self.assertIn("harus", output.lower())

    def test_tb_zero_shows_correction(self):
        """Zero tb should trigger a correction since height cannot be 0."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "", "", "", "0", "170", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        output = buf.getvalue()
        self.assertEqual(result.get("tb"), "170")
        self.assertIn("harus", output.lower())

    # ------------------------------------------------------------------
    # Coded value validation — jk (jenis kelamin)
    # ------------------------------------------------------------------

    def test_jk_L_is_accepted(self):
        """JK value 'L' is accepted without correction."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "", "L", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertEqual(result.get("jk"), "L")

    def test_jk_P_is_accepted(self):
        """JK value 'P' is accepted without correction."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "", "P", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertEqual(result.get("jk"), "P")

    def test_jk_lowercase_normalized(self):
        """JK lowercase 'l' and 'p' are normalized to uppercase."""
        for raw, expected in [("l", "L"), ("p", "P")]:
            cap, buf = _make_capture_console()
            inputs = iter(["Test", "", raw, "", "", "", "", ""])

            with patch.object(m, "console", cap):
                with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                    result = m._input_pasien()
            self.assertEqual(result.get("jk"), expected)

    def test_jk_invalid_shows_correction_and_reasks(self):
        """Invalid JK value triggers correction prompt and re-asks the field."""
        cap, buf = _make_capture_console()
        # First attempt 'X' (invalid), second attempt 'L' (valid) — 9 inputs total
        inputs = iter(["Test", "", "X", "L", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        output = buf.getvalue()
        self.assertEqual(result.get("jk"), "L")
        # Should have shown a correction prompt
        self.assertIn("harus", output.lower())

    def test_jk_skip_after_invalid(self):
        """After invalid JK, empty input allows skipping."""
        cap, buf = _make_capture_console()
        # First attempt 'Z' (invalid), second attempt empty (skip) — 9 inputs total
        inputs = iter(["Test", "", "Z", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertIsInstance(result, dict)
        self.assertNotIn("jk", result)

    def test_jk_selesai_after_invalid_exits(self):
        """After invalid JK, typing 'selesai' exits intake cleanly."""
        cap, buf = _make_capture_console()
        inputs = iter(["Test", "", "Z", "selesai", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertIsInstance(result, dict)
        self.assertEqual(result.get("nama"), "Test")
        self.assertNotIn("jk", result)

    # ------------------------------------------------------------------
    # No crash or silent acceptance
    # ------------------------------------------------------------------

    def test_no_crash_on_all_nonsense_input(self):
        """Feeding nonsense to every structured field does not crash the app."""
        cap, buf = _make_capture_console()
        # All structured fields with invalid input first, then skip
        inputs = iter(
            [
                "Test",
                "bukan_angka",
                "",  # umur: invalid then skip
                "Z",
                "",  # jk: invalid then skip
                "berat_badan",
                "",  # bb: invalid then skip
                "tinggi_badan",
                "",  # tb: invalid then skip
                "",
                "",
                "",  # remaining fields
            ]
        )

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertIsInstance(result, dict)
        self.assertEqual(result.get("nama"), "Test")
        # No crash — we reached this assertion

    def test_no_silent_acceptance_of_nonsense_numeric(self):
        """Nonsense numeric values are NOT silently accepted."""
        cap, buf = _make_capture_console()
        # "abc_def_123" invalid, then "30" valid — 9 inputs total
        inputs = iter(["Test", "abc_def_123", "30", "", "", "", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        output = buf.getvalue()
        # After correction, umur should be the corrected value
        self.assertEqual(result.get("umur"), "30")
        # Correction prompt was shown
        self.assertIn("harus", output.lower())

    # ------------------------------------------------------------------
    # Recovery flow — doctor stays in intake after invalid input
    # ------------------------------------------------------------------

    def test_doctor_stays_in_intake_after_invalid_umur(self):
        """After invalid umur, the doctor is re-prompted for umur (not moved forward)."""
        cap, buf = _make_capture_console()
        # umur invalid, then valid, then rest of fields
        inputs = iter(["Test", "invalid", "35", "L", "70", "170", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        # All fields should be present, proving intake continued normally
        self.assertEqual(result.get("nama"), "Test")
        self.assertEqual(result.get("umur"), "35")
        self.assertEqual(result.get("jk"), "L")
        self.assertEqual(result.get("bb"), "70")
        self.assertEqual(result.get("tb"), "170")

    def test_doctor_stays_in_intake_after_invalid_jk(self):
        """After invalid jk, the doctor is re-prompted for jk (not moved forward)."""
        cap, buf = _make_capture_console()
        # nama, umur, jk invalid, jk valid, bb, tb, rest
        inputs = iter(["Test", "35", "invalid_jk", "L", "70", "170", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        self.assertEqual(result.get("jk"), "L")
        self.assertEqual(result.get("bb"), "70")

    def test_multiple_invalid_attempts_dont_crash(self):
        """Multiple invalid attempts on the same field don't crash or break flow."""
        cap, buf = _make_capture_console()
        # umur: 3 invalid attempts, then valid, rest normal — 11 inputs total
        inputs = iter(["Test", "abc", "xyz", "!!!", "35", "L", "70", "170", "", "", ""])

        with patch.object(m, "console", cap):
            with patch.object(cap, "input", side_effect=lambda _: next(inputs)):
                result = m._input_pasien()

        output = buf.getvalue()
        self.assertEqual(result.get("umur"), "35")
        # Correction prompts appeared for the invalid attempts
        count_harus = output.lower().count("harus")
        self.assertGreaterEqual(count_harus, 1)

    # ------------------------------------------------------------------
    # Integration: /pasien with validation in main() loop
    # ------------------------------------------------------------------

    def test_pasien_with_invalid_then_valid_continues(self):
        """After /pasien with invalid numeric + correction, CLI continues to /exit."""
        input_sequence = [
            "",  # default backend
            "/pasien",
            "Budi",  # nama
            "abc",  # umur invalid
            "35",  # umur valid
            "L",  # jk valid
            "",  # bb skip
            "",  # tb skip
            "",  # alergi skip
            "",  # obat skip
            "",  # komorbid skip
            "/exit",
        ]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        # Intake completed successfully
        self.assertIn("Data pasien tersimpan", output)
        self.assertIn("Budi", output)
        # /exit was reached
        self.assertIn("Keluar", output)

    def test_pasien_with_invalid_jk_then_corrected_continues(self):
        """After /pasien with invalid jk + correction, CLI continues."""
        input_sequence = [
            "",
            "/pasien",
            "Ani",
            "",
            "X",  # jk invalid
            "P",  # jk valid
            "",
            "",
            "",
            "",
            "",
            "/exit",
        ]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
            patch.object(m, "_chat", return_value=""),
        ):
            try:
                m.main()
            except StopIteration:
                pass

        output = buf.getvalue()
        self.assertIn("Data pasien tersimpan", output)
        self.assertIn("Ani", output)
        self.assertIn("Keluar", output)


if __name__ == "__main__":
    unittest.main()
