# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-23 (medisync WhatsApp group replies restored; Hermes runtime moved inside the capsule)

## Current state

- **Medisync WhatsApp fix — committed** (`2a4355f` on `fix/medisync-whatsapp-group-replies`, 8 files). Avery never answered in WhatsApp groups because `group_policy: none` — an unreplaced template placeholder — is not a value `_is_group_allowed()` recognises, so every group message was dropped with no log line at all. Full account, including the live group JIDs, in `projects/healthcare/medisync/docs/whatsapp-group-fix.md`.
- **Three config traps that cause silent failure — do not rediscover.** (1) The top-level `whatsapp:` block **overrides** `gateway.platforms.whatsapp.extra` for every bridgeable key; `group_allowed_chats` and `free_response_chats` are the exceptions and only work inside `extra`. (2) `mention_patterns` regexes must be single-quoted YAML — in double quotes the backslash is escaped twice and the pattern never matches. (3) `group_policy: open` refuses to start since Hermes 0.20.4 unless `WHATSAPP_ALLOW_ALL_USERS` is set, and that flag authorises **anyone** in groups and DMs alike, so `allowlist` plus `scripts/check-unregistered-groups.ps1` is the workable posture.
- **Hermes runtime now lives inside the capsule**, on Chief's instruction: `projects/healthcare/medisync/runtime/` (3.6 GB) with directory junctions left at every original location, so all absolute paths — four `mcp_servers` entries, `HERMES_HOME`, the AppData symlink, the NSIS updater — keep working untouched. The whole directory is gitignored; `git status` stays clean. Chief's instruction overrides the capsule `AGENTS.md` location rule, not its no-commit rule.
- **The NSIS installer ignores junctions.** Updating Hermes Studio empties the junction target, deletes the junction, and writes a real directory back at the old path — every update reverses the folder migration. Repair with `scripts/verify-runtime-junctions.ps1 -Fix` after each Studio update.
- **Also done in this session:** Hermes Studio 0.6.46 installed (SQLite 3.50.4 → 3.53.1, WAL-reset bug gone); runtimes 0.19.0/0.20.0 removed; pre-migration backups deleted after verification (~3.5 GB reclaimed). Avery verified end-to-end after every step — real WhatsApp messages answered in DM and in groups.
- **Integrity review APPROVED by Chief** for this change set (`.safrs/reviews/verification-integrity.json`, base `38a0f3a0b104`, fingerprint `38d9e195…`). Fingerprint-bound: any further edit to a classified path invalidates it and Chief must re-sign.
- **Still open from the previous session** (unchanged): `pnpm install` never ran, so `pnpm test:contracts` is unverified against the domain layout; smartboard web sub-phase 2 plan is `PROPOSED` with 3 open decisions for Chief; the smartboard web security boundary is written in `projects/academic/academic-smartboard/apps/web/AGENTS.md` § "Batas keamanan" — read it before any deploy; never use `robocopy /MOVE` inside a pnpm workspace.
- **Unpushed:** `5b74cc2`, `eba5ff1`, `444554e` on `main`, plus `2a4355f` on the fix branch.

## Next actions

1. Merge `fix/medisync-whatsapp-group-replies` into `main` (integrity evidence is in place).
2. `pnpm install` — `vitest`/`tsc` are absent, so `pnpm test:contracts` could not be run.
3. Chief: push `main` (merges land locally, unpushed).
4. Chief: approve smartboard web sub-phase 2 plan (`PROPOSED` → `ACTIVE`) and answer its 3 open decisions.
5. After any Hermes Studio update: run `projects/healthcare/medisync/scripts/verify-runtime-junctions.ps1 -Fix`.
6. When Avery goes quiet in a group: run `projects/healthcare/medisync/scripts/check-unregistered-groups.ps1` — unregistered groups fail silently by design.

## Verify

```bash
bash scripts/safrs-verify.sh
```

Passing as of this handoff: topology, task contracts, ownership, sensitive classification (review approved), status claims.
