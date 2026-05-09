import { createClient } from '@/lib/supabase-server'
import HomeStreamSection, { CompactMatch, StreamShowInfo } from '@/components/HomeStreamSection'
import HomeNewsGrid, { NewsCard } from '@/components/HomeNewsGrid'
import HomeUpcomingEvents, { EventItem } from '@/components/HomeUpcomingEvents'
import HomeCommunityStrip from '@/components/HomeCommunityStrip'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'DAW Warehouse LIVE — Home',
  description: 'Results, roster, championships, and upcoming shows for DAW Warehouse LIVE.',
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function formatDateLong(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatDateShortAbbr(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

function participantName(p: any): string {
  return p.wrestlers?.name ?? p.teams?.name ?? p.write_in_name ?? 'Unknown'
}

function participantImage(p: any): string | null {
  return p.wrestlers?.render_url ?? p.teams?.render_url ?? null
}

function deriveHashtag(match: any, andNewIds: Set<string>): 'ANDNEW' | 'ANDSTILL' | 'WINNER' {
  if (match.is_title_match) return andNewIds.has(match.id) ? 'ANDNEW' : 'ANDSTILL'
  return 'WINNER'
}

// Deterministic pick so same match always shows same variant
function pick<T>(arr: T[], seed: string): T {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return arr[h % arr.length]
}

type TemplateMap = Record<string, string[]>

function fillTemplate(tpl: string, tokens: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => tokens[k] ?? `{${k}}`)
}

const FALLBACK_HEADLINES: TemplateMap = {
  andnew_headline: [
    '{winner} Captures The {title}',
    'New Champion: {winner} Dethrones {loser} For The {title}',
    '{loser} Falls! {winner} Is The New {title} Champion',
    '{winner} Strikes Gold — New {title} Champion',
  ],
  andstill_headline: [
    '{winner} Retains The {title}',
    'And Still! {winner} Defends The {title} Over {loser}',
    '{winner} Keeps The {title} — {loser} Falls Short',
    '{loser} Cannot Dethrone {winner} — Still Your {title} Champion',
  ],
  winner_headline: [
    '{winner} Picks Up The Win Over {loser}',
    '{loser} Meets Their End Against {winner}',
    '{winner} Victorious — {loser} Dethroned',
    '{winner} Remains Dominant — {loser} Left In The Dust',
  ],
}

const FALLBACK_EXCERPTS: TemplateMap = {
  andnew_excerpt: [
    '{winner} captures the {title} in a {match_type}, defeating {loser}.',
    'In a stunning {match_type}, {winner} dethrones {loser} to claim the {title}.',
    '{loser} could not hold on as {winner} emerges from a {match_type} as the new {title} champion.',
    'History is made — {winner} pins {loser} in a {match_type} to win the {title}.',
  ],
  andstill_excerpt: [
    '{winner} successfully defends the {title} against {loser} in a {match_type}.',
    '{loser} came close, but {winner} proves why they are still {title} champion after a {match_type}.',
    'No title change tonight — {winner} survives a {match_type} with {loser} to retain the {title}.',
    '{winner} answers the challenge in a {match_type}, turning back {loser} to remain {title} champion.',
  ],
  winner_excerpt: [
    '{winner} picks up the win over {loser} in a {match_type}.',
    '{loser} cannot handle the pressure as {winner} gets the victory in a {match_type}.',
    'A hard-fought {match_type} ends with {winner} standing tall over {loser}.',
    '{winner} gets it done in a {match_type}, leaving {loser} behind.',
  ],
}

function buildHeadline(match: any, andNewIds: Set<string>, tplMap: TemplateMap): string {
  const winner = (match.match_participants ?? []).find((p: any) => p.result === 'winner')
  if (!winner) return match.match_type
  const wName = participantName(winner)
  const losers = (match.match_participants ?? []).filter((p: any) => p.result === 'loser')
  const lName = losers.length === 1 ? participantName(losers[0]) : losers.length > 1 ? 'the field' : ''
  const hashtag = deriveHashtag(match, andNewIds)
  const titleName = match.titles?.name ?? 'Title'
  const tokens = { winner: wName, loser: lName || wName, title: titleName, match_type: match.match_type }

  const catKey = hashtag === 'ANDNEW' ? 'andnew_headline' : hashtag === 'ANDSTILL' ? 'andstill_headline' : 'winner_headline'
  const pool = (tplMap[catKey]?.length ? tplMap[catKey] : FALLBACK_HEADLINES[catKey])!
  return fillTemplate(pick(pool, match.id), tokens)
}

function buildExcerpt(match: any, andNewIds: Set<string>, tplMap: TemplateMap): string {
  const winner = (match.match_participants ?? []).find((p: any) => p.result === 'winner')
  const losers = (match.match_participants ?? []).filter((p: any) => p.result === 'loser')
  const wName = winner ? participantName(winner) : ''
  const lStr = losers.map((p: any) => participantName(p)).join(' and ')
  const hashtag = deriveHashtag(match, andNewIds)
  const titleName = match.titles?.name ?? 'title'
  const stip = match.stipulation ? ` ${match.stipulation}` : ''
  const matchLabel = `${match.match_type}${stip}`
  const tokens = { winner: wName, loser: lStr || wName, title: titleName, match_type: matchLabel }

  const catKey = hashtag === 'ANDNEW' ? 'andnew_excerpt' : hashtag === 'ANDSTILL' ? 'andstill_excerpt' : 'winner_excerpt'
  const pool = (tplMap[catKey]?.length ? tplMap[catKey] : FALLBACK_EXCERPTS[catKey])!
  return fillTemplate(pick(pool, match.id), tokens)
}

function buildSides(participants: any[], matchType: string) {
  const teamMap = new Map<string, any>()
  for (const p of participants) {
    if (p.team_id && p.teams && !teamMap.has(p.team_id)) teamMap.set(p.team_id, p)
  }
  if (teamMap.size >= 2) {
    return Array.from(teamMap.values()).map(teamRep => {
      const memberships: any[] = teamRep.teams.team_memberships ?? []
      const memberIdSet = new Set(memberships.map((tm: any) => tm.wrestler_id).filter(Boolean))

      // Only show wrestlers who are both in this match AND members of this faction
      const inMatchMembers = participants.filter(p => p.wrestler_id && memberIdSet.has(p.wrestler_id))

      const members = inMatchMembers.length > 0
        ? inMatchMembers.map((p: any) => ({ name: participantName(p), image_url: participantImage(p) }))
        : memberships.map((tm: any) => ({ name: tm.wrestlers?.name ?? 'Unknown', image_url: tm.wrestlers?.render_url ?? null }))

      return {
        name: teamRep.teams.name as string,
        image_url: (teamRep.teams.render_url ?? null) as string | null,
        isLogo: true,
        members,
      }
    })
  }

  const wrestlers = participants.filter(p => p.wrestlers || p.write_in_name)

  if (matchType === 'Tag Team') {
    const sides: { name: string; image_url: string | null; isLogo: boolean; members: { name: string; image_url: string | null }[] }[] = []
    for (let i = 0; i < wrestlers.length; i += 2) {
      const pair = wrestlers.slice(i, i + 2)
      sides.push({
        name: pair.map((p: any) => participantName(p)).join(' & '),
        image_url: participantImage(pair[0]),
        isLogo: false,
        members: pair.map((p: any) => ({ name: participantName(p), image_url: participantImage(p) })),
      })
    }
    return sides
  }

  return wrestlers.map(p => ({ name: participantName(p), image_url: participantImage(p) }))
}

function findWinningSideIdx(match: any, sides: ReturnType<typeof buildSides>): number | null {
  const winner = (match.match_participants ?? []).find((p: any) => p.result === 'winner')
  if (!winner) return null
  const wName = participantName(winner)
  for (let i = 0; i < sides.length; i++) {
    const s = sides[i]
    if (s.name === wName) return i
    if ((s as any).members?.some((m: { name: string }) => m.name === wName)) return i
  }
  return null
}

export default async function HomePage() {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)

    // Parallel queries:
    // - lastShowRes: most recent completed show (for news grid fallback)
    // - streamLockedRes: next upcoming show with a committed matchcard (matchcard_locked=true)
    // - recentAiredLockedRes: most recent aired show with a committed matchcard but no results yet
    // - upcomingAllRes: all upcoming scheduled shows for the events strip (regardless of matchcard)
    // - settingsRes, templatesRes: site config
    const [lastShowRes, streamLockedRes, recentAiredLockedRes, upcomingAllRes, settingsRes, templatesRes] = await Promise.all([
      supabase.from('shows').select('*').eq('status', 'completed')
        .order('show_date', { ascending: false }).limit(1),
      supabase.from('shows').select('*').eq('status', 'committed').eq('matchcard_locked', true)
        .gte('show_date', today).order('show_date', { ascending: true }).limit(1),
      // Shows that have already aired but results haven't been entered yet — only if matchcard was committed
      supabase.from('shows').select('*').eq('status', 'committed').eq('matchcard_locked', true)
        .lt('show_date', today).order('show_date', { ascending: false }).limit(1),
      // All upcoming scheduled shows for the events strip (any status committed, any matchcard state)
      supabase.from('shows').select('*').eq('status', 'committed')
        .gte('show_date', today).order('show_date', { ascending: true }).limit(6),
      supabase.from('site_settings').select('key, value'),
      supabase.from('news_templates').select('category, template').eq('active', true),
    ])

    const lastShow = lastShowRes.data?.[0] ?? null
    const streamUpcoming = streamLockedRes.data?.[0] ?? null
    const recentAiredCommitted = recentAiredLockedRes.data?.[0] ?? null
    const upcomingShows = upcomingAllRes.data ?? []
    const settingsMap = Object.fromEntries((settingsRes.data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]))
    const tplMap: TemplateMap = {}
    for (const row of templatesRes.data ?? []) {
      if (!tplMap[row.category]) tplMap[row.category] = []
      tplMap[row.category].push(row.template)
    }
    const twitchChannel: string = settingsMap.twitch_channel || 'daware'
    const youtubeUrl: string | undefined = settingsMap.youtube_url || undefined
    const showMatchcardImages = settingsMap.matchcard_show_images !== 'false'
    const showMatchcardFactionLogos = settingsMap.matchcard_show_faction_logos !== 'false'

    // Priority:
    // 1. A show that aired but results aren't in yet (must have a committed matchcard)
    // 2. The next upcoming show with a committed matchcard
    // 3. The last completed show — fallback when nothing is ready
    const streamShowRaw = recentAiredCommitted ?? streamUpcoming ?? lastShow

    // Fetch matches for both stream show and last completed show
    let streamMatches: any[] = []
    let lastShowMatches: any[] = []
    let andNewIds = new Set<string>()

    const fetches: Promise<void>[] = []

    if (streamShowRaw) {
      fetches.push((async () => {
        const { data } = await supabase
          .from('matches')
          .select('*, match_participants(*, wrestlers(*), teams(*, team_memberships(*, wrestlers(*)))), titles(*)')
          .eq('show_id', streamShowRaw.id)
          .order('match_number', { ascending: true })
        streamMatches = data ?? []
      })())
    }

    if (lastShow && lastShow.id !== streamShowRaw?.id) {
      fetches.push((async () => {
        const { data } = await supabase
          .from('matches')
          .select('*, match_participants(*, wrestlers(*), teams(*, team_memberships(*, wrestlers(*)))), titles(*)')
          .eq('show_id', lastShow.id)
          .order('match_number', { ascending: true })
        lastShowMatches = data ?? []
      })())
    } else if (lastShow) {
      // Same show — reuse
      fetches.push(Promise.resolve())
    }

    await Promise.all(fetches)

    // If stream show IS the last show, reuse data
    if (streamShowRaw?.id === lastShow?.id) {
      lastShowMatches = streamMatches
    }

    // Get ANDNEW match IDs across both stream show and last completed show
    const allRelevantMatchIds = [...new Set([
      ...lastShowMatches.map(m => m.id),
      ...streamMatches.map(m => m.id),
    ])]
    if (allRelevantMatchIds.length > 0) {
      const { data: reigns } = await supabase
        .from('title_reigns')
        .select('won_at_match_id')
        .in('won_at_match_id', allRelevantMatchIds)
      andNewIds = new Set((reigns ?? []).map((r: any) => r.won_at_match_id))
    }

    const streamShowInfo: StreamShowInfo | null = streamShowRaw
      ? {
          id: streamShowRaw.id,
          name: streamShowRaw.name,
          show_date: streamShowRaw.show_date,
          show_type: streamShowRaw.show_type,
          ppv_name: streamShowRaw.ppv_name,
          status: streamShowRaw.status,
        }
      : null

    const compactMatches: CompactMatch[] = streamMatches.map(m => {
      const sides = buildSides(m.match_participants ?? [], m.match_type)
      const hasWinner = (m.match_participants ?? []).some((p: any) => p.result === 'winner')
      return {
        id: m.id,
        matchNumber: m.match_number,
        matchType: m.match_type,
        stipulation: m.stipulation ?? null,
        isTitleMatch: m.is_title_match,
        titleName: m.titles?.name ?? null,
        titleImageUrl: m.titles?.image_url ?? null,
        hashtag: hasWinner ? deriveHashtag(m, andNewIds) : null,
        winningSideIdx: hasWinner ? findWinningSideIdx(m, sides) : null,
        sides,
        scheme: (m.scheme ?? null) as 'Match' | 'Promo' | 'Write-In' | null,
      }
    })

    // News grid: from last completed show only
    const titleMatches = lastShowMatches.filter(m => m.is_title_match)
    const nonTitleMatches = lastShowMatches.filter(m => !m.is_title_match)
    const newsMatches = [...titleMatches, ...nonTitleMatches].slice(0, 6)

    const newsCards: NewsCard[] = lastShow
      ? newsMatches.map(m => {
          const winner = (m.match_participants ?? []).find((p: any) => p.result === 'winner')
          return {
            id: m.id,
            hashtag: deriveHashtag(m, andNewIds),
            date: formatDateLong(lastShow.show_date),
            dateShort: formatDateShortAbbr(lastShow.show_date),
            title: buildHeadline(m, andNewIds, tplMap),
            excerpt: buildExcerpt(m, andNewIds, tplMap),
            href: `/shows/${toSlug(lastShow.name)}`,
            image_url: winner ? participantImage(winner) : null,
          }
        })
      : []

    // Upcoming events strip
    const eventItems: EventItem[] = upcomingShows.map(s => ({
      id: s.id,
      name: s.ppv_name ?? s.name,
      show_date: s.show_date,
      show_type: s.show_type,
      href: '/schedule',
    }))

    return (
      <>
        <HomeStreamSection show={streamShowInfo} matches={compactMatches} channel={twitchChannel} youtubeUrl={youtubeUrl} showImages={showMatchcardImages} showFactionLogos={showMatchcardFactionLogos} />
        <HomeNewsGrid cards={newsCards} />
        <HomeUpcomingEvents events={eventItems} />
        <HomeCommunityStrip />
      </>
    )
  } catch {
    return (
      <>
        <HomeStreamSection show={null} matches={[]} />
        <HomeCommunityStrip />
      </>
    )
  }
}
