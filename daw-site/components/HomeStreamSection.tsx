'use client'

import { useEffect, useState } from 'react'

export interface CompactMatch {
  id: string
  matchNumber: number
  matchType: string
  stipulation: string | null
  isTitleMatch: boolean
  titleName: string | null
  titleImageUrl: string | null
  hashtag: 'ANDNEW' | 'ANDSTILL' | 'WINNER' | null
  sides: { name: string; image_url: string | null }[]
  scheme: 'Match' | 'Promo' | 'Write-In' | null
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

const STIP_COLORS: Record<string, string> = {
  'Extreme': '#ff6b35', 'Weapons': '#ff4444', 'Steel Cage': '#8899aa',
  'Falls Count Anywhere': '#22cc88', 'No Holds Barred': '#ff3355',
  'Iron Man': '#ffc933', 'Ladder': '#4488ff', 'TLC': '#6644ff',
  'Table': '#44aaff', 'No DQ': '#ff2244', 'Elimination Chamber': '#aa44ff',
  'Hardcore': '#cc2222', 'Ambulance': '#aaaacc', 'War Games': '#882288',
  'Casket': '#555577',
}

const YT_PLAYLIST = 'PLJmTlWB_rLnAUfvozUqtODPuxAE3nC004'

export default function HomeStreamSection({
  show,
  matches,
  channel = 'daware',
  youtubePlaylist = YT_PLAYLIST,
}: {
  show: StreamShowInfo | null
  matches: CompactMatch[]
  channel?: string
  youtubePlaylist?: string
}) {
  const [twitchSrc, setTwitchSrc]   = useState('')
  const [chatSrc, setChatSrc]       = useState('')
  const [isLive, setIsLive]         = useState<boolean | null>(null)

  useEffect(() => {
    const host = window.location.hostname
    setTwitchSrc(`https://player.twitch.tv/?channel=${channel}&parent=${host}&autoplay=false`)
    setChatSrc(`https://www.twitch.tv/embed/${channel}/chat?parent=${host}&darkpopout`)

    fetch('/api/stream-status')
      .then(r => r.json())
      .then(d => setIsLive(!!d.live))
      .catch(() => setIsLive(false))
  }, [channel])

  const ytSrc = `https://www.youtube.com/embed/videoseries?list=${youtubePlaylist}&rel=0&modestbranding=1`
  const ytLink = `https://www.youtube.com/playlist?list=${youtubePlaylist}`

  const labelColor  = isLive ? 'var(--purple-hot)' : isLive === false ? 'var(--accent-red)' : 'var(--text-dim)'
  const labelText   = isLive ? '● LIVE NOW · THE STREAM' : isLive === false ? 'ON DEMAND · YOUTUBE PLAYLIST' : 'THE STREAM'

  return (
    <section className="home-stream-section" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="stream-grid">

        {/* LEFT: Twitch when live, YouTube playlist when offline */}
        <div className="stream-video-col">

          {/* Section label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <span style={{ display: 'inline-block', width: 24, height: 1, background: labelColor }} />
            <span style={{
              fontFamily: 'var(--font-meta)', fontSize: '0.65rem',
              color: labelColor, fontWeight: 700,
              letterSpacing: '0.25em', textTransform: 'uppercase',
            }}>
              {labelText}
            </span>
          </div>

          {/* Player — 16:9 */}
          <div style={{
            width: '100%', aspectRatio: '16 / 9',
            background: '#0e0e10', border: '1px solid var(--border)', overflow: 'hidden',
          }}>
            {isLive === true && twitchSrc ? (
              <iframe
                title="DAW Warehouse Live stream"
                src={twitchSrc}
                frameBorder="0"
                allowFullScreen
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            ) : isLive === false ? (
              <iframe
                title="DAW Warehouse YouTube Playlist"
                src={ytSrc}
                frameBorder="0"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'radial-gradient(ellipse at 50% 50%, rgba(128,0,218,0.3) 0%, #0e0e10 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Loading…
                </span>
              </div>
            )}
          </div>

          {/* Twitch chat — only when live */}
          {isLive === true && (
            <div style={{
              width: '100%', height: 380,
              background: '#0e0e10',
              border: '1px solid var(--border)', borderTop: 'none',
              overflow: 'hidden',
            }}>
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
          )}

          {/* YouTube footer note — only when offline */}
          {isLive === false && (
            <div style={{
              padding: '0.65rem 0',
              borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '1rem',
            }}>
              <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Watch previous shows
              </span>
              <a
                href={ytLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--accent-red)', letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}
              >
                Open Playlist →
              </a>
            </div>
          )}
        </div>

        {/* RIGHT: Match card — stretches to fill the left column height */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
          {show ? (
            <>
              {/* Show header */}
              <div className="stream-show-header" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  {show.show_type === 'ppv' && (
                    <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', background: 'var(--gold)', color: 'var(--bg-top)', padding: '0.15rem 0.45rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      PAY-PER-VIEW
                    </span>
                  )}
                  <span style={{
                    fontFamily: 'var(--font-meta)', fontSize: '0.55rem', fontWeight: 700,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
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

              {/* Compact match list — fills remaining height, scrolls if needed */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {matches.length === 0 && show.status !== 'completed' ? (
                  // Upcoming show with no matchcard yet — show mystery slots
                  Array.from({ length: show.show_type === 'ppv' ? 12 : 9 }, (_, i) => (
                    <MysteryRow
                      key={i}
                      matchNumber={i + 1}
                      isMainEvent={i === (show.show_type === 'ppv' ? 11 : 8)}
                    />
                  ))
                ) : matches.length === 0 ? (
                  <div style={{ padding: '2rem', background: 'var(--surface)', border: '1px solid var(--border)', fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center' }}>
                    No matches on record.
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

function MysteryRow({ matchNumber, isMainEvent }: { matchNumber: number; isMainEvent: boolean }) {
  return (
    <div className="match-row" style={{ background: 'var(--surface)', border: `1px solid ${isMainEvent ? 'rgba(255,201,51,0.2)' : 'var(--border)'}`, flexShrink: 0, opacity: 0.45 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', lineHeight: 1, color: isMainEvent ? 'var(--gold)' : 'var(--purple-hot)', flexShrink: 0, width: 28 }}>
          {String(matchNumber).padStart(2, '0')}
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', lineHeight: 1.1, flex: 1 }}>
          Mystery
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', color: 'var(--purple-hot)', flexShrink: 0 }}>VS</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', lineHeight: 1.1, flex: 1, textAlign: 'right' }}>
          Mystery
        </span>
      </div>
      {isMainEvent && (
        <div style={{ paddingLeft: 36, marginTop: '0.3rem' }}>
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.5rem', color: 'var(--gold)', letterSpacing: '0.1em', fontWeight: 700 }}>★ MAIN EVENT</span>
        </div>
      )}
    </div>
  )
}

const NAME_LIMIT = 4

function MatchRow({ match }: { match: CompactMatch }) {
  const sides = match.sides
  const isPromo   = match.scheme === 'Promo'
  const isWriteIn = match.scheme === 'Write-In'
  const isSpecial = isPromo || isWriteIn
  const isMassMatch = match.matchType === 'Battle Royal' || match.matchType === 'Royal Rumble'
  const stipParts = match.stipulation
    ? match.stipulation.split(', ').map(s => s.trim()).filter(Boolean)
    : []

  const hiddenCount = Math.max(0, sides.length - NAME_LIMIT)
  const [expanded, setExpanded] = useState(false)

  const toggleStyle: React.CSSProperties = {
    fontFamily: 'var(--font-meta)',
    fontSize: '0.44rem',
    color: 'var(--purple-hot)',
    letterSpacing: '0.1em',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    display: 'block',
    marginTop: '0.15rem',
    textTransform: 'uppercase',
    textAlign: 'left',
  }

  return (
    <div className="match-row" style={{ background: 'var(--surface)', border: '1px solid var(--border)', flexShrink: 0, overflow: 'hidden' }}>
      {/* Participants row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', lineHeight: 1, color: 'var(--purple-hot)', flexShrink: 0, width: 28 }}>
          {String(match.matchNumber).padStart(2, '0')}
        </span>

        {isSpecial ? (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', lineHeight: 1.1, flex: 1 }}>
            {isPromo ? 'Promo' : 'Other'}
          </span>
        ) : isMassMatch ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1, display: 'block' }}>
              {sides.length > 0 ? `${sides.length}-Man ` : ''}{match.matchType}
            </span>
            {sides.length > 0 && (
              <>
                <span style={{
                  fontFamily: 'var(--font-meta)', fontSize: '0.48rem', color: 'var(--text-dim)',
                  letterSpacing: '0.05em', display: 'block',
                  ...(expanded
                    ? { whiteSpace: 'normal', wordBreak: 'break-word' }
                    : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
                }}>
                  {expanded
                    ? sides.map(s => s.name).join(' · ')
                    : sides.slice(0, NAME_LIMIT).map(s => s.name).join(' · ')}
                </span>
                {hiddenCount > 0 && (
                  <button style={toggleStyle} onClick={() => setExpanded(e => !e)}>
                    {expanded ? '▲ show less' : `+${hiddenCount} more`}
                  </button>
                )}
              </>
            )}
          </div>
        ) : sides.length <= 2 ? (
          <>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sides[0]?.name ?? 'TBA'}
            </span>
            {sides.length >= 2 && (
              <>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', color: 'var(--purple-hot)', flexShrink: 0 }}>VS</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {sides[1]?.name ?? 'TBA'}
                </span>
              </>
            )}
          </>
        ) : (
          /* Triple Threat / Fatal 4-Way / etc. — up to 4 names, expandable */
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.78rem', color: 'var(--text-strong)',
              textTransform: 'uppercase', lineHeight: 1.3, display: 'block',
              ...(expanded
                ? { whiteSpace: 'normal', wordBreak: 'break-word' }
                : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
            }}>
              {expanded
                ? sides.map(s => s.name).join(' vs ')
                : sides.slice(0, NAME_LIMIT).map(s => s.name).join(' vs ')}
            </span>
            {hiddenCount > 0 && (
              <button style={toggleStyle} onClick={() => setExpanded(e => !e)}>
                {expanded ? '▲ show less' : `+${hiddenCount} more`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Badges row — hidden for Promo/Write-In segments */}
      {!isSpecial && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem', paddingLeft: 36, flexWrap: 'wrap' }}>
        {match.isTitleMatch && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'var(--font-meta)', fontSize: '0.5rem', background: 'rgba(255,201,51,0.1)', border: '1px solid var(--gold)', color: 'var(--gold)', padding: '0.1rem 0.35rem', letterSpacing: '0.1em', fontWeight: 700 }}>
            {match.titleImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.titleImageUrl} alt="" style={{ height: 18, maxWidth: 44, objectFit: 'contain', display: 'block' }} />
            )}
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
        {stipParts.map(tag => (
          <span key={tag} style={{ fontFamily: 'var(--font-meta)', fontSize: '0.48rem', color: STIP_COLORS[tag] ?? 'var(--text-dim)', border: `1px solid ${STIP_COLORS[tag] ? STIP_COLORS[tag] + '55' : 'var(--border)'}`, padding: '0.08rem 0.3rem', letterSpacing: '0.08em', fontWeight: 700 }}>
            {tag}
          </span>
        ))}
        {!match.isTitleMatch && stipParts.length === 0 && (
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {match.matchType}
          </span>
        )}
      </div>}
    </div>
  )
}
