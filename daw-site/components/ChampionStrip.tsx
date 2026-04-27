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
  const titleSlug = toSlug(champion.title_name)
  const wrestlerSlug = champion.holder_wrestler_id ? toSlug(champion.holder_name) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Card links to title history page */}
      <Link href={`/titles/${titleSlug}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div
          style={{
            aspectRatio: '3/4',
            position: 'relative',
            border: '1px solid var(--gold)',
            overflow: 'hidden',
            background: 'var(--surface-2)',
          }}
        >
          {/* Belt name header */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 2,
              background: 'var(--gold)',
              color: 'var(--bg-top)',
              fontFamily: 'var(--font-display)',
              fontSize: '0.58rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              padding: '0.3rem 0.5rem',
              lineHeight: 1.3,
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            {champion.title_name}
          </div>

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

          {/* Gradient overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.2) 55%, transparent 75%)',
            }}
          />

          {/* Bottom info */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '2rem 0.75rem 0.75rem',
              zIndex: 3,
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.95rem',
                color: 'white',
                textTransform: 'uppercase',
                lineHeight: 1,
                marginBottom: '0.25rem',
              }}
            >
              {champion.holder_name}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-meta)',
                fontSize: '0.52rem',
                color: 'var(--gold)',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              {champion.days_held} DAYS
            </p>
          </div>
        </div>
      </Link>

      {/* Wrestler link below card */}
      {wrestlerSlug && (
        <Link
          href={`/roster/${wrestlerSlug}`}
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '0.35rem 0.5rem',
            background: 'rgba(255,201,51,0.08)',
            border: '1px solid rgba(255,201,51,0.2)',
            borderTop: 'none',
            fontFamily: 'var(--font-meta)',
            fontSize: '0.52rem',
            color: 'var(--text-dim)',
            letterSpacing: '0.12em',
            textDecoration: 'none',
            textTransform: 'uppercase',
            transition: 'color 0.15s',
          }}
        >
          View Profile →
        </Link>
      )}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 40, height: 2, background: 'var(--gold)' }} />
        <span
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.3em',
            color: 'var(--gold)',
            textTransform: 'uppercase',
          }}
        >
          ★ Current Champions
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,201,51,0.2)' }} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(140px, 1fr))`,
          gap: '0.85rem',
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
