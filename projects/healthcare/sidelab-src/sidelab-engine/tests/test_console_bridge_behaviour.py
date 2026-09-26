# Architected and built by codieverse+.
from __future__ import annotations

import unittest
from unittest.mock import MagicMock

from rich.text import Text

from sidelab.console_bridge import RichLogConsole


class RichLogConsoleRoutingTests(unittest.TestCase):
    def test_print_from_worker_is_queued_through_app_call_from_thread(self):
        log = MagicMock()
        app = MagicMock()
        console = RichLogConsole(log, app=app)

        console.print("keluhan demam")

        app.call_from_thread.assert_called_once_with(log.write, "keluhan demam")
        log.write.assert_not_called()

    def test_print_without_app_writes_directly_to_rich_log(self):
        log = MagicMock()
        console = RichLogConsole(log)

        console.print("keluhan batuk")

        log.write.assert_called_once_with("keluhan batuk")

    def test_print_swallows_errors_raised_by_the_rich_log(self):
        log = MagicMock()
        log.write.side_effect = RuntimeError("widget gone")
        console = RichLogConsole(log)

        console.print("teks")

        log.write.assert_called_once_with("teks")

    def test_print_swallows_errors_raised_by_call_from_thread(self):
        log = MagicMock()
        app = MagicMock()
        app.call_from_thread.side_effect = RuntimeError("app closed")
        console = RichLogConsole(log, app=app)

        console.print("teks")

        app.call_from_thread.assert_called_once_with(log.write, "teks")


class RichLogConsolePrintArgumentTests(unittest.TestCase):
    def test_print_without_arguments_writes_an_empty_line(self):
        log = MagicMock()
        RichLogConsole(log).print()

        log.write.assert_called_once_with("")

    def test_single_renderable_is_passed_through_unchanged(self):
        log = MagicMock()
        renderable = Text("DIAGNOSIS KERJA")
        RichLogConsole(log).print(renderable)

        self.assertIs(log.write.call_args.args[0], renderable)

    def test_multiple_arguments_are_joined_with_single_spaces_as_text(self):
        log = MagicMock()
        RichLogConsole(log).print("Suhu", 38.5, "C")

        log.write.assert_called_once_with("Suhu 38.5 C")

    def test_print_none_writes_an_empty_line(self):
        log = MagicMock()
        RichLogConsole(log).print(None)

        log.write.assert_called_once_with("")


class RichLogConsoleInputAndClearTests(unittest.TestCase):
    def test_input_never_blocks_and_returns_empty_string(self):
        console = RichLogConsole(MagicMock())

        self.assertEqual(console.input("Lanjut? "), "")

    def test_clear_from_worker_is_queued_through_app_call_from_thread(self):
        log = MagicMock()
        app = MagicMock()
        RichLogConsole(log, app=app).clear()

        app.call_from_thread.assert_called_once_with(log.clear)
        log.clear.assert_not_called()

    def test_clear_without_app_clears_rich_log_directly(self):
        log = MagicMock()
        RichLogConsole(log).clear()

        log.clear.assert_called_once_with()

    def test_clear_swallows_errors_raised_by_the_rich_log(self):
        log = MagicMock()
        log.clear.side_effect = RuntimeError("widget gone")

        RichLogConsole(log).clear()

        log.clear.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()
