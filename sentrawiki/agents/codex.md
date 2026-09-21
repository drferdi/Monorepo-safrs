# Codex adapter

Codex configuration under `.codex/` is an adapter. Setup docs live in `docs/bootstrap/`.

Same rule as other vendors: point at `AGENTS.md`; do not fork policy.

`.codex/agents/` defines a numbered roster (`01-context-management-agent` through `11-token-guard`) plus `safrs-reviewer.toml` and `security-reviewer.toml`. The Gaffer Codex provider is activated at `tools/automation/src/gaffer/provider-codex.mjs`; its default worker registry names two certified Codex workers (`codex-luna-economy`, `codex-luna-strong`).
