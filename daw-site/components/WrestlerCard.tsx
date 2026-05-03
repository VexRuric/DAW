import Link from 'next/link'

interface WrestlerCardProps {
  id: string
  name: string
  brand?: string | null
  division?: string | null
  role?: string | null
  render_url?: string | null
  wins?: number
  losses?: number
  draws?: number
  win_pct?: number | null
  current_title?: string | null
  titleImageUrl?: string | null
  injured?: boolean
  legend?: boolean
  slug: string
}

export default function WrestlerCard({
  name,
  role,
  render_url,
  wins = 0,
  losses = 0,
  draws = 0,
  current_title,
  titleImageUrl,
  injured,
  legend,
  slug,
}: WrestlerCardProps) {
  const isChampion = !!current_title
  const isLegend   = !!legend
  const isHeel = role === 'Heel'
  const isFace = role === 'Face'

  // Background always reflects alignment — champions keep their Face/Heel color
  const cardBg = isFace
    ? 'rgb(6, 10, 72)'
    : isHeel
    ? 'rgb(72, 6, 10)'
    : 'rgb(12,12,16)'

  // Gradient always uses alignment color
  const gradientOverlay = isFace
    ? 'linear-gradient(to top, rgba(2,4,35,0.98) 0%, rgba(4,8,55,0.55) 30%, rgba(5,10,65,0.10) 55%, transparent 75%)'
    : isHeel
    ? 'linear-gradient(to top, rgba(35,2,4,0.98) 0%, rgba(65,4,8,0.55) 30%, rgba(80,5,10,0.10) 55%, transparent 75%)'
    : 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.25) 30%, transparent 55%)'

  // Face/Heel alignment takes priority; champion fallback = gold; legend fallback = silver
  const textAccent = isFace
    ? 'rgba(80,130,255,0.9)'
    : isHeel
    ? 'var(--accent-red)'
    : isChampion
    ? 'var(--gold)'
    : isLegend
    ? 'rgba(192,192,210,0.85)'
    : 'var(--purple-hot)'

  // Champion = gold border; legend only = silver border
  const cardBorder = isChampion
    ? 'rgba(255,201,51,0.5)'
    : isLegend
    ? 'rgba(192,192,210,0.5)'
    : 'var(--border)'

  return (
    <Link
      href={`/roster/${slug}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        position: 'relative',
        aspectRatio: '3/4',
        overflow: 'hidden',
        border: `1px solid ${cardBorder}`,
        background: cardBg,
      }}
    >
      {/* Portrait — 140% height shows upper body; no overlay on image so render pops */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {render_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={render_url}
            alt={name}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '140%',
              objectFit: 'cover',
              objectPosition: 'top center',
              display: 'block',
            }}
          />
        ) : (
          <SilhouettePlaceholder />
        )}
      </div>

      {/* Bottom gradient for text readability only — stays out of upper body zone */}
      <div style={{ position: 'absolute', inset: 0, background: gradientOverlay }} />

      {/* Champion top badge — shows belt image + title name */}
      {isChampion && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2,
          background: 'var(--gold)', color: 'var(--bg-top)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.3rem',
          fontFamily: 'var(--font-meta)', fontSize: '0.5rem', fontWeight: 700,
          letterSpacing: '0.12em', padding: '0.28rem 0.5rem',
          textTransform: 'uppercase', lineHeight: 1.3,
        }}>
          {titleImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={titleImageUrl}
              alt=""
              style={{ height: 20, maxWidth: 46, objectFit: 'contain', display: 'block', flexShrink: 0 }}
            />
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current_title}</span>
        </div>
      )}

      {/* Legend banner — silver */}
      {isLegend && (
        <div style={{
          position: 'absolute',
          top: isChampion ? '1.55rem' : 0,
          left: 0, right: 0, zIndex: 2,
          background: isChampion
            ? 'rgba(18,18,22,0.88)'
            : 'linear-gradient(90deg, rgba(18,18,22,0.92) 0%, rgba(30,30,36,0.92) 100%)',
          borderBottom: `1px solid rgba(192,192,210,${isChampion ? '0.3' : '0.5'})`,
          color: 'rgba(210,210,225,0.95)',
          fontFamily: 'var(--font-meta)', fontSize: '0.48rem', fontWeight: 700,
          letterSpacing: '0.22em', padding: '0.25rem 0.5rem',
          textAlign: 'center', textTransform: 'uppercase',
        }}>
          ★ LEGEND
        </div>
      )}

      {/* Injured badge */}
      {injured && (
        <div style={{
          position: 'absolute',
          top: isChampion && isLegend ? '3.1rem' : isChampion || isLegend ? '1.6rem' : '0.5rem',
          right: '0.5rem', zIndex: 3,
          background: 'var(--accent-red)', color: 'white',
          fontFamily: 'var(--font-meta)', fontSize: '0.48rem', fontWeight: 700,
          letterSpacing: '0.1em', padding: '2px 6px',
        }}>
          INJURED
        </div>
      )}

      {/* Bottom info */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2rem 0.85rem 0.85rem', zIndex: 2 }}>
        <div style={{ borderLeft: `2px solid ${textAccent}`, paddingLeft: '0.6rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'white', textTransform: 'uppercase', lineHeight: 1, marginBottom: '0.35rem' }}>
            {name}
          </p>
          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', letterSpacing: '0.06em' }}>
            <span style={{ color: '#00c864', fontWeight: 700 }}>{wins}W</span>
            <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 4px' }}>·</span>
            <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>{losses}L</span>
            <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 4px' }}>·</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>{draws}D</span>
          </p>
        </div>
      </div>
    </Link>
  )
}

function SilhouettePlaceholder() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg, var(--surface-2) 0%, var(--surface-3) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 100 140" style={{ width: '55%', height: '55%', opacity: 0.1 }} fill="white">
        <ellipse cx="50" cy="22" rx="16" ry="18" />
        <path d="M20 140 Q25 90 50 80 Q75 90 80 140Z" />
        <path d="M50 80 Q30 85 18 110 L30 115 Q38 95 50 90Z" />
        <path d="M50 80 Q70 85 82 110 L70 115 Q62 95 50 90Z" />
      </svg>
    </div>
  )
}
