import { createClient } from '@/lib/supabase-server'
import { Metadata } from 'next'
import Link from 'next/link'
import { Team } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Factions',
  description: 'All active DAW Warehouse LIVE factions and tag teams.',
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

interface TeamRecord {
  id: string
  name: string
  wins: number
  losses: number
  draws: number
  total_matches: number
  win_pct: number | null
}

async function getData() {
  try {
    const supabase = await createClient()
    const [activeRes, inactiveRes, recordRes] = await Promise.all([
      supabase.from('teams').select('*').eq('brand', 'DAW').eq('active', true).order('name'),
      supabase.from('teams').select('*').eq('brand', 'DAW').eq('active', false).order('name'),
      supabase.from('team_records').select('*').then((r) => r).catch(() => ({ data: [] })),
    ])
    return {
      teams:    (activeRes.data   ?? []) as Team[],
      disbanded:(inactiveRes.data ?? []) as Team[],
      records:  (recordRes.data   ?? []) as TeamRecord[],
    }
  } catch {
    return { teams: [], disbanded: [], records: [] }
  }
}

function SilhouettePlaceholder() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg, var(--surface-2) 0%, var(--surface-3) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 120 80" style={{ width: '55%', height: '55%', opacity: 0.08 }} fill="white">
        <ellipse cx="35" cy="22" rx="13" ry="15" />
        <ellipse cx="85" cy="22" rx="13" ry="15" />
        <path d="M10 80 Q15 55 35 47 Q55 55 60 80Z" />
        <path d="M60 80 Q65 55 85 47 Q105 55 110 80Z" />
      </svg>
    </div>
  )
}

export default async function FactionsPage() {
  const { teams, disbanded, records } = await getData()

  const recordMap = new Map<string, TeamRecord>()
  records.forEach((r) => recordMap.set(r.id, r))

  return (
    <>
      {/* Hero */}
      <section style={{ padding: '4rem 3rem 1.5rem' }}>
        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--purple-hot)', letterSpacing: '0.25em', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ width: 30, height: 1, background: 'var(--purple-hot)' }} />
          FACTIONS &amp; TAG TEAMS
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 7vw, 6rem)', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 0.9, marginBottom: '2rem' }}>
          DAW WAREHOUSE<br />FACTIONS
        </h1>
        <div style={{ display: 'flex', gap: '3rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'white', lineHeight: 1 }}>{teams.length}</div>
            <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>ACTIVE</div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--text-dim)', lineHeight: 1 }}>{disbanded.length}</div>
            <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>DISBANDED</div>
          </div>
        </div>
      </section>

      <div style={{ padding: '0 3rem' }}>
        {/* Roster tab switcher */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
          <Link
            href="/roster"
            style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', padding: '0.65rem 1.25rem', color: 'var(--text-dim)', borderBottom: '2px solid transparent', transition: 'color 0.15s' }}
          >
            Wrestlers
          </Link>
          <Link
            href="/roster/factions"
            style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', padding: '0.65rem 1.25rem', color: 'var(--purple-hot)', borderBottom: '2px solid var(--purple-hot)', transition: 'color 0.15s' }}
          >
            Factions
          </Link>
        </div>

        {/* Active factions grid */}
        {teams.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>No active factions.</p>
        ) : (
          <>
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem' }}>
              {teams.length} ACTIVE FACTION{teams.length !== 1 ? 'S' : ''}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', marginBottom: '4rem' }}>
              {teams.map((team) => {
                const record = recordMap.get(team.id)
                const accentColor = team.role === 'Heel' ? 'var(--accent-red)' : team.role === 'Face' ? 'var(--purple-hot)' : 'var(--border-hot)'
                return (
                  <Link
                    key={team.id}
                    href={`/roster/factions/${toSlug(team.name)}`}
                    style={{ textDecoration: 'none', display: 'block', position: 'relative', aspectRatio: '2/3', overflow: 'hidden', border: `1px solid var(--border)`, background: 'var(--surface-2)' }}
                  >
                    {/* Portrait */}
                    <div style={{ position: 'absolute', inset: 0 }}>
                      {team.render_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.render_url} alt={team.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                      ) : (
                        <SilhouettePlaceholder />
                      )}
                    </div>

                    {/* Gradient overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.3) 45%, transparent 70%)' }} />

                    {/* Role accent bar */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: accentColor }} />

                    {/* Info */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2.5rem 0.85rem 0.9rem', zIndex: 2 }}>
                      <div style={{ borderLeft: `2px solid ${accentColor}`, paddingLeft: '0.6rem' }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'white', textTransform: 'uppercase', lineHeight: 1, marginBottom: '0.25rem' }}>
                          {team.name}
                        </p>
                        {team.division && (
                          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                            {team.division}
                          </p>
                        )}
                        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', letterSpacing: '0.06em' }}>
                          <span style={{ color: '#00c864', fontWeight: 700 }}>{record?.wins ?? 0}W</span>
                          <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 4px' }}>·</span>
                          <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>{record?.losses ?? 0}L</span>
                          <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 4px' }}>·</span>
                          <span style={{ color: 'rgba(255,255,255,0.4)' }}>{record?.draws ?? 0}D</span>
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {/* Disbanded section */}
        {disbanded.length > 0 && (
          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', marginBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <span style={{ width: 30, height: 1, background: 'var(--text-dim)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.25em', fontWeight: 700, textTransform: 'uppercase' }}>
                Disbanded — {disbanded.length} Former Faction{disbanded.length !== 1 ? 's' : ''}
              </span>
              <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
              {disbanded.map((team) => {
                const record = recordMap.get(team.id)
                return (
                  <Link
                    key={team.id}
                    href={`/roster/factions/${toSlug(team.name)}`}
                    style={{ textDecoration: 'none', display: 'block', position: 'relative', aspectRatio: '2/3', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface-2)', filter: 'grayscale(0.7) brightness(0.7)' }}
                  >
                    <div style={{ position: 'absolute', inset: 0 }}>
                      {team.render_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.render_url} alt={team.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                      ) : (
                        <SilhouettePlaceholder />
                      )}
                    </div>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.35) 45%, transparent 70%)' }} />
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, background: 'rgba(80,80,80,0.9)', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-meta)', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.15em', padding: '0.3rem 0.5rem', textAlign: 'center', textTransform: 'uppercase' }}>
                      DISBANDED
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2.5rem 0.85rem 0.9rem', zIndex: 2 }}>
                      <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: '0.6rem' }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', lineHeight: 1, marginBottom: '0.4rem' }}>
                          {team.name}
                        </p>
                        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', letterSpacing: '0.06em' }}>
                          <span style={{ color: 'rgba(0,200,100,0.6)', fontWeight: 700 }}>{record?.wins ?? 0}W</span>
                          <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>
                          <span style={{ color: 'rgba(255,51,85,0.6)', fontWeight: 700 }}>{record?.losses ?? 0}L</span>
                          <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>
                          <span style={{ color: 'rgba(255,255,255,0.3)' }}>{record?.draws ?? 0}D</span>
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
