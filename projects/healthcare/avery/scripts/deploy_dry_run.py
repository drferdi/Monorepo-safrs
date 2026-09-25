"""Deploy dry-run offline untuk `project.contract.json`.

Tanpa efek samping: tidak memanggil docker, tidak membuka jaringan, tidak
membaca kredensial, dan tidak menulis apa pun. Memeriksa bahwa masukan yang
dipakai `deploy/scripts/deploy.sh` tersedia di capsule: file compose produksi,
Dockerfile overlay, skrip backup/smoke/rollback, serta manifest patch Hermes
dalam bentuk yang dibaca `deploy/Dockerfile.avery` (`patch` dan `files` di
tingkat atas) beserta berkas patch yang dirujuknya.
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
    patch = manifest.get("patch")
    if not patch or not (manifest_path.parent / patch).is_file():
        failures.append(
            f"Dockerfile.avery membaca manifest['patch'], tetapi berkasnya tidak ada: {patch}"
        )
    if not manifest.get("files"):
        failures.append("Dockerfile.avery membaca manifest['files'], tetapi daftarnya kosong.")

for failure in failures:
    print(f"GAGAL {failure}", file=sys.stderr)
if failures:
    sys.exit(1)
print("deploy dry-run lolos: masukan deploy lengkap, tanpa efek samping.")
