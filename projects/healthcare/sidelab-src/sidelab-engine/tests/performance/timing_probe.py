"""Manual timing probe for the 20 Puskesmas scenarios.

Skenario dimuat via ``sidelab.scenarios.load_scenarios`` (JSON-driven),
bukan hardcoded seperti sebelumnya.
"""
import os
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
env_path = ROOT_DIR / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

sys.path.insert(0, str(ROOT_DIR))
from sidelab.llm.config import default_model_for_backend
from sidelab.llm.router import build_provider
from sidelab.prompt import _build_system
from sidelab.scenarios import as_pairs

SKENARIO = as_pairs()

backend = "openai"
model = default_model_for_backend(backend)
provider = build_provider(backend)
system = _build_system({})

print(f"Backend: {backend} / {model}")
print(f"{'No':<3} {'Skenario':<22} {'TTFT':>6} {'Total':>7} {'Token':>6}")
print("=" * 50)

times, tokens_all = [], []
for i, (nama, query) in enumerate(SKENARIO, 1):
    messages = [{"role": "system", "content": system}, {"role": "user", "content": query}]
    chunks = []
    t0 = time.monotonic()
    t_first = None
    for chunk in provider.stream_chat(messages, model=model):
        if t_first is None:
            t_first = time.monotonic()
        chunks.append(chunk)
    t_end = time.monotonic()
    tok = len("".join(chunks)) // 4
    ttft = (t_first - t0) if t_first else 0
    total = t_end - t0
    times.append(total)
    tokens_all.append(tok)
    print(f"{i:<3} {nama:<22} {ttft:>5.1f}s {total:>6.1f}s {tok:>6}")
    full = "".join(chunks)
    if "FARMAKOLOGI" in full:
        s = full.index("FARMAKOLOGI")
        e = full.find("\n\nEDUKASI", s)
        print(full[s:e if e > 0 else s+600].strip())
    print()

print("=" * 50)
print(f"{'Rata-rata':<26} {sum(times)/len(times):>6.1f}s {sum(tokens_all)//len(tokens_all):>6}")
print(f"{'Min / Max':<26} {min(times):>5.1f}s / {max(times):.1f}s")
