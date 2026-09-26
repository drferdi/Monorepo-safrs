"""Test _print_header pasien badge behavior for fix-header-empty-pasien-badge.

Verifies:
- _print_header treats empty dict {} same as None (TANPA PASIEN)
- _print_header treats dict without 'nama' same as None (TANPA PASIEN)
- /clear with no active patient shows TANPA PASIEN badge
- /model with no active patient shows TANPA PASIEN badge
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


class HeaderPasienBadgeTests(unittest.TestCase):
    """Tests for _print_header pasien badge correctness."""

    def test_print_header_none_shows_tanpa_pasien(self):
        """_print_header with pasien=None shows TANPA PASIEN badge."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_header(session_id="TEST001", pasien=None)
        output = buf.getvalue()
        self.assertIn("TANPA PASIEN", output)
        self.assertNotIn("PASIEN AKTIF", output)

    def test_print_header_empty_dict_shows_tanpa_pasien(self):
        """_print_header with pasien={} shows TANPA PASIEN badge."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_header(session_id="TEST001", pasien={})
        output = buf.getvalue()
        self.assertIn("TANPA PASIEN", output)
        self.assertNotIn("PASIEN AKTIF", output)

    def test_print_header_dict_without_nama_shows_tanpa_pasien(self):
        """_print_header with pasien={'umur': '30'} (no 'nama') shows TANPA PASIEN."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_header(session_id="TEST001", pasien={"umur": "30"})
        output = buf.getvalue()
        self.assertIn("TANPA PASIEN", output)
        self.assertNotIn("PASIEN AKTIF", output)
        self.assertNotIn("None", output)  # No literal 'None' in output

    def test_print_header_with_nama_shows_pasien_aktif(self):
        """_print_header with pasien={'nama': 'Budi'} shows PASIEN AKTIF badge."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_header(session_id="TEST001", pasien={"nama": "Budi"})
        output = buf.getvalue()
        self.assertIn("PASIEN AKTIF", output)
        self.assertNotIn("TANPA PASIEN", output)
        self.assertIn("Budi", output)

    def test_print_header_with_nama_and_other_keys_shows_pasien_aktif(self):
        """_print_header with pasien={'nama': 'Siti', 'umur': '25'} shows PASIEN AKTIF."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_header(session_id="TEST001", pasien={"nama": "Siti", "umur": "25"})
        output = buf.getvalue()
        self.assertIn("PASIEN AKTIF", output)
        self.assertNotIn("TANPA PASIEN", output)
        self.assertIn("Siti", output)

    def test_clear_with_no_active_patient_shows_tanpa_pasien(self):
        """Using /clear with no active patient (pasien={}) shows TANPA PASIEN."""
        input_sequence = ["", "/clear", "/exit"]
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
        # Both the initial header and the /clear header should show TANPA PASIEN
        self.assertIn("TANPA PASIEN", output)
        self.assertNotIn("PASIEN AKTIF", output)

    def test_model_with_no_active_patient_shows_tanpa_pasien(self):
        """Using /model with no active patient (pasien={}) shows TANPA PASIEN."""
        input_sequence = ["", "/model", "", "/exit"]
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
        # Both the initial header and the /model redraw should show TANPA PASIEN
        self.assertIn("TANPA PASIEN", output)
        self.assertNotIn("PASIEN AKTIF", output)

    def test_next_clears_pasien_and_shows_tanpa_pasien(self):
        """Using /next clears pasien and shows TANPA PASIEN in the new header."""
        input_sequence = ["", "/next", "/exit"]
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
        self.assertIn("TANPA PASIEN", output)


if __name__ == "__main__":
    unittest.main()
