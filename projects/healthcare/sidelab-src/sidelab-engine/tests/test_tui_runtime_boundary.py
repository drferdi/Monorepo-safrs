# Architected and built by codieverse+.
from __future__ import annotations

from pathlib import Path
import tempfile
import unittest

from sidelab.runtime import BackendSelection, TuiRuntime, build_tui_runtime
from sidelab.session_store import save_session
from sidelab.tui import SidelabApp
import sidelab_tui


class TuiRuntimeBoundaryTests(unittest.TestCase):
    def test_tui_launcher_does_not_directly_load_legacy_script(self):
        source = Path("sidelab_tui.py").read_text(encoding="utf-8")

        self.assertNotIn("importlib.util", source)
        self.assertNotIn("sidelab.py", source)
        self.assertNotIn("sidelab_core", source)
        self.assertIn("build_tui_runtime", source)

    def test_runtime_bootstrap_captures_backend_selection(self):
        runtime = build_tui_runtime(
            BackendSelection(
                backend="local",
                model="medgemma:4b",
                ready=True,
                label="Local Ollama",
                warning="",
            )
        )

        self.assertEqual(runtime.backend, "local")
        self.assertEqual(runtime.model, "medgemma:4b")
        self.assertEqual(runtime.backend_label, "Local Ollama")
        self.assertTrue(runtime.backend_ready)
        self.assertEqual(len(runtime.session_id), 8)

    def test_tui_app_can_be_created_with_injected_runtime(self):
        runtime = TuiRuntime(
            session_id="ABC12345",
            backend="local",
            model="test-model",
            backend_ready=True,
            backend_label="Local Ollama",
            backend_warning="",
        )

        app = sidelab_tui.create_app(runtime)

        self.assertIsInstance(app, SidelabApp)
        self.assertEqual(app._session_id, "ABC12345")
        self.assertEqual(app._backend_key, "local")
        self.assertEqual(app._model, "test-model")


class SessionStoreTests(unittest.TestCase):
    def test_session_store_persists_tui_history_without_legacy_core(self):
        history = [
            {"role": "user", "content": "keluhan demam"},
            {"role": "assistant", "content": "TATALAKSANA:\nPantau klinis."},
        ]
        pasien = {"nama": "Budi", "umur": "45"}

        with tempfile.TemporaryDirectory() as tmpdir:
            path = save_session(
                history,
                pasien,
                "ABC12345",
                backend="local",
                model="test-model",
                sessions_dir=tmpdir,
            )

            content = path.read_text(encoding="utf-8")

        self.assertIn("SIDELAB Session ABC12345", content)
        self.assertIn("Backend: Local Ollama", content)
        self.assertIn("Model: test-model", content)
        self.assertIn("Pasien: nama: Budi | umur: 45", content)
        self.assertIn("DOKTER:\nkeluhan demam", content)
        self.assertIn("SIDELAB:\nTATALAKSANA:", content)
