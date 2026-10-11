# HANDOFF

## 2026-10-11 - Tool quality gates and contract alignment (Codex)

- Files: `package.json`, `project.contract.json`, `README.md`, new `scripts/lint.mjs` and `scripts/deploy-dry-run.mjs`, lint and CSP regression tests, renderer HTML CSP. Earlier launcher fixes remain in the working tree.
- Replaced placeholder success gates with source syntax/debugger/dynamic-execution checks and actual build-artifact validation. Tests compile CLI output before running; corrected desktop/CLI/preview documentation. Contract declares HTTrack, frozen install and mutable data paths.
- PASS / exit 0: typecheck, build, local lint (16 maintained files), 7 tests, isolated-profile desktop smoke, deployment dry-run, tools contract discovery and structural checker. Exact CSP hash permits the required inline bootstrap without allowing arbitrary inline scripts.
- Remaining risks: lint is deliberately limited and does not check style; fresh extraction/install not performed; global governance fails on other scope ownership/handoff. No scraping, data deletion, provider calls, installs, commit or push.
- Next: independent review and extraction verification when install/network scope is authorized.

## 2026-10-11 — Restore local Electron and desktop shortcut

- **Scope**: Retriever remains at `tools/retriever`; root monorepo supplies governance only.
- **Changed files**: `Run-Retriever.bat`, `Run-Retriever.ps1`, `package.json`, `.agents/HANDOFF.md`.
- **Local dependency repair**: re-linked seven generated package links to the existing local
  `.pnpm` store using its package map; regenerated portable command shims and installed the
  local Electron 44.5.1 binary. All 94 dependency links resolve within Retriever.
- **Launcher behavior**: uses local Electron, prepares a missing binary through the local
  installer, reports failures, and no longer force-stops existing Electron processes.
  Nested package scripts use Node.js `--run` instead of the ineffective pnpm shim.
- **Gates**: typecheck PASS (exit 0); lint script PASS (exit 0, placeholder only, no real
  linter configured); PowerShell parser PASS (exit 0); build PASS (exit 0); targeted engine
  tests PASS (4/4, exit 0); desktop smoke PASS (exit 0); dependency boundary check PASS
  (94 links, zero outside, exit 0); original Desktop shortcut PASS (exit 0, window title
  `Retriever`, responding). Commands ran through `node --run` from this tool directory.
- **Remaining risks**: Electron emits existing CSP and deprecated console-event warnings.
  Extra module-boundary preload harness failed on Windows path parsing; Jev stopped that
  approach. A full extracted-folder lifecycle has not been verified. The initial installer
  followed the old root link and generated a root Electron 44.7.0 binary before local repair;
  Retriever now uses only local 44.5.1. No global tooling/configuration was changed.
- **Next tasks**: optional separate review of Electron CSP and pnpm installation behavior.
  The desktop application was left open. No push, deployment, or scraped-data change.

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
