'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/* Announcer Desk — a per-match talking-points rundown for whoever is calling the show:
   head-to-head history, current form, title history and finishing moves. */

interface ShowStub { id: string; name: string; show_date: string; status: string; ppv_name: string | null }
interface Wrestler { id: string; name: string; bio: string | null }
interface Move { name: string; description: string }
interface Past { matchId: string; date: string; showName: string; matchType: string; isTitle: boolean; result: string; opponents: string[]; winners: string[] }
interface Reign { titleName: string; wonDate: string; current: boolean }
interface Profile {
  w: Wrestler
  moves: Move[]
  record: { w: number; l: number; d: number }
  form: Past[]
  reigns: Reign[]
  past: Past[]
}
interface MatchView { id: string; number: number; type: string; stip: string | null; isTitle: boolean; titleName: string | null; ids: string[]; names: string[] }

const META = { fontFamily: 'var(--font-meta)' } as const
const label = { ...META, fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' as const }

function parseMoves(bio: string | null): Move[] {
  if (!bio) return []
  let o: { finishers?: string; finisher?: string } = {}
  try { o = JSON.parse(bio) } catch { return [] }
  const raw = o.finishers ?? o.finisher ?? ''
  return String(raw).split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const [name, ...rest] = l.split('|')
    return { name: name.trim(), description: rest.join('|').trim() }
  })
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AnnouncerDesk() {
  const [shows, setShows] = useState<ShowStub[]>([])
  const [showId, setShowId] = useState('')
  const [matches, setMatches] = useState<MatchView[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('shows').select('id, name, show_date, status, ppv_name')
      .neq('status', 'cancelled').order('show_date', { ascending: false }).limit(40)
      .then(({ data }) => {
        const list = (data ?? []) as ShowStub[]
        setShows(list)
        // Default to the nearest upcoming show, else the most recent one
        const today = new Date().toISOString().slice(0, 10)
        const upcoming = [...list].filter(s => s.show_date >= today).sort((a, b) => a.show_date.localeCompare(b.show_date))[0]
        const pick = upcoming ?? list[0]
        if (pick) setShowId(pick.id)
      })
  }, [])

  useEffect(() => {
    if (!showId) return
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const { data: mData, error: mErr } = await supabase.from('matches')
          .select('id, match_number, match_type, stipulation, is_title_match, scheme, titles(name), match_participants(wrestler_id, write_in_name, wrestlers(id, name, bio))')
          .eq('show_id', showId).order('match_number')
        if (mErr) throw mErr
        const wrestlers = new Map<string, Wrestler>()
        const views: MatchView[] = []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const m of (mData ?? []) as any[]) {
          if (m.scheme === 'Promo') continue
          const ids: string[] = []; const names: string[] = []
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const p of (m.match_participants ?? []) as any[]) {
            if (p.wrestlers) { ids.push(p.wrestlers.id); names.push(p.wrestlers.name); wrestlers.set(p.wrestlers.id, p.wrestlers) }
            else if (p.write_in_name) names.push(p.write_in_name)
          }
          views.push({ id: m.id, number: m.match_number, type: m.match_type, stip: m.stipulation, isTitle: m.is_title_match, titleName: m.titles?.name ?? null, ids, names })
        }
        const allIds = [...wrestlers.keys()]
        const thisShowMatchIds = new Set(views.map(v => v.id))

        const PART = `result, matches!inner(id, match_type, is_title_match, is_draw, shows!inner(name, show_date, status), match_participants(wrestler_id, result, wrestlers(name)))`
        const [partRes, reignRes] = await Promise.all([
          // One query per wrestler so a long career never hits the row cap
          Promise.all(allIds.map(id => supabase.from('match_participants').select(PART).eq('wrestler_id', id))),
          allIds.length
            ? supabase.from('title_reigns').select('holder_wrestler_id, holder_wrestler_id_2, won_date, lost_date, titles(name)')
                .or(`holder_wrestler_id.in.(${allIds.join(',')}),holder_wrestler_id_2.in.(${allIds.join(',')})`)
            : Promise.resolve({ data: [] as unknown[], error: null }),
        ])
        if (reignRes.error) throw reignRes.error

        const out: Record<string, Profile> = {}
        allIds.forEach((id, i) => {
          const w = wrestlers.get(id)!
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rows = ((partRes[i].data ?? []) as any[])
            .filter(r => r.matches?.shows?.status === 'completed' && !thisShowMatchIds.has(r.matches.id))
          const past: Past[] = rows.map(r => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parts = (r.matches.match_participants ?? []) as any[]
            const opposing = r.result === 'draw'
              ? parts.filter(p => p.wrestler_id && p.wrestler_id !== id)
              : parts.filter(p => p.wrestler_id && p.wrestler_id !== id && p.result !== r.result)
            return {
              matchId: r.matches.id,
              date: r.matches.shows.show_date,
              showName: r.matches.shows.name,
              matchType: r.matches.match_type,
              isTitle: !!r.matches.is_title_match,
              result: r.result,
              opponents: opposing.map(p => p.wrestlers?.name ?? 'Unknown'),
              winners: parts.filter(p => p.result === 'winner' && p.wrestler_id).map(p => p.wrestler_id as string),
            }
          }).sort((a, b) => b.date.localeCompare(a.date))
          const reigns: Reign[] = []
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const r of (reignRes.data ?? []) as any[]) {
            if (r.holder_wrestler_id === id || r.holder_wrestler_id_2 === id) {
              reigns.push({ titleName: r.titles?.name ?? 'Title', wonDate: r.won_date, current: !r.lost_date })
            }
          }
          out[id] = {
            w, moves: parseMoves(w.bio), past, form: past.slice(0, 5), reigns,
            record: {
              w: past.filter(p => p.result === 'winner').length,
              l: past.filter(p => p.result === 'loser').length,
              d: past.filter(p => p.result === 'draw').length,
            },
          }
        })
        if (!cancelled) { setMatches(views); setProfiles(out) }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the rundown.')
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [showId])

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--text-strong)', textTransform: 'uppercase', margin: 0 }}>Announcer Desk</h2>
      <p style={{ ...META, fontSize: '0.7rem', color: 'var(--text-dim)', margin: '0.25rem 0 1rem' }}>
        Quick match-by-match talking points: head-to-head, recent form, titles and finishers. Past results only count completed shows.
      </p>
      <select className="form-input form-select" value={showId} onChange={e => setShowId(e.target.value)} style={{ maxWidth: 420, marginBottom: '1.25rem' }}>
        {shows.map(s => <option key={s.id} value={s.id}>{s.show_date} — {s.ppv_name || s.name}{s.status !== 'completed' ? ` (${s.status})` : ''}</option>)}
      </select>

      {error && <p style={{ ...META, color: 'var(--accent-red)', fontSize: '0.75rem' }}>{error}</p>}
      {loading && <p style={{ ...META, color: 'var(--text-dim)', fontSize: '0.75rem' }}>Loading rundown…</p>}
      {!loading && !error && showId && matches.length === 0 && (
        <p style={{ ...META, color: 'var(--text-dim)', fontSize: '0.75rem' }}>No matches booked for this show yet.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {!loading && matches.map(m => <MatchRundown key={m.id} match={m} profiles={profiles} />)}
      </div>
    </div>
  )
}

function MatchRundown({ match, profiles }: { match: MatchView; profiles: Record<string, Profile> }) {
  const [open, setOpen] = useState(true)
  const ps = match.ids.map(id => profiles[id]).filter(Boolean)

  // Head-to-head: every pair of competitors, counting only meetings where they were on opposing sides
  const pairs: { a: Profile; b: Profile; meetings: Past[]; aWins: number; bWins: number; draws: number }[] = []
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j]
      // Opposing sides only: a draw both ways, or differing results. Same-result pairs (teammates, or two losers in a multi-way) aren't a head-to-head.
      const bRes = new Map(b.past.map(x => [x.matchId, x.result]))
      const meetings = a.past.filter(x => {
        const r = bRes.get(x.matchId)
        return r !== undefined && (x.result === 'draw' ? r === 'draw' : r !== x.result)
      })
      pairs.push({
        a, b, meetings,
        aWins: meetings.filter(p => p.result === 'winner').length,
        bWins: meetings.filter(p => p.result === 'loser').length,
        draws: meetings.filter(p => p.result === 'draw').length,
      })
    }
  }

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${match.isTitle ? 'rgba(255,201,51,0.35)' : 'var(--border)'}` }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.25)', border: 'none', cursor: 'var(--cursor-pointer)', textAlign: 'left' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: match.isTitle ? 'var(--gold)' : 'var(--purple-hot)' }}>{String(match.number).padStart(2, '0')}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text-strong)', textTransform: 'uppercase', flex: 1 }}>
          {match.names.join(' vs ') || 'TBA'}
        </span>
        <span style={{ ...META, fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
          {match.type}{match.stip ? ` · ${match.stip}` : ''}{match.titleName ? ` · 🏆 ${match.titleName}` : ''}
        </span>
        <span style={{ color: 'var(--text-dim)' }}>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {pairs.length > 0 && (
            <div>
              <p style={label}>Head to head</p>
              {pairs.map(p => {
                const last = p.meetings[0]
                const lastWinner = last ? (last.result === 'draw' ? null : last.result === 'winner' ? p.a.w.name : p.b.w.name) : null
                return (
                  <div key={p.a.w.id + p.b.w.id} style={{ marginTop: '0.4rem', ...META, fontSize: '0.75rem', color: 'var(--text-strong)' }}>
                    <strong>{p.a.w.name}</strong> vs <strong>{p.b.w.name}</strong>
                    {p.meetings.length === 0
                      ? <span style={{ color: 'var(--text-dim)' }}> — first-time meeting</span>
                      : <span style={{ color: 'var(--text-dim)' }}>
                          {' '}— {p.meetings.length} meeting{p.meetings.length > 1 ? 's' : ''} ({p.aWins}–{p.bWins}{p.draws ? `–${p.draws}D` : ''}).{' '}
                          Last: {lastWinner ? <>won by <span style={{ color: '#22cc66' }}>{lastWinner}</span></> : 'a draw'} on {fmtDate(last.date)} ({last.showName}{last.isTitle ? ', title match' : ''})
                        </span>}
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
            {ps.map(p => <CompetitorCard key={p.w.id} p={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function CompetitorCard({ p }: { p: Profile }) {
  const current = p.reigns.filter(r => r.current)
  return (
    <div style={{ background: 'var(--surface-2, rgba(255,255,255,0.03))', border: '1px solid var(--border)', padding: '0.75rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--text-strong)', textTransform: 'uppercase' }}>{p.w.name}</span>
        <span style={{ ...META, fontSize: '0.62rem', color: 'var(--text-dim)' }}>{p.record.w}W · {p.record.l}L{p.record.d ? ` · ${p.record.d}D` : ''}</span>
      </div>

      <div>
        <p style={label}>Finishers</p>
        {p.moves.length === 0
          ? <p style={{ ...META, fontSize: '0.68rem', color: 'var(--text-dim)', margin: '0.2rem 0 0' }}>None listed</p>
          : p.moves.map((m, i) => (
              <p key={i} style={{ ...META, fontSize: '0.72rem', color: 'var(--text-strong)', margin: '0.2rem 0 0' }}>
                <strong>{m.name}</strong>{m.description && <span style={{ color: 'var(--text-dim)' }}> — {m.description}</span>}
              </p>
            ))}
      </div>

      <div>
        <p style={label}>Titles</p>
        <p style={{ ...META, fontSize: '0.72rem', color: 'var(--text-strong)', margin: '0.2rem 0 0' }}>
          {p.reigns.length === 0 ? <span style={{ color: 'var(--text-dim)' }}>Never held a title</span> : <>
            {p.reigns.length} reign{p.reigns.length > 1 ? 's' : ''} total
            {current.length > 0 && <> · <span style={{ color: 'var(--gold)' }}>Current: {current.map(r => `${r.titleName} (since ${fmtDate(r.wonDate)})`).join(', ')}</span></>}
          </>}
        </p>
      </div>

      <div>
        <p style={label}>Last {p.form.length || ''} results</p>
        {p.form.length === 0
          ? <p style={{ ...META, fontSize: '0.68rem', color: 'var(--text-dim)', margin: '0.2rem 0 0' }}>No completed matches</p>
          : <>
              <div style={{ display: 'flex', gap: '0.25rem', margin: '0.25rem 0' }}>
                {p.form.map((f, i) => (
                  <span key={i} title={`${fmtDate(f.date)} — ${f.showName}`} style={{ ...META, fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.35rem', color: f.result === 'winner' ? '#22cc66' : f.result === 'loser' ? '#ff3355' : 'var(--text-dim)', border: '1px solid var(--border)' }}>
                    {f.result === 'winner' ? 'W' : f.result === 'loser' ? 'L' : 'D'}
                  </span>
                ))}
              </div>
              <p style={{ ...META, fontSize: '0.66rem', color: 'var(--text-dim)', margin: 0 }}>
                Last match: {p.form[0].result === 'winner' ? 'won' : p.form[0].result === 'loser' ? 'lost' : 'drew'}
                {p.form[0].opponents.length > 0 && <> vs {p.form[0].opponents.join(', ')}</>} · {fmtDate(p.form[0].date)}
              </p>
            </>}
      </div>
    </div>
  )
}
