export default function HomeCommunityStrip() {
  return (
    <section style={{ padding: '4rem 3rem', borderTop: '1px solid var(--border)' }}>
      <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.75rem', color: 'var(--text-strong)', letterSpacing: '0.01em', textTransform: 'uppercase', lineHeight: 1 }}>
          Join The Community
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        <a
          href="https://twitch.tv/daware"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '2rem', background: 'var(--surface)', border: '1px solid var(--border)',
            textDecoration: 'none', color: 'inherit',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
            transition: 'all .2s',
          }}
        >
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--purple-hot)', fontWeight: 700, textTransform: 'uppercase' }}>
            Twitch
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>
            Watch Live
          </span>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Live every Thursday at 9PM ET. Subscribe on Twitch for exclusive content and alerts.
          </p>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--purple-hot)', marginTop: '1rem', letterSpacing: '0.1em' }}>
            twitch.tv/daware →
          </span>
        </a>

        <a
          href="#"
          style={{
            padding: '2rem', background: 'var(--surface)', border: '1px solid var(--border)',
            textDecoration: 'none', color: 'inherit',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
            transition: 'all .2s',
          }}
        >
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--purple-hot)', fontWeight: 700, textTransform: 'uppercase' }}>
            Discord
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>
            The Locker Room
          </span>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Discuss shows, vote on match outcomes, and connect with the DAW universe.
          </p>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--purple-hot)', marginTop: '1rem', letterSpacing: '0.1em' }}>
            Join Discord →
          </span>
        </a>

        <a
          href="https://x.com/DAWarehouseLive"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '2rem', background: 'var(--surface)', border: '1px solid var(--border)',
            textDecoration: 'none', color: 'inherit',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
            transition: 'all .2s',
          }}
        >
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', letterSpacing: '0.2em', color: 'var(--purple-hot)', fontWeight: 700, textTransform: 'uppercase' }}>
            Twitter / X
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>
            Follow The Story
          </span>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Real-time results, announcements, and behind-the-scenes from DAW Warehouse LIVE.
          </p>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--purple-hot)', marginTop: '1rem', letterSpacing: '0.1em' }}>
            @DAWarehouseLive →
          </span>
        </a>
      </div>
    </section>
  )
}
