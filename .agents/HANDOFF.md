# HANDOFF — Current State and Next Action

> Read first every session. Keep under ~1k tokens.
> Durable detail: `DECISIONS.md`. Area tracker: `PROGRESS.md`. Decision history: `docs/adrs/`.
> Rule: **overwrite** each session — this is current state, not a log.

Last updated: 2026-08-23 (avery recovery & hardening: skill manifest, outbound broker, test suite, Windows recovery tools; group-fix doc sanitised)

## Current state

- **Medisync WhatsApp fix — merged to `main`** (`127c76d`; work in `2a4355f`, handoff `35a78f0`, Chief's review evidence `63e33eb`). Avery never answered in WhatsApp groups because `group_policy: none` — an unreplaced template placeholder — is not a value `_is_group_allowed()` recognises, so every group message was dropped with no log line at all. Full account, including the live group JIDs, in `projects/healthcare/avery/docs/whatsapp-group-fix.md`.
- **Three config traps that cause silent failure — do not rediscover.** (1) The top-level `whatsapp:` block **overrides** `gateway.platforms.whatsapp.extra` for every bridgeable key; `group_allowed_chats` and `free_response_chats` are the exceptions and only work inside `extra`. (2) `mention_patterns` regexes must be single-quoted YAML — in double quotes the backslash is escaped twice and the pattern never matches. (3) `group_policy: open` refuses to start since Hermes 0.20.4 unless `WHATSAPP_ALLOW_ALL_USERS` is set, and that flag authorises **anyone** in groups and DMs alike, so `allowlist` plus `scripts/check-unregistered-groups.ps1` is the workable posture.
- **Hermes runtime now lives inside the capsule**, on Chief's instruction: `projects/healthcare/avery/runtime/` (3.6 GB) with directory junctions left at every original location, so all absolute paths — four `mcp_servers` entries, `HERMES_HOME`, the AppData symlink, the NSIS updater — keep working untouched. The whole directory is gitignored; `git status` stays clean. Chief's instruction overrides the capsule `AGENTS.md` location rule, not its no-commit rule.
- **The NSIS installer ignores junctions.** Updating Hermes Studio empties the junction target, deletes the junction, and writes a real directory back at the old path — every update reverses the folder migration. Repair with `scripts/verify-runtime-junctions.ps1 -Fix` after each Studio update.
- **Also done in this session:** Hermes Studio 0.6.46 installed (SQLite 3.50.4 → 3.53.1, WAL-reset bug gone); runtimes 0.19.0/0.20.0 removed; pre-migration backups deleted after verification (~3.5 GB reclaimed). Avery verified end-to-end after every step — real WhatsApp messages answered in DM and in groups.
- **Integrity review APPROVED by Chief** for this change set (`.safrs/reviews/verification-integrity.json`, base `38a0f3a0b104`, fingerprint `38d9e195…`). Fingerprint-bound: any further edit to a classified path invalidates it and Chief must re-sign.
- **Avery autonomy foundation started**, following `HERMES_AUTONOMY_DIRECTIVE.md`. `docs/gate-0-reality-audit.md` is the Gate 0 deliverable the directive §14 demands: evidence-based inventory of runtime, model, tools, WhatsApp, task store, authorisation, and observability, plus the gap to Gate 1.
- **Gate 0's two useful surprises.** (1) `browser` reporting "system dependency not met" is **not** a gap — `check_browser_requirements()` returns False because `browser-use` replaces the whole `browser_*` surface, and that is active. Do not report it as missing web capability. (2) Kanban already **is** the run-ID audit trail the directive asks for — `create` returns an ID, `show` lists timestamped Events, `complete` records `[run 1] completed`. Proven end-to-end on task `t_d24db445`. Nothing needed building.
- **Five skills now versioned** under `projects/healthcare/avery/ai/profiles/avery/skills/`: `capability-and-limits` (limits are a starting point, never an excuse), `execution-audit` (work that leaves no trace did not happen), `new-member-watch` (bridge does not forward join events; poll `GET /chat/<jid>` against a snapshot instead — cron runs every 2h), `contact-outreach`, and `kediri-knowledge` (24 verified Kediri Raya records with schema and source registry).
- **`scripts/sync-profile-to-repo.ps1` closes the gap that caused this.** Everything under `runtime/` is gitignored, so skills written there were invisible to git. The script copies skills and `SOUL.md` out, refusing credentials, databases, runtime state, and — because **this repository is PUBLIC** — any file matching an Indonesian phone number, a WhatsApp JID, or an API-key pattern.
- **Layered documentation added by Grav** to `avery/docs/` and `sentrabot/docs/`: `1-human/` (onboarding, cognitive architecture, self-hosting), `2-agent/` (context bootstrap, state machines, API contracts), `3-governance/` (permission broker, data privacy, SBOM), each with a `README.md` map. The pre-existing flat docs — `architecture.md`, `data.md`, `testing.md`, `deploy-hostinger.md`, `whatsapp-group-fix.md`, `gate-0-reality-audit.md` — are untouched and still live alongside them. Scanned clean of phone numbers, JIDs, and key patterns before commit.
- **Group names now resolve.** Avery used to see her own groups as raw IDs. `channel_aliases.json` in the runtime profile is Hermes' own friendly-name overlay, re-applied on every directory rebuild; it now carries all five group names. Runtime-only change, nothing versioned.

- **Avery recovery & hardening landed** (plan `projects/healthcare/avery/docs/superpowers/plans/2026-08-23-avery-complete-recovery-and-hardening.md`). `ai/profiles/avery/custom-skills.json` names exactly 18 Avery-owned skill trees; 20 bundled/managed Hermes trees and 5 skill-manager state files were `git rm`'d. `sync-profile-to-repo.ps1` is manifest-gated, backs up before overwrite, verifies SHA-256, and `-WhatIf` is proven zero-mutation. `src/avery_outbound/` is an approval-bound broker: `prepare` → `approve` (15-min expiry) → `status` prints the `hermes -p avery send` argv once, never executes it, never touches the allowlist (unregistered recipient = exit 3). `scripts/outreach.py` (which mutated `.env`) is gone. New tools: `health-check.ps1` (sanitised JSON, exit 0/1/2), `restart-gateway.ps1` (dry-run default), `restore-native-runtime-layout.ps1` (fail-closed; refused on this machine because 7 Hermes processes were live — correct), `member_watch.py`. Test: `pwsh -NoProfile -File projects/healthcare/avery/scripts/test.ps1` — 42 tests green (`powershell.exe` 5.1 runs it too; `pwsh` is not installed here).
- **`docs/whatsapp-group-fix.md` is sanitised** — all JIDs and phone numbers replaced with placeholders, the "repository is private" claim removed. **The real values remain in git history** (commits before this session, unpushed). Chief still decides: rewrite history, make the repo private, or accept. Do not push `main` before that decision.
- **Live gates NOT passed** — nothing in this session touched the runtime profile, sent a message, or restarted the gateway. The human cutover gate (Chief applies the profile diff manually), the single-recipient E2E gate, and the 7-day monitoring gate are all open.

- **Still open from the previous session** (unchanged): `pnpm install` never ran, so `pnpm test:contracts` is unverified against the domain layout; smartboard web sub-phase 2 plan is `PROPOSED` with 3 open decisions for Chief; the smartboard web security boundary is written in `projects/academic/academic-smartboard/apps/web/AGENTS.md` § "Batas keamanan" — read it before any deploy; never use `robocopy /MOVE` inside a pnpm workspace.
- **Unpushed:** 19 commits on `main`, including everything from this session.

## Next actions

1. Chief: decide on git history of `docs/whatsapp-group-fix.md` before any push — the working tree is sanitised, earlier commits are not.
2. Chief: review the `ai/profiles/avery/` diff and apply it manually to the runtime profile (human cutover gate); then supply a non-production test recipient for one broker-prepared send.
3. `pnpm install` — `vitest`/`tsc` are absent, so `pnpm test:contracts` could not be run.
4. Chief: push `main` (merges land locally, unpushed).
5. Chief: approve smartboard web sub-phase 2 plan (`PROPOSED` → `ACTIVE`) and answer its 3 open decisions.
6. After any Hermes Studio update: run `projects/healthcare/avery/scripts/verify-runtime-junctions.ps1 -Fix` or the fail-closed `restore-native-runtime-layout.ps1 -Execute`.
7. When Avery goes quiet in a group: run `projects/healthcare/avery/scripts/check-unregistered-groups.ps1` — unregistered groups fail silently by design.

## Verify

```bash
bash scripts/safrs-verify.sh
```

Passing as of this handoff: topology, task contracts, ownership, sensitive classification (review approved), status claims.
