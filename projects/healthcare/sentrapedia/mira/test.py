"""Capsule-local test entrypoint; every provider client is mocked."""
from pathlib import Path
import sys
import pytest

root = Path(__file__).resolve().parent
sys.path.insert(0, str(root))
raise SystemExit(pytest.main([str(root / "service/tests"), "-q", "--disable-warnings"]))
