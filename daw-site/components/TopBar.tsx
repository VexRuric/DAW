'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface NextShow {
  name: string
  show_date: string
  show_type: string
  ppv_name: string | null
}

function formatTopBarDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
}

export default function TopBar() {
  const [nextShow, setNextShow]   = useState<NextShow | null>(null)
  const [live, setLive]           = useState(false)
  const [channel, setChannel]     = useState('daware')

  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from('shows')
        .select('name, show_date, show_type, ppv_name')
        .gte('show_date', new Date().toISOString().split('T')[0])
        .order('show_date', { ascending: true })
        .limit(1)
        .single()
      setNextShow(data ?? null)

      try {
        const res  = await fetch('/api/stream-status')
        const json = await res.json()
        setLive(!!json.live)
        if (json.channel) setChannel(json.channel)
      } catch { /* offline fallback */ }
    }
    init()
  }, [])

  return (
    <div
      className="topbar-inner"
      style={{
        background: live ? 'var(--purple)' : '#000',
        borderBottom: live ? '1px solid transparent' : '2px solid var(--purple)',
        padding: '0.5rem 3rem',
        fontFamily: 'var(--font-meta)',
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        color: 'var(--text-strong)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: 700,
        position: 'relative',
        zIndex: 10,
        transition: 'background 0.4s, border-color 0.4s',
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <span
          style={{
            width: 7,
            height: 7,
            background: live ? 'var(--text-strong)' : 'var(--purple-hot)',
            borderRadius: '50%',
            display: 'inline-block',
            animation: live ? 'pulse-dot 1.5s infinite' : undefined,
            flexShrink: 0,
          }}
        />
        {live
          ? (nextShow
              ? `Live now · ${nextShow.ppv_name ?? nextShow.name} · ${formatTopBarDate(nextShow.show_date)}`
              : `${channel} is live now`)
          : (nextShow
              ? `Next show · ${nextShow.ppv_name ?? nextShow.name} · ${formatTopBarDate(nextShow.show_date)}`
              : 'DAW Warehouse LIVE')}
      </div>

      <div className="topbar-links" style={{ display: 'flex', gap: '1.25rem' }}>
        <Link
          href={`https://twitch.tv/${channel}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--text-strong)', textDecoration: 'none', opacity: 0.9 }}
        >
          Twitch
        </Link>
        <Link
          href="https://discord.gg/daw"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--text-strong)', textDecoration: 'none', opacity: 0.9 }}
        >
          Discord
        </Link>
        <Link
          href="https://twitter.com/DAWarehouseLive"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--text-strong)', textDecoration: 'none', opacity: 0.9 }}
        >
          Twitter/X
        </Link>
      </div>
    </div>
  )
}
