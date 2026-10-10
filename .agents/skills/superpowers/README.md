# Superpowers — Droid compatibility scope

Scripted agent workflow skills ported into the Droid skill discovery scope.

## Provenance

- Source: OpenCode Codex plug-in cache, `openai-curated-remote/superpowers`, version `6.4.2`.
- Upstream: `jessev` / Superpowers (MIT License). Full text in `LICENSE`.
- Port method: skill directories copied verbatim (structure and content unchanged),
  enabling Droid discovery via the `name` + `description` YAML frontmatter already
  present in each `SKILL.md`.

## Contents

| Skill | Purpose |
| --- | --- |
| `using-superpowers` | Session discipline: check and invoke relevant skills before responding. |
| `brainstorming` | Turn ideas into approved designs/specs before implementation. |
| `writing-plans` | Produce an ordered, reviewable implementation plan from an approved spec. |
| `executing-plans` | Implement an approved plan, task by task, with verification. |
| `subagent-driven-development` | Dispatch independent implementation tasks to isolated subagents. |
| `dispatching-parallel-agents` | Run independent read-only investigations in parallel. |
| `requesting-code-review` | Request a structured review of a change set. |
| `receiving-code-review` | Triage and act on review feedback. |
| `finishing-a-development-branch` | Close out a branch after clean review and verification. |
| `using-git-worktrees` | Create isolated worktrees for safe parallel work. |
| `systematic-debugging` | Diagnose bugs by root cause, not symptom. |
| `test-driven-development` | Red-green-refactor for behavior changes. |
| `verification-before-completion` | Prove a change works before declaring it done. |
| `writing-skills` | Develop and test new skills. |
| `diagnosing-superpowers` | Diagnose issues with the Superpowers system itself. |

## Notes

- This is a compatibility scope under `~.agents/skills/`, not a Factory plug-in. Discovery follows
  the harness's own skill-resolution rules.
- Upstream policy expects the `using-superpowers` bootstrap to load at session start for the skills
  to auto-trigger. The `SessionStart` bootstrap is installed in the personal user scope
  (`~/.factory/hooks.json`), so auto-trigger applies only on this machine; other checkouts get
  explicit-invocation discovery only. See `using-superpowers/references/droid-tools.md`.
- No upstream skill bodies have been modified. Two SAFRS adaptations are additions to the skill
  text (worktree directory override; plan save-path override), and a Droid reference file was
  added. Each is marked inline and recorded in the Monorepo `HANDOFF.md`; review before relying on them.
