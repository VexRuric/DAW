-- Provision fan profiles for new Supabase auth users and repair older accounts
-- that were created before profile provisioning was in place.

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'preferred_username'), ''),
      case
        when pg_catalog.strpos(new.email, '@') > 1 then
          nullif(pg_catalog.btrim(pg_catalog.split_part(new.email, '@', 1)), '')
        else null
      end
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;

create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function public.handle_new_auth_user_profile();

-- The function is invoked by the auth.users trigger, not directly by clients.
revoke execute on function public.handle_new_auth_user_profile() from public;

insert into public.profiles (id, display_name)
select
  auth_user.id,
  coalesce(
    nullif(pg_catalog.btrim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
    nullif(pg_catalog.btrim(auth_user.raw_user_meta_data ->> 'name'), ''),
    nullif(pg_catalog.btrim(auth_user.raw_user_meta_data ->> 'preferred_username'), ''),
    case
      when pg_catalog.strpos(auth_user.email, '@') > 1 then
        nullif(pg_catalog.btrim(pg_catalog.split_part(auth_user.email, '@', 1)), '')
      else null
    end
  )
from auth.users as auth_user
where not exists (
  select 1
  from public.profiles as profile
  where profile.id = auth_user.id
)
on conflict (id) do nothing;