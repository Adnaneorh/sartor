-- jobs: shared reference table of normalized postings (PRD §5, 3.2b, 3.2c).
-- Read-only for authenticated users; ONLY the worker / seed script
-- (service-role key) writes — golden rule 1. RLS ships in this migration.
--
-- Freshness (rule 14 / PRD 3.2b): posted_at is NOT NULL — a posting whose
-- age is unknown cannot be proven fresh, so undated postings are never
-- inserted. is_fresh (daily worker pass) and is_active (source still lists
-- it) are INDEPENDENT flags; the deck query hard-filters
-- is_active AND is_fresh AND posted_at >= now() - interval '10 days'.
-- RLS deliberately does NOT hide stale/dead rows: the tracker must keep
-- showing jobs the user applied to (flagged dead in UI, PRD 3.2b#5).

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,        -- 'seed' now; 'greenhouse'|'lever'|'adzuna'|... in Phase 2
  external_id text not null,   -- posting id at the source
  company text not null,
  title text not null,
  province text,               -- 2-letter code as in profiles ('ON'); null allowed: Canada-wide remote postings
  city text,
  is_remote boolean not null default false,
  logo_url text,               -- null → UI renders a company-initial monogram (Phase 2 fills when a source provides one)
  salary_min_cad integer,
  salary_max_cad integer,
  description text not null,
  apply_url text not null,
  apply_mode text not null default 'hard'
    check (apply_mode in ('easy', 'hard')),  -- guilty until proven easy (PRD 3.2c)
  -- fixed NOC-family list is defined + validated at ingest in Phase 2
  -- (AI call point #8); until then everything is 'uncategorized' (zeroes
  -- the personality term per job, PRD 3.1b). No CHECK list yet — the
  -- canonical list doesn't exist before the Phase 2 crosswalk work.
  occupation_category text not null default 'uncategorized',
  tags text[] not null default '{}',  -- 3-4 card highlight tags (PRD 3.2)
  posted_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  is_active boolean not null default true,
  is_fresh boolean not null default true,
  -- sha256 hex of lower(company)|lower(title)|coalesce(province,'')|lower(coalesce(city,''))
  -- (PRD 3.2c: company+title+location). DELIBERATELY NOT UNIQUE: two unique
  -- constraints = two upsert identities, and ON CONFLICT arbitrates only
  -- one — the first cross-source duplicate would 23505 the whole ingest
  -- batch. Dedup is ingest-side logic (PRD 3.2c); ROADMAP 2.2's "upsert
  -- logic" task owns the final arbiter/merge policy decision.
  dedup_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_salary_range_valid check (
    salary_min_cad is null
    or salary_max_cad is null
    or salary_min_cad <= salary_max_cad
  ),
  constraint jobs_source_external_id_key unique (source, external_id)
);

comment on table public.jobs is
  'Shared reference table of job postings. Read-only to authenticated (RLS + select-only grant); written only via service-role (worker/seed).';

-- reuse public.set_updated_at() from the profiles migration
create trigger jobs_set_updated_at
  before update on public.jobs
  for each row
  execute function public.set_updated_at();

-- Deck query pattern (1.4). Predicate is is_active ONLY so the index
-- serves the query whether or not it adds the is_fresh term; posted_at
-- does the freshness work at query time regardless.
create index jobs_deck_idx on public.jobs (posted_at desc) where is_active;
create index jobs_province_idx on public.jobs (province);
create index jobs_dedup_hash_idx on public.jobs (dedup_hash);
-- title full-text / pg_trgm search is ROADMAP 1.4's task, not added here

-- Row Level Security: shared reference table (golden rule 1) — everyone
-- authenticated may read every row; nobody but service_role writes.
alter table public.jobs enable row level security;

create policy "jobs_select_authenticated"
  on public.jobs for select
  to authenticated
  using (true);

-- Privileges: this stack's default ACLs hand anon/authenticated latent
-- privileges on every new table — verified live 2026-07-11: pg_default_acl
-- (grantor postgres, schema public) grants them Dxtm = TRUNCATE, REFERENCES,
-- TRIGGER, MAINTAIN, and RLS does NOT police TRUNCATE. Revoke first so the
-- privilege state is deterministic on every stack (local CLI, hosted,
-- dashboard-created — where tables get FULL DML by default), then grant
-- exactly what the model needs: authenticated reads, service_role writes,
-- anon NOTHING.
-- No insert/update/delete policy or grant exists for authenticated, so
-- client writes are denied at the privilege layer (42501) before RLS is
-- even consulted.
revoke all on table public.jobs from anon, authenticated;
grant select on table public.jobs to authenticated;
grant all on table public.jobs to service_role;
