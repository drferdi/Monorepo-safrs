# Architected and built by codieverse+.
from __future__ import annotations

import subprocess
import sys

SAFETY_TESTS = [
    "tests/clinical/test_pharma_guardrails.py",
    "tests/clinical/test_no_fabrication.py",
    "tests/clinical/test_output_pipeline.py",
    "tests/clinical/test_tui_safety_parity.py",
    "tests/clinical/test_insufficient_data.py",
    "tests/clinical/test_red_flag_engine.py",
    "tests/clinical/test_emergency_referral_escalation.py",
    "tests/clinical/test_ddi_lint.py",
]


def main() -> int:
    cmd = [sys.executable, "-m", "pytest", *SAFETY_TESTS, "--no-cov", "-q"]
    print("Running lightweight SideLab safety regression suite:")
    for path in SAFETY_TESTS:
        print(f"  - {path}")
    print("")
    return subprocess.call(cmd)


if __name__ == "__main__":
    raise SystemExit(main())
