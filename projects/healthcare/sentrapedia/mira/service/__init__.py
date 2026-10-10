"""Capsule-local MIRA engine. No upstream source path injection."""
from pathlib import Path
ASSIST_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = ASSIST_DIR / "provenance"
SERVICE_VERSION = "0.1.0"
