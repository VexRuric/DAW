-- =====================================================================
-- Security: stop users from granting themselves staff access.
--
-- Problem: the "users update own profile" policy lets a signed-in user
-- update any column of their own profiles row, including `role`, and
-- is_staff() trusted profiles.role. A fan could run
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', <self>)
-- and gain write access to shows, matches, reigns, wrestlers and teams.
--
-- Fix:
--   1. is_staff() reads the role from the signed JWT (auth.users
--      app_metadata), which only the service role can change. This is
--      the same source the app and API routes already use.
--   2. A trigger blocks changes to profiles.role unless made by the
--      service role (server-side API routes / SQL editor).
--
-- Run in the Supabase SQL editor. Safe to re-run.
-- =====================================================================

create or replace function public.is_staff()
returns boolean as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'creative'),
    false
  );
$$ language sql stable set search_path = '';

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'profiles.role cannot be changed by clients';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Audit: anyone whose profiles.role claims staff but whose account role doesn't.
-- Review these rows after running — they may indicate someone already used the hole.
select p.id, p.display_name, p.role as profile_role,
       u.raw_app_meta_data ->> 'role' as account_role, u.email
from public.profiles p
join auth.users u on u.id = p.id
where p.role in ('admin', 'booker', 'owner', 'creative')
  and coalesce(u.raw_app_meta_data ->> 'role', '') not in ('admin', 'creative');
