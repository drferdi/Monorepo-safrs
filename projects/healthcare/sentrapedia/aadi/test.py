"""Capsule-local test entrypoint; every provider client is mocked."""
import sys
from pathlib import Path

import pytest

root = Path(__file__).resolve().parent
sys.path.insert(0, str(root))
raise SystemExit(pytest.main([str(root / "service/tests"), "-q", "--disable-warnings"]))
