# Architected and built by codieverse+.
import importlib.util
import sys
import types
from pathlib import Path

import pytest

sys.pycache_prefix = str(Path(__file__).parent.parent / ".cache" / "pycache")


# Tes tidak pernah menyentuh server Ollama sungguhan. Paket asli membuat klien HTTP (dan konteks
# SSL) saat di-import; di Windows itu gagal ketika tes mengosongkan os.environ. Fake ini
# berperilaku seperti "server tidak tersedia".
def _no_ollama_server(*_args, **_kwargs):
    raise ConnectionError("tests never reach a real Ollama server")


_fake_ollama = types.ModuleType("ollama")
_fake_ollama.list = _no_ollama_server
_fake_ollama.chat = _no_ollama_server
sys.modules["ollama"] = _fake_ollama

# load_dotenv() tanpa path mencari .env ke atas dari sidelab/notify/, sampai keluar capsule
# (mis. .env root Monorepo). Tes tidak boleh membaca .env milik mesin pengembang.
_notify_config = importlib.import_module("sidelab.notify.config")
_notify_config.load_dotenv = lambda *_args, **_kwargs: False


@pytest.fixture(autouse=True)
def _fake_deepseek_key(monkeypatch):
    """Alur main() hanya berjalan bila backend DeepSeek siap, yaitu bila kuncinya ada.

    Tes memakai kunci palsu, bukan kunci mesin; tes yang menguji kunci kosong menimpanya sendiri.
    """
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-fake-deepseek-key")

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
