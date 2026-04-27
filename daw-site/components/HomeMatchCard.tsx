'use client'

import { useState } from 'react'

export interface MatchSide {
  name: string
  image_url: string | null
  isChampion: boolean
}

export interface MatchSlide {
  id: string
  matchNumber: number
  matchType: string
  stipulation: string | null
  isTitleMatch: boolean
  titleName: string | null
  sides: MatchSide[]
}

export interface NextShowInfo {
  id: string
  name: string
  show_date: string
  show_type: string
  ppv_name: string | null
}

function formatShowDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export default function HomeMatchCard({ show, slides }: { show: NextShowInfo; slides: MatchSlide[] }) {
  const [active, setActive] = useState(0)

  if (slides.length === 0) return null

  const slide = slides[active]

  return (
    <section style={{ padding: '4rem 3rem', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.75rem', color: 'var(--text-strong)', letterSpacing: '0.01em', textTransform: 'uppercase', lineHeight: 1 }}>
          Next Show · Match Card
        </h2>
      </div>

      {/* Show header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.85rem', color: 'var(--purple-hot)', letterSpacing: '0.25em', fontWeight: 700, textTransform: 'uppercase' }}>
          {formatShowDate(show.show_date)}
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-strong)', textTransform: 'uppercase' }}>
          {show.ppv_name ?? show.name}
        </span>
        {show.show_type === 'ppv' && (
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', background: 'var(--gold)', color: 'var(--bg-top)', padding: '0.25rem 0.55rem', fontWeight: 700, letterSpacing: '0.15em' }}>
            PAY-PER-VIEW
          </span>
        )}
      </div>

      {/* Ticker */}
      <div style={{ position: 'relative', background: 'var(--surface)', border: '1px solid var(--border)', minHeight: 540, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', padding: '2rem 2.5rem', minHeight: 540 }}>

          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '4rem', lineHeight: 1, color: 'var(--purple-hot)' }}>
                  {String(slide.matchNumber).padStart(2, '0')}
                </div>
                <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.25em', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Match #{slide.matchNumber}
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', padding: '0.4rem 0.9rem', background: 'rgba(168,77,255,0.12)', border: '1px solid var(--purple)', color: 'var(--purple-hot)', fontWeight: 700 }}>
                {slide.matchType}
              </span>
            </div>
            {slide.isTitleMatch && slide.titleName && (
              <div style={{ textAlign: 'right' }}>
                {slide.stipulation && (
                  <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--gold)', fontWeight: 700, marginBottom: '0.25rem' }}>
                    {slide.stipulation}
                  </div>
                )}
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--text-strong)', lineHeight: 1, textTransform: 'uppercase' }}>
                  {slide.titleName}
                </div>
              </div>
            )}
          </div>

          {/* VS layout */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', padding: '1rem 0', minHeight: 320 }}>
            {slide.sides.length >= 2 ? (
              <>
                <VSEntry side={slide.sides[0]} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '6rem', lineHeight: 1, color: 'var(--purple-hot)', textShadow: '0 0 20px rgba(168,77,255,0.6)', flexShrink: 0, position: 'relative' }}>
                  VS
                </div>
                <VSEntry side={slide.sides[1]} />
              </>
            ) : slide.sides.length === 1 ? (
              <VSEntry side={slide.sides[0]} />
            ) : (
              <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Participants TBA
              </div>
            )}
          </div>

          {/* Bottom bar with match tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setActive(i)}
                  style={{
                    background: i === active ? 'var(--purple)' : 'transparent',
                    border: i === active ? '1px solid var(--purple)' : '1px solid var(--border)',
                    color: i === active ? 'var(--text-strong)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-meta)',
                    fontSize: '0.75rem',
                    padding: '0.5rem 0.9rem',
                    letterSpacing: '0.1em',
                    cursor: 'none',
                    fontWeight: 700,
                    transition: 'all .2s',
                  }}
                  aria-label={`Match ${i + 1}`}
                >
                  M{i + 1}
                </button>
              ))}
            </div>
            <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.15em', fontWeight: 700 }}>
              {active + 1} / {slides.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function VSEntry({ side }: { side: MatchSide }) {
  return (
    <div style={{ flex: '0 1 280px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ width: 240, height: 300, background: 'var(--surface-2)', border: '1px solid var(--border)', marginBottom: '1rem', overflow: 'hidden', position: 'relative' }}>
        {side.isChampion && (
          <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: 'var(--gold)', color: 'var(--bg-top)', fontFamily: 'var(--font-meta)', fontSize: '0.6rem', padding: '0.2rem 0.5rem', letterSpacing: '0.15em', fontWeight: 700, zIndex: 2 }}>
            CHAMPION
          </div>
        )}
        {side.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={side.image_url} alt={side.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        ) : (
          <SilhouettePlaceholder />
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', lineHeight: 1, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>
        {side.name}
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
