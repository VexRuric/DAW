'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type RecentMatch = {
  id: string
  match_type: string
  stipulation: string | null
  is_title_match: boolean
  is_draw: boolean
  shows: { name: string; show_date: string; show_type: string; ppv_name: string | null }
  titles: { name: string } | null
  match_participants: {
    result: string
    wrestlers: { id: string; name: string; render_url: string | null } | null
    teams: { id: string; name: string } | null
  }[]
}

interface HomepageClientProps {
  recentMatches: RecentMatch[]
  upcomingMatches: {
    id: string
    match_number: number
    match_type: string
    stipulation: string | null
    is_title_match: boolean
    is_draw: boolean
    titles: { name: string } | null
    match_participants: {
      result: string
      wrestlers: { id: string; name: string; render_url: string | null } | null
      teams: { id: string; name: string } | null
    }[]
  }[]
  nextShow: { name: string; show_date: string; show_type: string; ppv_name: string | null } | null
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase()
}

function getWinner(participants: RecentMatch['match_participants']) {
  return participants.find((p) => p.result === 'winner')
}

function getHashtag(match: RecentMatch) {
  if (match.is_draw) return { text: '#DRAW', cls: 'draw' }
  if (match.is_title_match) {
    const winner = getWinner(match.match_participants)
    return winner ? { text: '#ANDNEW', cls: 'new' } : { text: '#ANDSTILL', cls: 'still' }
  }
  return { text: '#WINNER', cls: 'winner' }
}

function ParticipantName({ p }: { p: RecentMatch['match_participants'][0] }) {
  const name = p.wrestlers?.name ?? p.teams?.name ?? '???'
  return <>{name}</>
}

export default function HomepageClient({ recentMatches, upcomingMatches, nextShow }: HomepageClientProps) {
  const [featuredIdx, setFeaturedIdx] = useState(0)
  const [tickerIdx, setTickerIdx] = useState(0)
  const [showMode, setShowMode] = useState<'weekly' | 'ppv'>('weekly')
  const featuredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetFeaturedTimer = (idx: number) => {
    if (featuredTimerRef.current) clearTimeout(featuredTimerRef.current)
    featuredTimerRef.current = setTimeout(() => {
      setFeaturedIdx((i) => (i + 1) % Math.max(recentMatches.length, 1))
    }, 7000)
    setFeaturedIdx(idx)
  }

  useEffect(() => {
    resetFeaturedTimer(0)
    return () => { if (featuredTimerRef.current) clearTimeout(featuredTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentMatches.length])

  const featured = recentMatches[featuredIdx]
  const isPPVNext = nextShow?.show_type === 'ppv'

  return (
    <>
      {/* ============ FEATURED RESULT BANNER ============ */}
      <section
        style={{
          position: 'relative',
          padding: '3rem 3rem 4rem',
          borderBottom: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 80% 50%, rgba(128,0,218,0.2) 0%, transparent 60%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Label */}
          <div className="section-label">Latest Results</div>

          {featured ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: '2.5rem',
                alignItems: 'stretch',
              }}
            >
              {/* Main featured */}
              <div>
                <FeaturedMainCard match={featured} />
                {/* Progress dots */}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1rem' }}>
                  {recentMatches.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => resetFeaturedTimer(i)}
                      style={{
                        flex: 1,
                        height: 3,
                        background: i === featuredIdx ? 'var(--border-hot)' : 'var(--border)',
                        border: 'none',
                        cursor: 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'background 0.2s',
                      }}
                    >
                      {i === featuredIdx && (
                        <span
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'var(--purple-hot)',
                            transformOrigin: 'left',
                            animation: 'progress-bar 7s linear forwards',
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Side list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2rem',
                    lineHeight: 1,
                    color: 'var(--text-strong)',
                    textTransform: 'uppercase',
                  }}
                >
                  Recent Results
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {recentMatches.slice(0, 4).map((match, i) => (
                    <MiniResultCard
                      key={match.id}
                      match={match}
                      active={i === featuredIdx}
                      onClick={() => resetFeaturedTimer(i)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-meta)', fontSize: '0.8rem', letterSpacing: '0.15em' }}>
              No results yet — enter your first match in the admin panel.
            </div>
          )}
        </div>
      </section>

      {/* ============ MATCH CARD TICKER ============ */}
      <section
        style={{
          padding: '4rem 3rem',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.75rem',
                color: 'var(--text-strong)',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              {nextShow ? (nextShow.ppv_name ?? nextShow.name) : 'Upcoming Show'}
            </h2>
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', color: 'var(--purple-hot)', letterSpacing: '0.2em', marginTop: '0.3rem' }}>
              {nextShow ? formatDate(nextShow.show_date) : '—'}
              {isPPVNext && (
                <span style={{ marginLeft: '0.75rem', background: 'var(--gold)', color: 'var(--bg-top)', padding: '0.15rem 0.4rem', fontSize: '0.6rem' }}>
                  ★ PPV
                </span>
              )}
            </p>
          </div>

          <div className="tab-group">
            <button
              className={`tab${showMode === 'weekly' ? ' active' : ''}`}
              onClick={() => setShowMode('weekly')}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
              Weekly
            </button>
            <button
              className={`tab${showMode === 'ppv' ? ' active' : ''}`}
              onClick={() => setShowMode('ppv')}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
              PPV
            </button>
          </div>
        </div>

        {upcomingMatches.length > 0 ? (
          <>
            <MatchTickerSlide match={upcomingMatches[tickerIdx]} idx={tickerIdx} total={upcomingMatches.length} />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {upcomingMatches.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setTickerIdx(i)}
                  className={`tab${i === tickerIdx ? ' active' : ''}`}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}
                >
                  Match {i + 1}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '4rem 3rem',
              textAlign: 'center',
            }}
          >
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.2em' }}>
              MATCH CARD NOT YET ANNOUNCED
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: 'var(--border)', marginTop: '0.5rem', textTransform: 'uppercase' }}>
              TBA
            </p>
          </div>
        )}
      </section>

      {/* ============ RECENT MATCHES NEWS GRID ============ */}
      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Match Results</h2>
          <Link href="/archive" className="btn btn-ghost">View All →</Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.5rem',
          }}
        >
          {recentMatches.slice(0, 6).map((match) => (
            <NewsMatchCard key={match.id} match={match} />
          ))}
        </div>
      </section>

      {/* ============ COMMUNITY CTA STRIP ============ */}
      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Join The Community</h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
          }}
        >
          {[
            {
              label: 'Watch Live',
              title: 'Twitch',
              desc: 'Every show streamed live. Results recorded in real time.',
              href: 'https://twitch.tv/daware',
              color: 'var(--purple-hot)',
            },
            {
              label: 'Community',
              title: 'Discord',
              desc: 'Match cards, alerts, story discussions — all in #daw-channel.',
              href: 'https://discord.gg/daw',
              color: '#7289da',
            },
            {
              label: 'Fan Portal',
              title: 'Create a Wrestler',
              desc: 'Submit your character. Get hired. Appear on the show.',
              href: '/portal',
              color: 'var(--gold)',
            },
          ].map(({ label, title, desc, href, color }) => (
            <Link
              key={href}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              style={{
                padding: '2rem',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
              data-hover
            >
              <span
                style={{
                  fontFamily: 'var(--font-meta)',
                  fontSize: '0.7rem',
                  letterSpacing: '0.2em',
                  color,
                  fontWeight: 700,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2rem',
                  lineHeight: 1,
                  color: 'var(--text-strong)',
                  textTransform: 'uppercase',
                }}
              >
                {title}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                {desc}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.3rem',
                  color,
                  marginTop: '1rem',
                  letterSpacing: '0.1em',
                }}
              >
                JOIN →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}

/* ---- Sub-components ---- */

function FeaturedMainCard({ match }: { match: RecentMatch }) {
  const winner = getWinner(match.match_participants)
  const hashtag = getHashtag(match)
  const winnerName = winner?.wrestlers?.name ?? winner?.teams?.name ?? 'Unknown'
  const show = match.shows

  return (
    <div style={{ position: 'relative' }}>
      {/* Image area */}
      <div
        style={{
          aspectRatio: '16/9',
          overflow: 'hidden',
          background: 'var(--surface)',
          position: 'relative',
        }}
      >
        {winner?.wrestlers?.render_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={winner.wrestlers.render_url}
            alt={winnerName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          />
        ) : (
          <FeaturedPlaceholder name={winnerName} />
        )}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 40%, transparent 70%)',
          }}
        />

        {/* Hashtag badge */}
        <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', zIndex: 3 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.75rem',
              lineHeight: 1,
              letterSpacing: '0.02em',
              padding: '0.3rem 0.85rem',
              color: '#fff',
              background:
                hashtag.cls === 'still'
                  ? 'var(--gold)'
                  : hashtag.cls === 'winner'
                  ? 'var(--purple)'
                  : 'var(--accent-red)',
              display: 'inline-block',
            }}
          >
            {hashtag.text}
          </span>
        </div>

        {/* Content overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '1.5rem 1.5rem 1.25rem',
            zIndex: 3,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
              lineHeight: 0.95,
              color: '#fff',
              letterSpacing: '0.01em',
              textShadow: '0 2px 16px rgba(0,0,0,0.8)',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
            }}
          >
            {winnerName}
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-meta)',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: 'var(--text-muted)',
              fontWeight: 700,
            }}
          >
            {match.is_title_match && match.titles ? `${match.titles.name} · ` : ''}
            {show.ppv_name ?? show.name} · {formatDate(show.show_date)}
          </p>
        </div>
      </div>
    </div>
  )
}

function FeaturedPlaceholder({ name }: { name: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1a0535 0%, #07050a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(3rem, 8vw, 6rem)',
          color: 'rgba(168,77,255,0.15)',
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          textAlign: 'center',
          padding: '0 1rem',
        }}
      >
        {name}
      </span>
    </div>
  )
}

function MiniResultCard({
  match,
  active,
  onClick,
}: {
  match: RecentMatch
  active: boolean
  onClick: () => void
}) {
  const winner = getWinner(match.match_participants)
  const hashtag = getHashtag(match)
  const winnerName = winner?.wrestlers?.name ?? winner?.teams?.name ?? 'Unknown'

  return (
    <button
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 1fr',
        gap: '0.75rem',
        background: active ? 'var(--surface-2)' : 'var(--surface)',
        border: `1px solid ${active ? 'var(--purple)' : 'var(--border)'}`,
        transition: 'border-color 0.2s, background 0.2s',
        textAlign: 'left',
        cursor: 'none',
        width: '100%',
      }}
    >
      {/* Thumb */}
      <div
        style={{
          aspectRatio: '1',
          background: 'var(--surface-2)',
          overflow: 'hidden',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {winner?.wrestlers?.render_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={winner.wrestlers.render_url}
            alt={winnerName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--surface-3)' }} />
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '0.6rem 0.6rem 0.6rem 0', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.2rem' }}>
        <span
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: '0.6rem',
            color:
              hashtag.cls === 'still'
                ? 'var(--gold)'
                : hashtag.cls === 'winner'
                ? 'var(--purple-hot)'
                : 'var(--accent-red)',
            letterSpacing: '0.15em',
            fontWeight: 700,
          }}
        >
          {hashtag.text}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.05rem',
            lineHeight: 1.05,
            color: 'var(--text-strong)',
            textTransform: 'uppercase',
          }}
        >
          {winnerName}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: '0.58rem',
            color: 'var(--text-dim)',
            letterSpacing: '0.12em',
          }}
        >
          {formatDate(match.shows.show_date)}
        </span>
      </div>
    </button>
  )
}

function MatchTickerSlide({
  match,
  idx,
  total,
}: {
  match: HomepageClientProps['upcomingMatches'][0]
  idx: number
  total: number
}) {
  const participants = match.match_participants
  const side1 = participants.slice(0, Math.ceil(participants.length / 2))
  const side2 = participants.slice(Math.ceil(participants.length / 2))

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        padding: '2rem 2.5rem',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid var(--border)',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '4rem',
              lineHeight: 1,
              color: 'var(--purple-hot)',
            }}
          >
            {idx + 1}
          </span>
          <div>
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.2em' }}>
              OF {total}
            </p>
            <span className="pill pill-ghost">{match.match_type}</span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          {match.stipulation && (
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', color: 'var(--gold)', letterSpacing: '0.2em', fontWeight: 700, marginBottom: '0.25rem' }}>
              {match.stipulation}
            </p>
          )}
          {match.is_title_match && match.titles && (
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--text-strong)', lineHeight: 1, textTransform: 'uppercase' }}>
              {match.titles.name}
            </p>
          )}
        </div>
      </div>

      {/* VS layout */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2rem',
          flexWrap: 'wrap',
        }}
      >
        <ParticipantGroup participants={side1} />

        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '6rem',
            lineHeight: 1,
            color: 'var(--purple-hot)',
            textShadow: '0 0 20px rgba(168,77,255,0.6)',
            flexShrink: 0,
          }}
        >
          VS
        </span>

        <ParticipantGroup participants={side2} />
      </div>
    </div>
  )
}

function ParticipantGroup({
  participants,
}: {
  participants: HomepageClientProps['upcomingMatches'][0]['match_participants']
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
      {participants.map((p, i) => {
        const name = p.wrestlers?.name ?? p.teams?.name ?? '???'
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div
              style={{
                width: 120,
                height: 160,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                marginBottom: '0.75rem',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {p.wrestlers?.render_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.wrestlers.render_url}
                  alt={name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, var(--surface-2) 0%, var(--surface-3) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg viewBox="0 0 100 140" style={{ width: '60%', height: '60%', opacity: 0.12 }} fill="white">
                    <ellipse cx="50" cy="22" rx="16" ry="18" />
                    <path d="M20 140 Q25 90 50 80 Q75 90 80 140Z" />
                    <path d="M50 80 Q30 85 18 110 L30 115 Q38 95 50 90Z" />
                    <path d="M50 80 Q70 85 82 110 L70 115 Q62 95 50 90Z" />
                  </svg>
                </div>
              )}
            </div>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                lineHeight: 1,
                color: 'var(--text-strong)',
                textTransform: 'uppercase',
              }}
            >
              {name}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function NewsMatchCard({ match }: { match: RecentMatch }) {
  const winner = getWinner(match.match_participants)
  const hashtag = getHashtag(match)
  const winnerName = winner?.wrestlers?.name ?? winner?.teams?.name ?? 'Unknown'
  const show = match.shows

  return (
    <div
      className="card card-hover-lift"
      style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit' }}
    >
      {/* Image */}
      <div
        style={{
          aspectRatio: '16/9',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--surface-2)',
        }}
      >
        {winner?.wrestlers?.render_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={winner.wrestlers.render_url}
            alt={winnerName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #100520 0%, #050208 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'rgba(168,77,255,0.1)', textTransform: 'uppercase' }}>
              {winnerName}
            </span>
          </div>
        )}

        <span
          style={{
            position: 'absolute',
            top: '0.75rem',
            left: '0.75rem',
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            padding: '0.25rem 0.6rem',
            letterSpacing: '0.02em',
            background:
              hashtag.cls === 'still'
                ? 'var(--gold)'
                : hashtag.cls === 'winner'
                ? 'var(--purple)'
                : 'var(--accent-red)',
            color: hashtag.cls === 'still' ? 'var(--bg-top)' : '#fff',
            zIndex: 2,
          }}
        >
          {hashtag.text}
        </span>

        {show.show_type === 'ppv' && (
          <span
            style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              fontFamily: 'var(--font-meta)',
              fontSize: '0.6rem',
              padding: '0.2rem 0.5rem',
              background: '#fff',
              color: 'var(--bg-top)',
              fontWeight: 700,
              letterSpacing: '0.12em',
              zIndex: 2,
            }}
          >
            PPV
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <span
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          {formatDate(show.show_date)}
        </span>

        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.4rem',
            lineHeight: 1.05,
            color: 'var(--text-strong)',
            textTransform: 'uppercase',
          }}
        >
          {winnerName} def.{' '}
          {match.match_participants
            .filter((p) => p.result !== 'winner')
            .map((p) => p.wrestlers?.name ?? p.teams?.name)
            .filter(Boolean)
            .join(', ')}
        </h3>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 'auto', paddingTop: '0.5rem' }}>
          {match.match_type}
          {match.stipulation ? ` · ${match.stipulation}` : ''}
          {match.is_title_match && match.titles ? ` · ${match.titles.name}` : ''}
        </p>
      </div>
    </div>
  )
}
