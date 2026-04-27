'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export interface FeaturedSlide {
  id: string
  hashtag: 'ANDNEW' | 'ANDSTILL' | 'WINNER'
  subhead: string
  headline: string
  href: string
  image_url: string | null
}

export interface MiniResult {
  id: string
  hashtag: 'ANDNEW' | 'ANDSTILL' | 'WINNER'
  hashtagLabel: string
  title: string
  date: string
  href: string
  image_url: string | null
}

const HASHTAG_BG: Record<FeaturedSlide['hashtag'], string> = {
  ANDNEW:   'var(--accent-red)',
  ANDSTILL: 'var(--gold)',
  WINNER:   'var(--purple)',
}

const HASHTAG_FG: Record<FeaturedSlide['hashtag'], string> = {
  ANDNEW:   'var(--text-strong)',
  ANDSTILL: 'var(--bg-top)',
  WINNER:   'var(--text-strong)',
}

const MINI_HASHTAG_COLOR: Record<FeaturedSlide['hashtag'], string> = {
  ANDNEW:   'var(--accent-red)',
  ANDSTILL: 'var(--gold)',
  WINNER:   'var(--purple-hot)',
}

export default function HomeFeaturedBanner({
  slides,
  miniResults,
}: {
  slides:      FeaturedSlide[]
  miniResults: MiniResult[]
}) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (slides.length <= 1) return
    const t = setInterval(() => setActive((i) => (i + 1) % slides.length), 7000)
    return () => clearInterval(t)
  }, [slides.length])

  const slide = slides[active]

  return (
    <section style={{ position: 'relative', padding: '3rem 3rem 4rem', borderBottom: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 50%, rgba(128,0,218,0.2) 0%, transparent 60%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', position: 'relative', zIndex: 2 }}>
        <span style={{ display: 'inline-block', width: 40, height: 2, background: 'var(--purple-hot)' }} />
        <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--purple-hot)', fontWeight: 700 }}>
          Latest Results
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem', alignItems: 'stretch', position: 'relative', zIndex: 2 }}>
        {/* LEFT: Main featured slide */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          {slide ? (
            <div>
              <div style={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden', background: 'var(--surface)' }}>
                {slide.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slide.image_url} alt={slide.headline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 50%, rgba(128,0,218,0.3) 0%, #111116 100%)' }} />
                )}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 40%, transparent 70%)', pointerEvents: 'none' }} />

                <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', zIndex: 3 }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.75rem',
                    lineHeight: 1,
                    letterSpacing: '0.02em',
                    padding: '0.3rem 0.85rem',
                    color: HASHTAG_FG[slide.hashtag],
                    background: HASHTAG_BG[slide.hashtag],
                  }}>
                    #{slide.hashtag}
                  </span>
                </div>

                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem 1.5rem 1.25rem', zIndex: 3 }}>
                  <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {slide.subhead}
                  </div>
                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)',
                    lineHeight: 0.95,
                    color: 'var(--text-strong)',
                    letterSpacing: '0.01em',
                    textShadow: '0 2px 16px rgba(0,0,0,0.8)',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                  }}>
                    {slide.headline}
                  </h2>
                  <Link href={slide.href} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    marginTop: '1rem',
                    fontFamily: 'var(--font-display)',
                    fontSize: '1rem',
                    letterSpacing: '0.1em',
                    color: 'var(--text-strong)',
                    textDecoration: 'none',
                    padding: '0.6rem 1.2rem',
                    background: 'var(--purple)',
                  }}>
                    Read Full Match →
                  </Link>
                </div>
              </div>

              {slides.length > 1 && (
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1rem' }}>
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      style={{
                        flex: 1, height: 3,
                        background: i === active ? 'var(--purple-hot)' : 'var(--border)',
                        border: 'none', cursor: 'none',
                        transition: 'background 0.2s',
                      }}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ aspectRatio: '16 / 9', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontFamily: 'var(--font-meta)', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              No Recent Results
            </div>
          )}
        </div>

        {/* RIGHT: Mini-card list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'space-between' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>
            Recent Results
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {miniResults.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>
                No results yet.
              </p>
            ) : (
              miniResults.slice(0, 4).map((r) => (
                <Link
                  key={r.id}
                  href={r.href}
                  className="mini-card"
                  style={{
                    display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    transition: 'border-color .2s, background .2s',
                    textDecoration: 'none', color: 'inherit',
                  }}
                >
                  <div style={{ aspectRatio: '1', background: 'var(--surface-2)', overflow: 'hidden', position: 'relative' }}>
                    {r.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.image_url} alt={r.title} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg, var(--surface-2) 0%, var(--surface-3) 100%)' }} />
                    )}
                  </div>
                  <div style={{ padding: '0.75rem 0.75rem 0.75rem 0', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: MINI_HASHTAG_COLOR[r.hashtag], letterSpacing: '0.15em', fontWeight: 700 }}>
                      #{r.hashtag} · {r.hashtagLabel}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', lineHeight: 1.05, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>
                      {r.title}
                    </span>
                    <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
                      {r.date}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
