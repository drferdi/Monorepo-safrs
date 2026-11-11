# Architected and built by codieverse+.
"""
sidelab/console_bridge.py — Thread-safe Console → RichLog bridge

Semua write dari worker thread di-queue via app.call_from_thread()
agar tidak crash karena Textual widget tidak thread-safe.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from rich.console import Console

if TYPE_CHECKING:
    from textual.app import App
    from textual.widgets import RichLog


class RichLogConsole(Console):
    """Rich Console yang redirect output ke Textual RichLog secara thread-safe."""

    def __init__(self, rich_log: "RichLog", app: "App | None" = None) -> None:
        self._log = rich_log
        self._app = app
        super().__init__(highlight=False, force_terminal=False, no_color=False)

    def _write(self, renderable: Any) -> None:
        """Internal: write ke RichLog, thread-safe."""
        try:
            if self._app is not None:
                # Dipanggil dari worker thread — queue ke main thread
                self._app.call_from_thread(self._log.write, renderable)
            else:
                # Dipanggil dari main thread langsung
                self._log.write(renderable)
        except Exception:
            pass

    def print(self, *args, **kwargs) -> None:  # type: ignore[override]
        if not args:
            self._write("")
            return
        renderable = args[0] if len(args) == 1 else " ".join(str(a) for a in args)
        if renderable is not None:
            self._write(renderable)
        else:
            self._write("")

    def input(self, prompt: str = "") -> str:  # type: ignore[override]
        return ""

    def clear(self) -> None:  # type: ignore[override]
        try:
            if self._app is not None:
                self._app.call_from_thread(self._log.clear)
            else:
                self._log.clear()
        except Exception:
            pass
