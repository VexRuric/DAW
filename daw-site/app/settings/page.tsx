'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { UserIdentity } from '@supabase/supabase-js'

type SettingsSection = 'connections' | 'alerts' | 'retire' | 'support'

/* ── Provider metadata ──────────────────────────────── */

interface ProviderConfig {
  id: string
  label: string
  color: string
  getHandle: (identity: UserIdentity) => string | null
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'twitch',
    label: 'Twitch',
    color: '#9147ff',
    getHandle: (i) => {
      const u = i.identity_data?.preferred_username
      return u ? `@${u}` : null
    },
  },
  {
    id: 'discord',
    label: 'Discord',
    color: '#7289da',
    getHandle: (i) => {
      const u = i.identity_data?.custom_claims?.global_name ?? i.identity_data?.preferred_username
      return u ? `@${u}` : null
    },
  },
  {
    id: 'google',
    label: 'Google',
    color: '#4285f4',
    getHandle: (i) => i.identity_data?.email ?? null,
  },
]

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  twitch:  <TwitchIcon />,
  discord: <DiscordIcon />,
  google:  <GoogleIcon />,
  email:   <span style={{ fontSize: '1.1rem' }}>✉</span>,
}

/* ── Alert options ──────────────────────────────────── */

const ALERT_OPTIONS = [
  { id: 'results',   label: 'New match results posted',        desc: 'Get notified when show results are posted to Discord' },
  { id: 'reminder',  label: 'Upcoming show reminders',         desc: '1 hour before every DAW Weekly and PPV' },
  { id: 'booked',    label: 'My wrestler booked in a match',   desc: 'When your character is added to the upcoming card' },
  { id: 'title_win', label: 'My wrestler wins a title',        desc: 'Championship change notifications involving your character' },
  { id: 'fed_news',  label: 'Federation announcements',        desc: 'Major news from Daware about the federation' },
]

const SUPPORT_SUBJECTS = ['Bug Report', 'Suggestion', 'Character Appeal', 'Other']

/* ── Page ───────────────────────────────────────────── */

export default function SettingsPage() {
  const { isFan, user, logout, loading: authLoading } = useAuth()
  const router = useRouter()

  const [section, setSection]               = useState<SettingsSection>('connections')
  const [identities, setIdentities]         = useState<UserIdentity[]>([])
  const [identitiesLoading, setIdentitiesLoading] = useState(true)
  const [connectingId, setConnectingId]     = useState<string | null>(null)
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null)
  const [connError, setConnError]           = useState<string | null>(null)

  const [alerts, setAlerts] = useState<Record<string, boolean>>(
    Object.fromEntries(ALERT_OPTIONS.map((a) => [a.id, a.id === 'results' || a.id === 'fed_news']))
  )
  const [supportSubject, setSupportSubject] = useState(SUPPORT_SUBJECTS[0])
  const [supportMsg, setSupportMsg]         = useState('')
  const [supportSent, setSupportSent]       = useState(false)
  const [retireConfirm, setRetireConfirm]   = useState(false)

  /* Redirect when not logged in — wait for auth to resolve first */
  useEffect(() => {
    if (!authLoading && !isFan) router.push('/login')
  }, [isFan, authLoading, router])

  /* Load actual linked identities from Supabase */
  useEffect(() => {
    if (!isFan) return
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setIdentities(u?.identities ?? [])
      setIdentitiesLoading(false)
    })
  }, [isFan])

  if (authLoading || !isFan || !user) return null

  /* ── Helpers ── */

  function getIdentity(provider: string) {
    return identities.find((i) => i.provider === provider) ?? null
  }

  async function connectProvider(provider: string) {
    setConnError(null)
    setConnectingId(provider)
    const redirectTo = `${window.location.origin}/auth/callback?next=/settings`
    const { error } = await supabase.auth.linkIdentity({
      provider: provider as 'twitch' | 'discord' | 'google',
      options: { redirectTo },
    })
    if (error) {
      setConnError(error.message)
      setConnectingId(null)
    }
    // On success, browser redirects — no further code runs
  }

  async function disconnectProvider(provider: string) {
    setConnError(null)
    const identity = getIdentity(provider)
    if (!identity) return

    // Require at least one remaining identity
    if (identities.length <= 1) {
      setConnError("Can't disconnect your only sign-in method. Connect another account first.")
      return
    }

    setDisconnectingId(provider)
    const { error } = await supabase.auth.unlinkIdentity(identity)
    if (error) {
      setConnError(error.message)
    } else {
      setIdentities((prev) => prev.filter((i) => i.provider !== provider))
    }
    setDisconnectingId(null)
  }

  function handleLogout() {
    logout()
    router.push('/')
  }

  /* ── Sidebar nav ── */

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

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '70vh', borderTop: '1px solid var(--border)' }}>

        {/* Sidebar */}
        <aside style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: '1.5rem 0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0 1.5rem 1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '0.75rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', marginBottom: '0.75rem' }}>
              👤
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1 }}>
              {user.name}
            </p>
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginTop: '0.2rem' }}>
              {user.email}
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

          <div style={{ marginTop: 'auto', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleLogout}
              style={{ width: '100%', padding: '0.7rem', background: 'rgba(255,51,85,0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', fontFamily: 'var(--font-meta)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'none', transition: 'background 0.15s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,51,85,0.2)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,51,85,0.1)' }}
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Content */}
        <main style={{ padding: '2.5rem 3rem' }}>

          {/* ── Connections ── */}
          {section === 'connections' && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-strong)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Connected Accounts
              </h2>
              <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '2rem', lineHeight: 1.8 }}>
                Link multiple sign-in methods to your account. Any connected account can be used to log in.
              </p>

              {connError && (
                <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--accent-red)', letterSpacing: '0.08em', padding: '0.65rem 1rem', background: 'rgba(255,51,85,0.08)', border: '1px solid rgba(255,51,85,0.25)', marginBottom: '1.25rem' }}>
                  {connError}
                </div>
              )}

              {identitiesLoading ? (
                <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.15em', padding: '2rem 0' }}>
                  Loading…
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {PROVIDERS.map((prov) => {
                    const identity   = getIdentity(prov.id)
                    const connected  = !!identity
                    const handle     = identity ? prov.getHandle(identity) : null
                    const isWorking  = connectingId === prov.id || disconnectingId === prov.id

                    return (
                      <div
                        key={prov.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1.25rem 1.5rem',
                          background: 'var(--surface)',
                          border: `1px solid ${connected ? prov.color + '44' : 'var(--border)'}`,
                          transition: 'border-color 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                            {PROVIDER_ICONS[prov.id]}
                          </span>
                          <div>
                            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1 }}>
                              {prov.label}
                            </p>
                            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', letterSpacing: '0.1em', marginTop: '0.2rem', color: connected ? prov.color : 'var(--text-dim)' }}>
                              {connected ? `✓ Connected${handle ? ` as ${handle}` : ''}` : 'Not connected'}
                            </p>
                          </div>
                        </div>

                        {connected ? (
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: '0.65rem', padding: '0.45rem 0.9rem', opacity: isWorking ? 0.5 : 1 }}
                            disabled={isWorking}
                            onClick={() => disconnectProvider(prov.id)}
                          >
                            {disconnectingId === prov.id ? 'Disconnecting…' : 'Disconnect'}
                          </button>
                        ) : (
                          <button
                            style={{ padding: '0.5rem 1.1rem', background: prov.color + '22', border: `1px solid ${prov.color}`, color: prov.color, fontFamily: 'var(--font-meta)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', cursor: 'none', transition: 'background 0.15s', opacity: isWorking ? 0.5 : 1 }}
                            disabled={isWorking}
                            onClick={() => connectProvider(prov.id)}
                          >
                            {connectingId === prov.id ? 'Redirecting…' : 'Connect'}
                          </button>
                        )}
                      </div>
                    )
                  })}

                  {/* Email identity — read-only display */}
                  {getIdentity('email') && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1.25rem 1.5rem',
                        background: 'var(--surface)',
                        border: '1px solid rgba(120,120,140,0.35)',
                        opacity: 0.8,
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center' }}>{PROVIDER_ICONS['email']}</span>
                      <div>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1 }}>
                          Email / Password
                        </p>
                        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginTop: '0.2rem' }}>
                          ✓ {getIdentity('email')?.email ?? user.email}
                        </p>
                      </div>
                    </div>
                  )}

                  <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em', lineHeight: 1.8, marginTop: '0.5rem' }}>
                    All connected accounts log in to the same DAW profile. You must keep at least one connection active.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Alerts ── */}
          {section === 'alerts' && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-strong)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Discord Alerts
              </h2>
              <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '2rem', lineHeight: 1.8 }}>
                Control which notifications are sent to your Discord DMs. Requires Discord to be connected.
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

          {/* ── Retire Account ── */}
          {section === 'retire' && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-strong)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Retire Account
              </h2>
              <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '2rem', lineHeight: 1.8 }}>
                Permanently remove your account from DAW Warehouse LIVE.
              </p>
              <div style={{ padding: '2rem', background: 'rgba(255,51,85,0.06)', border: '1px solid var(--accent-red)' }}>
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
                  <button className="btn btn-red" onClick={() => setRetireConfirm(true)}>
                    Begin Retirement Process
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', color: 'var(--text-strong)', letterSpacing: '0.1em' }}>
                      Are you absolutely sure? This starts the 5-day countdown.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button className="btn btn-red" onClick={handleLogout}>Yes, Send Confirmation Email</button>
                      <button className="btn btn-ghost" onClick={() => setRetireConfirm(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Support ── */}
          {section === 'support' && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-strong)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Contact Support
              </h2>
              <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '2rem', lineHeight: 1.8 }}>
                Got a bug, suggestion, or appeal? Reach Daware's team directly. You can also open a ticket in the Discord server.
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
                    <select className="form-input form-select" value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)}>
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

/* ── SVG Icons ── */

function TwitchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#9147ff" aria-hidden>
      <path d="M4.285 0L1 3.48v17.04h5.71V24l3.715-3.48h3.429L21 12V0H4.285zM19.286 11.14l-2.857 2.86h-4.286l-2.5 2.5v-2.5H5.857V1.714h13.429V11.14z" />
      <path d="M16.43 4.286h-1.716v5h1.716v-5zM11.715 4.286H10v5h1.715v-5z" />
    </svg>
  )
}

function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#7289da" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
