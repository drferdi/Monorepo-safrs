"""Jalankan test suite stdlib unittest capsule Avery tanpa PowerShell.

Setara dengan `scripts/test.ps1`: `PYTHONPATH` diarahkan ke `src`, lalu
`python -m unittest discover -s tests -t .` dijalankan dari akar capsule.
Dipakai oleh `project.contract.json`, yang hanya menerima argv tanpa shell.
"""

import os
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
env = dict(os.environ, PYTHONPATH=str(root / "src"))
command = [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-t", ".", "-v"]
sys.exit(subprocess.run(command, cwd=root, env=env).returncode)
