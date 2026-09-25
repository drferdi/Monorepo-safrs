"""Run the Avery capsule's stdlib unittest suite without PowerShell.

Equivalent to `scripts/test.ps1`: `PYTHONPATH` points at `src`, then
`python -m unittest discover -s tests -t .` runs from the capsule root.
Used by `project.contract.json`, which accepts argv only, without a shell.
"""

import os
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
env = dict(os.environ, PYTHONPATH=str(root / "src"))
command = [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-t", ".", "-v"]
sys.exit(subprocess.run(command, cwd=root, env=env).returncode)
