'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import WrestlerCard from '@/components/WrestlerCard'
import { Wrestler, WrestlerRecord, CurrentChampion } from '@/lib/types'
import ChampionStrip from '@/components/ChampionStrip'

interface RosterClientProps {
  wrestlers: Wrestler[]
  alumni:    Wrestler[]
  records:   WrestlerRecord[]
  champions: CurrentChampion[]
}

const DIVISIONS = ['All', 'Mens', 'Womens', 'Internet', 'Intercontinental', 'Tag Team']
const ROLES     = ['All', 'Face', 'Heel', 'Tweener']

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function RosterClient({ wrestlers, alumni, records, champions }: RosterClientProps) {
  const [division, setDivision] = useState('All')
  const [role, setRole]         = useState('All')
  const [search, setSearch]     = useState('')
  const [showAlumni, setShowAlumni] = useState(false)

  const recordMap = useMemo(() => {
    const m = new Map<string, WrestlerRecord>()
    records.forEach((r) => m.set(r.id, r))
    return m
  }, [records])

  const champMap = useMemo(() => {
    const m = new Map<string | null, string>()
    champions.forEach((c) => {
      if (c.holder_wrestler_id) m.set(c.holder_wrestler_id, c.title_name)
    })
    return m
  }, [champions])

  const renderMap = useMemo(() => {
    const m = new Map<string, string | null>()
    wrestlers.forEach((w) => m.set(w.id, w.render_url ?? null))
    return m
  }, [wrestlers])

  const filtered = useMemo(() => {
    return wrestlers.filter((w) => {
      if (division !== 'All' && w.division !== division) return false
      if (role !== 'All' && w.role !== role) return false
      if (search && !w.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [wrestlers, division, role, search])

  // Champions float to top
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aChamp = champMap.has(a.id) ? 1 : 0
      const bChamp = champMap.has(b.id) ? 1 : 0
      if (bChamp !== aChamp) return bChamp - aChamp
      return a.name.localeCompare(b.name)
    })
  }, [filtered, champMap])

  const filteredAlumni = useMemo(() => {
    if (!search) return alumni
    return alumni.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))
  }, [alumni, search])

  return (
    <>
      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '2rem',
          padding: '1.25rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <input
          type="search"
          placeholder="Search roster..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontFamily: 'var(--font-meta)',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            padding: '0.6rem 1rem',
            outline: 'none',
            width: 200,
          }}
        />

        <FilterGroup label="Division" options={DIVISIONS} value={division} onChange={setDivision} />
        <FilterGroup label="Role"     options={ROLES}     value={role}     onChange={setRole}     />

        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-meta)', fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>
          {sorted.length} wrestlers
        </span>
      </div>

      {/* Active roster grid */}
      <div style={{ marginTop: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          SHOWING {sorted.length} OF {wrestlers.length} ACTIVE WRESTLERS
        </p>

        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)', fontFamily: 'var(--font-meta)', letterSpacing: '0.15em', fontSize: '0.8rem' }}>
            No wrestlers match the selected filters.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {sorted.map((wrestler) => {
              const record = recordMap.get(wrestler.id)
              const title  = champMap.get(wrestler.id) ?? null
              return (
                <WrestlerCard
                  key={wrestler.id}
                  id={wrestler.id}
                  name={wrestler.name}
                  brand={wrestler.brand}
                  division={wrestler.division}
                  role={wrestler.role}
                  render_url={wrestler.render_url}
                  wins={record?.wins ?? 0}
                  losses={record?.losses ?? 0}
                  draws={record?.draws ?? 0}
                  win_pct={record?.win_pct ?? null}
                  current_title={title}
                  injured={wrestler.injured}
                  slug={toSlug(wrestler.name)}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Alumni section */}
      {alumni.length > 0 && (
        <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
          {/* Alumni header — toggleable */}
          <button
            onClick={() => setShowAlumni(!showAlumni)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              background: 'none',
              border: 'none',
              cursor: 'none',
              padding: 0,
              marginBottom: showAlumni ? '1.5rem' : 0,
              width: '100%',
              textAlign: 'left',
            }}
          >
            <span style={{ width: 30, height: 1, background: 'var(--text-dim)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.25em', fontWeight: 700, textTransform: 'uppercase' }}>
              Alumni — {alumni.length} Former Wrestlers
            </span>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.15em', flexShrink: 0 }}>
              {showAlumni ? '▲ Hide' : '▼ Show'}
            </span>
          </button>

          {showAlumni && (
            <>
              {filteredAlumni.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>
                  No alumni match your search.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                  {filteredAlumni.map((wrestler) => {
                    const record = recordMap.get(wrestler.id)
                    return (
                      <Link
                        key={wrestler.id}
                        href={`/roster/${toSlug(wrestler.name)}`}
                        style={{ textDecoration: 'none', display: 'block', position: 'relative', aspectRatio: '2/3', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface-2)', filter: 'grayscale(0.7) brightness(0.7)' }}
                      >
                        {/* Portrait */}
                        <div style={{ position: 'absolute', inset: 0 }}>
                          {wrestler.render_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={wrestler.render_url} alt={wrestler.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                          ) : (
                            <SilhouettePlaceholder />
                          )}
                        </div>

                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.35) 45%, transparent 70%)' }} />

                        {/* Alumni badge */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, background: 'rgba(80,80,80,0.9)', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-meta)', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.15em', padding: '0.3rem 0.5rem', textAlign: 'center', textTransform: 'uppercase' }}>
                          ALUMNI
                        </div>

                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2.5rem 0.85rem 0.9rem', zIndex: 2 }}>
                          <div style={{ borderLeft: '2px solid rgba(255,255,255,0.2)', paddingLeft: '0.6rem' }}>
                            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', lineHeight: 1, marginBottom: '0.4rem' }}>
                              {wrestler.name}
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
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}

function FilterGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.15em', fontWeight: 700 }}>
        {label}:
      </span>
      <div className="tab-group" style={{ padding: '2px', gap: '1px' }}>
        {options.map((opt) => (
          <button
            key={opt}
            className={`tab${opt === value ? ' active' : ''}`}
            onClick={() => onChange(opt)}
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem' }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function SilhouettePlaceholder() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg, var(--surface-2) 0%, var(--surface-3) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 100 140" style={{ width: '55%', height: '55%', opacity: 0.1 }} fill="white">
        <ellipse cx="50" cy="22" rx="16" ry="18" />
        <path d="M20 140 Q25 90 50 80 Q75 90 80 140Z" />
        <path d="M50 80 Q30 85 18 110 L30 115 Q38 95 50 90Z" />
        <path d="M50 80 Q70 85 82 110 L70 115 Q62 95 50 90Z" />
      </svg>
    </div>
  )
}
