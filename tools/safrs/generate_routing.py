#!/usr/bin/env python3
"""Generate the AGENTS.md read-order block from .safrs/document-registry.json.

The registry is the single source of truth for agent context routing.
Usage:
  python tools/safrs/generate_routing.py          # rewrite the block in AGENTS.md
  python tools/safrs/generate_routing.py --check  # exit 1 if AGENTS.md drifted
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BEGIN = '<!-- SAFRS:ROUTING:BEGIN -->'
END = '<!-- SAFRS:ROUTING:END -->'


def build_block(root: Path = ROOT) -> str:
    registry = json.loads((root / '.safrs' / 'document-registry.json').read_text(encoding='utf-8'))
    docs = [d for d in registry['documents'] if d.get('normativity')]

    must = sorted((d for d in docs if d['normativity'] == 'MUST' and 'read_order' in d),
                  key=lambda d: d['read_order'])
    should_always = [d for d in docs if d['normativity'] == 'SHOULD' and d.get('scope') == 'always']
    task_scoped = {}
    for d in docs:
        scope = d.get('scope', '')
        if scope.startswith('task:'):
            task_scoped.setdefault(scope, []).append(d)
    may = [d for d in docs if d['normativity'] == 'MAY']

    lines = [BEGIN,
             '_Generated from `.safrs/document-registry.json`. Do not edit by hand;',
             'edit the registry, then run `python tools/safrs/generate_routing.py`._',
             '',
             'Read only the context required for the task.',
             '',
             '**Always (MUST), in order:**',
             '']
    lines += [f"{d['read_order']}. `{d['path']}`" for d in must]
    if should_always:
        lines += ['', '**Always (SHOULD):** ' + ', '.join(f"`{d['path']}`" for d in should_always)]
    if task_scoped:
        lines += ['', '**Task-scoped (SHOULD):**', '']
        for scope in sorted(task_scoped):
            paths = ', '.join(f"`{d['path']}`" for d in task_scoped[scope])
            lines.append(f'- `{scope}` → {paths}')
    if may:
        lines += ['', '**Reference (MAY):** ' + ', '.join(f"`{d['path']}`" for d in may)]
    lines += ['', 'Then read the nearest nested `AGENTS.md` for the project/module being modified.', END]
    return '\n'.join(lines)


def current_block(text: str) -> str:
    start = text.index(BEGIN)
    end = text.index(END) + len(END)
    return text[start:end]


def main() -> int:
    agents = ROOT / 'AGENTS.md'
    text = agents.read_text(encoding='utf-8')
    if BEGIN not in text or END not in text:
        print('AGENTS.md is missing SAFRS routing markers', file=sys.stderr)
        return 1
    expected = build_block()
    if '--check' in sys.argv:
        if current_block(text) != expected:
            print('AGENTS.md routing block drifted from document registry; '
                  'run: python tools/safrs/generate_routing.py', file=sys.stderr)
            return 1
        print('SAFRS routing block: in sync')
        return 0
    agents.write_text(text.replace(current_block(text), expected), encoding='utf-8')
    print('AGENTS.md routing block regenerated')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
