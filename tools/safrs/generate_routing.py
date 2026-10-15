#!/usr/bin/env python3
"""Generate the AGENTS.md read-order block from .safrs/document-registry.json.

The registry is the single source of truth for agent context routing.
Documents with a `paths` list also get a path-scoped Claude Code rule in
.claude/rules/safrs-<id>.md, which loads only when matching files are touched.
Usage:
  python tools/safrs/generate_routing.py          # rewrite the block and the rules
  python tools/safrs/generate_routing.py --check  # exit 1 if either drifted
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BEGIN = '<!-- SAFRS:ROUTING:BEGIN -->'
END = '<!-- SAFRS:ROUTING:END -->'
RULES_DIR = Path('.claude') / 'rules'
RULE_PREFIX = 'safrs-'


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
            # Same trigger paths as the Claude rules, so agents without
            # path-scoped rules know when the task scope applies.
            triggers = list(dict.fromkeys(p for d in task_scoped[scope] for p in d.get('paths', [])))
            when = f" (also when changing {', '.join(f'`{p}`' for p in triggers)})" if triggers else ''
            lines.append(f'- `{scope}`{when} → {paths}')
    if may:
        lines += ['', '**Reference (MAY):** ' + ', '.join(f"`{d['path']}`" for d in may)]
    lines += ['', 'Then read the nearest nested `AGENTS.md` for the project/module being modified.', END]
    return '\n'.join(lines)


def build_rules(root: Path = ROOT) -> dict:
    registry = json.loads((root / '.safrs' / 'document-registry.json').read_text(encoding='utf-8'))
    rules = {}
    for d in registry['documents']:
        if not d.get('paths'):
            continue
        lines = ['---', 'paths:'] + [f'  - {json.dumps(p)}' for p in d['paths']] + [
            '---',
            '<!-- Generated from `.safrs/document-registry.json` by `tools/safrs/generate_routing.py`.',
            '     Do not edit by hand. -->',
            '',
            (f"Before changing files that match these paths, read `{d['path']}` "
             f"(SAFRS {d['normativity']}, `{d['scope']}`)."),
            '']
        rules[f"{RULE_PREFIX}{d['id']}.md"] = '\n'.join(lines)
    return rules


def rules_drift(root: Path = ROOT) -> list:
    expected = build_rules(root)
    rules_dir = root / RULES_DIR
    actual = {f.name: f.read_text(encoding='utf-8')
              for f in rules_dir.glob(f'{RULE_PREFIX}*.md')} if rules_dir.is_dir() else {}
    return sorted(name for name in expected.keys() | actual.keys()
                  if expected.get(name) != actual.get(name))


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
        drifted = rules_drift()
        if current_block(text) != expected or drifted:
            print('AGENTS.md routing block or Claude rules drifted from document registry '
                  f'({", ".join(drifted) or "AGENTS.md"}); '
                  'run: python tools/safrs/generate_routing.py', file=sys.stderr)
            return 1
        print('SAFRS routing block and Claude rules: in sync')
        return 0
    agents.write_text(text.replace(current_block(text), expected), encoding='utf-8', newline='\n')
    rules_dir = ROOT / RULES_DIR
    rules_dir.mkdir(parents=True, exist_ok=True)
    rules = build_rules()
    for stale in rules_dir.glob(f'{RULE_PREFIX}*.md'):
        if stale.name not in rules:
            stale.unlink()
    for name, content in rules.items():
        (rules_dir / name).write_text(content, encoding='utf-8', newline='\n')
    print(f'AGENTS.md routing block and {len(rules)} Claude rules regenerated')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
