import { createClient } from '@/lib/supabase-server'
import { Metadata } from 'next'
import ArchiveShowList, { ArchiveShow } from '@/components/ArchiveShowList'

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
        id, name, show_date, show_type, ppv_name, stream_url,
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
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem', alignItems: 'center' }}>
        {/* Type */}
        <div className="tab-group">
          {[['all', 'All Shows'], ['weekly', 'Weekly'], ['ppv', 'PPV']].map(([val, label]) => (
            <a key={val} href={buildUrl({ type: val, page: '1' })} className={`tab${showType === val ? ' active' : ''}`}>
              {label}
            </a>
          ))}
        </div>

        {/* Year — scrollable on mobile */}
        <div style={{ overflowX: 'auto', scrollbarWidth: 'none', maxWidth: '100%' }}>
          <div className="tab-group" style={{ whiteSpace: 'nowrap' }}>
            {YEARS.map((y) => (
              <a key={y} href={buildUrl({ year: y, page: '1' })} className={`tab${year === y ? ' active' : ''}`}>
                {y === 'all' ? 'All' : y}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Show list — collapsible rows */}
      {shows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', fontFamily: 'var(--font-meta)', letterSpacing: '0.15em' }}>
          No shows found for the selected filters.
        </div>
      ) : (
        <ArchiveShowList shows={shows as unknown as ArchiveShow[]} />
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
