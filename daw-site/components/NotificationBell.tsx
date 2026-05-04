'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

interface SiteNotification {
  id: string
  type: string
  title: string
  body: string | null
  read: boolean
  created_at: string
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen]                     = useState(false)
  const [notifications, setNotifications]   = useState<SiteNotification[]>([])
  const [muted, setMuted]                   = useState(false)
  const [loading, setLoading]               = useState(true)
  const panelRef                            = useRef<HTMLDivElement>(null)

  const unread    = notifications.filter(n => !n.read).length
  const hasUnread = unread > 0 && !muted

  const fetchAll = useCallback(async () => {
    if (!user) return
    const [notifRes, prefRes] = await Promise.all([
      supabase.from('site_notifications').select('*').order('created_at', { ascending: false }).limit(25),
      supabase.from('user_alert_prefs').select('site_muted').eq('id', user.id).single(),
    ])
    setNotifications((notifRes.data ?? []) as SiteNotification[])
    setMuted(prefRes.data?.site_muted ?? false)
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [user, fetchAll])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function markAllRead() {
    const ids = notifications.filter(n => !n.read).map(n => n.id)
    if (ids.length === 0) return
    await supabase.from('site_notifications').update({ read: true }).in('id', ids)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  if (!user || loading) return null

  return (
    <div ref={panelRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={hasUnread ? `${unread} unread notification${unread !== 1 ? 's' : ''}` : 'Notifications'}
        style={{
          position: 'relative',
          background: 'transparent',
          border: `1px solid ${hasUnread ? 'var(--gold)' : 'var(--border)'}`,
          color: hasUnread ? 'var(--gold)' : 'var(--text-dim)',
          width: 34, height: 34,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.2s, color 0.2s',
          flexShrink: 0,
        }}
      >
        <BellIcon />
        {hasUnread && (
          <span style={{
            position: 'absolute', top: -5, right: -5,
            background: 'var(--gold)', color: '#0a0a0c',
            fontFamily: 'var(--font-meta)', fontSize: '0.42rem', fontWeight: 700,
            minWidth: 15, height: 15, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 42, right: 0, zIndex: 500,
          width: 320,
          background: 'var(--surface)',
          border: `1px solid ${hasUnread ? 'var(--gold)' : 'var(--border)'}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--text-dim)' }}>
              NOTIFICATIONS {muted ? '· MUTED' : ''}
            </span>
            {unread > 0 && !muted && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--purple-hot)', cursor: 'pointer', letterSpacing: '0.08em', padding: 0 }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <p style={{ padding: '1.5rem 1rem', fontFamily: 'var(--font-meta)', fontSize: '0.68rem', color: 'var(--text-dim)', textAlign: 'center', letterSpacing: '0.12em' }}>
                No notifications
              </p>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{
                  padding: '0.7rem 1rem',
                  borderBottom: '1px solid rgba(42,42,51,0.5)',
                  borderLeft: `2px solid ${!n.read && !muted ? 'var(--purple)' : 'transparent'}`,
                  background: !n.read && !muted ? 'rgba(128,0,218,0.05)' : 'transparent',
                }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1, marginBottom: n.body ? '0.2rem' : 0 }}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.05em', lineHeight: 1.5 }}>
                      {n.body}
                    </p>
                  )}
                  <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: '0.08em', marginTop: '0.25rem' }}>
                    {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BellIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
    </svg>
  )
}
