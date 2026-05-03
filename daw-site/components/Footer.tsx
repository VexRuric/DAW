import Link from 'next/link'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{
      padding: 'clamp(1.5rem, 4vw, 3rem) clamp(1.25rem, 4vw, 3rem)',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-top)',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 420 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-strong)', lineHeight: 1 }}>
          <span style={{ color: 'var(--purple-hot)' }}>DAW</span> WAREHOUSE
          <span style={{
            background: 'var(--accent-red)', color: 'white',
            fontFamily: 'var(--font-meta)', fontSize: '0.5rem',
            padding: '0.15rem 0.35rem', letterSpacing: '0.15em',
            marginLeft: '0.5rem', verticalAlign: 'middle',
          }}>
            LIVE
          </span>
        </div>
        <p style={{
          fontFamily: 'var(--font-meta)', fontSize: '0.72rem',
          color: 'var(--text-muted)', letterSpacing: '0.12em', lineHeight: 1.7,
        }}>
          A community-built wrestling federation. Real matches, real stats, real champions.
          All results recorded live on Twitch.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { href: 'https://twitch.tv/daware', label: 'Twitch' },
            { href: 'https://twitter.com/DAWarehouseLive', label: 'Twitter/X' },
            { href: 'https://discord.gg/daw', label: 'Discord' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'var(--font-meta)', fontSize: '0.65rem',
                color: 'var(--text-dim)', textDecoration: 'none',
                letterSpacing: '0.15em', textTransform: 'uppercase',
                fontWeight: 700, transition: 'color 0.2s',
                padding: '0.3rem 0.6rem', border: '1px solid var(--border)',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        paddingTop: '2rem', marginTop: '2rem',
        borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '0.5rem',
        fontFamily: 'var(--font-meta)', fontSize: '0.65rem',
        color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase',
      }}>
        <span>© {year} DAW Warehouse LIVE. All rights reserved.</span>
        <span>Built by Jake · Powered by Supabase + Next.js</span>
      </div>
    </footer>
  )
}
