'use client'

import { useState } from 'react'

interface Reign {
  id: string
  won_date: string
  lost_date: string | null
  reign_number: number | null
  titles: { name: string; category: string; image_url?: string | null } | null
}

interface Props {
  reigns: Reign[]
}

export default function TitleHistoryTab({ reigns }: Props) {
  const [open, setOpen] = useState(false)

  const hasReigns = reigns.length > 0

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        top: '42%',
        transform: 'translateY(-50%)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      {/* Sliding panel — expands to the left of the button */}
      <div
        style={{
          width: open ? 340 : 0,
          overflow: open ? 'auto' : 'hidden',
          maxHeight: '70vh',
          background: 'var(--surface)',
          borderLeft: open ? `1px solid ${hasReigns ? 'var(--gold)' : 'var(--border)'}` : 'none',
          borderTop: open ? `1px solid ${hasReigns ? 'var(--gold)' : 'var(--border)'}` : 'none',
          borderBottom: open ? `1px solid ${hasReigns ? 'var(--gold)' : 'var(--border)'}` : 'none',
          transition: 'width 0.32s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div style={{ width: 340, padding: '1.25rem' }}>
          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: 'var(--gold)', letterSpacing: '0.25em', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem' }}>
            ★ Title History
          </p>

          {reigns.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              No title reigns on record.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {reigns.map((reign) => (
                <div
                  key={reign.id}
                  style={{
                    padding: '0.75rem 0.9rem',
                    background: !reign.lost_date ? 'rgba(255,201,51,0.08)' : 'var(--surface-2)',
                    border: !reign.lost_date ? '1px solid var(--gold)' : '1px solid var(--border)',
                  }}
                >
                  {reign.titles?.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={reign.titles.image_url} alt={reign.titles.name} style={{ width: '100%', maxHeight: 44, objectFit: 'contain', marginBottom: '0.4rem', opacity: 0.9 }} />
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1 }}>
                      {reign.titles?.name}
                    </p>
                    {!reign.lost_date && <span style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>★</span>}
                  </div>
                  {reign.reign_number && (
                    <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: 'var(--purple-hot)', letterSpacing: '0.12em', fontWeight: 700, marginTop: '0.2rem' }}>
                      Reign #{reign.reign_number}
                    </p>
                  )}
                  <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: 'var(--text-dim)', letterSpacing: '0.08em', marginTop: '0.15rem' }}>
                    {new Date(reign.won_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' → '}
                    {reign.lost_date
                      ? new Date(reign.lost_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Present'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vertical tab button — always visible */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          background: hasReigns ? 'var(--gold)' : 'var(--surface-2)',
          color: hasReigns ? '#0a0a0c' : 'var(--text-dim)',
          border: 'none',
          padding: '1.4rem 0.7rem',
          fontFamily: 'var(--font-meta)',
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.6rem',
          borderLeft: `1px solid ${hasReigns ? 'rgba(255,201,51,0.4)' : 'var(--border)'}`,
        }}
      >
        {/* Arrow indicator */}
        <span style={{ fontSize: '0.8rem', transform: open ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.25s', display: 'inline-block' }}>
          ←
        </span>
        Title History
      </button>
    </div>
  )
}
