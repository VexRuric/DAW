'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    ...BASE_NAV,
    ...(isFan    ? [{ href: '/portal',   label: 'My Creations' }] : []),
    ...(isAdmin  ? [{ href: '/admin',    label: 'Admin' }]        : []),
    ...(isFan    ? [{ href: '/settings', label: 'Settings' }]     : []),
  ]

  function handleLogout() {
    logout()
    router.push('/')
    setMenuOpen(false)
  }

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname?.startsWith(href)
  }

  return (
    <>
      <nav
        className="site-nav"
        style={{
          position: 'sticky', top: 0, zIndex: 200,
          background: 'rgba(10,10,12,0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2.5rem',
          height: 64,
        }}
      >
        {/* Logo */}
        <Link href="/" onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', flexShrink: 0, height: 42 }}>
          <Image src="/dawlogo.png" alt="DAW Warehouse Live" height={42} width={160} style={{ objectFit: 'contain', display: 'block' }} priority />
        </Link>

        {/* Desktop nav links */}
        <div className="nav-links-desktop" style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href}
              style={{
                fontFamily: 'var(--font-meta)', fontSize: '0.72rem', fontWeight: 700,
                letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none',
                padding: '0.55rem 1rem', whiteSpace: 'nowrap',
                color: isActive(href) ? 'var(--text-strong)' : 'var(--text-muted)',
                borderBottom: isActive(href) ? '2px solid var(--purple-hot)' : '2px solid transparent',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Desktop right side */}
        <div className="nav-right-desktop" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {user ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.35rem 0.9rem', background: isAdmin ? 'rgba(255,201,51,0.1)' : 'rgba(168,77,255,0.1)', border: `1px solid ${isAdmin ? 'var(--gold)' : 'var(--purple)'}` }}>
                <span style={{ fontSize: '0.85rem' }}>{isAdmin ? '⚙️' : '👤'}</span>
                <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: isAdmin ? 'var(--gold)' : 'var(--purple-hot)' }}>{user.name}</span>
              </div>
              <button onClick={handleLogout}
                style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', padding: '0.4rem 0.8rem', cursor: 'none', transition: 'all 0.15s' }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'var(--accent-red)'; el.style.color = 'var(--accent-red)' }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text-dim)' }}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login"
                style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', color: 'var(--text-muted)', padding: '0.4rem 0.8rem', border: '1px solid var(--border)', transition: 'all 0.15s' }}>
                Sign In
              </Link>
              <a href="https://twitch.tv/daware" target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', color: '#fff', background: 'var(--purple)', padding: '0.5rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.15s' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-red)', display: 'inline-block', animation: 'pulse-dot 1.5s infinite', flexShrink: 0 }} />
                Watch Live
              </a>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="nav-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed', top: 56, left: 0, right: 0, zIndex: 201,
            background: 'rgba(10,10,12,0.98)',
            backdropFilter: 'blur(16px)',
            borderBottom: '2px solid var(--purple)',
            padding: '0.75rem 1.25rem 1.25rem',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Nav links */}
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: 'var(--font-meta)', fontSize: '0.85rem', fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none',
                padding: '0.85rem 0',
                color: isActive(href) ? 'var(--purple-hot)' : 'var(--text-muted)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {label}
            </Link>
          ))}

          {/* Auth row */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {user ? (
              <>
                <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', color: isAdmin ? 'var(--gold)' : 'var(--purple-hot)', letterSpacing: '0.08em', fontWeight: 700, alignSelf: 'center' }}>
                  {isAdmin ? '⚙️' : '👤'} {user.name}
                </span>
                <button onClick={handleLogout}
                  style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', padding: '0.5rem 1rem', cursor: 'pointer' }}>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)}
                  style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', color: 'var(--text-muted)', padding: '0.5rem 1rem', border: '1px solid var(--border)', flex: 1, textAlign: 'center' }}>
                  Sign In
                </Link>
                <a href="https://twitch.tv/daware" target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', color: '#fff', background: 'var(--purple)', padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flex: 1 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-red)', display: 'inline-block', flexShrink: 0 }} />
                  Watch Live
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
