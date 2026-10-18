import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHECKER = ROOT / "tools/safrs/check_capsule_remotes.py"
CONTRACT_SCHEMA = ROOT / ".safrs/schemas/project-contract.schema.json"


def load_checker():
    spec = importlib.util.spec_from_file_location("check_capsule_remotes", CHECKER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CapsuleRemoteTests(unittest.TestCase):
    def inspect(self, root):
        return subprocess.run([sys.executable, str(CHECKER), "--root", str(root)], check=False, capture_output=True, text=True)

    def capsule(self, root, capsule_id, repository=None):
        contract = {"id": capsule_id}
        if repository is not None:
            contract["repository"] = repository
        path = root / "projects" / capsule_id
        path.mkdir(parents=True)
        (path / "project.contract.json").write_text(json.dumps(contract), encoding="utf-8")

    def test_valid_https_and_ssh_remotes_pass(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.capsule(root, "healthcare/sentrapedia", "git@github.com:drferdi/Sentrapedia.git")
            self.capsule(root, "healthcare/medboard", "https://github.com/drferdi/Medboard")
            result = self.inspect(root)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("2 capsules, 2 declared", result.stdout)
            self.assertNotIn("WARNING", result.stdout)

    def test_missing_remote_is_a_warning(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.capsule(root, "internal/unicom")
            result = self.inspect(root)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("WARNING", result.stdout)
            self.assertIn("internal/unicom", result.stdout)

    def test_root_monorepo_remote_is_rejected(self):
        for remote in (
            "git@github.com:drferdi/Monorepo-safrs.git",
            "https://github.com/drferdi/monorepo-safrs",
            "https://GitHub.com/DrFerdi/Monorepo-SAFRS.git",
        ):
            with self.subTest(remote=remote), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                self.capsule(root, "internal/unicom", remote)
                result = self.inspect(root)
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                self.assertIn("root monorepo", result.stdout)

    def test_empty_placeholder_and_malformed_remotes_are_rejected(self):
        for remote in ("", "TODO", "<repository>", "github.com/drferdi/x", "https://token@github.com/drferdi/x.git", 42):
            with self.subTest(remote=remote), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                self.capsule(root, "internal/unicom", remote)
                result = self.inspect(root)
                self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
                self.assertIn("internal/unicom", result.stdout)

    def test_schema_declares_the_checker_pattern_as_optional(self):
        schema = json.loads(CONTRACT_SCHEMA.read_text(encoding="utf-8"))
        self.assertEqual(schema["properties"]["repository"]["pattern"], load_checker().REPOSITORY_PATTERN)
        self.assertNotIn("repository", schema["required"])


if __name__ == "__main__":
    unittest.main()
