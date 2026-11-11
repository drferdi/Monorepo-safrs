# Architected and built by codieverse+.
from pathlib import Path
import unittest

from sidelab.tui import SidelabApp


FINAL_WARNING_RESPONSE = (
    "TATALAKSANA:\n"
    "Pantau klinis.\n\n"
    "PERINGATAN — DATA KLINIS TIDAK DIDUKUNG INPUT DOKTER"
)


class _FakeLog:
    def __init__(self):
        self.messages = []

    def write(self, message):
        self.messages.append(message)


class TuiSafetyParitySourceTests(unittest.TestCase):
    def test_tui_consultation_uses_injected_chat_function(self):
        source = Path("sidelab/tui.py").read_text(encoding="utf-8")

        self.assertIn("result = self._chat_fn(", source)
        self.assertIn("self._last_response = result or \"\"", source)

    def test_tui_copy_uses_last_finalized_response(self):
        source = Path("sidelab/tui.py").read_text(encoding="utf-8")

        copy_pos = source.index("def _do_copy_to_clipboard")
        last_response_pos = source.index("self._copy_text(self._last_response)", copy_pos)

        self.assertGreater(last_response_pos, copy_pos)

    def test_tui_save_uses_history_containing_final_response(self):
        captured = {}
        log = _FakeLog()

        def fake_save(history, pasien, session_id):
            captured["history"] = history
            captured["pasien"] = pasien
            captured["session_id"] = session_id

        app = SidelabApp(
            chat_fn=lambda *args, **kwargs: FINAL_WARNING_RESPONSE,
            save_fn=fake_save,
            backend_label="Local",
            model="test-model",
            session_id="ABC123",
            backend_ready=True,
        )
        app._history = [{"role": "assistant", "content": FINAL_WARNING_RESPONSE}]
        app.query_one = lambda *args, **kwargs: log

        app._do_save()

        self.assertEqual(captured["session_id"], "ABC123")
        self.assertIn("TIDAK DIDUKUNG INPUT DOKTER", captured["history"][0]["content"])

    def test_tui_copy_uses_last_final_response(self):
        captured = {}
        log = _FakeLog()

        app = SidelabApp(
            chat_fn=lambda *args, **kwargs: FINAL_WARNING_RESPONSE,
            save_fn=lambda *args, **kwargs: None,
            backend_label="Local",
            model="test-model",
            session_id="ABC123",
            backend_ready=True,
        )
        app._last_response = FINAL_WARNING_RESPONSE
        app.query_one = lambda *args, **kwargs: log
        app._copy_text = lambda text: captured.setdefault("text", text) or True

        app._do_copy_to_clipboard()

        self.assertIn("TIDAK DIDUKUNG INPUT DOKTER", captured["text"])
