import Link from 'next/link'
import { CurrentChampion } from '@/lib/types'

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function SilhouetteSVG() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, rgba(255,201,51,0.05) 0%, var(--surface-3) 100%)',
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

interface ChampionCardProps {
  champion: CurrentChampion
  renderUrl?: string | null
}

function ChampionCard({ champion, renderUrl }: ChampionCardProps) {
  const titleSlug    = toSlug(champion.title_name)
  const wrestlerSlug = champion.holder_wrestler_id ? toSlug(champion.holder_name) : null

  return (
    <div style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden', background: 'var(--surface-2)' }}>

      {/* Portrait */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {renderUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={renderUrl}
            alt={champion.holder_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          />
        ) : (
          <SilhouetteSVG />
        )}
      </div>

      {/* Bottom gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.5) 40%, transparent 68%)',
        }}
      />

      {/* Full-card title link — z-index 1, covered by name link above */}
      <Link
        href={`/titles/${titleSlug}`}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        aria-label={`${champion.title_name} history`}
      />

      {/* Bottom text — z-index 2 so wrestler name link sits above the card link */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '1.75rem 0.8rem 0.85rem',
          zIndex: 2,
        }}
      >
        <div style={{ borderLeft: '2px solid var(--gold)', paddingLeft: '0.55rem' }}>
          {wrestlerSlug ? (
            <Link
              href={`/roster/${wrestlerSlug}`}
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1rem',
                  color: 'white',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  marginBottom: '0.3rem',
                  transition: 'color 0.15s',
                }}
              >
                {champion.holder_name}
              </p>
            </Link>
          ) : (
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                color: 'white',
                textTransform: 'uppercase',
                lineHeight: 1,
                marginBottom: '0.3rem',
              }}
            >
              {champion.holder_name}
            </p>
          )}
          <p
            style={{
              fontFamily: 'var(--font-meta)',
              fontSize: '0.5rem',
              color: 'var(--gold)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              lineHeight: 1.3,
            }}
          >
            {champion.title_name}
          </p>
        </div>
      </div>

      {/* Days held badge */}
      <div
        style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          zIndex: 2,
          background: 'rgba(0,0,0,0.75)',
          border: '1px solid rgba(255,201,51,0.35)',
          padding: '2px 6px',
          fontFamily: 'var(--font-meta)',
          fontSize: '0.48rem',
          color: 'var(--gold)',
          letterSpacing: '0.1em',
          fontWeight: 700,
        }}
      >
        {champion.days_held}d
      </div>
    </div>
  )
}

export default function ChampionStrip({
  champions,
  renderMap,
}: {
  champions: CurrentChampion[]
  renderMap?: Map<string, string | null>
}) {
  if (!champions || champions.length === 0) return null

  return (
    <div className="champion-strip">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <span
          style={{
            display: 'inline-block',
            background: 'var(--gold)',
            color: 'var(--bg-top)',
            fontFamily: 'var(--font-display)',
            fontSize: '0.85rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            padding: '0.25rem 0.85rem',
            textTransform: 'uppercase',
            lineHeight: 1.4,
          }}
        >
          Champions
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,201,51,0.25)' }} />
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
          gap: '0.6rem',
        }}
      >
        {champions.map((champ) => (
          <ChampionCard
            key={champ.title_id}
            champion={champ}
            renderUrl={champ.holder_wrestler_id ? (renderMap?.get(champ.holder_wrestler_id) ?? null) : null}
          />
        ))}
      </div>
    </div>
  )
}
