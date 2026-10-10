# HANDOFF

## 2026-10-10 — .agents files added

- **Scope**: `tools/retriever` governance files only.
- **Touched files**: `.agents/CONTEXT.md`, `.agents/HANDOFF.md`, `.agents/DECISIONS.md` (new);
  owner name in `AGENTS.md` and `project.contract.json` changed from "Chief" to "Gaffer".
- **Evidence**: SAFRS topology no longer reports missing `.agents/` files for this capsule.
  No code, build, or test was run.
- **State**: the capsule is **not tracked in Git** (never committed) and has **no `.gitignore`**,
  so `node_modules/`, `dist/`, `dist-electron/`, and scraped `data/` would be committed as-is.
- **Next actions** (only when Gaffer decides to commit the capsule):
  1. Add a capsule `.gitignore` for `node_modules/`, `dist/`, `dist-electron/`, and scraped
     output under `data/`.
  2. Run the contract commands from `project.contract.json` and record exit codes here.
  3. Commit the capsule as its own change.
