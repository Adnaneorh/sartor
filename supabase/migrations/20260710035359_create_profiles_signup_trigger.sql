-- Auto-create a profiles row on signup (ROADMAP 1.1). SECURITY DEFINER is
-- required: the trigger fires as part of auth's insert, before any user
-- session exists, so RLS on profiles cannot authorize it. Hardened per the
-- established pattern: empty search_path, fully-qualified names, and the
-- function is NOT executable by client roles.

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
    coalesce((new.raw_user_meta_data ->> 'age_confirmed')::boolean, false)
  );
  return new;
end;
$$;

-- Client roles must never call this directly (it is SECURITY DEFINER):
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
