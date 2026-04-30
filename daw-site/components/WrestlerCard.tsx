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
  injured,
  legend,
  slug,
}: WrestlerCardProps) {
  const isChampion = !!current_title
  const isLegend   = !!legend
  const isHeel = role === 'Heel'
  const isFace = role === 'Face'

  // Champions stay neutral; Face=dark navy, Heel=dark crimson
  const cardBg = isChampion
    ? 'var(--surface-2)'
    : isFace
    ? 'rgba(3, 6, 45, 0.88)'
    : isHeel
    ? 'rgba(45, 2, 6, 0.88)'
    : 'var(--surface-2)'

  // Bottom gradient tinted by alignment (champions stay dark neutral)
  const gradientOverlay = !isChampion && isFace
    ? 'linear-gradient(to top, rgba(2,5,38,0.98) 0%, rgba(6,14,80,0.65) 40%, rgba(10,20,100,0.12) 70%, transparent 100%)'
    : !isChampion && isHeel
    ? 'linear-gradient(to top, rgba(38,2,5,0.98) 0%, rgba(90,5,12,0.65) 40%, rgba(130,8,18,0.12) 70%, transparent 100%)'
    : 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.35) 45%, transparent 70%)'

  const textAccent = isChampion
    ? 'var(--gold)'
    : isLegend
    ? 'rgba(255,201,51,0.8)'
    : isFace
    ? 'rgba(80,130,255,0.9)'
    : isHeel
    ? 'var(--accent-red)'
    : 'var(--purple-hot)'

  // Champions get gold border; Legends get gold border; others get default
  const cardBorder = (isChampion || isLegend)
    ? 'rgba(255,201,51,0.45)'
    : 'var(--border)'

  return (
    <Link
      href={`/roster/${slug}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        position: 'relative',
        aspectRatio: '2/3',
        overflow: 'hidden',
        border: `1px solid ${cardBorder}`,
        background: cardBg,
      }}
    >
      {/* Portrait — 140% height zooms into upper body */}
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

      {/* Gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: gradientOverlay,
        }}
      />

      {/* Champion top badge */}
      {isChampion && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2,
            background: 'var(--gold)',
            color: 'var(--bg-top)',
            fontFamily: 'var(--font-meta)',
            fontSize: '0.52rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            padding: '0.3rem 0.5rem',
            textAlign: 'center',
            textTransform: 'uppercase',
            lineHeight: 1.3,
          }}
        >
          {current_title}
        </div>
      )}

      {/* Legend banner — shown below champion badge or at top if no title */}
      {isLegend && (
        <div
          style={{
            position: 'absolute',
            top: isChampion ? '1.55rem' : 0,
            left: 0,
            right: 0,
            zIndex: 2,
            background: isChampion
              ? 'rgba(0,0,0,0.65)'
              : 'linear-gradient(90deg, rgba(30,20,0,0.9) 0%, rgba(50,35,0,0.9) 100%)',
            borderBottom: `1px solid rgba(255,201,51,${isChampion ? '0.3' : '0.5'})`,
            color: 'rgba(255,201,51,0.9)',
            fontFamily: 'var(--font-meta)',
            fontSize: '0.48rem',
            fontWeight: 700,
            letterSpacing: '0.22em',
            padding: '0.25rem 0.5rem',
            textAlign: 'center',
            textTransform: 'uppercase',
          }}
        >
          ★ LEGEND
        </div>
      )}

      {/* Injured badge */}
      {injured && (
        <div
          style={{
            position: 'absolute',
            top: isChampion && isLegend ? '3.1rem' : isChampion || isLegend ? '1.6rem' : '0.5rem',
            right: '0.5rem',
            zIndex: 3,
            background: 'var(--accent-red)',
            color: 'white',
            fontFamily: 'var(--font-meta)',
            fontSize: '0.48rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            padding: '2px 6px',
          }}
        >
          INJURED
        </div>
      )}

      {/* Bottom info */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '2.5rem 0.85rem 0.9rem',
          zIndex: 2,
        }}
      >
        <div style={{ borderLeft: `2px solid ${textAccent}`, paddingLeft: '0.6rem' }}>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              color: 'white',
              textTransform: 'uppercase',
              lineHeight: 1,
              marginBottom: '0.4rem',
            }}
          >
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
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(160deg, var(--surface-2) 0%, var(--surface-3) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg viewBox="0 0 100 140" style={{ width: '55%', height: '55%', opacity: 0.1 }} fill="white">
        <ellipse cx="50" cy="22" rx="16" ry="18" />
        <path d="M20 140 Q25 90 50 80 Q75 90 80 140Z" />
        <path d="M50 80 Q30 85 18 110 L30 115 Q38 95 50 90Z" />
        <path d="M50 80 Q70 85 82 110 L70 115 Q62 95 50 90Z" />
      </svg>
    </div>
  )
}
