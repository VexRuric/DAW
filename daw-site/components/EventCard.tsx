import { Show } from '@/lib/types'

interface EventCardProps {
  show: Show
  compact?: boolean
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase()
}

export default function EventCard({ show, compact = false }: EventCardProps) {
  const isPPV = show.show_type === 'ppv'
  const title = show.ppv_name ?? show.name

  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.85rem 1rem',
          background: 'var(--surface)',
          border: isPPV ? '1px solid var(--gold)' : '1px solid var(--border)',
          transition: 'border-color 0.2s',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            lineHeight: 1,
            color: isPPV ? 'var(--gold)' : 'var(--purple-hot)',
            minWidth: 40,
            textAlign: 'center',
          }}
        >
          {new Date(show.show_date + 'T00:00:00').getDate()}
        </div>
        <div>
          <p
            style={{
              fontFamily: 'var(--font-meta)',
              fontSize: '0.6rem',
              color: isPPV ? 'var(--gold)' : 'var(--purple-hot)',
              letterSpacing: '0.15em',
              fontWeight: 700,
              marginBottom: '0.2rem',
            }}
          >
            {isPPV ? '★ PPV' : 'WEEKLY'}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              color: 'var(--text-strong)',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            {title}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-meta)',
              fontSize: '0.6rem',
              color: 'var(--text-dim)',
              marginTop: '0.15rem',
              letterSpacing: '0.1em',
            }}
          >
            {formatEventDate(show.show_date)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        flex: '0 0 280px',
        background: 'var(--surface)',
        border: isPPV ? '2px solid var(--gold)' : '1px solid var(--border)',
        scrollSnapAlign: 'start',
        transition: 'border-color 0.2s, transform 0.2s',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Image placeholder */}
      <div
        style={{
          aspectRatio: '4/5',
          background: isPPV
            ? 'linear-gradient(135deg, #1a0a35 0%, #000 100%)'
            : 'linear-gradient(135deg, var(--surface-2) 0%, var(--surface-3) 100%)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isPPV
              ? 'radial-gradient(ellipse at 50% 40%, rgba(255,201,51,0.25) 0%, transparent 60%)'
              : 'radial-gradient(ellipse at 50% 40%, rgba(128,0,218,0.2) 0%, transparent 60%)',
          }}
        />

        {/* Badge */}
        <span
          style={{
            position: 'absolute',
            top: '0.75rem',
            left: '0.75rem',
            fontFamily: 'var(--font-meta)',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            padding: '0.3rem 0.6rem',
            background: isPPV ? 'var(--gold)' : 'var(--purple)',
            color: isPPV ? 'var(--bg-top)' : '#fff',
            fontWeight: 700,
            zIndex: 2,
            textTransform: 'uppercase',
          }}
        >
          {isPPV ? '★ PPV' : 'Weekly'}
        </span>

        {/* Bottom gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.2) 50%, transparent)',
            pointerEvents: 'none',
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '1.25rem',
            zIndex: 2,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-meta)',
              fontSize: '0.72rem',
              color: isPPV ? 'var(--gold)' : 'var(--purple-hot)',
              letterSpacing: '0.2em',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '0.4rem',
            }}
          >
            {formatEventDate(show.show_date)}
          </p>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.75rem',
              lineHeight: 0.95,
              color: 'var(--text-strong)',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
            }}
          >
            {title}
          </h3>
        </div>
      </div>
    </div>
  )
}
