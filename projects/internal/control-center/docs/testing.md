# Control Center — testing

## Current state — stated plainly

The registry has been verified by execution against the real repository (branch and evidence
resolution both confirmed, including the corpus-engine branch case), and `build` plus `typecheck`
pass. **Automated tests have not been written yet.** That is a gap, not a completed step.

## What must be covered

| Area | Test |
| --- | --- |
| Path containment | `repoPath()` rejects absolute paths, `../` traversal, and symlink escapes |
| Status derivation | full evidence → `connected`; partial → `partially-connected`; branch-only → `requires-human-action`; nothing anywhere → `error` |
| Branch precedence | incidental evidence in the checkout does not mask a branch-only feature |
| Git failure | an unavailable `git` degrades to `available: false` and a stated problem, never a crashed page |
| Catalog integrity | every catalog entry declares at least one evidence path |

## Commands

```bash
pnpm --filter @sentra/control-center test        # node --test
pnpm --filter @sentra/control-center typecheck
pnpm --filter @sentra/control-center build
```
