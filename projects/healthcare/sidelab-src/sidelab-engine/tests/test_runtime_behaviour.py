# Architected and built by codieverse+.
import importlib.util
import os
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest import mock

import sidelab.runtime as runtime
from sidelab.runtime import BackendSelection, TuiRuntime, build_tui_runtime, select_backend

_LEGACY_KEY = "sidelab_legacy_core"


def _runtime(backend: str = "local", model: str = "base-model") -> TuiRuntime:
    return TuiRuntime(
        session_id="T0000001",
        backend=backend,
        model=model,
        backend_ready=True,
        backend_label="Local Ollama",
        backend_warning="",
    )


class SelectBackendTests(unittest.TestCase):
    def setUp(self):
        env = mock.patch.dict(os.environ)
        env.start()
        self.addCleanup(env.stop)
        os.environ.pop("SIDELAB_DEFAULT_BACKEND", None)

        self.resolve = self._patch("resolve_backend_choice", side_effect=lambda raw: raw or "deepseek")
        self.default_model = self._patch("default_model_for_backend", return_value="model-x")
        self.readiness = self._patch("check_backend_readiness", return_value=(True, "", ""))

    def _patch(self, name, **kwargs):
        patcher = mock.patch.object(runtime, name, **kwargs)
        mocked = patcher.start()
        self.addCleanup(patcher.stop)
        return mocked

    def test_without_argument_uses_default_backend_environment_variable(self):
        os.environ["SIDELAB_DEFAULT_BACKEND"] = "local"

        selection = select_backend()

        self.resolve.assert_called_once_with("local")
        self.assertEqual(selection.backend, "local")
        self.assertEqual(selection.label, "Local Ollama")

    def test_without_argument_or_environment_passes_empty_choice(self):
        select_backend()

        self.resolve.assert_called_once_with("")

    def test_explicit_choice_wins_over_environment_variable(self):
        os.environ["SIDELAB_DEFAULT_BACKEND"] = "local"

        selection = select_backend("deepseek")

        self.resolve.assert_called_once_with("deepseek")
        self.assertEqual(selection.label, "DeepSeek")

    def test_selection_carries_model_and_readiness_of_resolved_backend(self):
        self.readiness.return_value = (False, "DEEPSEEK_API_KEY", "kunci belum diatur")

        selection = select_backend("deepseek")

        self.default_model.assert_called_once_with("deepseek")
        self.readiness.assert_called_once_with("deepseek")
        self.assertEqual(
            selection,
            BackendSelection(
                backend="deepseek",
                model="model-x",
                ready=False,
                label="DeepSeek",
                warning="kunci belum diatur",
            ),
        )

    def test_label_falls_back_to_backend_key_when_not_registered(self):
        self.assertEqual(select_backend("mystery").label, "mystery")


class BuildTuiRuntimeTests(unittest.TestCase):
    def test_without_selection_bootstraps_from_select_backend(self):
        selection = BackendSelection("nvidia", "nim-model", False, "NVIDIA NIM", "belum siap")

        with mock.patch.object(runtime, "select_backend", return_value=selection) as chooser:
            tui = build_tui_runtime()

        chooser.assert_called_once_with()
        self.assertEqual(
            (tui.backend, tui.model, tui.backend_ready, tui.backend_label, tui.backend_warning),
            ("nvidia", "nim-model", False, "NVIDIA NIM", "belum siap"),
        )

    def test_session_id_is_eight_uppercase_hex_characters_and_unique_per_runtime(self):
        selection = BackendSelection("local", "m", True, "Local Ollama", "")

        ids = {build_tui_runtime(selection).session_id for _ in range(5)}

        self.assertEqual(len(ids), 5)
        for session_id in ids:
            self.assertRegex(session_id, r"^[0-9A-F]{8}$")


class TuiRuntimeChatTests(unittest.TestCase):
    def setUp(self):
        self.core = types.SimpleNamespace(_chat=mock.Mock(return_value="JAWABAN"))
        patcher = mock.patch.object(runtime, "_load_legacy_core", return_value=self.core)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_chat_forwards_arguments_to_legacy_core_in_order(self):
        tui = _runtime()
        history = [{"role": "user", "content": "batuk"}]
        pasien = {"umur": 40}
        console = object()

        reply = tui.chat("batuk", history, pasien, "other-model", "deepseek", console)

        self.assertEqual(reply, "JAWABAN")
        self.core._chat.assert_called_once_with(
            "batuk", history, pasien, "other-model", "deepseek", console
        )

    def test_chat_remembers_explicit_backend_and_model(self):
        tui = _runtime()

        tui.chat("p", [], {}, "other-model", "deepseek")

        self.assertEqual((tui.backend, tui.model), ("deepseek", "other-model"))

    def test_chat_falls_back_to_runtime_backend_and_model_when_empty(self):
        tui = _runtime(backend="local", model="base-model")

        tui.chat("p", [], {}, "", "")

        self.core._chat.assert_called_once_with("p", [], {}, "base-model", "local", None)
        self.assertEqual((tui.backend, tui.model), ("local", "base-model"))


class TuiRuntimeSaveSessionTests(unittest.TestCase):
    def test_save_session_persists_with_current_backend_and_model(self):
        tui = _runtime(backend="deepseek", model="deepseek-v4-flash")
        history = [{"role": "user", "content": "pusing"}]
        pasien = {"nama": "Pasien Sintetis"}

        with mock.patch.object(runtime, "persist_session") as persist:
            result = tui.save_session(history, pasien, "S0000001")

        self.assertIsNone(result)
        persist.assert_called_once_with(
            history,
            pasien,
            "S0000001",
            backend="deepseek",
            model="deepseek-v4-flash",
        )


class LoadLegacyCoreTests(unittest.TestCase):
    def test_returns_already_loaded_module_without_reloading(self):
        fake = types.ModuleType(_LEGACY_KEY)

        with mock.patch.dict(sys.modules, {_LEGACY_KEY: fake}):
            with mock.patch("importlib.util.spec_from_file_location") as spec_factory:
                loaded = runtime._load_legacy_core()

        self.assertIs(loaded, fake)
        spec_factory.assert_not_called()

    def test_raises_runtime_error_naming_path_when_spec_cannot_be_built(self):
        with mock.patch.dict(sys.modules):
            sys.modules.pop(_LEGACY_KEY, None)
            with mock.patch("importlib.util.spec_from_file_location", return_value=None):
                with self.assertRaises(RuntimeError) as ctx:
                    runtime._load_legacy_core()
            self.assertNotIn(_LEGACY_KEY, sys.modules)

        self.assertIn("sidelab.py", str(ctx.exception))

    def test_executes_legacy_script_once_and_registers_it_in_sys_modules(self):
        real_spec = importlib.util.spec_from_file_location
        requested: list[Path] = []

        with tempfile.TemporaryDirectory() as tmpdir:
            stub = Path(tmpdir) / "legacy_stub.py"
            stub.write_text("LOAD_MARKER = 'stub-core'\n", encoding="utf-8")

            def fake_spec(name, location):
                requested.append(Path(location))
                return real_spec(name, stub)

            with mock.patch.dict(sys.modules):
                sys.modules.pop(_LEGACY_KEY, None)
                with mock.patch("importlib.util.spec_from_file_location", side_effect=fake_spec):
                    first = runtime._load_legacy_core()
                    second = runtime._load_legacy_core()
                    registered = sys.modules.get(_LEGACY_KEY)

        self.assertEqual(first.LOAD_MARKER, "stub-core")
        self.assertIs(second, first)
        self.assertIs(registered, first)
        self.assertEqual(len(requested), 1)
        self.assertEqual(requested[0].name, "sidelab.py")
        self.assertEqual(requested[0].parent, Path(runtime.__file__).resolve().parent.parent)


if __name__ == "__main__":
    unittest.main()
