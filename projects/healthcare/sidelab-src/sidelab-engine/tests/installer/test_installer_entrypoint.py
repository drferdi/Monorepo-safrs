# Architected and built by codieverse+.
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent


class InstallerEntrypointTests(unittest.TestCase):
    def test_run_bat_is_primary_launcher(self):
        """run.bat adalah launcher utama dan menargetkan TUI."""
        run_bat = ROOT / "run.bat"
        self.assertTrue(run_bat.exists(), "run.bat harus ada sebagai launcher utama")
        content = run_bat.read_text(encoding="utf-8")
        self.assertIn("sidelab_tui.py", content)
        self.assertNotIn('APP_ENTRY=%APP_DIR%sidelab.py', content)

    def test_run_bat_targets_current_app_entrypoint_and_embedded_runtime(self):
        """run.bat harus referensikan venv python, embedded fallback, dan TUI."""
        run_bat = (ROOT / "run.bat").read_text(encoding="utf-8")
        self.assertIn(".venv", run_bat)
        self.assertIn("python", run_bat)
        self.assertIn("sidelab_tui.py", run_bat)
        self.assertNotIn("medgemma_chat.py", run_bat)

    def test_recovery_helpers_exist(self):
        """diagnose-sidelab.bat dan install.bat harus ada sebagai recovery helpers."""
        self.assertTrue(
            (ROOT / "diagnose-sidelab.bat").exists(),
            "diagnose-sidelab.bat harus ada untuk recovery",
        )
        self.assertTrue(
            (ROOT / "install.bat").exists(),
            "install.bat harus ada untuk instalasi ulang",
        )


if __name__ == "__main__":
    unittest.main()
