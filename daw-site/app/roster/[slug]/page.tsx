import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getWrestler(slug: string) {
  const supabase = await createClient()

  // Fetch all DAW wrestlers (active + alumni) so both have profile pages
  const { data: wrestlers } = await supabase.from('wrestlers').select('*').eq('brand', 'DAW')
  if (!wrestlers) return null

  const toSlug = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const wrestler = wrestlers.find((w) => toSlug(w.name) === slug)
  if (!wrestler) return null

  const [recordRes, reignsRes, matchesRes] = await Promise.all([
    // W/L/D record
    supabase.from('wrestler_records').select('*').eq('id', wrestler.id).single(),

    // Title reigns
    supabase
      .from('title_reigns')
      .select('*, titles(name, category)')
      .eq('holder_wrestler_id', wrestler.id)
      .order('won_date', { ascending: false }),

    // Last 20 matches
    supabase
      .from('match_participants')
      .select(`
        result,
        matches!inner(
          id, match_number, match_type, stipulation, is_title_match, is_draw, rating,
          shows!inner(name, show_date, show_type, ppv_name),
          titles(name),
          match_participants(
            result,
            wrestlers(id, name),
            teams(id, name)
          )
        )
      `)
      .eq('wrestler_id', wrestler.id)
      .order('created_at', { ascending: false, referencedTable: 'matches' })
      .limit(20),
  ])

  return {
    wrestler,
    record: recordRes.data,
    reigns: reignsRes.data ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    matchHistory: (matchesRes.data ?? []) as any[],
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getWrestler(slug)
  if (!data) return { title: 'Wrestler Not Found' }
  return {
    title: data.wrestler.name,
    description: `Stats, title history, and match log for ${data.wrestler.name} in DAW Warehouse LIVE.`,
  }
}

export default async function WrestlerStatPage({ params }: PageProps) {
  const { slug } = await params
  const data = await getWrestler(slug)
  if (!data) notFound()

  const { wrestler, record, reigns, matchHistory } = data

  const winPct = record?.win_pct ?? 0
  const wins = record?.wins ?? 0
  const losses = record?.losses ?? 0
  const draws = record?.draws ?? 0
  const total = record?.total_matches ?? 0
  const avgRating = record?.avg_rating ?? null

  const currentTitle = reigns.find((r: { lost_date: string | null }) => !r.lost_date)

  return (
    <div>
      {/* Hero */}
      <section
        style={{
          position: 'relative',
          borderBottom: '1px solid var(--border)',
          overflow: 'hidden',
          minHeight: 340,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: currentTitle
              ? 'radial-gradient(ellipse at 70% 50%, rgba(255,201,51,0.12) 0%, transparent 60%)'
              : 'radial-gradient(ellipse at 70% 50%, rgba(128,0,218,0.15) 0%, transparent 60%)',
          }}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            gap: '3rem',
            padding: '3rem',
            position: 'relative',
            zIndex: 2,
            alignItems: 'start',
          }}
        >
          {/* Portrait */}
          <div
            style={{
              aspectRatio: '3/4',
              background: 'var(--surface)',
              border: currentTitle ? '2px solid var(--gold)' : '1px solid var(--border)',
              overflow: 'hidden',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            {wrestler.render_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={wrestler.render_url}
                alt={wrestler.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
              />
            ) : (
              <SilhouettePlaceholder />
            )}
            {wrestler.injured && (
              <span
                className="pill pill-red"
                style={{ position: 'absolute', top: '0.6rem', left: '0.6rem', fontSize: '0.6rem' }}
              >
                Injured
              </span>
            )}
          </div>

          {/* Info */}
          <div style={{ paddingTop: '0.5rem' }}>
            {/* Breadcrumb */}
            <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: '1rem' }}>
              <Link href="/roster" style={{ color: 'var(--purple-hot)', textDecoration: 'none' }}>Roster</Link>
              {' / '}
              {wrestler.name}
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {wrestler.brand && <span className="pill pill-ghost">{wrestler.brand}</span>}
              {wrestler.division && <span className="pill" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{wrestler.division}</span>}
              {wrestler.role && (
                <span
                  className="pill"
                  style={{
                    background:
                      wrestler.role === 'Heel' ? 'rgba(255,51,85,0.15)' : 'rgba(0,200,100,0.12)',
                    border: `1px solid ${wrestler.role === 'Heel' ? 'var(--accent-red)' : '#00c864'}`,
                    color: wrestler.role === 'Heel' ? 'var(--accent-red)' : '#00c864',
                  }}
                >
                  {wrestler.role}
                </span>
              )}
              {!wrestler.active && <span className="pill pill-red">Inactive</span>}
            </div>

            {/* Name */}
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(3rem, 6vw, 5rem)',
                lineHeight: 0.9,
                color: 'var(--text-strong)',
                textTransform: 'uppercase',
                letterSpacing: '-0.01em',
                marginBottom: '1rem',
              }}
            >
              {wrestler.name}
            </h1>

            {/* Gimmick */}
            {wrestler.gimmick && (
              <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.15em', marginBottom: '1.5rem' }}>
                &ldquo;{wrestler.gimmick}&rdquo;
              </p>
            )}

            {/* Current title */}
            {currentTitle && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1.25rem',
                  background: 'rgba(255,201,51,0.1)',
                  border: '1px solid var(--gold)',
                  marginBottom: '1.5rem',
                }}
              >
                <span style={{ color: 'var(--gold)', fontSize: '1.25rem' }}>★</span>
                <div>
                  <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '0.15em', fontWeight: 700 }}>
                    CURRENT CHAMPION
                  </p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--text-strong)', textTransform: 'uppercase' }}>
                    {currentTitle.titles?.name}
                  </p>
                </div>
              </div>
            )}

            {/* Stats strip */}
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <StatBlock label="Wins" value={wins} color="#00c864" />
              <StatBlock label="Losses" value={losses} color="var(--accent-red)" />
              <StatBlock label="Draws" value={draws} color="var(--text-dim)" />
              <StatBlock label="Win %" value={`${winPct}%`} color="var(--purple-hot)" />
              <StatBlock label="Matches" value={total} color="var(--text-muted)" />
              {avgRating && <StatBlock label="Avg Rating" value={`${avgRating}/5`} color="var(--gold)" />}
            </div>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 0 }}>
        {/* Left: match history */}
        <section className="section" style={{ borderRight: '1px solid var(--border)' }}>
          <h2 className="section-title" style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>
            Match History
          </h2>

          {matchHistory.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-meta)', fontSize: '0.75rem', letterSpacing: '0.15em' }}>
              No match history found.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {matchHistory.map((mp: {
                result: string
                matches: {
                  id: string
                  match_type: string
                  stipulation: string | null
                  is_title_match: boolean
                  is_draw: boolean
                  rating: number | null
                  shows: { name: string; show_date: string; ppv_name: string | null; show_type: string }
                  titles: { name: string } | null
                  match_participants: { result: string; wrestlers: { id: string; name: string } | null; teams: { id: string; name: string } | null }[]
                }
              }, i: number) => {
                const m = mp.matches
                const isWin = mp.result === 'winner'
                const isDraw = mp.result === 'draw'
                const opponents = m.match_participants
                  .filter((p) => p.wrestlers?.id !== wrestler.id && p.teams === null)
                  .map((p) => p.wrestlers?.name ?? p.teams?.name)
                  .filter(Boolean)
                  .slice(0, 3)
                  .join(', ')

                return (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr auto',
                      gap: '1rem',
                      alignItems: 'center',
                      padding: '0.85rem 1rem',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderLeft: `3px solid ${isWin ? '#00c864' : isDraw ? 'var(--text-dim)' : 'var(--accent-red)'}`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.1rem',
                        color: isWin ? '#00c864' : isDraw ? 'var(--text-dim)' : 'var(--accent-red)',
                        textTransform: 'uppercase',
                        lineHeight: 1,
                      }}
                    >
                      {isWin ? 'W' : isDraw ? 'D' : 'L'}
                    </span>

                    <div>
                      <p
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '0.95rem',
                          color: 'var(--text-strong)',
                          lineHeight: 1.1,
                          textTransform: 'uppercase',
                        }}
                      >
                        {opponents ? `vs. ${opponents}` : m.match_type}
                      </p>
                      <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginTop: '0.2rem' }}>
                        {new Date(m.shows.show_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}{m.shows.ppv_name ?? m.shows.name}

                        {m.is_title_match && m.titles ? ` · ${m.titles.name}` : ''}
                        {m.stipulation ? ` · ${m.stipulation}` : ''}
                      </p>
                    </div>

                    {m.rating && (
                      <span
                        style={{
                          fontFamily: 'var(--font-meta)',
                          fontSize: '0.7rem',
                          color: 'var(--gold)',
                          letterSpacing: '0.1em',
                          fontWeight: 700,
                        }}
                      >
                        ★ {m.rating}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Right: title history */}
        <aside className="section">
          <h2 className="section-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
            Title History
          </h2>

          {reigns.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-meta)', fontSize: '0.72rem', letterSpacing: '0.15em' }}>
              No title reigns.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reigns.map((reign: {
                id: string
                won_date: string
                lost_date: string | null
                reign_number: number | null
                titles: { name: string; category: string } | null
              }) => (
                <div
                  key={reign.id}
                  style={{
                    padding: '0.85rem 1rem',
                    background: !reign.lost_date ? 'rgba(255,201,51,0.08)' : 'var(--surface)',
                    border: !reign.lost_date ? '1px solid var(--gold)' : '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                    <p
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1rem',
                        color: 'var(--text-strong)',
                        textTransform: 'uppercase',
                        lineHeight: 1.1,
                      }}
                    >
                      {reign.titles?.name}
                    </p>
                    {!reign.lost_date && (
                      <span style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>★</span>
                    )}
                  </div>

                  {reign.reign_number && (
                    <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--purple-hot)', letterSpacing: '0.12em', marginBottom: '0.3rem', fontWeight: 700 }}>
                      Reign #{reign.reign_number}
                    </p>
                  )}

                  <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
                    {new Date(reign.won_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' → '}
                    {reign.lost_date
                      ? new Date(reign.lost_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Present'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Bio — skip if bio is fan-submission JSON */}
          {wrestler.bio && (() => {
            try { JSON.parse(wrestler.bio); return null } catch { /* plain text */ }
            return (
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text-strong)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Bio
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  {wrestler.bio}
                </p>
              </div>
            )
          })()}
        </aside>
      </div>
    </div>
  )
}

function StatBlock({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.5rem',
          lineHeight: 1,
          color,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-meta)',
          fontSize: '0.62rem',
          color: 'var(--text-dim)',
          letterSpacing: '0.15em',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
    </div>
  )
}

function SilhouettePlaceholder() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, var(--surface-2) 0%, var(--surface-3) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg viewBox="0 0 100 140" style={{ width: '50%', height: '50%', opacity: 0.12 }} fill="white">
        <ellipse cx="50" cy="22" rx="16" ry="18" />
        <path d="M20 140 Q25 90 50 80 Q75 90 80 140Z" />
        <path d="M50 80 Q30 85 18 110 L30 115 Q38 95 50 90Z" />
        <path d="M50 80 Q70 85 82 110 L70 115 Q62 95 50 90Z" />
      </svg>
    </div>
  )
}
