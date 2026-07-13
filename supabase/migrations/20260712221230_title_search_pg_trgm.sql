-- Title search for the deck (ROADMAP 1.4, PRD 3.2a): enable pg_trgm and
-- add a trigram GIN index so the deck's title search — a parameterized
-- PostgREST .ilike('%q%') filter, never a hand-built SQL string (rule 7)
-- — stays indexed as jobs grow past seed scale.
--
-- Chosen over tsvector full-text search (1.4 decision 4, DECISIONS
-- 2026-07-12): job titles are short strings where substring matching
-- ("develop" hits "Developer") beats stemmed word search.

-- Supabase convention: extensions live in the extensions schema, never
-- public. pg_trgm is data-only (types/functions/opclasses); it adds no
-- privileges and touches no RLS.
create extension if not exists pg_trgm with schema extensions;

-- GIN trigram index on the search column. pg_trgm accelerates
-- LIKE/ILIKE with leading wildcards, which btree cannot. The deck
-- query's mandatory predicates (is_active AND is_fresh AND posted_at
-- window, rule 14) ride jobs_deck_idx; this index serves the title term.
create index jobs_title_trgm_idx
  on public.jobs
  using gin (title extensions.gin_trgm_ops);
