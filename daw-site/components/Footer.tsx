import Link from 'next/link'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer
      style={{
        padding: '3rem',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-top)',
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr',
        gap: '2rem',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            color: 'var(--text-strong)',
            lineHeight: 1,
          }}
        >
          <span style={{ color: 'var(--purple-hot)' }}>DAW</span> WAREHOUSE
          <span
            style={{
              background: 'var(--accent-red)',
              color: 'white',
              fontFamily: 'var(--font-meta)',
              fontSize: '0.5rem',
              padding: '0.15rem 0.35rem',
              letterSpacing: '0.15em',
              marginLeft: '0.5rem',
              verticalAlign: 'middle',
            }}
          >
            LIVE
          </span>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.12em',
            lineHeight: 1.7,
            maxWidth: 320,
          }}
        >
          A community-built wrestling federation. Real matches, real stats, real champions.
          All results recorded live on Twitch.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
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
                fontFamily: 'var(--font-meta)',
                fontSize: '0.65rem',
                color: 'var(--text-dim)',
                textDecoration: 'none',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontWeight: 700,
                transition: 'color 0.2s',
                padding: '0.3rem 0.6rem',
                border: '1px solid var(--border)',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Site */}
      <FooterCol
        title="Site"
        links={[
          { href: '/', label: 'Home' },
          { href: '/roster', label: 'Roster' },
          { href: '/titles', label: 'Championships' },
          { href: '/schedule', label: 'Schedule' },
          { href: '/archive', label: 'Match Archive' },
        ]}
      />

      {/* Community */}
      <FooterCol
        title="Community"
        links={[
          { href: 'https://twitch.tv/daware', label: 'Watch Live' },
          { href: 'https://discord.gg/daw', label: 'Discord' },
          { href: '/portal', label: 'Fan Portal' },
        ]}
      />

      {/* Info */}
      <FooterCol
        title="Info"
        links={[
          { href: '/admin', label: 'Admin' },
          { href: '/settings', label: 'Settings' },
        ]}
      />

      {/* Bottom bar */}
      <div
        style={{
          gridColumn: '1 / -1',
          paddingTop: '2rem',
          marginTop: '1rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          fontFamily: 'var(--font-meta)',
          fontSize: '0.7rem',
          color: 'var(--text-dim)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}
      >
        <span>© {year} DAW Warehouse LIVE. All rights reserved.</span>
        <span>Built by Jake · Powered by Supabase + Next.js</span>
      </div>
    </footer>
  )
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.1rem',
          color: 'var(--text-strong)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.75rem',
        }}
      >
        {title}
      </p>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              style={{
                fontFamily: 'var(--font-meta)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 700,
                transition: 'color 0.2s',
              }}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
