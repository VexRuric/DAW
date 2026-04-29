import { createClient } from '@/lib/supabase-server'
import HomeStreamSection, { CompactMatch, StreamShowInfo } from '@/components/HomeStreamSection'
import HomeNewsGrid, { NewsCard } from '@/components/HomeNewsGrid'
import HomeUpcomingEvents, { EventItem } from '@/components/HomeUpcomingEvents'
import HomeCommunityStrip from '@/components/HomeCommunityStrip'

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

function buildHeadline(match: any, andNewIds: Set<string>): string {
  const winner = (match.match_participants ?? []).find((p: any) => p.result === 'winner')
  if (!winner) return match.match_type
  const name = participantName(winner)
  const hashtag = deriveHashtag(match, andNewIds)
  const titleName = match.titles?.name ?? 'Title'
  if (hashtag === 'ANDNEW') return `${name} Captures The ${titleName}`
  if (hashtag === 'ANDSTILL') return `${name} Retains The ${titleName}`
  return `${name} Wins`
}

function buildExcerpt(match: any, andNewIds: Set<string>): string {
  const winner = (match.match_participants ?? []).find((p: any) => p.result === 'winner')
  const losers = (match.match_participants ?? []).filter((p: any) => p.result === 'loser')
  const wName = winner ? participantName(winner) : ''
  const lStr = losers.map((p: any) => participantName(p)).join(' and ')
  const hashtag = deriveHashtag(match, andNewIds)
  const titleName = match.titles?.name ?? 'title'
  const stip = match.stipulation ? ` (${match.stipulation})` : ''

  if (hashtag === 'ANDNEW')
    return `${wName} captures the ${titleName} in a ${match.match_type}${stip}${lStr ? `, defeating ${lStr}` : ''}.`
  if (hashtag === 'ANDSTILL')
    return `${wName} successfully defends the ${titleName}${lStr ? ` against ${lStr}` : ''} in a ${match.match_type}${stip}.`
  return `${wName} picks up the win${lStr ? ` over ${lStr}` : ''} in a ${match.match_type}${stip}.`
}

function buildSides(participants: any[]) {
  const teamMap = new Map<string, any>()
  for (const p of participants) {
    if (p.team_id && p.teams && !teamMap.has(p.team_id)) teamMap.set(p.team_id, p)
  }
  if (teamMap.size >= 2) {
    return Array.from(teamMap.values()).slice(0, 2).map(p => ({
      name: p.teams.name as string,
      image_url: (p.teams.render_url ?? null) as string | null,
    }))
  }
  return participants
    .filter(p => p.wrestlers || p.write_in_name)
    .slice(0, 2)
    .map(p => ({ name: participantName(p), image_url: participantImage(p) }))
}

export default async function HomePage() {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)

    // Parallel: last completed show + upcoming committed shows + site settings
    const [lastShowRes, upcomingRes, settingsRes] = await Promise.all([
      supabase.from('shows').select('*').eq('status', 'completed')
        .order('show_date', { ascending: false }).limit(1),
      supabase.from('shows').select('*').eq('status', 'committed')
        .gte('show_date', today).order('show_date', { ascending: true }).limit(6),
      supabase.from('site_settings').select('key, value'),
    ])

    const lastShow = lastShowRes.data?.[0] ?? null
    const upcomingShows = upcomingRes.data ?? []
    const settingsMap = Object.fromEntries((settingsRes.data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]))
    const twitchChannel: string = settingsMap.twitch_channel || 'daware'

    // Display show for stream section: next committed OR last completed
    const streamShowRaw = upcomingShows[0] ?? lastShow

    // Fetch matches for both stream show and last completed show
    let streamMatches: any[] = []
    let lastShowMatches: any[] = []
    let andNewIds = new Set<string>()

    const fetches: Promise<void>[] = []

    if (streamShowRaw) {
      fetches.push((async () => {
        const { data } = await supabase
          .from('matches')
          .select('*, match_participants(*, wrestlers(*), teams(*)), titles(*)')
          .eq('show_id', streamShowRaw.id)
          .order('match_number', { ascending: true })
        streamMatches = data ?? []
      })())
    }

    if (lastShow && lastShow.id !== streamShowRaw?.id) {
      fetches.push((async () => {
        const { data } = await supabase
          .from('matches')
          .select('*, match_participants(*, wrestlers(*), teams(*)), titles(*)')
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

    // Get ANDNEW match IDs for last completed show
    const lastShowMatchIds = lastShowMatches.map(m => m.id)
    if (lastShowMatchIds.length > 0) {
      const { data: reigns } = await supabase
        .from('title_reigns')
        .select('won_at_match_id')
        .in('won_at_match_id', lastShowMatchIds)
      andNewIds = new Set((reigns ?? []).map((r: any) => r.won_at_match_id))
    }

    // For stream section: if it's the completed show, include hashtags; if upcoming, null
    const streamIsCompleted = streamShowRaw?.status === 'completed'
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

    const compactMatches: CompactMatch[] = streamMatches.map(m => ({
      id: m.id,
      matchNumber: m.match_number,
      matchType: m.match_type,
      stipulation: m.stipulation ?? null,
      isTitleMatch: m.is_title_match,
      titleName: m.titles?.name ?? null,
      hashtag: streamIsCompleted ? deriveHashtag(m, andNewIds) : null,
      sides: buildSides(m.match_participants ?? []),
    }))

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
            title: buildHeadline(m, andNewIds),
            excerpt: buildExcerpt(m, andNewIds),
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
        <HomeStreamSection show={streamShowInfo} matches={compactMatches} channel={twitchChannel} />
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
