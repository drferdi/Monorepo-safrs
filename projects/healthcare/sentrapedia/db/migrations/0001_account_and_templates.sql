-- Sentrapedia server-side persistence, step S1 of docs/plans/active/2026-10-25-e2e-integration.md.
-- Scope is deliberately narrow: account data and doctor-authored templates only. The workspace_sync table
-- waits for Gaffer's answer on whether document bodies sync at all (open question 7).
--
-- Decision 2026-10-25 (.agents/DECISIONS.md): Neon Postgres, no Clerk token at the database. The principal
-- arrives as a transaction-local setting that the server sets inside the same transaction as the query:
--
--   begin;
--   select set_config('app.user_id', $1, true);   -- true = transaction-local, survives a transaction pooler
--   select ... ;                                  -- policies below restrict this to that principal
--   commit;
--
-- set_config is used rather than SET LOCAL because SET takes no bind parameter. The principal is validated
-- against validUserId (src/lib/auth/policy.ts) before it ever reaches here.
--
-- Decision 2026-10-25: patient identity never reaches this database. patient_ref, where it later appears,
-- is the existing random local id and never a hash of a name, which a dictionary reverses.

begin;

-- Condition 2 of the three RLS conditions: the role the application connects as owns nothing, cannot bypass
-- row-level security and is not superuser. Migrations run as the owner, which is a different credential.
-- The password is set out of band by the operator (alter role ... password), never in a tracked file.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'sentrapedia_runtime') then
    create role sentrapedia_runtime login nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  end if;
end
$$;

create table if not exists profile (
  user_id     text primary key,
  specialty   text,
  language    text,
  -- The account holder's own display name. This is the doctor, never a patient.
  display_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profile_user_id_shape check (user_id ~ '^user_[A-Za-z0-9]{1,120}$')
);

create table if not exists personal_template (
  user_id     text not null references profile (user_id) on delete cascade,
  template_id text not null,
  body        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, template_id)
);

-- Condition 1: enable is not enough. A table's owner bypasses its own policies unless RLS is forced, and the
-- migration credential owns these tables. Both statements are required on every table.
alter table profile enable row level security;
alter table profile force row level security;
alter table personal_template enable row level security;
alter table personal_template force row level security;

-- Condition 3: both using and with check, over the missing-ok setting. current_setting(..., true) returns null
-- when the setting is absent, and null never equals user_id, so a query that escapes the transaction reads
-- nothing and writes nothing. That is the safe failure, and it is why the third argument is true.
create policy profile_principal on profile
  using (user_id = current_setting('app.user_id', true))
  with check (user_id = current_setting('app.user_id', true));

create policy personal_template_principal on personal_template
  using (user_id = current_setting('app.user_id', true))
  with check (user_id = current_setting('app.user_id', true));

-- Data access only. No schema rights, no ownership, nothing that would let the runtime role drop a policy.
grant usage on schema public to sentrapedia_runtime;
grant select, insert, update, delete on profile to sentrapedia_runtime;
grant select, insert, update, delete on personal_template to sentrapedia_runtime;

commit;
