# Test startup disclosure truthfulness for VAL-RUNTIME-001, VAL-RUNTIME-004, VAL-RUNTIME-008
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


class StartupDisclosureTests(unittest.TestCase):
    def test_print_header_shows_truthful_backend_and_model(self):
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_header(
                session_id="TEST1234",
                backend="deepseek",
                model="deepseek-v4-pro",
            )
        output = buf.getvalue()
        self.assertIn("Backend", output)
        self.assertIn("DeepSeek", output)
        self.assertIn("deepseek-v4-pro", output)
        self.assertIn("TEST1234", output)

    def test_print_header_falls_back_to_display_model_when_backend_missing(self):
        cap, buf = _make_capture_console()
        with patch.object(m, "console", cap):
            m._print_header(session_id="TEST1234")
        output = buf.getvalue()
        self.assertIn("Backend", output)
        self.assertIn("-", output)
        self.assertIn(m.DISPLAY_MODEL, output)

    def test_main_startup_shows_truthful_model_before_first_prompt(self):
        """Accept default backend (deepseek) then exit immediately."""
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
        # After backend selection, truthful header should show actual model
        self.assertIn("deepseek-v4-flash", output)
        self.assertIn("DeepSeek", output)
        # The explicit mode line should also appear
        self.assertIn("Mode aktif: DeepSeek", output)

    def test_clear_reprints_header_with_current_backend_and_model(self):
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
        # Should contain truthful model at least twice (startup + /clear)
        self.assertGreaterEqual(output.count("deepseek-v4-flash"), 2)
        self.assertIn("DeepSeek", output)

    def test_next_reprints_header_with_current_backend_and_model(self):
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
        # /next clears and reprints header; startup also prints it
        self.assertGreaterEqual(output.count("DeepSeek"), 2)
        self.assertGreaterEqual(output.count("deepseek-v4-flash"), 2)

    def test_model_switch_reprints_header_with_new_model(self):
        # Default deepseek, then /model, choose model 2 (deepseek-v4-pro), then /exit
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
        # Startup model
        self.assertIn("deepseek-v4-flash", output)
        # After switch, header should show new model
        self.assertIn("deepseek-v4-pro", output)


if __name__ == "__main__":
    unittest.main()
