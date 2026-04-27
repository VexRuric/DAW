import { createClient } from '@/lib/supabase-server'
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Championships',
  description: 'Current DAW Warehouse LIVE championship holders and full title reign histories.',
}

async function getData() {
  try {
    const supabase = await createClient()

    const [champRes, titlesRes] = await Promise.all([
      supabase.from('current_champions').select('*').order('days_held', { ascending: false }),
      supabase
        .from('titles')
        .select(`
          *,
          title_reigns(
            id, won_date, lost_date, reign_number,
            wrestlers:holder_wrestler_id(id, name),
            teams:holder_team_id(id, name)
          )
        `)
        .eq('active', true)
        .order('display_order', { ascending: true }),
    ])

    return {
      champions: champRes.data ?? [],
      titles: titlesRes.data ?? [],
    }
  } catch {
    return { champions: [], titles: [] }
  }
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function TitlesPage() {
  const { champions, titles } = await getData()

  return (
    <div className="section">
      {/* Header */}
      <div className="section-head">
        <div>
          <div className="section-label">DAW Warehouse LIVE</div>
          <h1 className="section-title">Championships</h1>
        </div>
        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.12em', maxWidth: 300, lineHeight: 1.6 }}>
          {champions.length} active title{champions.length !== 1 ? 's' : ''}. Reign histories updated live after every match.
        </p>
      </div>

      {/* Current champions grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem',
          marginBottom: '4rem',
        }}
      >
        {champions.map((champ: {
          title_id: string
          title_name: string
          category: string
          holder_name: string
          holder_wrestler_id: string | null
          won_date: string
          days_held: number
        }) => {
          const slug = champ.holder_wrestler_id ? toSlug(champ.holder_name) : null
          return (
            <div
              key={champ.title_id}
              style={{
                background: 'var(--surface)',
                border: '2px solid var(--gold)',
                padding: '1.5rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Glow */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(ellipse at 50% 0%, rgba(255,201,51,0.1) 0%, transparent 60%)',
                  pointerEvents: 'none',
                }}
              />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-meta)',
                    fontSize: '0.6rem',
                    color: 'var(--gold)',
                    letterSpacing: '0.2em',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                  }}
                >
                  ★ {champ.title_name}
                </p>

                {slug ? (
                  <Link
                    href={`/roster/${slug}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                    data-hover
                  >
                    <h2
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '2rem',
                        color: 'var(--text-strong)',
                        textTransform: 'uppercase',
                        lineHeight: 1,
                        marginBottom: '0.75rem',
                        transition: 'color 0.2s',
                      }}
                    >
                      {champ.holder_name}
                    </h2>
                  </Link>
                ) : (
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '2rem',
                      color: 'var(--text-strong)',
                      textTransform: 'uppercase',
                      lineHeight: 1,
                      marginBottom: '0.75rem',
                    }}
                  >
                    {champ.holder_name}
                  </h2>
                )}

                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--purple-hot)', lineHeight: 1 }}>
                      {champ.days_held}
                    </p>
                    <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.12em' }}>
                      Days Held
                    </p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: '0.3rem' }}>
                      Won {formatDate(champ.won_date)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Full title histories */}
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2rem',
          color: 'var(--text-strong)',
          textTransform: 'uppercase',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        Reign Histories
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {titles.map((title: {
          id: string
          name: string
          category: string
          gender: string | null
          title_reigns: {
            id: string
            won_date: string
            lost_date: string | null
            reign_number: number | null
            wrestlers: { id: string; name: string } | null
            teams: { id: string; name: string } | null
          }[]
        }) => {
          const sortedReigns = [...(title.title_reigns ?? [])].sort(
            (a, b) => new Date(b.won_date).getTime() - new Date(a.won_date).getTime()
          )

          return (
            <div key={title.id}>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  color: 'var(--gold)',
                  textTransform: 'uppercase',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                ★ {title.name}
                <span
                  style={{
                    fontFamily: 'var(--font-meta)',
                    fontSize: '0.6rem',
                    color: 'var(--text-dim)',
                    letterSpacing: '0.15em',
                    fontWeight: 700,
                  }}
                >
                  {title.category} · {title.gender ?? 'Any'}
                </span>
              </h3>

              {sortedReigns.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>
                  No recorded reigns.
                </p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  {sortedReigns.map((reign) => {
                    const holder = reign.wrestlers ?? reign.teams
                    if (!holder) return null
                    const slug = reign.wrestlers ? toSlug(holder.name) : null
                    const isCurrent = !reign.lost_date

                    return (
                      <div
                        key={reign.id}
                        style={{
                          padding: '0.85rem 1rem',
                          background: isCurrent ? 'rgba(255,201,51,0.07)' : 'var(--surface)',
                          border: isCurrent ? '1px solid var(--gold)' : '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                          {slug ? (
                            <Link
                              href={`/roster/${slug}`}
                              style={{ textDecoration: 'none' }}
                              data-hover
                            >
                              <span
                                style={{
                                  fontFamily: 'var(--font-display)',
                                  fontSize: '1.1rem',
                                  color: isCurrent ? 'var(--gold)' : 'var(--text-strong)',
                                  textTransform: 'uppercase',
                                  lineHeight: 1.1,
                                }}
                              >
                                {holder.name}
                              </span>
                            </Link>
                          ) : (
                            <span
                              style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '1.1rem',
                                color: isCurrent ? 'var(--gold)' : 'var(--text-strong)',
                                textTransform: 'uppercase',
                                lineHeight: 1.1,
                              }}
                            >
                              {holder.name}
                            </span>
                          )}
                          {isCurrent && <span style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>★</span>}
                        </div>

                        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
                          {formatDate(reign.won_date)} → {reign.lost_date ? formatDate(reign.lost_date) : 'Present'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
