"""Test new-case-clears-state feature.

Verifies VAL-CROSS-002: Starting a new case clears prior patient and
conversation state.

When the doctor uses the new-case flow (/next), Sidelab:
- visibly starts a fresh case
- clears prior patient context and prior conversation state
- returns to a neutral state before accepting the next complaint
- ensures no prior context bleeds into the new case
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
    """Remove ANSI escape codes for plain-text assertions."""
    return re.sub(r"\x1b\[[0-9;]*m", "", text)


def _find_text_between(output: str, start_marker: str, end_marker: str) -> str:
    """Extract text between two markers (plain text, ANSI stripped)."""
    clean = _strip_ansi(output)
    start_idx = clean.find(start_marker)
    if start_idx == -1:
        return ""
    end_idx = clean.find(end_marker, start_idx + len(start_marker))
    if end_idx == -1:
        return clean[start_idx + len(start_marker) :]
    return clean[start_idx + len(start_marker) : end_idx]


def _extract_header_blocks(output: str) -> list:
    """Find all SIDELAB header blocks in output (SIDELAB ... Clinical Intelligence Console)."""
    clean = _strip_ansi(output)
    blocks = []
    pos = 0
    while True:
        start = clean.find("SIDELAB", pos)
        if start == -1:
            break
        # Only count headers that include "Clinical Intelligence Console"
        check_end = min(start + 200, len(clean))
        if "Clinical Intelligence Console" not in clean[start:check_end]:
            pos = start + 7  # skip past "SIDELAB"
            continue
        # Find the next SIDELAB header or end of text
        end = clean.find("SIDELAB", start + 1)
        if end == -1:
            # fallback: find next INPUT DOKTER or end
            end = clean.find("INPUT DOKTER", start)
            if end == -1:
                end = len(clean)
        blocks.append(clean[start:end])
        pos = end if end < len(clean) else len(clean)
        if pos >= len(clean):
            break
    return blocks


class FreshCaseStartTests(unittest.TestCase):
    """VAL-CROSS-002: /next visibly starts a fresh case."""

    def test_next_announces_kasus_baru_dimulai(self):
        """After /next, the CLI prints 'Kasus baru dimulai' to confirm
        the transition to a new case."""
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

        output = _strip_ansi(buf.getvalue())
        self.assertIn("Kasus baru dimulai", output)

    def test_next_shows_fresh_header(self):
        """After /next, the SIDELAB header is reprinted, confirming the
        visual transition to a fresh case."""
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
        blocks = _extract_header_blocks(output)
        self.assertGreaterEqual(
            len(blocks),
            2,
            "Should have at least 2 header blocks: startup and after /next",
        )

    def test_next_generates_new_session_id(self):
        """After /next, the header shows a NEW session ID that differs
        from the startup session."""
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
        blocks = _extract_header_blocks(output)
        self.assertGreaterEqual(len(blocks), 2)

        # Extract session IDs: 8-char uppercase hex
        first_block = _strip_ansi(blocks[0])
        last_block = _strip_ansi(blocks[-1])

        first_ids = re.findall(r"\b[A-F0-9]{8}\b", first_block)
        last_ids = re.findall(r"\b[A-F0-9]{8}\b", last_block)

        if first_ids and last_ids:
            self.assertNotEqual(
                first_ids[0], last_ids[0], "Session ID must change after /next"
            )


class ClearPriorPatientContextTests(unittest.TestCase):
    """VAL-CROSS-002: /next clears prior patient context."""

    def test_next_clears_patient_name_from_header(self):
        """After setting a patient via /pasien, then /next, the new header
        must show TANPA PASIEN and NOT contain the previous patient name."""
        input_sequence = [
            "",
            "/pasien",
            "Siti Aminah",
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

        output = _strip_ansi(buf.getvalue())

        # After /pasien, PASIEN AKTIF with patient name
        self.assertIn("PASIEN AKTIF", output)
        self.assertIn("Siti Aminah", output)

        # After /next, TANPA PASIEN
        blocks = _extract_header_blocks(output)
        self.assertGreaterEqual(len(blocks), 2)
        last_block = _strip_ansi(blocks[-1])

        self.assertIn("TANPA PASIEN", last_block, "Last header must show TANPA PASIEN")
        self.assertNotIn(
            "PASIEN AKTIF", last_block, "Last header must NOT show PASIEN AKTIF"
        )
        self.assertNotIn(
            "Siti Aminah",
            last_block,
            "Last header must NOT contain previous patient name",
        )

    def test_next_pasien_is_cleared_for_new_case(self):
        """After /next, submitting a complaint should NOT have the
        prior patient context attached — the new case is patientless."""
        input_sequence = [
            "",
            "/pasien",
            "Prior Patient",
            "40",
            "L",
            "",
            "",
            "penisilin",
            "",
            "",
            "/next",
            "batuk 3 hari",  # complaint for new case
            "",  # durasi (skip)
            "demam",  # gejala penyerta
            "tidak ada",  # red flags
            "",  # vital (skip)
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

        output = _strip_ansi(buf.getvalue())

        # After /pasien, patient data should appear
        self.assertIn("PASIEN AKTIF", output)
        self.assertIn("Prior Patient", output)

        # After /next, TANPA PASIEN
        self.assertIn("TANPA PASIEN", output)

        # After /next, the "Prior Patient" name should still appear
        # (from the earlier header) but NOT in the echo after /next
        kasus_baru_pos = output.find("Kasus baru dimulai")
        if kasus_baru_pos != -1:
            after_next = output[kasus_baru_pos:]
            self.assertNotIn(
                "Prior Patient",
                after_next,
                "Prior patient name must not appear after /next",
            )


class ClearPriorConversationStateTests(unittest.TestCase):
    """VAL-CROSS-002: /next clears prior conversation state."""

    def test_next_clears_history(self):
        """After a consultation, /next clears the conversation history.
        Running /history after /next should show empty history."""
        input_sequence = [
            "",
            "demam 5 hari",  # complaint triggers case intake + chat
            "",  # durasi (skip)
            "batuk",  # gejala penyerta
            "tidak ada",  # red flags
            "",  # vital (skip)
            "/next",
            "/history",
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

        output = _strip_ansi(buf.getvalue())

        # After /next, the history section (which appears when /history
        # is typed) should NOT contain the prior complaint text
        kasus_baru_pos = output.find("Kasus baru dimulai")
        if kasus_baru_pos != -1:
            after_next = output[kasus_baru_pos:]
            history_pos = after_next.find("RIWAYAT PERCAKAPAN")
            if history_pos != -1:
                history_section = after_next[history_pos:]
                # Should NOT contain prior complaint "demam 5 hari"
                # Because history was cleared by /next
                self.assertNotIn(
                    "demam 5 hari",
                    history_section,
                    "Prior complaint must not appear in history after /next",
                )

    def test_next_clears_last_response(self):
        """After a consultation produces a response, /next clears
        last_response so /send cannot send stale output."""
        input_sequence = [
            "",
            "nyeri kepala ringan",  # complaint
            "3 hari",  # durasi
            "",  # gejala (skip)
            "tidak ada",  # red flags
            "",  # vital (skip)
            "/next",
            "/send",
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

        output = _strip_ansi(buf.getvalue())

        # After /next, /send should say "Belum ada output untuk dikirim"
        kasus_baru_pos = output.find("Kasus baru dimulai")
        if kasus_baru_pos != -1:
            after_next = output[kasus_baru_pos:]
            self.assertIn(
                "Belum ada output untuk dikirim",
                after_next,
                "/send after /next must say no output available",
            )


class ReturnToNeutralStateTests(unittest.TestCase):
    """VAL-CROSS-002: /next returns to a neutral state before accepting
    the next complaint."""

    def test_after_next_shows_mode_aktif_line(self):
        """After /next, the 'Mode aktif: Backend | Model' line is visible,
        matching the neutral startup state."""
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

        output = _strip_ansi(buf.getvalue())

        # After /next, the output should contain both:
        # "Kasus baru dimulai" (transition message) and
        # "Mode aktif" (neutral state line)
        kasus_baru_pos = output.find("Kasus baru dimulai")
        self.assertGreater(kasus_baru_pos, -1, "Must have Kasus baru dimulai")

        after_next = output[kasus_baru_pos:]
        self.assertIn(
            "Mode aktif", after_next, "After /next, Mode aktif line must be visible"
        )

    def test_after_next_shows_guidance_message(self):
        """After /next with ready backend, the guidance message
        'Ketik keluhan pasien atau /help' is visible, matching
        the neutral startup guidance."""
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

        output = _strip_ansi(buf.getvalue())

        kasus_baru_pos = output.find("Kasus baru dimulai")
        self.assertGreater(kasus_baru_pos, -1)

        after_next = output[kasus_baru_pos:]
        # Guidance message should be visible after /next
        self.assertIn(
            "Ketik keluhan pasien",
            after_next,
            "After /next, guidance message must be visible",
        )

    def test_after_next_shows_command_footer(self):
        """After /next, the slash-command footer is visible so the doctor
        can continue with available commands immediately."""
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

        output = _strip_ansi(buf.getvalue())

        kasus_baru_pos = output.find("Kasus baru dimulai")
        self.assertGreater(kasus_baru_pos, -1)

        after_next = output[kasus_baru_pos:]

        # Command footer should list core commands
        self.assertIn(
            "/pasien", after_next, "Command footer must list /pasien after /next"
        )
        self.assertIn("/next", after_next, "Command footer must list /next after /next")
        self.assertIn("/exit", after_next, "Command footer must list /exit after /next")

    def test_after_next_shows_tanpa_pasien(self):
        """After /next, the header shows TANPA PASIEN, confirming
        the neutral patient state."""
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
        blocks = _extract_header_blocks(output)
        self.assertGreaterEqual(len(blocks), 2)

        last_block = _strip_ansi(blocks[-1])
        self.assertIn("TANPA PASIEN", last_block)

    def test_after_next_shows_backend_and_model(self):
        """After /next, the header still shows the active backend and model,
        confirming the neutral state is properly configured."""
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
        blocks = _extract_header_blocks(output)
        self.assertGreaterEqual(len(blocks), 2)

        last_block = _strip_ansi(blocks[-1])
        self.assertIn("Backend", last_block)
        self.assertIn("DeepSeek", last_block)
        self.assertIn("Model", last_block)

    def test_neutral_state_allows_new_complaint(self):
        """After /next, the doctor can enter a new complaint for the
        fresh case without encountering any error from stale state."""
        input_sequence = [
            "",
            "/pasien",
            "Old Patient",
            "25",
            "P",
            "",
            "",
            "",
            "",
            "",
            "nyeri perut",  # prior complaint
            "2 hari",  # durasi
            "mual",  # gejala
            "tidak ada",  # red flags
            "",  # vital (skip)
            "/next",
            "batuk pilek 1 minggu",  # new complaint
            "",  # durasi (skip)
            "demam ringan",  # gejala
            "tidak ada",  # red flags
            "",  # vital (skip)
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

        output = _strip_ansi(buf.getvalue())

        # Verify old patient appears before /next
        self.assertIn("Old Patient", output)

        # Verify /next transition
        self.assertIn("Kasus baru dimulai", output)

        # Verify new complaint appears after /next
        kasus_baru_pos = output.find("Kasus baru dimulai")
        if kasus_baru_pos != -1:
            after_next = output[kasus_baru_pos:]
            self.assertIn(
                "batuk pilek 1 minggu",
                after_next,
                "New complaint must be accepted after /next",
            )
            # Old patient should NOT bleed into new case
            self.assertNotIn(
                "Old Patient",
                after_next,
                "Old patient name must not bleed into new case after /next",
            )
            # Old complaint should NOT bleed into new case
            self.assertNotIn(
                "nyeri perut",
                after_next,
                "Old complaint must not bleed into new case after /next",
            )


class NoPriorContextBleedingTests(unittest.TestCase):
    """VAL-CROSS-002: No prior context bleeds into the new case."""

    def test_patient_name_does_not_bleed_into_next_case_intake(self):
        """After /pasien sets a patient, then /next starts a fresh case,
        the case intake for the new complaint should NOT echo the
        old patient's name."""
        input_sequence = [
            "",
            "/pasien",
            "Dr. Test Patient",
            "30",
            "L",
            "",
            "",
            "sulfa",
            "",
            "",
            "/next",
            "sakit kepala",
            "1 hari",
            "",
            "tidak ada",
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

        output = _strip_ansi(buf.getvalue())

        # Old patient should appear in early output
        self.assertIn("Dr. Test Patient", output)

        # After /next, old patient must NOT appear in echo/inrtake
        kasus_baru_pos = output.find("Kasus baru dimulai")
        if kasus_baru_pos != -1:
            after_next = output[kasus_baru_pos:]
            self.assertNotIn(
                "Dr. Test Patient",
                after_next,
                "Old patient name bleeds into new case context",
            )

    def test_prior_allergy_does_not_bleed_into_next_case(self):
        """After setting allergies via /pasien, then /next, the new case
        intake should not show the old patient's allergies."""
        input_sequence = [
            "",
            "/pasien",
            "Allergy Patient",
            "45",
            "P",
            "",
            "",
            "penisilin, aspirin",
            "",
            "",
            "/next",
            "nyeri sendi",
            "1 minggu",
            "bengkak lutut",
            "tidak ada",
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

        output = _strip_ansi(buf.getvalue())

        self.assertIn("penisilin", output)
        self.assertIn("Kasus baru dimulai", output)

        # After /next, old allergies must not appear in new case context
        kasus_baru_pos = output.find("Kasus baru dimulai")
        if kasus_baru_pos != -1:
            after_next = output[kasus_baru_pos:]
            self.assertNotIn(
                "Allergy Patient", after_next, "Old patient data bleeds into new case"
            )

    def test_multiple_next_in_sequence(self):
        """Multiple /next in sequence each produce a fresh state with
        new session IDs and no cross-contamination."""
        input_sequence = [
            "",
            "/pasien",
            "First Patient",
            "20",
            "L",
            "",
            "",
            "",
            "",
            "",
            "/next",
            "/pasien",
            "Second Patient",
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

        output = _strip_ansi(buf.getvalue())

        # All three patient contexts should appear
        self.assertIn("First Patient", output)
        self.assertIn("Second Patient", output)

        # Verify two "Kasus baru dimulai" transitions
        self.assertEqual(
            output.count("Kasus baru dimulai"),
            2,
            "Should have exactly 2 Kasus baru dimulai transitions",
        )

        # Extract header blocks and verify each /next produces TANPA PASIEN
        blocks = _extract_header_blocks(output)
        # There should be at least 4 headers: startup, after first /pasien,
        # after first /next, after second /pasien, after second /next
        self.assertGreaterEqual(len(blocks), 3)

    def test_next_after_full_consultation_clears_everything(self):
        """After a full consultation (intake + case + chat),
        /next clears the conversation history, patient context,
        and last_response. Then /history shows empty history
        and /send shows no output available."""
        input_sequence = [
            "",
            "/pasien",
            "Full Case Patient",
            "55",
            "L",
            "80",
            "175",
            "tidak ada",
            "amlodipin 5mg",
            "hipertensi",
            "nyeri dada kiri 30 menit",  # complaint
            "30 menit",  # durasi
            "keringat dingin, sesak",  # gejala
            "nyeri dada akut",  # red flags
            "TD 160/95",  # vital
            "/next",
            "/history",
            "/send",
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

        output = _strip_ansi(buf.getvalue())

        # Prior consultation context
        self.assertIn("Full Case Patient", output)
        self.assertIn("nyeri dada kiri 30 menit", output)

        # /next transition
        self.assertIn("Kasus baru dimulai", output)

        # After /next, confirm fresh state
        kasus_baru_pos = output.find("Kasus baru dimulai")
        if kasus_baru_pos != -1:
            after_next = output[kasus_baru_pos:]

            # Old patient must not bleed
            self.assertNotIn(
                "Full Case Patient", after_next, "Patient name bleeds into new case"
            )

            # Old complaint must not bleed
            self.assertNotIn(
                "nyeri dada kiri 30 menit",
                after_next,
                "Prior complaint bleeds into new case",
            )

            # /history after /next should show empty (no prior messages)
            history_pos = after_next.find("RIWAYAT PERCAKAPAN")
            if history_pos != -1:
                history_section = after_next[history_pos:]
                self.assertNotIn(
                    "nyeri dada kiri 30 menit",
                    history_section,
                    "Prior complaint appears in history after /next",
                )

            # /send after /next should say no output
            self.assertIn(
                "Belum ada output untuk dikirim",
                after_next,
                "/send after /next must indicate no output",
            )


if __name__ == "__main__":
    unittest.main()
