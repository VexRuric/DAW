import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'

async function getNextShow() {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('shows')
      .select('name, show_date, show_type, ppv_name')
      .gte('show_date', new Date().toISOString().split('T')[0])
      .order('show_date', { ascending: true })
      .limit(1)
      .single()
    return data
  } catch {
    return null
  }
}

function formatTopBarDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
}

export default async function TopBar() {
  const nextShow = await getNextShow()

  return (
    <div
      style={{
        background: 'var(--purple)',
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
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
        <span
          style={{
            width: 7,
            height: 7,
            background: 'var(--text-strong)',
            borderRadius: '50%',
            display: 'inline-block',
            animation: 'pulse-dot 1.5s infinite',
          }}
        />
        {nextShow
          ? `Next show · ${nextShow.ppv_name ?? nextShow.name} · ${formatTopBarDate(nextShow.show_date)}`
          : 'DAW Warehouse LIVE'}
      </div>

      <div style={{ display: 'flex', gap: '1.25rem' }}>
        <Link
          href="https://twitch.tv/daware"
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
