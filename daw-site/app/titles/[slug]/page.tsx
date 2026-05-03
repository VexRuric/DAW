import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ slug: string }>
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

function daysBetween(start: string, end: string | null) {
  const s = new Date(start + 'T00:00:00')
  const e = end ? new Date(end + 'T00:00:00') : new Date()
  return Math.floor((e.getTime() - s.getTime()) / 86400000)
}

async function getData(slug: string) {
  const supabase = await createClient()

  // Fetch all active titles to find matching slug
  const { data: titles } = await supabase
    .from('titles')
    .select('id, name, category, gender, description, image_url, display_order')
    .eq('active', true)

  if (!titles) return null
  const title = titles.find((t) => toSlug(t.name) === slug)
  if (!title) return null

  // Fetch all reigns for this title
  const { data: reigns } = await supabase
    .from('title_reigns')
    .select(`
      id, won_date, lost_date, reign_number, notes,
      wrestlers:holder_wrestler_id(id, name, render_url, division, role),
      teams:holder_team_id(id, name, render_url),
      won_match:won_at_match_id(id, match_type, shows:show_id(name, show_date)),
      lost_match:lost_at_match_id(id, match_type, shows:show_id(name, show_date))
    `)
    .eq('title_id', title.id)
    .order('won_date', { ascending: false })

  return { title, reigns: (reigns ?? []) as any[] }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getData(slug)
  if (!data) return { title: 'Title Not Found' }
  return {
    title: `${data.title.name} History`,
    description: `Complete reign history for the DAW ${data.title.name}.`,
  }
}

export default async function TitleHistoryPage({ params }: PageProps) {
  const { slug } = await params
  const data = await getData(slug)
  if (!data) notFound()

  const { title, reigns } = data

  // Partition: "Vacant" holder entries vs real reigns
  const isVacant = (r: any) => (r.wrestlers?.name ?? r.teams?.name ?? '').toLowerCase() === 'vacant'
  const vacantReigns  = reigns.filter((r: any) => isVacant(r))
  const visibleReigns = reigns.filter((r: any) => !isVacant(r) && (r.wrestlers || r.teams))

  // Tag reigns that ended with the title going Vacant (cash-in / surrendered)
  const cashedInIds = new Set<string>()
  for (const vr of vacantReigns) {
    const source = visibleReigns.find((r: any) => r.lost_date === vr.won_date)
    if (source) cashedInIds.add(source.id)
  }

  const currentReign  = visibleReigns.find((r: any) => !r.lost_date)
  const currentHolder = currentReign?.wrestlers ?? currentReign?.teams ?? null
  const totalReigns   = visibleReigns.length
  const longestReign  = visibleReigns.reduce((best: any, r: any) => {
    const days = daysBetween(r.won_date, r.lost_date)
    return days > (best?.days ?? 0) ? { ...r, days } : best
  }, null as any)

  return (
    <div>
      {/* Hero */}
      <section
        style={{
          position: 'relative',
          borderBottom: '1px solid var(--border)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 30% 50%, rgba(255,201,51,0.12) 0%, transparent 65%)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, padding: '2rem 3rem', width: '100%', display: 'flex', alignItems: 'center', gap: '3rem' }}>
          {/* Left: text content */}
          <div style={{ flex: 1 }}>
            {/* Breadcrumb */}
            <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: '1rem' }}>
              <Link href="/titles" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Championships</Link>
              {' / '}
              {title.name}
            </div>

            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--gold)', letterSpacing: '0.25em', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ width: 30, height: 1, background: 'var(--gold)' }} />
              {title.category.toUpperCase()} TITLE
            </p>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                color: 'var(--text-strong)',
                textTransform: 'uppercase',
                lineHeight: 0.9,
                marginBottom: '2rem',
              }}
            >
              {title.name}
            </h1>

            {/* Stats strip */}
            <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'white', lineHeight: 1 }}>{totalReigns}</div>
                <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Total Reigns</div>
              </div>
              {longestReign && (
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--gold)', lineHeight: 1 }}>{longestReign.days}</div>
                  <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Longest Reign (days)</div>
                </div>
              )}
              {currentReign && (
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--purple-hot)', lineHeight: 1 }}>{daysBetween(currentReign.won_date, null)}</div>
                  <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Current Reign (days)</div>
                </div>
              )}
            </div>
          </div>

          {/* Right: belt image */}
          {title.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={title.image_url}
              alt={title.name}
              style={{
                height: 'clamp(260px, 40vw, 560px)',
                maxWidth: '55%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 6px 40px rgba(255,201,51,0.55))',
                flexShrink: 0,
                transform: 'scale(1.25)',
              }}
            />
          )}
        </div>
      </section>

      {/* Current champion */}
      {currentReign && currentHolder && (
        <section style={{ padding: '2rem 3rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,201,51,0.04)' }}>
          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--gold)', letterSpacing: '0.25em', fontWeight: 700, marginBottom: '1rem' }}>
            ★ CURRENT CHAMPION
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {/* Portrait */}
            <Link href={currentReign.wrestlers ? `/roster/${toSlug(currentHolder.name)}` : `/roster/factions`} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div
                style={{
                  width: 120,
                  height: 160,
                  border: '2px solid var(--gold)',
                  overflow: 'hidden',
                  background: 'var(--surface)',
                  position: 'relative',
                }}
              >
                {(currentHolder as any).render_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(currentHolder as any).render_url}
                    alt={currentHolder.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                  />
                ) : (
                  <SilhouettePlaceholder />
                )}
              </div>
            </Link>

            <div>
              <Link
                href={currentReign.wrestlers ? `/roster/${toSlug(currentHolder.name)}` : `/roster/factions`}
                style={{ textDecoration: 'none' }}
              >
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(2rem, 5vw, 4rem)',
                    color: 'var(--gold)',
                    textTransform: 'uppercase',
                    lineHeight: 0.9,
                    marginBottom: '0.75rem',
                  }}
                >
                  {currentHolder.name}
                </h2>
              </Link>
              <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.12em' }}>
                Won {formatDate(currentReign.won_date)}
                {(currentReign as any).won_match?.shows?.name
                  ? ` at ${(currentReign as any).won_match.shows.name}`
                  : ''}
              </p>
              {currentReign.reign_number && (
                <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--purple-hot)', letterSpacing: '0.15em', fontWeight: 700, marginTop: '0.4rem' }}>
                  Reign #{currentReign.reign_number}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Reign history table */}
      <section style={{ padding: '2rem 3rem' }}>
        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--purple-hot)', letterSpacing: '0.25em', fontWeight: 700, marginBottom: '1.5rem' }}>
          REIGN HISTORY
        </p>

        {visibleReigns.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>
            No recorded reigns.
          </p>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {/* Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr 180px 180px 90px',
                gap: '0.75rem',
                padding: '0.65rem 1.25rem',
                background: 'var(--surface-2)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {['#', 'Champion', 'Won', 'Lost', 'Days'].map((h) => (
                <span key={h} style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--text-dim)' }}>
                  {h}
                </span>
              ))}
            </div>

            {visibleReigns.map((reign: any, idx: number) => {
              const holder = reign.wrestlers ?? reign.teams
              const isCurrent  = !reign.lost_date
              const isCashedIn = cashedInIds.has(reign.id)
              const days = daysBetween(reign.won_date, reign.lost_date)
              const isLongest = longestReign?.id === reign.id

              return (
                <div
                  key={reign.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px 1fr 180px 180px 90px',
                    gap: '0.75rem',
                    padding: '0.85rem 1.25rem',
                    borderBottom: '1px solid rgba(42,42,51,0.5)',
                    alignItems: 'center',
                    background: isCurrent ? 'rgba(255,201,51,0.05)' : 'transparent',
                    borderLeft: isCurrent ? '3px solid var(--gold)' : '3px solid transparent',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
                    {reign.reign_number ?? (visibleReigns.length - idx)}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {isCurrent && <span style={{ color: 'var(--gold)', fontSize: '0.7rem' }}>★</span>}
                    {reign.wrestlers ? (
                      <Link
                        href={`/roster/${toSlug(holder.name)}`}
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1rem',
                          color: isCurrent ? 'var(--gold)' : 'var(--text-strong)',
                          textTransform: 'uppercase',
                          textDecoration: 'none',
                          lineHeight: 1.1,
                        }}
                      >
                        {holder.name}
                      </Link>
                    ) : (
                      <Link
                        href={`/roster/factions`}
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1rem',
                          color: isCurrent ? 'var(--gold)' : 'var(--text-strong)',
                          textTransform: 'uppercase',
                          textDecoration: 'none',
                          lineHeight: 1.1,
                        }}
                      >
                        {holder.name}
                      </Link>
                    )}
                  </div>

                  <div>
                    <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                      {formatDate(reign.won_date)}
                    </p>
                    {reign.won_match?.shows?.name && (
                      <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.06em', marginTop: '0.15rem' }}>
                        {reign.won_match.shows.name}
                      </p>
                    )}
                  </div>

                  <div>
                    {isCurrent ? (
                      <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', color: 'var(--gold)', letterSpacing: '0.1em', fontWeight: 700 }}>
                        Present
                      </span>
                    ) : isCashedIn ? (
                      <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: '#f59e0b', letterSpacing: '0.12em', fontWeight: 700 }}>
                        CASHED IN
                      </span>
                    ) : (
                      <>
                        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                          {formatDate(reign.lost_date)}
                        </p>
                        {reign.lost_match?.shows?.name && (
                          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.06em', marginTop: '0.15rem' }}>
                            {reign.lost_match.shows.name}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: isLongest ? 'var(--gold)' : 'var(--text-muted)', fontWeight: isLongest ? 700 : 400, letterSpacing: '0.06em' }}>
                      {days}
                    </span>
                    {isLongest && (
                      <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.48rem', color: 'var(--gold)', letterSpacing: '0.1em', fontWeight: 700 }}>
                        RECORD
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
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
      <svg viewBox="0 0 100 140" style={{ width: '50%', height: '50%', opacity: 0.1 }} fill="white">
        <ellipse cx="50" cy="22" rx="16" ry="18" />
        <path d="M20 140 Q25 90 50 80 Q75 90 80 140Z" />
        <path d="M50 80 Q30 85 18 110 L30 115 Q38 95 50 90Z" />
        <path d="M50 80 Q70 85 82 110 L70 115 Q62 95 50 90Z" />
      </svg>
    </div>
  )
}
