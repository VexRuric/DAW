'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/* ── Types ──────────────────────────────────────────── */

interface ScheduledShow {
  id: string
  name: string
  show_date: string
  show_type: string
  ppv_name: string | null
  status: string
  match_count: number
}

interface BookerRosterEntry { id: string; name: string; isChamp: boolean; champTitle: string | null; role: string | null; injured: boolean }
interface BookerTitle { id: string; name: string }
interface BookerParticipant { type: 'roster' | 'writein'; wrestlerId: string | null; name: string }
interface BookerSlot { id: number; matchType: string; stipulation: string; isTitleMatch: boolean; titleId: string; participants: BookerParticipant[]; isMainEvent: boolean; sideNames: string[] }

/* ── Constants ──────────────────────────────────────── */

const MATCH_TYPES  = ['Singles', 'Tag Team', 'Triple Threat', 'Fatal 4-Way', 'Gauntlet', 'Battle Royal', 'Handicap']
const STIPULATIONS = ['Standard', 'Last Man Standing', 'No DQ', 'Cage', 'Ladder', 'Table', 'Elimination', 'Ironman', 'Submission', 'Falls Count Anywhere']

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

function buildSideGroups(participants: BookerParticipant[], matchType: string) {
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

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function nextFridayAfter(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1)
  return toDateStr(d)
}

function formatShowDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

/* ── Booker Modal ─────────────────────────────────────── */

function BookerModal({
  show, roster, titles, onClose, onSaved,
}: {
  show: ScheduledShow
  roster: BookerRosterEntry[]
  titles: BookerTitle[]
  onClose: () => void
  onSaved: (showId: string, matchCount: number) => void
}) {
  const slotCount = show.show_type === 'ppv' ? 12 : 9
  const [slots, setSlots]                 = useState<BookerSlot[]>(makeBookerSlots(slotCount))
  const [selectedSlot, setSelectedSlot]   = useState<number | null>(null)
  const [search, setSearch]               = useState('')
  const [showWriteIn, setShowWriteIn]     = useState(false)
  const [writeInName, setWriteInName]     = useState('')
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [saveError, setSaveError]         = useState<string | null>(null)
  const [saveDone, setSaveDone]           = useState(false)
  const [copied, setCopied]               = useState(false)

  // Load existing matches into slots
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('matches')
        .select('id, match_number, match_type, stipulation, is_title_match, title_id, match_participants(wrestler_id, write_in_name, wrestlers(name))')
        .eq('show_id', show.id)
        .order('match_number')

      if (data && data.length > 0) {
        const maxNum = Math.max(...data.map((m: any) => m.match_number))
        const loaded: BookerSlot[] = data.map((m: any) => {
          const count = participantCount(m.match_type)
          const filled: BookerParticipant[] = (m.match_participants ?? []).map((mp: any) => ({
            type: mp.wrestler_id ? 'roster' as const : 'writein' as const,
            wrestlerId: mp.wrestler_id ?? null,
            name: mp.wrestlers?.name ?? mp.write_in_name ?? '',
          }))
          while (filled.length < count) filled.push(emptyParticipant())
          return {
            id: m.match_number,
            matchType: m.match_type,
            stipulation: m.stipulation ?? 'Standard',
            isTitleMatch: m.is_title_match,
            titleId: m.title_id ?? '',
            isMainEvent: m.match_number === maxNum,
            participants: filled,
            sideNames: getParticipantsPerSide(m.match_type).map(() => ''),
          }
        })
        // Pad to full slot count if needed
        const padded = [...loaded]
        while (padded.length < slotCount) {
          const next = padded.length + 1
          padded.push({ id: next, matchType: 'Singles', stipulation: 'Standard', isTitleMatch: false, titleId: '', participants: [emptyParticipant(), emptyParticipant()], isMainEvent: next === slotCount, sideNames: ['', ''] })
        }
        padded[padded.length - 1].isMainEvent = true
        setSlots(padded)
      }
      setLoading(false)
    }
    load()

    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [show.id, slotCount, onClose])

  function assignRosterWrestler(entry: BookerRosterEntry) {
    if (selectedSlot === null) return
    setSlots(prev => prev.map(s => {
      if (s.id !== selectedSlot) return s
      if (s.participants.some(p => p.type === 'roster' && p.wrestlerId === entry.id)) return s
      const count = participantCount(s.matchType)
      const parts = [...s.participants]
      const emptyIdx = parts.slice(0, count).findIndex(p => !p.name)
      if (emptyIdx === -1) return s
      parts[emptyIdx] = { type: 'roster', wrestlerId: entry.id, name: entry.name }
      return { ...s, participants: parts }
    }))
  }

  function addWriteIn() {
    if (!writeInName.trim() || selectedSlot === null) return
    setSlots(prev => prev.map(s => {
      if (s.id !== selectedSlot) return s
      const count = participantCount(s.matchType)
      const parts = [...s.participants]
      const emptyIdx = parts.slice(0, count).findIndex(p => !p.name)
      if (emptyIdx === -1) return s
      parts[emptyIdx] = { type: 'writein', wrestlerId: null, name: writeInName.trim() }
      return { ...s, participants: parts }
    }))
    setWriteInName('')
  }

  function removeParticipant(slotId: number, idx: number) {
    setSlots(prev => prev.map(s => {
      if (s.id !== slotId) return s
      const parts = [...s.participants]
      parts[idx] = emptyParticipant()
      return { ...s, participants: parts }
    }))
  }

  function updateSideName(slotId: number, sideIdx: number, name: string) {
    setSlots(prev => prev.map(s => {
      if (s.id !== slotId) return s
      const sideNames = [...s.sideNames]
      sideNames[sideIdx] = name
      return { ...s, sideNames }
    }))
  }

  function updateSlotField(id: number, key: keyof BookerSlot, value: unknown) {
    setSlots(prev => prev.map(s => {
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

  async function saveMatchcard() {
    setSaving(true); setSaveError(null); setSaveDone(false)
    try {
      // Delete existing matches (participants cascade or we delete explicitly)
      const { data: existing } = await supabase.from('matches').select('id').eq('show_id', show.id)
      if (existing?.length) {
        const ids = existing.map((m: any) => m.id)
        await supabase.from('match_participants').delete().in('match_id', ids)
        await supabase.from('matches').delete().in('id', ids)
      }

      let savedCount = 0
      for (const slot of slots) {
        const count = participantCount(slot.matchType)
        const filled = slot.participants.slice(0, count).filter(p => p.name)
        const { data: matchData, error: matchErr } = await supabase
          .from('matches')
          .insert({
            show_id: show.id,
            match_number: slot.id,
            match_type: slot.matchType,
            stipulation: slot.stipulation !== 'Standard' ? slot.stipulation : null,
            is_title_match: slot.isTitleMatch,
            title_id: slot.isTitleMatch && slot.titleId ? slot.titleId : null,
            is_mitb: false, mitb_cashin: false, is_draw: false,
          })
          .select('id')
          .single()
        if (matchErr) throw matchErr
        const matchId = matchData.id
        for (const p of filled) {
          const { error: mpErr } = await supabase.from('match_participants').insert({
            match_id: matchId,
            wrestler_id: p.type === 'roster' ? p.wrestlerId : null,
            team_id: null,
            write_in_name: p.type === 'writein' ? p.name : null,
            result: 'loser',
          })
          if (mpErr) throw mpErr
        }
        if (filled.length > 0) savedCount++
      }

      setSaveDone(true)
      onSaved(show.id, savedCount)
    } catch (e: any) {
      setSaveError(e?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function exportToDiscord() {
    const header = show.show_type === 'ppv' && show.ppv_name
      ? `**DAW ${show.ppv_name.toUpperCase()} — MATCH CARD**`
      : `**DAW WEEKLY — MATCH CARD**`
    const dateStr = `📅 ${formatShowDate(show.show_date)}`
    const lines = [
      header, dateStr, '```',
      ...slots.map(s => {
        const names = buildSideGroups(s.participants, s.matchType)
          .map(({ side }, sideIdx) => {
            const faction = s.sideNames[sideIdx]?.trim()
            return faction || side.filter(p => p.name).map(p => p.name).join(' & ')
          }).join(' vs ')
        const label = s.isMainEvent ? '★ MAIN EVENT — ' : `Match ${s.id} — `
        const extra = [s.matchType !== 'Singles' ? s.matchType : '', s.stipulation !== 'Standard' ? s.stipulation : '', s.isTitleMatch ? 'TITLE' : ''].filter(Boolean).join(' · ')
        return `${label}${names || 'TBA'}${extra ? ` (${extra})` : ''}`
      }),
      '```',
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const filteredRoster = roster.filter(w => w.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', width: '100%', maxWidth: 1100, position: 'relative', marginTop: '1rem', marginBottom: '1rem' }}
      >
        {/* Modal header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: show.show_type === 'ppv' ? 'var(--gold)' : 'var(--purple-hot)', letterSpacing: '0.25em', fontWeight: 700, marginBottom: '0.2rem' }}>
              {show.show_type === 'ppv' ? '★ PPV' : 'WEEKLY'} · {slotCount} MATCHES
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1 }}>
              {show.ppv_name ?? show.name}
            </h2>
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.12em', marginTop: '0.2rem' }}>
              {formatShowDate(show.show_date)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={exportToDiscord} className="btn" style={{ padding: '0.55rem 1rem', fontSize: '0.65rem' }}>
              {copied ? '✓ Copied!' : '📋 Discord'}
            </button>
            <button onClick={saveMatchcard} disabled={saving || saveDone} className="btn btn-primary" style={{ padding: '0.55rem 1.1rem', fontSize: '0.65rem' }}>
              {saving ? 'Saving…' : saveDone ? '✓ Saved!' : 'Save Matchcard'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1rem' }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'var(--accent-red)'; el.style.color = 'var(--accent-red)' }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text-dim)' }}
            >✕</button>
          </div>
        </div>

        {saveError && <div style={{ margin: '0.75rem 1.5rem 0', padding: '0.6rem 1rem', background: 'rgba(255,51,85,0.1)', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', fontFamily: 'var(--font-meta)', fontSize: '0.68rem', letterSpacing: '0.08em' }}>✕ {saveError}</div>}
        {saveDone && <div style={{ margin: '0.75rem 1.5rem 0', padding: '0.6rem 1rem', background: 'rgba(0,200,100,0.1)', border: '1px solid #00c864', color: '#00c864', fontFamily: 'var(--font-meta)', fontSize: '0.68rem', letterSpacing: '0.08em' }}>✓ Matchcard saved.</div>}

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.25rem', padding: '1.25rem 1.5rem' }}>
            {/* Roster sidebar */}
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', maxHeight: '72vh' }}>
              <div style={{ padding: '0.65rem', borderBottom: '1px solid var(--border)' }}>
                <input className="form-input" placeholder="Search roster…" value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: '0.72rem', marginBottom: '0.45rem' }} />
                <button onClick={() => setShowWriteIn(!showWriteIn)} style={{ width: '100%', padding: '0.38rem', background: showWriteIn ? 'rgba(128,0,218,0.2)' : 'rgba(128,0,218,0.08)', border: '1px solid var(--purple)', color: 'var(--purple-hot)', fontFamily: 'var(--font-meta)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer' }}>
                  {showWriteIn ? '▲ Hide Write-In' : '+ Write-In Wrestler'}
                </button>
                {showWriteIn && (
                  <div style={{ marginTop: '0.45rem', display: 'flex', gap: '0.4rem' }}>
                    <input className="form-input" placeholder="Guest name…" value={writeInName} onChange={e => setWriteInName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addWriteIn() }} style={{ fontSize: '0.7rem', flex: 1 }} />
                    <button onClick={addWriteIn} disabled={!writeInName.trim() || selectedSlot === null} style={{ padding: '0 0.65rem', background: 'rgba(128,0,218,0.15)', border: '1px solid var(--purple)', color: 'var(--purple-hot)', fontFamily: 'var(--font-meta)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, opacity: (!writeInName.trim() || selectedSlot === null) ? 0.4 : 1 }}>Add</button>
                  </div>
                )}
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {filteredRoster.map(w => (
                  <button key={w.id} onClick={() => assignRosterWrestler(w)} style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.85rem', background: 'none', border: 'none', borderBottom: '1px solid rgba(42,42,51,0.5)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', opacity: w.injured ? 0.5 : 1 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
                  >
                    <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', color: 'var(--text-strong)', letterSpacing: '0.05em' }}>{w.name}</span>
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexShrink: 0 }}>
                      {w.isChamp && <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.45rem', color: 'var(--bg-top)', background: 'var(--gold)', padding: '1px 4px', fontWeight: 700, letterSpacing: '0.08em' }}>CHAMP</span>}
                      {w.injured && <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.45rem', color: 'var(--accent-red)', border: '1px solid var(--accent-red)', padding: '0px 4px', fontWeight: 700 }}>INJ</span>}
                      {w.role && <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.48rem', fontWeight: 700, letterSpacing: '0.1em', color: w.role === 'Face' ? '#00c864' : w.role === 'Heel' ? 'var(--accent-red)' : 'var(--text-dim)' }}>{w.role.charAt(0)}</span>}
                    </div>
                  </button>
                ))}
              </div>
              {selectedSlot !== null && (
                <div style={{ padding: '0.55rem 0.85rem', background: 'rgba(128,0,218,0.1)', borderTop: '1px solid var(--purple)', fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--purple-hot)', letterSpacing: '0.12em' }}>
                  ► Assigning to Match {selectedSlot}
                </div>
              )}
            </div>

            {/* Match slots */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', maxHeight: '72vh' }}>
              {slots.map(slot => {
                const count = participantCount(slot.matchType)
                const isSelected = selectedSlot === slot.id
                return (
                  <div key={slot.id} onClick={() => setSelectedSlot(isSelected ? null : slot.id)}
                    style={{ background: 'var(--surface-2)', border: `2px solid ${slot.isMainEvent ? 'var(--gold)' : isSelected ? 'var(--purple)' : 'var(--border)'}`, padding: '0.85rem 1rem', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.45rem' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: slot.isMainEvent ? 'var(--gold)' : 'var(--text-dim)', textTransform: 'uppercase' }}>
                        {slot.isMainEvent ? '★ Main Event' : `Match ${slot.id}`}
                      </span>
                      <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select className="form-input form-select" style={{ padding: '0.28rem 1.8rem 0.28rem 0.55rem', fontSize: '0.6rem', width: 'auto' }} value={slot.matchType} onChange={e => { e.stopPropagation(); updateSlotField(slot.id, 'matchType', e.target.value) }} onClick={e => e.stopPropagation()}>
                          {MATCH_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                        <select className="form-input form-select" style={{ padding: '0.28rem 1.8rem 0.28rem 0.55rem', fontSize: '0.6rem', width: 'auto' }} value={slot.stipulation} onChange={e => { e.stopPropagation(); updateSlotField(slot.id, 'stipulation', e.target.value) }} onClick={e => e.stopPropagation()}>
                          {STIPULATIONS.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }} onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={slot.isTitleMatch} onChange={e => updateSlotField(slot.id, 'isTitleMatch', e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
                          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: slot.isTitleMatch ? 'var(--gold)' : 'var(--text-dim)', letterSpacing: '0.1em' }}>Title</span>
                        </label>
                        {slot.isTitleMatch && (
                          <select className="form-input form-select" style={{ padding: '0.28rem 1.8rem 0.28rem 0.55rem', fontSize: '0.6rem', width: 'auto' }} value={slot.titleId} onChange={e => { e.stopPropagation(); updateSlotField(slot.id, 'titleId', e.target.value) }} onClick={e => e.stopPropagation()}>
                            <option value=''>— Title —</option>
                            {titles.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', flexWrap: 'wrap' }}>
                      {buildSideGroups(slot.participants.slice(0, count), slot.matchType).map(({ side, startIdx }, sideIdx) => (
                        <div key={sideIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                          {sideIdx > 0 && <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--accent-red)', opacity: 0.6, paddingTop: '0.3rem' }}>vs</span>}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.22rem' }}>
                            {side.map((p, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                {i > 0 && <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: 'var(--text-dim)' }}>&amp;</span>}
                                <div style={{ padding: '0.35rem 0.65rem', background: p.name ? (p.type === 'writein' ? 'rgba(128,0,218,0.1)' : 'var(--surface)') : 'transparent', border: `1px solid ${p.name ? (p.type === 'writein' ? 'var(--purple)' : 'var(--border-hot)') : 'rgba(42,42,51,0.5)'}`, display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 100 }}>
                                  {p.type === 'writein' && p.name && <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.42rem', color: 'var(--purple-hot)', fontWeight: 700, letterSpacing: '0.08em', background: 'rgba(128,0,218,0.2)', padding: '1px 4px', flexShrink: 0 }}>GUEST</span>}
                                  <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.66rem', color: p.name ? 'var(--text-strong)' : 'var(--text-dim)', letterSpacing: '0.06em', flex: 1 }}>{p.name || `Slot ${startIdx + i + 1}`}</span>
                                  {p.name && <button onClick={e => { e.stopPropagation(); removeParticipant(slot.id, startIdx + i) }} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.65rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>}
                                </div>
                              </div>
                            ))}
                            <input type="text" placeholder="Faction name…" value={slot.sideNames[sideIdx] ?? ''} onChange={e => { e.stopPropagation(); updateSideName(slot.id, sideIdx, e.target.value) }} onClick={e => e.stopPropagation()} style={{ fontFamily: 'var(--font-meta)', fontSize: '0.56rem', padding: '0.12rem 0.45rem', background: 'transparent', border: '1px dashed rgba(128,0,218,0.3)', color: 'var(--purple-hot)', outline: 'none', width: '100%', minWidth: 100, letterSpacing: '0.05em' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Schedule Builder ─────────────────────────────────── */

export default function AdminScheduleBuilder() {
  const [shows, setShows]               = useState<ScheduledShow[]>([])
  const [roster, setRoster]             = useState<BookerRosterEntry[]>([])
  const [titles, setTitles]             = useState<BookerTitle[]>([])
  const [loadingShows, setLoadingShows] = useState(true)
  const [selectedShow, setSelectedShow] = useState<ScheduledShow | null>(null)

  // "Add PPV" inline form
  const [addingPPV, setAddingPPV]       = useState(false)
  const [ppvDate, setPpvDate]           = useState('')
  const [ppvNameInput, setPpvNameInput] = useState('')
  const [ppvSaving, setPpvSaving]       = useState(false)

  // Per-row edit state: keyed by show ID
  const [editNames, setEditNames]       = useState<Record<string, string>>({})
  const [editPPVNames, setEditPPVNames] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const [showRes, rosterRes, champRes, titleRes] = await Promise.all([
        supabase.from('shows').select('id, name, show_date, show_type, ppv_name, status, matches(id)').eq('status', 'committed').order('show_date', { ascending: true }),
        supabase.from('roster_wrestlers').select('id, name, role, injured'),
        supabase.from('current_champions').select('holder_wrestler_id, title_name'),
        supabase.from('titles').select('id, name').eq('active', true).order('display_order'),
      ])

      const champMap = new Map<string, string>()
      ;(champRes.data ?? []).forEach((c: any) => { if (c.holder_wrestler_id) champMap.set(c.holder_wrestler_id, c.title_name) })
      const rosterEntries: BookerRosterEntry[] = (rosterRes.data ?? []).map((w: any) => ({
        id: w.id, name: w.name, isChamp: champMap.has(w.id), champTitle: champMap.get(w.id) ?? null, role: w.role, injured: w.injured,
      }))
      rosterEntries.sort((a, b) => { if (a.isChamp !== b.isChamp) return a.isChamp ? -1 : 1; return a.name.localeCompare(b.name) })

      const loadedShows: ScheduledShow[] = (showRes.data ?? []).map((s: any) => ({
        id: s.id, name: s.name, show_date: s.show_date, show_type: s.show_type, ppv_name: s.ppv_name, status: s.status,
        match_count: (s.matches ?? []).length,
      }))

      const nameInit: Record<string, string> = {}
      const ppvInit: Record<string, string> = {}
      loadedShows.forEach(s => { nameInit[s.id] = s.name; ppvInit[s.id] = s.ppv_name ?? '' })

      setShows(loadedShows)
      setEditNames(nameInit)
      setEditPPVNames(ppvInit)
      setRoster(rosterEntries)
      setTitles((titleRes.data ?? []) as BookerTitle[])
      setLoadingShows(false)
    }
    load()
  }, [])

  async function addWeekly() {
    const lastDate = shows.length > 0 ? shows[shows.length - 1].show_date : toDateStr(new Date())
    const newDate = nextFridayAfter(lastDate)
    const d = new Date(newDate + 'T00:00:00')
    const label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    const showName = `DAW Warehouse LIVE — ${label}`
    const { data, error } = await supabase
      .from('shows')
      .insert({ name: showName, show_date: newDate, show_type: 'weekly', ppv_name: null, status: 'committed' })
      .select('id').single()
    if (!error && data) {
      const s: ScheduledShow = { id: data.id, name: showName, show_date: newDate, show_type: 'weekly', ppv_name: null, status: 'committed', match_count: 0 }
      setShows(prev => [...prev, s].sort((a, b) => a.show_date.localeCompare(b.show_date)))
      setEditNames(prev => ({ ...prev, [data.id]: showName }))
      setEditPPVNames(prev => ({ ...prev, [data.id]: '' }))
    }
  }

  async function createPPV() {
    if (!ppvDate || !ppvNameInput.trim()) return
    setPpvSaving(true)
    const fullName = `DAW ${ppvNameInput.trim()}`
    const { data, error } = await supabase
      .from('shows')
      .insert({ name: fullName, show_date: ppvDate, show_type: 'ppv', ppv_name: ppvNameInput.trim(), status: 'committed' })
      .select('id').single()
    if (!error && data) {
      const s: ScheduledShow = { id: data.id, name: fullName, show_date: ppvDate, show_type: 'ppv', ppv_name: ppvNameInput.trim(), status: 'committed', match_count: 0 }
      setShows(prev => [...prev, s].sort((a, b) => a.show_date.localeCompare(b.show_date)))
      setEditNames(prev => ({ ...prev, [data.id]: fullName }))
      setEditPPVNames(prev => ({ ...prev, [data.id]: ppvNameInput.trim() }))
      setAddingPPV(false); setPpvDate(''); setPpvNameInput('')
    }
    setPpvSaving(false)
  }

  async function updateDate(showId: string, newDate: string) {
    setShows(prev => prev.map(s => s.id === showId ? { ...s, show_date: newDate } : s).sort((a, b) => a.show_date.localeCompare(b.show_date)))
    await supabase.from('shows').update({ show_date: newDate }).eq('id', showId)
  }

  async function updateName(showId: string) {
    const newName = editNames[showId]?.trim()
    if (!newName) return
    setShows(prev => prev.map(s => s.id === showId ? { ...s, name: newName } : s))
    await supabase.from('shows').update({ name: newName }).eq('id', showId)
  }

  async function updatePPVName(showId: string) {
    const newPPV = editPPVNames[showId]?.trim() || null
    const newFullName = newPPV ? `DAW ${newPPV}` : (editNames[showId] ?? '')
    setShows(prev => prev.map(s => s.id === showId ? { ...s, ppv_name: newPPV, name: newFullName } : s))
    await supabase.from('shows').update({ ppv_name: newPPV, name: newFullName }).eq('id', showId)
    setEditNames(prev => ({ ...prev, [showId]: newFullName }))
  }

  async function deleteShow(showId: string) {
    if (!confirm('Delete this show and all its matches?')) return
    const { data: matchRows } = await supabase.from('matches').select('id').eq('show_id', showId)
    if (matchRows?.length) {
      const ids = matchRows.map((m: any) => m.id)
      await supabase.from('match_participants').delete().in('match_id', ids)
      await supabase.from('matches').delete().in('id', ids)
    }
    await supabase.from('shows').delete().eq('id', showId)
    setShows(prev => prev.filter(s => s.id !== showId))
  }

  function handleSaved(showId: string, matchCount: number) {
    setShows(prev => prev.map(s => s.id === showId ? { ...s, match_count: matchCount } : s))
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1 }}>Show Schedule</h2>
          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.15em', marginTop: '0.3rem' }}>
            Click a show to build or edit its matchcard. Click a date to reschedule.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button onClick={addWeekly} className="btn btn-primary" style={{ padding: '0.6rem 1.1rem', fontSize: '0.65rem' }}>+ Weekly Show</button>
          <button onClick={() => setAddingPPV(!addingPPV)} className="btn" style={{ padding: '0.6rem 1.1rem', fontSize: '0.65rem', borderColor: addingPPV ? 'var(--gold)' : undefined, color: addingPPV ? 'var(--gold)' : undefined }}>
            {addingPPV ? '✕ Cancel' : '+ PPV Event'}
          </button>
        </div>
      </div>

      {/* Add PPV inline form */}
      {addingPPV && (
        <div style={{ padding: '1rem 1.25rem', background: 'rgba(255,201,51,0.05)', border: '1px solid rgba(255,201,51,0.3)', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--gold)', letterSpacing: '0.15em', marginBottom: '0.3rem' }}>PPV DATE</p>
            <input className="form-input" type="date" value={ppvDate} onChange={e => setPpvDate(e.target.value)} style={{ fontSize: '0.72rem' }} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--gold)', letterSpacing: '0.15em', marginBottom: '0.3rem' }}>PPV NAME</p>
            <input className="form-input" placeholder="e.g. Clash of Champions" value={ppvNameInput} onChange={e => setPpvNameInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createPPV() }} style={{ fontSize: '0.72rem' }} />
          </div>
          <button onClick={createPPV} disabled={!ppvDate || !ppvNameInput.trim() || ppvSaving} className="btn btn-primary" style={{ padding: '0.6rem 1.1rem', fontSize: '0.65rem', background: 'var(--gold)', color: '#0a0a0c', opacity: (!ppvDate || !ppvNameInput.trim() || ppvSaving) ? 0.5 : 1 }}>
            {ppvSaving ? 'Creating…' : 'Create PPV'}
          </button>
        </div>
      )}

      {/* Show list */}
      {loadingShows ? (
        <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.2em' }}>Loading schedule…</div>
      ) : shows.length === 0 ? (
        <div style={{ padding: '3rem 1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>No upcoming shows scheduled. Add a weekly show or PPV to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {shows.map(show => {
            const isPPV = show.show_type === 'ppv'
            const slotCount = isPPV ? 12 : 9
            const pct = show.match_count / slotCount
            const isBuilt = pct >= 1
            const isPartial = pct > 0 && pct < 1

            return (
              <div
                key={show.id}
                style={{ background: 'var(--surface)', border: `1px solid ${isPPV ? 'rgba(255,201,51,0.35)' : 'var(--border)'}`, padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}
              >
                {/* Type badge */}
                <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.15em', padding: '0.18rem 0.5rem', background: isPPV ? 'var(--gold)' : 'rgba(128,0,218,0.15)', color: isPPV ? '#0a0a0c' : 'var(--purple-hot)', border: isPPV ? 'none' : '1px solid var(--purple)', flexShrink: 0 }}>
                  {isPPV ? '★ PPV' : 'WEEKLY'}
                </span>

                {/* Date picker */}
                <input
                  type="date"
                  value={show.show_date}
                  onChange={e => updateDate(show.id, e.target.value)}
                  style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', color: 'var(--text-strong)', background: 'transparent', border: '1px solid var(--border)', padding: '0.3rem 0.5rem', letterSpacing: '0.05em', cursor: 'pointer', flexShrink: 0 }}
                />

                {/* Show name */}
                <input
                  type="text"
                  value={editNames[show.id] ?? show.name}
                  onChange={e => setEditNames(prev => ({ ...prev, [show.id]: e.target.value }))}
                  onBlur={() => updateName(show.id)}
                  style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', color: 'var(--text-muted)', background: 'transparent', border: '1px solid transparent', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0.3rem 0.4rem', flex: 1, minWidth: 180, letterSpacing: '0.05em', outline: 'none' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--purple)' }}
                  onBlurCapture={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.borderBottomColor = 'rgba(255,255,255,0.08)' }}
                />

                {/* PPV subtitle name */}
                {isPPV && (
                  <input
                    type="text"
                    value={editPPVNames[show.id] ?? ''}
                    placeholder="PPV name…"
                    onChange={e => setEditPPVNames(prev => ({ ...prev, [show.id]: e.target.value }))}
                    onBlur={() => updatePPVName(show.id)}
                    style={{ fontFamily: 'var(--font-meta)', fontSize: '0.68rem', color: 'var(--gold)', background: 'transparent', border: '1px solid transparent', borderBottom: '1px solid rgba(255,201,51,0.25)', padding: '0.3rem 0.4rem', minWidth: 140, letterSpacing: '0.05em', outline: 'none' }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--gold)' }}
                    onBlurCapture={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.borderBottomColor = 'rgba(255,201,51,0.25)' }}
                  />
                )}

                {/* Match count indicator */}
                <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', letterSpacing: '0.1em', color: isBuilt ? '#00c864' : isPartial ? 'var(--gold)' : 'var(--text-dim)', flexShrink: 0, minWidth: 70 }}>
                  {isBuilt ? '✓ ' : ''}{show.match_count}/{slotCount} matches
                </span>

                {/* Build card button */}
                <button
                  onClick={() => setSelectedShow(show)}
                  className="btn btn-primary"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.62rem', flexShrink: 0, background: isBuilt ? 'transparent' : undefined, border: isBuilt ? '1px solid var(--purple)' : undefined, color: isBuilt ? 'var(--purple-hot)' : undefined }}
                >
                  {show.match_count === 0 ? 'Build Card ▶' : isBuilt ? 'Edit Card ▶' : 'Continue ▶'}
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteShow(show.id)}
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.75rem', flexShrink: 0 }}
                  onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'var(--accent-red)'; el.style.color = 'var(--accent-red)' }}
                  onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text-dim)' }}
                  title="Delete show"
                >✕</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Booker modal */}
      {selectedShow && (
        <BookerModal
          show={selectedShow}
          roster={roster}
          titles={titles}
          onClose={() => setSelectedShow(null)}
          onSaved={(id, count) => { handleSaved(id, count); setSelectedShow(null) }}
        />
      )}
    </div>
  )
}
