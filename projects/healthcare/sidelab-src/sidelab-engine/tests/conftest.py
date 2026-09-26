# Architected and built by codieverse+.
import importlib.util
import sys
from pathlib import Path

sys.pycache_prefix = str(Path(__file__).parent.parent / ".cache" / "pycache")

_SIDELAB_SCRIPT = Path(__file__).parent.parent / "sidelab.py"


def load_sidelab_core():
    """Load sidelab.py (CLI script) sebagai modul 'sidelab_core'.

    Dipanggil sekali — pemanggilan berikutnya mengembalikan instance yang sama
    dari sys.modules.
    """
    key = "sidelab_core"
    if key not in sys.modules:
        spec = importlib.util.spec_from_file_location(key, _SIDELAB_SCRIPT)
        m = importlib.util.module_from_spec(spec)
        sys.modules[key] = m
        spec.loader.exec_module(m)
    return sys.modules[key]
