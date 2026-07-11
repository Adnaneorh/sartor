-- profiles.onboarded_at: onboarding completion is an EXPLICIT fact, never
-- inferred from empty persona fields (DECISIONS 2026-07-11 §4 — a user who
-- clears their roles in Settings must not be bounced back to onboarding).
-- NULL = not onboarded → /home redirects to /onboarding (middleware/page).
-- Stamped by savePersonaAction on first successful onboarding save.
--
-- No RLS change: the existing user-scoped profiles policies
-- (select/insert/update/delete where user_id = auth.uid()) already cover
-- the new column — column-level exposure follows the row policies.

alter table public.profiles
  add column onboarded_at timestamptz;

comment on column public.profiles.onboarded_at is
  'When the user completed onboarding. NULL = not yet onboarded (explicit fact, never inferred — DECISION 2026-07-11).';
