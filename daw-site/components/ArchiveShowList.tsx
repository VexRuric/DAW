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
  scheme?: string | null
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
  stream_url?: string | null
  matches: Match[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function pName(p: Participant): string {
  return p.wrestlers?.name ?? p.teams?.name ?? '?'
}

function getPerSide(matchType: string, total: number): number[] {
  switch (matchType) {
    case 'Tag Team':      return total === 6 ? [3, 3] : [2, 2]
    case 'Triple Threat': return [1, 1, 1]
    case 'Fatal 4-Way':   return [1, 1, 1, 1]
    case 'Gauntlet':      return [1, 1, 1, 1, 1, 1]
    case 'Battle Royal':  return Array(total).fill(1)
    case 'Royal Rumble':  return Array(total).fill(1)
    case 'Handicap':      return [2, 1]
    default:              return [1, 1]
  }
}

function buildMatchDisplay(match: Match): { winnerStr: string; loserStr: string } | { promoStr: string } {
  const parts = match.match_participants
  if (match.scheme === 'Promo') {
    const subject = parts.find(p => p.result === 'winner') ?? parts[0] ?? null
    return { promoStr: subject ? pName(subject) : '' }
  }

  const isSided = match.match_type === 'Tag Team' || match.match_type === 'Handicap'
  if (isSided && parts.length > 0) {
    const perSide = getPerSide(match.match_type, parts.length)
    let idx = 0
    const sides = perSide.map(n => { const s = parts.slice(idx, idx + n); idx += n; return s })
    const winnerSideIdx = sides.findIndex(side => side.some(p => p.result === 'winner'))
    if (winnerSideIdx >= 0) {
      const winnerStr = sides[winnerSideIdx].map(pName).join(' & ')
      const loserStr = sides
        .filter((_, i) => i !== winnerSideIdx)
        .map(side => side.map(pName).join(' & '))
        .join(' vs ')
      return { winnerStr, loserStr }
    }
  }

  const winner = parts.find(p => p.result === 'winner')
  const losers = parts.filter(p => p.result !== 'winner')
  return {
    winnerStr: winner ? pName(winner) : '?',
    loserStr: losers.map(pName).filter(Boolean).join(', '),
  }
}

function ShowRow({ show }: { show: ArchiveShow }) {
  const [expanded, setExpanded] = useState(false)
  const isPPV = show.show_type === 'ppv'
  const sortedMatches = [...(show.matches ?? [])].sort(
    (a, b) => a.match_number - b.match_number
  )

  return (
    <div style={{ border: isPPV ? '2px solid var(--gold)' : '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Show header row: expand button + optional Watch link */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
            padding: 0,
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
        {show.stream_url && (
          <a
            href={show.stream_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', padding: '0 1.1rem',
              background: 'rgba(255,0,0,0.08)', borderLeft: '1px solid rgba(255,0,0,0.25)',
              fontFamily: 'var(--font-meta)', fontSize: '0.6rem', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none',
              color: '#ff4444', whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,0,0,0.18)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,0,0,0.08)' }}
          >
            ▶ Watch
          </a>
        )}
      </div>

      {/* Expandable match list */}
      {expanded && (
        <div style={{ background: 'var(--bg-mid)' }}>
          {sortedMatches.map((match) => {
            const display = buildMatchDisplay(match)
            const isPromo = 'promoStr' in display
            const displayType = match.scheme === 'Promo' ? 'Promo' : match.match_type

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
                    {isPromo ? (
                      <>
                        {display.promoStr && (
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.85rem,2.5vw,1rem)', color: 'var(--text-strong)', textTransform: 'uppercase' }}>
                            {display.promoStr}
                          </span>
                        )}
                        {match.stipulation && (
                          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                            — {match.stipulation}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.85rem,2.5vw,1rem)', color: 'var(--text-strong)', textTransform: 'uppercase' }}>
                          {display.winnerStr}
                        </span>
                        {display.loserStr && (
                          <>
                            <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>def.</span>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.75rem,2vw,0.9rem)', color: 'var(--text-muted)', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                              {display.loserStr}
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.08em', marginTop: '0.1rem' }}>
                    {displayType}
                    {match.stipulation && !isPromo ? ` · ${match.stipulation}` : ''}
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
