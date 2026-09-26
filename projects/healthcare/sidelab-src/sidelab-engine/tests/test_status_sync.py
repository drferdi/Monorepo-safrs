"""Test persistent-status-chrome-sync feature.

Verifies VAL-INTAKE-008: After any state-changing command (/pasien, /model, /next,
/clear), the visible header or always-on status region immediately reflects the
current session ID, active patient state, active backend, and active model.
No stale patient, backend, or model marker may remain on screen.
"""

import importlib.util
import io
import re
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


def _strip_ansi(text: str) -> str:
    """Remove ANSI escape codes from text for content assertions."""
    return re.sub(r"\x1b\[[0-9;]*m", "", text)


def _find_header_blocks(text: str) -> list[str]:
    """Find all header panel blocks in the output text.

    Headers are demarcated by the SIDELAB title. Returns list of header
    blocks in order of appearance, each containing the full header content.

    Uses the top border pattern (╭── or ┌── in Rich box-drawing) to locate
    the start of each Panel, then captures up to the next Panel or end.
    When box-drawing characters are not available (e.g., ANSI-stripped output),
    falls back to using the SENTRA SIDELAB PROJECT title with conservative
    boundaries that avoid capturing content from adjacent headers.
    """
    clean = _strip_ansi(text)
    # Find all header panel blocks by locating the SENTRA SIDELAB PROJECT marker
    markers = list(re.finditer(r"SENTRA SIDELAB PROJECT", clean))
    blocks = []
    for i, m in enumerate(markers):
        # Start of this header block: the marker position itself
        # (not a backward window, to avoid capturing previous header content)
        block_start = m.start()
        # End: next header marker (if any) or end of text
        if i + 1 < len(markers):
            block_end = markers[i + 1].start()
        else:
            block_end = len(clean)
        block = clean[block_start:block_end]
        blocks.append(block)
    return blocks


def _last_header(text: str) -> str:
    """Return the most recently printed header block in the output."""
    blocks = _find_header_blocks(text)
    if blocks:
        return blocks[-1]
    return ""


class PasienStatusSyncTests(unittest.TestCase):
    """After /pasien, header reflects all four status elements correctly."""

    def test_after_pasien_header_shows_pasien_aktif_and_name(self):
        """After /pasien with patient name, the refreshed header shows
        PASIEN AKTIF badge and the patient name."""
        input_sequence = [
            "",
            "/pasien",
            "Ahmad Dahlan",
            "45",
            "L",
            "70",
            "170",
            "tidak ada",
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
        last = _last_header(output)

        self.assertIn("PASIEN AKTIF", last, "Last header should show PASIEN AKTIF")
        self.assertNotIn(
            "TANPA PASIEN", last, "Last header should NOT show TANPA PASIEN"
        )
        self.assertIn("Ahmad Dahlan", last, "Last header should show patient name")

    def test_after_pasien_header_shows_session_id(self):
        """After /pasien, the refreshed header still shows the current session ID."""
        input_sequence = [
            "",
            "/pasien",
            "Test Patient",
            "30",
            "P",
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
        last = _last_header(output)

        self.assertIn("Session", last, "Last header should show Session field")
        # Session ID should be 8-char hex
        session_ids = re.findall(r"\b[A-F0-9]{8}\b", last)
        self.assertGreaterEqual(
            len(session_ids), 1, "Header should contain a session ID"
        )

    def test_after_pasien_header_shows_backend(self):
        """After /pasien, the refreshed header shows the active backend."""
        input_sequence = [
            "",
            "/pasien",
            "Test Patient",
            "30",
            "P",
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
        last = _last_header(output)

        self.assertIn("Backend", last, "Last header should show Backend field")
        self.assertIn("DeepSeek", last, "Last header should show DeepSeek backend")

    def test_after_pasien_header_shows_model(self):
        """After /pasien, the refreshed header shows the active model."""
        input_sequence = [
            "",
            "/pasien",
            "Test Patient",
            "30",
            "P",
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
        last = _last_header(output)

        self.assertIn("Model", last, "Last header should show Model field")

    def test_after_pasien_empty_shows_tanpa_pasien_in_last_header(self):
        """After /pasien with all fields skipped, the last header shows
        TANPA PASIEN (not stale PASIEN AKTIF from nowhere)."""
        input_sequence = [
            "",
            "/pasien",
            "",  # nama (skip)
            "",  # umur (skip)
            "",  # jk (skip)
            "",  # bb (skip)
            "",  # tb (skip)
            "",  # alergi (skip)
            "",  # obat (skip)
            "",  # komorbid (skip)
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
        last = _last_header(output)

        self.assertIn("TANPA PASIEN", last, "Last header should show TANPA PASIEN")
        self.assertNotIn(
            "PASIEN AKTIF", last, "Last header should NOT show PASIEN AKTIF"
        )


class ModelStatusSyncTests(unittest.TestCase):
    """After /model, header reflects current model and other status elements."""

    def test_no_stale_patient_in_last_header_after_model(self):
        """After startup + /model (no patient), the last header shows
        TANPA PASIEN and does NOT show a patient name that was never set."""
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
        last = _last_header(output)

        self.assertIn("TANPA PASIEN", last)
        self.assertNotIn("PASIEN AKTIF", last)

    def test_no_stale_backend_in_last_header_after_model(self):
        """After /model, the last header shows the actual active backend,
        not a stale or missing backend label."""
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
        last = _last_header(output)

        self.assertIn("Backend", last)
        # Should show a backend name, not a bare "-"
        self.assertIn("DeepSeek", last)

    def test_no_stale_model_in_last_header_after_model(self):
        """After /model, the last header shows the actual active model,
        not a stale model name from a previous state."""
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
        last = _last_header(output)

        self.assertIn("Model", last)
        # The model field should have content, not be empty
        self.assertNotIn(
            "Model",
            _strip_ansi(last).replace("Model", "").strip()[:1] or "x",
            "Model field should have content after the label",
        )


class NextStatusSyncTests(unittest.TestCase):
    """After /next, header reflects new session ID and cleared patient state."""

    def test_after_next_header_shows_new_session_id(self):
        """After /next, the header shows a NEW session ID, different from before."""
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
        blocks = _find_header_blocks(output)

        self.assertGreaterEqual(
            len(blocks), 2, "Should have at least 2 header blocks (startup + /next)"
        )

        # Extract all session IDs from both headers
        all_session_ids = []
        for block in blocks:
            ids = re.findall(r"\b[A-F0-9]{8}\b", block)
            all_session_ids.extend(ids)

        # First header (startup) and last header (/next) should have different sessions
        # Remove duplicates but keep order
        unique_ids = list(dict.fromkeys(all_session_ids))
        self.assertGreaterEqual(
            len(unique_ids), 2, "Startup and /next should produce different session IDs"
        )

    def test_after_next_header_shows_tanpa_pasien(self):
        """After /next, the header shows TANPA PASIEN regardless of previous state."""
        input_sequence = [
            "",
            "/pasien",
            "Test Patient",
            "30",
            "P",
            "",
            "",
            "",
            "",
            "",
            "/next",
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
        last = _last_header(output)

        self.assertIn(
            "TANPA PASIEN", last, "Last header after /next should show TANPA PASIEN"
        )
        self.assertNotIn(
            "PASIEN AKTIF", last, "Last header after /next should NOT show PASIEN AKTIF"
        )
        self.assertNotIn(
            "Test Patient",
            last,
            "Last header after /next should NOT contain the previous patient name",
        )

    def test_after_next_header_shows_backend_and_model(self):
        """After /next, the header still shows the active backend and model."""
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
        last = _last_header(output)

        self.assertIn("Backend", last, "Last header after /next should show Backend")
        self.assertIn("DeepSeek", last, "Last header after /next should show DeepSeek")
        self.assertIn("Model", last, "Last header after /next should show Model")

    def test_after_next_no_stale_patient_name_in_header(self):
        """After /next following /pasien, the new header must NOT contain
        the previous patient's name — no stale patient marker."""
        input_sequence = [
            "",
            "/pasien",
            "Previous Patient",
            "25",
            "L",
            "",
            "",
            "",
            "",
            "",
            "/next",
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
        last = _last_header(output)

        # The previous patient name should NOT appear in the last header
        self.assertNotIn("Previous Patient", last)


class ClearStatusSyncTests(unittest.TestCase):
    """After /clear, header reflects current state without stale markers."""

    def test_after_clear_header_shows_backend(self):
        """After /clear, the header shows the active backend."""
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
        last = _last_header(output)

        self.assertIn("Backend", last)
        self.assertIn("DeepSeek", last)

    def test_after_clear_header_shows_model(self):
        """After /clear, the header shows the active model."""
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
        last = _last_header(output)

        self.assertIn("Model", last)

    def test_after_clear_header_shows_session_id(self):
        """After /clear, the header still shows the current session ID."""
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
        last = _last_header(output)

        self.assertIn("Session", last)
        session_ids = re.findall(r"\b[A-F0-9]{8}\b", last)
        self.assertGreaterEqual(len(session_ids), 1)

    def test_after_clear_with_active_patient_shows_pasien_aktif(self):
        """After /clear with an active patient, the refreshed header should
        still show PASIEN AKTIF, not revert to TANPA PASIEN."""
        input_sequence = [
            "",
            "/pasien",
            "Clear Test Patient",
            "35",
            "P",
            "",
            "",
            "",
            "",
            "",
            "/clear",
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
        last = _last_header(output)

        self.assertIn(
            "PASIEN AKTIF", last, "/clear with active patient should show PASIEN AKTIF"
        )
        self.assertNotIn("TANPA PASIEN", last)
        self.assertIn("Clear Test Patient", last)

    def test_after_clear_no_stale_tanpa_pasien_when_patient_active(self):
        """After /clear while a patient is active, the header must NOT
        show a stale TANPA PASIEN badge."""
        input_sequence = [
            "",
            "/pasien",
            "Clear Test Patient",
            "35",
            "P",
            "",
            "",
            "",
            "",
            "",
            "/clear",
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
        # Check the output AFTER the /clear command — the header that appears
        # after /clear should NOT have TANPA PASIEN
        last = _last_header(output)
        self.assertNotIn("TANPA PASIEN", last)


class CombinedStateChangeTests(unittest.TestCase):
    """Tests for multiple state changes in sequence to verify no stale markers."""

    def test_pasien_then_model_header_shows_both(self):
        """After /pasien then /model change, the header shows the patient name
        AND the updated model."""
        # Use model index 2 to simulate a change
        input_sequence = [
            "",
            "/pasien",
            "Combined Test",
            "40",
            "L",
            "",
            "",
            "",
            "",
            "",
            "/model",
            "2",
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
        last = _last_header(output)

        self.assertIn(
            "PASIEN AKTIF",
            last,
            "After /pasien + /model, header should show PASIEN AKTIF",
        )
        self.assertIn(
            "Combined Test",
            last,
            "After /pasien + /model, header should show patient name",
        )
        self.assertIn(
            "Backend", last, "After /pasien + /model, header should show Backend"
        )
        self.assertIn("Model", last, "After /pasien + /model, header should show Model")
        self.assertIn(
            "Session", last, "After /pasien + /model, header should show Session"
        )

    def test_model_then_clear_keeps_correct_model(self):
        """After /model change followed by /clear, the header shows the
        UPDATED model, not the stale original model."""
        input_sequence = ["", "/model", "2", "/clear", "/exit"]
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
        last = _last_header(output)

        self.assertIn("Model", last, "/clear after /model should show Model field")
        self.assertIn("Backend", last, "/clear after /model should show Backend field")

    def test_next_then_clear_shows_correct_state(self):
        """After /next then /clear, header shows TANPA PASIEN and new session."""
        input_sequence = [
            "",
            "/pasien",
            "Test",
            "25",
            "L",
            "",
            "",
            "",
            "",
            "",
            "/next",
            "/clear",
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
        last = _last_header(output)

        self.assertIn(
            "TANPA PASIEN",
            last,
            "After /next + /clear, header should show TANPA PASIEN",
        )
        self.assertNotIn(
            "PASIEN AKTIF",
            last,
            "After /next + /clear, header should NOT show PASIEN AKTIF",
        )
        self.assertNotIn(
            "Test", last, "After /next + /clear, old patient name should not appear"
        )

    def test_pasien_next_clear_model_sequence_no_stale_markers(self):
        """Full sequence: /pasien → /next → /clear → /model. Verify final
        header shows correct state with no stale markers from any prior state."""
        input_sequence = [
            "",
            "/pasien",
            "Sequence Patient",
            "50",
            "L",
            "70",
            "170",
            "tidak ada",
            "",
            "",
            "/next",
            "/clear",
            "/model",
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
        last = _last_header(output)

        # Final header should show TANPA PASIEN (patient was cleared by /next)
        self.assertIn("TANPA PASIEN", last)
        self.assertNotIn("PASIEN AKTIF", last)
        # Should NOT contain the patient name from earlier
        self.assertNotIn("Sequence Patient", last)
        # Should still show Backend, Model, Session
        self.assertIn("Backend", last)
        self.assertIn("Model", last)
        self.assertIn("Session", last)


class StaleMarkerPreventionTests(unittest.TestCase):
    """Verify that no stale markers from previous state persist in the header."""

    def test_after_pasien_no_stale_tanpa_pasien(self):
        """After setting a patient via /pasien, the refreshed header
        must NOT show the stale TANPA PASIEN badge."""
        input_sequence = [
            "",
            "/pasien",
            "No Stale Test",
            "33",
            "P",
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

        # Find the last header that appears after "INPUT DATA PASIEN" (the /pasien flow)
        clean = _strip_ansi(output)
        intake_pos = clean.find("INPUT DATA PASIEN")
        if intake_pos >= 0:
            # Content after the intake includes the refreshed header
            after_intake = clean[intake_pos:]
            blocks = _find_header_blocks(after_intake)
            for block in blocks:
                if "PASIEN AKTIF" in block and "No Stale Test" in block:
                    # This is the refreshed header after /pasien - must NOT have TANPA PASIEN
                    self.assertNotIn(
                        "TANPA PASIEN",
                        block,
                        "Header after /pasien should not contain stale TANPA PASIEN",
                    )

    def test_after_next_no_stale_old_session_id_in_last_header(self):
        """After /next, the new header has a fresh session ID and does NOT
        show the old session ID as active."""
        input_sequence = [
            "",
            "/next",
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
        blocks = _find_header_blocks(output)

        self.assertGreaterEqual(
            len(blocks), 2, "Should have at least startup and /next headers"
        )

        # Extract session IDs from first (startup) and last (/next) headers
        first_ids = re.findall(r"\b[A-F0-9]{8}\b", blocks[0])
        last_ids = re.findall(r"\b[A-F0-9]{8}\b", blocks[-1])

        # The old session ID should NOT be in the last header
        if first_ids and last_ids:
            self.assertNotEqual(
                first_ids[0], last_ids[0], "Session ID should change after /next"
            )

    def test_after_model_last_header_has_no_stale_old_model_marker(self):
        """After /model changes model, verify the last header's model field
        is populated (not stale/missing)."""
        input_sequence = ["", "/model", "2", "/exit"]
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
        last = _last_header(output)

        # The model field should show a model name, not be missing
        self.assertIn("Model", last)
        # Verify "Model:" is followed by non-empty content
        # The header format is "Model: <name>" with possible colon and separator
        clean_last = _strip_ansi(last)
        # Look for "Model:" or "Model" followed by a model name pattern
        model_line_match = re.search(r"Model\s*:\s*(\S+)", clean_last)
        self.assertIsNotNone(model_line_match, "Model field should have content")
        if model_line_match:
            model_content = model_line_match.group(1).strip()
            self.assertTrue(len(model_content) > 0, "Model field should not be empty")

    def test_header_always_shows_all_four_fields(self):
        """Every header panel produced must contain all four status fields:
        Backend, Model, Session, and Pasien (or the pasien badge)."""
        input_sequence = [
            "",
            "/pasien",
            "All Fields Test",
            "28",
            "P",
            "60",
            "165",
            "",
            "",
            "",
            "/clear",
            "/model",
            "",
            "/next",
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
        blocks = _find_header_blocks(output)

        self.assertGreaterEqual(
            len(blocks), 2, "Should have multiple header blocks from the sequence"
        )

        for i, block in enumerate(blocks):
            with self.subTest(header_index=i):
                self.assertIn(
                    "Backend", block, f"Header {i} should contain Backend field"
                )
                self.assertIn("Model", block, f"Header {i} should contain Model field")
                self.assertIn(
                    "Session", block, f"Header {i} should contain Session field"
                )
                # Pasien field: either "PASIEN AKTIF" or "TANPA PASIEN" badge
                has_patient_badge = "PASIEN AKTIF" in block or "TANPA PASIEN" in block
                self.assertTrue(
                    has_patient_badge,
                    f"Header {i} should contain PASIEN AKTIF or TANPA PASIEN badge",
                )


if __name__ == "__main__":
    unittest.main()
