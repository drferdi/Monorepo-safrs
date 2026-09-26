#!/usr/bin/env python3
import copy
import json
import os
import re
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
CONTRACT_SCHEMA = ROOT / ".safrs" / "schemas" / "project-contract.schema.json"
PATH_VECTORS = ROOT / "tools" / "safrs" / "fixtures" / "path-classification.json"


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
        (self.capsule / "biome.jsonc").write_text(
            '{\n  // Capsule-local JSONC is valid.\n  "files": {"includes": ["scripts/**"]}\n}\n',
            encoding="utf-8",
        )
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

    def test_contract_schema_requires_capsule_relative_paths(self):
        schema = json.loads(CONTRACT_SCHEMA.read_text(encoding="utf-8"))
        relative_path = schema["$defs"]["capsuleRelativePath"]
        pattern = next(item["pattern"] for item in relative_path["allOf"] if "pattern" in item)

        self.assertEqual(
            schema["properties"]["artifacts"]["items"],
            {"$ref": "#/$defs/capsuleRelativePath"},
        )
        self.assertEqual(
            schema["properties"]["mutableStatePaths"]["items"],
            {"$ref": "#/$defs/capsuleRelativePath"},
        )
        self.assertEqual(
            schema["$defs"]["packageManager"]["properties"]["lockfile"],
            {"$ref": "#/$defs/nullableCapsuleRelativePath"},
        )
        for valid in ("dist", "dist/app.txt", ".cache/state", "pnpm-lock.yaml"):
            self.assertIsNotNone(re.search(pattern, valid), valid)
        for invalid in (
            "/outside",
            "C:\\outside",
            "\\\\server\\share",
            "file:///outside",
            "../outside",
            "nested/../../outside",
            ".",
            "..",
        ):
            self.assertIsNone(re.search(pattern, invalid), invalid)

    def test_attached_command_argument_paths_cannot_escape(self):
        contract = self.read_json("project.contract.json")
        contract["commands"]["install"]["args"] = ["--config:C:\\outside"]
        contract["commands"]["test"]["args"] = ["-C../outside"]
        contract["commands"]["build"]["args"] = ["@C:\\outside\\build.json"]
        self.write_json("project.contract.json", contract)
        result = self.run_checker()
        self.assertEqual(result.returncode, 1)
        self.assertIn("commands.install.args[0]", result.stderr)
        self.assertIn("commands.test.args[0]", result.stderr)
        self.assertIn("commands.build.args[0]", result.stderr)

    def test_command_arguments_follow_shared_path_classification_vectors(self):
        vectors = json.loads(PATH_VECTORS.read_text(encoding="utf-8"))
        contract = self.read_json("project.contract.json")
        contract["commands"]["build"]["args"] = [vector["value"] for vector in vectors]
        self.write_json("project.contract.json", contract)
        result = self.run_checker()
        mismatches = [
            vector["value"]
            for index, vector in enumerate(vectors)
            if (f"[commands.build.args[{index}]]:" in result.stderr)
            != (vector["expect"] == "reject")
        ]
        self.assertEqual(mismatches, [], result.stderr)

    def test_contract_fields_reject_parent_segments_and_nul(self):
        contract = self.read_json("project.contract.json")
        contract["artifacts"] = ["dist/..", "dist\0x"]
        contract["mutableStatePaths"] = ["state\\..\\cache"]
        contract["commands"]["test"]["program"] = "node\0"
        self.write_json("project.contract.json", contract)
        result = self.run_checker()
        self.assertEqual(result.returncode, 1, result.stderr)
        for field in (
            "[artifacts[0]]:",
            "[artifacts[1]]:",
            "[mutableStatePaths[0]]:",
            "[commands.test.program]:",
        ):
            self.assertIn(field, result.stderr)

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

    def test_absolute_script_and_config_paths_cannot_escape(self):
        package = self.read_json("package.json")
        package["scripts"] = {"unsafe": "node /outside/tool.mjs"}
        self.write_json("package.json", package)
        (self.capsule / "tsconfig.absolute.json").write_text(
            json.dumps({"extends": "C:\\outside\\tsconfig.json"}) + "\n",
            encoding="utf-8",
        )
        result = self.run_checker()
        self.assertEqual(result.returncode, 1)
        self.assertIn("scripts.unsafe", result.stderr)
        self.assertIn("tsconfig.absolute.json [extends]", result.stderr)

    def test_dangling_projects_symlink_is_rejected(self):
        shutil.rmtree(self.fixture_root / "projects")
        try:
            os.symlink(
                self.fixture_root / "missing-projects-target",
                self.fixture_root / "projects",
                target_is_directory=True,
            )
        except OSError as error:
            self.skipTest(f"symlinks unavailable: {error}")
        result = self.run_checker()
        self.assertEqual(result.returncode, 2)
        self.assertIn("projects root must be a real directory", result.stderr)

    def test_contract_and_package_manifests_must_be_json_objects(self):
        self.write_json("project.contract.json", [])
        result = self.run_checker()
        self.assertEqual(result.returncode, 1)
        self.assertIn("contract must be a JSON object", result.stderr)

        valid_contract = json.loads(
            (FIXTURE / CAPSULE_RELATIVE / "project.contract.json").read_text(
                encoding="utf-8"
            )
        )
        self.write_json("project.contract.json", valid_contract)
        self.write_json("package.json", [])
        result = self.run_checker()
        self.assertEqual(result.returncode, 1)
        self.assertIn("package manifest must be a JSON object", result.stderr)

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

    # ADR 0007 decision 1: coverage is fail-closed.

    def write_known(self, entries, version=1):
        path = self.fixture_root / ".safrs" / "known-nonconformance.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps({"version": version, "entries": entries}, indent=2) + "\n",
            encoding="utf-8",
        )

    def reference(self):
        document = self.fixture_root / "docs" / "adrs" / "0007.md"
        document.parent.mkdir(parents=True, exist_ok=True)
        document.write_text("# ADR\n", encoding="utf-8")
        return "docs/adrs/0007.md"

    def entry(self, capsule, **overrides):
        value = {
            "capsule": capsule,
            "reason": "Fixture capsule without a contract.",
            "reference": self.reference(),
            "owner": "Chief",
            "reviewBy": "2999-12-31",
        }
        value.update(overrides)
        return value

    def add_uncontracted_capsule(self, relative="projects/product/legacy"):
        capsule = self.fixture_root / relative
        capsule.mkdir(parents=True)
        (capsule / "README.md").write_text("# Legacy\n", encoding="utf-8")
        return capsule

    def test_capsule_without_contract_or_entry_fails(self):
        self.add_uncontracted_capsule()
        result = self.run_checker()
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn(
            "product/legacy: projects/product/legacy [$]: capsule has neither "
            "project.contract.json nor a known-nonconformance entry",
            result.stderr,
        )

    def test_empty_capsule_directory_is_still_a_capsule(self):
        (self.fixture_root / "projects" / "product" / "empty").mkdir()
        result = self.run_checker()
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("product/empty", result.stderr)

    def test_recorded_capsule_without_contract_passes_and_is_counted(self):
        self.add_uncontracted_capsule()
        self.write_known([self.entry("product/legacy")])
        result = self.run_checker()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            result.stdout.strip(),
            "SAFRS project independence: OK (1 active capsules, 1 known non-conformance)",
        )

    def test_template_domain_and_domain_files_are_not_capsules(self):
        template = self.fixture_root / "projects" / "_template" / "docs"
        template.mkdir(parents=True)
        (self.fixture_root / "projects" / "product" / "AGENTS.md").write_text(
            "# Domain\n", encoding="utf-8"
        )
        result = self.run_checker()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_entry_for_missing_directory_fails(self):
        self.write_known([self.entry("product/gone")])
        result = self.run_checker()
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("product/gone", result.stderr)
        self.assertIn("entry names a capsule directory that does not exist", result.stderr)

    def test_entry_for_contracted_capsule_fails(self):
        self.write_known([self.entry("product/portable")])
        result = self.run_checker()
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("entry names a capsule that has project.contract.json", result.stderr)

    def test_malformed_known_nonconformance_fails(self):
        self.add_uncontracted_capsule()
        base = self.entry("product/legacy")
        cases = {
            "missing field": [{k: v for k, v in base.items() if k != "reviewBy"}],
            "extra field": [dict(base, waiver=True)],
            "empty reason": [dict(base, reason=" ")],
            "bad date": [dict(base, reviewBy="31-12-2026")],
            "impossible date": [dict(base, reviewBy="2026-02-30")],
            "parent segment": [dict(base, capsule="../legacy")],
            "template": [dict(base, capsule="_template/legacy")],
            "missing reference": [dict(base, reference="docs/missing.md")],
            "escaping reference": [dict(base, reference="../outside.md")],
            "duplicate": [base, dict(base)],
            "not an object": ["product/legacy"],
        }
        for label, entries in cases.items():
            with self.subTest(label=label):
                self.write_known(entries)
                result = self.run_checker()
                self.assertEqual(result.returncode, 1, result.stdout)
                self.assertIn("known-nonconformance", result.stderr)
        with self.subTest(label="version"):
            self.write_known([base], version=2)
            self.assertEqual(self.run_checker().returncode, 1)
        with self.subTest(label="invalid JSON"):
            (self.fixture_root / ".safrs" / "known-nonconformance.json").write_text(
                "{", encoding="utf-8"
            )
            self.assertEqual(self.run_checker().returncode, 1)

    def test_overdue_review_date_warns_without_failing(self):
        self.add_uncontracted_capsule()
        self.write_known([self.entry("product/legacy", reviewBy="2000-01-01")])
        result = self.run_checker()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("warning", result.stderr.lower())
        self.assertIn("product/legacy", result.stderr)
        self.assertIn("2000-01-01", result.stderr)

    def test_capsule_nested_one_level_deeper_is_not_covered_by_its_contract(self):
        nested = self.fixture_root / "projects" / "product" / "group" / "inner"
        shutil.copytree(self.capsule, nested)
        result = self.run_checker()
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("product/group", result.stderr)

    def test_symlinked_capsule_directory_is_rejected(self):
        target = self.fixture_root / "elsewhere"
        target.mkdir()
        try:
            os.symlink(target, self.fixture_root / "projects" / "product" / "linked",
                       target_is_directory=True)
        except OSError as error:
            self.skipTest(f"symlinks unavailable: {error}")
        self.write_known([self.entry("product/linked")])
        result = self.run_checker()
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("capsule directory is a symbolic link", result.stderr)

    def test_skipped_directories_are_pruned_from_traversal(self):
        blocked = self.capsule / "node_modules" / "pkg"
        blocked.mkdir(parents=True)
        (blocked / "package.json").write_text(
            json.dumps({"name": "pkg", "dependencies": {"x": "catalog:"}}), encoding="utf-8"
        )
        result = self.run_checker()
        self.assertEqual(result.returncode, 0, result.stderr)

    def init_git(self):
        subprocess.run(["git", "init", "-q", str(self.fixture_root)], check=True)

    def test_git_ignored_files_are_not_checked(self):
        # A capsule's ignored local runtime (avery runtime/, 3 GB of third-party files) is not
        # capsule source; its invalid tsconfig files must not fail the checker.
        self.init_git()
        (self.capsule / ".gitignore").write_text("runtime/\n", encoding="utf-8")
        vendor = self.capsule / "runtime" / "vendor"
        vendor.mkdir(parents=True)
        (vendor / "tsconfig.json").write_text("{ not json", encoding="utf-8")
        result = self.run_checker()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_untracked_files_that_git_does_not_ignore_are_still_checked(self):
        self.init_git()
        extra = self.capsule / "extra"
        extra.mkdir()
        (extra / "tsconfig.json").write_text("{ not json", encoding="utf-8")
        result = self.run_checker()
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertIn("cannot safely read valid JSON", result.stderr)

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
