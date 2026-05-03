'use client'

import { useState, useMemo } from 'react'
import WrestlerCard from '@/components/WrestlerCard'
import { Wrestler, WrestlerRecord, CurrentChampion } from '@/lib/types'

interface RosterClientProps {
  wrestlers:      Wrestler[]
  records:        WrestlerRecord[]
  champions:      CurrentChampion[]
  titleImageById?: Map<string, string | null>
}

const DIVISIONS = ['All', 'Mens', 'Womens', 'Internet', 'Intercontinental', 'Tag Team']
const ROLES     = ['All', 'Face', 'Heel', 'Legends']

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function RosterClient({ wrestlers, records, champions, titleImageById }: RosterClientProps) {
  const [division, setDivision] = useState('All')
  const [role, setRole]         = useState('All')
  const [search, setSearch]     = useState('')

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

  const titleImageByWrestlerId = useMemo(() => {
    const m = new Map<string, string | null>()
    champions.forEach((c) => {
      if (c.holder_wrestler_id && titleImageById) {
        m.set(c.holder_wrestler_id, titleImageById.get(c.title_id) ?? null)
      }
    })
    return m
  }, [champions, titleImageById])

  const filtered = useMemo(() => {
    return wrestlers.filter((w) => {
      if (division !== 'All' && w.division !== division) return false
      if (role === 'Legends') { if (!w.legend) return false }
      else if (role !== 'All' && w.role !== role) return false
      if (search && !w.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [wrestlers, division, role, search])

  // Pure alphabetical — champion strip at top already highlights title holders
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  }, [filtered])

  return (
    <>
      {/* Filter bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
          flexDirection: 'column',
          marginBottom: '2rem',
          padding: 'clamp(0.85rem,3vw,1.25rem)',
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
            width: '100%',
          }}
        />

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
          <FilterGroup label="Division" options={DIVISIONS} value={division} onChange={setDivision} />
          <FilterGroup label="Role"     options={ROLES}     value={role}     onChange={setRole}     />
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-meta)', fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>
            {sorted.length} wrestlers
          </span>
        </div>
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
              const record     = recordMap.get(wrestler.id)
              const title      = champMap.get(wrestler.id) ?? null
              const titleImage = titleImageByWrestlerId.get(wrestler.id) ?? null
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
                  titleImageUrl={titleImage}
                  injured={wrestler.injured}
                  legend={wrestler.legend}
                  slug={toSlug(wrestler.name)}
                />
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

function FilterGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
      <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.15em', fontWeight: 700, flexShrink: 0 }}>
        {label}:
      </span>
      <div style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div className="tab-group" style={{ padding: '2px', gap: '1px', whiteSpace: 'nowrap' }}>
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
    </div>
  )
}
