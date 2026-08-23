# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-23 (medisync WhatsApp fix merged; Avery autonomy foundation started; profile skills now versioned)

## Current state

- **Medisync WhatsApp fix — merged to `main`** (`127c76d`; work in `2a4355f`, handoff `35a78f0`, Chief's review evidence `63e33eb`). Avery never answered in WhatsApp groups because `group_policy: none` — an unreplaced template placeholder — is not a value `_is_group_allowed()` recognises, so every group message was dropped with no log line at all. Full account, including the live group JIDs, in `projects/healthcare/medisync/docs/whatsapp-group-fix.md`.
- **Three config traps that cause silent failure — do not rediscover.** (1) The top-level `whatsapp:` block **overrides** `gateway.platforms.whatsapp.extra` for every bridgeable key; `group_allowed_chats` and `free_response_chats` are the exceptions and only work inside `extra`. (2) `mention_patterns` regexes must be single-quoted YAML — in double quotes the backslash is escaped twice and the pattern never matches. (3) `group_policy: open` refuses to start since Hermes 0.20.4 unless `WHATSAPP_ALLOW_ALL_USERS` is set, and that flag authorises **anyone** in groups and DMs alike, so `allowlist` plus `scripts/check-unregistered-groups.ps1` is the workable posture.
- **Hermes runtime now lives inside the capsule**, on Chief's instruction: `projects/healthcare/medisync/runtime/` (3.6 GB) with directory junctions left at every original location, so all absolute paths — four `mcp_servers` entries, `HERMES_HOME`, the AppData symlink, the NSIS updater — keep working untouched. The whole directory is gitignored; `git status` stays clean. Chief's instruction overrides the capsule `AGENTS.md` location rule, not its no-commit rule.
- **The NSIS installer ignores junctions.** Updating Hermes Studio empties the junction target, deletes the junction, and writes a real directory back at the old path — every update reverses the folder migration. Repair with `scripts/verify-runtime-junctions.ps1 -Fix` after each Studio update.
- **Also done in this session:** Hermes Studio 0.6.46 installed (SQLite 3.50.4 → 3.53.1, WAL-reset bug gone); runtimes 0.19.0/0.20.0 removed; pre-migration backups deleted after verification (~3.5 GB reclaimed). Avery verified end-to-end after every step — real WhatsApp messages answered in DM and in groups.
- **Integrity review APPROVED by Chief** for this change set (`.safrs/reviews/verification-integrity.json`, base `38a0f3a0b104`, fingerprint `38d9e195…`). Fingerprint-bound: any further edit to a classified path invalidates it and Chief must re-sign.
- **Avery autonomy foundation started**, following `HERMES_AUTONOMY_DIRECTIVE.md`. `docs/gate-0-reality-audit.md` is the Gate 0 deliverable the directive §14 demands: evidence-based inventory of runtime, model, tools, WhatsApp, task store, authorisation, and observability, plus the gap to Gate 1.
- **Gate 0's two useful surprises.** (1) `browser` reporting "system dependency not met" is **not** a gap — `check_browser_requirements()` returns False because `browser-use` replaces the whole `browser_*` surface, and that is active. Do not report it as missing web capability. (2) Kanban already **is** the run-ID audit trail the directive asks for — `create` returns an ID, `show` lists timestamped Events, `complete` records `[run 1] completed`. Proven end-to-end on task `t_d24db445`. Nothing needed building.
- **Five skills now versioned** under `projects/healthcare/medisync/ai/profiles/avery/skills/`: `capability-and-limits` (limits are a starting point, never an excuse), `execution-audit` (work that leaves no trace did not happen), `new-member-watch` (bridge does not forward join events; poll `GET /chat/<jid>` against a snapshot instead — cron runs every 2h), `contact-outreach`, and `kediri-knowledge` (24 verified Kediri Raya records with schema and source registry).
- **`scripts/sync-profile-to-repo.ps1` closes the gap that caused this.** Everything under `runtime/` is gitignored, so skills written there were invisible to git. The script copies skills and `SOUL.md` out, refusing credentials, databases, runtime state, and — because **this repository is PUBLIC** — any file matching an Indonesian phone number, a WhatsApp JID, or an API-key pattern.
- **The repository is public. Treat it as such.** `docs/whatsapp-group-fix.md` contains real phone numbers and group JIDs and is committed but **not yet pushed**. Chief has not decided: redact, make the repo private, or push as-is. Do not push `main` before that decision.

- **Still open from the previous session** (unchanged): `pnpm install` never ran, so `pnpm test:contracts` is unverified against the domain layout; smartboard web sub-phase 2 plan is `PROPOSED` with 3 open decisions for Chief; the smartboard web security boundary is written in `projects/academic/academic-smartboard/apps/web/AGENTS.md` § "Batas keamanan" — read it before any deploy; never use `robocopy /MOVE` inside a pnpm workspace.
- **Unpushed:** 19 commits on `main`, including everything from this session.

## Next actions

1. Chief: decide on `docs/whatsapp-group-fix.md` before any push — it carries real phone numbers and group JIDs into a public repository.
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
