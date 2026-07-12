-- Harden profiles privileges (1.3 session add-on, Adnane-approved 2026-07-11).
--
-- This stack's default ACLs (pg_default_acl, grantor postgres, schema
-- public) hand anon/authenticated latent Dxtm — TRUNCATE, REFERENCES,
-- TRIGGER, MAINTAIN — on every new table, and RLS does NOT police
-- TRUNCATE: a full-table wipe is gated ONLY by privilege. Verified live
-- 2026-07-11 before writing this migration: profiles showed anon=Dxtm and
-- authenticated=arwdDxtm. PostgREST cannot emit TRUNCATE today, so this
-- is defense in depth — the fail-closed model (DECISIONS 2026-07-10:
-- roles get exactly the privileges they need), not a live exploit fix.
--
-- Revoke everything, then re-grant exactly what the profiles migration
-- intended: authenticated gets its user-scoped DML (RLS filters the
-- rows), anon gets NOTHING, service_role keeps full access.

revoke all on table public.profiles from anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
