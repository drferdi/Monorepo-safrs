"""Uji dry-run untuk skrip PowerShell (dilewati bila pwsh tidak tersedia)."""

import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
# Skrip kanonik ditulis untuk pwsh (PowerShell 7); Windows PowerShell 5.1
# dipakai sebagai cadangan agar uji tetap berjalan di mesin tanpa pwsh.
PS = shutil.which("pwsh") or shutil.which("powershell")


class TestScriptExists(unittest.TestCase):
    def test_test_ps1_ada(self):
        self.assertTrue((REPO_ROOT / "scripts" / "test.ps1").exists())


@unittest.skipUnless(PS, "pwsh/powershell tidak tersedia di lingkungan ini")
class SyncProfileWhatIfTests(unittest.TestCase):
    def test_whatif_tidak_menyalin_apa_pun(self):
        with tempfile.TemporaryDirectory() as d:
            temp_root = Path(d)
            scripts_dir = temp_root / "scripts"
            scripts_dir.mkdir(parents=True)
            shutil.copy2(
                REPO_ROOT / "scripts" / "sync-profile-to-repo.ps1",
                scripts_dir / "sync-profile-to-repo.ps1",
            )

            manifest_dir = temp_root / "ai" / "profiles" / "avery"
            manifest_dir.mkdir(parents=True)
            shutil.copy2(
                REPO_ROOT / "ai" / "profiles" / "avery" / "custom-skills.json",
                manifest_dir / "custom-skills.json",
            )

            profile_dir = temp_root / "runtime" / "hermes-home" / "profiles" / "avery"
            (profile_dir).mkdir(parents=True)
            (profile_dir / "SOUL.md").write_text("persona uji\n", encoding="utf-8")
            skill_dir = profile_dir / "skills" / "avery-self-check"
            skill_dir.mkdir(parents=True)
            (skill_dir / "SKILL.md").write_text("# self check\n", encoding="utf-8")

            result = subprocess.run(
                [
                    PS,
                    "-NoProfile",
                    "-File",
                    str(scripts_dir / "sync-profile-to-repo.ps1"),
                    "-WhatIf",
                ],
                cwd=str(temp_root),
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)

            target_dir = temp_root / "ai" / "profiles" / "avery"
            files = list(target_dir.rglob("*")) if target_dir.exists() else []
            files = [f for f in files if f.is_file() and f.name != "custom-skills.json"]
            self.assertEqual(files, [])
            self.assertFalse(list(temp_root.glob("ai/profiles/avery.bak-*")))


if __name__ == "__main__":
    unittest.main()
