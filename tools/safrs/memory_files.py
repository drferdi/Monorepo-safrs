"""Session-memory files, defined once for the handoff and sensitive-change gates.

Memory files are neither implementation nor verification: updating them never
demands another handoff and never invalidates a Chief integrity seal
(ADR 0007 decision 7).
"""

import json
from pathlib import Path


TOOL_REGISTRY = Path(__file__).resolve().parents[1] / 'standalone-tools.json'
STANDALONE_TOOLS = frozenset(
    json.loads(TOOL_REGISTRY.read_text(encoding='utf-8'))['tools']
) if TOOL_REGISTRY.is_file() else frozenset()

ROOT_MEMORY_FILES = frozenset({
    '.agents/HANDOFF.md', '.agents/PROGRESS.md', '.agents/DECISIONS.md',
    '.agents/CONTEXT.md', '.agents/knowledge/12_LESSONS.md',
})
ROOT_HANDOFF = '.agents/HANDOFF.md'


def capsule_of(path):
    """Return a project or declared standalone tool owner scope, else None.

    Folders whose domain starts with '_' (the template) and files directly in a
    domain folder belong to the root.
    """
    parts = path.replace('\\', '/').split('/')
    if len(parts) >= 3 and parts[0] == 'tools' and parts[1] in STANDALONE_TOOLS:
        return '/'.join(parts[:2])
    if len(parts) < 4 or parts[0] != 'projects' or parts[1].startswith('_'):
        return None
    return '/'.join(parts[:3])


def is_memory_file(path):
    path = path.replace('\\', '/')
    if path in ROOT_MEMORY_FILES:
        return True
    capsule = capsule_of(path)
    return capsule is not None and path.startswith(f'{capsule}/.agents/')


def handoff_for(path):
    """The HANDOFF.md that a change to this path requires."""
    capsule = capsule_of(path)
    return f'{capsule}/.agents/HANDOFF.md' if capsule else ROOT_HANDOFF
