# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-24 (avery FIX-01…06 executed; FULL AUTO; tech-debt audit — see docs/tech-debt-2026-08-24.md)

## Monorepo WP-A integration

- Standalone foundation merged into `main` as `19165a0` and published to `origin/main` on
  2026-08-24. The merge changes repository governance/tooling, the project template, and Portfolio
  Dr. Novia as the reference capsule; it changes no path under `projects/healthcare/avery/**`.
- Fresh evidence on the merge commit: project-standalone 14/14, Portfolio 44/44, architecture
  22/22, repository 67/67, extracted lifecycle PASS, token gate PASS, and Biome exit 0.
- Root `pnpm` commands remain blocked by the inherited missing `@safrs/auth` workspace package;
  Bash SAFRS passes its first eight gates then reports the closed WP-A ownership metadata.
- Five domain-nested Next.js apps have a local tsconfig relocation fix pending commit: each shared
  config path resolves to root `packages/config/tsconfig/nextjs.json` and `noEmit` enables
  `allowImportingTsExtensions`. Config validation and targeted Biome pass; full local typecheck is
  separately blocked by stale/missing workspace links, including the inherited absent `@safrs/auth`.

## Current state

- **Avery FIX-01…06 applied to the live runtime and proven** — plan and per-step evidence in
  `projects/healthcare/avery/docs/superpowers/plans/2026-08-23-avery-fix-execution-plan.md` and
  `projects/healthcare/avery/docs/evidence/`. Local commits on `main` after `f1aeb75`, not pushed.
  Gateway restarted and healthy (1 bridge on :3000).
- **What changed in Hermes 0.20.5 itself:** one vendored patch, kept in the capsule —
  `patches/hermes-0.20.5/0001-whatsapp-ingress-reason-codes.patch` (ingress drops logged at INFO with
  `BROADCAST|GROUP_NOT_ALLOWED|USER_NOT_ALLOWED|MENTION_MISMATCH|PASSED|INVALID_MESSAGE`, JIDs redacted;
  invalid mention regex = BOOT FAIL). Re-apply after any `hermes update` with
  `scripts/apply-hermes-patches.ps1` (SHA-256 gated, `-Revert`). `~/.local/bin/hermes` is a Git Bash shim
  with a hardcoded `0.20.4` runtime path.
- **Runtime config (`profiles/avery/config.yaml`, v38):** `agent.execution_guidance` and
  `tool_use_enforcement` forced `true` (Hermes `auto` excludes gemini); `tool_loop_guardrails` hard stop
  3/5/3; `terminal.cwd` = profile `workspace/`; `verify_on_stop: false` (its nudge ran `hermes verify` →
  `pnpm install` at the monorepo root via the junction — do not re-enable). **FULL AUTO (Chief):**
  `memory.write_approval`, `skills.write_approval`, `skills.guard_agent_created` all `false`.
- **Persona:** `SOUL.md` carries the Execution rule + BLOCKED format; repo `ai/profiles/avery` ≡ runtime
  (push with `scripts/push-profile-to-runtime.ps1 -Execute`). `contact-outreach` v5.0.0 is canonical
  (broker procedure dropped as a second permission layer) — revert with
  `git checkout 247ff40 -- projects/healthcare/avery/ai/profiles/avery/skills/contact-outreach/SKILL.md`.
- **Respond in any group when mentioned — ready, one line from Chief:** config already has
  `dm_policy: allowlist` + `allow_from` (DM gated at the adapter, before allow-all authz). Chief adds
  `WHATSAPP_ALLOW_ALL_USERS=1` to the profile `.env` (Claude harness refuses to write it), flips
  `group_policy: open`, restarts via `scripts/restart-gateway.ps1 -Execute`. Also added:
  `fallback_providers` (gemini-2.0-flash on the same key), `health-check.ps1` ingress counts.
- **Windows `hermes gateway restart` has a pid-file race** (two instances at 00:12, unclean exit at
  00:27) — always use `scripts/restart-gateway.ps1`.
- **Pending Chief-driven tests:** FIX-02 2.7, T1, T2, T8, T9, T10 need real WhatsApp messages; read
  `grep ingress profiles/avery/logs/gateway.log` and paste sanitised lines into `docs/evidence/`.

## Known-red gates (pre-existing, not from this change set)

- Every `pnpm` script fails at deps-status: `packages/api` depends on `@safrs/auth@workspace:*` but
  `packages/auth` has no `package.json` (since `2fa329a`). `pnpm governance/lint/check:tokens/...` cannot run.
  Run `bash scripts/safrs-verify.sh` directly: all OK except task ownership of
  `.safrs/reviews/verification-integrity.json` (Chief's own uncommitted edit, with root `AGENTS.md` and
  `.agents/CONTEXT.md` — leave them).
- Capsule tests: `powershell -File projects/healthcare/avery/scripts/test.ps1` → 42/42 OK.

## Next action

Chief sends the WhatsApp test messages (or the group-policy decision); paste evidence, close the
checklist. Any lane (subagent) work follows `~/.claude/skills/orchestration/SKILL.md` — one-way pipe,
6-part spec, 10-minute budget, never trusted without re-verification.
