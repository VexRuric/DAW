import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import TitleHistoryTab from '@/components/TitleHistoryTab'

interface PageProps {
  params: Promise<{ slug: string }>
}

interface BioParsed {
  height?: string
  weightClass?: string
  style?: string
  finisher?: string
}

interface StatLine { w: number; l: number; d: number; total: number }

// Match type buckets based on actual DB values
const SINGLE_TYPES  = ['Single', 'Title Match']
const TAG_TYPES     = ['Tag Team', 'Tag Team 4-Way', 'Mixed Tag Team', 'Tornado Tag Team',
                       'Tornado Tag Team 3-Way', 'Triple Threat Tag Team', '3-Man Tag',
                       '6-Man Tag Team', 'Handicap Tag Team']
const MULTI_TYPES   = ['Triple Threat', 'Fatal 4-Way', '5-Man', '6-Man', 'MitB',
                       'Underground', 'Handicap (1v2)', 'Handicap (1v3)']
const RUMBLE_TYPES  = ['Battle Royale', 'Royal Rumble']

function calcStat(rows: { result: string; match_type: string }[], types: string[]): StatLine {
  const filtered = rows.filter(r => types.includes(r.match_type))
  return {
    w:     filtered.filter(r => r.result === 'winner').length,
    l:     filtered.filter(r => r.result === 'loser').length,
    d:     filtered.filter(r => r.result === 'draw').length,
    total: filtered.length,
  }
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

async function getWrestler(slug: string) {
  const supabase = await createClient()

  const { data: wrestlers } = await supabase.from('wrestlers').select('*').eq('brand', 'DAW')
  if (!wrestlers) return null

  const wrestler = wrestlers.find((w) => toSlug(w.name) === slug)
  if (!wrestler) return null

  const [recordRes, reignsRes, allMatchesRes, recentMatchesRes, teamsRes] = await Promise.all([
    // Career totals
    supabase.from('wrestler_records').select('*').eq('id', wrestler.id).single(),

    // Title history (with belt image)
    supabase
      .from('title_reigns')
      .select('*, titles(name, category, image_url)')
      .eq('holder_wrestler_id', wrestler.id)
      .order('won_date', { ascending: false }),

    // ALL matches for stat breakdown (no limit)
    supabase
      .from('match_participants')
      .select('result, matches!inner(match_type)')
      .eq('wrestler_id', wrestler.id),

    // Recent match display (last 25)
    supabase
      .from('match_participants')
      .select(`
        result,
        matches!inner(
          id, match_type, stipulation, is_title_match, is_draw, rating,
          shows!inner(name, show_date, ppv_name),
          titles(name),
          match_participants(result, wrestlers(id, name), teams(id, name))
        )
      `)
      .eq('wrestler_id', wrestler.id)
      .order('created_at', { ascending: false, referencedTable: 'matches' })
      .limit(25),

    // Active team memberships
    supabase
      .from('team_memberships')
      .select('teams(id, name, active)')
      .eq('wrestler_id', wrestler.id)
      .is('end_date', null),
  ])

  // Flatten match rows for stat calc
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allMatchRows = (allMatchesRes.data ?? []).map((mp: any) => ({
    result: mp.result as string,
    match_type: mp.matches?.match_type as string,
  }))

  const breakdown = {
    singles:  calcStat(allMatchRows, SINGLE_TYPES),
    tag:      calcStat(allMatchRows, TAG_TYPES),
    multiMan: calcStat(allMatchRows, MULTI_TYPES),
    rumble:   calcStat(allMatchRows, RUMBLE_TYPES),
    total: {
      w: allMatchRows.filter(r => r.result === 'winner').length,
      l: allMatchRows.filter(r => r.result === 'loser').length,
      d: allMatchRows.filter(r => r.result === 'draw').length,
      total: allMatchRows.length,
    },
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentTeams = (teamsRes.data ?? []).map((m: any) => m.teams).filter((t: any) => t?.active)

  return {
    wrestler,
    record: recordRes.data,
    reigns: reignsRes.data ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    matchHistory: (recentMatchesRes.data ?? []) as any[],
    breakdown,
    currentTeams,
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getWrestler(slug)
  if (!data) return { title: 'Wrestler Not Found' }
  return {
    title: data.wrestler.name,
    description: `Stats, title history, and match log for ${data.wrestler.name} in DAW Warehouse LIVE.`,
  }
}

export default async function WrestlerStatPage({ params }: PageProps) {
  const { slug } = await params
  const data = await getWrestler(slug)
  if (!data) notFound()

  const { wrestler, record, reigns, matchHistory, breakdown, currentTeams } = data

  const winPct    = record?.win_pct ?? 0
  const avgRating = record?.avg_rating ?? null

  const currentReign = reigns.find((r: { lost_date: string | null }) => !r.lost_date)
  const isHeel   = wrestler.role === 'Heel'
  const isFace   = wrestler.role === 'Face'
  const isLegend = !!wrestler.legend

  let bio: BioParsed = {}
  if (wrestler.bio) {
    try { bio = JSON.parse(wrestler.bio) } catch { /* plain text */ }
  }

  const accentColor = currentReign
    ? 'var(--gold)'
    : isLegend
    ? 'rgba(255,201,51,0.75)'
    : isFace
    ? 'rgba(80,130,255,0.9)'
    : isHeel
    ? 'var(--accent-red)'
    : 'var(--purple-hot)'

  return (
    <div>
      {/* ── Fixed side tab — always visible ─────────────── */}
      <TitleHistoryTab reigns={reigns} />

      {/* ── Hero: tall section, upper body → full body on scroll ─ */}
      <section
        style={{
          position: 'relative',
          height: '175vh',
          overflow: 'hidden',
        }}
      >
        {wrestler.render_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wrestler.render_url}
            alt={wrestler.name}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
              display: 'block',
            }}
          />
        ) : (
          <SilhouettePlaceholder />
        )}

        {/* Alignment tint overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: currentReign
            ? 'linear-gradient(to bottom, rgba(20,14,0,0.15) 0%, rgba(20,14,0,0.55) 100%)'
            : isFace
            ? 'linear-gradient(to bottom, rgba(4,8,55,0.10) 0%, rgba(4,8,55,0.55) 100%)'
            : isHeel
            ? 'linear-gradient(to bottom, rgba(55,4,8,0.10) 0%, rgba(55,4,8,0.55) 100%)'
            : 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.5) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Bottom fade into the backstory section */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '25%', background: 'linear-gradient(to bottom, transparent 0%, rgba(10,10,14,0.98) 100%)', pointerEvents: 'none' }} />

        {/* Injured / Legend badges */}
        {wrestler.injured && (
          <span className="pill pill-red" style={{ position: 'absolute', top: '1rem', left: '1rem', fontSize: '0.6rem', zIndex: 3 }}>Injured</span>
        )}
        {isLegend && (
          <div style={{ position: 'absolute', top: '1rem', left: wrestler.injured ? '6rem' : '1rem', zIndex: 3, background: 'rgba(20,14,0,0.85)', border: '1px solid rgba(255,201,51,0.5)', color: 'rgba(255,201,51,0.9)', fontFamily: 'var(--font-meta)', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.22em', padding: '3px 8px', textTransform: 'uppercase' }}>
            ★ LEGEND
          </div>
        )}

        {/* Name pinned near bottom of first viewport */}
        <div style={{ position: 'absolute', bottom: '27%', left: 0, right: 0, padding: '0 3rem', zIndex: 2 }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
            {wrestler.division && (
              <span className="pill" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)' }}>{wrestler.division}</span>
            )}
            {wrestler.role && (
              <span className="pill" style={{
                background: 'rgba(0,0,0,0.55)',
                border: `1px solid ${isHeel ? 'var(--accent-red)' : isFace ? 'rgba(80,130,255,0.7)' : '#00c864'}`,
                color: isHeel ? 'var(--accent-red)' : isFace ? 'rgba(100,150,255,1)' : '#00c864',
                backdropFilter: 'blur(4px)',
              }}>{wrestler.role}</span>
            )}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3rem, 7vw, 6rem)',
            lineHeight: 0.88,
            color: 'white',
            textTransform: 'uppercase',
            textShadow: '0 2px 24px rgba(0,0,0,0.8)',
            borderLeft: `5px solid ${accentColor}`,
            paddingLeft: '1rem',
            margin: 0,
          }}>
            {wrestler.name}
          </h1>
          {currentReign && (
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', color: 'var(--gold)', letterSpacing: '0.2em', fontWeight: 700, paddingLeft: '1.25rem', marginTop: '0.6rem' }}>
              ★ {currentReign.titles?.name}
            </p>
          )}
        </div>
      </section>

      {/* ── Backstory / Stats section ─────────────────────── */}
      <section style={{ padding: '3rem 3rem 2.5rem', background: 'rgb(10,10,14)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }}>

          {/* Left: career stat breakdown */}
          <div>
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: accentColor, letterSpacing: '0.25em', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase' }}>
              Career Record
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              <StatRow label="Singles"    stat={breakdown.singles}  accent={accentColor} />
              <StatRow label="Tag Team"   stat={breakdown.tag}      accent={accentColor} />
              <StatRow label="Multi-Man"  stat={breakdown.multiMan} accent={accentColor} />
              <StatRow label="Royal Rumble / Battle Royal" stat={breakdown.rumble} accent={accentColor} />
              <div style={{ height: 1, background: 'var(--border)', margin: '0.25rem 0' }} />
              <StatRow label="Total" stat={breakdown.total} accent={accentColor} bold />
            </div>

            {/* Win % and rating */}
            <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${accentColor}` }}>
              <div>
                <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Win %</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--purple-hot)', lineHeight: 1 }}>{winPct}%</p>
              </div>
              {avgRating && (
                <div>
                  <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Avg Match ★</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--gold)', lineHeight: 1 }}>{avgRating}/5</p>
                </div>
              )}
            </div>

            {/* Faction / Team links */}
            {currentTeams.length > 0 && (
              <div style={{ marginTop: '1.25rem' }}>
                <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Current Faction / Team</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {currentTeams.map((team: { id: string; name: string }) => (
                    <Link
                      key={team.id}
                      href={`/roster/factions/${toSlug(team.name)}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                        padding: '0.5rem 0.85rem',
                        background: 'rgba(128,0,218,0.08)',
                        border: '1px solid var(--purple)',
                        color: 'var(--purple-hot)',
                        fontFamily: 'var(--font-meta)', fontSize: '0.68rem', fontWeight: 700,
                        letterSpacing: '0.1em', textDecoration: 'none', textTransform: 'uppercase',
                      }}
                    >
                      <span>↗</span> {team.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: bio details + backstory */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: accentColor, letterSpacing: '0.25em', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase' }}>
                Superstar Info
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {bio.height      && <BioStat label="Height"        value={bio.height} />}
                {bio.weightClass && <BioStat label="Weight Class"  value={bio.weightClass} />}
                {wrestler.country && <BioStat label="Hometown"     value={wrestler.country} />}
                {wrestler.division && <BioStat label="Division"    value={wrestler.division} />}
                {bio.style       && <BioStat label="Fighting Style" value={bio.style} />}
                {bio.finisher    && <BioStat label="Finisher"      value={bio.finisher} />}
              </div>
            </div>

            {wrestler.gimmick && (
              <div style={{ padding: '0.85rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${accentColor}` }}>
                <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Gimmick / Style</p>
                <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, fontStyle: 'italic' }}>
                  &ldquo;{wrestler.gimmick}&rdquo;
                </p>
              </div>
            )}

            {/* Plain-text bio */}
            {wrestler.bio && (() => {
              try { JSON.parse(wrestler.bio); return null } catch { /* plain text */ }
              return (
                <details style={{ border: '1px solid var(--border)' }}>
                  <summary style={{
                    fontFamily: 'var(--font-meta)', fontSize: '0.62rem', fontWeight: 700,
                    color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase',
                    cursor: 'pointer', listStyle: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.65rem 1rem', userSelect: 'none',
                  }}>
                    <span>Backstory</span>
                    <span style={{ opacity: 0.5 }}>▾</span>
                  </summary>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.75, padding: '0.75rem 1rem 1rem' }}>{wrestler.bio}</p>
                </details>
              )
            })()}
          </div>
        </div>
      </section>

      {/* ── Match History — wider contained box ───────────── */}
      <section style={{ padding: '2.5rem 2.5rem 4rem', background: 'var(--bg-top)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{
            padding: '0.85rem 1.25rem',
            background: 'var(--surface-2)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--text-strong)', textTransform: 'uppercase', margin: 0 }}>
              Match History
            </h2>
            <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>
              {matchHistory.length} RECENT
            </span>
          </div>

          {matchHistory.length === 0 ? (
            <p style={{ padding: '2rem 1.25rem', color: 'var(--text-muted)', fontFamily: 'var(--font-meta)', fontSize: '0.72rem', letterSpacing: '0.15em' }}>
              No match history found.
            </p>
          ) : (
            <div style={{ maxHeight: 580, overflowY: 'auto' }}>
              {matchHistory.map((mp: {
                result: string
                matches: {
                  match_type: string
                  stipulation: string | null
                  is_title_match: boolean
                  is_draw: boolean
                  rating: number | null
                  shows: { name: string; show_date: string; ppv_name: string | null }
                  titles: { name: string } | null
                  match_participants: { result: string; wrestlers: { id: string; name: string } | null; teams: { id: string; name: string } | null }[]
                }
              }, i: number) => {
                const m      = mp.matches
                const isWin  = mp.result === 'winner'
                const isDraw = mp.result === 'draw'
                const opponents = m.match_participants
                  .filter((p) => p.wrestlers?.id !== wrestler.id && p.teams === null)
                  .map((p) => p.wrestlers?.name ?? p.teams?.name)
                  .filter(Boolean)
                  .slice(0, 3)
                  .join(', ')

                return (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '48px 1fr auto',
                    gap: '1rem',
                    alignItems: 'center',
                    padding: '0.7rem 1.25rem',
                    borderBottom: '1px solid rgba(42,42,51,0.5)',
                    borderLeft: `3px solid ${isWin ? '#00c864' : isDraw ? 'rgba(255,255,255,0.15)' : 'var(--accent-red)'}`,
                  }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: isWin ? '#00c864' : isDraw ? 'var(--text-dim)' : 'var(--accent-red)', textTransform: 'uppercase', lineHeight: 1 }}>
                      {isWin ? 'W' : isDraw ? 'D' : 'L'}
                    </span>
                    <div>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.88rem', color: 'var(--text-strong)', lineHeight: 1.1, textTransform: 'uppercase' }}>
                        {opponents ? `vs. ${opponents}` : m.match_type}
                      </p>
                      <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.56rem', color: 'var(--text-dim)', letterSpacing: '0.08em', marginTop: '0.15rem' }}>
                        {new Date(m.shows.show_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}{m.shows.ppv_name ?? m.shows.name}
                        {' · '}<span style={{ color: 'var(--text-muted)' }}>{m.match_type}</span>
                        {m.is_title_match && m.titles ? ` · ${m.titles.name}` : ''}
                        {m.stipulation ? ` · ${m.stipulation}` : ''}
                      </p>
                    </div>
                    {m.rating && (
                      <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--gold)', letterSpacing: '0.1em', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        ★ {m.rating}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────

function StatRow({ label, stat, accent, bold }: { label: string; stat: StatLine; accent: string; bold?: boolean }) {
  if (stat.total === 0) return null
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '160px 1fr',
      gap: '1rem',
      alignItems: 'center',
      padding: '0.55rem 0.85rem',
      background: bold ? 'rgba(255,255,255,0.04)' : 'transparent',
      borderBottom: bold ? 'none' : '1px solid rgba(42,42,51,0.4)',
    }}>
      <span style={{ fontFamily: 'var(--font-meta)', fontSize: bold ? '0.65rem' : '0.6rem', color: bold ? 'var(--text-strong)' : 'var(--text-dim)', letterSpacing: '0.12em', fontWeight: bold ? 700 : 400, textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-meta)', fontSize: bold ? '0.72rem' : '0.65rem', letterSpacing: '0.06em', fontWeight: bold ? 700 : 400 }}>
        <span style={{ color: '#00c864' }}>{stat.w}W</span>
        <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 6px' }}>·</span>
        <span style={{ color: 'var(--accent-red)' }}>{stat.l}L</span>
        <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 6px' }}>·</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.d}D</span>
        <span style={{ color: 'var(--text-dim)', marginLeft: 10, fontSize: '0.55rem' }}>({stat.total})</span>
      </span>
    </div>
  )
}

function BioStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '0.65rem 0.85rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: '0.15em', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1 }}>{value}</p>
    </div>
  )
}

function SilhouettePlaceholder() {
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--surface-2) 0%, var(--surface-3) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 100 140" style={{ width: '30%', height: '30%', opacity: 0.1 }} fill="white">
        <ellipse cx="50" cy="22" rx="16" ry="18" />
        <path d="M20 140 Q25 90 50 80 Q75 90 80 140Z" />
        <path d="M50 80 Q30 85 18 110 L30 115 Q38 95 50 90Z" />
        <path d="M50 80 Q70 85 82 110 L70 115 Q62 95 50 90Z" />
      </svg>
    </div>
  )
}
