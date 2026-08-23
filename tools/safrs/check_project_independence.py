#!/usr/bin/env python3
"""Advisory structural checks for independently portable project capsules."""

from __future__ import annotations

import argparse
import json
import re
import shlex
import sys
from dataclasses import dataclass
from pathlib import Path, PureWindowsPath


ROOT = Path(__file__).resolve().parents[2]
DEPENDENCY_FIELDS = (
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
)
SKIP_DIRECTORIES = {
    ".git",
    ".next",
    ".turbo",
    ".cache",
    "node_modules",
    "dist",
    "build",
    "coverage",
    "__pycache__",
}
ROOT_COUPLING_PREFIXES = ("tools/", "scripts/", "packages/")
ROOT_METADATA_NAMES = {
    "biome.json",
    "biome.jsonc",
    "package-lock.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "turbo.json",
    "tsconfig.json",
    "yarn.lock",
}


@dataclass(frozen=True, order=True)
class Finding:
    capsule: str
    file: str
    field: str
    message: str

    def render(self) -> str:
        return f"- {self.capsule}: {self.file} [{self.field}]: {self.message}"


class UnsafeInputError(RuntimeError):
    pass


def repository_relative(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.name


def is_within(path: Path, boundary: Path) -> bool:
    try:
        path.relative_to(boundary)
        return True
    except ValueError:
        return False


def is_windows_or_posix_absolute(value: str) -> bool:
    normalized = value.replace("\\", "/")
    return (
        normalized.startswith("/")
        or normalized.startswith("//")
        or PureWindowsPath(value).is_absolute()
        or bool(re.match(r"^[A-Za-z]:", value))
    )


def path_escapes(value: str, base: Path, capsule: Path) -> bool:
    if is_windows_or_posix_absolute(value):
        return True
    candidate = (base / value.replace("\\", "/")).resolve(strict=False)
    return not is_within(candidate, capsule.resolve(strict=False))


def missing_capsule_owned_reference(value: str, base: Path) -> bool:
    normalized = value.replace("\\", "/").removeprefix("./")
    root_like = normalized.startswith(ROOT_COUPLING_PREFIXES) or Path(normalized).name in ROOT_METADATA_NAMES
    if not root_like:
        return False
    return not (base / normalized).exists()


def iter_files(capsule: Path, filename: str | None = None):
    for path in sorted(capsule.rglob("*")):
        if any(part in SKIP_DIRECTORIES for part in path.relative_to(capsule).parts):
            continue
        if not path.is_file():
            continue
        if filename is None or path.name == filename:
            yield path


def read_json(path: Path, capsule_label: str, root: Path, findings: list[Finding]):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        findings.append(
            Finding(
                capsule_label,
                repository_relative(path, root),
                "$",
                "cannot safely read valid JSON",
            )
        )
        return None


def check_contract_paths(
    contract: dict, capsule: Path, capsule_label: str, root: Path, findings: list[Finding]
):
    contract_file = capsule / "project.contract.json"
    relative_file = repository_relative(contract_file, root)

    path_fields = (
        ("artifacts", contract.get("artifacts", [])),
        ("mutableStatePaths", contract.get("mutableStatePaths", [])),
    )
    package_manager = contract.get("packageManager", {})
    lockfile = package_manager.get("lockfile") if isinstance(package_manager, dict) else None
    if isinstance(lockfile, str):
        path_fields += (("packageManager.lockfile", [lockfile]),)

    for field, values in path_fields:
        if not isinstance(values, list):
            continue
        for index, value in enumerate(values):
            if isinstance(value, str) and path_escapes(value, capsule, capsule):
                suffix = f"[{index}]" if field != "packageManager.lockfile" else ""
                findings.append(
                    Finding(
                        capsule_label,
                        relative_file,
                        f"{field}{suffix}",
                        "path escapes the capsule",
                    )
                )

    commands = contract.get("commands", {})
    if not isinstance(commands, dict):
        return
    for name, command in sorted(commands.items()):
        if not isinstance(command, dict) or command.get("program") is None:
            continue
        program = command.get("program")
        if isinstance(program, str) and any(marker in program for marker in ("/", "\\")):
            if path_escapes(program, capsule, capsule):
                findings.append(
                    Finding(
                        capsule_label,
                        relative_file,
                        f"commands.{name}.program",
                        "command path escapes the capsule",
                    )
                )
            elif missing_capsule_owned_reference(program, capsule):
                findings.append(
                    Finding(
                        capsule_label,
                        relative_file,
                        f"commands.{name}.program",
                        f"root-like reference {program} has no capsule-owned target",
                    )
                )
        args = command.get("args", [])
        if not isinstance(args, list):
            continue
        for index, argument in enumerate(args):
            if not isinstance(argument, str):
                continue
            candidate = argument.split("=", 1)[1] if argument.startswith("-") and "=" in argument else argument
            if candidate.startswith(("http://", "https://")):
                continue
            path_like = candidate in {".", ".."} or any(
                marker in candidate for marker in ("/", "\\")
            ) or Path(candidate).name in ROOT_METADATA_NAMES
            if path_like and path_escapes(candidate, capsule, capsule):
                findings.append(
                    Finding(
                        capsule_label,
                        relative_file,
                        f"commands.{name}.args[{index}]",
                        "command argument path escapes the capsule",
                    )
                )
            elif path_like and missing_capsule_owned_reference(candidate, capsule):
                findings.append(
                    Finding(
                        capsule_label,
                        relative_file,
                        f"commands.{name}.args[{index}]",
                        f"root-like reference {candidate} has no capsule-owned target",
                    )
                )

        if program == "docker" and "build" in args:
            positional = [item for item in args[args.index("build") + 1 :] if not item.startswith("-")]
            if positional:
                context = positional[-1]
                if path_escapes(context, capsule, capsule):
                    findings.append(
                        Finding(
                            capsule_label,
                            relative_file,
                            f"commands.{name}.args",
                            "Docker build context escapes the capsule",
                        )
                    )


def check_packages(capsule: Path, capsule_label: str, root: Path, findings: list[Finding]):
    manifests: list[tuple[Path, dict]] = []
    for manifest_path in iter_files(capsule, "package.json"):
        manifest = read_json(manifest_path, capsule_label, root, findings)
        if manifest is None:
            continue
        if not isinstance(manifest, dict):
            findings.append(
                Finding(
                    capsule_label,
                    repository_relative(manifest_path, root),
                    "$",
                    "package manifest must be a JSON object",
                )
            )
            continue
        manifests.append((manifest_path, manifest))

    local_names = {
        manifest.get("name")
        for _, manifest in manifests
        if isinstance(manifest.get("name"), str)
    }
    for manifest_path, manifest in manifests:
        relative_file = repository_relative(manifest_path, root)
        for dependency_field in DEPENDENCY_FIELDS:
            dependencies = manifest.get(dependency_field, {})
            if not isinstance(dependencies, dict):
                continue
            for name, specification in sorted(dependencies.items()):
                if not isinstance(specification, str):
                    continue
                field = f"{dependency_field}.{name}"
                if specification.startswith("catalog:"):
                    findings.append(
                        Finding(
                            capsule_label,
                            relative_file,
                            field,
                            "catalog dependency is not capsule-independent",
                        )
                    )
                elif specification.startswith("workspace:") and name not in local_names:
                    findings.append(
                        Finding(
                            capsule_label,
                            relative_file,
                            field,
                            f"workspace producer {name} is not inside the capsule",
                        )
                    )
                elif specification.startswith(("file:", "link:")):
                    target = specification.split(":", 1)[1]
                    if path_escapes(target, manifest_path.parent, capsule):
                        findings.append(
                            Finding(
                                capsule_label,
                                relative_file,
                                field,
                                "file/link dependency escapes the capsule",
                            )
                        )

        scripts = manifest.get("scripts", {})
        if isinstance(scripts, dict):
            for name, script in sorted(scripts.items()):
                if not isinstance(script, str):
                    continue
                for token in script.split():
                    candidate = token.strip("\"'(),;")
                    escapes = is_windows_or_posix_absolute(candidate) or (
                        ".." in candidate
                        and path_escapes(candidate, manifest_path.parent, capsule)
                    )
                    missing_local = missing_capsule_owned_reference(
                        candidate, manifest_path.parent
                    )
                    if escapes or missing_local:
                        message = (
                            "script references a path outside the capsule"
                            if escapes
                            else f"root-like reference {candidate} has no capsule-owned target"
                        )
                        findings.append(
                            Finding(
                                capsule_label,
                                relative_file,
                                f"scripts.{name}",
                                message,
                            )
                        )
                        break


def iter_string_values(value, field=""):
    if isinstance(value, str):
        yield field or "$", value
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from iter_string_values(item, f"{field}[{index}]")
    elif isinstance(value, dict):
        for key, item in sorted(value.items()):
            child = f"{field}.{key}" if field else str(key)
            yield from iter_string_values(item, child)


def is_json_config(path: Path) -> bool:
    name = path.name.lower()
    return (
        name in {"turbo.json", "biome.json"}
        or (name.startswith("tsconfig") and name.endswith(".json"))
    )


def check_json_configs(capsule: Path, capsule_label: str, root: Path, findings: list[Finding]):
    for config_path in iter_files(capsule):
        if not is_json_config(config_path):
            continue
        config = read_json(config_path, capsule_label, root, findings)
        if config is None:
            continue
        for field, value in iter_string_values(config):
            if value.startswith(("http://", "https://")):
                continue
            if (
                is_windows_or_posix_absolute(value) or ".." in value
            ) and path_escapes(value, config_path.parent, capsule):
                findings.append(
                    Finding(
                        capsule_label,
                        repository_relative(config_path, root),
                        field,
                        "configuration path escapes the capsule",
                    )
                )


def logical_docker_lines(text: str):
    current = ""
    for raw_line in text.splitlines():
        stripped = raw_line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        current = f"{current} {stripped}".strip()
        if current.endswith("\\"):
            current = current[:-1].rstrip()
            continue
        yield current
        current = ""
    if current:
        yield current


def docker_sources(remainder: str):
    if re.search(r"(?:^|\s)--from(?:=|\s)", remainder):
        return []
    without_flags = re.sub(r"^(?:--[^\s]+\s+)*", "", remainder).strip()
    if without_flags.startswith("["):
        try:
            values = json.loads(without_flags)
        except json.JSONDecodeError:
            return []
        return values[:-1] if isinstance(values, list) else []
    try:
        values = shlex.split(without_flags, posix=False)
    except ValueError:
        return []
    return [value.strip("\"'") for value in values[:-1]]


def check_dockerfiles(capsule: Path, capsule_label: str, root: Path, findings: list[Finding]):
    for dockerfile in iter_files(capsule):
        if not dockerfile.name.startswith("Dockerfile"):
            continue
        try:
            text = dockerfile.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            findings.append(
                Finding(
                    capsule_label,
                    repository_relative(dockerfile, root),
                    "$",
                    "cannot safely read Dockerfile",
                )
            )
            continue
        for line_number, line in enumerate(logical_docker_lines(text), start=1):
            match = re.match(r"^(COPY|ADD)\s+(.+)$", line, flags=re.IGNORECASE)
            if not match:
                continue
            for source in docker_sources(match.group(2)):
                if source.startswith(("http://", "https://")):
                    continue
                if path_escapes(source, capsule, capsule):
                    findings.append(
                        Finding(
                            capsule_label,
                            repository_relative(dockerfile, root),
                            f"line {line_number}",
                            f"Docker {match.group(1).upper()} source escapes the capsule",
                        )
                    )


def check_repository(root: Path) -> list[Finding]:
    if not root.is_dir() or root.is_symlink():
        raise UnsafeInputError("repository root must be a real directory")
    root = root.resolve(strict=False)
    projects = root / "projects"
    if projects.is_symlink() or (projects.exists() and not projects.is_dir()):
        raise UnsafeInputError("projects root must be a real directory")

    contracts = [] if not projects.exists() else sorted(projects.glob("*/*/project.contract.json"))
    findings: list[Finding] = []
    for contract_path in contracts:
        capsule = contract_path.parent.resolve(strict=False)
        if contract_path.is_symlink() or not is_within(capsule, projects.resolve(strict=False)):
            findings.append(
                Finding(
                    contract_path.parent.as_posix(),
                    repository_relative(contract_path, root),
                    "$",
                    "contract path is not safely contained",
                )
            )
            continue
        fallback_label = contract_path.parent.relative_to(projects).as_posix()
        contract = read_json(contract_path, fallback_label, root, findings)
        if contract is None:
            continue
        if not isinstance(contract, dict):
            findings.append(
                Finding(
                    fallback_label,
                    repository_relative(contract_path, root),
                    "$",
                    "contract must be a JSON object",
                )
            )
            continue
        capsule_label = contract.get("id") if isinstance(contract.get("id"), str) else fallback_label
        check_contract_paths(contract, capsule, capsule_label, root, findings)
        check_packages(capsule, capsule_label, root, findings)
        check_json_configs(capsule, capsule_label, root, findings)
        check_dockerfiles(capsule, capsule_label, root, findings)
    return sorted(set(findings))


def active_capsule_count(root: Path) -> int:
    projects = root / "projects"
    return 0 if not projects.exists() else len(list(projects.glob("*/*/project.contract.json")))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    arguments = parser.parse_args(argv)
    try:
        findings = check_repository(arguments.root)
        count = active_capsule_count(arguments.root.resolve(strict=False))
    except UnsafeInputError as error:
        print(f"SAFRS project independence unavailable: {error}", file=sys.stderr)
        return 2
    if findings:
        print("SAFRS project independence failed:", file=sys.stderr)
        for finding in findings:
            print(finding.render(), file=sys.stderr)
        return 1
    print(f"SAFRS project independence: OK ({count} active capsules)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
