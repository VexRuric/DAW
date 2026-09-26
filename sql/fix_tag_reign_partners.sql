-- =====================================================================
-- One-off data fix: World Tag Team Championship reign history.
--
-- Older reigns were saved with only one wrestler, and one team's
-- defences were recorded as new reigns:
--   2026-01-30  Buddyholland               → faction Buddy and Vac, partner Uncle Vac were missing
--   2026-04-17  Slaghammers                → partner Slapjax was missing
--   2026-05-29  Slapjax                    → same team retained (not a new reign)
--   2026-09-25  S & S Express (Beach Bash) → same team retained (not a new reign)
--
-- Result: Buddy and Vac (Buddyholland & Uncle Vac, Jan 30 – Apr 17), then one continuous
-- reign for S & S Express (Slaghammers & Slapjax) from Apr 17 to now.
-- The May 29 and Beach Bash title matches become #ANDSTILL.
--
-- Everything runs in one transaction and stops with an error (changing
-- nothing) if any expected row is missing. Run in the Supabase SQL editor.
-- =====================================================================

do $$
declare
  v_title   uuid := (select id from public.titles where name = 'World Tag Team Championship');
  v_buddy   uuid := (select id from public.wrestlers where name ilike 'Buddyholland');
  v_vac     uuid := (select id from public.wrestlers where name ilike 'Uncle Vac');
  v_slag    uuid := (select id from public.wrestlers where name ilike 'Slaghammers');
  v_jax     uuid := (select id from public.wrestlers where name ilike 'Slapjax');
  v_team    uuid := (select id from public.teams where name ilike 'S & S Express');
  v_bvteam  uuid := (select id from public.teams where name ilike 'Buddy and Vac' or name ilike 'Buddy & Vac' limit 1);
  v_keep    uuid;   -- Apr 17 reign, becomes the continuous reign
  v_n       int;
begin
  if v_title is null or v_buddy is null or v_vac is null or v_slag is null or v_jax is null or v_team is null or v_bvteam is null then
    raise exception 'Lookup failed: title=% buddy=% vac=% slag=% jax=% s&s=% buddy-and-vac=%', v_title, v_buddy, v_vac, v_slag, v_jax, v_team, v_bvteam;
  end if;

  -- 1. Buddy and Vac (faction) with members Buddyholland & Uncle Vac
  update public.title_reigns set holder_team_id = v_bvteam, holder_wrestler_id_2 = v_vac
   where title_id = v_title and won_date = '2026-01-30' and holder_wrestler_id = v_buddy;
  get diagnostics v_n = row_count;
  if v_n <> 1 then raise exception 'Expected 1 Buddyholland reign, found %', v_n; end if;

  -- 2. Apr 17 reign → continuous S & S Express reign to the present
  select id into v_keep from public.title_reigns
   where title_id = v_title and won_date = '2026-04-17' and holder_wrestler_id = v_slag;
  if v_keep is null then raise exception 'Apr 17 Slaghammers reign not found'; end if;

  delete from public.title_reigns
   where title_id = v_title and id <> v_keep
     and ((won_date = '2026-05-29' and holder_wrestler_id = v_jax)
       or (won_date = '2026-09-25' and holder_team_id = v_team));
  get diagnostics v_n = row_count;
  if v_n <> 2 then raise exception 'Expected to remove 2 duplicate reigns (May 29, Sep 25), found %', v_n; end if;

  update public.title_reigns
     set holder_team_id = v_team, holder_wrestler_id = v_slag, holder_wrestler_id_2 = v_jax,
         lost_date = null, lost_at_match_id = null
   where id = v_keep;

  raise notice 'Done: Buddy and Vac reign fixed; S & S Express reign runs from 2026-04-17.';
end $$;

-- Check the result (read-only)
select tr.won_date, tr.lost_date, tm.name as team, w1.name as wrestler_1, w2.name as wrestler_2
from public.title_reigns tr
join public.titles t on t.id = tr.title_id
left join public.teams tm on tm.id = tr.holder_team_id
left join public.wrestlers w1 on w1.id = tr.holder_wrestler_id
left join public.wrestlers w2 on w2.id = tr.holder_wrestler_id_2
where t.name = 'World Tag Team Championship'
order by tr.won_date desc;
