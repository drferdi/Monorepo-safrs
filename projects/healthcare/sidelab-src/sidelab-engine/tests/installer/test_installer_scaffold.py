# Architected and built by codieverse+.
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent


class InstallerScaffoldTests(unittest.TestCase):
    def test_installer_scaffold_files_exist(self):
        expected = [
            ROOT / "installer" / "sidelab.iss",
            ROOT / "installer" / "build-installer.ps1",
            ROOT / "installer" / "fetch-runtime-assets.ps1",
            ROOT / "installer" / "post_install.ps1",
            ROOT / "installer" / "first_run.ps1",
            ROOT / "installer" / "ensure_ollama.ps1",
            ROOT / "installer" / "ensure_model.ps1",
            ROOT / "installer" / "README-BUILD-INSTALLER.md",
        ]
        for path in expected:
            self.assertTrue(path.exists(), f"Missing installer scaffold file: {path}")

    def test_inno_script_references_payload_and_shortcuts(self):
        script = (ROOT / "installer" / "sidelab.iss").read_text(encoding="utf-8")
        self.assertIn("AppName=SIDELAB", script)
        self.assertIn("OutputBaseFilename=SIDELAB-SETUP", script)
        self.assertIn("SIDELAB.bat", script)
        self.assertIn("diagnose-sidelab.bat", script)

    def test_fetch_script_mentions_official_runtime_urls(self):
        script = (ROOT / "installer" / "fetch-runtime-assets.ps1").read_text(
            encoding="utf-8"
        )
        self.assertIn("python-3.14.4-embed-amd64.zip", script)
        self.assertIn("https://bootstrap.pypa.io/pip/get-pip.py", script)
        self.assertIn("https://ollama.com/download/OllamaSetup.exe", script)

    def test_build_script_stages_ollama_installer_before_compile(self):
        script = (ROOT / "installer" / "build-installer.ps1").read_text(
            encoding="utf-8"
        )
        self.assertIn("OllamaSetup.staged.exe", script)
        self.assertIn(
            "Copy-Item -Force $OllamaInstallerPath $stagedOllamaInstaller", script
        )
        self.assertIn('"sidelab"', script)
        self.assertIn('default_model = "deepseek-v4-flash"', script)

    def test_build_guide_mentions_python_embed_wheelhouse_and_assets(self):
        guide = (ROOT / "installer" / "README-BUILD-INSTALLER.md").read_text(
            encoding="utf-8"
        )
        self.assertIn("python-embed", guide)
        self.assertIn("wheelhouse", guide)
        self.assertIn("sidelab.ico", guide)
        self.assertIn("codieverse.png", guide)

    def test_env_example_mentions_deepseek(self):
        env_example = (ROOT / ".env.example").read_text(encoding="utf-8")
        self.assertIn("SIDELAB_DEFAULT_BACKEND=deepseek", env_example)
        self.assertIn("DEEPSEEK_MODEL=deepseek-v4-flash", env_example)
        self.assertIn("DEEPSEEK_API_KEY=", env_example)


if __name__ == "__main__":
    unittest.main()
