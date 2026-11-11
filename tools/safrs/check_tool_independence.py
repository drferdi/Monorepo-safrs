#!/usr/bin/env python3
"""Companion structural gate for explicitly declared standalone tools.

Reuses the existing project checker without changing its project coverage.
Framework components are documented dependencies, not standalone app claims.
"""

import argparse
import re
from pathlib import Path

import check_project_independence as checks


def inspect_tools(root):
    if not root.is_dir() or root.is_symlink():
        raise checks.UnsafeInputError("repository root must be a real directory")
    root = root.resolve()
    tools = root / "tools"
    findings = []
    if not tools.exists() and not tools.is_symlink():
        return findings, 0
    if tools.is_symlink() or not tools.is_dir():
        raise checks.UnsafeInputError("tools root must be a real directory")
    declared = set()
    registry = tools / "standalone-tools.json"
    if registry.exists() or registry.is_symlink():
        if registry.is_symlink() or not registry.is_file():
            raise checks.UnsafeInputError("standalone-tools.json must be a real file")
        data = checks.read_json(registry, "tools", root, findings)
        if not isinstance(data, dict) or data.get("schemaVersion") != 1 or not isinstance(data.get("tools"), list):
            raise checks.UnsafeInputError("standalone-tools.json must declare schemaVersion 1 and a tools list")
        for name in data["tools"]:
            if not isinstance(name, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]*", name) or name in declared:
                raise checks.UnsafeInputError("standalone tool names must be unique safe directory names")
            declared.add(name)
    for candidate in tools.iterdir():
        if (candidate / "project.contract.json").exists() or (candidate / "project.contract.json").is_symlink():
            declared.add(candidate.name)
    for name in sorted(declared):
        label = f"tools/{name}"
        tool = tools / name
        contract_path = tool / "project.contract.json"
        if tool.is_symlink() or not tool.is_dir() or not checks.is_within(tool.resolve(), tools.resolve()):
            findings.append(checks.Finding(label, label, "$", "tool must be a real directory contained by tools"))
            continue
        if contract_path.is_symlink() or not contract_path.is_file():
            findings.append(checks.Finding(label, label, "$", "standalone tool requires a real project.contract.json"))
            continue
        contract = checks.read_json(contract_path, label, root, findings)
        if not isinstance(contract, dict) or contract.get("id") != label:
            findings.append(checks.Finding(label, label, "id", f"contract id must equal {label}"))
            continue
        files = checks.walk_capsule(tool)
        checks.check_contract_paths(contract, tool, label, root, findings)
        checks.check_packages(tool, files, label, root, findings)
        checks.check_json_configs(tool, files, label, root, findings)
        checks.check_dockerfiles(tool, files, label, root, findings)
    return findings, len(declared)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    try:
        findings, count = inspect_tools(args.root)
    except checks.UnsafeInputError as error:
        print(f"SAFRS standalone tool independence failed: {error}")
        return 1
    if findings:
        print("SAFRS standalone tool independence failed:")
        for finding in sorted(findings):
            print(finding.render())
        return 1
    print(f"SAFRS standalone tool independence: OK ({count} standalone tools)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
