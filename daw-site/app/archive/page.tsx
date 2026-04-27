import { createClient } from '@/lib/supabase-server'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Match Archive',
  description: 'Complete DAW Warehouse LIVE match archive — every show, every result, since 2022.',
}

interface PageProps {
  searchParams: Promise<{ page?: string; type?: string; year?: string }>
}

async function getData(page: number, showType: string, year: string) {
  try {
    const supabase = await createClient()
    const PER_PAGE = 20

    let query = supabase
      .from('shows')
      .select(`
        id, name, show_date, show_type, ppv_name,
        matches(
          id, match_number, match_type, stipulation, is_title_match, is_draw, rating,
          titles(name),
          match_participants(
            result,
            wrestlers(id, name),
            teams(id, name)
          )
        )
      `, { count: 'exact' })
      .order('show_date', { ascending: false })
      .order('match_number', { ascending: true, referencedTable: 'matches' })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1)

    if (showType !== 'all') query = query.eq('show_type', showType)
    if (year !== 'all') {
      query = query.gte('show_date', `${year}-01-01`).lte('show_date', `${year}-12-31`)
    }

    const { data, count } = await query
    return { shows: data ?? [], total: count ?? 0, perPage: PER_PAGE }
  } catch {
    return { shows: [], total: 0, perPage: 20 }
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function ArchivePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))
  const showType = sp.type ?? 'all'
  const year = sp.year ?? 'all'

  const { shows, total, perPage } = await getData(page, showType, year)
  const totalPages = Math.ceil(total / perPage)

  const YEARS = ['all', '2022', '2023', '2024', '2025', '2026']

  function buildUrl(params: Record<string, string>) {
    const p = new URLSearchParams({ page: String(page), type: showType, year, ...params })
    return `/archive?${p.toString()}`
  }

  return (
    <div className="section">
      {/* Header */}
      <div className="section-head">
        <div>
          <div className="section-label">DAW Warehouse LIVE</div>
          <h1 className="section-title">Match Archive</h1>
        </div>
        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
          {total.toLocaleString()} shows · Every result on record
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {/* Type */}
        <div className="tab-group">
          {[['all', 'All Shows'], ['weekly', 'Weekly'], ['ppv', 'PPV']].map(([val, label]) => (
            <a
              key={val}
              href={buildUrl({ type: val, page: '1' })}
              className={`tab${showType === val ? ' active' : ''}`}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Year */}
        <div className="tab-group">
          {YEARS.map((y) => (
            <a
              key={y}
              href={buildUrl({ year: y, page: '1' })}
              className={`tab${year === y ? ' active' : ''}`}
            >
              {y === 'all' ? 'All Years' : y}
            </a>
          ))}
        </div>
      </div>

      {/* Show list */}
      {shows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', fontFamily: 'var(--font-meta)', letterSpacing: '0.15em' }}>
          No shows found for the selected filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {shows.map((show: any) => {
            const isPPV = show.show_type === 'ppv'
            const sortedMatches = [...(show.matches ?? [])].sort(
              (a: { match_number: number }, b: { match_number: number }) => a.match_number - b.match_number
            )

            return (
              <div
                key={show.id}
                style={{
                  border: isPPV ? '2px solid var(--gold)' : '1px solid var(--border)',
                  overflow: 'hidden',
                }}
              >
                {/* Show header */}
                <div
                  style={{
                    padding: '1.25rem 1.5rem',
                    background: isPPV
                      ? 'linear-gradient(90deg, rgba(255,201,51,0.12) 0%, var(--surface) 100%)'
                      : 'var(--surface)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
                    {isPPV && (
                      <span className="pill pill-gold" style={{ fontSize: '0.55rem' }}>★ PPV</span>
                    )}
                    <h2
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.5rem',
                        color: isPPV ? 'var(--gold)' : 'var(--text-strong)',
                        textTransform: 'uppercase',
                        lineHeight: 1,
                      }}
                    >
                      {show.ppv_name ?? show.name}
                    </h2>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-meta)',
                      fontSize: '0.7rem',
                      color: 'var(--text-dim)',
                      letterSpacing: '0.15em',
                    }}
                  >
                    {formatDate(show.show_date)} · {sortedMatches.length} matches
                  </span>
                </div>

                {/* Matches */}
                <div style={{ background: 'var(--bg-mid)' }}>
                  {sortedMatches.map((match: {
                    id: string
                    match_number: number
                    match_type: string
                    stipulation: string | null
                    is_title_match: boolean
                    is_draw: boolean
                    rating: number | null
                    titles: { name: string } | null
                    match_participants: {
                      result: string
                      wrestlers: { id: string; name: string } | null
                      teams: { id: string; name: string } | null
                    }[]
                  }) => {
                    const winner = match.match_participants.find((p) => p.result === 'winner')
                    const losers = match.match_participants.filter((p) => p.result !== 'winner')
                    const winnerName = winner?.wrestlers?.name ?? winner?.teams?.name ?? '?'
                    const loserNames = losers
                      .map((p) => p.wrestlers?.name ?? p.teams?.name)
                      .filter(Boolean)
                      .join(', ')

                    return (
                      <div
                        key={match.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '40px 1fr auto',
                          gap: '1rem',
                          alignItems: 'center',
                          padding: '0.75rem 1.5rem',
                          borderBottom: '1px solid rgba(42,42,51,0.5)',
                        }}
                      >
                        {/* Match # */}
                        <span
                          style={{
                            fontFamily: 'var(--font-meta)',
                            fontSize: '0.65rem',
                            color: 'var(--text-dim)',
                            letterSpacing: '0.1em',
                            fontWeight: 700,
                          }}
                        >
                          #{match.match_number}
                        </span>

                        {/* Result */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '1rem',
                                color: 'var(--text-strong)',
                                textTransform: 'uppercase',
                              }}
                            >
                              {winnerName}
                            </span>
                            {loserNames && (
                              <>
                                <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                                  def.
                                </span>
                                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                  {loserNames}
                                </span>
                              </>
                            )}
                          </div>
                          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.08em', marginTop: '0.15rem' }}>
                            {match.match_type}
                            {match.stipulation ? ` · ${match.stipulation}` : ''}
                            {match.is_title_match && match.titles ? ` · ${match.titles.name}` : ''}
                          </p>
                        </div>

                        {/* Rating */}
                        {match.rating && (
                          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                            ★ {match.rating}
                          </span>
                        )}
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
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '3rem',
            flexWrap: 'wrap',
          }}
        >
          {page > 1 && (
            <a href={buildUrl({ page: String(page - 1) })} className="btn btn-ghost" style={{ padding: '0.5rem 1rem' }}>
              ← Prev
            </a>
          )}

          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
            const p = i + 1
            return (
              <a
                key={p}
                href={buildUrl({ page: String(p) })}
                className={`btn ${p === page ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '0.5rem 0.85rem', minWidth: 40, textAlign: 'center' }}
              >
                {p}
              </a>
            )
          })}

          {page < totalPages && (
            <a href={buildUrl({ page: String(page + 1) })} className="btn btn-ghost" style={{ padding: '0.5rem 1rem' }}>
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
