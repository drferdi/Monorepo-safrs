import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


CHECKER = Path(__file__).resolve().parents[2] / "tools/safrs/check_tool_independence.py"


class ToolIndependenceTests(unittest.TestCase):
    def inspect(self, root):
        return subprocess.run([sys.executable, str(CHECKER), "--root", str(root)], capture_output=True, text=True)

    def fixture(self, root):
        tool = root / "tools/prompt"
        tool.mkdir(parents=True)
        (root / "tools/standalone-tools.json").write_text(json.dumps({"schemaVersion": 1, "tools": ["prompt"]}), encoding="utf-8")
        return tool

    def test_declared_tool_requires_a_contract(self):
        with tempfile.TemporaryDirectory() as directory:
            result = self.inspect(Path(directory))
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.fixture(Path(directory))
            result = self.inspect(Path(directory))
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("project.contract.json", result.stdout + result.stderr)

    def test_tool_root_dependency_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            tool = self.fixture(root)
            (tool / "project.contract.json").write_text(json.dumps({"id": "tools/prompt"}), encoding="utf-8")
            (tool / "package.json").write_text(json.dumps({"dependencies": {"bad": "file:../../packages/bad"}}), encoding="utf-8")
            result = self.inspect(root)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("bad", result.stdout + result.stderr)

    def test_local_tool_passes_and_wrong_identity_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            tool = self.fixture(root)
            contract = tool / "project.contract.json"
            contract.write_text(json.dumps({"id": "tools/prompt"}), encoding="utf-8")
            result = self.inspect(root)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("1 standalone tools", result.stdout)
            contract.write_text(json.dumps({"id": "internal/prompt"}), encoding="utf-8")
            result = self.inspect(root)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("tools/prompt", result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
