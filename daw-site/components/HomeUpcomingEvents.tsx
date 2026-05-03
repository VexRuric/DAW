import Link from 'next/link'

export interface EventItem {
  id: string
  name: string
  show_date: string
  show_type: string
  href: string
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.toLocaleDateString('en-US', { weekday: 'short' })
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const date = d.getDate()
  const year = d.getFullYear()
  return `${day} · ${month} ${date}, ${year}`
}

export default function HomeUpcomingEvents({ events }: { events: EventItem[] }) {
  if (events.length === 0) return null

  return (
    <section className="home-section" style={{ borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 5vw, 2.75rem)', color: 'var(--text-strong)', letterSpacing: '0.01em', textTransform: 'uppercase', lineHeight: 1 }}>
          Upcoming Events
        </h2>
        <Link href="/schedule" style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
          Full Schedule →
        </Link>
      </div>

      <div style={{
        display: 'flex',
        gap: '1rem',
        overflowX: 'auto',
        paddingBottom: '0.75rem',
        scrollSnapType: 'x mandatory',
        scrollbarColor: 'var(--purple) var(--surface)',
        scrollbarWidth: 'thin',
      }}>
        {events.map((event) => {
          const isPPV = event.show_type === 'ppv'
          return (
            <Link
              key={event.id}
              href={event.href}
              style={{
                flex: '0 0 280px',
                background: 'var(--surface)',
                border: isPPV ? '2px solid var(--gold)' : '1px solid var(--border)',
                textDecoration: 'none',
                color: 'inherit',
                scrollSnapAlign: 'start',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'border-color .2s, transform .2s',
              }}
            >
              <div style={{ aspectRatio: '4 / 5', background: 'var(--surface-2)', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: isPPV
                    ? 'radial-gradient(ellipse at 50% 25%, rgba(217,70,239,0.5) 0%, #0a0318 100%)'
                    : 'radial-gradient(ellipse at 50% 40%, rgba(128,0,218,0.3) 0%, #111116 100%)',
                }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.2) 50%, transparent)', pointerEvents: 'none' }} />

                <span style={{
                  position: 'absolute', top: '0.75rem', left: '0.75rem',
                  fontFamily: 'var(--font-meta)', fontSize: '0.65rem',
                  letterSpacing: '0.2em', padding: '0.3rem 0.6rem',
                  background: isPPV ? 'var(--gold)' : 'var(--purple)',
                  color: isPPV ? 'var(--bg-top)' : 'var(--text-strong)',
                  fontWeight: 700, zIndex: 2, textTransform: 'uppercase',
                }}>
                  {isPPV ? 'Pay-Per-View' : 'Weekly'}
                </span>

                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.25rem', zIndex: 2 }}>
                  <div style={{
                    fontFamily: 'var(--font-meta)', fontSize: '0.72rem',
                    color: isPPV ? 'var(--gold)' : 'var(--purple-hot)',
                    letterSpacing: '0.2em', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem',
                  }}>
                    {formatEventDate(event.show_date)}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', lineHeight: 0.95, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                    {event.name}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
