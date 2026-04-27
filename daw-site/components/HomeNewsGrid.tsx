import Link from 'next/link'

export interface NewsCard {
  id: string
  hashtag: 'ANDNEW' | 'ANDSTILL' | 'WINNER'
  date: string
  title: string
  excerpt: string
  href: string
  image_url: string | null
}

const HASHTAG_BG: Record<NewsCard['hashtag'], string> = {
  ANDNEW:   'var(--accent-red)',
  ANDSTILL: 'var(--gold)',
  WINNER:   'var(--purple)',
}

const HASHTAG_FG: Record<NewsCard['hashtag'], string> = {
  ANDNEW:   'var(--text-strong)',
  ANDSTILL: 'var(--bg-top)',
  WINNER:   'var(--text-strong)',
}

export default function HomeNewsGrid({ cards }: { cards: NewsCard[] }) {
  if (cards.length === 0) return null

  return (
    <section style={{ padding: '4rem 3rem', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.75rem', color: 'var(--text-strong)', letterSpacing: '0.01em', textTransform: 'uppercase', lineHeight: 1 }}>
          News &amp; Match Reports
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              textDecoration: 'none',
              color: 'inherit',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transition: 'border-color .2s, transform .2s',
            }}
          >
            <div style={{ aspectRatio: '16 / 9', position: 'relative', overflow: 'hidden', background: 'var(--surface-2)' }}>
              {card.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.image_url} alt={card.title} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 40%, rgba(128,0,218,0.3) 0%, #111116 100%)' }} />
              )}
              <span style={{
                position: 'absolute', top: '0.75rem', left: '0.75rem',
                fontFamily: 'var(--font-display)', fontSize: '1.1rem',
                padding: '0.25rem 0.6rem', letterSpacing: '0.02em',
                background: HASHTAG_BG[card.hashtag],
                color: HASHTAG_FG[card.hashtag],
                zIndex: 2,
              }}>
                #{card.hashtag}
              </span>
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
                {card.date}
              </span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', lineHeight: 1.05, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>
                {card.title}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 'auto', paddingTop: '0.5rem' }}>
                {card.excerpt}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
