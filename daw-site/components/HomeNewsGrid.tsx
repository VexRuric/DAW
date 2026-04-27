'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

export interface NewsCard {
  id: string
  hashtag: 'ANDNEW' | 'ANDSTILL' | 'WINNER'
  date: string
  dateShort: string
  title: string
  excerpt: string
  href: string
  image_url: string | null
}

type Tab = 'ALL' | 'ANDNEW' | 'ANDSTILL' | 'WINNER'
const TABS: Tab[] = ['ALL', 'ANDNEW', 'ANDSTILL', 'WINNER']

const HASHTAG_BG: Record<NewsCard['hashtag'], string> = {
  ANDNEW:   'var(--accent-red)',
  ANDSTILL: 'var(--gold)',
  WINNER:   'var(--purple)',
}
const HASHTAG_FG: Record<NewsCard['hashtag'], string> = {
  ANDNEW:   'var(--text-strong)',
  ANDSTILL: 'var(--bg-top)',
  WINNER:   'var(--text-strong)',
}

export default function HomeNewsGrid({ cards }: { cards: NewsCard[] }) {
  const [tab, setTab] = useState<Tab>('ALL')
  const [featIdx, setFeatIdx] = useState(0)

  const filtered = useMemo(() => {
    if (tab === 'ALL') return cards
    return cards.filter(c => c.hashtag === tab)
  }, [cards, tab])

  const featured = filtered[featIdx] ?? filtered[0] ?? null

  function changeTab(t: Tab) {
    setTab(t)
    setFeatIdx(0)
  }

  if (cards.length === 0) return null

  const prev = () => setFeatIdx(i => (i - 1 + filtered.length) % filtered.length)
  const next = () => setFeatIdx(i => (i + 1) % filtered.length)

  return (
    <section style={{ padding: '4rem 3rem', borderTop: '1px solid var(--border)' }}>
      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2.5rem' }}>
        <span style={{ display: 'inline-block', width: 28, height: 1, background: 'var(--purple-hot)' }} />
        <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--purple-hot)', fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
          What Just Happened
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }}>

        {/* LEFT: Featured card */}
        <div>
          <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: '0.85rem', fontWeight: 700 }}>
            The Story So Far
          </div>

          {featured ? (
            <>
              <Link href={featured.href} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', background: 'var(--surface-2)', marginBottom: '1rem' }}>
                  {featured.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={featured.image_url} alt={featured.title} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'radial-gradient(ellipse at 50% 40%, rgba(128,0,218,0.35) 0%, #0a0318 100%)' }} />
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.25) 55%, transparent 80%)', pointerEvents: 'none' }} />

                  <span style={{
                    position: 'absolute', top: '0.75rem', left: '0.75rem',
                    fontFamily: 'var(--font-meta)', fontSize: '0.58rem',
                    padding: '0.2rem 0.5rem',
                    background: HASHTAG_BG[featured.hashtag],
                    color: HASHTAG_FG[featured.hashtag],
                    fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    zIndex: 2,
                  }}>
                    #{featured.hashtag}
                  </span>

                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.25rem', zIndex: 2 }}>
                    <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 700 }}>
                      {featured.date}
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.1rem, 2vw, 1.75rem)', lineHeight: 1, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>
                      {featured.title}
                    </h3>
                  </div>
                </div>
              </Link>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '1rem' }}>
                {featured.excerpt}
              </p>

              {/* Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={prev}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '1rem', padding: '0.35rem 0.75rem', cursor: 'none', transition: 'all .2s' }}
                  aria-label="Previous"
                >
                  ‹
                </button>
                <button
                  onClick={next}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '1rem', padding: '0.35rem 0.75rem', cursor: 'none', transition: 'all .2s' }}
                  aria-label="Next"
                >
                  ›
                </button>
                <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>
                  {featIdx + 1} / {filtered.length}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.3rem' }}>
                  {filtered.slice(0, 6).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setFeatIdx(i)}
                      style={{ width: i === featIdx ? 18 : 6, height: 3, background: i === featIdx ? 'var(--purple-hot)' : 'var(--border)', border: 'none', cursor: 'none', transition: 'all .2s', padding: 0 }}
                      aria-label={`Story ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ aspectRatio: '16/9', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                No Results Yet
              </span>
            </div>
          )}
        </div>

        {/* RIGHT: Tabbed list */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.25em', textTransform: 'uppercase', fontWeight: 700 }}>
              Latest from the Warehouse
            </span>
            {/* Tabs */}
            <div style={{ display: 'flex', border: '1px solid var(--border)', background: 'var(--surface)' }}>
              {TABS.map((t, i) => (
                <button
                  key={t}
                  onClick={() => changeTab(t)}
                  style={{
                    background: t === tab ? 'var(--purple)' : 'transparent',
                    border: 'none',
                    borderRight: i < TABS.length - 1 ? '1px solid var(--border)' : 'none',
                    color: t === tab ? 'var(--text-strong)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-meta)',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding: '0.45rem 0.7rem',
                    cursor: 'none',
                    transition: 'all .2s',
                  }}
                >
                  {t === 'ALL' ? 'ALL' : `#${t}`}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div style={{ padding: '2rem', background: 'var(--surface)', border: '1px solid var(--border)', fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textAlign: 'center' }}>
              No results for this filter.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filtered.slice(0, 6).map((card, i) => {
                const isFeatured = filtered[featIdx]?.id === card.id
                return (
                  <div
                    key={card.id}
                    onClick={() => setFeatIdx(i)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '72px 1fr auto',
                      gap: '0.85rem',
                      padding: '0.85rem 0.5rem',
                      borderBottom: '1px solid var(--border)',
                      alignItems: 'center',
                      background: isFeatured ? 'rgba(168,77,255,0.06)' : 'transparent',
                      cursor: 'none',
                      transition: 'background .15s',
                      borderLeft: isFeatured ? '2px solid var(--purple-hot)' : '2px solid transparent',
                    }}
                  >
                    {/* Thumb */}
                    <div style={{ width: 72, height: 72, background: 'var(--surface-2)', overflow: 'hidden', flexShrink: 0 }}>
                      {card.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={card.image_url} alt={card.title} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${HASHTAG_BG[card.hashtag]}18 0%, var(--surface-3) 100%)` }} />
                      )}
                    </div>

                    {/* Text */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                        <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', background: HASHTAG_BG[card.hashtag], color: HASHTAG_FG[card.hashtag], padding: '0.1rem 0.3rem', fontWeight: 700, letterSpacing: '0.08em' }}>
                          #{card.hashtag}
                        </span>
                        <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}>
                          {card.dateShort}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', lineHeight: 1.1, color: 'var(--text-strong)', textTransform: 'uppercase', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {card.title}
                      </div>
                    </div>

                    {/* Arrow */}
                    <Link
                      href={card.href}
                      onClick={e => e.stopPropagation()}
                      style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--purple-hot)', flexShrink: 0, textDecoration: 'none' }}
                    >
                      →
                    </Link>
                  </div>
                )
              })}
            </div>
          )}

          <Link
            href="/shows"
            style={{ display: 'block', marginTop: '1.5rem', fontFamily: 'var(--font-meta)', fontSize: '0.68rem', color: 'var(--text-muted)', textDecoration: 'none', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700 }}
          >
            All Match Reports →
          </Link>
        </div>

      </div>
    </section>
  )
}
