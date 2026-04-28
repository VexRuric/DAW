'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

type Section = 'approvals' | 'booker' | 'results' | 'champions' | 'ownership' | 'images' | 'edits' | 'story' | 'accounts'

const MATCH_TYPES  = ['Singles','Tag Team','Triple Threat','Fatal 4-Way','Gauntlet','Battle Royal','Handicap']
const STIPULATIONS = ['Standard','Last Man Standing','No DQ','Cage','Ladder','Table','Elimination','Ironman','Submission','Falls Count Anywhere']
const DEFEAT_TYPES = ['', 'Pin', 'Submission', 'DQ', 'Count Out', 'No Contest', 'TKO']
const RATINGS      = ['', '0.5','1.0','1.5','2.0','2.5','3.0','3.5','4.0','4.5','5.0']
const NOTE_TYPES   = ['Feud Idea','Storyline Arc','PPV Idea','Character Note','Faction Note','Other']

/* ── Types ──────────────────────────────────────────── */

interface StoryNote { id: number; type: string; content: string; createdAt: string }
interface PendingItem { id: string; table: 'wrestlers' | 'teams'; type: 'Wrestler' | 'Faction'; name: string; submittedAt: string }
interface BookerRosterEntry { id: string; name: string; isChamp: boolean; champTitle: string | null; role: string | null; injured: boolean }
interface BookerTitle { id: string; name: string }
interface BookerParticipant { type: 'roster' | 'writein'; wrestlerId: string | null; name: string }
interface BookerSlot { id: number; matchType: string; stipulation: string; isTitleMatch: boolean; titleId: string; participants: BookerParticipant[]; isMainEvent: boolean; sideNames: string[] }
interface ShowStub { id: string; name: string; show_date: string; status: string; stream_url: string | null }
interface Participant { mp_id: string; name: string; result: string | null }
interface MatchCard { id: string; match_number: number; match_type: string; stipulation: string | null; is_title_match: boolean; is_draw: boolean; defeat_type: string | null; rating: number | null; notes: string | null; participants: Participant[] }
interface MatchResultForm { winner_mp_id: string; defeat_type: string; rating: string; notes: string; add_to_story_board: boolean }
interface OwnerRow { id: string; name: string; status: string; submitted_by: string | null; owner: { display_name: string | null; twitch_handle: string | null } | null }
interface ProfileResult { id: string; display_name: string | null; twitch_handle: string | null }
interface TitleRow { id: string; name: string; category: string; display_order: number }
interface ChampRow { title_id: string; title_name: string; holder_name: string; holder_wrestler_id: string | null; holder_team_id: string | null; won_date: string; days_held: number }
interface ImageRow { id: string; name: string; render_url: string | null; status: string }
interface RosterRow { id: string; name: string; division: string | null; role: string | null; injured: boolean; status: string; saved: boolean }

/* ── Helpers ─────────────────────────────────────────── */

function participantCount(matchType: string): number {
  switch (matchType) {
    case 'Tag Team':      return 4
    case 'Triple Threat': return 3
    case 'Fatal 4-Way':   return 4
    case 'Gauntlet':      return 6
    case 'Battle Royal':  return 8
    case 'Handicap':      return 3
    default:              return 2
  }
}

function getParticipantsPerSide(matchType: string): number[] {
  switch (matchType) {
    case 'Tag Team':      return [2, 2]
    case 'Triple Threat': return [1, 1, 1]
    case 'Fatal 4-Way':   return [1, 1, 1, 1]
    case 'Gauntlet':      return [1, 1, 1, 1, 1, 1]
    case 'Battle Royal':  return [1, 1, 1, 1, 1, 1, 1, 1]
    case 'Handicap':      return [2, 1]
    default:              return [1, 1]
  }
}

function buildSideGroups(participants: BookerParticipant[], matchType: string): { side: BookerParticipant[]; startIdx: number }[] {
  const perSide = getParticipantsPerSide(matchType)
  let idx = 0
  return perSide.map(n => { const s = { side: participants.slice(idx, idx + n), startIdx: idx }; idx += n; return s })
}

function emptyParticipant(): BookerParticipant { return { type: 'roster', wrestlerId: null, name: '' } }

function makeBookerSlots(count: number): BookerSlot[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1, matchType: 'Singles', stipulation: 'Standard',
    isTitleMatch: false, titleId: '', participants: [emptyParticipant(), emptyParticipant()],
    isMainEvent: i === count - 1, sideNames: ['', ''],
  }))
}

/* ── Pending Approvals ───────────────────────────────── */

function PendingApprovals({ onCountChange }: { onCountChange: (n: number) => void }) {
  const [items, setItems]   = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [wRes, tRes] = await Promise.all([
        supabase.from('wrestlers').select('id, name, created_at').eq('status', 'pending').order('created_at', { ascending: true }),
        supabase.from('teams').select('id, name, created_at').eq('status', 'pending').order('created_at', { ascending: true }),
      ])
      const wrestlers: PendingItem[] = (wRes.data ?? []).map((w) => ({ id: w.id, table: 'wrestlers' as const, type: 'Wrestler' as const, name: w.name, submittedAt: new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }))
      const factions: PendingItem[] = (tRes.data ?? []).map((t) => ({ id: t.id, table: 'teams' as const, type: 'Faction' as const, name: t.name, submittedAt: new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }))
      const all = [...wrestlers, ...factions].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
      setItems(all)
      onCountChange(all.length)
      setLoading(false)
    }
    load()
  }, [onCountChange])

  async function approve(item: PendingItem) {
    setActing(item.id)
    const { error } = await supabase.from(item.table).update({ status: 'hired' }).eq('id', item.id)
    if (!error) setItems((prev) => { const next = prev.filter((i) => i.id !== item.id); onCountChange(next.length); return next })
    setActing(null)
  }

  async function reject(item: PendingItem) {
    setActing(item.id)
    const { error } = await supabase.from(item.table).update({ status: 'rejected' }).eq('id', item.id)
    if (!error) setItems((prev) => { const next = prev.filter((i) => i.id !== item.id); onCountChange(next.length); return next })
    setActing(null)
  }

  return (
    <div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--text-strong)', textTransform:'uppercase', marginBottom:'1.5rem' }}>Pending Approvals</h2>
      {loading ? (
        <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>No pending approvals.</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
          {items.map((a) => (
            <div key={a.id} style={{ display:'grid', gridTemplateColumns:'140px 1fr auto', alignItems:'center', gap:'1.5rem', padding:'1rem 1.25rem', background:'var(--surface)', border:'1px solid var(--border)', opacity: acting === a.id ? 0.5 : 1, transition:'opacity 0.15s' }}>
              <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', letterSpacing:'0.15em', color:'var(--purple-hot)', fontWeight:700 }}>{a.type.toUpperCase()}</span>
              <div>
                <p style={{ fontFamily:'var(--font-display)', fontSize:'1.2rem', color:'var(--text-strong)', textTransform:'uppercase', lineHeight:1.1 }}>{a.name}</p>
                <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--text-dim)', letterSpacing:'0.1em', marginTop:'0.15rem' }}>Submitted {a.submittedAt}</p>
              </div>
              <div style={{ display:'flex', gap:'0.5rem' }}>
                <button onClick={() => approve(a)} disabled={acting === a.id} style={{ padding:'0.5rem 1rem', background:'rgba(0,200,100,0.15)', border:'1px solid #00c864', color:'#00c864', fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>✓ Accept</button>
                <button onClick={() => reject(a)} disabled={acting === a.id} style={{ padding:'0.5rem 1rem', background:'rgba(255,51,85,0.1)', border:'1px solid var(--accent-red)', color:'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>✕ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Show Booker ─────────────────────────────────────── */

function ShowBooker({ notes: _notes }: { notes: StoryNote[] }) {
  const [mode, setMode]         = useState<'weekly' | 'ppv'>('weekly')
  const [showName, setShowName] = useState('')
  const [showDate, setShowDate] = useState('')
  const [ppvName, setPpvName]   = useState('')
  const [slots, setSlots]       = useState<BookerSlot[]>(makeBookerSlots(9))
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [roster, setRoster]     = useState<BookerRosterEntry[]>([])
  const [titles, setTitles]     = useState<BookerTitle[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [showWriteIn, setShowWriteIn] = useState(false)
  const [writeInName, setWriteInName] = useState('')
  const [committing, setCommitting]   = useState(false)
  const [commitDone, setCommitDone]   = useState(false)
  const [commitError, setCommitError] = useState<string | null>(null)
  const [copied, setCopied]           = useState(false)

  useEffect(() => {
    async function load() {
      const [rosterRes, champRes, titleRes] = await Promise.all([
        supabase.from('roster_wrestlers').select('id, name, role, injured'),
        supabase.from('current_champions').select('holder_wrestler_id, title_name'),
        supabase.from('titles').select('id, name').eq('active', true).order('display_order'),
      ])
      const champMap = new Map<string, string>()
      ;(champRes.data ?? []).forEach((c: any) => { if (c.holder_wrestler_id) champMap.set(c.holder_wrestler_id, c.title_name) })
      const entries: BookerRosterEntry[] = (rosterRes.data ?? []).map((w: any) => ({ id: w.id, name: w.name, isChamp: champMap.has(w.id), champTitle: champMap.get(w.id) ?? null, role: w.role, injured: w.injured }))
      entries.sort((a, b) => { if (a.isChamp !== b.isChamp) return a.isChamp ? -1 : 1; return a.name.localeCompare(b.name) })
      setRoster(entries)
      setTitles((titleRes.data ?? []) as BookerTitle[])
      setLoading(false)
    }
    load()
  }, [])

  function changeMode(m: 'weekly' | 'ppv') { setMode(m); setSlots(makeBookerSlots(m === 'weekly' ? 9 : 12)); setSelectedSlot(null) }

  function assignRosterWrestler(entry: BookerRosterEntry) {
    if (selectedSlot === null) return
    setSlots((prev) => prev.map((s) => {
      if (s.id !== selectedSlot) return s
      if (s.participants.some((p) => p.type === 'roster' && p.wrestlerId === entry.id)) return s
      const count = participantCount(s.matchType)
      const parts = [...s.participants]
      const emptyIdx = parts.slice(0, count).findIndex((p) => !p.name)
      if (emptyIdx === -1) return s
      parts[emptyIdx] = { type: 'roster', wrestlerId: entry.id, name: entry.name }
      return { ...s, participants: parts }
    }))
  }

  function addWriteIn() {
    if (!writeInName.trim() || selectedSlot === null) return
    setSlots((prev) => prev.map((s) => {
      if (s.id !== selectedSlot) return s
      const count = participantCount(s.matchType)
      const parts = [...s.participants]
      const emptyIdx = parts.slice(0, count).findIndex((p) => !p.name)
      if (emptyIdx === -1) return s
      parts[emptyIdx] = { type: 'writein', wrestlerId: null, name: writeInName.trim() }
      return { ...s, participants: parts }
    }))
    setWriteInName('')
  }

  function removeParticipant(slotId: number, idx: number) {
    setSlots((prev) => prev.map((s) => { if (s.id !== slotId) return s; const parts = [...s.participants]; parts[idx] = emptyParticipant(); return { ...s, participants: parts } }))
  }

  function updateSideName(slotId: number, sideIdx: number, name: string) {
    setSlots((prev) => prev.map((s) => { if (s.id !== slotId) return s; const sideNames = [...s.sideNames]; sideNames[sideIdx] = name; return { ...s, sideNames } }))
  }

  function updateSlotField(id: number, key: keyof BookerSlot, value: any) {
    setSlots((prev) => prev.map((s) => {
      if (s.id !== id) return s
      const updated = { ...s, [key]: value }
      if (key === 'matchType') {
        const count = participantCount(value as string)
        const existing = s.participants.slice(0, count)
        while (existing.length < count) existing.push(emptyParticipant())
        updated.participants = existing
        updated.sideNames = Array(getParticipantsPerSide(value as string).length).fill('')
      }
      return updated
    }))
  }

  async function commitShow() {
    if (!showName.trim() || !showDate) { setCommitError('Show name and date are required.'); return }
    setCommitting(true); setCommitError(null)
    try {
      const { data: showData, error: showErr } = await supabase.from('shows').insert({ name: showName.trim(), show_date: showDate, show_type: mode, ppv_name: mode === 'ppv' && ppvName.trim() ? ppvName.trim() : null, status: 'committed' }).select('id').single()
      if (showErr) throw showErr
      const showId = showData.id
      for (const slot of slots) {
        const { data: matchData, error: matchErr } = await supabase.from('matches').insert({ show_id: showId, match_number: slot.id, match_type: slot.matchType, stipulation: slot.stipulation !== 'Standard' ? slot.stipulation : null, is_title_match: slot.isTitleMatch, title_id: slot.isTitleMatch && slot.titleId ? slot.titleId : null, is_mitb: false, mitb_cashin: false, is_draw: false }).select('id').single()
        if (matchErr) throw matchErr
        const matchId = matchData.id
        const count = participantCount(slot.matchType)
        const filled = slot.participants.slice(0, count).filter((p) => p.name)
        for (const p of filled) {
          const { error: mpErr } = await supabase.from('match_participants').insert({ match_id: matchId, wrestler_id: p.type === 'roster' ? p.wrestlerId : null, team_id: null, write_in_name: p.type === 'writein' ? p.name : null, result: 'loser' })
          if (mpErr) throw mpErr
        }
      }
      setCommitDone(true)
    } catch (e: any) {
      setCommitError(e?.message ?? 'Commit failed — please try again.')
    } finally {
      setCommitting(false)
    }
  }

  function exportToDiscord() {
    const header = mode === 'ppv' && ppvName ? `**DAW ${ppvName.toUpperCase()} — MATCH CARD**` : `**DAW ${mode === 'ppv' ? 'PPV' : 'WEEKLY'} — MATCH CARD**`
    const dateStr = showDate ? `📅 ${new Date(showDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''
    const lines = [header, ...(dateStr ? [dateStr] : []), '```', ...slots.map((s) => { const names = buildSideGroups(s.participants, s.matchType).map(({ side }, sideIdx) => { const faction = s.sideNames[sideIdx]?.trim(); return faction || side.filter((p) => p.name).map((p) => p.name).join(' & ') }).join(' vs '); const label = s.isMainEvent ? '★ MAIN EVENT — ' : `Match ${s.id} — `; const extra = [s.matchType !== 'Singles' ? s.matchType : '', s.stipulation !== 'Standard' ? s.stipulation : '', s.isTitleMatch ? 'TITLE' : ''].filter(Boolean).join(' · '); return `${label}${names || 'TBA'}${extra ? ` (${extra})` : ''}` }), '```']
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const filteredRoster = roster.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--text-strong)', textTransform:'uppercase' }}>Show Booker</h2>
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', flexWrap:'wrap' }}>
          <div className="tab-group">
            <button className={`tab${mode === 'weekly' ? ' active' : ''}`} onClick={() => changeMode('weekly')}>Weekly (9)</button>
            <button className={`tab${mode === 'ppv' ? ' active' : ''}`} onClick={() => changeMode('ppv')}>PPV (12)</button>
          </div>
          <button className="btn" onClick={exportToDiscord} style={{ padding:'0.6rem 1.25rem' }}>{copied ? '✓ Copied!' : '📋 Discord'}</button>
          <button className="btn btn-primary" onClick={commitShow} disabled={committing || commitDone} style={{ padding:'0.6rem 1.25rem' }}>{committing ? 'Committing…' : commitDone ? '✓ Show Committed!' : 'Commit Show'}</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:`1fr 180px${mode === 'ppv' ? ' 200px' : ''}`, gap:'0.75rem', marginBottom:'1.5rem', alignItems:'end' }}>
        <div>
          <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--text-dim)', letterSpacing:'0.15em', marginBottom:'0.3rem' }}>SHOW NAME</p>
          <input className="form-input" placeholder={mode === 'weekly' ? 'DAW Warehouse LIVE — Apr 26' : 'DAW Clash of Champions'} value={showName} onChange={(e) => setShowName(e.target.value)} style={{ fontSize:'0.75rem' }} />
        </div>
        <div>
          <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--text-dim)', letterSpacing:'0.15em', marginBottom:'0.3rem' }}>DATE</p>
          <input className="form-input" type="date" value={showDate} onChange={(e) => setShowDate(e.target.value)} style={{ fontSize:'0.75rem' }} />
        </div>
        {mode === 'ppv' && (
          <div>
            <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--text-dim)', letterSpacing:'0.15em', marginBottom:'0.3rem' }}>PPV NAME</p>
            <input className="form-input" placeholder="Clash of Champions" value={ppvName} onChange={(e) => setPpvName(e.target.value)} style={{ fontSize:'0.75rem' }} />
          </div>
        )}
      </div>

      {commitError && <div style={{ padding:'0.65rem 1rem', background:'rgba(255,51,85,0.1)', border:'1px solid var(--accent-red)', color:'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.68rem', letterSpacing:'0.08em', marginBottom:'1rem' }}>✕ {commitError}</div>}
      {commitDone && <div style={{ padding:'0.65rem 1rem', background:'rgba(0,200,100,0.1)', border:'1px solid #00c864', color:'#00c864', fontFamily:'var(--font-meta)', fontSize:'0.68rem', letterSpacing:'0.08em', marginBottom:'1rem' }}>✓ Show committed. Go to Results Entry to record outcomes after the show.</div>}

      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:'1.5rem' }}>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', display:'flex', flexDirection:'column', height:'fit-content', maxHeight:'75vh' }}>
          <div style={{ padding:'0.75rem', borderBottom:'1px solid var(--border)' }}>
            <input className="form-input" placeholder="Search roster..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontSize:'0.72rem', marginBottom:'0.5rem' }} />
            <button onClick={() => setShowWriteIn(!showWriteIn)} style={{ width:'100%', padding:'0.4rem', background: showWriteIn ? 'rgba(128,0,218,0.2)' : 'rgba(128,0,218,0.08)', border:'1px solid var(--purple)', color:'var(--purple-hot)', fontFamily:'var(--font-meta)', fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>
              {showWriteIn ? '▲ Hide Write-In' : '+ Write-In Wrestler'}
            </button>
            {showWriteIn && (
              <div style={{ marginTop:'0.5rem', display:'flex', gap:'0.4rem' }}>
                <input className="form-input" placeholder="Guest name…" value={writeInName} onChange={(e) => setWriteInName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addWriteIn() }} style={{ fontSize:'0.7rem', flex:1 }} />
                <button onClick={addWriteIn} disabled={!writeInName.trim() || selectedSlot === null} style={{ padding:'0 0.75rem', background:'rgba(128,0,218,0.15)', border:'1px solid var(--purple)', color:'var(--purple-hot)', fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, cursor:'pointer', flexShrink:0, opacity: (!writeInName.trim() || selectedSlot === null) ? 0.4 : 1 }}>Add</button>
              </div>
            )}
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            {loading ? (
              <p style={{ padding:'1rem', fontFamily:'var(--font-meta)', fontSize:'0.68rem', color:'var(--text-dim)', letterSpacing:'0.1em' }}>Loading roster…</p>
            ) : filteredRoster.map((w) => (
              <button key={w.id} onClick={() => assignRosterWrestler(w)} style={{ width:'100%', textAlign:'left', padding:'0.55rem 0.9rem', background:'none', border:'none', borderBottom:'1px solid rgba(42,42,51,0.5)', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.5rem', opacity: w.injured ? 0.5 : 1 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none' }}
              >
                <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.72rem', color:'var(--text-strong)', letterSpacing:'0.05em' }}>{w.name}</span>
                <div style={{ display:'flex', gap:'0.3rem', alignItems:'center', flexShrink:0 }}>
                  {w.isChamp && <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.48rem', color:'var(--bg-top)', background:'var(--gold)', padding:'1px 4px', fontWeight:700, letterSpacing:'0.08em' }}>CHAMP</span>}
                  {w.injured && <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.48rem', color:'var(--accent-red)', border:'1px solid var(--accent-red)', padding:'0px 4px', fontWeight:700, letterSpacing:'0.08em' }}>INJ</span>}
                  {w.role && <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.5rem', fontWeight:700, letterSpacing:'0.1em', color: w.role === 'Face' ? '#00c864' : w.role === 'Heel' ? 'var(--accent-red)' : 'var(--text-dim)' }}>{w.role.charAt(0)}</span>}
                </div>
              </button>
            ))}
          </div>
          {selectedSlot !== null && (
            <div style={{ padding:'0.6rem', background:'rgba(128,0,218,0.1)', borderTop:'1px solid var(--purple)', fontFamily:'var(--font-meta)', fontSize:'0.62rem', color:'var(--purple-hot)', letterSpacing:'0.12em' }}>► Assigning to Match {selectedSlot}</div>
          )}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {slots.map((slot) => {
            const count = participantCount(slot.matchType)
            const isSelected = selectedSlot === slot.id
            return (
              <div key={slot.id} onClick={() => setSelectedSlot(isSelected ? null : slot.id)} style={{ background:'var(--surface)', border:`2px solid ${slot.isMainEvent ? 'var(--gold)' : isSelected ? 'var(--purple)' : 'var(--border)'}`, padding:'1rem 1.25rem', cursor:'pointer' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem', flexWrap:'wrap', gap:'0.5rem' }}>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:'1rem', color: slot.isMainEvent ? 'var(--gold)' : 'var(--text-dim)', textTransform:'uppercase' }}>{slot.isMainEvent ? '★ Main Event' : `Match ${slot.id}`}</span>
                  <div style={{ display:'flex', gap:'0.5rem', alignItems:'center', flexWrap:'wrap' }}>
                    <select className="form-input form-select" style={{ padding:'0.3rem 2rem 0.3rem 0.6rem', fontSize:'0.62rem', width:'auto' }} value={slot.matchType} onChange={(e) => { e.stopPropagation(); updateSlotField(slot.id, 'matchType', e.target.value) }} onClick={(e) => e.stopPropagation()}>{MATCH_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                    <select className="form-input form-select" style={{ padding:'0.3rem 2rem 0.3rem 0.6rem', fontSize:'0.62rem', width:'auto' }} value={slot.stipulation} onChange={(e) => { e.stopPropagation(); updateSlotField(slot.id, 'stipulation', e.target.value) }} onClick={(e) => e.stopPropagation()}>{STIPULATIONS.map((s) => <option key={s}>{s}</option>)}</select>
                    <label style={{ display:'flex', alignItems:'center', gap:'0.35rem', cursor:'pointer' }} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={slot.isTitleMatch} onChange={(e) => updateSlotField(slot.id, 'isTitleMatch', e.target.checked)} style={{ accentColor:'var(--gold)' }} />
                      <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color: slot.isTitleMatch ? 'var(--gold)' : 'var(--text-dim)', letterSpacing:'0.1em' }}>Title Match</span>
                    </label>
                    {slot.isTitleMatch && (
                      <select className="form-input form-select" style={{ padding:'0.3rem 2rem 0.3rem 0.6rem', fontSize:'0.62rem', width:'auto' }} value={slot.titleId} onChange={(e) => { e.stopPropagation(); updateSlotField(slot.id, 'titleId', e.target.value) }} onClick={(e) => e.stopPropagation()}>
                        <option value=''>— Select Title —</option>
                        {titles.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem', flexWrap:'wrap' }}>
                  {buildSideGroups(slot.participants, slot.matchType).map(({ side, startIdx }, sideIdx) => (
                    <div key={sideIdx} style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem' }}>
                      {sideIdx > 0 && <span style={{ fontFamily:'var(--font-display)', fontSize:'1rem', color:'var(--accent-red)', opacity:0.6, paddingTop:'0.35rem' }}>vs</span>}
                      <div style={{ display:'flex', flexDirection:'column', gap:'0.25rem' }}>
                        {side.map((p, i) => (
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                            {i > 0 && <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--text-dim)' }}>&amp;</span>}
                            <div style={{ padding:'0.4rem 0.75rem', background: p.name ? (p.type === 'writein' ? 'rgba(128,0,218,0.1)' : 'var(--surface-2)') : 'transparent', border:`1px solid ${p.name ? (p.type === 'writein' ? 'var(--purple)' : 'var(--border-hot)') : 'rgba(42,42,51,0.5)'}`, display:'flex', alignItems:'center', gap:'0.45rem', minWidth:110 }}>
                              {p.type === 'writein' && p.name && <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.45rem', color:'var(--purple-hot)', fontWeight:700, letterSpacing:'0.08em', background:'rgba(128,0,218,0.2)', padding:'1px 4px', flexShrink:0 }}>GUEST</span>}
                              <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.68rem', color: p.name ? 'var(--text-strong)' : 'var(--text-dim)', letterSpacing:'0.08em', flex:1 }}>{p.name || `Slot ${startIdx + i + 1}`}</span>
                              {p.name && <button onClick={(e) => { e.stopPropagation(); removeParticipant(slot.id, startIdx + i) }} style={{ background:'none', border:'none', color:'var(--text-dim)', fontSize:'0.7rem', cursor:'pointer', padding:0, lineHeight:1 }}>✕</button>}
                            </div>
                          </div>
                        ))}
                        <input type="text" placeholder="Faction name…" value={slot.sideNames[sideIdx] ?? ''} onChange={(e) => { e.stopPropagation(); updateSideName(slot.id, sideIdx, e.target.value) }} onClick={(e) => e.stopPropagation()} style={{ fontFamily:'var(--font-meta)', fontSize:'0.58rem', padding:'0.15rem 0.5rem', background:'transparent', border:'1px dashed rgba(128,0,218,0.3)', color:'var(--purple-hot)', outline:'none', width:'100%', minWidth:110, letterSpacing:'0.05em' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Results Entry ───────────────────────────────────── */

function ResultsEntry() {
  const [shows, setShows]               = useState<ShowStub[]>([])
  const [loadingShows, setLoadingShows] = useState(true)
  const [selectedShow, setSelectedShow] = useState<ShowStub | null>(null)
  const [matches, setMatches]           = useState<MatchCard[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [forms, setForms]               = useState<Record<string, MatchResultForm>>({})
  const [submitting, setSubmitting]     = useState(false)
  const [submitDone, setSubmitDone]     = useState(false)
  const [submitError, setSubmitError]   = useState<string | null>(null)
  const [streamUrl, setStreamUrl]       = useState('')
  const [savingStream, setSavingStream] = useState(false)
  const [streamSaved, setStreamSaved]   = useState(false)

  useEffect(() => {
    async function loadShows() {
      const { data } = await supabase.from('shows').select('id, name, show_date, status, stream_url').in('status', ['committed', 'completed']).order('show_date', { ascending: false }).limit(20)
      setShows(data ?? [])
      setLoadingShows(false)
    }
    loadShows()
  }, [])

  async function saveStreamUrl() {
    if (!selectedShow) return
    setSavingStream(true)
    await supabase.from('shows').update({ stream_url: streamUrl.trim() || null }).eq('id', selectedShow.id)
    setStreamSaved(true); setSavingStream(false)
    setTimeout(() => setStreamSaved(false), 3000)
  }

  async function selectShow(show: ShowStub) {
    setSelectedShow(show); setStreamUrl(show.stream_url ?? ''); setStreamSaved(false); setLoadingMatches(true); setSubmitDone(false); setSubmitError(null)
    const { data } = await supabase.from('matches').select('id, match_number, match_type, stipulation, is_title_match, is_draw, defeat_type, rating, notes, match_participants(id, wrestler_id, team_id, write_in_name, result, wrestlers(name), teams(name))').eq('show_id', show.id).order('match_number')
    const cards: MatchCard[] = (data ?? []).map((m: any) => ({ id: m.id, match_number: m.match_number, match_type: m.match_type, stipulation: m.stipulation, is_title_match: m.is_title_match, is_draw: m.is_draw, defeat_type: m.defeat_type, rating: m.rating, notes: m.notes, participants: (m.match_participants ?? []).map((mp: any) => ({ mp_id: mp.id, name: mp.write_in_name ?? mp.wrestlers?.name ?? mp.teams?.name ?? 'Unknown', result: mp.result })) }))
    setMatches(cards)
    const initial: Record<string, MatchResultForm> = {}
    for (const c of cards) {
      const existingWinner = c.participants.find((p) => p.result === 'winner')
      initial[c.id] = { winner_mp_id: existingWinner?.mp_id ?? '', defeat_type: c.defeat_type ?? '', rating: c.rating != null ? String(c.rating) : '', notes: c.notes ?? '', add_to_story_board: false }
    }
    setForms(initial); setLoadingMatches(false)
  }

  function updateForm(matchId: string, patch: Partial<MatchResultForm>) {
    setForms((prev) => ({ ...prev, [matchId]: { ...prev[matchId], ...patch } }))
  }

  async function submitResults() {
    if (!selectedShow) return
    setSubmitting(true); setSubmitError(null)
    try {
      for (const match of matches) {
        const form = forms[match.id]
        if (!form) continue
        for (const p of match.participants) {
          const newResult = form.winner_mp_id === '' ? 'draw' : p.mp_id === form.winner_mp_id ? 'winner' : 'loser'
          const { error } = await supabase.from('match_participants').update({ result: newResult }).eq('id', p.mp_id)
          if (error) throw error
        }
        const { error: matchErr } = await supabase.from('matches').update({ defeat_type: form.defeat_type || null, rating: form.rating ? parseFloat(form.rating) : null, notes: form.notes || null, is_draw: form.winner_mp_id === '' }).eq('id', match.id)
        if (matchErr) throw matchErr
        if (form.add_to_story_board && form.notes.trim()) {
          await supabase.from('story_notes').insert({ note_type: 'angle', title: `${selectedShow.name} — Match ${match.match_number}`, body: form.notes.trim(), show_id: selectedShow.id })
        }
      }
      const { error: showErr } = await supabase.from('shows').update({ status: 'completed' }).eq('id', selectedShow.id)
      if (showErr) throw showErr
      setShows((prev) => prev.map((s) => s.id === selectedShow.id ? { ...s, status: 'completed' } : s))
      setSelectedShow((prev) => prev ? { ...prev, status: 'completed' } : prev)
      setSubmitDone(true)
    } catch (e: any) {
      setSubmitError(e?.message ?? 'Submit failed — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!selectedShow) {
    return (
      <div>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--text-strong)', textTransform:'uppercase', marginBottom:'1.5rem' }}>Results Entry</h2>
        {loadingShows ? (
          <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>Loading shows…</p>
        ) : shows.length === 0 ? (
          <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>No committed shows found. Book and commit a show first.</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            {shows.map((s) => (
              <button key={s.id} onClick={() => selectShow(s)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 1.25rem', background:'var(--surface)', border:'1px solid var(--border)', textAlign:'left', cursor:'pointer' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--purple)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
              >
                <div>
                  <p style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', color:'var(--text-strong)', textTransform:'uppercase', lineHeight:1.1 }}>{s.name}</p>
                  <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--text-dim)', letterSpacing:'0.1em', marginTop:'0.2rem' }}>{new Date(s.show_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.12em', padding:'0.2rem 0.6rem', background: s.status === 'committed' ? 'rgba(128,0,218,0.15)' : 'rgba(0,200,100,0.12)', color: s.status === 'committed' ? 'var(--purple-hot)' : '#00c864', border: `1px solid ${s.status === 'committed' ? 'var(--purple)' : '#00c864'}` }}>{s.status.toUpperCase()}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <button onClick={() => { setSelectedShow(null); setMatches([]) }} style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', color:'var(--text-dim)', letterSpacing:'0.12em', background:'none', border:'none', cursor:'pointer', padding:0, marginBottom:'0.5rem' }}>← All Shows</button>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--text-strong)', textTransform:'uppercase', lineHeight:1 }}>{selectedShow.name}</h2>
          <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', color:'var(--text-dim)', letterSpacing:'0.1em', marginTop:'0.25rem' }}>{new Date(selectedShow.show_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <button className="btn btn-primary" onClick={submitResults} disabled={submitting || submitDone} style={{ padding:'0.65rem 1.5rem' }}>{submitting ? 'Saving…' : submitDone ? '✓ Results Saved' : 'Submit All Results'}</button>
      </div>

      <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', marginBottom:'1.25rem', padding:'1rem', background:'var(--surface)', border:'1px solid var(--border)', flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:240 }}>
          <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.58rem', color:'var(--text-dim)', letterSpacing:'0.15em', marginBottom:'0.3rem' }}>▶ YOUTUBE STREAM URL</p>
          <input className="form-input" placeholder="https://www.youtube.com/watch?v=..." value={streamUrl} onChange={(e) => { setStreamUrl(e.target.value); setStreamSaved(false) }} style={{ fontSize:'0.72rem' }} />
        </div>
        <button onClick={saveStreamUrl} disabled={savingStream} style={{ padding:'0.5rem 1rem', background: streamSaved ? 'rgba(0,200,100,0.15)' : 'rgba(128,0,218,0.15)', border:`1px solid ${streamSaved ? '#00c864' : 'var(--purple)'}`, color: streamSaved ? '#00c864' : 'var(--purple-hot)', fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer', flexShrink:0 }}>{savingStream ? 'Saving…' : streamSaved ? '✓ Saved' : 'Save URL'}</button>
      </div>

      {submitError && <div style={{ padding:'0.75rem 1rem', background:'rgba(255,51,85,0.1)', border:'1px solid var(--accent-red)', color:'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.68rem', letterSpacing:'0.08em', marginBottom:'1rem' }}>✕ {submitError}</div>}

      {loadingMatches ? (
        <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>Loading matchcard…</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {matches.map((match, idx) => {
            const form = forms[match.id] ?? { winner_mp_id:'', defeat_type:'', rating:'', notes:'', add_to_story_board:false }
            const isMainEvent = idx === matches.length - 1
            return (
              <div key={match.id} style={{ background:'var(--surface)', border:`2px solid ${isMainEvent ? 'var(--gold)' : 'var(--border)'}`, padding:'1.25rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:'1rem', color: isMainEvent ? 'var(--gold)' : 'var(--text-dim)', textTransform:'uppercase' }}>{isMainEvent ? '★ Main Event' : `Match ${match.match_number}`}</span>
                    <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--purple-hot)', letterSpacing:'0.12em' }}>{match.match_type}{match.stipulation ? ` · ${match.stipulation}` : ''}{match.is_title_match ? ' · 🏆 Title' : ''}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--text-dim)', letterSpacing:'0.12em' }}>RATING</span>
                    <select className="form-input form-select" value={form.rating} onChange={(e) => updateForm(match.id, { rating: e.target.value })} style={{ padding:'0.3rem 2rem 0.3rem 0.6rem', fontSize:'0.65rem', width:'auto' }}>{RATINGS.map((r) => <option key={r} value={r}>{r || '—'}</option>)}</select>
                    <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.55rem', color:'var(--text-dim)' }}>/ 5.0</span>
                  </div>
                </div>
                <div style={{ marginBottom:'1rem' }}>
                  <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--text-dim)', letterSpacing:'0.15em', marginBottom:'0.5rem' }}>WINNER</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
                    {match.participants.map((p) => {
                      const selected = form.winner_mp_id === p.mp_id
                      return (
                        <button key={p.mp_id} type="button" onClick={() => updateForm(match.id, { winner_mp_id: p.mp_id })} style={{ padding:'0.5rem 1rem', background: selected ? 'rgba(0,200,100,0.15)' : 'var(--surface-2)', border:`1px solid ${selected ? '#00c864' : 'var(--border)'}`, color: selected ? '#00c864' : 'var(--text-muted)', fontFamily:'var(--font-display)', fontSize:'0.85rem', textTransform:'uppercase', cursor:'pointer' }}>{selected && '✓ '}{p.name}</button>
                      )
                    })}
                    <button type="button" onClick={() => updateForm(match.id, { winner_mp_id: '' })} style={{ padding:'0.5rem 1rem', background: form.winner_mp_id === '' ? 'rgba(245,158,11,0.15)' : 'var(--surface-2)', border:`1px solid ${form.winner_mp_id === '' ? '#f59e0b' : 'var(--border)'}`, color: form.winner_mp_id === '' ? '#f59e0b' : 'var(--text-dim)', fontFamily:'var(--font-meta)', fontSize:'0.65rem', letterSpacing:'0.1em', cursor:'pointer' }}>Draw / No Contest</button>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'160px 1fr', gap:'1rem', alignItems:'start' }}>
                  <div>
                    <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--text-dim)', letterSpacing:'0.15em', marginBottom:'0.35rem' }}>FINISH</p>
                    <select className="form-input form-select" value={form.defeat_type} onChange={(e) => updateForm(match.id, { defeat_type: e.target.value })} style={{ padding:'0.35rem 2rem 0.35rem 0.6rem', fontSize:'0.68rem', width:'100%' }}>{DEFEAT_TYPES.map((d) => <option key={d} value={d}>{d || '— Select —'}</option>)}</select>
                  </div>
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.35rem' }}>
                      <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>MATCH NOTES</p>
                      <label style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer' }}>
                        <input type="checkbox" checked={form.add_to_story_board} onChange={(e) => updateForm(match.id, { add_to_story_board: e.target.checked })} style={{ accentColor:'var(--purple-hot)' }} />
                        <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.58rem', color: form.add_to_story_board ? 'var(--purple-hot)' : 'var(--text-dim)', letterSpacing:'0.1em' }}>Add to Story Board</span>
                      </label>
                    </div>
                    <textarea className="form-input form-textarea" placeholder="Key moments, angles, post-match happenings…" value={form.notes} onChange={(e) => updateForm(match.id, { notes: e.target.value })} style={{ fontSize:'0.72rem', minHeight:64, resize:'vertical' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Champions Management ───────────────────────────── */

function ChampionsSection() {
  const [titles, setTitles]       = useState<TitleRow[]>([])
  const [champs, setChamps]       = useState<ChampRow[]>([])
  const [wrestlers, setWrestlers] = useState<{ id: string; name: string }[]>([])
  const [teams, setTeams]         = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading]     = useState(true)
  const [editId, setEditId]       = useState<string | null>(null)
  const [holderType, setHolderType] = useState<'wrestler' | 'team'>('wrestler')
  const [rebuilding, setRebuilding] = useState(false)
  const [rebuildResult, setRebuildResult] = useState<string | null>(null)
  const [rebuildError, setRebuildError]   = useState<string | null>(null)
  const [holderId, setHolderId]   = useState('')
  const [wonDate, setWonDate]     = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [renamingId, setRenamingId]   = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [tRes, cRes, wRes, tmRes] = await Promise.all([
      supabase.from('titles').select('id, name, category, display_order').eq('active', true).order('display_order'),
      supabase.from('current_champions').select('*'),
      supabase.from('wrestlers').select('id, name').eq('active', true).order('name'),
      supabase.from('teams').select('id, name').eq('active', true).order('name'),
    ])
    setTitles(tRes.data ?? [])
    setChamps(cRes.data ?? [])
    setWrestlers(wRes.data ?? [])
    setTeams(tmRes.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  function getChamp(titleId: string) { return champs.find((c) => c.title_id === titleId) ?? null }

  function openEdit(titleId: string) {
    const title = titles.find((t) => t.id === titleId)
    setEditId(titleId)
    setHolderType(title?.category === 'Tag' ? 'team' : 'wrestler')
    setHolderId('')
    setWonDate(new Date().toISOString().slice(0, 10))
    setSaveError(null)
  }

  async function save() {
    if (!editId || !holderId) return
    setSaving(true); setSaveError(null)
    await supabase.from('title_reigns').update({ lost_date: wonDate }).eq('title_id', editId).is('lost_date', null)
    const { data: prev } = await supabase.from('title_reigns').select('reign_number').eq('title_id', editId).order('reign_number', { ascending: false }).limit(1)
    const nextNum = ((prev?.[0]?.reign_number ?? 0) as number) + 1
    const { error } = await supabase.from('title_reigns').insert({ title_id: editId, holder_wrestler_id: holderType === 'wrestler' ? holderId : null, holder_team_id: holderType === 'team' ? holderId : null, won_date: wonDate, reign_number: nextNum })
    if (error) { setSaveError(error.message); setSaving(false); return }
    await loadAll()
    setEditId(null); setSaving(false)
  }

  async function vacate(titleId: string) {
    await supabase.from('title_reigns').update({ lost_date: new Date().toISOString().slice(0, 10) }).eq('title_id', titleId).is('lost_date', null)
    await loadAll()
  }

  async function retire(titleId: string, titleName: string) {
    if (!confirm(`Retire "${titleName}"? This will close the current reign and mark the title inactive. It will no longer appear on the site but its history is preserved.`)) return
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('title_reigns').update({ lost_date: today }).eq('title_id', titleId).is('lost_date', null)
    await supabase.from('titles').update({ active: false }).eq('id', titleId)
    await loadAll()
  }

  async function startRename(titleId: string, currentName: string) {
    setRenamingId(titleId); setRenameValue(currentName)
  }

  async function saveRename(titleId: string) {
    const trimmed = renameValue.trim()
    if (!trimmed) return
    setRenameSaving(true)
    await supabase.from('titles').update({ name: trimmed }).eq('id', titleId)
    setRenamingId(null)
    setRenameSaving(false)
    await loadAll()
  }

  async function rebuildFromMatches() {
    if (!confirm('This will DELETE all existing title reigns and regenerate them from match results. Continue?')) return
    setRebuilding(true); setRebuildResult(null); setRebuildError(null)
    const res = await fetch('/api/admin/rebuild-reigns', { method: 'POST' })
    const data = await res.json()
    if (data.error) { setRebuildError(data.error) }
    else { setRebuildResult(data.message); await loadAll() }
    setRebuilding(false)
  }

  if (loading) return <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>Loading…</p>

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--text-strong)', textTransform:'uppercase' }}>Champion Management</h2>
        <button
          onClick={rebuildFromMatches}
          disabled={rebuilding}
          style={{ padding:'0.55rem 1.1rem', background:'rgba(255,201,51,0.1)', border:'1px solid var(--gold)', color:'var(--gold)', fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.12em', cursor:'pointer', flexShrink:0, opacity: rebuilding ? 0.5 : 1 }}
        >
          {rebuilding ? 'Rebuilding…' : '⟳ Rebuild from Matches'}
        </button>
      </div>
      {rebuildResult && <div style={{ padding:'0.65rem 1rem', background:'rgba(0,200,100,0.1)', border:'1px solid #00c864', color:'#00c864', fontFamily:'var(--font-meta)', fontSize:'0.68rem', letterSpacing:'0.08em', marginBottom:'1rem' }}>✓ {rebuildResult}</div>}
      {rebuildError  && <div style={{ padding:'0.65rem 1rem', background:'rgba(255,51,85,0.1)', border:'1px solid var(--accent-red)', color:'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.68rem', letterSpacing:'0.08em', marginBottom:'1rem' }}>✕ {rebuildError}</div>}
      <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.72rem', color:'var(--text-dim)', letterSpacing:'0.1em', marginBottom:'2rem', lineHeight:1.8 }}>Assign or change the current holder for each active title. Use "Rebuild from Matches" to auto-generate all reigns from recorded match results.</p>
      <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
        {titles.map((title) => {
          const champ = getChamp(title.id)
          const isEditing = editId === title.id
          return (
            <div key={title.id} style={{ background:'var(--surface)', border:`1px solid ${champ ? 'rgba(255,201,51,0.3)' : 'var(--border)'}` }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center', gap:'1rem', padding:'1rem 1.25rem' }}>
                <div>
                  <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.55rem', color:'var(--gold)', letterSpacing:'0.2em', fontWeight:700, textTransform:'uppercase', marginBottom:'0.2rem' }}>{title.category}</p>
                  {renamingId === title.id ? (
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.3rem' }}>
                      <input
                        className="form-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveRename(title.id); if (e.key === 'Escape') setRenamingId(null) }}
                        autoFocus
                        style={{ fontFamily:'var(--font-display)', fontSize:'1rem', textTransform:'uppercase', padding:'0.3rem 0.6rem', width: 280 }}
                      />
                      <button onClick={() => saveRename(title.id)} disabled={renameSaving || !renameValue.trim()} style={{ padding:'0.3rem 0.75rem', background:'var(--gold)', border:'none', color:'var(--bg-top)', fontFamily:'var(--font-meta)', fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>{renameSaving ? '…' : '✓'}</button>
                      <button onClick={() => setRenamingId(null)} style={{ padding:'0.3rem 0.6rem', background:'transparent', border:'1px solid var(--border)', color:'var(--text-dim)', fontFamily:'var(--font-meta)', fontSize:'0.62rem', cursor:'pointer' }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <p style={{ fontFamily:'var(--font-display)', fontSize:'1.15rem', color:'var(--text-strong)', textTransform:'uppercase', lineHeight:1.1 }}>{title.name}</p>
                      <button onClick={() => startRename(title.id, title.name)} style={{ background:'none', border:'none', color:'var(--text-dim)', fontSize:'0.75rem', cursor:'pointer', padding:'0 0.25rem', lineHeight:1, flexShrink:0 }} title="Rename title">✎</button>
                    </div>
                  )}
                  {champ ? (
                    <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.65rem', color:'var(--gold)', letterSpacing:'0.1em', marginTop:'0.3rem' }}>★ {champ.holder_name} — {champ.days_held} days</p>
                  ) : (
                    <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.65rem', color:'var(--text-dim)', letterSpacing:'0.1em', marginTop:'0.3rem' }}>VACANT</p>
                  )}
                </div>
                <div style={{ display:'flex', gap:'0.5rem' }}>
                  <button onClick={() => isEditing ? setEditId(null) : openEdit(title.id)} style={{ padding:'0.5rem 1rem', background: isEditing ? 'var(--surface-3)' : 'rgba(255,201,51,0.12)', border:`1px solid ${isEditing ? 'var(--border)' : 'var(--gold)'}`, color: isEditing ? 'var(--text-dim)' : 'var(--gold)', fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>{isEditing ? 'Cancel' : champ ? 'Change' : 'Assign'}</button>
                  {champ && !isEditing && <button onClick={() => vacate(title.id)} style={{ padding:'0.5rem 1rem', background:'rgba(255,51,85,0.08)', border:'1px solid var(--accent-red)', color:'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>Vacate</button>}
                  {!isEditing && <button onClick={() => retire(title.id, title.name)} style={{ padding:'0.5rem 1rem', background:'transparent', border:'1px solid var(--border)', color:'var(--text-dim)', fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }} title="Mark this title as retired and remove it from the active roster">Retire</button>}
                </div>
              </div>
              {isEditing && (
                <div style={{ borderTop:'1px solid var(--border)', padding:'1.25rem', background:'var(--surface-2)', display:'flex', flexDirection:'column', gap:'0.85rem' }}>
                  {saveError && <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', color:'var(--accent-red)', letterSpacing:'0.08em' }}>{saveError}</p>}
                  <div style={{ display:'flex', gap:'0.5rem' }}>
                    {(['wrestler', 'team'] as const).map((t) => (
                      <button key={t} onClick={() => { setHolderType(t); setHolderId('') }} style={{ padding:'0.35rem 0.85rem', background: holderType === t ? 'var(--purple)' : 'transparent', border:'1px solid var(--border)', color: holderType === t ? 'white' : 'var(--text-dim)', fontFamily:'var(--font-meta)', fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', cursor:'pointer' }}>{t === 'wrestler' ? 'Wrestler' : 'Tag Team'}</button>
                    ))}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 180px auto', gap:'0.75rem', alignItems:'end' }}>
                    <div className="form-field" style={{ marginBottom:0 }}>
                      <label className="form-label">{holderType === 'wrestler' ? 'Wrestler' : 'Tag Team'}</label>
                      <select className="form-input form-select" value={holderId} onChange={(e) => setHolderId(e.target.value)}>
                        <option value="">— Select —</option>
                        {(holderType === 'wrestler' ? wrestlers : teams).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                    <div className="form-field" style={{ marginBottom:0 }}>
                      <label className="form-label">Won Date</label>
                      <input type="date" className="form-input" value={wonDate} onChange={(e) => setWonDate(e.target.value)} />
                    </div>
                    <button onClick={save} disabled={!holderId || saving} style={{ padding:'0.65rem 1.25rem', background: holderId ? 'var(--gold)' : 'var(--surface-3)', border:'none', color: holderId ? 'var(--bg-top)' : 'var(--text-dim)', fontFamily:'var(--font-meta)', fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', cursor:'pointer', opacity: saving ? 0.6 : 1, height:'fit-content' }}>{saving ? 'Saving…' : 'Set Champion'}</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Ownership Assignment ────────────────────────────── */

function OwnershipSection() {
  const [tab, setTab]               = useState<'wrestlers' | 'factions'>('wrestlers')
  const [items, setItems]           = useState<OwnerRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [listSearch, setListSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [profileQuery, setProfileQuery] = useState('')
  const [profileResults, setProfileResults] = useState<ProfileResult[]>([])
  const [allUsers, setAllUsers]     = useState<{ id: string; name: string; email: string }[]>([])
  const [acting, setActing]         = useState(false)
  const [feedback, setFeedback]     = useState<{ id: string; msg: string } | null>(null)

  const loadItems = useCallback(async () => {
    setLoading(true); setExpandedId(null); setProfileQuery(''); setProfileResults([])
    const table = tab === 'wrestlers' ? 'wrestlers' : 'teams'
    const { data } = await supabase.from(table).select('id, name, status, submitted_by, profiles:submitted_by(display_name, twitch_handle)').order('name')
    setItems((data ?? []).map((row: any) => ({ id: row.id, name: row.name, status: row.status, submitted_by: row.submitted_by, owner: row.profiles ?? null })))
    setLoading(false)
  }, [tab])

  useEffect(() => { loadItems() }, [loadItems])
  useEffect(() => { fetch('/api/admin/users').then(r => r.json()).then(d => { if (d.users) setAllUsers(d.users) }).catch(() => {}) }, [])

  function searchProfiles(query: string) {
    setProfileQuery(query)
    if (!query.trim()) { setProfileResults([]); return }
    const q = query.toLowerCase()
    setProfileResults(allUsers.filter(u => u.name.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)).slice(0, 8).map(u => ({ id: u.id, display_name: u.name, twitch_handle: null })))
  }

  async function assign(itemId: string, userId: string | null) {
    setActing(true)
    const res = await fetch('/api/admin/assign-owner', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: itemId, targetType: tab === 'factions' ? 'teams' : 'wrestlers', userId }),
    })
    const data = await res.json()
    const item = items.find((i) => i.id === itemId)
    if (data.error) { setFeedback({ id: itemId, msg: `Error: ${data.error}` }) }
    else { setFeedback({ id: itemId, msg: userId === null ? `Owner removed from ${item?.name}.` : `Owner assigned to ${item?.name}.` }); await loadItems() }
    setActing(false); setExpandedId(null)
    setTimeout(() => setFeedback(null), 3500)
  }

  const filtered = items.filter((i) => i.name.toLowerCase().includes(listSearch.toLowerCase()))
  const STATUS_COLOR: Record<string, string> = { hired: '#00c864', pending: '#f59e0b', retired: 'var(--text-dim)', released: 'var(--accent-red)', rejected: 'var(--accent-red)' }

  return (
    <div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--text-strong)', textTransform:'uppercase', marginBottom:'0.35rem' }}>Ownership Assignment</h2>
      <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.65rem', color:'var(--text-dim)', letterSpacing:'0.1em', marginBottom:'1.5rem', lineHeight:1.8 }}>Assign or transfer a wrestler / faction to any registered user.</p>
      {feedback && <div style={{ padding:'0.65rem 1rem', background:'rgba(0,200,100,0.12)', border:'1px solid #00c864', color:'#00c864', fontFamily:'var(--font-meta)', fontSize:'0.68rem', letterSpacing:'0.08em', marginBottom:'1rem' }}>✓ {feedback.msg}</div>}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', gap:'1rem', flexWrap:'wrap' }}>
        <div className="tab-group">
          <button className={`tab${tab === 'wrestlers' ? ' active' : ''}`} onClick={() => setTab('wrestlers')}>Wrestlers</button>
          <button className={`tab${tab === 'factions' ? ' active' : ''}`} onClick={() => setTab('factions')}>Factions</button>
        </div>
        <input className="form-input" placeholder={`Search ${tab}…`} value={listSearch} onChange={(e) => setListSearch(e.target.value)} style={{ maxWidth:260, fontSize:'0.72rem' }} />
      </div>
      {loading ? (
        <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.72rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>Loading…</p>
      ) : (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 90px 200px 120px', gap:'0.75rem', padding:'0.6rem 1rem', background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }}>
            {['Name', 'Status', 'Current Owner', ''].map((h, i) => <span key={i} style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.15em', color:'var(--text-dim)' }}>{h}</span>)}
          </div>
          {filtered.length === 0 && <p style={{ padding:'1rem', fontFamily:'var(--font-meta)', fontSize:'0.72rem', color:'var(--text-dim)', letterSpacing:'0.12em' }}>No results.</p>}
          {filtered.map((item) => (
            <div key={item.id}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 90px 200px 120px', gap:'0.75rem', padding:'0.65rem 1rem', borderBottom:'1px solid rgba(42,42,51,0.5)', alignItems:'center' }}>
                <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-strong)', letterSpacing:'0.05em' }}>{item.name}</span>
                <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', color: STATUS_COLOR[item.status] ?? 'var(--text-dim)' }}>{item.status.toUpperCase()}</span>
                <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.68rem', color: item.owner ? 'var(--text-muted)' : 'var(--text-dim)', letterSpacing:'0.05em' }}>{item.owner ? (item.owner.display_name ?? item.owner.twitch_handle ?? 'Unknown user') : <span style={{ color:'var(--text-dim)', fontStyle:'italic' }}>Unassigned</span>}</span>
                <button onClick={() => { setExpandedId(expandedId === item.id ? null : item.id); setProfileQuery(''); setProfileResults([]) }} style={{ padding:'0.35rem 0.75rem', background: expandedId === item.id ? 'rgba(128,0,218,0.2)' : 'rgba(128,0,218,0.1)', border:'1px solid var(--purple)', color:'var(--purple-hot)', fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>{expandedId === item.id ? '✕ Cancel' : 'Assign Owner'}</button>
              </div>
              {expandedId === item.id && (
                <div style={{ padding:'1rem 1rem 1rem 2rem', background:'rgba(128,0,218,0.05)', borderBottom:'1px solid var(--border)', borderLeft:'3px solid var(--purple)' }}>
                  <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--purple-hot)', letterSpacing:'0.2em', fontWeight:700, marginBottom:'0.75rem' }}>ASSIGN OWNER — {item.name.toUpperCase()}</p>
                  <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', marginBottom:'0.65rem' }}>
                    <input className="form-input" placeholder="Search by display name or Twitch handle…" value={profileQuery} onChange={(e) => searchProfiles(e.target.value)} style={{ fontSize:'0.72rem', maxWidth:360 }} autoFocus />
                  </div>
                  {profileResults.length > 0 && (
                    <div style={{ display:'flex', flexDirection:'column', gap:'0.35rem', marginBottom:'0.75rem', maxWidth:400 }}>
                      {profileResults.map((p) => (
                        <button key={p.id} onClick={() => assign(item.id, p.id)} disabled={acting} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.55rem 0.9rem', background:'var(--surface)', border:'1px solid var(--border)', textAlign:'left', cursor:'pointer' }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--purple)' }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                        >
                          <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.72rem', color:'var(--text-strong)', letterSpacing:'0.05em' }}>{p.display_name ?? 'No display name'}</span>
                          {p.twitch_handle && <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', color:'var(--purple-hot)', letterSpacing:'0.08em' }}>@{p.twitch_handle}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {item.submitted_by && <button onClick={() => assign(item.id, null)} disabled={acting} style={{ padding:'0.4rem 0.85rem', background:'rgba(255,51,85,0.08)', border:'1px solid var(--accent-red)', color:'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>Remove Current Owner</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Roster Images ───────────────────────────────────── */

function RosterImages() {
  const [tab, setTab]           = useState<'wrestlers' | 'factions'>('wrestlers')
  const [items, setItems]       = useState<ImageRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [feedback, setFeedback]     = useState<{ id: string; ok: boolean; msg: string } | null>(null)

  const loadItems = useCallback(async () => {
    setLoading(true); setExpandedId(null)
    const table = tab === 'wrestlers' ? 'wrestlers' : 'teams'
    const { data } = await supabase.from(table).select('id, name, render_url, status').order('name')
    setItems(data ?? []); setLoading(false)
  }, [tab])

  useEffect(() => { loadItems() }, [loadItems])

  async function handleUpload(itemId: string, file: File) {
    setUploading(true); setFeedback(null)
    const table = tab === 'wrestlers' ? 'wrestlers' : 'teams'
    const folder = tab === 'wrestlers' ? 'wrestlers' : 'factions'
    const ext = file.name.split('.').pop()
    const path = `${folder}/${itemId}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('renders').upload(path, file, { upsert: true, contentType: file.type })
    if (uploadErr) { setFeedback({ id: itemId, ok: false, msg: uploadErr.message }); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('renders').getPublicUrl(path)
    const { error: updateErr } = await supabase.from(table).update({ render_url: publicUrl }).eq('id', itemId)
    if (updateErr) { setFeedback({ id: itemId, ok: false, msg: updateErr.message }) }
    else { setFeedback({ id: itemId, ok: true, msg: 'Image uploaded successfully.' }); await loadItems(); setExpandedId(null) }
    setUploading(false)
    setTimeout(() => setFeedback(null), 4000)
  }

  async function removeImage(itemId: string) {
    const table = tab === 'wrestlers' ? 'wrestlers' : 'teams'
    const { error } = await supabase.from(table).update({ render_url: null }).eq('id', itemId)
    if (!error) { setFeedback({ id: itemId, ok: true, msg: 'Image removed.' }); await loadItems() }
    setTimeout(() => setFeedback(null), 4000)
  }

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--text-strong)', textTransform:'uppercase', marginBottom:'0.35rem' }}>Roster Images</h2>
      <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.65rem', color:'var(--text-dim)', letterSpacing:'0.1em', marginBottom:'1.5rem', lineHeight:1.8 }}>Upload or replace portrait images for wrestlers and factions.</p>
      {feedback && <div style={{ padding:'0.65rem 1rem', background: feedback.ok ? 'rgba(0,200,100,0.12)' : 'rgba(255,51,85,0.1)', border:`1px solid ${feedback.ok ? '#00c864' : 'var(--accent-red)'}`, color: feedback.ok ? '#00c864' : 'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.68rem', letterSpacing:'0.08em', marginBottom:'1rem' }}>{feedback.ok ? '✓' : '✕'} {feedback.msg}</div>}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', gap:'1rem', flexWrap:'wrap' }}>
        <div className="tab-group">
          <button className={`tab${tab === 'wrestlers' ? ' active' : ''}`} onClick={() => setTab('wrestlers')}>Wrestlers</button>
          <button className={`tab${tab === 'factions' ? ' active' : ''}`} onClick={() => setTab('factions')}>Factions</button>
        </div>
        <input className="form-input" placeholder={`Search ${tab}…`} value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth:260, fontSize:'0.72rem' }} />
      </div>
      {loading ? (
        <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.72rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>Loading…</p>
      ) : (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 90px 120px', gap:'0.75rem', padding:'0.6rem 1rem', background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }}>
            {['Image', 'Name', 'Status', ''].map((h, i) => <span key={i} style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.15em', color:'var(--text-dim)' }}>{h}</span>)}
          </div>
          {filtered.map((item) => (
            <div key={item.id}>
              <div style={{ display:'grid', gridTemplateColumns:'80px 1fr 90px 120px', gap:'0.75rem', padding:'0.65rem 1rem', borderBottom:'1px solid rgba(42,42,51,0.5)', alignItems:'center' }}>
                <div style={{ width:56, height:56, background:'var(--surface-2)', border:'1px solid var(--border)', overflow:'hidden', flexShrink:0 }}>
                  {item.render_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.render_url} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }} />
                  ) : (
                    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.55rem', color:'var(--text-dim)', letterSpacing:'0.1em' }}>NONE</span>
                    </div>
                  )}
                </div>
                <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-strong)', letterSpacing:'0.05em' }}>{item.name}</span>
                <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', color: item.status === 'hired' ? '#00c864' : item.status === 'pending' ? '#f59e0b' : 'var(--text-dim)', textTransform:'uppercase' }}>{item.status}</span>
                <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} style={{ padding:'0.35rem 0.75rem', background: expandedId === item.id ? 'rgba(128,0,218,0.2)' : 'rgba(128,0,218,0.1)', border:'1px solid var(--purple)', color:'var(--purple-hot)', fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>{expandedId === item.id ? '✕ Cancel' : item.render_url ? 'Replace' : 'Upload'}</button>
              </div>
              {expandedId === item.id && (
                <div style={{ padding:'1rem 1rem 1rem 2rem', background:'rgba(128,0,218,0.05)', borderBottom:'1px solid var(--border)', borderLeft:'3px solid var(--purple)' }}>
                  <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--purple-hot)', letterSpacing:'0.2em', fontWeight:700, marginBottom:'0.75rem' }}>UPLOAD IMAGE — {item.name.toUpperCase()}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
                    <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUpload(item.id, file) }} style={{ fontFamily:'var(--font-meta)', fontSize:'0.68rem', color:'var(--text-muted)' }} />
                    {uploading && <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', color:'var(--purple-hot)', letterSpacing:'0.1em' }}>Uploading…</span>}
                  </div>
                  {item.render_url && <button onClick={() => removeImage(item.id)} style={{ marginTop:'0.75rem', padding:'0.4rem 0.85rem', background:'rgba(255,51,85,0.08)', border:'1px solid var(--accent-red)', color:'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>Remove Current Image</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Roster Edits ────────────────────────────────────── */

function RosterEdits() {
  const [search, setSearch]   = useState('')
  const [rows, setRows]       = useState<RosterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('wrestlers').select('id, name, division, role, injured, status').eq('active', true).order('name')
      setRows((data ?? []).map((r: any) => ({ ...r, injured: !!r.injured, saved: false })))
      setLoading(false)
    }
    load()
  }, [])

  function update(id: string, key: keyof RosterRow, value: any) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [key]: value, saved: false } : r))
  }

  async function save(id: string) {
    setSaving(id)
    const row = rows.find((r) => r.id === id)
    if (!row) { setSaving(null); return }
    await supabase.from('wrestlers').update({ division: row.division, role: row.role, injured: row.injured }).eq('id', id)
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, saved: true } : r))
    setSaving(null)
  }

  async function retire(id: string) {
    await supabase.from('wrestlers').update({ status: 'retired', active: false }).eq('id', id)
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--text-strong)', textTransform:'uppercase' }}>Roster Edits</h2>
        <input className="form-input" placeholder="Search wrestlers..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth:240, fontSize:'0.72rem' }} />
      </div>
      {loading ? (
        <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>Loading…</p>
      ) : (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 130px 130px 100px 90px 80px', gap:'0.75rem', padding:'0.65rem 1rem', background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }}>
            {['Wrestler','Division','Role','Injured','',''].map((h, i) => <span key={i} style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.15em', color:'var(--text-dim)' }}>{h}</span>)}
          </div>
          <div style={{ maxHeight:'60vh', overflowY:'auto' }}>
            {filtered.map((row) => (
              <div key={row.id} style={{ display:'grid', gridTemplateColumns:'1fr 130px 130px 100px 90px 80px', gap:'0.75rem', padding:'0.6rem 1rem', borderBottom:'1px solid rgba(42,42,51,0.5)', alignItems:'center' }}>
                <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-strong)', letterSpacing:'0.05em' }}>{row.name}</span>
                <select className="form-input form-select" value={row.division ?? ''} onChange={(e) => update(row.id, 'division', e.target.value)} style={{ padding:'0.35rem 2rem 0.35rem 0.6rem', fontSize:'0.68rem' }}>
                  <option value="">—</option>
                  {['Mens','Womens','Mixed'].map((o) => <option key={o}>{o}</option>)}
                </select>
                <select className="form-input form-select" value={row.role ?? ''} onChange={(e) => update(row.id, 'role', e.target.value)} style={{ padding:'0.35rem 2rem 0.35rem 0.6rem', fontSize:'0.68rem' }}>
                  <option value="">—</option>
                  {['Face','Heel','Tweener'].map((o) => <option key={o}>{o}</option>)}
                </select>
                <label style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer' }}>
                  <input type="checkbox" checked={row.injured} onChange={(e) => update(row.id, 'injured', e.target.checked)} style={{ accentColor:'var(--accent-red)' }} />
                  <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', color: row.injured ? 'var(--accent-red)' : 'var(--text-dim)', letterSpacing:'0.08em' }}>{row.injured ? 'Injured' : 'Active'}</span>
                </label>
                <button onClick={() => save(row.id)} disabled={saving === row.id} style={{ padding:'0.35rem 0.75rem', background: row.saved ? 'rgba(0,200,100,0.15)' : 'rgba(128,0,218,0.15)', border:`1px solid ${row.saved ? '#00c864' : 'var(--purple)'}`, color: row.saved ? '#00c864' : 'var(--purple-hot)', fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>{saving === row.id ? '…' : row.saved ? '✓' : 'Save'}</button>
                <button onClick={() => retire(row.id)} style={{ padding:'0.35rem 0.75rem', background:'rgba(255,51,85,0.08)', border:'1px solid var(--accent-red)', color:'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>Retire</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Story Development ───────────────────────────────── */

function StoryDevelopment({ notes, addNote }: { notes: StoryNote[]; addNote: (n: StoryNote) => void }) {
  const [content, setContent]   = useState('')
  const [noteType, setNoteType] = useState(NOTE_TYPES[0])
  const [show, setShow]         = useState('')
  const [result, setResult]     = useState('')

  function submitNote() {
    if (!content.trim()) return
    addNote({ id: Date.now(), type: noteType, content, createdAt: new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) })
    setContent('')
  }

  return (
    <div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--text-strong)', textTransform:'uppercase', marginBottom:'1.5rem' }}>Story Development</h2>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', marginBottom:'2rem' }}>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', padding:'1.5rem' }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.25rem', color:'var(--text-strong)', textTransform:'uppercase', marginBottom:'1rem' }}>Event Results</h3>
          <div className="form-field"><label className="form-label">Show / Event</label><input className="form-input" placeholder="e.g. DAW 04-18-2025" value={show} onChange={(e) => setShow(e.target.value)} /></div>
          <div className="form-field" style={{ marginBottom:'1rem' }}><label className="form-label">Results Notes</label><textarea className="form-input form-textarea" placeholder="Key outcomes, upsets, notable moments..." value={result} onChange={(e) => setResult(e.target.value)} /></div>
          <button className="btn btn-primary" style={{ width:'100%' }} onClick={() => { setShow(''); setResult('') }}>Save Results</button>
        </div>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', padding:'1.5rem' }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.25rem', color:'var(--text-strong)', textTransform:'uppercase', marginBottom:'1rem' }}>Story Note</h3>
          <div className="form-field"><label className="form-label">Note Type</label><select className="form-input form-select" value={noteType} onChange={(e) => setNoteType(e.target.value)}>{NOTE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="form-field" style={{ marginBottom:'1rem' }}><label className="form-label">Note</label><textarea className="form-input form-textarea" placeholder="Describe the feud, arc, or idea..." value={content} onChange={(e) => setContent(e.target.value)} /></div>
          <button className="btn btn-primary" style={{ width:'100%' }} onClick={submitNote}>Add to Story Board</button>
        </div>
      </div>
      <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.65rem', color:'var(--purple-hot)', letterSpacing:'0.25em', marginBottom:'1rem', fontWeight:700 }}>STORY BOARD</p>
      {notes.length === 0 ? (
        <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.72rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>No story notes yet.</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
          {notes.map((n) => (
            <div key={n.id} style={{ padding:'0.85rem 1rem', background:'var(--surface)', border:'1px solid var(--border)', borderLeft:'3px solid var(--purple)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.3rem' }}>
                <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', color:'var(--purple-hot)', fontWeight:700, letterSpacing:'0.15em' }}>{n.type.toUpperCase()}</span>
                <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.58rem', color:'var(--text-dim)', letterSpacing:'0.08em' }}>{n.createdAt}</span>
              </div>
              <p style={{ fontSize:'0.82rem', color:'var(--text-muted)', lineHeight:1.6 }}>{n.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Story Notes Floating Window ────────────────────── */

function StoryNotesWindow({ notes, onClose }: { notes: StoryNote[]; onClose: () => void }) {
  const [pos, setPos]         = useState({ x: 40, y: 120 })
  const [dragging, setDragging] = useState(false)
  const offsetRef               = useRef({ x: 0, y: 0 })

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging) return
      setPos({ x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y })
    }
    function onMouseUp() { setDragging(false) }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [dragging])

  function onMouseDown(e: React.MouseEvent) {
    offsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    setDragging(true)
  }

  return (
    <div className="float-panel" style={{ left: pos.x, top: pos.y }}>
      <div className="float-panel-header" onMouseDown={onMouseDown}>
        <span>📋 Story Notes</span>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:'0.9rem' }}>✕</button>
      </div>
      <div className="float-panel-body">
        {notes.length === 0 ? (
          <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.68rem', color:'var(--text-dim)', letterSpacing:'0.12em' }}>No notes yet.</p>
        ) : notes.map((n) => (
          <div key={n.id} style={{ borderBottom:'1px solid var(--border)', paddingBottom:'0.6rem', marginBottom:'0.6rem' }}>
            <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--purple-hot)', fontWeight:700, letterSpacing:'0.12em', marginBottom:'0.2rem' }}>{n.type.toUpperCase()}</p>
            <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', lineHeight:1.5 }}>{n.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Account Management ──────────────────────────────── */

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  creative: 'Creative Team',
  writer: 'Writer',
  fan: 'Fan',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'var(--gold)',
  creative: 'var(--purple-hot)',
  writer: '#00c864',
  fan: 'var(--text-dim)',
}

interface AccountRow { id: string; email: string; name: string; role: string; created_at: string }

function AccountManagement() {
  const [users, setUsers]       = useState<AccountRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [saving, setSaving]         = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [retiring, setRetiring]     = useState<string | null>(null)
  const [combineExpandedId, setCombineExpandedId] = useState<string | null>(null)
  const [combineSearch, setCombineSearch] = useState('')
  const [combining, setCombining]   = useState(false)
  const [acctFeedback, setAcctFeedback] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return }
        setUsers(d.users)
      })
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false))
  }, [])

  async function changeRole(userId: string, newRole: string) {
    setSaving(userId)
    const res = await fetch('/api/admin/set-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: newRole }),
    })
    const data = await res.json()
    if (data.error) {
      alert(data.error)
    } else {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
    }
    setSaving(null)
  }

  async function retireUser(userId: string, userName: string) {
    if (!confirm(`Retire "${userName}"? Their wrestlers and factions will become unassigned. The account login will be permanently deleted.`)) return
    setRetiring(userId)
    const res = await fetch('/api/admin/retire-account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
    const data = await res.json()
    if (data.error) { alert(data.error) }
    else { setUsers(prev => prev.filter(u => u.id !== userId)); setAcctFeedback(`Account "${userName}" retired.`) }
    setRetiring(null)
    setTimeout(() => setAcctFeedback(null), 3500)
  }

  async function combineAccounts(deleteUserId: string, keepUser: AccountRow) {
    if (!confirm(`Merge into "${keepUser.name}" and delete the other account? This cannot be undone.`)) return
    setCombining(true)
    const res = await fetch('/api/admin/combine-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deleteUserId, keepUserId: keepUser.id }) })
    const data = await res.json()
    if (data.error) { alert(data.error) }
    else { setUsers(prev => prev.filter(u => u.id !== deleteUserId)); setAcctFeedback(`Account merged into "${keepUser.name}".`); setCombineExpandedId(null); setCombineSearch('') }
    setCombining(false)
    setTimeout(() => setAcctFeedback(null), 3500)
  }

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || (u.email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === 'all' || u.role === filterRole
    return matchSearch && matchRole
  })

  return (
    <div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--text-strong)', textTransform:'uppercase', marginBottom:'0.5rem' }}>Account Management</h2>
      <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.65rem', color:'var(--text-dim)', letterSpacing:'0.1em', marginBottom:'1.5rem' }}>
        Change user roles. Creative Team can access the admin panel but cannot edit accounts. Writers can edit news.
      </p>

      {error && (
        <div style={{ padding:'0.75rem 1rem', background:'rgba(255,51,85,0.1)', border:'1px solid var(--accent-red)', color:'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.68rem', letterSpacing:'0.08em', marginBottom:'1rem' }}>
          ✕ {error}{error.includes('SERVICE_ROLE_KEY') ? ' — add SUPABASE_SERVICE_ROLE_KEY to your Vercel environment variables.' : ''}
        </div>
      )}
      {acctFeedback && (
        <div style={{ padding:'0.65rem 1rem', background:'rgba(0,200,100,0.12)', border:'1px solid #00c864', color:'#00c864', fontFamily:'var(--font-meta)', fontSize:'0.68rem', letterSpacing:'0.08em', marginBottom:'1rem' }}>✓ {acctFeedback}</div>
      )}

      <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <input
          className="form-input"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex:1, minWidth:200, fontSize:'0.75rem' }}
        />
        <select
          className="form-input form-select"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          style={{ width:'auto', fontSize:'0.72rem' }}
        >
          <option value="all">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>Loading users…</p>
      ) : filtered.length === 0 ? (
        <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>No users found.</p>
      ) : (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', overflow:'hidden' }}>
          {/* Header */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 180px 160px 160px 170px', gap:'0.75rem', padding:'0.6rem 1.25rem', background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }}>
            {['User', 'Email', 'Joined', 'Role', ''].map((h) => (
              <span key={h} style={{ fontFamily:'var(--font-meta)', fontSize:'0.58rem', fontWeight:700, letterSpacing:'0.15em', color:'var(--text-dim)' }}>{h}</span>
            ))}
          </div>
          {filtered.map((u) => (
            <div key={u.id}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 180px 160px 160px 170px', gap:'0.75rem', padding:'0.75rem 1.25rem', borderBottom: combineExpandedId === u.id ? 'none' : '1px solid rgba(42,42,51,0.5)', alignItems:'center', opacity: (saving === u.id || retiring === u.id) ? 0.5 : 1, transition:'opacity 0.15s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background: `${ROLE_COLORS[u.role] ?? 'var(--surface-2)'}22`, border:`1px solid ${ROLE_COLORS[u.role] ?? 'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:'0.8rem', color: ROLE_COLORS[u.role] ?? 'var(--text-dim)', textTransform:'uppercase' }}>{u.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.72rem', color:'var(--text-strong)', fontWeight:700, letterSpacing:'0.05em' }}>{u.name}</p>
                    <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.55rem', color:'var(--text-dim)', letterSpacing:'0.05em', marginTop:'0.1rem' }}>ID: {u.id.slice(0, 8)}…</p>
                  </div>
                </div>
                <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', color:'var(--text-muted)', letterSpacing:'0.04em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email ?? '—'}</span>
                <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', color:'var(--text-dim)', letterSpacing:'0.06em' }}>
                  {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <select
                  className="form-input form-select"
                  value={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                  disabled={saving === u.id}
                  style={{ fontSize:'0.65rem', padding:'0.3rem 2rem 0.3rem 0.6rem', color: ROLE_COLORS[u.role] ?? 'var(--text-muted)', fontWeight:700 }}
                >
                  {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <div style={{ display:'flex', gap:'0.35rem' }}>
                  <button onClick={() => { setCombineExpandedId(combineExpandedId === u.id ? null : u.id); setCombineSearch('') }} style={{ padding:'0.3rem 0.55rem', background: combineExpandedId === u.id ? 'rgba(255,159,0,0.2)' : 'rgba(255,159,0,0.08)', border:'1px solid rgba(255,159,0,0.5)', color:'var(--gold)', fontFamily:'var(--font-meta)', fontSize:'0.56rem', fontWeight:700, letterSpacing:'0.08em', cursor:'pointer' }}>⇄ Merge</button>
                  <button onClick={() => retireUser(u.id, u.name)} disabled={retiring === u.id} style={{ padding:'0.3rem 0.55rem', background:'rgba(255,51,85,0.08)', border:'1px solid var(--accent-red)', color:'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.56rem', fontWeight:700, letterSpacing:'0.08em', cursor:'pointer', opacity: retiring === u.id ? 0.4 : 1 }}>Retire</button>
                </div>
              </div>
              {combineExpandedId === u.id && (
                <div style={{ padding:'1rem 1rem 1rem 2rem', background:'rgba(255,159,0,0.04)', borderBottom:'1px solid var(--border)', borderLeft:'3px solid var(--gold)' }}>
                  <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--gold)', letterSpacing:'0.2em', fontWeight:700, marginBottom:'0.5rem' }}>MERGE — {u.name.toUpperCase()}</p>
                  <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', color:'var(--text-muted)', letterSpacing:'0.05em', marginBottom:'0.75rem', lineHeight:1.6 }}>
                    All wrestlers and factions owned by <strong style={{ color:'var(--text-strong)' }}>{u.name}</strong> will transfer to the selected account. {u.name}&apos;s login will then be permanently deleted.
                  </p>
                  <input className="form-input" placeholder="Search account to keep…" value={combineSearch} onChange={(e) => setCombineSearch(e.target.value)} style={{ fontSize:'0.72rem', maxWidth:360, marginBottom:'0.5rem' }} autoFocus />
                  {combineSearch.trim() && (() => {
                    const q = combineSearch.toLowerCase()
                    const matches = users.filter(other => other.id !== u.id && (other.name.toLowerCase().includes(q) || (other.email ?? '').toLowerCase().includes(q))).slice(0, 6)
                    return matches.length === 0 ? (
                      <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', color:'var(--text-dim)', letterSpacing:'0.1em' }}>No accounts found.</p>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:'0.35rem', maxWidth:400 }}>
                        {matches.map(target => (
                          <button key={target.id} onClick={() => combineAccounts(u.id, target)} disabled={combining} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.55rem 0.9rem', background:'var(--surface)', border:'1px solid var(--border)', textAlign:'left', cursor:'pointer' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold)' }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                          >
                            <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.72rem', color:'var(--text-strong)', letterSpacing:'0.05em' }}>{target.name}</span>
                            <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--text-dim)', letterSpacing:'0.06em' }}>{target.email ?? ''}</span>
                          </button>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.58rem', color:'var(--text-dim)', letterSpacing:'0.1em', marginTop:'1rem' }}>
        {filtered.length} of {users.length} user{users.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

/* ── Admin Page ──────────────────────────────────────── */

export default function AdminDashboard() {
  const { isAdmin, isCreative, loading } = useAuth()
  const [section, setSection]    = useState<Section>('approvals')
  const [notes, setNotes]        = useState<StoryNote[]>([])
  const [showNotes, setShowNotes] = useState(false)
  const [approvalCount, setApprovalCount] = useState(0)

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
        <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-dim)', letterSpacing:'0.2em' }}>LOADING…</p>
      </div>
    )
  }

  if (!isAdmin && !isCreative) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', flexDirection:'column', gap:'1rem' }}>
        <p style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--accent-red)', textTransform:'uppercase' }}>Access Denied</p>
        <Link href="/" style={{ fontFamily:'var(--font-meta)', fontSize:'0.72rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>← Back to Site</Link>
      </div>
    )
  }

  function addNote(n: StoryNote) { setNotes((prev) => [n, ...prev]) }

  const SECTIONS: { id: Section; label: string; badge?: number }[] = [
    { id: 'approvals', label: 'Pending Approvals', badge: approvalCount },
    { id: 'booker',    label: 'Show Booker' },
    { id: 'results',   label: 'Results Entry' },
    { id: 'champions', label: 'Champions' },
    { id: 'ownership', label: 'Assign Ownership' },
    { id: 'images',    label: 'Roster Images' },
    { id: 'edits',     label: 'Roster Edits' },
    { id: 'story',     label: 'Story Development' },
    ...(isAdmin ? [{ id: 'accounts' as Section, label: 'Account Management' }] : []),
  ]

  return (
    <>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--border)', marginBottom:'0.5rem' }}>
            <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color: isAdmin ? 'var(--gold)' : 'var(--purple-hot)', letterSpacing:'0.25em', fontWeight:700 }}>{isAdmin ? 'ADMIN PANEL' : 'CREATIVE TEAM'}</p>
            <p style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', color:'var(--text-strong)', textTransform:'uppercase', lineHeight:1.1, marginTop:'0.25rem' }}>Dashboard</p>
          </div>
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setSection(s.id)} className={`admin-nav-item${section === s.id ? ' active' : ''}`}>
              {s.label}
              {s.badge !== undefined && s.badge > 0 && <span className="admin-badge">{s.badge}</span>}
            </button>
          ))}
          <div style={{ marginTop:'auto', padding:'1rem 1.5rem', borderTop:'1px solid var(--border)' }}>
            <button onClick={() => setShowNotes(!showNotes)} style={{ width:'100%', padding:'0.65rem', background:'rgba(128,0,218,0.15)', border:'1px solid var(--purple)', color:'var(--purple-hot)', fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.12em', cursor:'pointer' }}>📋 Story Notes</button>
            <Link href="/" className="admin-nav-item" style={{ marginTop:'0.5rem', display:'flex', borderLeft:'none', color:'var(--text-dim)' }}>← Back to Site</Link>
          </div>
        </aside>
        <main className="admin-content">
          {section === 'approvals'  && <PendingApprovals onCountChange={setApprovalCount} />}
          {section === 'booker'     && <ShowBooker notes={notes} />}
          {section === 'results'    && <ResultsEntry />}
          {section === 'champions'  && <ChampionsSection />}
          {section === 'ownership'  && <OwnershipSection />}
          {section === 'images'     && <RosterImages />}
          {section === 'edits'      && <RosterEdits />}
          {section === 'story'      && <StoryDevelopment notes={notes} addNote={addNote} />}
          {section === 'accounts'   && isAdmin && <AccountManagement />}
        </main>
      </div>
      {showNotes && <StoryNotesWindow notes={notes} onClose={() => setShowNotes(false)} />}
    </>
  )
}
