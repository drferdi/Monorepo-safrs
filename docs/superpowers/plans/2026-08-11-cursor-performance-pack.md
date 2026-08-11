# Cursor Performance Pack Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox syntax.

**Goal:** Ship Cursor ignore files, thin `.mdc` adapters, gitignore un-ignore for rules, and `CURSOR_SETUP.md` without duplicating SAFRS policy.

**Architecture:** AGENTS.md remains canonical; `.cursor/rules/*.mdc` are pointers with Cursor activation metadata; ignore files protect secrets and shrink the index.

**Tech Stack:** Cursor Project Rules (`.mdc`), `.cursorignore`, `.cursorindexingignore`, gitignore negation.

## Global Constraints

- Adapters must not redefine R0–R3 or weaken SECURITY.md / SAFRS_SPEC.md.
- Each `.mdc` stays short (target &lt; 40 lines) and references files instead of copying them.
- Do not edit `.agents/knowledge/` without Chief approval.
- Commit only when Chief requests.

---

### Task 1: Gitignore + ignore files

- [x] Replace `.cursor` with `.cursor/*` + `!.cursor/rules/` + `!.cursor/rules/**`
- [x] Add root `.cursorignore` (secrets only)
- [x] Add root `.cursorindexingignore` (index noise only)

### Task 2: Always + glob `.mdc` adapters

- [x] Tighten `.cursor/rules/safrs.mdc` (alwaysApply)
- [x] Add `ui-tokens.mdc`, `api-boundary.mdc`, `database-boundary.mdc`, `web-golden-path.mdc`, `tools-governance.mdc`

### Task 3: Agent-requested `.mdc` adapters

- [x] Add `verify-before-done.mdc`, `plan-r2-r3.mdc`, `security-surfaces.mdc`

### Task 4: Docs + handoff

- [x] Add `docs/bootstrap/CURSOR_SETUP.md`
- [x] Link from `docs/bootstrap/README.md`
- [x] Register doc in `.safrs/document-registry.json` if needed
- [x] Overwrite `.agents/HANDOFF.md`

### Task 5: Verify

- [x] Confirm `.cursor/rules/*.mdc` are visible to `git status` (not ignored)
- [x] Run `bash scripts/safrs-verify.sh` — **classified R2** (agent adapters + `.safrs/document-registry.json`); flagged `SAFRS_VERIFICATION_INTEGRITY_REVIEW=required`. Chief review before commit.
