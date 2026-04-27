import { createClient } from '@/lib/supabase-server'
import { Metadata } from 'next'
import { CurrentChampion, Wrestler, WrestlerRecord } from '@/lib/types'
import ChampionStrip from '@/components/ChampionStrip'
import RosterClient from '@/components/RosterClient'

export const metadata: Metadata = {
  title: 'Roster',
  description: 'Full DAW Warehouse LIVE roster — all active wrestlers, champions, win/loss records, and stat pages.',
}

async function getData() {
  try {
    const supabase = await createClient()
    const [wrestlerRes, alumniRes, recordRes, champRes] = await Promise.all([
      supabase.from('roster_wrestlers').select('*').order('name', { ascending: true }),
      supabase.from('roster_alumni').select('*').order('name', { ascending: true }),
      supabase.from('wrestler_records').select('*'),
      supabase.from('current_champions').select('*'),
    ])

    return {
      wrestlers: (wrestlerRes.data ?? []) as Wrestler[],
      alumni:    (alumniRes.data   ?? []) as Wrestler[],
      records:   (recordRes.data   ?? []) as WrestlerRecord[],
      champions: (champRes.data    ?? []) as CurrentChampion[],
    }
  } catch {
    return { wrestlers: [], alumni: [], records: [], champions: [] }
  }
}

export default async function RosterPage() {
  const { wrestlers, alumni, records, champions } = await getData()

  const totalMens   = wrestlers.filter(w => w.gender === 'Male').length
  const totalWomens = wrestlers.filter(w => w.gender === 'Female').length

  return (
    <>
      {/* ── Top Hero section ─────────────────────── */}
      <section style={{ padding: '4rem 3rem 1.5rem' }}>
        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--purple-hot)', letterSpacing: '0.25em', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ width: 30, height: 1, background: 'var(--purple-hot)' }} />
          ACTIVE ROSTER
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 7vw, 6rem)', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 0.9, marginBottom: '2rem' }}>
          DAW WAREHOUSE<br/>ROSTER
        </h1>

        <div style={{ display: 'flex', gap: '3rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'white', lineHeight: 1 }}>{wrestlers.length}</div>
            <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>ACTIVE</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'white', lineHeight: 1 }}>{totalMens}</div>
            <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>MEN'S</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'white', lineHeight: 1 }}>{totalWomens}</div>
            <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>WOMEN'S</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--text-dim)', lineHeight: 1 }}>{alumni.length}</div>
            <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>ALUMNI</div>
          </div>
        </div>
      </section>

      <div style={{ padding: '0 3rem' }}>
        <RosterClient wrestlers={wrestlers} alumni={alumni} records={records} champions={champions} />
      </div>
    </>
  )
}
