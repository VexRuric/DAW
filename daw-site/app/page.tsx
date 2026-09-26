import { unstable_noStore } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import HomeStreamSection, { CompactMatch, StreamShowInfo } from '@/components/HomeStreamSection'
import HomeNewsGrid, { NewsCard } from '@/components/HomeNewsGrid'
import HomeUpcomingEvents, { EventItem } from '@/components/HomeUpcomingEvents'
import HomeCommunityStrip from '@/components/HomeCommunityStrip'
import { buildAndNewIds, buildReignStarts, deriveHashtag } from '@/lib/title-hashtag'
import { buildExcerpt, buildHeadline, buildTemplateMap, formatDateLong, formatDateShortAbbr, participantImage, participantName, winnerForImage } from '@/lib/match-news'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'DAW Warehouse LIVE — Home',
  description: 'Results, roster, championships, and upcoming shows for DAW Warehouse LIVE.',
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
  // Check every winner (wrestlers and any faction entry): the side may be named after
  // the tag pair while the first winner row is the faction, or vice versa
  const winnerNames = new Set<string>(
    (match.match_participants ?? []).filter((p: any) => p.result === 'winner').map((p: any) => participantName(p))
  )
  if (winnerNames.size === 0) return null
  for (let i = 0; i < sides.length; i++) {
    const s = sides[i]
    if (winnerNames.has(s.name)) return i
    if ((s as any).members?.some((m: { name: string }) => winnerNames.has(m.name))) return i
  }
  return null
}

export default async function HomePage() {
  unstable_noStore()
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
      supabase.from('shows').select('*').in('status', ['completed', 'committed'])
        .neq('show_type', 'twitch')
        .lte('show_date', today).order('show_date', { ascending: false }).limit(1),
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
    const tplMap = buildTemplateMap(templatesRes.data)
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
          .select('id, match_number, match_type, scheme, stipulation, is_title_match, winner_image_url, match_participants(wrestler_id, team_id, result, write_in_name, wrestlers(name, render_url), teams(name, render_url)), titles(id, name)')
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

    // ANDNEW/ANDSTILL inputs across both the stream show and last completed show
    const allRelevantMatches = [...lastShowMatches, ...streamMatches]
    const allRelevantMatchIds = [...new Set(allRelevantMatches.map(m => m.id as string))]
    const titleIds = [...new Set(
      allRelevantMatches.filter((m: any) => m.is_title_match && m.titles?.id).map((m: any) => m.titles.id as string)
    )]
    const [andNewSet, reignStarts] = await Promise.all([
      buildAndNewIds(supabase, allRelevantMatchIds),
      buildReignStarts(supabase, titleIds),
    ])
    andNewIds = andNewSet

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
        hashtag: hasWinner ? deriveHashtag(m, andNewIds, reignStarts, streamShowRaw.show_date) : null,
        winningSideIdx: hasWinner ? findWinningSideIdx(m, sides) : null,
        sides,
        scheme: (m.scheme ?? null) as 'Match' | 'Promo' | 'Write-In' | null,
      }
    })

    // News grid: participants default to 'loser' when matchcard is built, so only show
    // a match once a winner (or draw) has been explicitly declared
    const hasResult = (m: any) => (m.match_participants ?? []).some((p: any) => p.result === 'winner' || p.result === 'draw')
    // Reverse each group so highest match number (main event) comes first
    const titleMatches = lastShowMatches.filter(m => m.is_title_match && hasResult(m)).reverse()
    const nonTitleMatches = lastShowMatches.filter(m => !m.is_title_match && hasResult(m)).reverse()
    const newsMatches = [...titleMatches, ...nonTitleMatches]

    const newsCards: NewsCard[] = lastShow
      ? newsMatches.map(m => {
          const imageWinner = winnerForImage(m.match_participants ?? [])
          const firstParticipant = (m.match_participants ?? []).find((p: any) => p.wrestlers?.render_url)
            ?? (m.match_participants ?? [])[0]
            ?? null
          const imageSource = imageWinner ?? (m.scheme === 'Promo' ? firstParticipant : null)
          return {
            id: m.id,
            hashtag: deriveHashtag(m, andNewIds, reignStarts, lastShow.show_date),
            date: formatDateLong(lastShow.show_date),
            dateShort: formatDateShortAbbr(lastShow.show_date),
            title: buildHeadline(m, andNewIds, tplMap, reignStarts, lastShow.show_date),
            excerpt: buildExcerpt(m, andNewIds, tplMap, reignStarts, lastShow.show_date),
            href: `/shows`,
            image_url: m.winner_image_url ?? (imageSource ? participantImage(imageSource) : null),
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
