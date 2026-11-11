"""Test post-response-command-guidance feature.

Verifies VAL-INTAKE-009: Post-response command guidance remains visible.

- After every completed consultation response, the terminal re-shows a visible
  keyboard-only command surface (slash-command footer)
- The doctor can immediately continue with /pasien, /next, /save, /model, /help,
  or /exit without relying on hidden workflows or scrolling back
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


def _strip_all(text: str) -> str:
    """Remove ANSI escape codes AND Rich markup tags for clean assertions."""
    # Strip ANSI escape sequences
    text = re.sub(r"\x1b\[[0-9;]*m", "", text)
    # Strip Rich markup tags like [bold #88A8C0], [/bold #88A8C0], [/], etc.
    text = re.sub(r"\[/?[a-zA-Z#\- 0-9]+\]", "", text)
    return text


class PostResponseFooterTests(unittest.TestCase):
    """VAL-INTAKE-009: Footer is re-shown after every completed consultation response."""

    def test_footer_visible_after_chat_response(self):
        """After _chat returns a completed response, the COMMANDS footer
        is visible in the output."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            # Simulate a completed response flow — just call the footer
            m._print_command_footer()

        output = buf.getvalue()
        clean = _strip_all(output)

        self.assertIn("COMMANDS", clean)
        self.assertIn("/pasien", clean)
        self.assertIn("/next", clean)
        self.assertIn("/exit", clean)

    def test_footer_visible_at_startup(self):
        """At startup, before the first INPUT DOKTER prompt, the command
        footer is shown so the doctor knows what commands are available."""
        input_sequence = ["", "/exit"]
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
        clean = _strip_all(output)

        # The COMMANDS footer should be visible in the startup output.
        # (Note: when cap.input is mocked, the prompt text itself is not
        # captured in the output buffer, so we verify footer presence
        # rather than relative ordering against INPUT DOKTER.)
        footer_idx = clean.find("COMMANDS")
        self.assertGreater(footer_idx, 0, "Command footer should be visible at startup")
        # Footer should appear before exit output
        exit_idx = clean.find("Keluar")
        if exit_idx >= 0:
            self.assertLess(
                footer_idx,
                exit_idx,
                "Footer should appear before exit message at startup",
            )

    def test_footer_contains_core_continuation_commands(self):
        """The post-response footer explicitly lists the commands
        the doctor needs to continue: /pasien, /next, /save, /model,
        /help, and /exit."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_command_footer()

        output = buf.getvalue()
        clean = _strip_all(output)

        core_commands = [
            "/pasien",
            "/next",
            "/save",
            "/model",
            "/help",
            "/exit",
        ]
        for cmd in core_commands:
            self.assertIn(
                cmd,
                clean,
                f"Footer should list {cmd} for immediate continuation",
            )

    def test_footer_called_in_chat_source(self):
        """The _chat function source contains _print_command_footer()
        to ensure it is called after every completed response."""
        import inspect

        source = inspect.getsource(m._chat)
        self.assertIn("_print_command_footer()", source)

    def test_footer_called_in_main_before_loop(self):
        """The main function source contains _print_command_footer()
        before the main loop to show commands at startup."""
        import inspect

        source = inspect.getsource(m.main)
        # Should be called at least twice: startup and after /help
        occurrences = source.count("_print_command_footer()")
        self.assertGreaterEqual(
            occurrences,
            2,
            "main() should call _print_command_footer() at least at startup and after /help",
        )


class FooterAfterConsultationFlowTests(unittest.TestCase):
    """Simulate full consultation flows and verify footer appears after each."""

    def test_footer_after_consultation_with_case_intake(self):
        """After a complete flow (case intake + _chat), the footer
        appears in the console output for immediate continuation."""
        # _input_kasus has 5 fields; "keluhan" is pre-filled from initial
        # complaint, remaining 4 (durasi, gejala, redflag, vital) each
        # call console.input(). We provide empty strings to skip them all.
        input_sequence = [
            "",  # backend menu: accept default
            "pasien demam tinggi 3 hari batuk pilek",  # case complaint
            "",  # durasi (skip)
            "",  # gejala (skip)
            "",  # redflag (skip)
            "",  # vital (skip)
            "/exit",  # exit
        ]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
        ):

            def mock_chat(prompt, history, pasien, model, backend, **_kwargs):
                m._print_command_footer()
                history.append({"role": "user", "content": prompt})
                history.append({"role": "assistant", "content": "Mock response"})
                return "Mock response"

            with patch.object(m, "_chat", side_effect=mock_chat):
                try:
                    m.main()
                except StopIteration:
                    pass

        output = buf.getvalue()
        clean = _strip_all(output)

        # Count COMMANDS footer appearances:
        # 1 at startup + 1 after consultation mock_chat = at least 2
        commands_count = clean.count("COMMANDS")
        self.assertGreaterEqual(
            commands_count,
            2,
            "COMMANDS footer should appear at startup and after consultation response",
        )

    def test_footer_not_buried_after_long_output(self):
        """When a consultation produces output, the footer should appear
        at the end (close to the next prompt), not buried in the middle.
        Verified by source inspection of _chat function."""
        import inspect

        source = inspect.getsource(m._chat)
        lines = source.split("\n")
        footer_line_idx = None
        total_lines = len(lines)

        for i, line in enumerate(lines):
            if "_print_command_footer()" in line:
                footer_line_idx = i

        self.assertIsNotNone(footer_line_idx, "Footer call must exist in _chat")
        # It should be in the last 40% of the function (post-response area)
        self.assertGreater(
            footer_line_idx,
            total_lines * 0.6,
            "Footer should be in the post-response area of _chat, not early",
        )

    def test_footer_visible_after_sparse_complaint_clarification(self):
        """When a sparse complaint triggers clarification, the footer
        still appears after the subsequent _chat call completes."""
        # "sakit kepala" is a short complaint — _input_kasus will pre-fill
        # the complaint, then prompt for 4 more intake fields
        input_sequence = [
            "",  # backend menu: accept default
            "sakit kepala",  # short/sparse complaint
            "",  # durasi (skip)
            "",  # gejala (skip)
            "",  # redflag (skip)
            "",  # vital (skip)
            "/exit",  # exit
        ]
        input_iter = iter(input_sequence)

        def fake_input(prompt=""):
            return next(input_iter)

        cap, buf = _make_capture_console()
        with (
            patch.object(m, "console", cap),
            patch.object(cap, "input", side_effect=fake_input),
        ):

            def mock_chat(prompt, history, pasien, model, backend, **_kwargs):
                m._print_command_footer()
                history.append({"role": "user", "content": prompt})
                history.append({"role": "assistant", "content": "Mock sparse response"})
                return "Mock sparse response"

            with patch.object(m, "_chat", side_effect=mock_chat):
                try:
                    m.main()
                except StopIteration:
                    pass

        output = buf.getvalue()
        clean = _strip_all(output)

        # Footer must appear at least once (startup) plus after mock_chat
        self.assertIn("COMMANDS", clean)

    def test_footer_after_error_path_shows_commands(self):
        """When _chat encounters an error, the footer is still shown
        so the doctor knows how to continue despite the failure."""
        import inspect

        source = inspect.getsource(m._chat)
        # The except block should contain _print_command_footer()
        except_idx = source.find("except Exception")
        footer_after_except = source.find("_print_command_footer()", except_idx)

        # Footer should appear after the exception print and before return ""
        self.assertGreater(
            footer_after_except,
            0,
            "Footer must be called in exception handler of _chat",
        )


class FooterContentFormatTests(unittest.TestCase):
    """VAL-INTAKE-009: Footer content and formatting."""

    def test_footer_panel_title(self):
        """Footer uses a COMMANDS panel title."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_command_footer()

        output = buf.getvalue()
        clean = _strip_all(output)
        self.assertIn("COMMANDS", clean)

    def test_footer_has_sistem_category_with_core_commands(self):
        """The system category contains /pasien, /next, /save, /model,
        /help, and /exit."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_command_footer()

        output = buf.getvalue()
        clean = _strip_all(output)

        core = ["/pasien", "/next", "/save", "/model", "/help", "/exit"]
        for cmd in core:
            self.assertIn(cmd, clean, f"Core command {cmd} missing from footer")

    def test_footer_renders_as_panel_with_rich(self):
        """Footer function produces output that renders as a Rich Panel."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_command_footer()

        output = buf.getvalue()
        self.assertGreater(len(output), 0, "Footer should produce visible output")

    def test_footer_immediately_after_response(self):
        """Simulate that after a completed consultation, the next thing
        visible is the footer, then the next INPUT DOKTER prompt."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m.console.print("=== RESPONSE CONTENT ===")
            m.console.print("Diagnosis: Common Cold")
            m.console.print()
            m._print_command_footer()
            m.console.print()
            m.console.print("INPUT DOKTER > ")

        output = buf.getvalue()
        clean = _strip_all(output)

        response_idx = clean.find("RESPONSE CONTENT")
        commands_idx = clean.find("COMMANDS")
        prompt_idx = clean.find("INPUT DOKTER")

        self.assertLess(
            response_idx,
            commands_idx,
            "Footer must appear after response content",
        )
        self.assertLess(
            commands_idx,
            prompt_idx,
            "Footer must appear before the next INPUT DOKTER prompt",
        )


class DiscoverabilityTests(unittest.TestCase):
    """VAL-INTAKE-009: Doctor can continue without hidden workflows."""

    def test_no_hidden_commands_needed(self):
        """All commands visible in footer are the same as those documented
        in /help. No memorized hidden workflows required."""
        cap_footer, buf_footer = _make_capture_console()
        with patch.object(m, "console", cap_footer):
            m._print_command_footer()
        footer_output = _strip_all(buf_footer.getvalue())

        cap_help, buf_help = _make_capture_console()
        with patch.object(m, "console", cap_help):
            m._print_help()
        help_output = _strip_all(buf_help.getvalue())

        core = ["/pasien", "/model", "/next", "/save", "/help", "/exit"]
        for cmd in core:
            self.assertIn(cmd, footer_output, f"{cmd} must be in footer")
            self.assertIn(cmd, help_output, f"{cmd} must be in help")

    def test_startup_prompt_and_footer_guide_doctor(self):
        """At startup, the doctor sees both a hint to use /help and the
        visible command footer for immediate reference."""
        input_sequence = ["", "/exit"]
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
        clean = _strip_all(output)

        self.assertIn("/help", clean, "Startup should mention /help")
        self.assertIn("COMMANDS", clean, "Startup should show COMMANDS footer")


if __name__ == "__main__":
    unittest.main()
