-- =====================================================================
-- Team titles: record which members actually won.
--
-- A faction can have more members than wrestle in a title match (e.g.
-- 3 members, 2 compete). The reign should hold the team AND the members
-- who won, so those wrestlers get credit on their own pages.
--
-- The original check constraint allowed a team OR a wrestler, never
-- both, so saving a team reign with members failed with:
--   new row for relation "title_reigns" violates check constraint "title_reigns_check"
--
-- Run in the Supabase SQL editor. Safe to re-run.
-- Before running, back up the current view definition:
--   select pg_get_viewdef('public.current_champions', true);
-- =====================================================================

-- 1. Allow team + members. A reign still needs at least one holder.
alter table public.title_reigns drop constraint if exists title_reigns_check;
alter table public.title_reigns drop constraint if exists title_reigns_holder_check;
alter table public.title_reigns add constraint title_reigns_holder_check
  check (holder_team_id is not null or holder_wrestler_id is not null);

-- 2. Show the team name (not the first member) when a team holds the title.
--    Columns keep the same names and order as before; if they don't match the
--    live view, Postgres refuses the replace and nothing changes.
create or replace view public.current_champions
  with (security_invoker = on)
as
select
    t.id as title_id,
    t.name as title_name,
    t.category,
    coalesce(tm.name, w.name) as holder_name,
    tr.holder_wrestler_id,
    tr.holder_team_id,
    tr.won_date,
    (current_date - tr.won_date) as days_held,
    tr.holder_wrestler_id_2
from public.titles t
join public.title_reigns tr on tr.title_id = t.id and tr.lost_date is null
left join public.wrestlers w on w.id = tr.holder_wrestler_id
left join public.teams tm on tm.id = tr.holder_team_id
where t.active = true
order by t.display_order, t.name;
