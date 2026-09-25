"""Deploy dry-run offline untuk `project.contract.json`.

Tanpa efek samping: tidak memanggil docker, tidak membuka jaringan, tidak
membaca kredensial, dan tidak menulis apa pun. Memeriksa bahwa masukan yang
dipakai `deploy/scripts/deploy.sh` tersedia di capsule: file compose produksi,
Dockerfile overlay, skrip backup/smoke/rollback, serta manifest patch Hermes
dalam bentuk yang dibaca `deploy/Dockerfile.avery` (`patches[]` berisi
`{patch, files}`, atau satu entri di tingkat atas) beserta berkas patch yang
dirujuknya.
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

failures = [f"{item} tidak ada." for item in inputs if not (root / item).is_file()]

manifest_path = root / "patches/hermes-0.20.5/manifest.json"
if manifest_path.is_file():
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not manifest.get("hermes_version"):
        failures.append("Dockerfile.avery membaca manifest['hermes_version'], tetapi nilainya kosong.")
    for index, spec in enumerate(manifest.get("patches") or [manifest]):
        patch = spec.get("patch")
        if not patch or not (manifest_path.parent / patch).is_file():
            failures.append(f"Entri patch #{index}: berkas patch tidak ada: {patch}")
        if not spec.get("files"):
            failures.append(f"Entri patch #{index} ({patch}): daftar 'files' kosong.")

for failure in failures:
    print(f"GAGAL {failure}", file=sys.stderr)
if failures:
    sys.exit(1)
print("deploy dry-run lolos: masukan deploy lengkap, tanpa efek samping.")
