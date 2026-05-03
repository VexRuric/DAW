import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Link from 'next/link'
import TitleHistoryTab from '@/components/TitleHistoryTab'

interface PageProps {
  params: Promise<{ slug: string }>
}

interface StatLine { w: number; l: number; d: number; total: number }

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

async function getFaction(slug: string) {
  const supabase = await createClient()

  const { data: teams } = await supabase.from('teams').select('*')
  if (!teams) return null

  const team = teams.find((t) => toSlug(t.name) === slug)
  if (!team) return null

  const [recordRes, reignsRes, allMatchesRes, recentMatchesRes, membersRes, formerMembersRes] = await Promise.all([
    supabase.from('team_records').select('*').eq('id', team.id).single(),

    supabase
      .from('title_reigns')
      .select('*, titles(name, category, image_url)')
      .eq('holder_team_id', team.id)
      .order('won_date', { ascending: false }),

    supabase
      .from('match_participants')
      .select('result, matches!inner(match_type)')
      .eq('team_id', team.id),

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
      .eq('team_id', team.id)
      .order('created_at', { ascending: false, referencedTable: 'matches' })
      .limit(25),

    supabase
      .from('team_memberships')
      .select('wrestlers(id, name, render_url, role)')
      .eq('team_id', team.id)
      .is('end_date', null),

    supabase
      .from('team_memberships')
      .select('wrestlers(id, name, render_url), end_date')
      .eq('team_id', team.id)
      .not('end_date', 'is', null)
      .order('end_date', { ascending: false }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allMatchRows = (allMatchesRes.data ?? []).map((mp: any) => ({
    result: mp.result as string,
    match_type: mp.matches?.match_type as string,
  }))

  const record: StatLine = {
    w: allMatchRows.filter(r => r.result === 'winner').length,
    l: allMatchRows.filter(r => r.result === 'loser').length,
    d: allMatchRows.filter(r => r.result === 'draw').length,
    total: allMatchRows.length,
  }

  const winPct = record.total > 0 ? Math.round((record.w / record.total) * 100) : 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentMembers = (membersRes.data ?? []).map((m: any) => m.wrestlers).filter(Boolean)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formerMembers  = (formerMembersRes.data ?? []).map((m: any) => m.wrestlers).filter(Boolean)

  return {
    team,
    dbRecord: recordRes.data,
    reigns: reignsRes.data ?? [],
    matchHistory: (recentMatchesRes.data ?? []) as any[],
    record,
    winPct,
    currentMembers,
    formerMembers,
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getFaction(slug)
  if (!data) return { title: 'Faction Not Found' }
  return {
    title: data.team.name,
    description: `Stats, title history, and match history for ${data.team.name} in DAW Warehouse LIVE.`,
  }
}

export default async function FactionStatPage({ params }: PageProps) {
  const { slug } = await params
  const data = await getFaction(slug)
  if (!data) notFound()

  const { team, reigns, matchHistory, record, winPct, currentMembers, formerMembers } = data

  const isDisbanded  = !team.active
  const isHeel       = team.role === 'Heel'
  const isFace       = team.role === 'Face'
  const currentReign = reigns.find((r: { lost_date: string | null }) => !r.lost_date)

  const accentColor = currentReign
    ? 'var(--gold)'
    : isHeel
    ? 'var(--accent-red)'
    : isFace
    ? 'rgba(80,130,255,0.9)'
    : 'var(--purple-hot)'

  const memberRenders = currentMembers
    .map((m: { render_url: string | null }) => m.render_url)
    .filter(Boolean) as string[]
  const hasComposite = memberRenders.length >= 2

  return (
    <div>
      <TitleHistoryTab reigns={reigns} />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section style={{ position: 'relative', height: '65vh', minHeight: 320, overflow: 'hidden', background: 'var(--surface-2)' }}>
        {hasComposite ? (
          memberRenders.slice(0, 5).map((url, i) => {
            const count = Math.min(memberRenders.length, 5)
            const segW  = 100 / count
            const leftPct = i * segW - (count > 2 ? segW * 0.2 : 0)
            const zIdx = Math.round(count / 2) === i ? count + 1 : count - Math.abs(i - Math.floor(count / 2))
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt=""
                style={{ position: 'absolute', top: 0, left: `${leftPct}%`, width: count <= 2 ? '60%' : '50%', height: '125%', objectFit: 'cover', objectPosition: 'top center', zIndex: zIdx }}
              />
            )
          })
        ) : team.render_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.render_url} alt={team.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        ) : (
          <FactionPlaceholder />
        )}

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,14,1) 0%, rgba(10,10,14,0.55) 35%, rgba(10,10,14,0.1) 65%, transparent 80%)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accentColor, zIndex: 20 }} />

        {isDisbanded && (
          <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 20, background: 'rgba(60,60,60,0.9)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-meta)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.2em', padding: '4px 10px', textTransform: 'uppercase' }}>
            DISBANDED
          </div>
        )}

        {hasComposite && team.render_url && (
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 20, background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)', padding: 6 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={team.render_url} alt="" style={{ display: 'block', height: 40, width: 40, objectFit: 'contain' }} />
          </div>
        )}

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'clamp(1.5rem,4vw,2.5rem) clamp(1.25rem,4vw,3rem)', zIndex: 11 }}>
          {/* Breadcrumb */}
          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: '0.65rem' }}>
            <Link href="/roster" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Roster</Link>
            {' · '}
            <Link href="/roster/factions" style={{ color: 'var(--text-dim)', textDecoration: 'none' }}>Factions</Link>
            {' · '}{team.name}
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
            {team.division && (
              <span className="pill" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)' }}>{team.division}</span>
            )}
            {team.role && (
              <span className="pill" style={{ background: 'rgba(0,0,0,0.55)', border: `1px solid ${isHeel ? 'var(--accent-red)' : isFace ? 'rgba(80,130,255,0.7)' : '#00c864'}`, color: isHeel ? 'var(--accent-red)' : isFace ? 'rgba(100,150,255,1)' : '#00c864', backdropFilter: 'blur(4px)' }}>{team.role}</span>
            )}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem,6vw,5rem)', lineHeight: 0.9, color: 'white', textTransform: 'uppercase', textShadow: '0 2px 24px rgba(0,0,0,0.8)', borderLeft: `5px solid ${accentColor}`, paddingLeft: '1rem', margin: 0 }}>
            {team.name}
          </h1>
          {currentReign && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1.25rem', marginTop: '0.6rem' }}>
              {currentReign.titles?.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentReign.titles.image_url} alt="" style={{ height: 36, maxWidth: 80, objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(255,201,51,0.5))', flexShrink: 0 }} />
              )}
              <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', color: 'var(--gold)', letterSpacing: '0.2em', fontWeight: 700, margin: 0 }}>
                ★ {currentReign.titles?.name}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Stats & Members ───────────────────────────────── */}
      <section style={{ padding: 'clamp(2rem,5vw,3rem) clamp(1.25rem,4vw,3rem)', background: 'rgb(10,10,14)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '3rem', alignItems: 'start' }}>

          {/* Record */}
          <div>
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: accentColor, letterSpacing: '0.25em', fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase' }}>
              Career Record
            </p>
            <div style={{ padding: '1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${accentColor}`, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: '#00c864', lineHeight: 1 }}>{record.w}</div>
                <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Wins</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--accent-red)', lineHeight: 1 }}>{record.l}</div>
                <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Losses</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>{record.d}</div>
                <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Draws</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '2rem', padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Win %</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--purple-hot)', lineHeight: 1 }}>{winPct}%</p>
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Total Matches</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--text-muted)', lineHeight: 1 }}>{record.total}</p>
              </div>
            </div>
          </div>

          {/* Members */}
          <div>
            {currentMembers.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: accentColor, letterSpacing: '0.25em', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                  Current Members
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {currentMembers.map((m: { id: string; name: string; render_url: string | null; role: string | null }) => (
                    <Link key={m.id} href={`/roster/${toSlug(m.name)}`}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', textDecoration: 'none', transition: 'border-color 0.15s' }}
                      onMouseEnter={undefined}
                    >
                      {m.render_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.render_url} alt={m.name} style={{ width: 28, height: 36, objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 28, height: 36, background: 'var(--surface-2)', flexShrink: 0 }} />
                      )}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1 }}>{m.name}</p>
                        {m.role && <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: isHeel ? 'var(--accent-red)' : 'var(--text-dim)', letterSpacing: '0.12em', marginTop: '0.15rem' }}>{m.role}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {formerMembers.length > 0 && (
              <div>
                <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.25em', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                  Former Members
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {formerMembers.map((m: { id: string; name: string }) => (
                    <Link key={m.id} href={`/roster/${toSlug(m.name)}`}
                      style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.08em', textDecoration: 'none', padding: '0.3rem 0.65rem', border: '1px solid var(--border)', background: 'var(--surface)' }}
                    >
                      {m.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {team.bio && (
              <details style={{ border: '1px solid var(--border)', marginTop: '1.25rem' }}>
                <summary style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1rem', userSelect: 'none' }}>
                  <span>Faction Background</span>
                  <span style={{ opacity: 0.5 }}>▾</span>
                </summary>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.75, padding: '0.75rem 1rem 1rem' }}>{team.bio}</p>
              </details>
            )}
          </div>
        </div>
      </section>

      {/* ── Match History ─────────────────────────────────── */}
      <section style={{ padding: 'clamp(2rem,5vw,2.5rem) clamp(1.25rem,4vw,2.5rem) 4rem', background: 'var(--bg-top)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '0.85rem 1.25rem', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--text-strong)', textTransform: 'uppercase', margin: 0 }}>Match History</h2>
            <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>{matchHistory.length} RECENT</span>
          </div>

          {matchHistory.length === 0 ? (
            <p style={{ padding: '2rem 1.25rem', color: 'var(--text-muted)', fontFamily: 'var(--font-meta)', fontSize: '0.72rem', letterSpacing: '0.15em' }}>No match history found.</p>
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
                  .filter((p) => p.teams?.id !== team.id && p.wrestlers === null || (p.wrestlers !== null && p.result !== mp.result))
                  .map((p) => p.wrestlers?.name ?? p.teams?.name)
                  .filter(Boolean)
                  .slice(0, 3)
                  .join(', ')

                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: '1rem', alignItems: 'center', padding: '0.7rem 1.25rem', borderBottom: '1px solid rgba(42,42,51,0.5)', borderLeft: `3px solid ${isWin ? '#00c864' : isDraw ? 'rgba(255,255,255,0.15)' : 'var(--accent-red)'}` }}>
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

function FactionPlaceholder() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, var(--surface-2) 0%, var(--surface-3) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg viewBox="0 0 120 80" style={{ width: '30%', height: '30%', opacity: 0.08 }} fill="white">
        <ellipse cx="35" cy="22" rx="13" ry="15" />
        <ellipse cx="85" cy="22" rx="13" ry="15" />
        <path d="M10 80 Q15 55 35 47 Q55 55 60 80Z" />
        <path d="M60 80 Q65 55 85 47 Q105 55 110 80Z" />
      </svg>
    </div>
  )
}
