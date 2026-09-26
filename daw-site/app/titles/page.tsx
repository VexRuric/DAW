import { createClient } from '@/lib/supabase-server'
import { Metadata } from 'next'
import Link from 'next/link'
import { toSlug } from '@/lib/slug'
import { holderNames, loadWrestlers, mergeTagPartnerRows, withHolders, type Holder } from '@/lib/title-holders'

export const metadata: Metadata = {
  title: 'Championships',
  description: 'Current DAW Warehouse LIVE championship holders and full title reign histories.',
}

async function getData() {
  try {
    const supabase = await createClient()

    const { data } = await supabase
      .from('titles')
      .select(`
        *,
        title_reigns(
          id, won_date, lost_date, reign_number, holder_wrestler_id_2,
          wrestlers:holder_wrestler_id(id, name, render_url),
          teams:holder_team_id(id, name, render_url)
        )
      `)
      .eq('active', true)
      .order('display_order', { ascending: true })

    // Show both partners on co-held tag reigns
    const titles = (data ?? []) as TitleWithReigns[]
    const partners = await loadWrestlers(supabase, titles.flatMap(t => (t.title_reigns ?? []).map((r: any) => r.holder_wrestler_id_2)))
    for (const t of titles) {
      t.title_reigns = mergeTagPartnerRows((t.title_reigns ?? []).map((r: any) => withHolders(r, partners)))
    }
    return { titles }
  } catch {
    return { titles: [] as TitleWithReigns[] }
  }
}

interface Reign { id: string; won_date: string; lost_date: string | null; reign_number: number | null; holders: Holder[] }
interface TitleWithReigns { id: string; name: string; category: string; gender: string | null; image_url: string | null; title_reigns: Reign[] }

function holderHref(h: Holder) {
  return h.kind === 'team' ? `/roster/factions/${toSlug(h.name)}` : `/roster/${toSlug(h.name)}`
}

function daysSince(dateStr: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr + 'T00:00:00').getTime()) / 86400000))
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function TitlesPage() {
  const { titles } = await getData()
  // Current champion of each title, in title display order ("Vacant" placeholder reigns skipped)
  const current = titles
    .map(title => ({ title, reign: title.title_reigns.find(r => !r.lost_date && r.holders.length > 0 && holderNames(r.holders).toLowerCase() !== 'vacant') }))
    .filter((c): c is { title: TitleWithReigns; reign: Reign } => !!c.reign)

  return (
    <div className="section">
      {/* Header */}
      <div className="section-head">
        <div>
          <div className="section-label">DAW Warehouse LIVE</div>
          <h1 className="section-title">Championships</h1>
        </div>
        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.12em', maxWidth: 300, lineHeight: 1.6 }}>
          {titles.length} active title{titles.length !== 1 ? 's' : ''}. Reign histories updated live after every match.
        </p>
      </div>

      {/* Current champions — holder image(s) up top, belt at the bottom */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))',
          gap: '1.25rem',
          marginBottom: '4rem',
        }}
      >
        {current.map(({ title, reign }) => {
          const titleHref = `/titles/${toSlug(title.name)}`
          // Faction reigns show the logo plus the members who won; otherwise each wrestler
          const images = reign.holders.flatMap(h => (h.kind === 'team' ? [h, ...(h.members ?? [])] : [h]))
          return (
            <div
              key={title.id}
              style={{
                background: 'var(--surface)',
                border: '2px solid var(--gold)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Glow */}
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(255,201,51,0.1) 0%, transparent 60%)', pointerEvents: 'none' }} />

              {/* Holder images */}
              <div style={{ position: 'relative', display: 'flex', height: 190, borderBottom: '1px solid rgba(255,201,51,0.25)', background: 'rgba(0,0,0,0.3)' }}>
                {images.map(img => (
                  <Link key={`${img.kind}-${img.id}`} href={holderHref(img)} style={{ flex: 1, minWidth: 0, display: 'block' }} data-hover>
                    {img.render_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img.render_url}
                        alt={img.name}
                        style={{ width: '100%', height: '100%', display: 'block', objectFit: img.kind === 'team' ? 'contain' : 'cover', objectPosition: 'top center', padding: img.kind === 'team' ? '0.75rem' : 0 }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'rgba(255,201,51,0.25)' }}>
                        {img.name.charAt(0)}
                      </div>
                    )}
                  </Link>
                ))}
              </div>

              <div style={{ position: 'relative', zIndex: 1, padding: '1.25rem 1.5rem 0', flex: 1 }}>
                <Link href={titleHref} style={{ textDecoration: 'none' }} data-hover>
                  <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '0.2em', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    ★ {title.name}
                  </p>
                </Link>

                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', textTransform: 'uppercase', lineHeight: 1, marginBottom: '0.75rem' }}>
                  {reign.holders.map((h, i) => (
                    <span key={h.id}>
                      {i > 0 && <span style={{ color: 'var(--text-dim)' }}> &amp; </span>}
                      <Link href={holderHref(h)} style={{ color: 'var(--text-strong)', textDecoration: 'none' }} data-hover>{h.name}</Link>
                    </span>
                  ))}
                </h2>

                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--purple-hot)', lineHeight: 1 }}>
                      {daysSince(reign.won_date)}
                    </p>
                    <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.12em' }}>
                      Days Held
                    </p>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: '0.3rem' }}>
                      Won {formatDate(reign.won_date)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Belt */}
              <Link href={titleHref} style={{ position: 'relative', display: 'block', padding: '1rem 1.5rem 1.25rem' }} data-hover>
                {title.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={title.image_url}
                    alt={title.name}
                    style={{ width: '100%', height: 110, objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 4px 18px rgba(255,201,51,0.35))' }}
                  />
                ) : (
                  <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '0.15em', textAlign: 'center' }}>VIEW TITLE HISTORY →</p>
                )}
              </Link>
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
        {titles.map((title) => {
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
                    if (reign.holders.length === 0) return null
                    const holder = { name: holderNames(reign.holders) }
                    // Link only single-wrestler reigns; teams and co-holders show as text
                    const slug = reign.holders.length === 1 && reign.holders[0].kind === 'wrestler' ? toSlug(holder.name) : null
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
