# DAW Warehouse LIVE — Architecture

## Stack decision rationale

**Why Supabase?** Free tier easily handles your data volume (2k matches × 10 derived rows
per match is still tiny by database standards). Built-in auth saves a month of work.
Built-in Twitch OAuth means Phase 3 is a config screen, not code. Postgres means every
"analysis" tab in your old sheet is one SQL query.

**Why Next.js?** Server-side rendering means public pages load instantly from cached
HTML (good for SEO so new viewers finding you via Google can actually find you).
It plays perfectly with Supabase via their official client. Vercel hosting is free
at your scale.

**Why Tailwind + shadcn/ui?** Fast to build, doesn't look like generic AI slop once you
commit to a visual direction (see the mockup — dark/blood/gold/bone palette with
Bebas Neue display type).

## Source of truth

**One table: `matches`.** Everything else — win/loss records, title histories, "best at
tag team" rankings, average match ratings — is a SQL view or query over `matches` and
`match_participants`. When you insert a new match via the admin panel, every derived
view updates automatically. No more cascading formula recalculation across 177 tabs.

## Roles (Phase 2/3)

- `owner` — Daware. Can do anything.
- `admin` — You. Can do anything except delete shows.
- `booker` — Trusted staff. Can enter match results, propose cards. Cannot edit roster.
- `mod` — Can approve/reject fan submissions.
- `fan` — Logged in with Twitch. Can submit story/character suggestions. If their Twitch
  handle matches a wrestler's `twitch_handle`, they can claim ownership of that character
  and edit their own bio (subject to admin approval).

## Twitch login flow (Phase 3)

1. User clicks "Login with Twitch" → Supabase redirects to Twitch OAuth.
2. Twitch sends back user info including `twitch_id` and `login` (the handle).
3. A `profiles` row is created/updated with those fields.
4. On the site, we look up `wrestlers` where `twitch_handle = profiles.twitch_handle`.
   If there's a match, show a "Claim This Character" button.
5. Claim creates a pending ownership record; admin approves in the dashboard.
6. Once approved, the fan can submit edits for their character, tracked in `submissions`.

## Migration plan

1. Ship public site with imported data (Phase 1). Google Sheet stays open as read-only backup.
2. Build admin panel. Daware starts entering new matches on the site instead of the Google Form.
   Sheet stops being updated.
3. Two weeks run in parallel — you verify nothing broke. Then retire the sheet.
4. Phase 3 — Twitch login + fan layer rolls out.

## Performance notes

Your data is small. 2k matches is nothing for Postgres — title histories that take
seconds to recalculate in Sheets will return in single-digit milliseconds.

The bottleneck at scale would be generating preview images for social sharing
(match result cards for Twitter/Discord). That's easy to add later with a serverless
function.

## Brand

Locked in as of the mockup:

- **Primary purple:** `#8000da` (from Daware's existing logo)
- **Hot purple (accents/hover):** `#9d2eff`
- **Deep purple (borders):** `#4a0080`
- **Background ink:** `#070509` (near-black with purple undertone)
- **Bone/text:** `#ffffff`
- **Gold (highlights):** `#ffc933`
- **Display type:** Bebas Neue
- **Body type:** Archivo
- **Mono/metadata:** JetBrains Mono
- **Logo:** `mockups/assets/dawlogo.png` (use this; do not recreate)

## What to build in Claude Code

When you open the project folder in Claude Code, start with this prompt:

> Scaffold a Next.js 15 App Router project with TypeScript, Tailwind, and
> shadcn/ui. Set up Supabase client using env vars NEXT_PUBLIC_SUPABASE_URL and
> NEXT_PUBLIC_SUPABASE_ANON_KEY. Use the design direction in
> mockups/homepage.html — dark palette, Bebas Neue display, JetBrains Mono for
> metadata. Build the homepage pulling real data from the `current_champions`
> view, the next upcoming `shows` row, and the 5 most recent `matches` joined
> with `shows` and `match_participants`.

Then iterate one page at a time.
