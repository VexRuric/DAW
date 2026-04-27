import { CurrentChampion } from '@/lib/types'
import Link from 'next/link'

interface ChampionsBannerProps {
  champions: CurrentChampion[]
}

function daysLabel(days: number) {
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}

export default function ChampionsBanner({ champions }: ChampionsBannerProps) {
  if (!champions.length) return null

  return (
    <section
      style={{
        background: 'linear-gradient(90deg, rgba(74,0,128,0.3) 0%, rgba(0,0,0,0) 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '0 3rem',
        overflowX: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 0,
          minWidth: 'max-content',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            color: 'var(--gold)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            paddingRight: '1.5rem',
            borderRight: '1px solid var(--border)',
            marginRight: '1.5rem',
            whiteSpace: 'nowrap',
          }}
        >
          ★ CURRENT CHAMPIONS
        </div>

        {champions.map((champ) => {
          const slug = champ.holder_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
          return (
            <Link
              key={champ.title_id}
              href={champ.holder_wrestler_id ? `/roster/${slug}` : '#'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1.5rem',
                borderRight: '1px solid var(--border)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background 0.2s',
                whiteSpace: 'nowrap',
              }}
              data-hover
            >
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-meta)',
                    fontSize: '0.6rem',
                    letterSpacing: '0.15em',
                    color: 'var(--gold)',
                    fontWeight: 700,
                    marginBottom: '0.15rem',
                  }}
                >
                  {champ.title_name}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1rem',
                    color: 'var(--text-strong)',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                  }}
                >
                  {champ.holder_name}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-meta)',
                    fontSize: '0.58rem',
                    color: 'var(--text-dim)',
                    letterSpacing: '0.1em',
                    marginTop: '0.15rem',
                  }}
                >
                  {daysLabel(champ.days_held)} reign
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
