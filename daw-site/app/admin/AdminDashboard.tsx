'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import AdminScheduleBuilder from '@/components/AdminScheduleBuilder'

type Section = 'approvals' | 'booker' | 'results' | 'schedule' | 'champions' | 'ownership' | 'images' | 'titleimages' | 'edits' | 'factions' | 'story' | 'suggestions' | 'accounts' | 'settings' | 'legends'

const MATCH_TYPES  = ['Singles','Tag Team','Triple Threat','Fatal 4-Way','Gauntlet','Battle Royal','Handicap']
const STIPULATIONS = ['Standard','Last Man Standing','No DQ','Cage','Ladder','Table','Elimination','Ironman','Submission','Falls Count Anywhere']
const DEFEAT_TYPES = ['', 'Pin', 'Submission', 'DQ', 'Count Out', 'No Contest', 'TKO']
const RATINGS      = ['', '0.5','1.0','1.5','2.0','2.5','3.0','3.5','4.0','4.5','5.0']
const NOTE_TYPES   = ['Feud Idea','Storyline Arc','PPV Idea','Character Note','Faction Note','Other']

const PERSONALITY_TRAITS = [
  { faceA: 'Brave',      faceB: 'Cowardly' },
  { faceA: 'Humble',     faceB: 'Cocky'    },
  { faceA: 'Serious',    faceB: 'Fun'      },
  { faceA: 'Calculated', faceB: 'Wild'     },
  { faceA: 'Friendly',   faceB: 'Vicious'  },
  { faceA: 'Respectful', faceB: 'Dirty'    },
]

/* ── Types ──────────────────────────────────────────── */

interface DBStoryNote { id: string; note_type: string; title: string; body: string; wrestler_ids: string[]; team_ids: string[]; priority: string; resolved: boolean; created_by: string | null; created_at: string; author_name?: string | null }
interface PendingItem { id: string; table: 'wrestlers' | 'teams'; type: 'Wrestler' | 'Faction'; name: string; submittedAt: string; bio: string | null; isEdit: boolean; editOf: string | null; render_url: string | null; gender: string | null; role: string | null; country: string | null }
interface BookerRosterEntry { id: string; name: string; isChamp: boolean; champTitle: string | null; role: string | null; injured: boolean }
interface BookerTitle { id: string; name: string }
interface BookerParticipant { type: 'roster' | 'writein'; wrestlerId: string | null; name: string }
interface BookerSlot { id: number; matchType: string; stipulation: string; isTitleMatch: boolean; titleId: string; participants: BookerParticipant[]; isMainEvent: boolean; sideNames: string[] }
interface ShowStub { id: string; name: string; show_date: string; status: string; stream_url: string | null }
interface Participant { mp_id: string; name: string; result: string | null; wrestler_id: string | null; team_id: string | null }
interface MatchCard { id: string; match_number: number; match_type: string; stipulation: string | null; is_title_match: boolean; is_draw: boolean; defeat_type: string | null; rating: number | null; notes: string | null; participants: Participant[] }
interface MatchResultForm { winner_mp_id: string; defeat_type: string; rating: string; notes: string; add_to_story_board: boolean }
interface OwnerRow { id: string; name: string; status: string; submitted_by: string | null; owner: { display_name: string | null; twitch_handle: string | null } | null }
interface ProfileResult { id: string; display_name: string | null; twitch_handle: string | null }
interface TitleRow { id: string; name: string; category: string; display_order: number }
interface ChampRow { title_id: string; title_name: string; holder_name: string; holder_wrestler_id: string | null; holder_team_id: string | null; won_date: string; days_held: number }
interface ImageRow { id: string; name: string; render_url: string | null; status: string }
interface RosterRow { id: string; name: string; brand: string | null; gender: string | null; division: string | null; role: string | null; injured: boolean; status: string; saved: boolean; backstory: string | null }
interface FactionRow { id: string; name: string; brand: string | null; division: string | null; role: string | null; status: string; saved: boolean; backstory: string | null }
interface ScheduleShowRow { id: string; name: string; show_date: string; show_type: string; ppv_name: string | null; ppv_color: string | null; ppv_abbr: string | null; status: string; saved: boolean }

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

/* ── Admin Drop Zone ─────────────────────────────────── */

function AdminDropZone({ onFile, uploading, accent = 'var(--purple-hot)', border = 'var(--purple)' }: { onFile: (f: File) => void; uploading: boolean; accent?: string; border?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  function handleFile(file: File) { setFileName(file.name); onFile(file) }

  return (
    <div
      onClick={() => !uploading && ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f) }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.55rem',
        padding: '0.45rem 0.85rem',
        border: `1px dashed ${drag ? accent : border}`,
        background: drag ? `rgba(128,0,218,0.12)` : 'rgba(128,0,218,0.06)',
        color: uploading ? 'var(--text-dim)' : accent,
        fontFamily: 'var(--font-meta)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
        cursor: uploading ? 'default' : 'pointer',
        userSelect: 'none', transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <span>{uploading ? '⏳ Uploading…' : drag ? '⬇ Drop here' : fileName ? `✓ ${fileName}` : '↑ Upload / Drop'}</span>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}

/* ── Pending Approvals ───────────────────────────────── */

/* ── Submission detail helpers ───────────────────────── */

function DetailField({ label, value, isUrl }: { label: string; value: string | undefined | null; isUrl?: boolean }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
      <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</span>
      {isUrl ? (
        <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-meta)', fontSize: '0.68rem', color: 'var(--purple-hot)', wordBreak: 'break-all', letterSpacing: '0.02em' }}>{value}</a>
      ) : (
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-strong)' }}>{value}</span>
      )}
    </div>
  )
}

function SubmissionDetails({ item }: { item: PendingItem }) {
  const bio = (() => { try { return JSON.parse(item.bio ?? '{}') } catch { return {} } })()
  const snap = item.isEdit ? (bio.snapshot ?? {}) : null
  const bioData: Record<string, unknown> = item.isEdit ? (snap?.bio ?? {}) : bio
  const displayName = item.isEdit ? (snap?.name ?? item.name) : item.name
  const gender: string | null = item.isEdit ? (snap?.gender ?? null) : item.gender
  const role: string | null   = item.isEdit ? (snap?.role   ?? null) : item.role
  const country: string | null = item.isEdit ? (snap?.country ?? null) : item.country
  const isComm = (bioData.creationType as string) === 'community'
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.85rem' }

  const editBanner = item.isEdit ? (
    <div style={{ padding: '0.4rem 0.85rem', background: 'rgba(255,159,0,0.08)', border: '1px solid rgba(255,159,0,0.3)', fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--gold)', letterSpacing: '0.15em', fontWeight: 700 }}>
      ✎ PROPOSED CHANGES — these fields will overwrite the original on Accept
    </div>
  ) : null

  if (item.type === 'Wrestler') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: item.render_url ? '160px 1fr' : '1fr', gap: '1.5rem', padding: '1.5rem 1.25rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.25)' }}>
        {item.render_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.render_url} alt={displayName} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', objectPosition: 'top', display: 'block', border: '1px solid var(--border)' }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {editBanner}
          {isComm ? (
            <div style={grid}>
              <DetailField label="Creation Type" value="WWE Community Creation" />
              <DetailField label="Keyword" value={bioData.communityKeyword as string} />
            </div>
          ) : (
            <>
              <div style={grid}>
                <DetailField label="Ring Name"     value={displayName} />
                <DetailField label="Gender"        value={gender} />
                <DetailField label="Alignment"     value={role} />
                <DetailField label="From"          value={country} />
                <DetailField label="Weight Class"  value={bioData.weightClass as string} />
                <DetailField label="Height"        value={bioData.height as string} />
                <DetailField label="Fighting Style" value={(bioData.style as string[])?.join(', ')} />
                <DetailField label="Finisher"      value={bioData.finisher as string} />
                <DetailField label="Hair"          value={bioData.hair as string} />
                <DetailField label="Eyes"          value={bioData.eyes as string} />
                <DetailField label="Entrance Song" value={bioData.songUrl as string} isUrl />
              </div>
              {(bioData.primaryColor || bioData.secondaryColor) && (
                <div>
                  <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Brand Colors</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem' }}>
                    {!!(bioData.primaryColor as string) && <>
                      <div style={{ width: 22, height: 22, background: bioData.primaryColor as string, border: '1px solid var(--border)', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{bioData.primaryColor as string}</span>
                    </>}
                    {!!(bioData.primaryColor as string) && !!(bioData.secondaryColor as string) && <span style={{ color: 'var(--text-dim)' }}>→</span>}
                    {!!(bioData.secondaryColor as string) && <>
                      <div style={{ width: 22, height: 22, background: bioData.secondaryColor as string, border: '1px solid var(--border)', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{bioData.secondaryColor as string}</span>
                    </>}
                    {!!(bioData.primaryColor as string) && !!(bioData.secondaryColor as string) && (
                      <div style={{ height: 22, flex: 1, maxWidth: 120, background: `linear-gradient(90deg,${bioData.primaryColor as string} 0%,${bioData.secondaryColor as string} 100%)`, border: '1px solid var(--border)' }} />
                    )}
                  </div>
                </div>
              )}
              {(bioData.personalitySliders as number[])?.length > 0 && (
                <div>
                  <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '0.6rem' }}>Personality</span>
                  <div style={{ display: 'grid', gap: '0.4rem', maxWidth: 480 }}>
                    {PERSONALITY_TRAITS.map((trait, i) => {
                      const val = (bioData.personalitySliders as number[])[i] ?? 50
                      return (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 90px', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', letterSpacing: '0.08em', color: val < 50 ? 'var(--text-strong)' : 'var(--text-dim)', textAlign: 'right' }}>{trait.faceA}</span>
                          <div style={{ height: 4, background: 'var(--border)', position: 'relative', borderRadius: 2 }}>
                            <div style={{ position: 'absolute', left: `${val}%`, top: '50%', transform: 'translate(-50%,-50%)', width: 10, height: 10, background: 'var(--purple-hot)', borderRadius: '50%' }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', letterSpacing: '0.08em', color: val > 50 ? 'var(--text-strong)' : 'var(--text-dim)' }}>{trait.faceB}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // Faction
  const factionName = item.isEdit ? (snap?.name ?? item.name) : item.name
  const fBio: Record<string, unknown> = item.isEdit ? (snap?.bio ?? {}) : bio
  const members: string[] = (fBio.members as string[]) ?? []
  return (
    <div style={{ display: 'grid', gridTemplateColumns: item.render_url ? '160px 1fr' : '1fr', gap: '1.5rem', padding: '1.5rem 1.25rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.25)' }}>
      {item.render_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.render_url} alt={factionName} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', objectPosition: 'top', display: 'block', border: '1px solid var(--border)' }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {editBanner}
        <div style={grid}>
          <DetailField label="Faction Name"  value={factionName} />
          <DetailField label="Title Motion"  value={fBio.motion as string} />
          <DetailField label="Entrance Song" value={fBio.songUrl as string} isUrl />
        </div>
        {!!(fBio.color as string) && (
          <div>
            <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Faction Color</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
              <div style={{ width: 22, height: 22, background: fBio.color as string, border: '1px solid var(--border)' }} />
              <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{fBio.color as string}</span>
            </div>
          </div>
        )}
        {members.length > 0 && (
          <div>
            <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>Members</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {members.map((m, i) => (
                <span key={i} style={{ fontFamily: 'var(--font-meta)', fontSize: '0.68rem', color: 'var(--text-strong)', letterSpacing: '0.08em', padding: '0.25rem 0.6rem', background: 'var(--surface)', border: '1px solid var(--border)' }}>{m}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Pending Approvals ───────────────────────────────── */

function PendingApprovals({ onCountChange }: { onCountChange: (n: number) => void }) {
  const [items, setItems]       = useState<PendingItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [wRes, tRes] = await Promise.all([
        supabase.from('wrestlers').select('id, name, bio, render_url, gender, role, country, created_at').eq('status', 'pending').order('created_at', { ascending: true }),
        supabase.from('teams').select('id, name, bio, render_url, created_at').eq('status', 'pending').order('created_at', { ascending: true }),
      ])
      function parseEditMeta(row: { name: string; bio: string | null }): { isEdit: boolean; editOf: string | null; displayName: string } {
        try {
          const b = JSON.parse(row.bio ?? '{}')
          if (b.editOf) return { isEdit: true, editOf: b.editOf, displayName: b.snapshot?.name ?? row.name }
        } catch { /* */ }
        return { isEdit: false, editOf: null, displayName: row.name }
      }
      const wrestlers: PendingItem[] = (wRes.data ?? []).map((w) => {
        const { isEdit, editOf, displayName } = parseEditMeta(w)
        return { id: w.id, table: 'wrestlers' as const, type: 'Wrestler' as const, name: displayName, submittedAt: new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), bio: w.bio, isEdit, editOf, render_url: w.render_url ?? null, gender: w.gender ?? null, role: w.role ?? null, country: w.country ?? null }
      })
      const factions: PendingItem[] = (tRes.data ?? []).map((t) => {
        const { isEdit, editOf, displayName } = parseEditMeta(t)
        return { id: t.id, table: 'teams' as const, type: 'Faction' as const, name: displayName, submittedAt: new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), bio: t.bio, isEdit, editOf, render_url: t.render_url ?? null, gender: null, role: null, country: null }
      })
      const all = [...wrestlers, ...factions].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
      setItems(all)
      onCountChange(all.length)
      setLoading(false)
    }
    load()
  }, [onCountChange])

  async function approve(item: PendingItem) {
    setActing(item.id)

    if (item.isEdit && item.editOf) {
      try {
        const bio = JSON.parse(item.bio ?? '{}')
        const snap = bio.snapshot ?? {}
        const updates: Record<string, unknown> = {}
        if (snap.name != null) updates.name = snap.name
        if ('gender' in snap) updates.gender = snap.gender
        if ('role' in snap) updates.role = snap.role
        if ('country' in snap) updates.country = snap.country
        if ('gimmick' in snap) updates.gimmick = snap.gimmick
        if (snap.bio != null) updates.bio = JSON.stringify(snap.bio)
        const { error: updateErr } = await supabase.from(item.table).update(updates).eq('id', item.editOf)
        if (!updateErr) {
          await supabase.from(item.table).delete().eq('id', item.id)
          setItems((prev) => { const next = prev.filter((i) => i.id !== item.id); onCountChange(next.length); return next })
        }
      } catch { /* */ }
      setActing(null)
      return
    }

    const updates: Record<string, unknown> = { status: 'hired' }
    if (item.table === 'wrestlers') { updates.brand = 'DAW'; updates.active = true }
    const { error } = await supabase.from(item.table).update(updates).eq('id', item.id)
    if (!error) setItems((prev) => { const next = prev.filter((i) => i.id !== item.id); onCountChange(next.length); return next })
    setActing(null)
  }

  async function reject(item: PendingItem) {
    setActing(item.id)

    if (item.isEdit) {
      // Delete the edit row; original stays unchanged
      const { error } = await supabase.from(item.table).delete().eq('id', item.id)
      if (!error) setItems((prev) => { const next = prev.filter((i) => i.id !== item.id); onCountChange(next.length); return next })
      setActing(null)
      return
    }

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
          {items.map((a) => {
            const expanded = expandedId === a.id
            return (
              <div key={a.id} style={{ background:'var(--surface)', border:`1px solid ${a.isEdit ? 'rgba(255,159,0,0.4)' : 'var(--border)'}`, opacity: acting === a.id ? 0.5 : 1, transition:'opacity 0.15s', overflow: 'hidden' }}>
                {/* Clickable header row */}
                <div
                  onClick={() => setExpandedId(expanded ? null : a.id)}
                  style={{ display:'grid', gridTemplateColumns:'160px 1fr auto auto', alignItems:'center', gap:'1.5rem', padding:'1rem 1.25rem', cursor:'pointer' }}
                >
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.25rem' }}>
                    <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', letterSpacing:'0.15em', color:'var(--purple-hot)', fontWeight:700 }}>{a.type.toUpperCase()}</span>
                    {a.isEdit && <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.55rem', letterSpacing:'0.12em', color:'var(--gold)', fontWeight:700 }}>✎ EDIT</span>}
                  </div>
                  <div>
                    <p style={{ fontFamily:'var(--font-display)', fontSize:'1.2rem', color:'var(--text-strong)', textTransform:'uppercase', lineHeight:1.1 }}>{a.name}</p>
                    <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--text-dim)', letterSpacing:'0.1em', marginTop:'0.15rem' }}>{a.isEdit ? 'Edit request · ' : ''}Submitted {a.submittedAt}</p>
                  </div>
                  <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', color: expanded ? 'var(--purple-hot)' : 'var(--text-dim)', letterSpacing:'0.1em', flexShrink:0, userSelect:'none' }}>
                    {expanded ? '▲ Hide' : '▼ Review'}
                  </span>
                  <div style={{ display:'flex', gap:'0.5rem' }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => approve(a)} disabled={acting === a.id} style={{ padding:'0.5rem 1rem', background:'rgba(0,200,100,0.15)', border:'1px solid #00c864', color:'#00c864', fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>✓ Accept</button>
                    <button onClick={() => reject(a)} disabled={acting === a.id} style={{ padding:'0.5rem 1rem', background:'rgba(255,51,85,0.1)', border:'1px solid var(--accent-red)', color:'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>✕ Reject</button>
                  </div>
                </div>
                {/* Expanded detail panel */}
                {expanded && <SubmissionDetails item={a} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Show Booker ─────────────────────────────────────── */

function ShowBooker() {
  return <AdminScheduleBuilder />
}

function _ShowBookerOld({ notes: _notes }: { notes: DBStoryNote[] }) {
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

type RosterAddEntry = { id: string; name: string; kind: 'wrestler' | 'team' }

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
  const [savingMatch, setSavingMatch]   = useState<string | null>(null)
  const [savedMatch, setSavedMatch]     = useState<string | null>(null)
  const [streamUrl, setStreamUrl]       = useState('')
  const [savingStream, setSavingStream] = useState(false)
  const [streamSaved, setStreamSaved]   = useState(false)
  const [rosterEntries, setRosterEntries] = useState<RosterAddEntry[]>([])
  const [addingTo, setAddingTo]           = useState<string | null>(null)
  const [addSearch, setAddSearch]         = useState('')
  const [addWriteIn, setAddWriteIn]       = useState('')
  const [addingEntry, setAddingEntry]     = useState(false)

  useEffect(() => {
    async function loadShows() {
      const { data } = await supabase.from('shows').select('id, name, show_date, status, stream_url').in('status', ['committed', 'completed']).order('show_date', { ascending: false }).limit(20)
      setShows(data ?? [])
      setLoadingShows(false)
    }
    loadShows()
  }, [])

  useEffect(() => {
    async function loadRoster() {
      const [wRes, tRes] = await Promise.all([
        supabase.from('wrestlers').select('id, name').eq('active', true).order('name'),
        supabase.from('teams').select('id, name').eq('active', true).order('name'),
      ])
      const wrestlers = (wRes.data ?? []).map((w: any) => ({ id: w.id, name: w.name, kind: 'wrestler' as const }))
      const teams     = (tRes.data ?? []).map((t: any) => ({ id: t.id, name: t.name, kind: 'team' as const }))
      setRosterEntries([...wrestlers, ...teams])
    }
    loadRoster()
  }, [])

  async function addParticipant(matchId: string, entry: RosterAddEntry | null, writeInName?: string) {
    if (!entry && !writeInName) return
    setAddingEntry(true)
    const payload: Record<string, unknown> = { match_id: matchId, result: 'loser' }
    if (entry) {
      if (entry.kind === 'wrestler') payload.wrestler_id = entry.id
      else payload.team_id = entry.id
    } else {
      payload.write_in_name = writeInName
    }
    const { data, error } = await supabase.from('match_participants').insert(payload).select('id').single()
    setAddingEntry(false)
    if (error || !data) return
    const newP: Participant = { mp_id: data.id, name: entry?.name ?? writeInName ?? 'Unknown', result: 'loser', wrestler_id: entry?.kind === 'wrestler' ? entry.id : null, team_id: entry?.kind === 'team' ? entry.id : null }
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, participants: [...m.participants, newP] } : m))
    setAddingTo(null); setAddSearch(''); setAddWriteIn('')
  }

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
    const cards: MatchCard[] = (data ?? []).map((m: any) => ({ id: m.id, match_number: m.match_number, match_type: m.match_type, stipulation: m.stipulation, is_title_match: m.is_title_match, is_draw: m.is_draw, defeat_type: m.defeat_type, rating: m.rating, notes: m.notes, participants: (m.match_participants ?? []).map((mp: any) => ({ mp_id: mp.id, name: mp.write_in_name ?? mp.wrestlers?.name ?? mp.teams?.name ?? 'Unknown', result: mp.result, wrestler_id: mp.wrestler_id ?? null, team_id: mp.team_id ?? null })) }))
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
    setSavedMatch(null)
  }

  async function saveMatch(matchId: string) {
    const match = matches.find((m) => m.id === matchId)
    const form  = forms[matchId]
    if (!match || !form) return
    setSavingMatch(matchId); setSavedMatch(null)
    try {
      for (const p of match.participants) {
        const newResult = form.winner_mp_id === '' ? 'draw' : p.mp_id === form.winner_mp_id ? 'winner' : 'loser'
        await supabase.from('match_participants').update({ result: newResult }).eq('id', p.mp_id)
      }
      await supabase.from('matches').update({ defeat_type: form.defeat_type || null, rating: form.rating ? parseFloat(form.rating) : null, notes: form.notes || null, is_draw: form.winner_mp_id === '' }).eq('id', matchId)
      setSavedMatch(matchId)
      setTimeout(() => setSavedMatch(null), 3000)
    } finally {
      setSavingMatch(null)
    }
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
                {/* Add Participant panel */}
                {addingTo === match.id ? (
                  <div style={{ marginTop:'0.75rem', padding:'0.75rem', background:'rgba(128,0,218,0.06)', border:'1px solid var(--purple)' }}>
                    <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--purple-hot)', letterSpacing:'0.15em', fontWeight:700, marginBottom:'0.5rem' }}>ADD PARTICIPANT — RUN IN / CASH IN</p>
                    <div style={{ display:'flex', gap:'0.5rem', marginBottom:'0.5rem', flexWrap:'wrap' }}>
                      <input className="form-input" placeholder="Search roster…" value={addSearch} onChange={e => setAddSearch(e.target.value)} style={{ flex:1, minWidth:180, fontSize:'0.72rem' }} autoFocus />
                      <button onClick={() => { setAddingTo(null); setAddSearch(''); setAddWriteIn('') }} style={{ padding:'0.35rem 0.75rem', background:'transparent', border:'1px solid var(--border)', color:'var(--text-dim)', fontFamily:'var(--font-meta)', fontSize:'0.6rem', cursor:'pointer' }}>Cancel</button>
                    </div>
                    <div style={{ maxHeight:160, overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.25rem', marginBottom:'0.5rem' }}>
                      {rosterEntries.filter(e => !addSearch || e.name.toLowerCase().includes(addSearch.toLowerCase())).map(entry => (
                        <button key={entry.id} onClick={() => addParticipant(match.id, entry)} disabled={addingEntry} style={{ textAlign:'left', padding:'0.35rem 0.75rem', background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-muted)', fontFamily:'var(--font-meta)', fontSize:'0.7rem', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--purple)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                        >
                          <span>{entry.name}</span>
                          <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.52rem', color:'var(--text-dim)', letterSpacing:'0.08em' }}>{entry.kind === 'team' ? 'FACTION' : 'WRESTLER'}</span>
                        </button>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                      <input className="form-input" placeholder="Write-in name (mystery entrant)…" value={addWriteIn} onChange={e => setAddWriteIn(e.target.value)} style={{ flex:1, fontSize:'0.68rem' }} />
                      <button onClick={() => addWriteIn.trim() && addParticipant(match.id, null, addWriteIn.trim())} disabled={addingEntry || !addWriteIn.trim()} style={{ padding:'0.35rem 0.75rem', background:'rgba(128,0,218,0.15)', border:'1px solid var(--purple)', color:'var(--purple-hot)', fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, cursor:'pointer' }}>Add Write-In</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setAddingTo(match.id); setAddSearch('') }} style={{ marginTop:'0.75rem', padding:'0.35rem 0.85rem', background:'transparent', border:'1px dashed rgba(128,0,218,0.4)', color:'var(--purple-hot)', fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer', width:'100%' }}>
                    + Add Participant (Run In / Cash In)
                  </button>
                )}

                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'0.75rem' }}>
                  <button
                    onClick={() => saveMatch(match.id)}
                    disabled={savingMatch === match.id}
                    style={{ padding:'0.4rem 1rem', background: savedMatch === match.id ? 'rgba(0,200,100,0.15)' : 'rgba(128,0,218,0.12)', border:`1px solid ${savedMatch === match.id ? '#00c864' : 'var(--purple)'}`, color: savedMatch === match.id ? '#00c864' : 'var(--purple-hot)', fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}
                  >
                    {savingMatch === match.id ? '…' : savedMatch === match.id ? '✓ Saved' : 'Save Match'}
                  </button>
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
                    <AdminDropZone onFile={(file) => handleUpload(item.id, file)} uploading={uploading} />
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

/* ── Title Images ────────────────────────────────────── */

interface TitleImageRow { id: string; name: string; image_url: string | null }

function TitleImages() {
  const [items, setItems]           = useState<TitleImageRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [feedback, setFeedback]     = useState<{ id: string; ok: boolean; msg: string } | null>(null)

  const loadItems = useCallback(async () => {
    setLoading(true); setExpandedId(null)
    const { data } = await supabase.from('titles').select('id, name, image_url').eq('active', true).order('display_order')
    setItems(data ?? []); setLoading(false)
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  async function handleUpload(titleId: string, file: File) {
    setUploading(true); setFeedback(null)
    const ext = file.name.split('.').pop()
    const path = `titles/${titleId}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('renders').upload(path, file, { upsert: true, contentType: file.type })
    if (uploadErr) { setFeedback({ id: titleId, ok: false, msg: uploadErr.message }); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('renders').getPublicUrl(path)
    const { error: updateErr } = await supabase.from('titles').update({ image_url: publicUrl }).eq('id', titleId)
    if (updateErr) { setFeedback({ id: titleId, ok: false, msg: updateErr.message }) }
    else { setFeedback({ id: titleId, ok: true, msg: 'Belt image uploaded.' }); await loadItems(); setExpandedId(null) }
    setUploading(false)
    setTimeout(() => setFeedback(null), 4000)
  }

  async function removeImage(titleId: string) {
    const { error } = await supabase.from('titles').update({ image_url: null }).eq('id', titleId)
    if (!error) { setFeedback({ id: titleId, ok: true, msg: 'Image removed.' }); await loadItems() }
    setTimeout(() => setFeedback(null), 4000)
  }

  return (
    <div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--text-strong)', textTransform:'uppercase', marginBottom:'0.35rem' }}>Title Images</h2>
      <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.65rem', color:'var(--text-dim)', letterSpacing:'0.1em', marginBottom:'1.5rem', lineHeight:1.8 }}>Upload or replace championship belt images for active titles.</p>
      {feedback && <div style={{ padding:'0.65rem 1rem', background: feedback.ok ? 'rgba(0,200,100,0.12)' : 'rgba(255,51,85,0.1)', border:`1px solid ${feedback.ok ? '#00c864' : 'var(--accent-red)'}`, color: feedback.ok ? '#00c864' : 'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.68rem', letterSpacing:'0.08em', marginBottom:'1rem' }}>{feedback.ok ? '✓' : '✕'} {feedback.msg}</div>}
      {loading ? (
        <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.72rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>Loading…</p>
      ) : (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'100px 1fr 120px', gap:'0.75rem', padding:'0.6rem 1rem', background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }}>
            {['Belt Image', 'Title Name', ''].map((h, i) => <span key={i} style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.15em', color:'var(--text-dim)' }}>{h}</span>)}
          </div>
          {items.map((item) => (
            <div key={item.id}>
              <div style={{ display:'grid', gridTemplateColumns:'100px 1fr 120px', gap:'0.75rem', padding:'0.65rem 1rem', borderBottom:'1px solid rgba(42,42,51,0.5)', alignItems:'center' }}>
                <div style={{ width:80, height:48, background:'var(--surface-2)', border:'1px solid var(--border)', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                  ) : (
                    <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.5rem', color:'var(--text-dim)', letterSpacing:'0.1em' }}>NO IMG</span>
                  )}
                </div>
                <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-strong)', letterSpacing:'0.05em' }}>{item.name}</span>
                <button onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} style={{ padding:'0.35rem 0.75rem', background: expandedId === item.id ? 'rgba(255,201,51,0.2)' : 'rgba(255,201,51,0.1)', border:'1px solid var(--gold)', color:'var(--gold)', fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>{expandedId === item.id ? '✕ Cancel' : item.image_url ? 'Replace' : 'Upload'}</button>
              </div>
              {expandedId === item.id && (
                <div style={{ padding:'1rem 1rem 1rem 2rem', background:'rgba(255,201,51,0.04)', borderBottom:'1px solid var(--border)', borderLeft:'3px solid var(--gold)' }}>
                  <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--gold)', letterSpacing:'0.2em', fontWeight:700, marginBottom:'0.75rem' }}>UPLOAD BELT IMAGE — {item.name.toUpperCase()}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
                    <AdminDropZone onFile={(file) => handleUpload(item.id, file)} uploading={uploading} accent="var(--gold)" border="rgba(255,201,51,0.5)" />
                  </div>
                  {item.image_url && <button onClick={() => removeImage(item.id)} style={{ marginTop:'0.75rem', padding:'0.4rem 0.85rem', background:'rgba(255,51,85,0.08)', border:'1px solid var(--accent-red)', color:'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>Remove Current Image</button>}
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
  const [search, setSearch]         = useState('')
  const [filterBrand, setFilterBrand]   = useState('')
  const [filterRole, setFilterRole]     = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterInjured, setFilterInjured] = useState<'all' | 'yes' | 'no'>('all')
  const [rows, setRows]             = useState<RosterRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState<string | null>(null)
  const [backstoryEdit, setBackstoryEdit] = useState<{ id: string; name: string; text: string } | null>(null)
  const [backstorySaving, setBackstorySaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('wrestlers').select('id, name, brand, gender, division, role, injured, status, backstory').eq('active', true).order('name')
      setRows((data ?? []).map((r: any) => ({ ...r, injured: !!r.injured, saved: false, backstory: r.backstory ?? null })))
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
    await supabase.from('wrestlers').update({
      name: row.name,
      brand: row.brand,
      gender: row.gender,
      division: row.division,
      role: row.role,
      injured: row.injured,
      status: row.status,
      active: row.status === 'hired',
    }).eq('id', id)
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, saved: true } : r))
    setSaving(null)
  }

  async function retire(id: string) {
    await supabase.from('wrestlers').update({ status: 'retired', active: false }).eq('id', id)
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  async function saveBackstory() {
    if (!backstoryEdit) return
    setBackstorySaving(true)
    await supabase.from('wrestlers').update({ backstory: backstoryEdit.text || null }).eq('id', backstoryEdit.id)
    setRows((prev) => prev.map((r) => r.id === backstoryEdit!.id ? { ...r, backstory: backstoryEdit!.text || null } : r))
    setBackstorySaving(false)
    setBackstoryEdit(null)
  }

  const filtered = rows.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterBrand  && r.brand  !== filterBrand)  return false
    if (filterRole   && r.role   !== filterRole)   return false
    if (filterGender && r.gender !== filterGender) return false
    if (filterInjured === 'yes' && !r.injured) return false
    if (filterInjured === 'no'  &&  r.injured) return false
    return true
  })

  const chipStyle = (active: boolean, color = 'var(--purple-hot)', borderC = 'var(--purple)'): React.CSSProperties => ({
    padding: '0.2rem 0.55rem', fontFamily: 'var(--font-meta)', fontSize: '0.58rem', fontWeight: 700,
    letterSpacing: '0.1em', cursor: 'pointer', border: `1px solid ${active ? borderC : 'var(--border)'}`,
    background: active ? `rgba(128,0,218,0.15)` : 'transparent',
    color: active ? color : 'var(--text-dim)',
  })

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem', flexWrap:'wrap', gap:'1rem' }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--text-strong)', textTransform:'uppercase' }}>Roster Edits</h2>
        <input className="form-input" placeholder="Search wrestlers..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth:240, fontSize:'0.72rem' }} />
      </div>

      {/* Filter bar */}
      <div style={{ display:'flex', gap:'1.5rem', alignItems:'center', flexWrap:'wrap', marginBottom:'1.25rem', padding:'0.75rem 1rem', background:'var(--surface)', border:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.35rem' }}>
          <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.58rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>BRAND</span>
          {['DAW','Free Agent'].map(b => <button key={b} style={chipStyle(filterBrand === b)} onClick={() => setFilterBrand(filterBrand === b ? '' : b)}>{b}</button>)}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.35rem' }}>
          <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.58rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>ROLE</span>
          {['Face','Heel'].map(r => <button key={r} style={chipStyle(filterRole === r)} onClick={() => setFilterRole(filterRole === r ? '' : r)}>{r}</button>)}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.35rem' }}>
          <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.58rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>GENDER</span>
          {['Male','Female'].map(g => <button key={g} style={chipStyle(filterGender === g)} onClick={() => setFilterGender(filterGender === g ? '' : g)}>{g}</button>)}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.35rem' }}>
          <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.58rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>INJURED</span>
          <button style={chipStyle(filterInjured === 'yes', 'var(--accent-red)', 'var(--accent-red)')} onClick={() => setFilterInjured(filterInjured === 'yes' ? 'all' : 'yes')}>Yes</button>
          <button style={chipStyle(filterInjured === 'no')} onClick={() => setFilterInjured(filterInjured === 'no' ? 'all' : 'no')}>No</button>
        </div>
        <span style={{ marginLeft:'auto', fontFamily:'var(--font-meta)', fontSize:'0.62rem', color:'var(--text-dim)', letterSpacing:'0.12em' }}>{filtered.length} / {rows.length}</span>
      </div>

      {loading ? (
        <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>Loading…</p>
      ) : (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 110px 100px 120px 120px 90px 100px 60px 60px 80px', gap:'0.5rem', padding:'0.65rem 1rem', background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }}>
            {['Name','Brand','Gender','Division','Role','Injured','Status','','','Backstory'].map((h, i) => <span key={i} style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.15em', color:'var(--text-dim)' }}>{h}</span>)}
          </div>
          <div style={{ maxHeight:'60vh', overflowY:'auto' }}>
            {filtered.map((row) => (
              <div key={row.id} style={{ display:'grid', gridTemplateColumns:'1fr 110px 100px 120px 120px 90px 100px 60px 60px 80px', gap:'0.5rem', padding:'0.6rem 1rem', borderBottom:'1px solid rgba(42,42,51,0.5)', alignItems:'center' }}>
                <input className="form-input" value={row.name} onChange={(e) => update(row.id, 'name', e.target.value)} style={{ padding:'0.35rem 0.6rem', fontSize:'0.72rem' }} />
                <select className="form-input form-select" value={row.brand ?? ''} onChange={(e) => update(row.id, 'brand', e.target.value)} style={{ padding:'0.35rem 1.5rem 0.35rem 0.6rem', fontSize:'0.68rem' }}>
                  <option value="">—</option>
                  {['DAW','Free Agent'].map((o) => <option key={o}>{o}</option>)}
                </select>
                <select className="form-input form-select" value={row.gender ?? ''} onChange={(e) => update(row.id, 'gender', e.target.value)} style={{ padding:'0.35rem 1.5rem 0.35rem 0.6rem', fontSize:'0.68rem' }}>
                  <option value="">—</option>
                  {['Male','Female'].map((o) => <option key={o}>{o}</option>)}
                </select>
                <select className="form-input form-select" value={row.division ?? ''} onChange={(e) => update(row.id, 'division', e.target.value)} style={{ padding:'0.35rem 1.5rem 0.35rem 0.6rem', fontSize:'0.68rem' }}>
                  <option value="">—</option>
                  {['Mens','Womens','Mixed'].map((o) => <option key={o}>{o}</option>)}
                </select>
                <select className="form-input form-select" value={row.role ?? ''} onChange={(e) => update(row.id, 'role', e.target.value)} style={{ padding:'0.35rem 1.5rem 0.35rem 0.6rem', fontSize:'0.68rem' }}>
                  <option value="">—</option>
                  {['Face','Heel'].map((o) => <option key={o}>{o}</option>)}
                </select>
                <label style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer' }}>
                  <input type="checkbox" checked={row.injured} onChange={(e) => update(row.id, 'injured', e.target.checked)} style={{ accentColor:'var(--accent-red)' }} />
                  <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', color: row.injured ? 'var(--accent-red)' : 'var(--text-dim)', letterSpacing:'0.08em' }}>{row.injured ? 'Yes' : 'No'}</span>
                </label>
                <select className="form-input form-select" value={row.status ?? ''} onChange={(e) => update(row.id, 'status', e.target.value)} style={{ padding:'0.35rem 1.5rem 0.35rem 0.6rem', fontSize:'0.68rem' }}>
                  <option value="">—</option>
                  {['hired','released','retired'].map((o) => <option key={o}>{o}</option>)}
                </select>
                <button onClick={() => save(row.id)} disabled={saving === row.id} style={{ padding:'0.35rem 0.75rem', background: row.saved ? 'rgba(0,200,100,0.15)' : 'rgba(128,0,218,0.15)', border:`1px solid ${row.saved ? '#00c864' : 'var(--purple)'}`, color: row.saved ? '#00c864' : 'var(--purple-hot)', fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>{saving === row.id ? '…' : row.saved ? '✓' : 'Save'}</button>
                <button onClick={() => retire(row.id)} style={{ padding:'0.35rem 0.75rem', background:'rgba(255,51,85,0.08)', border:'1px solid var(--accent-red)', color:'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>Retire</button>
                <button onClick={() => setBackstoryEdit({ id: row.id, name: row.name, text: row.backstory ?? '' })} style={{ padding:'0.35rem 0.5rem', background:'rgba(128,0,218,0.08)', border:'1px solid var(--border)', color:'var(--text-dim)', fontFamily:'var(--font-meta)', fontSize:'0.58rem', fontWeight:700, letterSpacing:'0.08em', cursor:'pointer' }}>{row.backstory ? '✎ Story' : '+ Story'}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {backstoryEdit && (
        <div onClick={() => setBackstoryEdit(null)} style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background:'var(--surface)', border:'1px solid var(--border)', width:'100%', maxWidth:520, display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.15rem', color:'var(--text-strong)', textTransform:'uppercase', margin:0 }}>Backstory — {backstoryEdit.name}</h3>
              <button onClick={() => setBackstoryEdit(null)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:'1.1rem', lineHeight:1, padding:0 }}>✕</button>
            </div>
            <div style={{ padding:'1.25rem' }}>
              <textarea
                value={backstoryEdit.text}
                onChange={(e) => setBackstoryEdit((prev) => prev ? { ...prev, text: e.target.value } : null)}
                rows={8}
                placeholder="Enter wrestler backstory…"
                style={{ width:'100%', background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text-strong)', fontFamily:'var(--font-meta)', fontSize:'0.78rem', lineHeight:1.7, padding:'0.75rem', resize:'vertical', boxSizing:'border-box' }}
              />
              <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.5rem', marginTop:'0.75rem' }}>
                <button onClick={() => setBackstoryEdit(null)} style={{ padding:'0.5rem 1rem', background:'transparent', border:'1px solid var(--border)', color:'var(--text-dim)', fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>Cancel</button>
                <button onClick={saveBackstory} disabled={backstorySaving} style={{ padding:'0.5rem 1.25rem', background:'rgba(128,0,218,0.15)', border:'1px solid var(--purple)', color:'var(--purple-hot)', fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>{backstorySaving ? 'Saving…' : 'Save Backstory'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Faction Edits ────────────────────────────────────── */

function FactionEdits() {
  const [search, setSearch]           = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [rows, setRows]               = useState<FactionRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState<string | null>(null)
  const [backstoryEdit, setBackstoryEdit] = useState<{ id: string; name: string; text: string } | null>(null)
  const [backstorySaving, setBackstorySaving] = useState(false)
  const [membersPopup, setMembersPopup] = useState<{ teamId: string; teamName: string } | null>(null)
  const [membersList, setMembersList] = useState<{ wrestlerId: string; membershipId: string; name: string }[]>([])
  const [availWrestlers, setAvailWrestlers] = useState<{ id: string; name: string }[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [memberOp, setMemberOp] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('teams').select('id, name, brand, division, role, status, backstory').order('name')
      setRows((data ?? []).map((r: any) => ({ ...r, saved: false, role: r.role ?? null, backstory: r.backstory ?? null })))
      setLoading(false)
    }
    load()
  }, [])

  function update(id: string, key: keyof FactionRow, value: any) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, [key]: value, saved: false } : r))
  }

  async function save(id: string) {
    setSaving(id)
    const row = rows.find((r) => r.id === id)
    if (!row) { setSaving(null); return }
    await supabase.from('teams').update({
      name: row.name,
      brand: row.brand,
      division: row.division,
      role: row.role,
      status: row.status,
      active: row.status === 'hired',
    }).eq('id', id)
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, saved: true } : r))
    setSaving(null)
  }

  async function dissolve(id: string) {
    await supabase.from('teams').update({ status: 'disbanded', active: false }).eq('id', id)
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  async function saveFactionBackstory() {
    if (!backstoryEdit) return
    setBackstorySaving(true)
    await supabase.from('teams').update({ backstory: backstoryEdit.text || null }).eq('id', backstoryEdit.id)
    setRows((prev) => prev.map((r) => r.id === backstoryEdit!.id ? { ...r, backstory: backstoryEdit!.text || null } : r))
    setBackstorySaving(false)
    setBackstoryEdit(null)
  }

  async function openMembers(row: FactionRow) {
    setMembersPopup({ teamId: row.id, teamName: row.name })
    setMemberSearch('')
    const [membRes, wRes] = await Promise.all([
      supabase.from('team_memberships').select('id, wrestler_id, wrestlers(id, name)').eq('team_id', row.id).is('end_date', null),
      supabase.from('wrestlers').select('id, name').eq('active', true).order('name'),
    ])
    setMembersList((membRes.data ?? []).map((m: any) => ({ wrestlerId: m.wrestlers?.id ?? m.wrestler_id, membershipId: m.id, name: m.wrestlers?.name ?? '?' })))
    setAvailWrestlers((wRes.data ?? []) as { id: string; name: string }[])
  }

  async function addMember(wrestlerId: string, wrestlerName: string) {
    if (!membersPopup || memberOp) return
    setMemberOp(true)
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('team_memberships').insert({ team_id: membersPopup.teamId, wrestler_id: wrestlerId, start_date: today }).select('id').single()
    if (data) setMembersList((prev) => [...prev, { wrestlerId, membershipId: data.id, name: wrestlerName }])
    setMemberOp(false)
  }

  async function removeMember(membershipId: string) {
    if (!membersPopup || memberOp) return
    setMemberOp(true)
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('team_memberships').update({ end_date: today }).eq('id', membershipId)
    setMembersList((prev) => prev.filter((m) => m.membershipId !== membershipId))
    setMemberOp(false)
  }

  const filtered = rows.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterBrand && r.brand !== filterBrand) return false
    return true
  })

  const chipStyle = (active: boolean, color = 'var(--purple-hot)', borderC = 'var(--purple)'): React.CSSProperties => ({
    padding: '0.2rem 0.55rem', fontFamily: 'var(--font-meta)', fontSize: '0.58rem', fontWeight: 700,
    letterSpacing: '0.1em', cursor: 'pointer', border: `1px solid ${active ? borderC : 'var(--border)'}`,
    background: active ? `rgba(128,0,218,0.15)` : 'transparent',
    color: active ? color : 'var(--text-dim)',
  })

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem', flexWrap:'wrap', gap:'1rem' }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--text-strong)', textTransform:'uppercase' }}>Faction Edits</h2>
        <input className="form-input" placeholder="Search factions..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth:240, fontSize:'0.72rem' }} />
      </div>

      {/* Filter bar */}
      <div style={{ display:'flex', gap:'1.5rem', alignItems:'center', flexWrap:'wrap', marginBottom:'1.25rem', padding:'0.75rem 1rem', background:'var(--surface)', border:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.35rem' }}>
          <span style={{ fontFamily:'var(--font-meta)', fontSize:'0.58rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>BRAND</span>
          {['DAW','Free Agent'].map(b => <button key={b} style={chipStyle(filterBrand === b)} onClick={() => setFilterBrand(filterBrand === b ? '' : b)}>{b}</button>)}
        </div>
        <span style={{ marginLeft:'auto', fontFamily:'var(--font-meta)', fontSize:'0.62rem', color:'var(--text-dim)', letterSpacing:'0.12em' }}>{filtered.length} / {rows.length}</span>
      </div>

      {loading ? (
        <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>Loading…</p>
      ) : (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 110px 110px 95px 110px 60px 80px 80px 80px', gap:'0.5rem', padding:'0.65rem 1rem', background:'var(--surface-2)', borderBottom:'1px solid var(--border)' }}>
            {['Faction','Brand','Division','Role','Status','','','',''].map((h, i) => <span key={i} style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.15em', color:'var(--text-dim)' }}>{h}</span>)}
          </div>
          <div style={{ maxHeight:'60vh', overflowY:'auto' }}>
            {filtered.map((row) => (
              <div key={row.id} style={{ display:'grid', gridTemplateColumns:'1fr 110px 110px 95px 110px 60px 80px 80px 80px', gap:'0.5rem', padding:'0.6rem 1rem', borderBottom:'1px solid rgba(42,42,51,0.5)', alignItems:'center' }}>
                <input className="form-input" value={row.name} onChange={(e) => update(row.id, 'name', e.target.value)} style={{ padding:'0.35rem 0.6rem', fontSize:'0.72rem' }} />
                <select className="form-input form-select" value={row.brand ?? ''} onChange={(e) => update(row.id, 'brand', e.target.value)} style={{ padding:'0.35rem 1.5rem 0.35rem 0.6rem', fontSize:'0.68rem' }}>
                  <option value="">—</option>
                  {['DAW','Free Agent'].map((o) => <option key={o}>{o}</option>)}
                </select>
                <select className="form-input form-select" value={row.division ?? ''} onChange={(e) => update(row.id, 'division', e.target.value)} style={{ padding:'0.35rem 1.5rem 0.35rem 0.6rem', fontSize:'0.68rem' }}>
                  <option value="">—</option>
                  {['Mens','Womens','Mixed'].map((o) => <option key={o}>{o}</option>)}
                </select>
                <select className="form-input form-select" value={row.role ?? ''} onChange={(e) => update(row.id, 'role', e.target.value)} style={{ padding:'0.35rem 1.5rem 0.35rem 0.6rem', fontSize:'0.68rem' }}>
                  <option value="">—</option>
                  {['Face','Heel'].map((o) => <option key={o}>{o}</option>)}
                </select>
                <select className="form-input form-select" value={row.status ?? ''} onChange={(e) => update(row.id, 'status', e.target.value)} style={{ padding:'0.35rem 1.5rem 0.35rem 0.6rem', fontSize:'0.68rem' }}>
                  <option value="">—</option>
                  {['hired','released','disbanded'].map((o) => <option key={o}>{o}</option>)}
                </select>
                <button onClick={() => save(row.id)} disabled={saving === row.id} style={{ padding:'0.35rem 0.5rem', background: row.saved ? 'rgba(0,200,100,0.15)' : 'rgba(128,0,218,0.15)', border:`1px solid ${row.saved ? '#00c864' : 'var(--purple)'}`, color: row.saved ? '#00c864' : 'var(--purple-hot)', fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>{saving === row.id ? '…' : row.saved ? '✓' : 'Save'}</button>
                <button onClick={() => dissolve(row.id)} style={{ padding:'0.35rem 0.5rem', background:'rgba(255,51,85,0.08)', border:'1px solid var(--accent-red)', color:'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>Dissolve</button>
                <button onClick={() => openMembers(row)} style={{ padding:'0.35rem 0.5rem', background:'rgba(0,200,100,0.08)', border:'1px solid rgba(0,200,100,0.4)', color:'#00c864', fontFamily:'var(--font-meta)', fontSize:'0.58rem', fontWeight:700, letterSpacing:'0.08em', cursor:'pointer' }}>Members</button>
                <button onClick={() => setBackstoryEdit({ id: row.id, name: row.name, text: row.backstory ?? '' })} style={{ padding:'0.35rem 0.5rem', background:'rgba(128,0,218,0.08)', border:'1px solid var(--border)', color:'var(--text-dim)', fontFamily:'var(--font-meta)', fontSize:'0.58rem', fontWeight:700, letterSpacing:'0.08em', cursor:'pointer' }}>{row.backstory ? '✎ Story' : '+ Story'}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members popup */}
      {membersPopup && (
        <div onClick={() => setMembersPopup(null)} style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background:'var(--surface)', border:'1px solid var(--border)', width:'100%', maxWidth:480, maxHeight:'80vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.15rem', color:'var(--text-strong)', textTransform:'uppercase', margin:0 }}>Members — {membersPopup.teamName}</h3>
              <button onClick={() => setMembersPopup(null)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:'1.1rem', lineHeight:1, padding:0 }}>✕</button>
            </div>
            <div style={{ overflowY:'auto', flex:1, padding:'1rem 1.25rem' }}>
              <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.58rem', color:'#00c864', letterSpacing:'0.2em', fontWeight:700, marginBottom:'0.5rem' }}>CURRENT MEMBERS</p>
              {membersList.length === 0 ? (
                <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.7rem', color:'var(--text-dim)', marginBottom:'1rem' }}>No members.</p>
              ) : (
                <div style={{ marginBottom:'1.25rem', border:'1px solid var(--border)' }}>
                  {membersList.map((m) => (
                    <div key={m.membershipId} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.45rem 0.75rem', borderBottom:'1px solid rgba(42,42,51,0.5)' }}>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:'0.85rem', color:'var(--text-strong)', textTransform:'uppercase' }}>{m.name}</span>
                      <button onClick={() => removeMember(m.membershipId)} disabled={memberOp} style={{ padding:'0.25rem 0.6rem', background:'rgba(255,51,85,0.08)', border:'1px solid var(--accent-red)', color:'var(--accent-red)', fontFamily:'var(--font-meta)', fontSize:'0.58rem', fontWeight:700, cursor:'pointer' }}>Remove</button>
                    </div>
                  ))}
                </div>
              )}

              <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.58rem', color:'var(--purple-hot)', letterSpacing:'0.2em', fontWeight:700, marginBottom:'0.5rem' }}>ADD MEMBER</p>
              <input className="form-input" placeholder="Search roster…" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} style={{ fontSize:'0.72rem', marginBottom:'0.5rem', width:'100%', boxSizing:'border-box' }} />
              <div style={{ maxHeight:220, overflowY:'auto', border:'1px solid var(--border)' }}>
                {availWrestlers
                  .filter((w) => !membersList.some((m) => m.wrestlerId === w.id) && w.name.toLowerCase().includes(memberSearch.toLowerCase()))
                  .map((w) => (
                    <div key={w.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0.4rem 0.75rem', borderBottom:'1px solid rgba(42,42,51,0.3)' }}>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:'0.8rem', color:'var(--text-muted)', textTransform:'uppercase' }}>{w.name}</span>
                      <button onClick={() => addMember(w.id, w.name)} disabled={memberOp} style={{ padding:'0.25rem 0.6rem', background:'rgba(128,0,218,0.1)', border:'1px solid var(--purple)', color:'var(--purple-hot)', fontFamily:'var(--font-meta)', fontSize:'0.58rem', fontWeight:700, cursor:'pointer' }}>Add</button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backstory popup */}
      {backstoryEdit && (
        <div onClick={() => setBackstoryEdit(null)} style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background:'var(--surface)', border:'1px solid var(--border)', width:'100%', maxWidth:520, display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.15rem', color:'var(--text-strong)', textTransform:'uppercase', margin:0 }}>Backstory — {backstoryEdit.name}</h3>
              <button onClick={() => setBackstoryEdit(null)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:'1.1rem', lineHeight:1, padding:0 }}>✕</button>
            </div>
            <div style={{ padding:'1.25rem' }}>
              <textarea
                value={backstoryEdit.text}
                onChange={(e) => setBackstoryEdit((prev) => prev ? { ...prev, text: e.target.value } : null)}
                rows={8}
                placeholder="Enter faction backstory…"
                style={{ width:'100%', background:'var(--surface-2)', border:'1px solid var(--border)', color:'var(--text-strong)', fontFamily:'var(--font-meta)', fontSize:'0.78rem', lineHeight:1.7, padding:'0.75rem', resize:'vertical', boxSizing:'border-box' }}
              />
              <div style={{ display:'flex', justifyContent:'flex-end', gap:'0.5rem', marginTop:'0.75rem' }}>
                <button onClick={() => setBackstoryEdit(null)} style={{ padding:'0.5rem 1rem', background:'transparent', border:'1px solid var(--border)', color:'var(--text-dim)', fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>Cancel</button>
                <button onClick={saveFactionBackstory} disabled={backstorySaving} style={{ padding:'0.5rem 1.25rem', background:'rgba(128,0,218,0.15)', border:'1px solid var(--purple)', color:'var(--purple-hot)', fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', cursor:'pointer' }}>{backstorySaving ? 'Saving…' : 'Save Backstory'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Schedule Planner ───────────────────────────────── */

function ScheduleEditor() {
  const [year, setYear]           = useState(new Date().getFullYear())
  const [showMap, setShowMap]     = useState<Record<string, ScheduleShowRow>>({})
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<string | null>(null)
  const [editForm, setEditForm]   = useState<(Partial<ScheduleShowRow> & { show_date: string }) | null>(null)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)

  const loadYear = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('shows')
      .select('id, name, show_date, show_type, ppv_name, ppv_color, ppv_abbr, status')
      .gte('show_date', `${year}-01-01`)
      .lte('show_date', `${year}-12-31`)
      .order('show_date')
    const map: Record<string, ScheduleShowRow> = {}
    ;(data ?? []).forEach((r: any) => { map[r.show_date] = { ...r, saved: true } })
    setShowMap(map)
    setLoading(false)
  }, [year])

  useEffect(() => { loadYear() }, [loadYear])

  function selectDate(dateStr: string) {
    const existing = showMap[dateStr]
    setSelected(dateStr)
    if (existing) {
      setEditForm({ ...existing })
    } else {
      setEditForm({ show_date: dateStr, name: 'DAW Warehouse LIVE', show_type: 'weekly', ppv_name: null, ppv_color: '#a855f7', ppv_abbr: null, status: 'draft' })
    }
  }

  function closePanel() { setSelected(null); setEditForm(null) }

  async function saveShow() {
    if (!editForm) return
    setSaving(true)
    const existing = selected ? showMap[selected] : null
    const payload = { name: editForm.name, show_type: editForm.show_type, ppv_name: editForm.ppv_name || null, ppv_color: editForm.ppv_color || null, ppv_abbr: editForm.ppv_abbr || null, show_date: editForm.show_date, status: editForm.status ?? 'draft' }
    if (existing?.id) {
      await supabase.from('shows').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('shows').insert(payload)
    }
    await loadYear()
    setSaving(false)
    closePanel()
  }

  async function deleteShow() {
    if (!selected || !showMap[selected]?.id) return
    setDeleting(true)
    await supabase.from('shows').delete().eq('id', showMap[selected].id)
    await loadYear()
    setDeleting(false)
    closePanel()
  }

  const PLAN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const PLAN_DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa']
  const PLAN_YEARS  = [2022, 2023, 2024, 2025, 2026, 2027]

  function planDateStr(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const ppvColorMap: Record<string, string> = {}
  Object.values(showMap).filter(s => s.show_type === 'ppv').forEach(s => { ppvColorMap[s.show_date] = s.ppv_color ?? '#a855f7' })

  function PlannerCell({ date }: { date: Date | null }) {
    if (!date) return <div style={{ aspectRatio: '1', minHeight: 30 }} />
    const dateStr  = planDateStr(date)
    const isFri    = date.getDay() === 5
    const show     = showMap[dateStr]
    const isSelected  = selected === dateStr
    const isPpv       = show?.show_type === 'ppv'
    const isSkip      = show?.show_type === 'skip'
    const isDraft     = show?.status === 'draft'
    const isCompleted = show?.status === 'completed'
    const isCommitted = show?.status === 'committed'
    const ppvColor    = isPpv ? (show.ppv_color ?? '#a855f7') : null
    const isPast      = date < today

    const borderColor = isPpv && ppvColor ? ppvColor
      : isSkip ? 'rgba(255,255,255,0.12)'
      : isCompleted ? '#00c864'
      : isCommitted ? 'var(--purple-hot)'
      : isDraft ? 'rgba(128,0,218,0.4)'
      : isFri ? 'rgba(128,0,218,0.18)'
      : 'transparent'

    return (
      <div
        onClick={() => isFri && selectDate(dateStr)}
        style={{
          aspectRatio: '1', minHeight: 30,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          backgroundColor: isPpv && ppvColor ? (isDraft ? ppvColor + '66' : ppvColor + 'bb') : undefined,
          border: isFri ? `${isDraft ? '1px dashed' : '1px solid'} ${borderColor}` : undefined,
          outline: isSelected ? '2px solid #fff' : undefined, outlineOffset: -2,
          opacity: isDraft ? 0.7 : isPast && !show ? 0.28 : 1,
          cursor: isFri ? 'pointer' : 'default',
          transition: 'filter 0.1s',
        }}
        onMouseEnter={(e) => { if (isFri) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.4)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = '' }}
        title={show ? `${show.name}${isDraft ? ' (DRAFT)' : ''}` : isFri ? 'Click to add show' : undefined}
      >
        <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.56rem', lineHeight: 1, color: isPpv && !isDraft ? '#fff' : isFri ? (isCompleted ? '#00c864' : isCommitted ? 'var(--purple-hot)' : isDraft ? 'rgba(168,85,247,0.8)' : 'var(--text-dim)') : 'var(--text-dim)' }}>
          {date.getDate()}
        </span>
        {isFri && !isPpv && show && (
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.36rem', fontWeight: 700, letterSpacing: '0.1em', marginTop: '1px', color: isSkip ? 'rgba(255,255,255,0.25)' : isCompleted ? '#00c864' : isCommitted ? 'var(--purple-hot)' : 'rgba(168,85,247,0.65)' }}>
            {isSkip ? 'BRK' : isDraft ? 'DFT' : isCompleted ? '✓' : 'DAW'}
          </span>
        )}
        {isPpv && (
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.36rem', fontWeight: 700, letterSpacing: '0.06em', marginTop: '1px', color: isDraft ? 'rgba(255,255,255,0.6)' : '#fff' }}>
            {show.ppv_abbr ?? (show.ppv_name ?? show.name).slice(0, 4).toUpperCase()}
          </span>
        )}
      </div>
    )
  }

  function PlannerMonthGrid({ month }: { month: number }) {
    const firstDay    = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
    let monthDotColor: string | null = null
    for (let d = 1; d <= daysInMonth; d++) {
      const c = ppvColorMap[planDateStr(new Date(year, month, d))]
      if (c) { monthDotColor = c; break }
    }
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.65rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.82rem', color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{PLAN_MONTHS[month]}</span>
          {monthDotColor && <span style={{ width: 7, height: 7, borderRadius: '50%', background: monthDotColor, flexShrink: 0 }} />}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
          {PLAN_DAYS.map((d) => (
            <div key={d} style={{ textAlign: 'center', padding: '0.18rem 0', fontFamily: 'var(--font-meta)', fontSize: '0.44rem', fontWeight: 700, letterSpacing: '0.06em', color: d === 'Fr' ? 'var(--purple-hot)' : 'var(--text-dim)' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {cells.map((date, i) => <PlannerCell key={i} date={date} />)}
        </div>
      </div>
    )
  }

  const isPpvEdit       = editForm?.show_type === 'ppv'
  const isExistingShow  = !!(selected && showMap[selected]?.id)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-strong)', textTransform: 'uppercase' }}>Schedule Planner</h2>
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.56rem', color: 'var(--text-dim)', letterSpacing: '0.12em', marginRight: '0.25rem' }}>YEAR</span>
          {PLAN_YEARS.map(y => (
            <button key={y} onClick={() => setYear(y)} style={{ padding: '0.3rem 0.6rem', fontFamily: 'var(--font-meta)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', background: year === y ? 'rgba(128,0,218,0.15)' : 'transparent', border: `1px solid ${year === y ? 'var(--purple)' : 'var(--border)'}`, color: year === y ? 'var(--purple-hot)' : 'var(--text-dim)' }}>{y}</button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Draft', color: 'rgba(128,0,218,0.4)', dashed: true },
          { label: 'Published', color: 'var(--purple-hot)', dashed: false },
          { label: 'Completed', color: '#00c864', dashed: false },
          { label: 'PPV', color: '#a855f7', dot: true },
          { label: 'Break', color: 'rgba(255,255,255,0.12)', dashed: false },
        ].map(({ label, color, dashed, dot }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {dot ? <span style={{ width: 9, height: 9, borderRadius: '50%', background: color }} />
                 : <span style={{ width: 14, height: 9, border: `${dashed ? '1px dashed' : '1px solid'} ${color}` }} />}
            <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.56rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>{label}</span>
          </div>
        ))}
        <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.56rem', color: 'var(--text-dim)', letterSpacing: '0.08em', marginLeft: 'auto' }}>Click any Friday to add or edit a show</span>
      </div>

      {loading ? (
        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: editForm ? '1fr 285px' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* 12-month calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
            {PLAN_MONTHS.map((_, monthIdx) => <PlannerMonthGrid key={monthIdx} month={monthIdx} />)}
          </div>

          {/* Edit panel */}
          {editForm && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', position: 'sticky', top: '1.5rem' }}>
              <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)' }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.52rem', color: 'var(--text-dim)', letterSpacing: '0.15em', fontWeight: 700 }}>
                    {isExistingShow ? 'EDIT SHOW' : 'NEW SHOW'}
                  </p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--text-strong)', textTransform: 'uppercase', marginTop: '0.1rem' }}>
                    {new Date((editForm.show_date) + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <button onClick={closePanel} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0 }}>✕</button>
              </div>

              <div style={{ padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {/* Type */}
                <div>
                  <label style={{ fontFamily: 'var(--font-meta)', fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-dim)', display: 'block', marginBottom: '0.3rem' }}>TYPE</label>
                  <select className="form-input form-select" value={editForm.show_type ?? 'weekly'} onChange={e => setEditForm(f => f ? { ...f, show_type: e.target.value } : f)} style={{ width: '100%', fontSize: '0.7rem', padding: '0.38rem 1.5rem 0.38rem 0.55rem' }}>
                    <option value="weekly">Weekly Show</option>
                    <option value="ppv">PPV Event</option>
                    <option value="special">Special Event</option>
                    <option value="skip">Skip / Break Week</option>
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label style={{ fontFamily: 'var(--font-meta)', fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-dim)', display: 'block', marginBottom: '0.3rem' }}>SHOW NAME</label>
                  <input className="form-input" value={editForm.name ?? ''} onChange={e => setEditForm(f => f ? { ...f, name: e.target.value } : f)} style={{ width: '100%', fontSize: '0.7rem', padding: '0.38rem 0.55rem', boxSizing: 'border-box' }} />
                </div>

                {/* PPV fields */}
                {isPpvEdit && (<>
                  <div>
                    <label style={{ fontFamily: 'var(--font-meta)', fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-dim)', display: 'block', marginBottom: '0.3rem' }}>PPV TITLE</label>
                    <input className="form-input" value={editForm.ppv_name ?? ''} onChange={e => setEditForm(f => f ? { ...f, ppv_name: e.target.value || null } : f)} placeholder="e.g. Fright Night" style={{ width: '100%', fontSize: '0.7rem', padding: '0.38rem 0.55rem', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-meta)', fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-dim)', display: 'block', marginBottom: '0.3rem' }}>ABBREVIATION (4–6 chars)</label>
                    <input className="form-input" value={editForm.ppv_abbr ?? ''} onChange={e => setEditForm(f => f ? { ...f, ppv_abbr: e.target.value.slice(0, 6).toUpperCase() || null } : f)} placeholder="e.g. FGHT" maxLength={6} style={{ width: '100%', fontSize: '0.7rem', padding: '0.38rem 0.55rem', boxSizing: 'border-box', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-meta)', fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-dim)', display: 'block', marginBottom: '0.3rem' }}>EVENT COLOR</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <input type="color" value={editForm.ppv_color ?? '#a855f7'} onChange={e => setEditForm(f => f ? { ...f, ppv_color: e.target.value } : f)} style={{ width: 40, height: 30, border: 'none', background: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.06em', flexShrink: 0 }}>{editForm.ppv_color ?? '#a855f7'}</span>
                      <span style={{ flex: 1, height: 22, background: editForm.ppv_color ?? '#a855f7', borderRadius: 2 }} />
                    </div>
                  </div>
                </>)}

                {/* Status */}
                <div>
                  <label style={{ fontFamily: 'var(--font-meta)', fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-dim)', display: 'block', marginBottom: '0.3rem' }}>STATUS</label>
                  <select className="form-input form-select" value={editForm.status ?? 'draft'} onChange={e => setEditForm(f => f ? { ...f, status: e.target.value } : f)} style={{ width: '100%', fontSize: '0.7rem', padding: '0.38rem 1.5rem 0.38rem 0.55rem' }}>
                    <option value="draft">Draft (admin only)</option>
                    <option value="committed">Published (public)</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border)' }}>
                  <button onClick={saveShow} disabled={saving} style={{ padding: '0.5rem 1rem', background: 'rgba(128,0,218,0.15)', border: '1px solid var(--purple-hot)', color: 'var(--purple-hot)', fontFamily: 'var(--font-meta)', fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.12em', cursor: 'pointer', width: '100%' }}>
                    {saving ? 'Saving…' : isExistingShow ? 'Save Changes' : 'Create Show'}
                  </button>
                  {isExistingShow && (
                    <button onClick={deleteShow} disabled={deleting} style={{ padding: '0.42rem 1rem', background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: 'rgba(239,68,68,0.8)', fontFamily: 'var(--font-meta)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', cursor: 'pointer', width: '100%' }}>
                      {deleting ? 'Deleting…' : 'Delete Show'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Story Development ───────────────────────────────── */

function StoryDevelopment() {
  const { user } = useAuth()
  const [notes, setNotes]           = useState<DBStoryNote[]>([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [wrestlers, setWrestlers]   = useState<{ id: string; name: string }[]>([])
  const [teams, setTeams]           = useState<{ id: string; name: string }[]>([])
  const [filterWrestler, setFilterWrestler] = useState('')
  const [filterTeam, setFilterTeam]         = useState('')

  const [noteType, setNoteType]     = useState(NOTE_TYPES[0])
  const [title, setTitle]           = useState('')
  const [body, setBody]             = useState('')
  const [tagWrestlers, setTagWrestlers] = useState<string[]>([])
  const [tagTeams, setTagTeams]         = useState<string[]>([])
  const [priority, setPriority]     = useState<'low' | 'normal' | 'high'>('normal')
  const [submitting, setSubmitting] = useState(false)

  const fetchNotes = useCallback(async () => {
    setLoadingNotes(true)
    const { data } = await supabase
      .from('story_notes')
      .select('*')
      .order('created_at', { ascending: false })
    if (!data) { setLoadingNotes(false); return }

    const authorIds = [...new Set(data.map((n) => n.created_by).filter(Boolean))] as string[]
    let profileMap: Record<string, string> = {}
    if (authorIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', authorIds)
      for (const p of profiles ?? []) { if (p.display_name) profileMap[p.id] = p.display_name }
    }

    setNotes(data.map((n) => ({ ...n, author_name: n.created_by ? (profileMap[n.created_by] ?? null) : null })))
    setLoadingNotes(false)
  }, [])

  useEffect(() => {
    fetchNotes()
    Promise.all([
      supabase.from('wrestlers').select('id, name').eq('status', 'hired').order('name'),
      supabase.from('teams').select('id, name').eq('active', true).order('name'),
    ]).then(([w, t]) => { setWrestlers(w.data ?? []); setTeams(t.data ?? []) })
  }, [fetchNotes])

  async function toggleResolved(note: DBStoryNote) {
    await supabase.from('story_notes').update({ resolved: !note.resolved }).eq('id', note.id)
    setNotes((prev) => prev.map((n) => n.id === note.id ? { ...n, resolved: !n.resolved } : n))
  }

  async function submitNote() {
    if (!body.trim()) return
    setSubmitting(true)
    const { data, error } = await supabase.from('story_notes').insert({
      note_type: noteType,
      title: title.trim() || noteType,
      body: body.trim(),
      wrestler_ids: tagWrestlers,
      team_ids: tagTeams,
      priority,
      created_by: user?.id ?? null,
    }).select('*').single()
    setSubmitting(false)
    if (!error && data) {
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', data.created_by ?? '').maybeSingle()
      setNotes((prev) => [{ ...data, author_name: profile?.display_name ?? null }, ...prev])
      setTitle(''); setBody(''); setTagWrestlers([]); setTagTeams([])
    }
  }

  const filteredNotes = notes.filter((n) => {
    if (filterWrestler && !n.wrestler_ids?.includes(filterWrestler)) return false
    if (filterTeam && !n.team_ids?.includes(filterTeam)) return false
    return true
  })

  const metaStyle: React.CSSProperties = { fontFamily: 'var(--font-meta)', fontSize: '0.6rem', letterSpacing: '0.12em' }
  const dimStyle: React.CSSProperties = { ...metaStyle, color: 'var(--text-dim)' }

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-strong)', textTransform: 'uppercase', marginBottom: '1.5rem' }}>Story Development</h2>

      {/* Add Note Form */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-strong)', textTransform: 'uppercase', marginBottom: '1rem' }}>New Story Note</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Note Type</label>
            <select className="form-input form-select" value={noteType} onChange={(e) => setNoteType(e.target.value)}>
              {NOTE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Priority</label>
            <select className="form-input form-select" value={priority} onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high')}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Title (optional)</label>
            <input className="form-input" placeholder="Short title…" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Tag Wrestlers</label>
            <select className="form-input form-select" value="" onChange={(e) => { if (e.target.value && !tagWrestlers.includes(e.target.value)) setTagWrestlers((p) => [...p, e.target.value]) }}>
              <option value="">+ Add wrestler…</option>
              {wrestlers.filter((w) => !tagWrestlers.includes(w.id)).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {tagWrestlers.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                {tagWrestlers.map((id) => {
                  const w = wrestlers.find((x) => x.id === id)
                  return w ? <span key={id} onClick={() => setTagWrestlers((p) => p.filter((x) => x !== id))} style={{ ...dimStyle, padding: '0.2rem 0.5rem', background: 'rgba(128,0,218,0.12)', border: '1px solid var(--purple)', cursor: 'pointer' }}>{w.name} ×</span> : null
                })}
              </div>
            )}
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Tag Factions</label>
            <select className="form-input form-select" value="" onChange={(e) => { if (e.target.value && !tagTeams.includes(e.target.value)) setTagTeams((p) => [...p, e.target.value]) }}>
              <option value="">+ Add faction…</option>
              {teams.filter((t) => !tagTeams.includes(t.id)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {tagTeams.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                {tagTeams.map((id) => {
                  const t = teams.find((x) => x.id === id)
                  return t ? <span key={id} onClick={() => setTagTeams((p) => p.filter((x) => x !== id))} style={{ ...dimStyle, padding: '0.2rem 0.5rem', background: 'rgba(128,0,218,0.12)', border: '1px solid var(--purple)', cursor: 'pointer' }}>{t.name} ×</span> : null
                })}
              </div>
            )}
          </div>
        </div>
        <div className="form-field" style={{ marginBottom: '0.75rem' }}>
          <label className="form-label">Note</label>
          <textarea className="form-input form-textarea" rows={3} placeholder="Describe the feud, arc, or idea…" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={submitNote} disabled={submitting || !body.trim()}>{submitting ? 'Saving…' : 'Add to Story Board'}</button>
      </div>

      {/* Filter Row */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <p style={{ ...metaStyle, color: 'var(--purple-hot)', fontWeight: 700, letterSpacing: '0.25em' }}>STORY BOARD</p>
        <select className="form-input form-select" style={{ width: 'auto', fontSize: '0.7rem', padding: '0.3rem 0.5rem' }} value={filterWrestler} onChange={(e) => setFilterWrestler(e.target.value)}>
          <option value="">All Wrestlers</option>
          {wrestlers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select className="form-input form-select" style={{ width: 'auto', fontSize: '0.7rem', padding: '0.3rem 0.5rem' }} value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
          <option value="">All Factions</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {(filterWrestler || filterTeam) && (
          <button onClick={() => { setFilterWrestler(''); setFilterTeam('') }} style={{ ...dimStyle, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕ Clear</button>
        )}
        <span style={{ ...dimStyle, marginLeft: 'auto' }}>{filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}</span>
      </div>

      {loadingNotes ? (
        <p style={dimStyle}>Loading…</p>
      ) : filteredNotes.length === 0 ? (
        <p style={dimStyle}>No story notes{filterWrestler || filterTeam ? ' matching this filter' : ' yet'}.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredNotes.map((n) => {
            const taggedWrestlerNames = (n.wrestler_ids ?? []).map((id) => wrestlers.find((w) => w.id === id)?.name).filter(Boolean)
            const taggedTeamNames = (n.team_ids ?? []).map((id) => teams.find((t) => t.id === id)?.name).filter(Boolean)
            const priorityColor = n.priority === 'high' ? 'var(--accent-red)' : n.priority === 'low' ? 'var(--text-dim)' : 'var(--purple)'
            return (
              <div key={n.id} style={{ padding: '0.85rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${priorityColor}`, opacity: n.resolved ? 0.55 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ ...metaStyle, color: 'var(--purple-hot)', fontWeight: 700 }}>{n.note_type.toUpperCase()}</span>
                    {n.title && n.title !== n.note_type && <span style={{ ...metaStyle, color: 'var(--text-strong)' }}>— {n.title}</span>}
                    {[...taggedWrestlerNames, ...taggedTeamNames].map((name) => (
                      <span key={name} style={{ ...dimStyle, padding: '0.1rem 0.4rem', background: 'rgba(128,0,218,0.1)', border: '1px solid var(--border)' }}>{name}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                    {n.author_name && <span style={dimStyle}>{n.author_name}</span>}
                    <span style={dimStyle}>{new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <button onClick={() => toggleResolved(n)} title={n.resolved ? 'Mark active' : 'Mark done / scrapped'} style={{ background: 'none', border: '1px solid var(--border)', color: n.resolved ? 'var(--text-dim)' : 'var(--purple-hot)', fontFamily: 'var(--font-meta)', fontSize: '0.58rem', padding: '0.2rem 0.5rem', cursor: 'pointer', letterSpacing: '0.08em' }}>
                      {n.resolved ? 'REOPEN' : 'DONE'}
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, textDecoration: n.resolved ? 'line-through' : 'none' }}>{n.body}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Story Suggestions (Admin) ───────────────────────── */

interface SuggestionRow { id: string; submitted_by: string | null; wrestler_id: string | null; team_id: string | null; body: string; status: string; created_at: string; submitter_name?: string | null; wrestler_name?: string | null; team_name?: string | null }

const suggMetaStyle: React.CSSProperties = { fontFamily: 'var(--font-meta)', fontSize: '0.6rem', letterSpacing: '0.12em' }
const suggDimStyle: React.CSSProperties  = { ...suggMetaStyle, color: 'var(--text-dim)' }

function SuggestionCard({ s, inDumpster, acting, onApprove, onReject, onRecall }: {
  s: SuggestionRow
  inDumpster?: boolean
  acting: string | null
  onApprove: (s: SuggestionRow) => void
  onReject: (s: SuggestionRow) => void
  onRecall: (s: SuggestionRow) => void
}) {
  const isApproved = s.status === 'approved'
  const isRejected = s.status === 'rejected'
  const bodyColor  = inDumpster ? (isApproved ? '#00c864' : 'var(--purple-hot)') : 'var(--text-muted)'
  const leftBorder = inDumpster ? (isApproved ? '#00c864' : 'var(--purple)') : 'var(--gold)'
  return (
    <div style={{ padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${leftBorder}`, opacity: inDumpster ? 0.82 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {s.submitter_name && <span style={{ ...suggMetaStyle, color: 'var(--gold)', fontWeight: 700 }}>{s.submitter_name}</span>}
          {s.wrestler_name && <span style={{ ...suggDimStyle, padding: '0.1rem 0.4rem', background: 'rgba(128,0,218,0.1)', border: '1px solid var(--border)' }}>{s.wrestler_name}</span>}
          {s.team_name && <span style={{ ...suggDimStyle, padding: '0.1rem 0.4rem', background: 'rgba(128,0,218,0.1)', border: '1px solid var(--border)' }}>{s.team_name}</span>}
          {inDumpster && (
            <span style={{ ...suggMetaStyle, fontWeight: 700, letterSpacing: '0.15em', color: isApproved ? '#00c864' : 'var(--purple-hot)', padding: '0.1rem 0.45rem', border: `1px solid ${isApproved ? '#00c864' : 'var(--purple)'}`, background: isApproved ? 'rgba(0,200,100,0.08)' : 'rgba(128,0,218,0.1)' }}>
              {isApproved ? '✓ APPROVED' : '✕ REJECTED'}
            </span>
          )}
        </div>
        <span style={suggDimStyle}>{new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
      <p style={{ fontSize: '0.85rem', color: bodyColor, lineHeight: 1.6, marginBottom: '0.75rem', textDecoration: inDumpster && isRejected ? 'line-through' : 'none' }}>{s.body}</p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {!inDumpster && (<>
          <button className="btn btn-primary" style={{ fontSize: '0.65rem', padding: '0.4rem 0.85rem' }} disabled={acting === s.id} onClick={() => onApprove(s)}>Approve → Story Board</button>
          <button className="btn" style={{ fontSize: '0.65rem', padding: '0.4rem 0.85rem', background: 'rgba(200,0,0,0.12)', border: '1px solid rgba(200,0,0,0.4)', color: 'var(--accent-red)' }} disabled={acting === s.id} onClick={() => onReject(s)}>Reject</button>
        </>)}
        {inDumpster && (
          <button className="btn" style={{ fontSize: '0.62rem', padding: '0.35rem 0.75rem', background: 'rgba(128,0,218,0.08)', border: '1px solid var(--border)', color: 'var(--text-dim)' }} disabled={acting === s.id} onClick={() => onRecall(s)}>
            {acting === s.id ? '…' : '↩ Recall to Queue'}
          </button>
        )}
      </div>
    </div>
  )
}

function StorySuggestions() {
  const [pending, setPending]           = useState<SuggestionRow[]>([])
  const [dumpster, setDumpster]         = useState<SuggestionRow[]>([])
  const [loading, setLoading]           = useState(true)
  const [acting, setActing]             = useState<string | null>(null)
  const [showDumpster, setShowDumpster] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('story_suggestions').select('*').order('created_at', { ascending: true })
    if (!data) { setLoading(false); return }

    const submitterIds = [...new Set(data.map((s) => s.submitted_by).filter(Boolean))] as string[]
    const wrestlerIds  = [...new Set(data.map((s) => s.wrestler_id).filter(Boolean))] as string[]
    const teamIds      = [...new Set(data.map((s) => s.team_id).filter(Boolean))] as string[]

    const [pRes, wRes, tRes] = await Promise.all([
      submitterIds.length ? supabase.from('profiles').select('id, display_name').in('id', submitterIds) : Promise.resolve({ data: [] }),
      wrestlerIds.length  ? supabase.from('wrestlers').select('id, name').in('id', wrestlerIds) : Promise.resolve({ data: [] }),
      teamIds.length      ? supabase.from('teams').select('id, name').in('id', teamIds)         : Promise.resolve({ data: [] }),
    ])

    const profileMap: Record<string, string> = {}
    for (const p of pRes.data ?? []) { if (p.display_name) profileMap[p.id] = p.display_name }
    const wrestlerMap: Record<string, string> = {}
    for (const w of wRes.data ?? []) { wrestlerMap[w.id] = w.name }
    const teamMap: Record<string, string> = {}
    for (const t of tRes.data ?? []) { teamMap[t.id] = t.name }

    const enriched = data.map((s) => ({
      ...s,
      submitter_name: s.submitted_by ? (profileMap[s.submitted_by] ?? null) : null,
      wrestler_name:  s.wrestler_id  ? (wrestlerMap[s.wrestler_id]  ?? null) : null,
      team_name:      s.team_id      ? (teamMap[s.team_id]          ?? null) : null,
    }))

    setPending(enriched.filter((s) => s.status === 'pending'))
    setDumpster(enriched.filter((s) => s.status !== 'pending').reverse())
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const approve = useCallback(async (s: SuggestionRow) => {
    setActing(s.id)
    // Optimistic: remove from pending, add to dumpster immediately
    setPending((prev) => prev.filter((x) => x.id !== s.id))
    setDumpster((prev) => [{ ...s, status: 'approved' }, ...prev])
    const subjectName = s.wrestler_name ?? s.team_name ?? 'Unknown'
    await supabase.from('story_notes').insert({
      note_type: 'Owner Suggestion',
      title: `Owner Suggestion — ${subjectName}`,
      body: s.body,
      wrestler_ids: s.wrestler_id ? [s.wrestler_id] : [],
      team_ids: s.team_id ? [s.team_id] : [],
      priority: 'normal',
    })
    await supabase.from('story_suggestions').update({ status: 'approved' }).eq('id', s.id)
    setActing(null)
  }, [])

  const reject = useCallback(async (s: SuggestionRow) => {
    setActing(s.id)
    // Optimistic: remove from pending, add to dumpster immediately
    setPending((prev) => prev.filter((x) => x.id !== s.id))
    setDumpster((prev) => [{ ...s, status: 'rejected' }, ...prev])
    await supabase.from('story_suggestions').update({ status: 'rejected' }).eq('id', s.id)
    setActing(null)
  }, [])

  const recall = useCallback(async (s: SuggestionRow) => {
    setActing(s.id)
    // Optimistic: remove from dumpster, put back in pending
    setDumpster((prev) => prev.filter((x) => x.id !== s.id))
    setPending((prev) => [...prev, { ...s, status: 'pending' }])
    await supabase.from('story_suggestions').update({ status: 'pending' }).eq('id', s.id)
    setActing(null)
  }, [])

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text-strong)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Fan Story Suggestions</h2>
      <p style={suggDimStyle}>Approved suggestions are added to Story Development as "Owner Suggestion" notes. Fans cannot see approval status.</p>

      {loading ? (
        <p style={{ ...suggDimStyle, marginTop: '1.5rem' }}>Loading…</p>
      ) : (<>
        {/* Pending queue */}
        <div style={{ marginTop: '1.5rem' }}>
          <p style={{ ...suggMetaStyle, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.2em', marginBottom: '0.75rem' }}>
            PENDING — {pending.length} suggestion{pending.length !== 1 ? 's' : ''}
          </p>
          {pending.length === 0 ? (
            <p style={suggDimStyle}>No pending suggestions.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pending.map((s) => <SuggestionCard key={s.id} s={s} acting={acting} onApprove={approve} onReject={reject} onRecall={recall} />)}
            </div>
          )}
        </div>

        {/* Dumpster */}
        {dumpster.length > 0 && (
          <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <button
              onClick={() => setShowDumpster((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: showDumpster ? '1rem' : 0 }}
            >
              <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                🗑 Dumpster
              </span>
              <span style={{ ...suggDimStyle, padding: '0.1rem 0.45rem', border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                {dumpster.length}
              </span>
              <span style={{ ...suggDimStyle, marginLeft: '0.25rem' }}>{showDumpster ? '▲ hide' : '▼ show'}</span>
            </button>

            {showDumpster && (
              <>
                <p style={{ ...suggDimStyle, marginBottom: '1rem' }}>
                  Approved shown in green · Rejected shown in purple with strikethrough · Recall sends a suggestion back to the pending queue.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {dumpster.map((s) => <SuggestionCard key={s.id} s={s} inDumpster acting={acting} onApprove={approve} onReject={reject} onRecall={recall} />)}
                </div>
              </>
            )}
          </div>
        )}
      </>)}
    </div>
  )
}

/* ── Story Notes Floating Window ────────────────────── */

function StoryNotesWindow({ onClose }: { onClose: () => void }) {
  const [pos, setPos]           = useState({ x: 40, y: 120 })
  const [dragging, setDragging] = useState(false)
  const offsetRef               = useRef({ x: 0, y: 0 })
  const [notes, setNotes]       = useState<DBStoryNote[]>([])

  useEffect(() => {
    supabase.from('story_notes').select('*').eq('resolved', false).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setNotes(data ?? []))
  }, [])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) { if (!dragging) return; setPos({ x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y }) }
    function onMouseUp() { setDragging(false) }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [dragging])

  function onMouseDown(e: React.MouseEvent) { offsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }; setDragging(true) }

  return (
    <div className="float-panel" style={{ left: pos.x, top: pos.y }}>
      <div className="float-panel-header" onMouseDown={onMouseDown}>
        <span>📋 Story Notes</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button>
      </div>
      <div className="float-panel-body">
        {notes.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.12em' }}>No active notes.</p>
        ) : notes.map((n) => (
          <div key={n.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.6rem', marginBottom: '0.6rem' }}>
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--purple-hot)', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '0.2rem' }}>{n.note_type.toUpperCase()}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{n.body}</p>
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

/* ── Legends ─────────────────────────────────────────── */

interface LegendRow { id: string; name: string; render_url: string | null; legend: boolean }

function LegendsSection() {
  const [rows, setRows]       = useState<LegendRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('wrestlers')
      .select('id, name, render_url, legend')
      .eq('active', true)
      .order('name')
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [])

  async function toggle(row: LegendRow) {
    setToggling(row.id)
    const { error } = await supabase.from('wrestlers').update({ legend: !row.legend }).eq('id', row.id)
    if (!error) setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, legend: !r.legend } : r))
    setToggling(null)
  }

  const filtered = rows.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()))
  const legends  = filtered.filter((r) => r.legend)
  const rest     = filtered.filter((r) => !r.legend)

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '1rem',
    padding: '0.65rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)',
  }

  function ToggleBtn({ row }: { row: LegendRow }) {
    const on = row.legend
    return (
      <button
        onClick={() => toggle(row)}
        disabled={toggling === row.id}
        style={{
          flexShrink: 0, padding: '0.35rem 0.9rem',
          fontFamily: 'var(--font-meta)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em',
          background: on ? 'rgba(192,192,208,0.12)' : 'rgba(128,0,218,0.12)',
          border: `1px solid ${on ? '#c0c0d0' : 'var(--purple)'}`,
          color: on ? '#c0c0d0' : 'var(--purple-hot)',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        {toggling === row.id ? '…' : on ? '★ Legend' : 'Mark Legend'}
      </button>
    )
  }

  return (
    <div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--text-strong)', textTransform:'uppercase', marginBottom:'0.5rem' }}>Legends</h2>
      <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.65rem', color:'var(--text-dim)', letterSpacing:'0.1em', marginBottom:'1.5rem' }}>
        Marked wrestlers show a ★ LEGEND badge on the roster and can be filtered separately.
      </p>

      <input
        className="form-input"
        placeholder="Search active roster…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 320, fontSize: '0.72rem', marginBottom: '1.5rem' }}
      />

      {loading ? (
        <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>Loading…</p>
      ) : (
        <>
          {legends.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'#c0c0d0', letterSpacing:'0.2em', fontWeight:700, marginBottom:'0.65rem' }}>★ CURRENT LEGENDS</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.35rem' }}>
                {legends.map((row) => (
                  <div key={row.id} style={{ ...rowStyle, borderColor: 'rgba(192,192,208,0.35)' }}>
                    {row.render_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={row.render_url} alt={row.name} style={{ width:32, height:40, objectFit:'cover', objectPosition:'top', flexShrink:0, border:'1px solid var(--border)' }} />
                      : <div style={{ width:32, height:40, background:'var(--surface-2)', flexShrink:0 }} />
                    }
                    <span style={{ flex:1, fontFamily:'var(--font-display)', fontSize:'1rem', color:'var(--text-strong)', textTransform:'uppercase' }}>{row.name}</span>
                    <ToggleBtn row={row} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <div>
              <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color:'var(--text-dim)', letterSpacing:'0.2em', fontWeight:700, marginBottom:'0.65rem' }}>ACTIVE ROSTER</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.35rem' }}>
                {rest.map((row) => (
                  <div key={row.id} style={rowStyle}>
                    {row.render_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={row.render_url} alt={row.name} style={{ width:32, height:40, objectFit:'cover', objectPosition:'top', flexShrink:0, border:'1px solid var(--border)' }} />
                      : <div style={{ width:32, height:40, background:'var(--surface-2)', flexShrink:0 }} />
                    }
                    <span style={{ flex:1, fontFamily:'var(--font-display)', fontSize:'1rem', color:'var(--text-strong)', textTransform:'uppercase' }}>{row.name}</span>
                    <ToggleBtn row={row} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Site Settings ───────────────────────────────────── */

function SiteSettings() {
  const [twitchChannel, setTwitchChannel] = useState('')
  const [titleImageUrl, setTitleImageUrl]   = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [imgFile, setImgFile]   = useState<File | null>(null)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [uploadErr, setUploadErr]   = useState<string | null>(null)

  useEffect(() => {
    supabase.from('site_settings').select('key, value').then(({ data }) => {
      const map = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]))
      setTwitchChannel(map.twitch_channel ?? 'daware')
      setTitleImageUrl(map.title_image_url ?? '')
      setImgPreview(map.title_image_url || null)
      setLoading(false)
    })
  }, [])

  async function save() {
    setSaving(true); setSaved(false)
    await Promise.all([
      supabase.from('site_settings').upsert({ key: 'twitch_channel',  value: twitchChannel }),
      supabase.from('site_settings').upsert({ key: 'title_image_url', value: titleImageUrl }),
    ])
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function uploadImage() {
    if (!imgFile) return
    setUploading(true); setUploadErr(null)
    const fd = new FormData()
    fd.append('file', imgFile)
    const res  = await fetch('/api/admin/upload-site-image', { method: 'POST', body: fd })
    const json = await res.json()
    if (json.publicUrl) {
      setTitleImageUrl(json.publicUrl)
      setImgPreview(json.publicUrl)
      setImgFile(null)
    } else {
      setUploadErr(json.error ?? 'Upload failed')
    }
    setUploading(false)
  }

  const label: React.CSSProperties = { fontFamily: 'var(--font-meta)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: '0.35rem' }
  const hint: React.CSSProperties  = { fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.06em', marginTop: '0.35rem' }

  return (
    <div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--text-strong)', textTransform:'uppercase', marginBottom:'1.5rem' }}>Site Settings</h2>
      {loading ? (
        <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.75rem', color:'var(--text-dim)', letterSpacing:'0.15em' }}>Loading…</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1.75rem', maxWidth:520 }}>

          {/* Twitch Channel */}
          <div>
            <span style={label}>Twitch Channel</span>
            <input
              className="form-input"
              value={twitchChannel}
              onChange={(e) => setTwitchChannel(e.target.value.trim())}
              placeholder="daware"
            />
            <p style={hint}>Controls the stream embed, Twitch link, and live-status detection in the top bar.</p>
          </div>

          {/* Title Image */}
          <div>
            <span style={label}>Title / Hero Image URL</span>
            <input
              className="form-input"
              value={titleImageUrl}
              onChange={(e) => setTitleImageUrl(e.target.value.trim())}
              placeholder="https://…"
              style={{ marginBottom: '0.75rem' }}
            />
            {imgPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgPreview} alt="Title image preview" style={{ display:'block', maxWidth:320, border:'1px solid var(--border)', marginBottom:'0.75rem' }} />
            )}
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
              <label style={{ fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', color:'var(--purple-hot)', border:'1px solid var(--purple)', padding:'0.45rem 0.9rem', cursor:'pointer' }}>
                Choose File
                <input type="file" accept="image/*" style={{ display:'none' }} onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) { setImgFile(f); setImgPreview(URL.createObjectURL(f)) }
                }} />
              </label>
              {imgFile && (
                <button onClick={uploadImage} disabled={uploading} style={{ fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.1em', padding:'0.45rem 0.9rem', background:'rgba(168,77,255,0.15)', border:'1px solid var(--purple-hot)', color:'var(--purple-hot)', cursor:'pointer' }}>
                  {uploading ? 'Uploading…' : '↑ Upload'}
                </button>
              )}
            </div>
            {uploadErr && <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.62rem', color:'var(--accent-red)', marginTop:'0.4rem' }}>{uploadErr}</p>}
            <p style={hint}>Displayed on the home page hero area. Upload or paste a direct URL.</p>
          </div>

          {/* Save */}
          <div>
            <button
              onClick={save}
              disabled={saving}
              style={{ fontFamily:'var(--font-meta)', fontSize:'0.7rem', fontWeight:700, letterSpacing:'0.12em', padding:'0.6rem 1.5rem', background: saved ? 'rgba(0,200,100,0.15)' : 'rgba(168,77,255,0.15)', border:`1px solid ${saved ? '#00c864' : 'var(--purple-hot)'}`, color: saved ? '#00c864' : 'var(--purple-hot)', cursor:'pointer', transition:'all 0.2s' }}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Admin Page ──────────────────────────────────────── */

export default function AdminDashboard() {
  const { isAdmin, isCreative, loading } = useAuth()
  const [section, setSection]    = useState<Section>('approvals')
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

  interface NavGroup { label?: string; items: { id: Section; label: string; badge?: number }[] }
  const NAV_GROUPS: NavGroup[] = [
    { items: [{ id: 'approvals', label: 'Pending Approvals', badge: approvalCount }] },
    { label: 'Show Management', items: [
      { id: 'booker',    label: 'Show Booker' },
      { id: 'results',   label: 'Results Entry' },
      { id: 'schedule',  label: 'Schedule Editor' },
    ]},
    { label: 'Roster & Factions', items: [
      { id: 'edits',     label: 'Roster Edits' },
      { id: 'factions',  label: 'Faction Edits' },
      { id: 'champions', label: 'Champions' },
      { id: 'legends',   label: 'Legends' },
      { id: 'ownership', label: 'Assign Ownership' },
    ]},
    { label: 'Images', items: [
      { id: 'images',      label: 'Roster Images' },
      { id: 'titleimages', label: 'Title Images' },
    ]},
    { label: 'Creative', items: [
      { id: 'story',       label: 'Story Development' },
      { id: 'suggestions', label: 'Fan Suggestions' },
    ]},
    ...(isAdmin ? [{ label: 'Administration', items: [{ id: 'accounts' as Section, label: 'Account Management' }] }] : []),
    ...(isAdmin ? [{ items: [{ id: 'settings' as Section, label: 'Site Settings' }] }] : []),
  ]

  return (
    <>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid var(--border)', marginBottom:'0.5rem' }}>
            <p style={{ fontFamily:'var(--font-meta)', fontSize:'0.6rem', color: isAdmin ? 'var(--gold)' : 'var(--purple-hot)', letterSpacing:'0.25em', fontWeight:700 }}>{isAdmin ? 'ADMIN PANEL' : 'CREATIVE TEAM'}</p>
            <p style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', color:'var(--text-strong)', textTransform:'uppercase', lineHeight:1.1, marginTop:'0.25rem' }}>Dashboard</p>
          </div>
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <div style={{ padding: gi === 0 ? '0.5rem 1.5rem 0.2rem' : '0.75rem 1.5rem 0.2rem', fontFamily:'var(--font-meta)', fontSize:'0.52rem', color:'var(--text-dim)', letterSpacing:'0.2em', fontWeight:700, borderTop: gi > 0 ? '1px solid var(--border)' : 'none' }}>
                  {group.label}
                </div>
              )}
              {group.items.map((s) => (
                <button key={s.id} onClick={() => setSection(s.id)} className={`admin-nav-item${section === s.id ? ' active' : ''}`}>
                  {s.label}
                  {s.badge !== undefined && s.badge > 0 && <span className="admin-badge">{s.badge}</span>}
                </button>
              ))}
            </div>
          ))}
          <div style={{ marginTop:'auto', padding:'1rem 1.5rem', borderTop:'1px solid var(--border)' }}>
            <button onClick={() => setShowNotes(!showNotes)} style={{ width:'100%', padding:'0.65rem', background:'rgba(128,0,218,0.15)', border:'1px solid var(--purple)', color:'var(--purple-hot)', fontFamily:'var(--font-meta)', fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.12em', cursor:'pointer' }}>📋 Story Notes</button>
            <Link href="/" className="admin-nav-item" style={{ marginTop:'0.5rem', display:'flex', borderLeft:'none', color:'var(--text-dim)' }}>← Back to Site</Link>
          </div>
        </aside>
        <main className="admin-content">
          {section === 'approvals'  && <PendingApprovals onCountChange={setApprovalCount} />}
          {section === 'booker'      && <ShowBooker />}
          {section === 'results'     && <ResultsEntry />}
          {section === 'schedule'    && <ScheduleEditor />}
          {section === 'champions'   && <ChampionsSection />}
          {section === 'ownership'   && <OwnershipSection />}
          {section === 'images'      && <RosterImages />}
          {section === 'titleimages' && <TitleImages />}
          {section === 'edits'       && <RosterEdits />}
          {section === 'factions'    && <FactionEdits />}
          {section === 'legends'     && <LegendsSection />}
          {section === 'story'       && <StoryDevelopment />}
          {section === 'suggestions' && <StorySuggestions />}
          {section === 'accounts'    && isAdmin && <AccountManagement />}
          {section === 'settings'    && isAdmin && <SiteSettings />}
        </main>
      </div>
      {showNotes && <StoryNotesWindow onClose={() => setShowNotes(false)} />}
    </>
  )
}
