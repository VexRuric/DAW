import { unstable_noStore } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Match Reports — DAW Warehouse LIVE',
  description: 'Full match results for every DAW Warehouse LIVE show.',
}

const SHOWS_PER_PAGE = 3

/* ── Helpers (mirror of app/page.tsx) ──────────────────── */

function participantName(p: any): string {
  return p.wrestlers?.name ?? p.teams?.name ?? p.write_in_name ?? 'Unknown'
}
function participantImage(p: any): string | null {
  return p.wrestlers?.render_url ?? p.teams?.render_url ?? null
}
function winnerForImage(participants: any[]): any | null {
  const winners = (participants ?? []).filter((p: any) => p.result === 'winner')
  return winners.find((p: any) => p.wrestlers?.render_url)
    ?? winners.find((p: any) => p.wrestlers)
    ?? winners[0]
    ?? null
}
function formatDateLong(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
function formatDateShortAbbr(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}
function pick<T>(arr: T[], seed: string): T {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return arr[h % arr.length]
}
function fillTemplate(tpl: string, tokens: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => tokens[k] ?? `{${k}}`)
}

type TemplateMap = Record<string, string[]>

const FALLBACK_HEADLINES: TemplateMap = {
  andnew_headline:  ['{winner} Captures The {title}', 'New Champion: {winner} Dethrones {loser} For The {title}'],
  andstill_headline:['{winner} Retains The {title}', 'And Still! {winner} Defends The {title} Over {loser}'],
  winner_headline:  ['{winner} Picks Up The Win Over {loser}', '{winner} Victorious — {loser} Dethroned'],
}
const FALLBACK_EXCERPTS: TemplateMap = {
  andnew_excerpt:   ['{winner} captures the {title} in a {match_type}, defeating {loser}.'],
  andstill_excerpt: ['{winner} successfully defends the {title} against {loser} in a {match_type}.'],
  winner_excerpt:   ['{winner} picks up the win over {loser} in a {match_type}.'],
}

function deriveHashtag(match: any, andNewIds: Set<string>): 'ANDNEW' | 'ANDSTILL' | 'WINNER' {
  if (match.is_title_match) return andNewIds.has(match.id) ? 'ANDNEW' : 'ANDSTILL'
  return 'WINNER'
}

function buildHeadline(match: any, andNewIds: Set<string>, tplMap: TemplateMap): string {
  const effectiveType = match.scheme === 'Promo' ? 'Promo' : match.match_type
  const promoLabel = match.scheme === 'Promo' && match.stipulation ? match.stipulation : effectiveType
  const winner = (match.match_participants ?? []).find((p: any) => p.result === 'winner')
  if (!winner) {
    const promoSubject = match.scheme === 'Promo' ? (match.match_participants ?? [])[0] ?? null : null
    if (promoSubject) return `${participantName(promoSubject)} — ${promoLabel}`
    return promoLabel
  }
  const wName = participantName(winner)
  const losers = (match.match_participants ?? []).filter((p: any) => p.result === 'loser')
  const lName = losers.length === 0 ? '' : losers.length <= 3
    ? losers.map((p: any) => participantName(p)).join(' & ')
    : losers.slice(0, 2).map((p: any) => participantName(p)).join(', ') + ' & more'
  const hashtag = deriveHashtag(match, andNewIds)
  const titleName = match.titles?.name ?? 'Title'
  const tokens = { winner: wName, loser: lName || wName, title: titleName, match_type: promoLabel }
  const catKey = hashtag === 'ANDNEW' ? 'andnew_headline' : hashtag === 'ANDSTILL' ? 'andstill_headline' : 'winner_headline'
  const pool = (tplMap[catKey]?.length ? tplMap[catKey] : FALLBACK_HEADLINES[catKey])!
  return fillTemplate(pick(pool, match.id), tokens)
}

function buildExcerpt(match: any, andNewIds: Set<string>, tplMap: TemplateMap): string {
  const winner = (match.match_participants ?? []).find((p: any) => p.result === 'winner')
  const losers = (match.match_participants ?? []).filter((p: any) => p.result === 'loser')
  const wName = winner ? participantName(winner) : ''
  const lStr  = losers.map((p: any) => participantName(p)).join(' and ')
  const hashtag = deriveHashtag(match, andNewIds)
  const titleName = match.titles?.name ?? 'title'
  const effectiveType = match.scheme === 'Promo' ? 'Promo' : match.match_type
  const matchLabel = `${effectiveType}${match.stipulation ? ` ${match.stipulation}` : ''}`
  const tokens = { winner: wName, loser: lStr || wName, title: titleName, match_type: matchLabel }
  const catKey = hashtag === 'ANDNEW' ? 'andnew_excerpt' : hashtag === 'ANDSTILL' ? 'andstill_excerpt' : 'winner_excerpt'
  const pool = (tplMap[catKey]?.length ? tplMap[catKey] : FALLBACK_EXCERPTS[catKey])!
  return fillTemplate(pick(pool, match.id), tokens)
}

const hasResult = (m: any) => (m.match_participants ?? []).some((p: any) => p.result === 'winner' || p.result === 'draw')

const HASHTAG_BG: Record<string, string> = { ANDNEW: 'var(--accent-red)', ANDSTILL: 'var(--gold)', WINNER: 'var(--purple)' }
const HASHTAG_FG: Record<string, string> = { ANDNEW: 'var(--text-strong)', ANDSTILL: 'var(--bg-top)', WINNER: 'var(--text-strong)' }

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

  const tplMap: TemplateMap = {}
  for (const row of templatesRes.data ?? []) {
    if (!tplMap[row.category]) tplMap[row.category] = []
    tplMap[row.category].push(row.template)
  }

  let matchesByShow: Record<string, any[]> = {}
  let andNewIds = new Set<string>()

  if (shows.length > 0) {
    const showIds = shows.map((s: any) => s.id)
    const { data: matchesData } = await supabase
      .from('matches')
      .select(`
        id, show_id, match_number, match_type, scheme, stipulation, is_title_match,
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
    if (allMatchIds.length > 0) {
      const { data: reigns } = await supabase
        .from('title_reigns').select('won_at_match_id').in('won_at_match_id', allMatchIds)
      andNewIds = new Set((reigns ?? []).map((r: any) => r.won_at_match_id))
    }
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
                    const hashtag = deriveHashtag(match, andNewIds)
                    const headline = buildHeadline(match, andNewIds, tplMap)
                    const excerpt  = buildExcerpt(match, andNewIds, tplMap)
                    const imageWinner = winnerForImage(match.match_participants ?? [])
                    const firstP   = (match.match_participants ?? []).find((p: any) => p.wrestlers?.render_url)
                      ?? (match.match_participants ?? [])[0]
                      ?? null
                    const imgSrc   = imageWinner ? participantImage(imageWinner) : (match.scheme === 'Promo' ? participantImage(firstP) : null)

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
