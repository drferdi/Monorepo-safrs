"""Offline deploy dry-run for `project.contract.json`.

No side effects: never calls docker, opens the network, reads credentials, or
writes anything. Checks that the inputs used by `deploy/scripts/deploy.sh`
exist in the capsule: the production compose file, the overlay Dockerfile, the
backup/smoke/rollback scripts, and the Hermes patch manifest in the shape
`deploy/Dockerfile.avery` reads (`patches[]` of `{patch, files}`, or a single
top-level entry) together with the patch files it references.
"""

import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
inputs = [
    "deploy/docker-compose.prod.yml",
    "deploy/Dockerfile.avery",
    "deploy/backup/backup.sh",
    "deploy/scripts/smoke-test.sh",
    "deploy/scripts/rollback.sh",
    "patches/hermes-0.20.5/manifest.json",
]

failures = [f"{item} is missing." for item in inputs if not (root / item).is_file()]

manifest_path = root / "patches/hermes-0.20.5/manifest.json"
if manifest_path.is_file():
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not manifest.get("hermes_version"):
        failures.append("Dockerfile.avery reads manifest['hermes_version'], but it is empty.")
    for index, spec in enumerate(manifest.get("patches") or [manifest]):
        patch = spec.get("patch")
        if not patch or not (manifest_path.parent / patch).is_file():
            failures.append(f"Patch entry #{index}: patch file is missing: {patch}")
        if not spec.get("files"):
            failures.append(f"Patch entry #{index} ({patch}): 'files' is empty.")

for failure in failures:
    print(f"FAIL {failure}", file=sys.stderr)
if failures:
    sys.exit(1)
print("deploy dry-run passed: deploy inputs complete, no side effects.")
