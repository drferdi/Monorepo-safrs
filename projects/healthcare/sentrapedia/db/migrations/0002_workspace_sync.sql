-- Sentrapedia server-side persistence, the workspace_sync table of docs/plans/active/2026-10-25-e2e-integration.md.
-- Added after Gaffer answered the question 0001 deliberately left open: "Body dokumen ikut sync. Lanjutkan S2
-- scrubber lalu workspace_sync." 0001 is never edited; a new migration is the only way a schema moves forward.
--
-- What reaches this table is the projection built by src/lib/sync/guard.ts, not a workspace blob:
--   * patient_ref is the random local id, never a name - pseudonymisation at the edge (decision 2026-10-25);
--   * a document whose free text trips containsIdentity is held back whole, never rewritten, so no row here is
--     a redacted version of a clinical note;
--   * message revisions, originalContent, templateSnapshot and sourceText are excluded by that projection.
--     sourceText matters most: it carries the whole AadiAnalysis, including the TheOracle passages that
--     grounded the answer, and that corpus is private data which never leaves the capsule.
--
-- format_version pins the stored format (1 today, src/lib/workspace.ts). It travels on every row so a reader
-- can refuse a version it does not know, which is the "ship the reader before the writer" rule in docs/data.md.

begin;

create table if not exists workspace_sync (
  user_id        text not null references profile (user_id) on delete cascade,
  doc_id         text not null,
  format_version integer not null,
  patient_ref    text,
  body           jsonb not null,
  updated_at     timestamptz not null default now(),
  primary key (user_id, doc_id),
  constraint workspace_sync_format_version_known check (format_version = 1)
);

-- Condition 1: enable alone leaves the owner of the table reading every row, and migrations run as the owner.
alter table workspace_sync enable row level security;
alter table workspace_sync force row level security;

-- Condition 3: both clauses over the missing-ok setting, so an unset principal reads and writes nothing.
create policy workspace_sync_principal on workspace_sync
  using (user_id = current_setting('app.user_id', true))
  with check (user_id = current_setting('app.user_id', true));

-- Condition 2 holds from 0001: sentrapedia_runtime owns nothing and is nosuperuser, nobypassrls. Data only.
grant select, insert, update, delete on workspace_sync to sentrapedia_runtime;

commit;
