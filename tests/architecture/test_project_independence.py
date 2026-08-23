#!/usr/bin/env python3
import copy
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CHECKER = ROOT / "tools" / "safrs" / "check_project_independence.py"
FIXTURE = ROOT / "tests" / "fixtures" / "project-independence" / "valid"
CAPSULE_RELATIVE = Path("projects/product/portable")


class ProjectIndependenceTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.fixture_root = Path(self.temporary.name) / "repository"
        shutil.copytree(FIXTURE, self.fixture_root)
        self.capsule = self.fixture_root / CAPSULE_RELATIVE

    def tearDown(self):
        self.temporary.cleanup()

    def run_checker(self):
        return subprocess.run(
            [sys.executable, str(CHECKER), "--root", str(self.fixture_root)],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )

    def read_json(self, relative):
        return json.loads((self.capsule / relative).read_text(encoding="utf-8"))

    def write_json(self, relative, value):
        (self.capsule / relative).write_text(
            json.dumps(value, indent=2) + "\n", encoding="utf-8"
        )

    def test_zero_active_contracts_is_a_deterministic_pass(self):
        shutil.rmtree(self.fixture_root / "projects")
        (self.fixture_root / "projects").mkdir()
        result = self.run_checker()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            result.stdout.strip(), "SAFRS project independence: OK (0 active capsules)"
        )

    def test_capsule_local_workspace_registry_and_external_dependencies_pass(self):
        result = self.run_checker()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("OK (1 active capsules)", result.stdout)

    def test_catalog_dependency_is_rejected(self):
        package = self.read_json("package.json")
        package["dependencies"]["left-pad"] = "catalog:"
        self.write_json("package.json", package)
        result = self.run_checker()
        self.assertEqual(result.returncode, 1)
        self.assertIn("catalog dependency", result.stderr)

    def test_workspace_dependency_requires_a_capsule_local_producer(self):
        package = self.read_json("package.json")
        package["dependencies"]["@portable/missing"] = "workspace:*"
        self.write_json("package.json", package)
        result = self.run_checker()
        self.assertEqual(result.returncode, 1)
        self.assertIn("workspace producer", result.stderr)
        self.assertIn("@portable/missing", result.stderr)

    def test_file_and_link_dependencies_cannot_escape_declaring_package(self):
        package = self.read_json("package.json")
        package["dependencies"]["escaped-file"] = "file:../../../../outside"
        package["dependencies"]["escaped-link"] = "link:C:\\outside"
        self.write_json("package.json", package)
        result = self.run_checker()
        self.assertEqual(result.returncode, 1)
        self.assertIn("escaped-file", result.stderr)
        self.assertIn("escaped-link", result.stderr)

    def test_contract_artifact_mutable_and_command_paths_cannot_escape(self):
        contract = self.read_json("project.contract.json")
        contract["artifacts"] = ["../outside-artifact"]
        contract["mutableStatePaths"] = ["C:\\outside-state"]
        contract["commands"]["install"] = {
            "program": "../../../../tools/safrs/install.py",
            "args": ["../../../pnpm-lock.yaml"],
        }
        self.write_json("project.contract.json", contract)
        result = self.run_checker()
        self.assertEqual(result.returncode, 1)
        self.assertIn("artifacts[0]", result.stderr)
        self.assertIn("mutableStatePaths[0]", result.stderr)
        self.assertIn("commands.install.program", result.stderr)

    def test_root_tool_and_script_names_require_capsule_owned_targets(self):
        contract = self.read_json("project.contract.json")
        contract["commands"]["install"]["args"] = ["tools/safrs/root-only.py"]
        contract["commands"]["test"] = {
            "program": "tools/safrs/root-test.py",
            "args": [],
        }
        self.write_json("project.contract.json", contract)
        package = self.read_json("package.json")
        package["scripts"] = {"governance": "node scripts/safrs-verify.mjs"}
        self.write_json("package.json", package)
        result = self.run_checker()
        self.assertEqual(result.returncode, 1)
        self.assertIn("tools/safrs/root-only.py", result.stderr)
        self.assertIn("commands.test.program", result.stderr)
        self.assertIn("scripts.governance", result.stderr)

    def test_root_config_names_and_config_extends_require_capsule_ownership(self):
        contract = self.read_json("project.contract.json")
        contract["commands"]["install"]["args"] = ["--config=turbo.json"]
        self.write_json("project.contract.json", contract)
        (self.capsule / "tsconfig.json").write_text(
            json.dumps({"extends": "../../../../tsconfig.json"}) + "\n",
            encoding="utf-8",
        )
        result = self.run_checker()
        self.assertEqual(result.returncode, 1)
        self.assertIn("turbo.json", result.stderr)
        self.assertIn("tsconfig.json [extends]", result.stderr)

    def test_docker_build_context_cannot_escape_capsule(self):
        contract = self.read_json("project.contract.json")
        contract["commands"]["deployDryRun"]["args"] = ["build", "--check", ".."]
        self.write_json("project.contract.json", contract)
        result = self.run_checker()
        self.assertEqual(result.returncode, 1)
        self.assertIn("Docker build context", result.stderr)

    def test_docker_copy_and_add_sources_cannot_escape_but_copy_from_is_allowed(self):
        (self.capsule / "Dockerfile").write_text(
            "FROM node:24-alpine AS builder\n"
            "COPY --from=builder /app/dist ./dist\n"
            "COPY ../outside ./outside\n"
            "ADD C:\\\\outside ./windows-outside\n",
            encoding="utf-8",
        )
        result = self.run_checker()
        self.assertEqual(result.returncode, 1)
        findings = [line for line in result.stderr.splitlines() if line.startswith("- ")]
        self.assertEqual(len(findings), 2, result.stderr)
        self.assertIn("Dockerfile", result.stderr)

    def test_multiple_findings_are_sorted_and_repeatable(self):
        contract = self.read_json("project.contract.json")
        contract["artifacts"] = ["../z", "../a"]
        contract["mutableStatePaths"] = ["/outside"]
        self.write_json("project.contract.json", contract)
        first = self.run_checker()
        second = self.run_checker()
        self.assertEqual(first.returncode, 1)
        self.assertEqual(first.stderr, second.stderr)
        findings = [line for line in first.stderr.splitlines() if line.startswith("- ")]
        self.assertEqual(findings, sorted(findings))


if __name__ == "__main__":
    unittest.main()
