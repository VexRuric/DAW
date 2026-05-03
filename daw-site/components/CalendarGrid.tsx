'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getPPVsForYear, getPPVForDate, getPPVForMonth, PPVEvent } from '@/lib/ppv-data'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa']
const YEARS  = [2022, 2023, 2024, 2025, 2026]

function isFriday(date: Date) { return date.getDay() === 5 }

function getFridaysInMonth(year: number, month: number): Date[] {
  const fridays: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1)
  while (d.getMonth() === month) {
    fridays.push(new Date(d))
    d.setDate(d.getDate() + 7)
  }
  return fridays
}

function getLastFriday(year: number, month: number): Date {
  const fridays = getFridaysInMonth(year, month)
  return fridays[fridays.length - 1]
}

function toDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    let videoId = ''
    if (u.hostname.includes('youtu.be')) {
      videoId = u.pathname.slice(1).split('?')[0]
    } else if (u.hostname.includes('youtube.com')) {
      videoId = u.searchParams.get('v') ?? u.pathname.replace('/embed/', '')
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null
  } catch {
    return null
  }
}

interface ShowStub {
  id: string
  name: string
  show_date: string
  show_type: string
  ppv_name: string | null
  stream_url: string | null
  status: string
}

interface MatchParticipant {
  name: string
  result: string | null
}

interface MatchCard {
  id: string
  match_number: number
  match_type: string
  stipulation: string | null
  is_title_match: boolean
  is_draw: boolean
  rating: number | null
  participants: MatchParticipant[]
  title_name: string | null
}

/* ── Modal ─────────────────────────────────────────── */

function ShowModal({ show, onClose }: { show: ShowStub; onClose: () => void }) {
  const [matches, setMatches] = useState<MatchCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMatches() {
      const { data } = await supabase
        .from('matches')
        .select(`
          id, match_number, match_type, stipulation, is_title_match, is_draw, rating,
          titles:title_id(name),
          match_participants(result, write_in_name, wrestlers(name), teams(name))
        `)
        .eq('show_id', show.id)
        .order('match_number')

      const cards: MatchCard[] = (data ?? []).map((m: any) => ({
        id:             m.id,
        match_number:   m.match_number,
        match_type:     m.match_type,
        stipulation:    m.stipulation,
        is_title_match: m.is_title_match,
        is_draw:        m.is_draw,
        rating:         m.rating,
        title_name:     m.titles?.name ?? null,
        participants:   (m.match_participants ?? []).map((mp: any) => ({
          name:   mp.write_in_name ?? mp.wrestlers?.name ?? mp.teams?.name ?? 'Unknown',
          result: mp.result,
        })),
      }))
      setMatches(cards)
      setLoading(false)
    }
    fetchMatches()
  }, [show.id])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const embedUrl = show.stream_url ? getYouTubeEmbedUrl(show.stream_url) : null
  const isCompleted = show.status === 'completed'
  const showDateFormatted = new Date(show.show_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: show.show_type === 'ppv' ? 'var(--gold)' : 'var(--purple-hot)', letterSpacing: '0.25em', fontWeight: 700, marginBottom: '0.3rem' }}>
                {show.show_type === 'ppv' ? '★ PPV EVENT' : 'WEEKLY SHOW'}
              </p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 0.95, marginBottom: '0.4rem' }}>
                {show.ppv_name ?? show.name}
              </h2>
              <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.12em' }}>
                {showDateFormatted}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'none', flexShrink: 0, fontSize: '1rem', transition: 'border-color 0.15s, color 0.15s' }}
              onMouseEnter={(e) => { const el = e.currentTarget; el.style.borderColor = 'var(--accent-red)'; el.style.color = 'var(--accent-red)' }}
              onMouseLeave={(e) => { const el = e.currentTarget; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text-dim)' }}
            >
              ✕
            </button>
          </div>

          {/* Status badge */}
          <div style={{ marginTop: '0.75rem' }}>
            <span style={{
              fontFamily: 'var(--font-meta)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.15em',
              padding: '0.2rem 0.6rem',
              background: isCompleted ? 'rgba(0,200,100,0.12)' : 'rgba(128,0,218,0.12)',
              color: isCompleted ? '#00c864' : 'var(--purple-hot)',
              border: `1px solid ${isCompleted ? '#00c864' : 'var(--purple)'}`,
            }}>
              {isCompleted ? '✓ COMPLETED' : 'UPCOMING'}
            </span>
          </div>
        </div>

        {/* YouTube embed */}
        {embedUrl && (
          <div style={{ padding: '1.25rem 1.5rem 0' }}>
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.2em', fontWeight: 700, marginBottom: '0.6rem' }}>
              ▶ WATCH
            </p>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', background: '#000' }}>
              <iframe
                src={embedUrl}
                title={show.ppv_name ?? show.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>
        )}

        {/* Matchcard */}
        <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--purple-hot)', letterSpacing: '0.25em', fontWeight: 700, marginBottom: '1rem' }}>
            MATCH CARD
          </p>

          {loading ? (
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.12em' }}>Loading matchcard…</p>
          ) : matches.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.12em' }}>No matches recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {matches.map((match, idx) => {
                const isMain = idx === matches.length - 1
                return (
                  <div
                    key={match.id}
                    style={{
                      padding: '0.85rem 1rem',
                      background: 'var(--surface-2)',
                      border: `1px solid ${isMain ? 'var(--gold)' : 'var(--border)'}`,
                      borderLeft: `3px solid ${isMain ? 'var(--gold)' : 'var(--border)'}`,
                    }}
                  >
                    {/* Match header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: isMain ? 'var(--gold)' : 'var(--text-dim)', letterSpacing: '0.15em', fontWeight: 700 }}>
                          {isMain ? '★ MAIN EVENT' : `MATCH ${match.match_number}`}
                        </span>
                        {match.is_title_match && match.title_name && (
                          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.5rem', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '1px 5px', letterSpacing: '0.1em', fontWeight: 700 }}>
                            🏆 {match.title_name}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--purple-hot)', letterSpacing: '0.1em' }}>
                          {match.match_type}{match.stipulation ? ` · ${match.stipulation}` : ''}
                        </span>
                        {match.rating != null && (
                          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.08em' }}>
                            ★ {match.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Participants */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {match.participants.map((p, i) => {
                        const isWinner = p.result === 'winner'
                        const isDraw   = match.is_draw
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {i > 0 && (
                              <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)' }}>vs</span>
                            )}
                            <span style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: '0.95rem',
                              textTransform: 'uppercase',
                              color: isDraw ? 'var(--text-muted)' : isWinner ? '#00c864' : isCompleted ? 'var(--text-dim)' : 'var(--text-muted)',
                              fontWeight: isWinner ? 700 : 400,
                            }}>
                              {isWinner && isCompleted && '✓ '}{p.name}
                            </span>
                          </div>
                        )
                      })}
                      {match.is_draw && isCompleted && (
                        <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: '#f59e0b', border: '1px solid #f59e0b', padding: '1px 6px', letterSpacing: '0.1em', fontWeight: 700 }}>
                          DRAW
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Calendar cell ─────────────────────────────────── */

function CalendarCell({
  date, year, ppvMap, today, showMap, onShowClick,
}: {
  date: Date | null
  year: number
  ppvMap: Record<string, PPVEvent>
  today: Date
  showMap: Record<string, ShowStub>
  onShowClick: (show: ShowStub) => void
}) {
  if (!date) return <div style={{ aspectRatio: '1', minHeight: 36 }} />

  const dateStr     = toDateStr(date)
  const isPast      = date < today && dateStr !== toDateStr(today)
  const isToday     = dateStr === toDateStr(today)
  const isFri       = isFriday(date)
  const ppv         = ppvMap[dateStr]
  const lastFri     = isFri ? toDateStr(getLastFriday(year, date.getMonth())) === dateStr : false
  const hasPPV      = !!ppv && lastFri
  const dbShow      = showMap[dateStr]
  const isCompleted = dbShow?.status === 'completed'
  const isClickable = (isFri || hasPPV) && !!dbShow

  const bgColor = hasPPV ? ppv.color : (isPast && isCompleted ? 'rgba(0,200,100,0.05)' : undefined)

  return (
    <div
      onClick={() => { if (isClickable) onShowClick(dbShow!) }}
      style={{
        aspectRatio: '1',
        minHeight: 36,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        backgroundColor: bgColor,
        borderBottom: isFri && !hasPPV ? `2px solid ${isCompleted ? 'rgba(0,200,100,0.4)' : 'var(--purple)'}` : undefined,
        outline: isToday ? '2px solid var(--purple-hot)' : undefined,
        outlineOffset: -2,
        // only fade past dates that have no show data at all
        opacity: isPast && !hasPPV && !dbShow ? 0.35 : 1,
        cursor: isClickable ? 'none' : 'default',
        transition: 'filter 0.15s',
      }}
      onMouseEnter={(e) => { if (isClickable) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.35)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = '' }}
      title={dbShow ? (dbShow.ppv_name ?? dbShow.name) : undefined}
    >
      <span style={{
        fontFamily: 'var(--font-meta)',
        fontSize: '0.62rem',
        fontWeight: isToday ? 700 : 400,
        color: hasPPV ? '#fff' : isFri ? (isCompleted ? '#00c864' : 'var(--purple-hot)') : 'var(--text-dim)',
        letterSpacing: '0.05em',
        lineHeight: 1,
      }}>
        {date.getDate()}
      </span>

      {isFri && !hasPPV && (
        <span style={{
          fontFamily: 'var(--font-meta)',
          fontSize: '0.42rem',
          fontWeight: 700,
          letterSpacing: '0.15em',
          color: isCompleted ? '#00c864' : dbShow ? 'var(--purple-hot)' : 'var(--text-dim)',
          marginTop: '1px',
        }}>
          {isCompleted ? '✓' : dbShow ? 'DAW' : ''}
        </span>
      )}
      {hasPPV && (
        <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.4rem', fontWeight: 700, letterSpacing: '0.08em', color: '#fff', marginTop: '1px', textAlign: 'center' }}>
          {ppv.abbr}
        </span>
      )}
    </div>
  )
}

/* ── Month grid ────────────────────────────────────── */

function MonthGrid({ year, month, ppvMap, today, showMap, onShowClick }: {
  year: number; month: number; ppvMap: Record<string, PPVEvent>; today: Date
  showMap: Record<string, ShowStub>; onShowClick: (show: ShowStub) => void
}) {
  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const ppv         = getPPVForMonth(year, month)

  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Month header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
          {MONTHS[month]}
        </span>
        {ppv && (
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', padding: '0.25rem 0.6rem', background: ppv.color, color: '#fff' }}>
            {ppv.name}
          </span>
        )}
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
        {DAYS.map((d) => (
          <div key={d} style={{ textAlign: 'center', padding: '0.3rem 0', fontFamily: 'var(--font-meta)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', color: d === 'Fr' ? 'var(--purple-hot)' : 'var(--text-dim)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((date, i) => (
          <CalendarCell key={i} date={date} year={year} ppvMap={ppvMap} today={today} showMap={showMap} onShowClick={onShowClick} />
        ))}
      </div>
    </div>
  )
}

/* ── Sidebar show row ──────────────────────────────── */

function SidebarShowRow({
  show,
  ppv,
  dateLabel,
  onShowClick,
  dimmed,
}: {
  show: ShowStub | null
  ppv: PPVEvent | null
  dateLabel: string
  onShowClick: (s: ShowStub) => void
  dimmed?: boolean
}) {
  const isCompleted = show?.status === 'completed'
  return (
    <div
      onClick={() => { if (show) onShowClick(show) }}
      className={`show-row${ppv ? ' ppv' : ''}`}
      style={{
        cursor: show ? 'none' : 'default',
        opacity: dimmed ? 0.55 : 1,
        ...(ppv ? { borderLeftColor: ppv.color } : {}),
      }}
      onMouseEnter={(e) => { if (show) (e.currentTarget as HTMLElement).style.borderLeftColor = isCompleted ? '#00c864' : 'var(--purple-hot)' }}
      onMouseLeave={(e) => { if (show) (e.currentTarget as HTMLElement).style.borderLeftColor = ppv ? ppv.color : 'var(--border)' }}
    >
      {ppv && (
        <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em', padding: '0.2rem 0.5rem', background: ppv.color, color: '#fff', flexShrink: 0 }}>
          PPV
        </span>
      )}
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1 }}>
          {show?.ppv_name ?? show?.name ?? (ppv ? ppv.name : 'DAW Weekly')}
        </p>
        <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginTop: '0.15rem' }}>
          {dateLabel}
        </p>
      </div>
      {show && (
        <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.48rem', color: isCompleted ? '#00c864' : 'var(--purple-hot)', letterSpacing: '0.1em', flexShrink: 0 }}>
          {isCompleted ? '✓ RESULTS' : 'VIEW ›'}
        </span>
      )}
    </div>
  )
}

/* ── Main calendar component ───────────────────────── */

export default function ScheduleClient({ initialYear }: { initialYear: number }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [year, setYear]         = useState(initialYear)
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [showMap, setShowMap]   = useState<Record<string, ShowStub>>({})
  const [recentShows, setRecentShows] = useState<ShowStub[]>([])
  const [activeModal, setActiveModal] = useState<ShowStub | null>(null)
  const [sidebarTab, setSidebarTab]   = useState<'upcoming' | 'recent'>('upcoming')
  const [storedColors, setStoredColors] = useState<Record<string, string>>({})

  const ppvList = getPPVsForYear(year)
  const ppvMap: Record<string, PPVEvent> = {}
  ppvList.forEach((p) => { ppvMap[p.date] = p })

  const effectivePpvList = ppvList.map(p => storedColors[p.name] ? { ...p, color: storedColors[p.name] } : p)
  const effectivePpvMap: Record<string, PPVEvent> = {}
  effectivePpvList.forEach(p => { effectivePpvMap[p.date] = p })

  // Shows for selected year (calendar)
  useEffect(() => {
    async function load() {
      const start = `${year}-01-01`
      const end   = `${year}-12-31`
      const { data } = await supabase
        .from('shows')
        .select('id, name, show_date, show_type, ppv_name, stream_url, status')
        .gte('show_date', start)
        .lte('show_date', end)
        .in('status', ['committed', 'completed'])
      const map: Record<string, ShowStub> = {}
      ;(data ?? []).forEach((s: any) => { map[s.show_date] = s })
      setShowMap(map)
    }
    load()
  }, [year])

  // Recent completed shows (sidebar — independent of year)
  useEffect(() => {
    async function loadRecent() {
      const todayStr = toDateStr(today)
      const { data } = await supabase
        .from('shows')
        .select('id, name, show_date, show_type, ppv_name, stream_url, status')
        .eq('status', 'completed')
        .lt('show_date', todayStr)
        .order('show_date', { ascending: false })
        .limit(12)
      setRecentShows(data ?? [])
    }
    loadRecent()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // PPV color overrides from site_settings (set in admin Schedule Editor)
  useEffect(() => {
    supabase.from('site_settings').select('value').eq('key', 'ppv_colors').maybeSingle()
      .then(({ data }) => {
        if (data?.value) try { setStoredColors(JSON.parse(data.value)) } catch { /* */ }
      })
  }, [])

  const closeModal = useCallback(() => setActiveModal(null), [])

  // Upcoming shows (next 8 Fridays)
  const upcomingShows: { date: Date; show: ShowStub | null; ppv: PPVEvent | null }[] = []
  const cursor = new Date(today)
  while (cursor.getDay() !== 5) cursor.setDate(cursor.getDate() + 1)
  for (let i = 0; i < 8; i++) {
    const ds = toDateStr(cursor)
    upcomingShows.push({ date: new Date(cursor), show: showMap[ds] ?? null, ppv: getPPVForDate(ds, cursor.getFullYear()) })
    cursor.setDate(cursor.getDate() + 7)
  }

  const ppvCount = effectivePpvList.length

  const tabBtn = (id: 'upcoming' | 'recent', label: string) => (
    <button
      onClick={() => setSidebarTab(id)}
      style={{
        fontFamily: 'var(--font-meta)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', background: 'transparent', border: 'none',
        borderBottom: sidebarTab === id ? '2px solid var(--purple-hot)' : '2px solid transparent',
        color: sidebarTab === id ? 'var(--purple-hot)' : 'var(--text-dim)',
        paddingBottom: '0.4rem', cursor: 'none', transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )

  const selectStyle: React.CSSProperties = {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    color: 'var(--text-strong)',
    fontFamily: 'var(--font-meta)',
    fontSize: '0.75rem',
    letterSpacing: '0.08em',
    padding: '0.5rem 0.75rem',
    outline: 'none',
    cursor: 'pointer',
    flex: 1,
  }

  const sharedSidebar = (
    <>
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {tabBtn('upcoming', 'Upcoming')}
        {tabBtn('recent', 'Recent Results')}
      </div>
      {sidebarTab === 'upcoming' ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {upcomingShows.map(({ date, show, ppv }, i) => (
              <SidebarShowRow key={i} show={show} ppv={ppv} dateLabel={date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} onShowClick={setActiveModal} />
            ))}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text-strong)', textTransform: 'uppercase', margin: '2rem 0 1rem' }}>{year} PPVs</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {effectivePpvList.map((ppv) => {
              const ppvShow = showMap[ppv.date]
              return (
                <div key={ppv.name} onClick={() => { if (ppvShow) setActiveModal(ppvShow) }} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderLeft: `3px solid ${ppv.color}`, cursor: ppvShow ? 'none' : 'default', transition: 'filter 0.15s' }} onMouseEnter={(e) => { if (ppvShow) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.25)' }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = '' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', color: 'var(--text-strong)', fontWeight: 700, letterSpacing: '0.08em' }}>{ppv.name}</p>
                    <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.08em', marginTop: '0.1rem' }}>{new Date(ppv.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
                  </div>
                  {ppvShow?.status === 'completed' ? <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.48rem', color: '#00c864', letterSpacing: '0.1em', flexShrink: 0 }}>✓ RESULTS</span> : <span style={{ width: 10, height: 10, borderRadius: '50%', background: ppv.color, flexShrink: 0 }} />}
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {recentShows.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>No completed shows yet.</p>
          ) : (
            recentShows.map((show) => {
              const d = new Date(show.show_date + 'T00:00:00')
              const ppv = getPPVForDate(show.show_date, d.getFullYear())
              return <SidebarShowRow key={show.id} show={show} ppv={ppv ?? null} dateLabel={d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} onShowClick={setActiveModal} />
            })
          )}
        </div>
      )}
    </>
  )

  return (
    <div>
      {/* Page header */}
      <div className="section-sm" style={{ borderTop: 'none', paddingBottom: '1.5rem' }}>
        <p className="section-label">DAW Warehouse LIVE</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 className="section-title">Show Schedule</h1>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end', textAlign: 'right' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--purple-hot)', lineHeight: 1 }}>52</div>
              <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>Weekly Shows</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--gold)', lineHeight: 1 }}>{ppvCount}</div>
              <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>PPV Events</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP: year tabs + 12-month grid + sidebar ── */}
      <div className="schedule-desktop">
        <div style={{ padding: '0 3rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-3)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
            {[...YEARS].reverse().map((y) => (
              <button key={y} onClick={() => setYear(y)} style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: year === y ? 'white' : 'var(--text-dim)', background: 'transparent', border: 'none', borderBottom: year === y ? '2px solid var(--purple-hot)' : '2px solid transparent', paddingBottom: '0.4rem', cursor: 'none', transition: 'all 0.15s' }}>
                {y}
              </button>
            ))}
          </div>
        </div>
        {effectivePpvList.length > 0 && (
          <div style={{ padding: '0 3rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.2rem', textTransform: 'uppercase', marginRight: '1rem' }}>PPV EVENTS</span>
            {effectivePpvList.map((ppv) => (
              <span key={ppv.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-display)', fontSize: '0.65rem', letterSpacing: '0.05em', padding: '0.25rem 0.6rem', border: `1px solid ${ppv.color}`, color: ppv.color, textTransform: 'uppercase' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: ppv.color, display: 'inline-block' }} />{ppv.name}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 0, borderTop: '1px solid var(--border)' }}>
          <div style={{ padding: '2rem 3rem', borderRight: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {MONTHS.map((_, monthIdx) => (
                <MonthGrid key={monthIdx} year={year} month={monthIdx} ppvMap={effectivePpvMap} today={today} showMap={showMap} onShowClick={setActiveModal} />
              ))}
            </div>
          </div>
          <div style={{ padding: '2rem' }}>{sharedSidebar}</div>
        </div>
      </div>

      {/* ── MOBILE: month/year pickers + single month + shows ── */}
      <div className="schedule-mobile" style={{ padding: '1rem clamp(1.25rem,4vw,2rem) 2rem' }}>
        {/* Pickers */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <select value={viewMonth} onChange={e => setViewMonth(Number(e.target.value))} style={selectStyle}>
            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={selectStyle}>
            {[...YEARS].reverse().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Single month calendar */}
        <MonthGrid year={year} month={viewMonth} ppvMap={effectivePpvMap} today={today} showMap={showMap} onShowClick={setActiveModal} />

        {/* Upcoming / recent below calendar */}
        <div style={{ marginTop: '1.5rem' }}>{sharedSidebar}</div>
      </div>

      {/* Show modal */}
      {activeModal && <ShowModal show={activeModal} onClose={closeModal} />}
    </div>
  )
}
