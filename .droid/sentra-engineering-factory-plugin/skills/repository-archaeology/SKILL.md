---
name: repository-archaeology
description: Understand a repository before making changes. Use when starting work in an unfamiliar repo, mapping structure, finding entry points, build/test/lint commands, governance files, or dependency boundaries. Read-only; never modifies files.
version: 1.0.0
allowed-tools:
  - Read
  - LS
  - Glob
  - Grep
compatibility: droid
---

# Repository Archaeology

Understand a repository thoroughly **before** proposing or making any change. This skill is strictly read-only: it must not create, edit, delete, or move any file.

## When to use this skill

- Starting work in an unfamiliar repository or package/project area.
- Mapping structure, entry points, and command surface.
- Locating governance files, dependency boundaries, and test/lint/build setup.
- Before `/plan-change` or `/audit-repository`.

## Preconditions

- A working directory inside a repository (git repo preferred; single-folder projects still work).
- Read-only tool availability: `Read`, `LS`, `Glob`, `Grep`.

## Workflow

1. **Read the human instructions first.** Follow the repository's `AGENTS.md` / `CLAUDE.md` read-order if one exists. Do not skip it.
2. **Read primary documentation.** `README.md`, `docs/` overview files, top-level manifests (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`).
3. **Map structure.** Use `LS`/`Glob` to capture the top-level layout, workspace/package layout, and obvious entry points.
4. **Find command surface.** Identify package manager (pnpm/npm/yarn/pip/uv/cargo/go), build, test, and lint commands. Prefer manifests, lockfiles, CI config, and docs over assumptions.
5. **Find governance.** `AGENTS.md`, `CLAUDE.md`, `.factory/`, `.claude/`, `.agents/`, `.safrs/`, `SECURITY.md`, CI workflows, policy files.
6. **Find dependency boundaries.** Workspace/package manifests, import rules, shared packages, boundary enforcement scripts.
7. **Trace the specific target area** named in the request (feature, module, endpoint) to its entry points and data flow.
8. **Report** a structured summary (see output contract). Do not change anything.

## Output contract

A Markdown summary containing:

- **Overview**: what this repo/project is.
- **Structure map**: top-level layout with one-line purpose per area.
- **Commands**: build / test / lint commands with the toolchain and where each was found.
- **Governance**: files found that constrain agent behavior and their key rules.
- **Entry points**: where code execution/render starts for the target area.
- **Dependency boundaries**: what can import what; notable exclusions.
- **Risks/quirks**: anything unusual a subsequent change should respect (e.g. generated-file rules, token checks).
- Anything not found/verified marked **UNVERIFIED**.

## Stop conditions

- Context written to the summary; do not continue into planning or implementation — that is another step (see `agent-governance` skill).
- If a needed file is unreadable or missing, record that and continue, or stop and report if the block is fundamental.

## Security boundaries

- **Never** modify, move, or delete files.
- **Never** read, print, transmit, or persist secrets (`.env*`, `*.pem`, `*.key`, credential stores). If a file looks secret-bearing, note its existence only.
- Do not run arbitrary commands; prefer read-only tools. If a command is needed for evidence, request approval first.

## Example usage

> "You're in a fresh checkout. Map this repo so I can add a new API endpoint."
>
> → run this skill, then hand the summary to `/plan-change`.

## Anti-patterns

- Skimming only the README and guessing the rest.
- Editing files during "understanding".
- Printing secret-file contents.
- Running build/tests during archaeology unless asked (they can be slow and are not evidence the request needs).
