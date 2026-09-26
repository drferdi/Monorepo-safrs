"""Test keyboard-first-command-surface feature.

Verifies VAL-INTAKE-007: The command surface stays keyboard-first and discoverable.

- The /help command shows a visible command list and footer
- The doctor can use /pasien, /model, /next, /save, /exit via slash commands
- The CLI remains self-discoverable without requiring memorized hidden workflows
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


class HelpCommandDisplayTests(unittest.TestCase):
    """VAL-INTAKE-007: /help shows visible command list and footer."""

    def test_help_command_shows_command_list(self):
        """Calling _print_help directly produces a visible command list
        with all expected slash commands."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_help()

        output = buf.getvalue()
        clean = _strip_ansi(output)

        # The help should list all core slash commands
        expected_commands = [
            "/pasien",
            "/model",
            "/next",
            "/save",
            "/exit",
            "/help",
        ]
        for cmd in expected_commands:
            self.assertIn(cmd, clean, f"Help should list {cmd}")

    def test_help_command_title_visible(self):
        """The help panel has a descriptive title."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_help()

        output = buf.getvalue()
        clean = _strip_ansi(output)
        self.assertIn("PERINTAH TERSEDIA", clean)

    def test_help_command_has_descriptions(self):
        """Each command in help has a description."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_help()

        output = buf.getvalue()
        clean = _strip_ansi(output)
        # Verify descriptions are present for core commands
        expected_descriptions = [
            "Input data pasien aktif",
            "Kasus baru",
            "Simpan sesi ke file",
            "Ganti model",
            "Tampilkan bantuan ini",
            "Keluar",
        ]
        for desc in expected_descriptions:
            self.assertIn(desc, clean, f"Help should describe: {desc}")

    def test_help_command_followed_by_footer(self):
        """After /help in the main loop, the command footer is also shown
        for quick reference after viewing detailed help."""
        input_sequence = ["", "/help", "/exit"]
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
        clean = _strip_ansi(output)

        # After /help, the COMMANDS footer should appear
        # (note: COMMANDS now also appears at startup, so we find the one
        #  that comes after the help panel title)
        help_title_idx = clean.find("PERINTAH TERSEDIA")
        self.assertGreater(help_title_idx, 0, "Help panel title should be visible")

        footer_idx = clean.find("COMMANDS", help_title_idx)
        self.assertGreater(footer_idx, 0, "Command footer should be visible after help")
        # Footer should appear AFTER help title
        self.assertGreater(
            footer_idx,
            help_title_idx,
            "Footer should be displayed after the detailed help",
        )


class SlashCommandDispatchTests(unittest.TestCase):
    """VAL-INTAKE-007: Core slash commands work via keyboard input."""

    def test_pasien_command_dispatched(self):
        """Typing /pasien triggers patient intake without error."""
        input_sequence = ["", "/pasien", "", "", "", "", "", "", "", "/exit"]
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
        clean = _strip_ansi(output)
        # /pasien should show intake panel
        self.assertIn("INPUT DATA PASIEN", clean)

    def test_model_command_dispatched(self):
        """Typing /model triggers model selection without error."""
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
        clean = _strip_ansi(output)
        # /model should show numbered model list
        self.assertIn("1.", clean)

    def test_next_command_dispatched(self):
        """Typing /next starts a fresh case without error."""
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
        clean = _strip_ansi(output)
        self.assertIn("Kasus baru dimulai", clean)

    def test_save_command_dispatched(self):
        """Typing /save saves the session without error."""
        input_sequence = ["", "/save", "/exit"]
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
        clean = _strip_ansi(output)
        # /save should confirm save with "Tersimpan" or "sidelab_" filename pattern
        self.assertTrue(
            "tersimpan" in clean.lower() or "sidelab_" in clean.lower(),
            "Save command should produce confirmation output",
        )

    def test_exit_command_terminates(self):
        """Typing /exit cleanly terminates without crash."""
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
        clean = _strip_ansi(output)
        self.assertIn("Keluar", clean)


class SelfDiscoverabilityTests(unittest.TestCase):
    """VAL-INTAKE-007: CLI remains self-discoverable without hidden workflows."""

    def test_startup_prompt_mentions_help(self):
        """The startup prompt explicitly tells the doctor to use /help
        for discovering available commands."""
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
        clean = _strip_ansi(output)
        self.assertIn("/help", clean)

    def test_input_prompt_is_keyboard_friendly(self):
        """The main input prompt uses a plain text prompt format
        that accepts keyboard input directly (verified via source inspection)."""
        import inspect

        source = inspect.getsource(m.main)
        self.assertIn("INPUT DOKTER", source)
        self.assertIn("console.input", source)

    def test_command_footer_function_renders_correctly(self):
        """The _print_command_footer function produces visible output
        that doctors can reference after consultation."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_command_footer()

        output = buf.getvalue()
        clean = _strip_ansi(output)
        self.assertIn("COMMANDS", clean)
        self.assertIn("/pasien", clean)
        self.assertIn("/exit", clean)

    def test_command_footer_called_after_chat(self):
        """Verify _print_command_footer is called at the end of _chat function
        by inspecting the source code. The footer ensures post-response guidance."""
        import inspect

        source = inspect.getsource(m._chat)
        self.assertIn("_print_command_footer()", source)

    def test_command_footer_lists_core_commands(self):
        """The command footer lists /pasien, /model, /next, /save, /help, /exit
        for immediate visibility."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_command_footer()

        output = buf.getvalue()
        clean = _strip_ansi(output)

        core_commands = ["/pasien", "/model", "/next", "/save", "/help", "/exit"]
        for cmd in core_commands:
            self.assertIn(cmd, clean, f"Footer should list {cmd}")

    def test_all_commands_documented_in_help(self):
        """Every slash command handled by the main loop is documented
        in _print_help, with no hidden commands."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_help()

        output = buf.getvalue()
        clean = _strip_ansi(output)

        # All known slash commands from the main loop dispatch
        all_commands = [
            "/soap",
            "/triage",
            "/rujuk",
            "/edukasi",
            "/library20",
            "/library50",
            "/library100",
            "/tree",
            "/pasien",
            "/next",
            "/history",
            "/save",
            "/send",
            "/icd",
            "/model",
            "/clear",
            "/help",
            "/exit",
        ]
        for cmd in all_commands:
            self.assertIn(cmd, clean, f"Command {cmd} should be documented in help")

    def test_empty_input_does_not_crash(self):
        """Pressing Enter with no input does not crash or misbehave."""
        input_sequence = ["", "", "", "/exit"]
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

        # Should not crash
        output = buf.getvalue()
        self.assertIsNotNone(output)


class CommandFooterTests(unittest.TestCase):
    """The _print_command_footer function renders properly."""

    def test_footer_shows_categories(self):
        """Footer groups commands into klinis, pustaka, sistem categories."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_command_footer()

        output = buf.getvalue()
        clean = _strip_ansi(output)
        self.assertIn("klinis", clean.lower())

    def test_footer_title_visible(self):
        """Footer panel has a title."""
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_command_footer()

        output = buf.getvalue()
        clean = _strip_ansi(output)
        self.assertIn("COMMANDS", clean)


if __name__ == "__main__":
    unittest.main()
