"""Session-memory files, defined once for the handoff and sensitive-change gates.

Memory files are neither implementation nor verification: updating them never
demands another handoff and never invalidates a Chief integrity seal
(ADR 0007 decision 7).
"""

ROOT_MEMORY_FILES = frozenset({
    '.agents/HANDOFF.md', '.agents/PROGRESS.md', '.agents/DECISIONS.md',
    '.agents/CONTEXT.md', '.agents/knowledge/12_LESSONS.md',
})
ROOT_HANDOFF = '.agents/HANDOFF.md'


def capsule_of(path):
    """Return 'projects/<domain>/<capsule>' for a file inside a capsule, else None.

    Folders whose domain starts with '_' (the template) and files directly in a
    domain folder belong to the root.
    """
    parts = path.replace('\\', '/').split('/')
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
