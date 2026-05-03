import { createClient } from '@/lib/supabase-server'
import { Metadata } from 'next'
import Link from 'next/link'
import { Wrestler, WrestlerRecord } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Alumni',
  description: 'Former DAW Warehouse LIVE wrestlers — retired superstars.',
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

async function getData() {
  try {
    const supabase = await createClient()
    const [alumniRes, recordRes] = await Promise.all([
      supabase.from('wrestlers').select('*').eq('brand', 'DAW').eq('active', false).order('name', { ascending: true }),
      supabase.from('wrestler_records').select('*'),
    ])
    return {
      alumni:  (alumniRes.data ?? []) as Wrestler[],
      records: (recordRes.data ?? []) as WrestlerRecord[],
    }
  } catch {
    return { alumni: [], records: [] }
  }
}

export default async function AlumniPage() {
  const { alumni, records } = await getData()

  const recordMap = new Map<string, WrestlerRecord>()
  records.forEach((r) => recordMap.set(r.id, r))

  return (
    <>
      {/* Hero */}
      <section style={{ padding: '4rem 3rem 1.5rem' }}>
        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--purple-hot)', letterSpacing: '0.25em', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ width: 30, height: 1, background: 'var(--purple-hot)' }} />
          RETIRED SUPERSTARS
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 7vw, 6rem)', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 0.9, marginBottom: '2rem' }}>
          DAW WAREHOUSE<br/>ALUMNI
        </h1>
        <div style={{ display: 'flex', gap: '3rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--text-dim)', lineHeight: 1 }}>{alumni.length}</div>
            <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>ALUMNI</div>
          </div>
        </div>
      </section>

      <div style={{ padding: '0 3rem' }}>
        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
          <Link href="/roster" style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', padding: '0.65rem 1.25rem', color: 'var(--text-dim)', borderBottom: '2px solid transparent' }}>
            Wrestlers
          </Link>
          <Link href="/roster/factions" style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', padding: '0.65rem 1.25rem', color: 'var(--text-dim)', borderBottom: '2px solid transparent' }}>
            Factions
          </Link>
          <Link href="/roster/alumni" style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', padding: '0.65rem 1.25rem', color: 'var(--purple-hot)', borderBottom: '2px solid var(--purple-hot)' }}>
            Alumni
          </Link>
        </div>

        {alumni.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.15em', padding: '4rem 0' }}>
            No alumni on record.
          </p>
        ) : (
          <div style={{ marginBottom: '4rem' }}>
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1rem' }}>
              {alumni.length} FORMER SUPERSTAR{alumni.length !== 1 ? 'S' : ''}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {alumni.map((w) => <AlumniCard key={w.id} wrestler={w} record={recordMap.get(w.id)} />)}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function AlumniCard({ wrestler, record }: { wrestler: Wrestler; record: WrestlerRecord | undefined }) {
  const isFace = wrestler.role === 'Face'
  const isHeel = wrestler.role === 'Heel'

  const cardBg = isFace
    ? 'rgb(5, 8, 55)'
    : isHeel
    ? 'rgb(55, 5, 8)'
    : 'rgb(10,10,14)'

  const gradient = isFace
    ? 'linear-gradient(to top, rgba(2,4,35,0.98) 0%, rgba(4,8,55,0.45) 40%, transparent 70%)'
    : isHeel
    ? 'linear-gradient(to top, rgba(35,2,4,0.98) 0%, rgba(65,4,8,0.45) 40%, transparent 70%)'
    : 'linear-gradient(to top, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.30) 45%, transparent 70%)'

  const accentColor = isFace
    ? 'rgba(80,130,255,0.5)'
    : isHeel
    ? 'rgba(255,51,85,0.5)'
    : 'rgba(255,255,255,0.2)'

  return (
    <Link
      href={`/roster/${toSlug(wrestler.name)}`}
      style={{
        textDecoration: 'none',
        display: 'block',
        position: 'relative',
        aspectRatio: '3/4',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: cardBg,
        filter: 'brightness(0.8)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {wrestler.render_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wrestler.render_url}
            alt={wrestler.name}
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width: '100%',
              height: '140%',
              objectFit: 'cover',
              objectPosition: 'top center',
              display: 'block',
            }}
          />
        ) : (
          <SilhouettePlaceholder />
        )}
      </div>

      <div style={{ position: 'absolute', inset: 0, background: gradient }} />

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2,
        background: 'rgba(60,60,60,0.92)',
        color: 'rgba(255,255,255,0.55)',
        fontFamily: 'var(--font-meta)', fontSize: '0.5rem', fontWeight: 700,
        letterSpacing: '0.15em', padding: '0.3rem 0.5rem',
        textAlign: 'center', textTransform: 'uppercase',
      }}>
        ALUMNI
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2.5rem 0.85rem 0.9rem', zIndex: 2 }}>
        <div style={{ borderLeft: `2px solid ${accentColor}`, paddingLeft: '0.6rem' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', lineHeight: 1, marginBottom: '0.4rem' }}>
            {wrestler.name}
          </p>
          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', letterSpacing: '0.06em' }}>
            <span style={{ color: 'rgba(0,200,100,0.6)', fontWeight: 700 }}>{record?.wins ?? 0}W</span>
            <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>
            <span style={{ color: 'rgba(255,51,85,0.6)', fontWeight: 700 }}>{record?.losses ?? 0}L</span>
            <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>{record?.draws ?? 0}D</span>
          </p>
        </div>
      </div>
    </Link>
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
