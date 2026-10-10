"""Exact upstream tool schema snapshot, without the research import stack."""
import json
from pathlib import Path
EXCLUDED_TOOLS = {"ProcedureSearch"}
PLANNING_TOOLS = json.loads((Path(__file__).resolve().parents[1] / "planning-tools.json").read_text(encoding="utf-8"))
def planning_menu_text() -> str:
    return f"{PLANNING_TOOLS}"
