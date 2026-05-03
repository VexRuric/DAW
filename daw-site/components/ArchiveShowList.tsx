'use client'

import { useState } from 'react'

interface Participant {
  result: string
  wrestlers: { id: string; name: string } | null
  teams:     { id: string; name: string } | null
}

interface Match {
  id: string
  match_number: number
  match_type: string
  stipulation: string | null
  is_title_match: boolean
  is_draw: boolean
  rating: number | null
  titles: { name: string } | null
  match_participants: Participant[]
}

export interface ArchiveShow {
  id: string
  name: string
  show_date: string
  show_type: string
  ppv_name: string | null
  matches: Match[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function ShowRow({ show }: { show: ArchiveShow }) {
  const [expanded, setExpanded] = useState(false)
  const isPPV = show.show_type === 'ppv'
  const sortedMatches = [...(show.matches ?? [])].sort(
    (a, b) => a.match_number - b.match_number
  )

  return (
    <div style={{ border: isPPV ? '2px solid var(--gold)' : '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Clickable show header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, display: 'block',
        }}
      >
        <div style={{
          padding: 'clamp(0.85rem,3vw,1.25rem) clamp(1rem,3vw,1.5rem)',
          background: isPPV
            ? 'linear-gradient(90deg, rgba(255,201,51,0.12) 0%, var(--surface) 100%)'
            : 'var(--surface)',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '0.75rem', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap', minWidth: 0 }}>
            {isPPV && (
              <span className="pill pill-gold" style={{ fontSize: '0.55rem', flexShrink: 0 }}>★ PPV</span>
            )}
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.1rem,3vw,1.5rem)',
              color: isPPV ? 'var(--gold)' : 'var(--text-strong)',
              textTransform: 'uppercase', lineHeight: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {show.ppv_name ?? show.name}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>
              {formatDate(show.show_date)} · {sortedMatches.length} matches
            </span>
            <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', color: 'var(--purple-hot)', flexShrink: 0 }}>
              {expanded ? '▲' : '▼'}
            </span>
          </div>
        </div>
      </button>

      {/* Expandable match list */}
      {expanded && (
        <div style={{ background: 'var(--bg-mid)' }}>
          {sortedMatches.map((match) => {
            const winner = match.match_participants.find(p => p.result === 'winner')
            const losers = match.match_participants.filter(p => p.result !== 'winner')
            const winnerName = winner?.wrestlers?.name ?? winner?.teams?.name ?? '?'
            const loserNames = losers.map(p => p.wrestlers?.name ?? p.teams?.name).filter(Boolean).join(', ')

            return (
              <div key={match.id} style={{
                display: 'grid',
                gridTemplateColumns: '36px 1fr auto',
                gap: '0.75rem',
                alignItems: 'center',
                padding: 'clamp(0.5rem,2vw,0.75rem) clamp(1rem,3vw,1.5rem)',
                borderBottom: '1px solid rgba(42,42,51,0.5)',
              }}>
                <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.1em', fontWeight: 700 }}>
                  #{match.match_number}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.85rem,2.5vw,1rem)', color: 'var(--text-strong)', textTransform: 'uppercase' }}>
                      {winnerName}
                    </span>
                    {loserNames && (
                      <>
                        <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>def.</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.75rem,2vw,0.9rem)', color: 'var(--text-muted)', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                          {loserNames}
                        </span>
                      </>
                    )}
                  </div>
                  <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.08em', marginTop: '0.1rem' }}>
                    {match.match_type}
                    {match.stipulation ? ` · ${match.stipulation}` : ''}
                    {match.is_title_match && match.titles ? ` · ${match.titles.name}` : ''}
                  </p>
                </div>
                {match.rating && (
                  <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    ★ {match.rating}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ArchiveShowList({ shows }: { shows: ArchiveShow[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {shows.map(show => <ShowRow key={show.id} show={show} />)}
    </div>
  )
}
