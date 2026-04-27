-- =====================================================================
-- DAW Warehouse LIVE — Phase 2 Schema Migration
-- Run this in the Supabase SQL Editor AFTER the initial schema.sql
-- =====================================================================

-- =====================================================================
-- 1. wrestlers — add status + submitted_by
-- =====================================================================

alter table wrestlers
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'hired', 'retired', 'released', 'rejected'));

alter table wrestlers
  add column if not exists submitted_by uuid references profiles(id) on delete set null;

-- All wrestlers imported from the spreadsheet are already hired
update wrestlers set status = 'hired' where status = 'pending';

create index if not exists wrestlers_status_idx on wrestlers(status);

-- =====================================================================
-- 2. teams — add status + submitted_by
-- =====================================================================

alter table teams
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'hired', 'retired', 'released', 'rejected'));

alter table teams
  add column if not exists submitted_by uuid references profiles(id) on delete set null;

update teams set status = 'hired' where status = 'pending';

create index if not exists teams_status_idx on teams(status);

-- =====================================================================
-- 3. shows — add status
-- =====================================================================

alter table shows
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'committed', 'completed'));

-- All existing shows have already aired
update shows set status = 'completed' where status = 'draft';

create index if not exists shows_status_idx on shows(status);

-- =====================================================================
-- 4. story_notes — new table
-- =====================================================================

create table if not exists story_notes (
    id           uuid primary key default uuid_generate_v4(),
    note_type    text not null default 'general',
                 -- 'feud' | 'story' | 'angle' | 'general'
    title        text not null,
    body         text not null,
    wrestler_ids uuid[] not null default '{}',  -- wrestler IDs involved
    team_ids     uuid[] not null default '{}',  -- team IDs involved
    show_id      uuid references shows(id) on delete set null,
    priority     text not null default 'normal',
                 -- 'low' | 'normal' | 'high'
    resolved     boolean not null default false,
    created_by   uuid references profiles(id) on delete set null,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index if not exists story_notes_type_idx     on story_notes(note_type);
create index if not exists story_notes_resolved_idx on story_notes(resolved) where resolved = false;
create index if not exists story_notes_show_idx     on story_notes(show_id) where show_id is not null;

create trigger story_notes_updated_at before update on story_notes
    for each row execute function set_updated_at();

alter table story_notes enable row level security;

-- =====================================================================
-- 5. Fix SECURITY DEFINER on existing views (schema.sql created these
--    as SECURITY DEFINER by default, which bypasses RLS)
-- =====================================================================

alter view public.wrestler_records  set (security_invoker = on);
alter view public.team_records      set (security_invoker = on);
alter view public.current_champions set (security_invoker = on);

-- =====================================================================
-- 6. Roster views (filters out pending/rejected/released)
--    security_invoker = on so they respect the querying user's RLS
-- =====================================================================

create or replace view roster_wrestlers
  with (security_invoker = on)
as
  select * from wrestlers
  where status in ('hired', 'retired')
  order by name;

create or replace view roster_teams
  with (security_invoker = on)
as
  select * from teams
  where status in ('hired', 'retired')
  order by name;

-- =====================================================================
-- 7. Fix mutable search_path on functions
--    Without a fixed search_path, a malicious schema earlier in the
--    path could shadow pg_catalog objects and intercept calls.
-- =====================================================================

-- Fix the existing set_updated_at trigger function from schema.sql
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql set search_path = '';

-- =====================================================================
-- 8. Helper: check if current user is admin-level
--    Uses fully-qualified table name (public.profiles) because
--    search_path is locked to empty string.
-- =====================================================================

create or replace function public.is_staff()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'booker', 'owner')
  );
$$ language sql security definer stable set search_path = '';

-- =====================================================================
-- 9. Move citext extension out of public schema
--    Extensions belong in the extensions schema. Supabase always
--    includes extensions in the search_path, so existing citext
--    columns on wrestlers/teams continue to work unchanged.
-- =====================================================================

alter extension citext set schema extensions;

-- =====================================================================
-- 10. RLS write policies for staff
-- =====================================================================

-- wrestlers: staff can do anything; fans can insert their own pending submissions
create policy "staff manage wrestlers" on wrestlers
  for all using (is_staff())
  with check (is_staff());

create policy "fans submit wrestlers" on wrestlers
  for insert with check (
    auth.uid() is not null
    and status = 'pending'
    and submitted_by = auth.uid()
  );

-- teams: same pattern
create policy "staff manage teams" on teams
  for all using (is_staff())
  with check (is_staff());

create policy "fans submit teams" on teams
  for insert with check (
    auth.uid() is not null
    and status = 'pending'
    and submitted_by = auth.uid()
  );

-- shows: staff only
create policy "staff manage shows" on shows
  for all using (is_staff())
  with check (is_staff());

-- matches: staff only
create policy "staff manage matches" on matches
  for all using (is_staff())
  with check (is_staff());

-- match_participants: staff only
create policy "staff manage participants" on match_participants
  for all using (is_staff())
  with check (is_staff());

-- title_reigns: staff only
create policy "staff manage reigns" on title_reigns
  for all using (is_staff())
  with check (is_staff());

-- story_notes: staff can manage all
create policy "staff manage story_notes" on story_notes
  for all using (is_staff())
  with check (is_staff());

-- submissions: staff can see and update all
create policy "staff manage submissions" on submissions
  for all using (is_staff())
  with check (is_staff());
