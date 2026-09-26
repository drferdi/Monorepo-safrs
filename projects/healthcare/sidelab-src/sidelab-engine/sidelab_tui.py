# Architected and built by codieverse+.
"""sidelab_tui.py — Entry point Textual TUI untuk Sidelab"""

from __future__ import annotations

from sidelab.runtime import TuiRuntime, build_tui_runtime
from sidelab.tui import SidelabApp


def create_app(runtime: TuiRuntime | None = None) -> SidelabApp:
    active_runtime = runtime or build_tui_runtime()

    def chat_fn(
        prompt,
        history,
        pasien,
        model,
        backend_key,
        console_override=None,
    ):
        return active_runtime.chat(
            prompt,
            history,
            pasien,
            model,
            backend_key,
            console_override,
        )

    def save_fn(history, pasien, session_id):
        active_runtime.save_session(history, pasien, session_id)

    return SidelabApp(
        chat_fn=chat_fn,
        save_fn=save_fn,
        backend_label=active_runtime.backend_label,
        backend_key=active_runtime.backend,
        model=active_runtime.model,
        session_id=active_runtime.session_id,
        backend_ready=active_runtime.backend_ready,
    )


def main() -> None:
    app = create_app()
    app.run()


if __name__ == "__main__":
    main()
