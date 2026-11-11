# Droid Tool Notes

Factory Droid is the harness this repository is currently driven from. Its
surface differs from the reference harnesses, so read the actual tool list in
the live session before trusting any mapping here.

## Skills and dispatch

- Skills are packages under a `skills/` directory with a `SKILL.md` entry point
  (`name` + `description` frontmatter). Droid discovers them, then loads the body
  when it selects one. This ported Superpowers set is discovered from
  `.agents/skills/superpowers/`.
- Subagent dispatch is `Task` (worker / explorer), not `Agent` or `spawn_agent`.
  Use worker/explorer subagent types; do not assume Codex `spawn_agent` flags
  (`fork_turns`, `model`, `reasoning_effort`) exist here. Check the live tool
  schema before relying on model overrides.
- Parallel work runs through the `Task` tool; Superpowers parallel skills only
  apply when the five parallelism conditions in the router hold.

## Worktrees

- Droid exposes `--worktree` / `--worktree-dir` on `droid exec` and a worktree
  UI in the App. Prefer those native controls over raw `git worktree add` when
  they are available.
- This repository's declared preference (root `AGENTS.md`) is
  `../Monorepo.worktrees/<branch-name>` — outside the checkout. See
  `using-git-worktrees` for the SAFRS override.

## Session start bootstrap

- Auto-trigger of `using-superpowers` depends on a `SessionStart` hook (see
  `~/.factory/hooks.json`). Without it the skills are discoverable and usable on
  explicit invocation only; they do not attach themselves.
- Hook stdout is appended as session context, which is how the bootstrap injects
  the check-skills-first rule.

## Finishing and review

- Droid can review local changes (`/review`) and run automated review in CI; see
  the Factory `code-review` skill. Branch/push to a remote still needs explicit
  authority, matching `finishing-a-development-branch`.
