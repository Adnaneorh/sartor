-- Audit #4 finding 2: the hard cast (raw_user_meta_data->>'age_confirmed')::boolean
-- aborts the ENTIRE auth.users insert when the value isn't parseable as a
-- boolean (e.g. "maybe") — and this trigger fires for every insert path
-- (admin API, future OAuth), not just the Zod-guarded signup form.
-- Tolerant parse instead: the truthy spellings Postgres's boolean input
-- accepts map to true; anything else — junk, absent, falsy spellings —
-- defaults to false, the safe direction for a self-attested 16+ flag.
--
-- Everything else (SECURITY DEFINER, empty search_path, qualified names)
-- is unchanged from 20260710035359.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name, phone, age_confirmed)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(
      lower(trim(new.raw_user_meta_data ->> 'age_confirmed'))
        in ('true', 't', 'yes', 'y', 'on', '1'),
      false
    )
  );
  return new;
end;
$$;

-- create-or-replace preserves the existing ACL (EXECUTE was revoked from
-- client roles in 20260710035359), but re-assert so this file stands alone:
revoke execute on function public.handle_new_user() from public, anon, authenticated;
