import { createClient } from '@/lib/supabase-server'
import { Metadata } from 'next'
import Link from 'next/link'
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
      supabase.from('wrestlers').select('*').eq('brand', 'DAW').eq('active', true).order('name', { ascending: true }),
      supabase.from('wrestlers').select('id').eq('brand', 'DAW').eq('active', false),
      supabase.from('wrestler_records').select('*'),
      supabase.from('current_champions').select('*'),
    ])

    return {
      wrestlers:  (wrestlerRes.data ?? []) as Wrestler[],
      alumniCount: (alumniRes.data ?? []).length,
      records:    (recordRes.data  ?? []) as WrestlerRecord[],
      champions:  (champRes.data   ?? []) as CurrentChampion[],
    }
  } catch {
    return { wrestlers: [], alumniCount: 0, records: [], champions: [] }
  }
}

export default async function RosterPage() {
  const { wrestlers, alumniCount, records, champions } = await getData()

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
            <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>MEN&apos;S</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'white', lineHeight: 1 }}>{totalWomens}</div>
            <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>WOMEN&apos;S</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--text-dim)', lineHeight: 1 }}>{alumniCount}</div>
            <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>ALUMNI</div>
          </div>
        </div>
      </section>

      <div style={{ padding: '0 3rem' }}>
        {/* Current Champions */}
        {champions.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <ChampionStrip
              champions={champions}
              renderMap={new Map(wrestlers.map(w => [w.id, w.render_url ?? null]))}
            />
          </div>
        )}

        {/* Roster tab switcher */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
          <Link
            href="/roster"
            style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', padding: '0.65rem 1.25rem', color: 'var(--purple-hot)', borderBottom: '2px solid var(--purple-hot)' }}
          >
            Wrestlers
          </Link>
          <Link
            href="/roster/factions"
            style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', padding: '0.65rem 1.25rem', color: 'var(--text-dim)', borderBottom: '2px solid transparent' }}
          >
            Factions
          </Link>
          <Link
            href="/roster/alumni"
            style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', padding: '0.65rem 1.25rem', color: 'var(--text-dim)', borderBottom: '2px solid transparent' }}
          >
            Alumni
          </Link>
        </div>

        <RosterClient wrestlers={wrestlers} records={records} champions={champions} />
      </div>
    </>
  )
}
