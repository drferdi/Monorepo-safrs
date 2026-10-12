# Codex adapter

Codex configuration under `.codex/` is an adapter. Setup docs live in `docs/bootstrap/`.

Same rule as other vendors: point at `AGENTS.md`; do not fork policy.

`.codex/agents/` defines a numbered roster (`01-context-management-agent` through `11-token-guard`) plus `safrs-reviewer.toml` and `security-reviewer.toml`. The Gaffer Codex provider is activated at `tools/automation/src/gaffer/provider-codex.mjs`; its default worker registry names two certified Codex workers (`codex-luna-economy`, `codex-luna-strong`).

Merges only on Gaffer's go: `~/.codex/config.toml` sets `approval_policy = "on-request"` and `git-pr-watch-auto-merge = false`, and `~/.codex/rules/safrs-merge.rules` makes Codex ask Gaffer before `git merge`, `git pull`, and `gh pr merge`. The Codex guard blocks other spellings of those commands and every fast-forward of `main`; Gaffer runs those merges.
