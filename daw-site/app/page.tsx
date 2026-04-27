import { createClient } from '@/lib/supabase-server'
import HomeFeaturedBanner, { FeaturedSlide, MiniResult } from '@/components/HomeFeaturedBanner'
import HomeNewsGrid, { NewsCard } from '@/components/HomeNewsGrid'
import HomeUpcomingEvents, { EventItem } from '@/components/HomeUpcomingEvents'
import HomeMatchCard, { MatchSlide, NextShowInfo } from '@/components/HomeMatchCard'
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

function formatDateDots(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}.${dd}.${yyyy}`
}

function participantName(p: any): string {
  return p.wrestlers?.name ?? p.teams?.name ?? p.write_in_name ?? 'Unknown'
}

function participantImage(p: any): string | null {
  return p.wrestlers?.render_url ?? p.teams?.render_url ?? null
}

function matchHashtag(match: any, andNewIds: Set<string>): 'ANDNEW' | 'ANDSTILL' | 'WINNER' {
  if (match.is_title_match) {
    return andNewIds.has(match.id) ? 'ANDNEW' : 'ANDSTILL'
  }
  return 'WINNER'
}

function matchHeadline(match: any, andNewIds: Set<string>): string {
  const winner = (match.match_participants ?? []).find((p: any) => p.result === 'winner')
  if (!winner) return match.match_type
  const name = participantName(winner)
  const hashtag = matchHashtag(match, andNewIds)
  const titleName = match.titles?.name ?? 'Title'
  if (hashtag === 'ANDNEW') return `${name} Captures The ${titleName}`
  if (hashtag === 'ANDSTILL') return `${name} Retains The ${titleName}`
  return `${name} Wins`
}

function matchExcerpt(match: any, andNewIds: Set<string>): string {
  const winner = (match.match_participants ?? []).find((p: any) => p.result === 'winner')
  const losers = (match.match_participants ?? []).filter((p: any) => p.result === 'loser')
  const winnerName = winner ? participantName(winner) : ''
  const loserStr = losers.map((p: any) => participantName(p)).join(' and ')
  const hashtag = matchHashtag(match, andNewIds)
  const titleName = match.titles?.name ?? 'title'
  const matchType = match.match_type
  const stip = match.stipulation ? ` (${match.stipulation})` : ''

  if (hashtag === 'ANDNEW') {
    return `${winnerName} captures the ${titleName} in a ${matchType}${stip}${loserStr ? `, defeating ${loserStr}` : ''}.`
  }
  if (hashtag === 'ANDSTILL') {
    return `${winnerName} successfully defends the ${titleName}${loserStr ? ` against ${loserStr}` : ''} in a ${matchType}${stip}.`
  }
  return `${winnerName} picks up the win${loserStr ? ` over ${loserStr}` : ''} in a ${matchType}${stip}.`
}

function buildSides(participants: any[]) {
  const teamMap = new Map<string, any>()
  for (const p of participants) {
    if (p.team_id && p.teams) {
      if (!teamMap.has(p.team_id)) teamMap.set(p.team_id, p)
    }
  }
  if (teamMap.size >= 2) {
    return Array.from(teamMap.values()).slice(0, 2).map(p => ({
      name: p.teams.name,
      image_url: p.teams.render_url ?? null,
      isChampion: false,
    }))
  }
  const wrestlers = participants.filter(p => p.wrestlers || p.write_in_name)
  return wrestlers.slice(0, 2).map(p => ({
    name: participantName(p),
    image_url: participantImage(p),
    isChampion: false,
  }))
}

export default async function HomePage() {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)

    // Fetch in parallel where possible
    const [lastShowRes, upcomingRes] = await Promise.all([
      supabase
        .from('shows')
        .select('*')
        .eq('status', 'completed')
        .order('show_date', { ascending: false })
        .limit(1),
      supabase
        .from('shows')
        .select('*')
        .eq('status', 'committed')
        .gte('show_date', today)
        .order('show_date', { ascending: true })
        .limit(6),
    ])

    const lastShow = lastShowRes.data?.[0] ?? null
    const upcomingShows = upcomingRes.data ?? []
    const nextShow: NextShowInfo | null = upcomingShows[0] ?? null

    // Fetch matches for both shows in parallel
    let lastShowMatches: any[] = []
    let andNewMatchIds = new Set<string>()
    let nextShowMatches: any[] = []

    const matchFetches: Promise<void>[] = []

    if (lastShow) {
      matchFetches.push(
        (async () => {
          const { data } = await supabase
            .from('matches')
            .select('*, match_participants(*, wrestlers(*), teams(*)), titles(*)')
            .eq('show_id', lastShow.id)
            .order('match_number', { ascending: true })
          lastShowMatches = data ?? []
          const matchIds = lastShowMatches.map(m => m.id)
          if (matchIds.length > 0) {
            const { data: reigns } = await supabase
              .from('title_reigns')
              .select('won_at_match_id')
              .in('won_at_match_id', matchIds)
            andNewMatchIds = new Set((reigns ?? []).map((r: any) => r.won_at_match_id))
          }
        })()
      )
    }

    if (nextShow) {
      matchFetches.push(
        (async () => {
          const { data } = await supabase
            .from('matches')
            .select('*, match_participants(*, wrestlers(*), teams(*)), titles(*)')
            .eq('show_id', nextShow.id)
            .order('match_number', { ascending: true })
          nextShowMatches = data ?? []
        })()
      )
    }

    await Promise.all(matchFetches)

    // Build featured banner slides (title matches first, then others, max 4)
    const titleMatches = lastShowMatches.filter(m => m.is_title_match)
    const nonTitleMatches = lastShowMatches.filter(m => !m.is_title_match)
    const slideMatches = [...titleMatches, ...nonTitleMatches].slice(0, 4)

    const slides: FeaturedSlide[] = lastShow
      ? slideMatches.map(m => ({
          id: m.id,
          hashtag: matchHashtag(m, andNewMatchIds),
          subhead: `${lastShow.name} · ${m.is_title_match ? (m.titles?.name ?? 'Title Match') : m.match_type}`,
          headline: matchHeadline(m, andNewMatchIds),
          href: `/shows/${toSlug(lastShow.name)}`,
          image_url: participantImage((m.match_participants ?? []).find((p: any) => p.result === 'winner') ?? {}),
        }))
      : []

    const miniResults: MiniResult[] = lastShow
      ? slideMatches.map(m => {
          const winner = (m.match_participants ?? []).find((p: any) => p.result === 'winner')
          const hashtag = matchHashtag(m, andNewMatchIds)
          const label = m.is_title_match ? (m.titles?.name ?? 'Title') : (m.stipulation ?? m.match_type)
          const winnerName = winner ? participantName(winner) : 'Unknown'
          let title = winnerName
          if (hashtag === 'ANDSTILL') title = `${winnerName} Retains`
          else if (hashtag === 'WINNER') title = `${winnerName} Wins`
          return {
            id: m.id,
            hashtag,
            hashtagLabel: label,
            title,
            date: formatDateDots(lastShow.show_date),
            href: `/shows/${toSlug(lastShow.name)}`,
            image_url: winner ? participantImage(winner) : null,
          }
        })
      : []

    // Build news grid (up to 6 matches from last show)
    const newsMatches = [...titleMatches, ...nonTitleMatches].slice(0, 6)
    const newsCards: NewsCard[] = lastShow
      ? newsMatches.map(m => ({
          id: m.id,
          hashtag: matchHashtag(m, andNewMatchIds),
          date: formatDateLong(lastShow.show_date),
          title: matchHeadline(m, andNewMatchIds),
          excerpt: matchExcerpt(m, andNewMatchIds),
          href: `/shows/${toSlug(lastShow.name)}`,
          image_url: participantImage((m.match_participants ?? []).find((p: any) => p.result === 'winner') ?? {}),
        }))
      : []

    // Build upcoming events
    const eventItems: EventItem[] = upcomingShows.map(s => ({
      id: s.id,
      name: s.ppv_name ?? s.name,
      show_date: s.show_date,
      show_type: s.show_type,
      href: '/schedule',
    }))

    // Build match card slides
    const matchSlides: MatchSlide[] = nextShowMatches.map(m => ({
      id: m.id,
      matchNumber: m.match_number,
      matchType: m.match_type,
      stipulation: m.stipulation ?? null,
      isTitleMatch: m.is_title_match,
      titleName: m.titles?.name ?? null,
      sides: buildSides(m.match_participants ?? []),
    }))

    return (
      <>
        <HomeFeaturedBanner slides={slides} miniResults={miniResults} />
        <HomeNewsGrid cards={newsCards} />
        <HomeUpcomingEvents events={eventItems} />
        {nextShow && matchSlides.length > 0 && (
          <HomeMatchCard show={nextShow} slides={matchSlides} />
        )}
        <HomeCommunityStrip />
      </>
    )
  } catch {
    return (
      <>
        <HomeFeaturedBanner slides={[]} miniResults={[]} />
        <HomeCommunityStrip />
      </>
    )
  }
}
