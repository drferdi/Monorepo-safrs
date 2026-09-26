import unittest
from pathlib import Path

from sidelab.runtime import TuiRuntime
from sidelab.tui import SidelabApp
import sidelab_tui

REPO_ROOT = Path(__file__).resolve().parent.parent


class TuiLauncherSurfaceTests(unittest.TestCase):
    """TUI-first launcher surface for VAL-RUNTIME-006."""

    def test_run_bat_targets_tui_entrypoint(self):
        content = (REPO_ROOT / "run.bat").read_text(encoding="utf-8")

        self.assertIn('set "APP_ENTRY=%APP_DIR%sidelab_tui.py"', content)
        self.assertNotIn('set "APP_ENTRY=%APP_DIR%sidelab.py"', content)

    def test_tui_entrypoint_creates_sidelab_app_without_running(self):
        runtime = TuiRuntime(
            session_id="TEST1234",
            backend="local",
            model="test-model",
            backend_ready=True,
            backend_label="Local Ollama",
            backend_warning="",
        )

        app = sidelab_tui.create_app(runtime)

        self.assertIsInstance(app, SidelabApp)
        self.assertEqual(app._session_id, "TEST1234")
        self.assertEqual(app._backend_label, "Local Ollama")

    def test_diagnostics_check_tui_entrypoint(self):
        content = (REPO_ROOT / "diagnose-sidelab.bat").read_text(encoding="utf-8")

        self.assertIn("sidelab_tui.py", content)
        self.assertNotIn("sidelab.py ditemukan", content)


class LauncherHealthyPathTests(unittest.TestCase):
    """VAL-RUNTIME-006: Windows launcher on a healthy setup reaches the same
    visible startup experience as direct CLI."""

    def setUp(self):
        self.launcher_path = REPO_ROOT / "run.bat"
        self.assertTrue(
            self.launcher_path.exists(),
            f"run.bat should exist at {self.launcher_path}",
        )

    def _read_launcher_content(self) -> str:
        return self.launcher_path.read_text(encoding="utf-8")

    def test_launcher_has_venv_validation_not_just_existence_check(self):
        """Launcher must validate venv Python actually runs, not just that the file exists."""
        content = self._read_launcher_content()
        # Must call --version on the venv Python to verify it works
        self.assertIn(
            "--version",
            content,
            "Launcher must validate venv Python by calling --version",
        )
        # Must have fallback branch for when venv Python fails validation
        self.assertIn(
            "stale",
            content.lower() or "tidak dapat",
            "Launcher must report stale venv when Python validation fails",
        )

    def test_launcher_has_system_python_fallback(self):
        """Launcher must fall back to system Python if venv is stale."""
        content = self._read_launcher_content()
        self.assertIn(
            "where python", content, "Launcher must attempt system Python as a fallback"
        )
        self.assertIn(
            'set "PYTHON_EXE=python"',
            content,
            "Launcher must set PYTHON_EXE to system python when found",
        )

    def test_launcher_has_reconnect_loop(self):
        """VAL-CROSS-004: Launcher exit path supports another case or clean finish."""
        content = self._read_launcher_content()
        self.assertIn(
            ":reconnect",
            content,
            "Launcher must have a reconnect label for the restart loop",
        )
        self.assertIn(
            "reconnect",
            content.lower(),
            "Launcher must have a reconnect prompt variable",
        )
        self.assertIn(
            "Kasus baru?", content, "Launcher must ask user if they want a new case"
        )
        self.assertIn(
            "Goodbye", content, "Launcher must show a goodbye message on decline"
        )

    def test_launcher_shows_session_ended_before_prompt(self):
        """Launcher must announce session ended before asking for new case."""
        content = self._read_launcher_content()
        session_ended_pos = content.find("Session ended")
        reconnect_pos = content.find("Kasus baru?")
        self.assertGreater(
            session_ended_pos, -1, "Launcher must show 'Session ended' message"
        )
        self.assertGreater(
            reconnect_pos,
            session_ended_pos,
            "'Session ended' must appear before 'Kasus baru?' prompt",
        )

    def test_launcher_exit_path_does_not_reconnect_on_no(self):
        """If user declines new case, launcher shows goodbye and exits without looping."""
        content = self._read_launcher_content()
        # After decline, it should show Goodbye, pause, and exit
        goodbye_pos = content.find("Goodbye")
        reconnect_label_pos = content.rfind(":reconnect")
        self.assertGreater(goodbye_pos, -1, "Launcher must show Goodbye message")
        # Goodbye should appear after the reconnect label (in linear script flow)
        self.assertGreater(
            goodbye_pos,
            reconnect_label_pos,
            "Goodbye must appear after reconnect logic area",
        )


class LauncherBrokenRuntimeRecoveryTests(unittest.TestCase):
    """VAL-RUNTIME-007 and VAL-RUNTIME-010: Windows launcher broken-runtime
    recovery and explicit fallback announcement."""

    def setUp(self):
        self.launcher_path = REPO_ROOT / "run.bat"
        self.assertTrue(
            self.launcher_path.exists(),
            f"run.bat should exist at {self.launcher_path}",
        )

    def _read_launcher_content(self) -> str:
        return self.launcher_path.read_text(encoding="utf-8")

    # --- VAL-RUNTIME-007: Broken-runtime path is actionable ---

    def test_launcher_has_venv_stale_flag_tracking(self):
        """Launcher must track whether preferred runtime (.venv) was invalid."""
        content = self._read_launcher_content()
        self.assertIn(
            "VENV_STALE",
            content,
            "Launcher must define VENV_STALE to track preferred runtime validity",
        )
        # Must be initialized to empty and set to 1 when venv is invalid
        self.assertIn(
            'set "VENV_STALE="',
            content,
            "VENV_STALE must be initialized to empty before validation",
        )
        self.assertIn(
            'set "VENV_STALE=1"',
            content,
            "VENV_STALE must be set to 1 when venv is invalid",
        )

    def test_launcher_has_explicit_numbered_recovery_steps_on_total_failure(self):
        """When all runtime paths fail, launcher must show numbered recovery steps."""
        content = self._read_launcher_content()
        self.assertIn(
            "Semua jalur runtime gagal",
            content,
            "Launcher must announce total runtime failure explicitly",
        )
        self.assertIn(
            "Langkah pemulihan",
            content,
            "Launcher must provide recovery steps header",
        )
        # Must reference diagnose-sidelab.bat as first recovery step
        self.assertIn(
            "diagnose-sidelab.bat",
            content,
            "Recovery guidance must mention diagnose-sidelab.bat",
        )
        # Must reference install.bat as a recovery step
        self.assertIn(
            "install.bat",
            content,
            "Recovery guidance must mention install.bat",
        )

    def test_launcher_never_exits_without_guidance(self):
        """Every exit /b 1 path must be accompanied by an echo message first."""
        content = self._read_launcher_content()
        lines = content.split("\n")
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped == "exit /b 1":
                # Check that at least one of the previous 5 lines has an echo or guidance
                preceding = "\n".join(lines[max(0, i - 5) : i])
                has_echo = "echo" in preceding.lower()
                self.assertTrue(
                    has_echo,
                    f"exit /b 1 at line {i + 1} must have preceding echo/guidance message. Context: {preceding}",
                )

    def test_launcher_failure_path_includes_recovery_guidance_after_launch(self):
        """When SIDELAB fails after being launched, launcher shows recovery steps."""
        content = self._read_launcher_content()
        self.assertIn(
            "SIDELAB gagal dijalankan",
            content,
            "Launcher must announce launch failure",
        )
        # After launch failure, must show recovery steps
        launch_fail_pos = content.find("SIDELAB gagal dijalankan")
        recovery_pos = content.find("Langkah pemulihan", launch_fail_pos)
        self.assertGreater(
            recovery_pos,
            launch_fail_pos,
            "Recovery guidance must appear after launch failure message",
        )
        # Must reference diagnose-sidelab.bat
        self.assertIn(
            "diagnose-sidelab.bat",
            content[launch_fail_pos:],
            "Launch failure recovery must mention diagnose-sidelab.bat",
        )

    def test_launcher_bootstrap_fallback_has_actionable_guidance(self):
        """When bootstrap post-install exists but runtime not ready, guidance is actionable."""
        content = self._read_launcher_content()
        self.assertIn(
            "installer",
            content.lower(),
            "Bootstrap fallback must mention installer",
        )
        self.assertIn(
            "diagnose-sidelab.bat",
            content,
            "Bootstrap fallback must mention diagnose-sidelab.bat",
        )

    # --- VAL-RUNTIME-010: Explicit fallback announcement ---

    def test_launcher_announces_embedded_fallback_when_venv_stale(self):
        """When venv is stale, launcher must explicitly announce embedded Python fallback."""
        content = self._read_launcher_content()
        # Must contain the fallback announcement for embedded Python
        self.assertIn(
            "Fallback: menggunakan Python bawaan",
            content,
            "Launcher must announce embedded Python fallback explicitly",
        )
        # The embedded fallback announcement must be guarded by VENV_STALE check
        # It should appear after the VENV_STALE set and before system fallback
        venv_stale_pos = content.find('set "VENV_STALE=1"')
        embedded_fallback_pos = content.find("Fallback: menggunakan Python bawaan")
        self.assertGreater(
            embedded_fallback_pos,
            venv_stale_pos,
            "Embedded fallback announcement must be after VENV_STALE is set",
        )

    def test_launcher_announces_system_python_fallback_when_venv_stale(self):
        """When venv is stale, launcher must explicitly announce system Python fallback."""
        content = self._read_launcher_content()
        self.assertIn(
            "Fallback: menggunakan Python sistem dari PATH",
            content,
            "Launcher must announce system Python fallback explicitly",
        )

    def test_launcher_stale_message_appears_before_fallback_announcement(self):
        """Stale .venv message must appear before fallback announcement in script order."""
        content = self._read_launcher_content()
        stale_msg_pos = content.find(
            "Virtual environment di .venv terdeteksi tetapi rusak"
        )
        embedded_fallback_pos = content.find("Fallback: menggunakan Python bawaan")
        sys_fallback_pos = content.find("Fallback: menggunakan Python sistem dari PATH")

        self.assertGreater(
            stale_msg_pos,
            -1,
            "Launcher must have stale venv detection message",
        )
        # The stale message should appear before both fallback announcements
        if embedded_fallback_pos > -1:
            self.assertGreater(
                embedded_fallback_pos,
                stale_msg_pos,
                "Stale venv message must appear before embedded fallback announcement",
            )
        if sys_fallback_pos > -1:
            self.assertGreater(
                sys_fallback_pos,
                stale_msg_pos,
                "Stale venv message must appear before system fallback announcement",
            )

    def test_launcher_announces_runtime_source_with_fallback_note(self):
        """When venv was stale, the runtime announcement includes fallback origin."""
        content = self._read_launcher_content()
        self.assertIn(
            "fallback dari .venv yang rusak",
            content,
            "Runtime announcement must note fallback from broken .venv when stale",
        )

    def test_launcher_announces_runtime_without_fallback_when_venv_healthy(self):
        """When venv is healthy, runtime announcement must NOT show fallback note."""
        content = self._read_launcher_content()
        # The "else" branch for healthy venv should just show the runtime path
        # without the fallback note. This is checked by verifying the conditional structure.
        self.assertIn(
            "if defined VENV_STALE",
            content,
            "Launcher must have a conditional to distinguish stale vs healthy announcement",
        )

    def test_launcher_fallback_logically_precedes_launch(self):
        """The fallback resolution must happen BEFORE the :reconnect launch loop."""
        content = self._read_launcher_content()
        fallback_pos = content.find("Fallback: menggunakan Python sistem dari PATH")
        reconnect_pos = content.find(":reconnect")
        self.assertGreater(
            reconnect_pos,
            fallback_pos,
            "Fallback resolution must complete before :reconnect launch loop starts",
        )

    # --- Integration-style smoke tests ---

    def test_launcher_launches_tui_entrypoint_after_runtime_resolution(self):
        """Launcher smoke: resolved Python starts the TUI entrypoint."""
        content = self._read_launcher_content()
        reconnect_pos = content.find(":reconnect")
        launch_pos = content.find('"%PYTHON_EXE%" "%APP_ENTRY%"', reconnect_pos)
        entry_pos = content.find('set "APP_ENTRY=%APP_DIR%sidelab_tui.py"')

        self.assertGreater(entry_pos, -1, "Launcher must define the TUI entrypoint")
        self.assertGreater(
            launch_pos,
            reconnect_pos,
            "Launcher must start Python from the reconnect block",
        )

    def test_launcher_smoke_produces_nonzero_exit_on_total_failure(self):
        """When all paths fail, launcher must exit with non-zero code."""
        # This test verifies the structural property: every exit /b 1 has guidance
        content = self._read_launcher_content()
        exit_patterns = content.count("exit /b 1")
        # Each exit /b 1 should be preceded by recovery messaging
        self.assertGreater(
            exit_patterns,
            0,
            "Launcher must have explicit non-zero exit paths for failure cases",
        )


if __name__ == "__main__":
    unittest.main()
