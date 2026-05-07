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
  sides: { name: string; image_url: string | null; isLogo?: boolean; members?: { name: string; image_url: string | null }[] }[]
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
  showImages = true,
  showFactionLogos = true,
}: {
  show: StreamShowInfo | null
  matches: CompactMatch[]
  channel?: string
  youtubePlaylist?: string
  showImages?: boolean
  showFactionLogos?: boolean
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
                  matches.map(m => <MatchRow key={m.id} match={m} showImages={showImages} showFactionLogos={showFactionLogos} />)
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

// size accepts px number or CSS string (e.g. clamp(...)) for responsive sizing
// contain=true for logos/badges (objectFit contain); false/default for wrestler renders (cover + top crop)
function WrestlerAvatar({ src, name, size = 34, contain = false }: { src: string | null; name: string; size?: number | string; contain?: boolean }) {
  if (!src) return null
  return (
    <div style={{ width: size, height: size, flexShrink: 0, overflow: 'hidden', background: 'rgba(0,0,0,0.35)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: contain ? 'contain' : 'cover', objectPosition: contain ? 'center' : 'top center', display: 'block' }} />
    </div>
  )
}

function MatchBadges({ match, stipParts, center }: { match: CompactMatch; stipParts: string[]; center?: boolean }) {
  const justify = center ? 'center' : undefined
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: center ? 'center' : 'flex-start', gap: '0.18rem' }}>
      {/* Row 1: match type + stipulation tags + non-title result hashtag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', justifyContent: justify }}>
        <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.46rem', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {match.matchType}
        </span>
        {stipParts.map(tag => (
          <span key={tag} style={{ fontFamily: 'var(--font-meta)', fontSize: '0.44rem', color: STIP_COLORS[tag] ?? 'var(--text-dim)', border: `1px solid ${STIP_COLORS[tag] ? STIP_COLORS[tag] + '55' : 'var(--border)'}`, padding: '0.04rem 0.22rem', letterSpacing: '0.08em', fontWeight: 700 }}>{tag}</span>
        ))}
        {match.hashtag && !match.isTitleMatch && (
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.46rem', color: HASHTAG_COLOR[match.hashtag], letterSpacing: '0.1em', fontWeight: 700 }}>#{match.hashtag}</span>
        )}
      </div>
      {/* Row 2: title info on its own line */}
      {match.isTitleMatch && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', justifyContent: justify }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontFamily: 'var(--font-meta)', fontSize: '0.44rem', background: 'rgba(255,201,51,0.12)', border: '1px solid var(--gold)', color: 'var(--gold)', padding: '0.04rem 0.28rem', letterSpacing: '0.1em', fontWeight: 700 }}>
            {match.titleImageUrl && <img src={match.titleImageUrl} alt="" style={{ height: 14, maxWidth: 36, objectFit: 'contain', display: 'block' }} />}
            {match.hashtag ? `#${match.hashtag}` : 'TITLE ON THE LINE'}
          </span>
          {match.titleName && (
            <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.44rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{match.titleName}</span>
          )}
        </div>
      )}
    </div>
  )
}

function MatchRow({ match, showImages = true, showFactionLogos = true }: { match: CompactMatch; showImages?: boolean; showFactionLogos?: boolean }) {
  const sides             = match.sides
  const isPromo           = match.scheme === 'Promo'
  const isMassMatch       = match.matchType === 'Battle Royal' || match.matchType === 'Royal Rumble'
  const stipParts         = match.stipulation ? match.stipulation.split(', ').map(s => s.trim()).filter(Boolean) : []
  const hiddenCount       = Math.max(0, sides.length - NAME_LIMIT)
  const [expanded, setExpanded] = useState(false)
  const hasMembers = sides.some(s => s.members && s.members.length > 0)

  const numColor  = match.isTitleMatch ? 'var(--gold)' : 'var(--purple-hot)'
  const rowBorder = match.isTitleMatch
    ? '2px solid rgba(255,201,51,0.35)'
    : isPromo
    ? '2px solid rgba(128,0,218,0.25)'
    : '1px solid var(--border)'

  // True when this side should render as a single logo image (contain mode).
  // False when it should show multiple member renders or a single wrestler render.
  function sideUsesLogo(idx: number): boolean {
    return !!(sides[idx]?.isLogo && showFactionLogos && sides[idx]?.image_url)
  }

  // For non-logo sides: fallback single image (solo wrestler or first member when no members array).
  function sideImg(idx: number): string | null {
    const side = sides[idx]
    if (!side) return null
    if (sideUsesLogo(idx)) return side.image_url
    return side.image_url ?? side.members?.[0]?.image_url ?? null
  }

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', background: 'var(--surface)', borderBottom: rowBorder, flexShrink: 0, overflow: 'hidden' }}>

      {/* Number column */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, flexShrink: 0, background: 'rgba(0,0,0,0.25)', borderRight: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', lineHeight: 1, color: numColor, opacity: 0.9 }}>
          {String(match.matchNumber).padStart(2, '0')}
        </span>
      </div>

      {/* Content column */}
      <div style={{ flex: 1, minWidth: 0, padding: '0.45rem 0.6rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.25rem' }}>

        {/* --- PROMO --- */}
        {isPromo ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.46rem', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--purple-hot)', background: 'rgba(128,0,218,0.12)', border: '1px solid rgba(128,0,218,0.3)', padding: '0.12rem 0.4rem', flexShrink: 0 }}>
                PROMO
              </span>
              {sides.length > 0 ? sides.map((s, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {i > 0 && <span style={{ fontFamily: 'var(--font-meta)', color: 'var(--text-dim)', fontSize: '0.5rem', opacity: 0.5 }}>&amp;</span>}
                  {showImages && <WrestlerAvatar src={s.image_url} name={s.name} size="clamp(28px, 7vw, 36px)" />}
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.75rem, 3vw, 0.9rem)', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1 }}>
                    {s.name}
                  </span>
                </span>
              )) : (
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--text-dim)', textTransform: 'uppercase', lineHeight: 1 }}>
                  TBA
                </span>
              )}
            </div>
            <MatchBadges match={match} stipParts={stipParts} center />
          </>

        /* --- BATTLE ROYAL / ROYAL RUMBLE — names only, no images (too many wrestlers) --- */
        ) : isMassMatch ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1 }}>
                {sides.length > 0 ? `${sides.length}-Man ` : ''}{match.matchType}
              </span>
              {stipParts.map(tag => (
                <span key={tag} style={{ fontFamily: 'var(--font-meta)', fontSize: '0.44rem', color: STIP_COLORS[tag] ?? 'var(--text-dim)', border: `1px solid ${STIP_COLORS[tag] ? STIP_COLORS[tag] + '55' : 'var(--border)'}`, padding: '0.05rem 0.25rem', letterSpacing: '0.08em', fontWeight: 700 }}>{tag}</span>
              ))}
            </div>
            {sides.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', flexWrap: expanded ? 'wrap' : 'nowrap', overflow: 'hidden' }}>
                {(expanded ? sides : sides.slice(0, NAME_LIMIT)).map((s, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', flexShrink: 0 }}>
                    {i > 0 && <span style={{ color: 'var(--text-dim)', opacity: 0.35, fontSize: '0.45rem', flexShrink: 0 }}>·</span>}
                    <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.48rem', color: 'var(--text-dim)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.name}</span>
                  </span>
                ))}
                {hiddenCount > 0 && !expanded && (
                  <button onClick={() => setExpanded(true)} style={{ fontFamily: 'var(--font-meta)', fontSize: '0.44rem', color: 'var(--purple-hot)', letterSpacing: '0.1em', background: 'none', border: 'none', padding: '0 0.25rem', cursor: 'pointer', flexShrink: 0 }}>+{hiddenCount} more</button>
                )}
              </div>
            )}
          </>

        /* --- STANDARD 2-SIDE (singles / tag / faction) — fully centered --- */
        ) : sides.length <= 2 ? (
          <>
            {/* VS names row — centered */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* Side A: images left of name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, maxWidth: 'clamp(120px, 45%, 300px)' }}>
                {showImages && (
                  sideUsesLogo(0)
                    ? <WrestlerAvatar src={sides[0]!.image_url} name={sides[0]!.name} size="clamp(36px, 10vw, 52px)" contain />
                    : (sides[0]?.members ?? []).length > 0
                      ? <div style={{ display: 'flex', gap: '0.1rem', flexShrink: 0 }}>
                          {(sides[0]?.members ?? []).map((m, i) => <WrestlerAvatar key={i} src={m.image_url} name={m.name} size="clamp(30px, 8vw, 46px)" />)}
                        </div>
                      : <WrestlerAvatar src={sideImg(0)} name={sides[0]?.name ?? ''} size="clamp(36px, 10vw, 52px)" />
                )}
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.72rem, 3.5vw, 0.95rem)', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sides[0]?.name ?? 'TBA'}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', color: 'var(--purple-hot)', flexShrink: 0, opacity: 0.8 }}>VS</span>
              {/* Side B: name left of images */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, maxWidth: 'clamp(120px, 45%, 300px)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.72rem, 3.5vw, 0.95rem)', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sides[1]?.name ?? 'TBA'}
                </span>
                {showImages && (
                  sideUsesLogo(1)
                    ? <WrestlerAvatar src={sides[1]!.image_url} name={sides[1]!.name} size="clamp(36px, 10vw, 52px)" contain />
                    : (sides[1]?.members ?? []).length > 0
                      ? <div style={{ display: 'flex', gap: '0.1rem', flexShrink: 0 }}>
                          {(sides[1]?.members ?? []).map((m, i) => <WrestlerAvatar key={i} src={m.image_url} name={m.name} size="clamp(30px, 8vw, 46px)" />)}
                        </div>
                      : <WrestlerAvatar src={sideImg(1)} name={sides[1]?.name ?? ''} size="clamp(36px, 10vw, 52px)" />
                )}
              </div>
            </div>
            {/* Member name row — names only (images already shown above when multi-image mode) */}
            {hasMembers && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {(sides[0]?.members ?? []).map((m, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      {i > 0 && <span style={{ color: 'var(--text-dim)', opacity: 0.3, fontSize: '0.4rem' }}>·</span>}
                      {/* Only show small avatar here when the VS row is using a logo (to avoid duplicate renders) */}
                      {showImages && sideUsesLogo(0) && <WrestlerAvatar src={m.image_url} name={m.name} size="clamp(18px, 5vw, 26px)" />}
                      <span style={{ fontFamily: 'var(--font-meta)', fontSize: 'clamp(0.36rem, 1.5vw, 0.44rem)', color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{m.name}</span>
                    </span>
                  ))}
                </div>
                <span style={{ color: 'var(--border)', fontSize: '0.5rem', opacity: 0.5, flexShrink: 0 }}>|</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {(sides[1]?.members ?? []).map((m, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      {i > 0 && <span style={{ color: 'var(--text-dim)', opacity: 0.3, fontSize: '0.4rem' }}>·</span>}
                      {showImages && sideUsesLogo(1) && <WrestlerAvatar src={m.image_url} name={m.name} size="clamp(18px, 5vw, 26px)" />}
                      <span style={{ fontFamily: 'var(--font-meta)', fontSize: 'clamp(0.36rem, 1.5vw, 0.44rem)', color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{m.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <MatchBadges match={match} stipParts={stipParts} center />
          </>

        /* --- MULTI-PERSON (Triple Threat, Fatal 4-Way, etc.) — centered --- */
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              {(expanded ? sides : sides.slice(0, NAME_LIMIT)).map((s, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                  {i > 0 && <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.5rem', color: 'var(--purple-hot)', opacity: 0.6, flexShrink: 0 }}>vs</span>}
                  {showImages && <WrestlerAvatar src={s.image_url} name={s.name} size="clamp(28px, 7vw, 36px)" />}
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(0.7rem, 3vw, 0.85rem)', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1 }}>{s.name}</span>
                </span>
              ))}
              {hiddenCount > 0 && !expanded && (
                <button onClick={() => setExpanded(true)} style={{ fontFamily: 'var(--font-meta)', fontSize: '0.44rem', color: 'var(--purple-hot)', letterSpacing: '0.1em', background: 'none', border: 'none', padding: '0 0.25rem', cursor: 'pointer', flexShrink: 0 }}>+{hiddenCount} more</button>
              )}
            </div>
            <MatchBadges match={match} stipParts={stipParts} center />
          </>
        )}
      </div>
    </div>
  )
}
