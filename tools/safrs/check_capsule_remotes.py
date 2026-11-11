#!/usr/bin/env python3
"""Each capsule publishes through its own Git remote, never the root monorepo.

Reads the optional `repository` field of `projects/<domain>/<capsule>/project.contract.json`.
A missing field is a warning; a malformed value or the root monorepo remote fails.
"""

import argparse
import json
import re
from pathlib import Path

# Shared with `.safrs/schemas/project-contract.schema.json`; HTTPS or scp-style SSH, no credentials.
REPOSITORY_PATTERN = r"^(?:https://[A-Za-z0-9.-]+/|git@[A-Za-z0-9.-]+:)[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$"
ROOT_REPOSITORY = ("github.com", "drferdi", "monorepo-safrs")


def identity(url):
    if url.startswith("https://"):
        host, path = url[len("https://"):].split("/", 1)
    else:
        host, path = url[len("git@"):].split(":", 1)
    owner, name = path.split("/")
    return host.lower(), owner.lower(), name.lower().removesuffix(".git")


def inspect_capsules(root):
    failures, missing, count = [], [], 0
    for contract_path in sorted((root / "projects").glob("*/*/project.contract.json")):
        capsule = contract_path.parent.relative_to(root / "projects").as_posix()
        count += 1
        if contract_path.is_symlink():
            failures.append(f"{capsule}: project.contract.json must be a real file")
            continue
        try:
            contract = json.loads(contract_path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
            failures.append(f"{capsule}: project.contract.json is unreadable ({error})")
            continue
        if not isinstance(contract, dict) or "repository" not in contract:
            missing.append(capsule)
            continue
        url = contract["repository"]
        if not isinstance(url, str) or not re.fullmatch(REPOSITORY_PATTERN, url):
            failures.append(f"{capsule}: repository must be an HTTPS or SSH Git URL without credentials")
        elif identity(url) == ROOT_REPOSITORY:
            failures.append(f"{capsule}: repository must not be the root monorepo remote")
    return failures, missing, count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    args = parser.parse_args()
    failures, missing, count = inspect_capsules(args.root.resolve())
    if missing:
        print(f"WARNING: {len(missing)} capsules declare no repository: {', '.join(missing)}")
    if failures:
        print("SAFRS capsule remotes failed:")
        for failure in failures:
            print(f"  - {failure}")
        return 1
    print(f"SAFRS capsule remotes: OK ({count} capsules, {count - len(missing)} declared)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
