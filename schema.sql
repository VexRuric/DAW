-- =====================================================================
-- DAW Warehouse LIVE — Database Schema
-- Run this in the Supabase SQL Editor.
-- Designed for Postgres 15+ (what Supabase uses).
-- =====================================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "citext";

-- =====================================================================
-- CORE: wrestlers, teams, titles
-- =====================================================================

create table wrestlers (
    id            uuid primary key default uuid_generate_v4(),
    name          citext not null unique,         -- case-insensitive unique
    gender        text,                           -- 'Male' | 'Female' | 'Other'
    brand         text,                           -- 'DAW' | 'RAW' | 'NXT' | etc.
    division      text,                           -- 'Mens' | 'Womens' | etc.
    role          text,                           -- 'Face' | 'Heel' | 'Tweener'
    gimmick       text,
    disposition   int,                            -- 0/1 flag from sheet
    country       text,
    twitch_handle citext,
    render_url    text,                           -- URL to character portrait
    active        boolean not null default true,
    injured       boolean not null default false,
    debut_date    date,
    bio           text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index wrestlers_active_idx on wrestlers(active);
create index wrestlers_brand_idx  on wrestlers(brand);
create index wrestlers_twitch_idx on wrestlers(twitch_handle) where twitch_handle is not null;

create table teams (
    id          uuid primary key default uuid_generate_v4(),
    name        citext not null unique,
    brand       text,
    division    text,                             -- 'Mens Tag' | 'Womens Tag' | 'Mixed Tag'
    role        text,
    gender      text,
    disposition int,
    render_url  text,
    active      boolean not null default true,
    injured     boolean not null default false,
    formed_date date,
    bio         text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index teams_active_idx on teams(active);

-- A wrestler can belong to multiple teams over time.
-- end_date NULL means they are currently on the team.
create table team_memberships (
    id           uuid primary key default uuid_generate_v4(),
    team_id      uuid not null references teams(id) on delete cascade,
    wrestler_id  uuid not null references wrestlers(id) on delete cascade,
    start_date   date,
    end_date     date,
    created_at   timestamptz not null default now(),
    unique (team_id, wrestler_id, start_date)
);

create index team_memberships_current_idx
    on team_memberships(team_id) where end_date is null;

create table titles (
    id          uuid primary key default uuid_generate_v4(),
    name        citext not null unique,           -- 'Mens Champion', 'Internet Champion', etc.
    category    text not null,                    -- 'Singles' | 'Tag' | 'MitB'
    gender      text,                             -- 'Mens' | 'Womens' | 'Any'
    active      boolean not null default true,
    display_order int default 0,
    description text,
    image_url   text,
    created_at  timestamptz not null default now()
);

-- =====================================================================
-- EVENTS: shows and matches (the single source of truth)
-- =====================================================================

create table shows (
    id           uuid primary key default uuid_generate_v4(),
    name         text not null,                   -- 'DAW 04-17-2026' or 'Banned Portal'
    show_date    date not null,
    show_type    text not null default 'weekly',  -- 'weekly' | 'ppv' | 'special'
    ppv_name     text,                            -- 'Banned Portal', 'No Escape', etc.
    stream_url   text,                            -- twitch.com/daware/...
    notes        text,
    created_at   timestamptz not null default now()
);

create index shows_date_idx on shows(show_date desc);
create index shows_type_idx on shows(show_type);

-- Match type is an enum-ish text for flexibility.
-- The import script normalizes "Tag Team\n" -> "Tag Team" etc.
create table matches (
    id             uuid primary key default uuid_generate_v4(),
    show_id        uuid not null references shows(id) on delete cascade,
    match_number   int not null,                  -- order on the card
    match_type     text not null,                 -- 'Single', 'Triple Threat', 'Fatal 4-Way', 'Battle Royale', 'Tag Team', etc.
    stipulation    text,                          -- 'Steel Cage', 'Hardcore', 'TLC', 'No DQ', etc. NULL for normal matches
    is_title_match boolean not null default false,
    title_id       uuid references titles(id),
    is_mitb        boolean not null default false,
    mitb_cashin    boolean not null default false,
    defeat_type    text,                          -- 'Pin', 'Sub', 'DQ', 'No Contest', NULL
    rating         numeric(3,1),                  -- 0.5 - 5.0 (converted from 1-10 scale)
    is_draw        boolean not null default false,
    notes          text,
    created_at     timestamptz not null default now(),
    unique (show_id, match_number)
);

create index matches_show_idx  on matches(show_id);
create index matches_type_idx  on matches(match_type);
create index matches_title_idx on matches(title_id) where is_title_match;

-- A participant is either a wrestler OR a team (tag matches).
-- Exactly one of wrestler_id / team_id must be set (enforced by CHECK).
create table match_participants (
    id           uuid primary key default uuid_generate_v4(),
    match_id     uuid not null references matches(id) on delete cascade,
    wrestler_id  uuid references wrestlers(id) on delete restrict,
    team_id      uuid references teams(id) on delete restrict,
    result       text not null,                   -- 'winner' | 'loser' | 'draw' | 'eliminated'
    elimination_order int,                        -- for battle royales / rumbles
    check (
        (wrestler_id is not null and team_id is null) or
        (wrestler_id is null and team_id is not null)
    )
);

create index mp_match_idx    on match_participants(match_id);
create index mp_wrestler_idx on match_participants(wrestler_id) where wrestler_id is not null;
create index mp_team_idx     on match_participants(team_id) where team_id is not null;
create index mp_result_idx   on match_participants(result);

-- =====================================================================
-- TITLE REIGNS (derived from matches but stored for fast lookup)
-- =====================================================================

create table title_reigns (
    id                 uuid primary key default uuid_generate_v4(),
    title_id           uuid not null references titles(id) on delete cascade,
    holder_wrestler_id uuid references wrestlers(id),
    holder_team_id     uuid references teams(id),
    won_at_match_id    uuid references matches(id),
    lost_at_match_id   uuid references matches(id),
    won_date           date not null,
    lost_date          date,                      -- NULL = current champion
    reign_number       int,                       -- 1st, 2nd, 3rd reign for this holder
    notes              text,
    created_at         timestamptz not null default now(),
    check (
        (holder_wrestler_id is not null and holder_team_id is null) or
        (holder_wrestler_id is null and holder_team_id is not null)
    )
);

create index reigns_title_idx   on title_reigns(title_id, won_date desc);
create index reigns_current_idx on title_reigns(title_id) where lost_date is null;

-- =====================================================================
-- FAN LAYER (Phase 3)
-- =====================================================================

-- Profiles are linked to Supabase auth.users.
-- When a user logs in with Twitch, a row is created here.
create table profiles (
    id               uuid primary key references auth.users(id) on delete cascade,
    twitch_id        text unique,
    twitch_handle    citext unique,
    display_name     text,
    claimed_wrestler_id uuid references wrestlers(id),
    role             text not null default 'fan', -- 'fan' | 'booker' | 'admin' | 'owner'
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create index profiles_wrestler_idx on profiles(claimed_wrestler_id) where claimed_wrestler_id is not null;

-- Suggestions from fans about their claimed character or storylines.
create table submissions (
    id               uuid primary key default uuid_generate_v4(),
    submitted_by     uuid not null references profiles(id) on delete cascade,
    submission_type  text not null,               -- 'new_character' | 'character_edit' | 'story' | 'feud' | 'other'
    subject_wrestler_id uuid references wrestlers(id),
    title            text not null,
    body             text not null,
    status           text not null default 'pending', -- 'pending' | 'approved' | 'rejected' | 'in_progress'
    reviewer_notes   text,
    reviewed_by      uuid references profiles(id),
    reviewed_at      timestamptz,
    created_at       timestamptz not null default now()
);

create index submissions_status_idx on submissions(status, created_at desc);

-- =====================================================================
-- AUDIT
-- =====================================================================

create or replace function set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger wrestlers_updated_at before update on wrestlers
    for each row execute function set_updated_at();
create trigger teams_updated_at before update on teams
    for each row execute function set_updated_at();
create trigger profiles_updated_at before update on profiles
    for each row execute function set_updated_at();

-- =====================================================================
-- VIEWS: the "analysis" tabs from the spreadsheet, now just SQL
-- =====================================================================

-- Every wrestler's record at a glance
create or replace view wrestler_records as
select
    w.id,
    w.name,
    count(*) filter (where mp.result = 'winner') as wins,
    count(*) filter (where mp.result = 'loser')  as losses,
    count(*) filter (where mp.result = 'draw')   as draws,
    count(*) as total_matches,
    round(
        count(*) filter (where mp.result = 'winner')::numeric
        / nullif(count(*), 0) * 100, 1
    ) as win_pct,
    round(avg(m.rating)::numeric, 2) as avg_rating
from wrestlers w
left join match_participants mp on mp.wrestler_id = w.id
left join matches m on m.id = mp.match_id
group by w.id, w.name;

-- Team records
create or replace view team_records as
select
    t.id,
    t.name,
    count(*) filter (where mp.result = 'winner') as wins,
    count(*) filter (where mp.result = 'loser')  as losses,
    count(*) filter (where mp.result = 'draw')   as draws,
    count(*) as total_matches,
    round(
        count(*) filter (where mp.result = 'winner')::numeric
        / nullif(count(*), 0) * 100, 1
    ) as win_pct,
    round(avg(m.rating)::numeric, 2) as avg_rating
from teams t
left join match_participants mp on mp.team_id = t.id
left join matches m on m.id = mp.match_id
group by t.id, t.name;

-- Current champions
create or replace view current_champions as
select
    t.id as title_id,
    t.name as title_name,
    t.category,
    coalesce(w.name, tm.name) as holder_name,
    tr.holder_wrestler_id,
    tr.holder_team_id,
    tr.won_date,
    (current_date - tr.won_date) as days_held
from titles t
join title_reigns tr on tr.title_id = t.id and tr.lost_date is null
left join wrestlers w on w.id = tr.holder_wrestler_id
left join teams tm on tm.id = tr.holder_team_id
where t.active = true
order by t.display_order, t.name;

-- =====================================================================
-- ROW LEVEL SECURITY (enable now, add policies as we build)
-- =====================================================================

alter table wrestlers         enable row level security;
alter table teams             enable row level security;
alter table team_memberships  enable row level security;
alter table titles            enable row level security;
alter table shows             enable row level security;
alter table matches           enable row level security;
alter table match_participants enable row level security;
alter table title_reigns      enable row level security;
alter table profiles          enable row level security;
alter table submissions       enable row level security;

-- Public read access on everything except profiles/submissions.
create policy "public read wrestlers"        on wrestlers         for select using (true);
create policy "public read teams"            on teams             for select using (true);
create policy "public read team_memberships" on team_memberships  for select using (true);
create policy "public read titles"           on titles            for select using (true);
create policy "public read shows"            on shows             for select using (true);
create policy "public read matches"          on matches           for select using (true);
create policy "public read participants"     on match_participants for select using (true);
create policy "public read reigns"           on title_reigns      for select using (true);

-- Profiles: users read/update their own. Admins handled in Phase 3.
create policy "users read own profile"  on profiles for select using (auth.uid() = id);
create policy "users update own profile" on profiles for update using (auth.uid() = id);

-- Submissions: users see their own, admins see all (policy added Phase 3).
create policy "users read own submissions" on submissions
    for select using (auth.uid() = submitted_by);
create policy "users create submissions" on submissions
    for insert with check (auth.uid() = submitted_by);
