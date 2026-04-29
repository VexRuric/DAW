'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const BASE_NAV = [
  { href: '/',         label: 'Home' },
  { href: '/roster',   label: 'Roster' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/archive',  label: 'Archive' },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, isFan, isAdmin } = useAuth()

  const navLinks = [
    ...BASE_NAV,
    ...(isFan ? [{ href: '/portal', label: 'My Creations' }] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
    ...(isFan ? [{ href: '/settings', label: 'Settings' }] : []),
  ]

  function handleLogout() {
    logout()
    router.push('/')
  }

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 200,
        background: 'rgba(10,10,12,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2.5rem',
        height: 64,
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', flexShrink: 0, lineHeight: 1, gap: '0.1rem' }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            color: 'var(--purple-hot)',
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          DAW
        </span>
        <span
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: '0.5rem',
            fontWeight: 700,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--text-strong)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          WAREHOUSE
          <span
            style={{
              background: 'var(--accent-red)',
              color: '#fff',
              padding: '1px 4px',
              fontSize: '0.45rem',
              letterSpacing: '0.15em',
            }}
          >
            LIVE
          </span>
        </span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
        {navLinks.map(({ href, label }) => {
          const active =
            href === '/' ? pathname === '/' : pathname?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: 'var(--font-meta)',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                padding: '0.55rem 1rem',
                color: active ? 'var(--text-strong)' : 'var(--text-muted)',
                borderBottom: active ? '2px solid var(--purple-hot)' : '2px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        {user ? (
          <>
            {/* User pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.35rem 0.9rem',
                background: isAdmin ? 'rgba(255,201,51,0.1)' : 'rgba(168,77,255,0.1)',
                border: `1px solid ${isAdmin ? 'var(--gold)' : 'var(--purple)'}`,
              }}
            >
              <span style={{ fontSize: '0.85rem' }}>{isAdmin ? '⚙️' : '👤'}</span>
              <span
                style={{
                  fontFamily: 'var(--font-meta)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: isAdmin ? 'var(--gold)' : 'var(--purple-hot)',
                }}
              >
                {user.name}
              </span>
            </div>
            <button
              onClick={handleLogout}
              style={{
                fontFamily: 'var(--font-meta)',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-dim)',
                padding: '0.4rem 0.8rem',
                cursor: 'none',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-red)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-red)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)'
              }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              style={{
                fontFamily: 'var(--font-meta)',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                color: 'var(--text-muted)',
                padding: '0.4rem 0.8rem',
                border: '1px solid var(--border)',
                transition: 'all 0.15s',
              }}
            >
              Sign In
            </Link>
            <a
              href="https://twitch.tv/daware"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'var(--font-meta)',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                color: '#fff',
                background: 'var(--purple)',
                padding: '0.5rem 1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'background 0.15s',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--accent-red)',
                  display: 'inline-block',
                  animation: 'pulse-dot 1.5s infinite',
                  flexShrink: 0,
                }}
              />
              Watch Live
            </a>
          </>
        )}
      </div>
    </nav>
  )
}
