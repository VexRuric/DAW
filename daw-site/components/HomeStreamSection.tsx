'use client'

import { useEffect, useState } from 'react'

export interface CompactMatch {
  id: string
  matchNumber: number
  matchType: string
  stipulation: string | null
  isTitleMatch: boolean
  titleName: string | null
  hashtag: 'ANDNEW' | 'ANDSTILL' | 'WINNER' | null
  sides: { name: string; image_url: string | null }[]
}

export interface StreamShowInfo {
  id: string
  name: string
  show_date: string
  show_type: string
  ppv_name: string | null
  status: string
}

function formatStreamDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
  const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  return `${day} · ${month} ${d.getDate()}, ${d.getFullYear()}`
}

const HASHTAG_COLOR: Record<string, string> = {
  ANDNEW:   'var(--accent-red)',
  ANDSTILL: 'var(--gold)',
  WINNER:   'var(--purple-hot)',
}

export default function HomeStreamSection({
  show,
  matches,
  channel = 'daware',
}: {
  show: StreamShowInfo | null
  matches: CompactMatch[]
  channel?: string
}) {
  const [playerSrc, setPlayerSrc] = useState('')
  const [chatSrc, setChatSrc] = useState('')

  useEffect(() => {
    const host = window.location.hostname
    setPlayerSrc(`https://player.twitch.tv/?channel=${channel}&parent=${host}&autoplay=false`)
    setChatSrc(`https://www.twitch.tv/embed/${channel}/chat?parent=${host}&darkpopout`)
  }, [channel])

  return (
    <section style={{ padding: '3rem 3rem 4rem', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '2rem', alignItems: 'start' }}>

        {/* LEFT: Twitch stream + chat */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <span style={{ display: 'inline-block', width: 24, height: 1, background: 'var(--purple-hot)' }} />
            <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--purple-hot)', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
              The Stream
            </span>
          </div>

          {/* Player */}
          <div style={{ width: '100%', aspectRatio: '16 / 9', background: '#0e0e10', border: '1px solid var(--border)', overflow: 'hidden' }}>
            {playerSrc ? (
              <iframe
                title="DAW Warehouse Live stream"
                src={playerSrc}
                frameBorder="0"
                allowFullScreen
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 50%, rgba(128,0,218,0.3) 0%, #0e0e10 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Loading Stream…
                </span>
              </div>
            )}
          </div>

          {/* Chat */}
          <div style={{ width: '100%', height: 380, background: '#0e0e10', border: '1px solid var(--border)', borderTop: 'none', overflow: 'hidden' }}>
            {chatSrc ? (
              <iframe
                title="DAW Twitch chat"
                src={chatSrc}
                frameBorder="0"
                style={{ width: '100%', height: '100%', display: 'block', border: 'none' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Loading Chat…
                </span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Match card */}
        <div>
          {show ? (
            <>
              {/* Show header */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  {show.show_type === 'ppv' && (
                    <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', background: 'var(--gold)', color: 'var(--bg-top)', padding: '0.15rem 0.45rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      PAY-PER-VIEW
                    </span>
                  )}
                  <span style={{
                    fontFamily: 'var(--font-meta)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: show.status === 'completed' ? 'var(--accent-red)' : 'var(--purple-hot)',
                  }}>
                    {show.status === 'completed' ? '✓ RESULTS' : 'UPCOMING'}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.15rem' }}>
                  DAW PRESENTS
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 2.2vw, 2rem)', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1, marginBottom: '0.35rem' }}>
                  {show.ppv_name ?? show.name}
                </h2>
                <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
                  {formatStreamDate(show.show_date)}
                  {matches.length > 0 && ` // ${matches.length} MATCH${matches.length !== 1 ? 'ES' : ''}`}
                </div>
              </div>

              {/* Compact match list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: 540, overflowY: 'auto' }}>
                {matches.length === 0 ? (
                  <div style={{ padding: '2rem', background: 'var(--surface)', border: '1px solid var(--border)', fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center' }}>
                    Match card TBA
                  </div>
                ) : (
                  matches.map(m => <MatchRow key={m.id} match={m} />)
                )}
              </div>
            </>
          ) : (
            <div style={{ paddingTop: '2rem' }}>
              <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--purple-hot)', letterSpacing: '0.25em', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                // UPCOMING
              </div>
              <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                No upcoming shows scheduled yet.
              </p>
            </div>
          )}
        </div>

      </div>
    </section>
  )
}

function MatchRow({ match }: { match: CompactMatch }) {
  const left = match.sides[0]
  const right = match.sides[1]

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '0.6rem 0.8rem' }}>
      {/* Participants row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', lineHeight: 1, color: 'var(--purple-hot)', flexShrink: 0, width: 28 }}>
          {String(match.matchNumber).padStart(2, '0')}
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {left?.name ?? 'TBA'}
        </span>
        {match.sides.length >= 2 && (
          <>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', color: 'var(--purple-hot)', flexShrink: 0 }}>VS</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
              {right?.name ?? 'TBA'}
            </span>
          </>
        )}
      </div>

      {/* Badges row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem', paddingLeft: 36, flexWrap: 'wrap' }}>
        {match.isTitleMatch && (
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.5rem', background: 'rgba(255,201,51,0.1)', border: '1px solid var(--gold)', color: 'var(--gold)', padding: '0.1rem 0.35rem', letterSpacing: '0.1em', fontWeight: 700 }}>
            TITLE
          </span>
        )}
        {match.hashtag ? (
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.5rem', color: HASHTAG_COLOR[match.hashtag], letterSpacing: '0.1em', fontWeight: 700 }}>
            #{match.hashtag}
          </span>
        ) : match.isTitleMatch ? (
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            ON THE LINE
          </span>
        ) : null}
        {match.titleName && (
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.5rem', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {match.titleName}
          </span>
        )}
        {match.stipulation && (
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            · {match.stipulation}
          </span>
        )}
        {!match.isTitleMatch && !match.stipulation && (
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {match.matchType}
          </span>
        )}
      </div>
    </div>
  )
}
