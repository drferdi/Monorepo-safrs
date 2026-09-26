"""CLI entry: seed E2E users inside the bench Python env.

    cd /workspace && ./env/bin/python e2e/run_setup.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

BENCH_ROOT = Path(__file__).resolve().parent.parent
if str(BENCH_ROOT) not in sys.path:
	sys.path.insert(0, str(BENCH_ROOT))

# Logger writes ../logs relative to cwd (same as `bench` from sites/).
os.chdir(BENCH_ROOT / "sites")

import frappe

from e2e.setup_users import run


def main() -> None:
	frappe.init(site="mantra.localhost")
	frappe.connect()
	try:
		print(run())
	finally:
		frappe.destroy()


if __name__ == "__main__":
	main()
