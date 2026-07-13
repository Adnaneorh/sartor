-- swipes: one row per user decision on a job (PRD §5, §3.2; ROADMAP 1.4).
-- User-owned table (golden rule 1): a swipe is private career data, so
-- RLS is strictly user-scoped and ships in this migration.
--
-- UNIQUE (user_id, job_id) is the "a job never reappears once swiped"
-- invariant (PRD 3.2). Undo DELETES the row (approved 1.4 decision 3),
-- so a re-swipe after undo is a fresh INSERT and no legitimate UPDATE
-- path exists — deliberately no update policy and no UPDATE grant.

create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  direction text not null check (direction in ('left', 'right')),
  created_at timestamptz not null default now(),
  -- one decision per user per job; the deck's exclusion set reads via
  -- this unique index (leading column = user_id)
  constraint swipes_user_job_key unique (user_id, job_id)
);

comment on table public.swipes is
  'User swipe decisions. Strictly user-scoped via RLS (user_id = auth.uid()); undo = delete own row, no update path.';

-- FK cascade path: the seed script PRUNES jobs rows (delete) on re-run —
-- without this index every jobs delete seq-scans swipes.
create index swipes_job_id_idx on public.swipes (job_id);

-- Row Level Security: user-owned table, strictly user-scoped (golden
-- rule 1). Policy set mirrors profiles EXCEPT no update policy — undo
-- deletes, re-swipe inserts; smallest privilege surface.
alter table public.swipes enable row level security;

create policy "swipes_select_own"
  on public.swipes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "swipes_insert_own"
  on public.swipes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "swipes_delete_own"
  on public.swipes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Privileges (1.3 lesson, migration 20260711201512): this stack's
-- default ACLs hand anon/authenticated latent privileges (TRUNCATE,
-- REFERENCES, TRIGGER, MAINTAIN) on every new table, and RLS does NOT
-- police TRUNCATE. Revoke first so the privilege state is deterministic
-- on every stack, then grant exactly what the model needs:
-- authenticated selects/inserts/deletes its OWN rows (RLS filters),
-- NO UPDATE at all; service_role everything; anon NOTHING.
revoke all on table public.swipes from anon, authenticated;
grant select, insert, delete on table public.swipes to authenticated;
grant all on table public.swipes to service_role;
