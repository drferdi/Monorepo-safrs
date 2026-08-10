#!/usr/bin/env python3
"""Verify agent context routing.

The routing block in AGENTS.md must be byte-identical to what
generate_routing.py derives from .safrs/document-registry.json,
and every routed document must exist on disk.
"""
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

spec = importlib.util.spec_from_file_location(
    'generate_routing', ROOT / 'tools' / 'safrs' / 'generate_routing.py')
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)

text = (ROOT / 'AGENTS.md').read_text(encoding='utf-8')
errors = []

# 1. Routing block must exist and match the registry-derived block exactly.
if gen.BEGIN not in text or gen.END not in text:
    errors.append('AGENTS.md is missing SAFRS routing markers')
elif gen.current_block(text) != gen.build_block(ROOT):
    errors.append('AGENTS.md routing block drifted from .safrs/document-registry.json; '
                  'run: python tools/safrs/generate_routing.py')

# 2. Non-doc anchors the router must still reference.
required = [
    'SAFRS_SPEC.md', 'scripts/safrs-verify.sh',
    'docs/governance/SAFRS_PROJECT_CAPSULES.md',
    'projects/golden-path/apps/web', 'pnpm run doctor', 'pnpm run setup',
    'pnpm dev', 'pnpm run governance',
]
missing = [x for x in required if x not in text]
if missing:
    errors.append('AGENTS.md missing references: ' + ', '.join(missing))

# 3. Deprecated adapters must not exist.
if (ROOT / '.cursorrules').exists():
    errors.append('deprecated .cursorrules must not exist; use the thin canonical adapter')

if errors:
    raise SystemExit('SAFRS agent routing failed:\n- ' + '\n- '.join(errors))
print('SAFRS agent routing: OK')
