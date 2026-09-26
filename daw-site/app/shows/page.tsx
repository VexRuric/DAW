import { unstable_noStore } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Metadata } from 'next'
import { buildAndNewIds, buildReignStarts, deriveHashtag, HASHTAG_BG, HASHTAG_FG } from '@/lib/title-hashtag'
import { buildExcerpt, buildHeadline, buildTemplateMap, formatDateShortAbbr, participantImage, winnerForImage } from '@/lib/match-news'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Match Reports — DAW Warehouse LIVE',
  description: 'Full match results for every DAW Warehouse LIVE show.',
}

const SHOWS_PER_PAGE = 3

const hasResult = (m: any) => (m.match_participants ?? []).some((p: any) => p.result === 'winner' || p.result === 'draw')

interface PageProps { searchParams: Promise<{ page?: string }> }

export default async function ShowsPage({ searchParams }: PageProps) {
  unstable_noStore()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))
  const today = new Date().toISOString().slice(0, 10)

  const supabase = await createClient()

  const [showsRes, templatesRes] = await Promise.all([
    supabase
      .from('shows')
      .select('id, name, show_date, show_type, ppv_name, status', { count: 'exact' })
      .in('status', ['completed', 'committed'])
      .lte('show_date', today)
      .order('show_date', { ascending: false })
      .range((page - 1) * SHOWS_PER_PAGE, page * SHOWS_PER_PAGE - 1),
    supabase.from('news_templates').select('category, template').eq('active', true),
  ])

  const shows = showsRes.data ?? []
  const totalCount = showsRes.count ?? 0
  const totalPages = Math.ceil(totalCount / SHOWS_PER_PAGE)

  const tplMap = buildTemplateMap(templatesRes.data)

  let matchesByShow: Record<string, any[]> = {}
  let andNewIds = new Set<string>()
  let reignStarts = new Set<string>()

  if (shows.length > 0) {
    const showIds = shows.map((s: any) => s.id)
    const { data: matchesData } = await supabase
      .from('matches')
      .select(`
        id, show_id, match_number, match_type, scheme, stipulation, is_title_match, winner_image_url,
        match_participants(wrestler_id, team_id, result, write_in_name, wrestlers(name, render_url), teams(name, render_url)),
        titles(id, name)
      `)
      .in('show_id', showIds)
      .order('match_number', { ascending: true })

    for (const m of matchesData ?? []) {
      if (!matchesByShow[m.show_id]) matchesByShow[m.show_id] = []
      matchesByShow[m.show_id].push(m)
    }

    const allMatchIds = (matchesData ?? []).map((m: any) => m.id)
    const allTitleIds = [...new Set(
      (matchesData ?? []).filter((m: any) => m.is_title_match && m.titles?.id).map((m: any) => m.titles.id as string)
    )]
    ;[andNewIds, reignStarts] = await Promise.all([
      buildAndNewIds(supabase, allMatchIds),
      buildReignStarts(supabase, allTitleIds),
    ])
  }

  function buildUrl(p: number) {
    return `/shows?page=${p}`
  }

  return (
    <div className="section">
      {/* Header */}
      <div className="section-head" style={{ marginBottom: '2.5rem' }}>
        <div>
          <div className="section-label">DAW Warehouse LIVE</div>
          <h1 className="section-title">Match Reports</h1>
        </div>
        <Link href="/" style={{ fontFamily: 'var(--font-meta)', fontSize: '0.68rem', color: 'var(--text-dim)', textDecoration: 'none', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
          ← Home
        </Link>
      </div>

      {shows.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'var(--font-meta)', fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          No results on record yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
          {shows.map((show: any) => {
            const allMatches = matchesByShow[show.id] ?? []
            const completedMatches = allMatches.filter(hasResult)
            if (completedMatches.length === 0) return null

            const showLabel = show.ppv_name ?? show.name
            const isPPV = show.show_type === 'ppv'

            return (
              <div key={show.id}>
                {/* Show header */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1.75rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                  {isPPV && (
                    <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', background: 'var(--accent-red)', color: '#fff', padding: '0.2rem 0.45rem' }}>
                      PPV
                    </span>
                  )}
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 3vw, 2.25rem)', color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1, margin: 0 }}>
                    {showLabel}
                  </h2>
                  <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>
                    {formatDateShortAbbr(show.show_date)}
                  </span>
                </div>

                {/* Match cards grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                  {completedMatches.map((match: any) => {
                    const hashtag = deriveHashtag(match, andNewIds, reignStarts, show.show_date)
                    const headline = buildHeadline(match, andNewIds, tplMap, reignStarts, show.show_date)
                    const excerpt  = buildExcerpt(match, andNewIds, tplMap, reignStarts, show.show_date)
                    const imageWinner = winnerForImage(match.match_participants ?? [])
                    const firstP   = (match.match_participants ?? []).find((p: any) => p.wrestlers?.render_url)
                      ?? (match.match_participants ?? [])[0]
                      ?? null
                    const imgSrc   = match.winner_image_url ?? (imageWinner ? participantImage(imageWinner) : (match.scheme === 'Promo' ? participantImage(firstP) : null))

                    return (
                      <div key={match.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/* Image */}
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: 'var(--surface-2)', overflow: 'hidden', flexShrink: 0 }}>
                          {imgSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imgSrc} alt={headline} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: `radial-gradient(ellipse at 50% 40%, ${HASHTAG_BG[hashtag]}28 0%, var(--surface-2) 100%)` }} />
                          )}
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 60%)', pointerEvents: 'none' }} />
                          <span style={{ position: 'absolute', top: '0.6rem', left: '0.6rem', fontFamily: 'var(--font-meta)', fontSize: '0.52rem', padding: '0.15rem 0.4rem', background: HASHTAG_BG[hashtag], color: HASHTAG_FG[hashtag], fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            #{hashtag}
                          </span>
                          <span style={{ position: 'absolute', bottom: '0.6rem', right: '0.6rem', fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
                            Match {match.match_number}
                          </span>
                        </div>

                        {/* Text body */}
                        <div style={{ padding: '0.9rem 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                          <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: 'var(--text-dim)', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>
                            {match.is_title_match && match.titles?.name
                              ? `${match.titles.name} · ${match.match_type}`
                              : match.scheme === 'Promo' ? 'Promo' : match.match_type}
                          </div>
                          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.9rem, 1.8vw, 1.15rem)', lineHeight: 1.1, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.01em', margin: 0 }}>
                            {headline}
                          </h3>
                          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.55, margin: 0, marginTop: '0.2rem' }}>
                            {excerpt}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '3.5rem', flexWrap: 'wrap' }}>
          {page > 1 && (
            <Link href={buildUrl(page - 1)} style={{ padding: '0.5rem 1rem', fontFamily: 'var(--font-meta)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              ← Prev
            </Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <Link key={p} href={buildUrl(p)} style={{ padding: '0.5rem 0.9rem', fontFamily: 'var(--font-meta)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', border: `1px solid ${p === page ? 'var(--purple-hot)' : 'var(--border)'}`, background: p === page ? 'rgba(168,77,255,0.15)' : 'transparent', color: p === page ? 'var(--purple-hot)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
              {p}
            </Link>
          ))}
          {page < totalPages && (
            <Link href={buildUrl(page + 1)} style={{ padding: '0.5rem 1rem', fontFamily: 'var(--font-meta)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
