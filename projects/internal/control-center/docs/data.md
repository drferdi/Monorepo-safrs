# Control Center — data

## Storage

None. This capsule owns no database, no schema, and no persistent state.

## Data it reads

| Source | Access | Why |
| --- | --- | --- |
| Repository files | read-only, via `repoPath()` containment | prove a feature exists |
| `git` | read-only, via `execFile` with an argument array | branch, head, working-tree size, unmerged branches |

## Data it must never touch

- `.env` and any credential file. The dashboard may report *whether* a required variable is
  present, never its value.
- Anything outside the repository root. `repoPath()` rejects absolute paths and traversal.
- Production data of any kind.

## Retention

Nothing is written. Each page render is a fresh read, timestamped in the response.
