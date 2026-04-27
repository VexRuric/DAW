'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [emailExpanded, setEmailExpanded] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function demoLogin(role: 'fan' | 'admin') {
    login(role)
    router.push('/')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
      }}
    >
      {/* ── LEFT: Brand Pitch ─────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--purple-deep) 0%, #0a000f 100%)',
          padding: '5rem 4rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '-10%',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(128,0,218,0.3) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        <Link
          href="/"
          style={{ textDecoration: 'none', marginBottom: '3rem', display: 'inline-block' }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '3.5rem',
              color: 'var(--text-strong)',
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}
          >
            DAW{' '}
            <span style={{ color: 'var(--purple-hot)' }}>WAREHOUSE</span>
            <sup
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-meta)',
                color: '#fff',
                background: 'var(--accent-red)',
                padding: '2px 6px',
                marginLeft: '0.4rem',
                verticalAlign: 'middle',
                letterSpacing: '0.15em',
              }}
            >
              LIVE
            </sup>
          </span>
        </Link>

        <p
          style={{
            fontSize: '1.15rem',
            color: 'var(--text-muted)',
            marginBottom: '3rem',
            lineHeight: 1.7,
            maxWidth: 420,
            position: 'relative',
          }}
        >
          The only wrestling federation where{' '}
          <em style={{ color: 'var(--text-strong)', fontStyle: 'normal' }}>you</em> are the star.
          Stream live on Twitch, track every win, and build your legacy.
        </p>

        {/* Feature list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem',
            position: 'relative',
          }}
        >
          {[
            { icon: '📡', text: 'Watch every match live on Twitch' },
            { icon: '🎮', text: 'AI vs AI — pure strategy, zero skill gap' },
            { icon: '🏆', text: 'Compete for 7 championships' },
            { icon: '⚡', text: 'Real stats, real title histories, real rivalries' },
            { icon: '🎭', text: 'Build your wrestler, join a faction, shape your story' },
          ].map(({ icon, text }) => (
            <div
              key={text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{icon}</span>
              <span
                style={{
                  fontFamily: 'var(--font-meta)',
                  fontSize: '0.75rem',
                  color: 'var(--text-strong)',
                  letterSpacing: '0.1em',
                }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* Twitch link */}
        <a
          href="https://twitch.tv/daware"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginTop: '3rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontFamily: 'var(--font-meta)',
            fontSize: '0.72rem',
            color: '#a970ff',
            letterSpacing: '0.15em',
            textDecoration: 'none',
            position: 'relative',
          }}
        >
          <span style={{ fontSize: '1rem' }}>📺</span>
          TWITCH.TV/DAWARE — LIVE FRIDAYS
        </a>
      </div>

      {/* ── RIGHT: Auth Panel ─────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '4rem 3rem',
          background: 'var(--bg-mid)',
        }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Header */}
          <div style={{ marginBottom: '2.5rem' }}>
            <p
              style={{
                fontFamily: 'var(--font-meta)',
                fontSize: '0.65rem',
                color: 'var(--purple-hot)',
                letterSpacing: '0.3em',
                marginBottom: '0.75rem',
              }}
            >
              JOIN THE FEDERATION
            </p>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '3rem',
                color: 'var(--text-strong)',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              Sign In
            </h1>
          </div>

          {/* OAuth Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <button
              className="oauth-btn"
              style={{ borderColor: '#9147ff' }}
              onClick={() => login('twitch')}
            >
              <TwitchIcon />
              <span>Continue with Twitch</span>
            </button>

            <button
              className="oauth-btn"
              style={{ borderColor: '#7289da' }}
              onClick={() => login('discord')}
            >
              <DiscordIcon />
              <span>Continue with Discord</span>
            </button>

            <button
              className="oauth-btn"
              style={{ borderColor: '#4285f4' }}
              onClick={() => alert('Google OAuth coming in Phase 2')}
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>

            {/* Email toggle */}
            <button
              className="oauth-btn"
              onClick={() => setEmailExpanded(!emailExpanded)}
            >
              <span style={{ fontSize: '1.1rem' }}>✉</span>
              <span>Continue with Email</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', opacity: 0.5 }}>
                {emailExpanded ? '▲' : '▼'}
              </span>
            </button>

            {/* Email inline form */}
            {emailExpanded && (
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => alert('Email auth coming in Phase 2')}
                >
                  Continue →
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              margin: '2rem 0',
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span
              style={{
                fontFamily: 'var(--font-meta)',
                fontSize: '0.62rem',
                color: 'var(--text-dim)',
                letterSpacing: '0.2em',
              }}
            >
              DEMO ACCESS
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Demo shortcuts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              onClick={() => demoLogin('fan')}
              style={{
                padding: '0.85rem',
                background: 'rgba(168,77,255,0.1)',
                border: '1px solid var(--purple)',
                color: 'var(--purple-hot)',
                fontFamily: 'var(--font-meta)',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                cursor: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'background 0.2s',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>👤</span>
              Fan Account
            </button>

            <button
              onClick={() => demoLogin('admin')}
              style={{
                padding: '0.85rem',
                background: 'rgba(255,201,51,0.08)',
                border: '1px solid var(--gold)',
                color: 'var(--gold)',
                fontFamily: 'var(--font-meta)',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                cursor: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'background 0.2s',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>⚙️</span>
              Admin Account
            </button>
          </div>

          <p
            style={{
              marginTop: '2rem',
              fontFamily: 'var(--font-meta)',
              fontSize: '0.62rem',
              color: 'var(--text-dim)',
              letterSpacing: '0.1em',
              textAlign: 'center',
              lineHeight: 1.8,
            }}
          >
            By continuing, you agree to the DAW rules and community standards.
            <br />
            Wrestler submissions are subject to Daware approval.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── SVG Icons ─────────────────────────────────── */

function TwitchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#9147ff">
      <path d="M4.285 0L1 3.48v17.04h5.71V24l3.715-3.48h3.429L21 12V0H4.285zM19.286 11.14l-2.857 2.86h-4.286l-2.5 2.5v-2.5H5.857V1.714h13.429V11.14z" />
      <path d="M16.43 4.286h-1.716v5h1.716v-5zM11.715 4.286H10v5h1.715v-5z" />
    </svg>
  )
}

function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#7289da">
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
