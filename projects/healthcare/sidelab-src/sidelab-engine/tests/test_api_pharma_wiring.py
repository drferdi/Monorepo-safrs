"""Verify that the API safety pipeline applies pharmacology validation.

Reads api.py source directly instead of importing the module — importing
``api`` executes module-level side effects (os.chdir, env vars, provider
registry patches) that pollute other tests in the same pytest process.
"""
from pathlib import Path

ENGINE_DIR = Path(__file__).resolve().parent.parent


def test_apply_safety_pipeline_uses_pharma_format():
    source = (ENGINE_DIR / "api.py").read_text(encoding="utf-8")
    assert "apply_pharma=pharma_fn is not None" in source, (
        "_apply_safety_pipeline must enable pharma validation when formatter is available"
    )
