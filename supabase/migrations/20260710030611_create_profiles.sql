-- profiles: user persona (PRD §5). Email lives in auth.users ONLY — never
-- duplicated here (PRD §5). Phone is optional and no full DOB is ever
-- collected (PIPEDA minimization, CLAUDE.md golden rule 15).
-- RLS ships in this same migration per golden rule 1.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  age_confirmed boolean not null default false,
  desired_roles text[] not null default '{}',
  province text,
  cities text[] not null default '{}',
  -- remote_preference / seniority stay free text until Phase 1 onboarding
  -- fixes their option lists (validated by Zod at the boundary, rule 11)
  remote_preference text,
  salary_min_cad integer,
  salary_max_cad integer,
  seniority text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salary_range_valid
    check (
      salary_min_cad is null
      or salary_max_cad is null
      or salary_min_cad <= salary_max_cad
    )
);

comment on table public.profiles is
  'User persona. Strictly user-scoped via RLS (user_id = auth.uid()).';

-- keep updated_at honest on every update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Row Level Security: user-owned table, strictly user-scoped (golden rule 1)
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Explicit privileges (newer stacks don't auto-grant on new tables):
-- GRANTs gate the table, RLS policies filter the rows. anon gets NOTHING —
-- logged-out clients are denied at the privilege layer, not just filtered.
grant select, insert, update, delete on table public.profiles to authenticated;
grant all on table public.profiles to service_role;
