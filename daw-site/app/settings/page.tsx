'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type SettingsSection = 'connections' | 'alerts' | 'retire' | 'support'

interface Connection {
  id: string
  label: string
  icon: string
  color: string
  connected: boolean
  handle?: string
}

const CONNECTIONS: Connection[] = [
  { id: 'twitch',  label: 'Twitch',  icon: '📺', color: '#9147ff', connected: true,  handle: '@twitchfan' },
  { id: 'discord', label: 'Discord', icon: '💬', color: '#7289da', connected: false },
  { id: 'google',  label: 'Google',  icon: '🔍', color: '#4285f4', connected: false },
]

const ALERT_OPTIONS = [
  { id: 'results',    label: 'New match results posted',          desc: 'Get notified when show results are posted to Discord' },
  { id: 'reminder',   label: 'Upcoming show reminders',           desc: '1 hour before every DAW Weekly and PPV' },
  { id: 'booked',     label: 'My wrestler booked in a match',     desc: 'When your character is added to the upcoming card' },
  { id: 'title_win',  label: 'My wrestler wins a title',          desc: 'Championship change notifications involving your character' },
  { id: 'fed_news',   label: 'Federation announcements',          desc: 'Major news from Daware about the federation' },
]

const SUPPORT_SUBJECTS = ['Bug Report', 'Suggestion', 'Character Appeal', 'Other']

export default function SettingsPage() {
  const { isFan, user, logout } = useAuth()
  const router = useRouter()
  const [section, setSection] = useState<SettingsSection>('connections')
  const [alerts, setAlerts]   = useState<Record<string, boolean>>(
    Object.fromEntries(ALERT_OPTIONS.map((a) => [a.id, a.id === 'results' || a.id === 'fed_news']))
  )
  const [supportSubject, setSupportSubject] = useState(SUPPORT_SUBJECTS[0])
  const [supportMsg, setSupportMsg]         = useState('')
  const [supportSent, setSupportSent]       = useState(false)
  const [retireConfirm, setRetireConfirm]   = useState(false)

  useEffect(() => {
    if (!isFan) router.push('/login')
  }, [isFan, router])

  if (!isFan) return null

  function handleLogout() {
    logout()
    router.push('/')
  }

  const NAV_SECTIONS: { id: SettingsSection; label: string; icon: string }[] = [
    { id: 'connections', label: 'Connections',    icon: '🔗' },
    { id: 'alerts',      label: 'Discord Alerts', icon: '🔔' },
    { id: 'retire',      label: 'Retire Account', icon: '🗑️' },
    { id: 'support',     label: 'Support',        icon: '💬' },
  ]

  return (
    <div>
      {/* Page header */}
      <div className="section-sm" style={{ borderTop: 'none', paddingBottom: '1.5rem' }}>
        <p className="section-label">Account</p>
        <h1 className="section-title">Settings</h1>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          minHeight: '70vh',
          borderTop: '1px solid var(--border)',
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            background: 'var(--surface)',
            borderRight: '1px solid var(--border)',
            padding: '1.5rem 0',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* User info */}
          <div style={{ padding: '0 1.5rem 1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                marginBottom: '0.75rem',
              }}
            >
              👤
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1 }}>
              {user?.name}
            </p>
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginTop: '0.2rem' }}>
              {user?.handle}
            </p>
          </div>

          {NAV_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`admin-nav-item${section === s.id ? ' active' : ''}`}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.85rem' }}>{s.icon}</span>
                {s.label}
              </span>
            </button>
          ))}

          {/* Logout */}
          <div style={{ marginTop: 'auto', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '0.7rem',
                background: 'rgba(255,51,85,0.1)',
                border: '1px solid var(--accent-red)',
                color: 'var(--accent-red)',
                fontFamily: 'var(--font-meta)',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                cursor: 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,51,85,0.2)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,51,85,0.1)' }}
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Content */}
        <main style={{ padding: '2.5rem 3rem' }}>
          {/* ── Connections ─── */}
          {section === 'connections' && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-strong)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Connected Accounts
              </h2>
              <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '2rem', lineHeight: 1.8 }}>
                Link accounts to enable single sign-on and receive Discord notifications.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {CONNECTIONS.map((conn) => (
                  <div
                    key={conn.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1.25rem 1.5rem',
                      background: 'var(--surface)',
                      border: `1px solid ${conn.connected ? conn.color + '44' : 'var(--border)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{conn.icon}</span>
                      <div>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1 }}>
                          {conn.label}
                        </p>
                        {conn.connected && conn.handle && (
                          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', color: conn.color, letterSpacing: '0.1em', marginTop: '0.2rem' }}>
                            ✓ Connected as {conn.handle}
                          </p>
                        )}
                        {!conn.connected && (
                          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginTop: '0.2rem' }}>
                            Not connected
                          </p>
                        )}
                      </div>
                    </div>

                    {conn.connected ? (
                      <button
                        className="btn btn-ghost"
                        style={{ fontSize: '0.65rem', padding: '0.45rem 0.9rem' }}
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        style={{
                          padding: '0.5rem 1.1rem',
                          background: conn.color + '22',
                          border: `1px solid ${conn.color}`,
                          color: conn.color,
                          fontFamily: 'var(--font-meta)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          cursor: 'none',
                          transition: 'background 0.15s',
                        }}
                      >
                        Connect
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Alerts ─── */}
          {section === 'alerts' && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-strong)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Discord Alerts
              </h2>
              <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '2rem', lineHeight: 1.8 }}>
                Control which notifications are sent to your Discord DMs.
                Requires Discord to be connected.
              </p>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {ALERT_OPTIONS.map((opt) => (
                  <div key={opt.id} className="toggle-row">
                    <div className="toggle-info">
                      <span className="toggle-title">{opt.label}</span>
                      <span className="toggle-desc">{opt.desc}</span>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={alerts[opt.id]}
                        onChange={(e) => setAlerts({ ...alerts, [opt.id]: e.target.checked })}
                      />
                      <span className="toggle-track" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Retire Account ─── */}
          {section === 'retire' && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-strong)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Retire Account
              </h2>
              <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '2rem', lineHeight: 1.8 }}>
                Permanently remove your account from DAW Warehouse LIVE.
              </p>

              <div
                style={{
                  padding: '2rem',
                  background: 'rgba(255,51,85,0.06)',
                  border: '1px solid var(--accent-red)',
                }}
              >
                <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', color: 'var(--accent-red)', letterSpacing: '0.2em', fontWeight: 700, marginBottom: '1rem' }}>
                  ⚠️ DANGER ZONE
                </p>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-strong)', textTransform: 'uppercase', marginBottom: '1rem' }}>
                  Begin Account Retirement
                </h3>
                <ul style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.08em', lineHeight: 2, marginBottom: '1.5rem', paddingLeft: '1.25rem' }}>
                  <li>A confirmation email will be sent to your address</li>
                  <li>Your account data is preserved for <strong style={{ color: 'var(--text-strong)' }}>5 days</strong></li>
                  <li>After 5 days, all data is permanently deleted</li>
                  <li>Wrestler characters are removed from the active roster</li>
                  <li>This action cannot be undone after the 5-day window</li>
                </ul>

                {!retireConfirm ? (
                  <button
                    className="btn btn-red"
                    onClick={() => setRetireConfirm(true)}
                  >
                    Begin Retirement Process
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', color: 'var(--text-strong)', letterSpacing: '0.1em' }}>
                      Are you absolutely sure? This starts the 5-day countdown.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button className="btn btn-red" onClick={handleLogout}>
                        Yes, Send Confirmation Email
                      </button>
                      <button className="btn btn-ghost" onClick={() => setRetireConfirm(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Support ─── */}
          {section === 'support' && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-strong)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Contact Support
              </h2>
              <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '2rem', lineHeight: 1.8 }}>
                Got a bug, suggestion, or appeal? Reach Daware's team directly.
                You can also open a ticket in the Discord server.
              </p>

              {supportSent ? (
                <div style={{ padding: '2rem', background: 'rgba(0,200,100,0.08)', border: '1px solid #00c864', textAlign: 'center' }}>
                  <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✓</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: '#00c864', textTransform: 'uppercase' }}>Message Sent</p>
                  <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: '0.5rem' }}>
                    We'll get back to you within 48 hours.
                  </p>
                </div>
              ) : (
                <div style={{ maxWidth: 540 }}>
                  <div className="form-field">
                    <label className="form-label">Subject</label>
                    <select
                      className="form-input form-select"
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                    >
                      {SUPPORT_SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Message</label>
                    <textarea
                      className="form-input form-textarea"
                      style={{ minHeight: 160 }}
                      placeholder="Describe your issue, suggestion, or appeal in detail..."
                      value={supportMsg}
                      onChange={(e) => setSupportMsg(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={() => { if (supportMsg.trim()) setSupportSent(true) }}
                  >
                    Send Message
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
