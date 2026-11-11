#!/usr/bin/env python3
"""Blocking structural checks for independently portable project capsules.

Coverage is fail-closed (ADR 0007 decision 1): every projects/<domain>/<capsule>/
directory except projects/_template has a project.contract.json or an entry in
.safrs/known-nonconformance.json. Traversal prunes skipped directories in place and
walks each capsule once (ADR 0007 decision 2).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path, PureWindowsPath
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[2]
PACKAGE_PROTOCOL = re.compile(r"^(?:file|link|portal|workspace):")
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
KNOWN_NONCONFORMANCE = ".safrs/known-nonconformance.json"
KNOWN_LABEL = "known-nonconformance"
ENTRY_FIELDS = ("capsule", "reason", "reference", "owner", "reviewBy")
CAPSULE_ID = re.compile(r"^[a-z0-9][a-z0-9-]*/[a-z0-9][a-z0-9_.-]*$")
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
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
        or (bool(re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", value)) and bool(re.search(r"[/\\]", value)))
    )


def credentialed_url(value: str) -> bool:
    try:
        parts = urlsplit(value)
    except ValueError:
        return False
    return bool(parts.username or parts.password)


def path_escapes(value: str, base: Path, capsule: Path) -> bool:
    value = PACKAGE_PROTOCOL.sub("", value, count=1)
    if is_windows_or_posix_absolute(value):
        return True
    candidate = (base / value.replace("\\", "/")).resolve(strict=False)
    return not is_within(candidate, capsule.resolve(strict=False))


def contract_path_rejected(value: str, base: Path, capsule: Path) -> bool:
    if "\0" in value:
        return True
    target = PACKAGE_PROTOCOL.sub("", value, count=1)
    if ".." in target.replace("\\", "/").split("/"):
        return True
    return path_escapes(value, base, capsule)


def missing_capsule_owned_reference(value: str, base: Path) -> bool:
    normalized = value.replace("\\", "/").removeprefix("./")
    root_like = normalized.startswith(ROOT_COUPLING_PREFIXES) or Path(normalized).name in ROOT_METADATA_NAMES
    if not root_like:
        return False
    return not (base / normalized).exists()


def argument_path_candidates(argument: str):
    candidates = [argument]
    if argument.startswith("-"):
        for separator in ("=", ":"):
            index = argument.find(separator)
            if 0 <= index < len(argument) - 1:
                candidates.append(argument[index + 1 :])
        short_flag = re.match(r"^-[A-Za-z](.+)$", argument)
        if short_flag:
            candidates.append(short_flag.group(1))

    seen = set()
    for candidate in candidates:
        path_candidate = candidate[1:] if candidate.startswith("@") else candidate
        if path_candidate not in seen:
            seen.add(path_candidate)
            yield path_candidate


def git_capsule_files(capsule: Path) -> list[Path] | None:
    """Tracked and untracked files git does not ignore, or None outside a git work tree.

    Ignored local state (for example a capsule's downloaded runtime) is not capsule source.
    """
    try:
        result = subprocess.run(
            ["git", "-C", str(capsule), "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
            capture_output=True,
            check=False,
        )
    except OSError:
        return None
    if result.returncode != 0:
        return None
    files = set()
    for name in result.stdout.decode("utf-8").split("\0"):
        if not name or SKIP_DIRECTORIES.intersection(Path(name).parts[:-1]):
            continue
        path = capsule / name
        if path.is_file():
            files.add(path)
    return sorted(files)


def walk_capsule(capsule: Path) -> list[Path]:
    """Every regular file in the capsule, found in one pass that never enters skipped directories."""
    git_files = git_capsule_files(capsule)
    if git_files is not None:
        return git_files
    files = []
    for directory, directory_names, file_names in os.walk(capsule):
        directory_names[:] = sorted(name for name in directory_names if name not in SKIP_DIRECTORIES)
        for name in file_names:
            path = Path(directory) / name
            if path.is_file():
                files.append(path)
    return sorted(files)


def iter_files(files: list[Path], filename: str | None = None):
    for path in files:
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
            if isinstance(value, str) and contract_path_rejected(value, capsule, capsule):
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
        if isinstance(program, str) and "\0" in program:
            findings.append(
                Finding(
                    capsule_label,
                    relative_file,
                    f"commands.{name}.program",
                    "command program contains NUL",
                )
            )
        elif isinstance(program, str) and any(marker in program for marker in ("/", "\\")):
            if contract_path_rejected(program, capsule, capsule):
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
            if "\0" in argument:
                findings.append(
                    Finding(
                        capsule_label,
                        relative_file,
                        f"commands.{name}.args[{index}]",
                        "command argument contains NUL",
                    )
                )
                continue
            for candidate in argument_path_candidates(argument):
                if credentialed_url(candidate):
                    findings.append(
                        Finding(
                            capsule_label,
                            relative_file,
                            f"commands.{name}.args[{index}]",
                            "command argument embeds URL credentials",
                        )
                    )
                    break
                if candidate.startswith(("http://", "https://")):
                    continue
                path_like = (
                    candidate in {".", ".."}
                    or any(marker in candidate for marker in ("/", "\\"))
                    or bool(re.match(r"^[A-Za-z]:", candidate))
                    or bool(PACKAGE_PROTOCOL.match(candidate))
                    or Path(candidate).name in ROOT_METADATA_NAMES
                )
                if path_like and contract_path_rejected(candidate, capsule, capsule):
                    findings.append(
                        Finding(
                            capsule_label,
                            relative_file,
                            f"commands.{name}.args[{index}]",
                            "command argument path escapes the capsule",
                        )
                    )
                    break
                if path_like and missing_capsule_owned_reference(candidate, capsule):
                    findings.append(
                        Finding(
                            capsule_label,
                            relative_file,
                            f"commands.{name}.args[{index}]",
                            f"root-like reference {candidate} has no capsule-owned target",
                        )
                    )
                    break

        if program == "docker" and "build" in args:
            positional = [item for item in args[args.index("build") + 1 :] if not item.startswith("-")]
            if positional:
                context = positional[-1]
                if contract_path_rejected(context, capsule, capsule):
                    findings.append(
                        Finding(
                            capsule_label,
                            relative_file,
                            f"commands.{name}.args",
                            "Docker build context escapes the capsule",
                        )
                    )


def check_packages(
    capsule: Path, files: list[Path], capsule_label: str, root: Path, findings: list[Finding]
):
    manifests: list[tuple[Path, dict]] = []
    for manifest_path in iter_files(files, "package.json"):
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


def check_json_configs(
    capsule: Path, files: list[Path], capsule_label: str, root: Path, findings: list[Finding]
):
    for config_path in iter_files(files):
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


def check_dockerfiles(
    capsule: Path, files: list[Path], capsule_label: str, root: Path, findings: list[Finding]
):
    for dockerfile in iter_files(files):
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


def known_finding(field: str, message: str) -> Finding:
    return Finding(KNOWN_LABEL, KNOWN_NONCONFORMANCE, field, message)


def reference_is_valid(value: str, root: Path) -> bool:
    normalized = value.replace("\\", "/")
    if "\0" in value or is_windows_or_posix_absolute(value) or ".." in normalized.split("/"):
        return False
    target = (root / normalized).resolve(strict=False)
    return is_within(target, root) and target.exists()


def load_known_nonconformance(root: Path, findings: list[Finding]) -> dict[str, dict]:
    """Validated entries by capsule id; any defect is a finding, never a silent skip."""
    path = root / KNOWN_NONCONFORMANCE
    if not path.exists() and not path.is_symlink():
        return {}
    if path.is_symlink() or not path.is_file():
        findings.append(known_finding("$", "known-nonconformance record must be a real file"))
        return {}
    try:
        record = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        findings.append(known_finding("$", "cannot safely read valid known-nonconformance JSON"))
        return {}
    if not isinstance(record, dict) or set(record) != {"version", "entries"}:
        findings.append(
            known_finding("$", "known-nonconformance record must hold exactly version and entries")
        )
        return {}
    if record["version"] != 1:
        findings.append(known_finding("version", "known-nonconformance version must be 1"))
        return {}
    if not isinstance(record["entries"], list):
        findings.append(known_finding("entries", "known-nonconformance entries must be an array"))
        return {}

    entries: dict[str, dict] = {}
    for index, entry in enumerate(record["entries"]):
        field = f"entries[{index}]"
        if not isinstance(entry, dict) or set(entry) != set(ENTRY_FIELDS):
            findings.append(
                known_finding(
                    field, f"known-nonconformance entry must hold exactly {', '.join(ENTRY_FIELDS)}"
                )
            )
            continue
        empty = [
            name for name in ENTRY_FIELDS if not isinstance(entry[name], str) or not entry[name].strip()
        ]
        if empty:
            findings.append(
                known_finding(field, f"known-nonconformance fields must be non-empty text: {', '.join(empty)}")
            )
            continue
        capsule = entry["capsule"]
        if not CAPSULE_ID.match(capsule):
            findings.append(
                known_finding(
                    f"{field}.capsule", "known-nonconformance capsule must be domain/capsule outside _template"
                )
            )
            continue
        if not ISO_DATE.match(entry["reviewBy"]):
            findings.append(
                known_finding(f"{field}.reviewBy", "known-nonconformance reviewBy must be a YYYY-MM-DD date")
            )
            continue
        try:
            date.fromisoformat(entry["reviewBy"])
        except ValueError:
            findings.append(
                known_finding(f"{field}.reviewBy", "known-nonconformance reviewBy is not a real date")
            )
            continue
        if not reference_is_valid(entry["reference"], root):
            findings.append(
                known_finding(
                    f"{field}.reference", "known-nonconformance reference must be an existing repository path"
                )
            )
            continue
        if capsule in entries:
            findings.append(
                known_finding(f"{field}.capsule", f"duplicate known-nonconformance entry for {capsule}")
            )
            continue
        entries[capsule] = entry
    return entries


def capsule_directories(projects: Path, findings: list[Finding], root: Path) -> list[tuple[str, Path]]:
    """Every projects/<domain>/<capsule>/ entry except the _template domain."""
    capsules = []
    for domain in sorted(projects.iterdir()):
        if domain.name.startswith("_"):
            continue
        if domain.is_symlink():
            findings.append(
                Finding(domain.name, repository_relative(domain, root), "$", "domain directory is a symbolic link")
            )
            continue
        if not domain.is_dir():
            continue
        for capsule in sorted(domain.iterdir()):
            label = f"{domain.name}/{capsule.name}"
            if capsule.is_symlink():
                findings.append(
                    Finding(label, repository_relative(capsule, root), "$", "capsule directory is a symbolic link")
                )
                continue
            if capsule.is_dir():
                capsules.append((label, capsule))
    return capsules


@dataclass
class Inspection:
    findings: list[Finding]
    warnings: list[str]
    contracted: int
    recorded: int


def inspect_repository(root: Path, today: date | None = None) -> Inspection:
    if not root.is_dir() or root.is_symlink():
        raise UnsafeInputError("repository root must be a real directory")
    root = root.resolve(strict=False)
    projects = root / "projects"
    if projects.is_symlink() or (projects.exists() and not projects.is_dir()):
        raise UnsafeInputError("projects root must be a real directory")

    findings: list[Finding] = []
    warnings: list[str] = []
    known = load_known_nonconformance(root, findings)
    capsules = capsule_directories(projects, findings, root) if projects.exists() else []
    present = {label for label, _ in capsules}
    contracted = 0

    for label, capsule_directory in capsules:
        contract_path = capsule_directory / "project.contract.json"
        if not (contract_path.exists() or contract_path.is_symlink()):
            if label not in known:
                findings.append(
                    Finding(
                        label,
                        repository_relative(capsule_directory, root),
                        "$",
                        "capsule has neither project.contract.json nor a known-nonconformance entry",
                    )
                )
            continue
        if label in known:
            findings.append(
                Finding(
                    label,
                    KNOWN_NONCONFORMANCE,
                    "capsule",
                    "known-nonconformance entry names a capsule that has project.contract.json",
                )
            )
        contracted += 1
        capsule = capsule_directory.resolve(strict=False)
        if contract_path.is_symlink() or not is_within(capsule, projects.resolve(strict=False)):
            findings.append(
                Finding(
                    label,
                    repository_relative(contract_path, root),
                    "$",
                    "contract path is not safely contained",
                )
            )
            continue
        contract = read_json(contract_path, label, root, findings)
        if contract is None:
            continue
        if not isinstance(contract, dict):
            findings.append(
                Finding(
                    label,
                    repository_relative(contract_path, root),
                    "$",
                    "contract must be a JSON object",
                )
            )
            continue
        capsule_label = contract.get("id") if isinstance(contract.get("id"), str) else label
        files = walk_capsule(capsule)
        check_contract_paths(contract, capsule, capsule_label, root, findings)
        check_packages(capsule, files, capsule_label, root, findings)
        check_json_configs(capsule, files, capsule_label, root, findings)
        check_dockerfiles(capsule, files, capsule_label, root, findings)

    for label in sorted(set(known) - present):
        findings.append(
            Finding(
                label,
                KNOWN_NONCONFORMANCE,
                "capsule",
                "known-nonconformance entry names a capsule directory that does not exist",
            )
        )
    today = today or date.today()
    for label, entry in sorted(known.items()):
        if label in present and date.fromisoformat(entry["reviewBy"]) < today:
            warnings.append(
                f"warning: known-nonconformance entry {label} is overdue for review "
                f"(reviewBy {entry['reviewBy']})"
            )
    recorded = len([label for label in known if label in present])
    return Inspection(sorted(set(findings)), warnings, contracted, recorded)


def check_repository(root: Path) -> list[Finding]:
    return inspect_repository(root).findings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    arguments = parser.parse_args(argv)
    try:
        inspection = inspect_repository(arguments.root)
    except UnsafeInputError as error:
        print(f"SAFRS project independence unavailable: {error}", file=sys.stderr)
        return 2
    for warning in inspection.warnings:
        print(warning, file=sys.stderr)
    if inspection.findings:
        print("SAFRS project independence failed:", file=sys.stderr)
        for finding in inspection.findings:
            print(finding.render(), file=sys.stderr)
        return 1
    summary = f"{inspection.contracted} active capsules"
    if inspection.recorded:
        summary += f", {inspection.recorded} known non-conformance"
    print(f"SAFRS project independence: OK ({summary})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
