import Link from 'next/link'
import { CurrentChampion } from '@/lib/types'

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function SilhouetteSVG() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(255,201,51,0.05) 0%, var(--surface-3) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
  titleImageUrl?: string | null
}

function ChampionCard({ champion, renderUrl, titleImageUrl }: ChampionCardProps) {
  const titleSlug    = toSlug(champion.title_name)
  const wrestlerSlug = champion.holder_wrestler_id ? toSlug(champion.holder_name) : null

  return (
    <div style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden', background: 'rgb(8,6,2)', border: '1px solid rgba(255,201,51,0.4)' }}>

      {/* Wrestler render — dim texture behind everything */}
      {renderUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={renderUrl}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '130%', objectFit: 'cover', objectPosition: 'top center', opacity: 0.22, filter: 'saturate(0.25) brightness(0.55)' }}
        />
      )}

      {/* Dark gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0.97) 100%)' }} />

      {/* Belt image — centrepiece */}
      <div style={{ position: 'absolute', top: '10%', left: '8%', right: '8%', height: '48%', overflow: 'hidden', zIndex: 2 }}>
        {titleImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={titleImageUrl}
            alt={champion.title_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'drop-shadow(0 4px 20px rgba(255,201,51,0.45))' }}
          />
        ) : (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'rgba(255,201,51,0.35)', lineHeight: 1 }}>★</span>
        )}
      </div>

      {/* Gold divider */}
      <div style={{ position: 'absolute', top: '61%', left: '6%', right: '6%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,201,51,0.5), transparent)', zIndex: 2 }} />

      {/* Bottom info */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.1rem 0.75rem 0.85rem', zIndex: 3 }}>
        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.44rem', color: 'var(--gold)', letterSpacing: '0.22em', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem', opacity: 0.85 }}>
          ★ Current Champion
        </p>
        {wrestlerSlug ? (
          <Link href={`/roster/${wrestlerSlug}`} style={{ textDecoration: 'none', display: 'block' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.98rem', color: 'white', textTransform: 'uppercase', lineHeight: 1, marginBottom: '0.28rem' }}>
              {champion.holder_name}
            </p>
          </Link>
        ) : (
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.98rem', color: 'white', textTransform: 'uppercase', lineHeight: 1, marginBottom: '0.28rem' }}>
            {champion.holder_name}
          </p>
        )}
        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.48rem', color: 'rgba(255,201,51,0.75)', letterSpacing: '0.1em', lineHeight: 1.3, textTransform: 'uppercase' }}>
          {champion.title_name}
        </p>
      </div>

      {/* Days held badge */}
      <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 4, background: 'rgba(0,0,0,0.82)', border: '1px solid rgba(255,201,51,0.35)', padding: '2px 6px', fontFamily: 'var(--font-meta)', fontSize: '0.46rem', color: 'var(--gold)', letterSpacing: '0.1em', fontWeight: 700 }}>
        {champion.days_held}d
      </div>

      {/* Full-card link to title history page */}
      <Link
        href={`/titles/${titleSlug}`}
        style={{ position: 'absolute', inset: 0, zIndex: 5 }}
        aria-label={`${champion.title_name} title history`}
      />
    </div>
  )
}

export default function ChampionStrip({
  champions,
  renderMap,
  titleImageById,
}: {
  champions: CurrentChampion[]
  renderMap?: Map<string, string | null>
  titleImageById?: Map<string, string | null>
}) {
  if (!champions || champions.length === 0) return null

  return (
    <div className="champion-strip">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <span style={{ display: 'inline-block', background: 'var(--gold)', color: 'var(--bg-top)', fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.12em', padding: '0.25rem 0.85rem', textTransform: 'uppercase', lineHeight: 1.4 }}>
          Champions
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,201,51,0.25)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '0.6rem' }}>
        {champions.map((champ) => (
          <ChampionCard
            key={champ.title_id}
            champion={champ}
            renderUrl={champ.holder_wrestler_id ? (renderMap?.get(champ.holder_wrestler_id) ?? null) : null}
            titleImageUrl={titleImageById?.get(champ.title_id) ?? null}
          />
        ))}
      </div>
    </div>
  )
}
