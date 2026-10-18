# Plan: a migration path for the workspace storage format (tech-debt row 14)

Status: plan only, waiting for Gaffer's "go". It concerns clinicians' local data, so nothing here is implemented. Written 2026-10-19.

## Today

- `src/lib/workspace.ts` stores one JSON blob under `sentrapedia-workspace-v1` with `version: 1`. `parseWorkspace` returns null for any other version, any message whose mode id is not in today's `modeIds`, or any failed field.
- Since 2026-10-17 a blob that fails validation is not lost: `loadWorkspace` keeps it under `sentrapedia-workspace-v1-unreadable`, a notice is shown, and the Workspace dialog offers it as a download. The app then starts from the demo workspace.
- Backups: "Ekspor backup" writes the same JSON; "Impor backup" runs `parseWorkspace` and asks before replacing local data.
- So a v2 format, a renamed mode or a new required field would still move every clinician's data into the unreadable copy at the first load of the new build. The data survives, but the clinician must notice the notice and has no way back in.

## Goal

A build that changes the format reads every older format it has shipped, upgrades it in memory, and never overwrites the only copy of the older data.

## Design

1. One parser per version and a migration chain. `parseWorkspaceV1` is today's `parseWorkspace`, unchanged. Each later version adds `migrateVn(data: WorkspaceVn): WorkspaceVn+1`, a pure function. `parseWorkspace(raw)` reads `version`, parses with that version's parser, then applies the migrations up to the current version. An unknown or newer version stays unreadable (today's path), never the demo workspace overwriting it.
2. Mode renames are data, not code: a `modeAliases` table (`{ oldId: newId }`) that the parser applies before the `modeIds` check. Removing a mode needs an explicit decision about its messages (keep them under a generic mode), not a silent rejection.
3. New key per format version. A v2 build reads `sentrapedia-workspace-v2`; if absent, it reads the v1 key, migrates, writes v2, and leaves the v1 blob untouched with a `migratedAt` marker in the v2 data. Rollback to an older build then still finds its own data (as of the migration). The v1 copy is removed only by a later release, after Gaffer decides.
4. Storage limits: two copies can exceed the browser quota (the app already warns from 4 million characters). If writing v2 fails, the build keeps running on the migrated data in memory, shows the existing "not saved" warning and offers the backup download; the v1 key is never deleted to make room.
5. Backups: import accepts every version the build can migrate; export writes the current version.
6. Release order: ship the reader and migration first (reads v1 and v2, still writes v1), then the writer of v2 in a later release, so a rollback between the two never meets data it cannot read.

## Tests (written before the code)

- Fixtures: synthetic exported backups for every shipped shape, including the 2026-10-09 "Patient" seed, workflow fields, revisions and templates, committed under `tests/fixtures/workspace/`.
- Each fixture migrates to the current version and round-trips through export and import unchanged.
- Migration is idempotent; a renamed mode keeps its messages; an unknown future version lands in the unreadable copy and the original key is not overwritten.
- The v1 key is untouched after a migration; a failed v2 write keeps the in-memory workspace and the warning.

## Open questions for Gaffer

1. Is there a concrete v2 change waiting (a renamed mode, a new required field), or is this groundwork? Without one, step 1 and the fixtures are the only part worth building now.
2. Separate key per version (recommended, keeps a rollback copy) or the same key with only the `version` field changing (one copy, smaller quota use, no rollback)?
3. When may the old v1 copy be deleted: after one release, after N days, or only by the clinician from the Workspace dialog?
