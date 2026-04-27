# DAW Warehouse LIVE — Website

Replaces the 177-tab Google Sheet with a real website and database.

## Stack

- **Next.js 15** (App Router, TypeScript) — the site
- **Supabase** (Postgres + Auth + Storage) — the backend
- **Tailwind CSS** + **shadcn/ui** — styling
- **Vercel** — hosting
- **Twitch OAuth** — fan login (Phase 3)

## Domain

`ruric.gg` — main site. Subdomain ideas if you want to split things:
- `daw.ruric.gg` — the federation site
- `ruric.gg` — your personal landing that links to DAW + other projects

## What's in this folder

- `db/schema.sql` — the database schema. Run this in Supabase SQL Editor.
- `import/import.py` — one-time script to convert the Google Sheet xlsx into SQL inserts.
- `import/seed.sql` — output of the import script (generated, not committed).
- `mockups/` — HTML mockups of the public pages so you can see the design direction.
- `docs/` — architecture notes, roadmap.

## Build order (phases running in parallel)

### Phase 1 — Public read-only site
Homepage, roster, wrestler pages, team pages, title histories, match archive.
Replaces everything viewers currently see in the Sheet + Discord.

### Phase 2 — Admin panel
Replaces the Google Form. Role-based login (owner/admin/booker/mod).
Match entry with roster-aware dropdowns. Card builder for weekly + PPV.

### Phase 3 — Twitch login + fan submissions
Fans log in with Twitch. If their handle matches a wrestler, they can claim
ownership and submit story/character edits for that wrestler.

## Next step

1. Create Supabase project (supabase.com, free tier)
2. Run `db/schema.sql` in the SQL editor
3. Run `import/import.py` locally to generate `import/seed.sql`, then run that in Supabase
4. Open this folder in Claude Code and say "scaffold the Next.js site against our Supabase"
