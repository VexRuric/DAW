'use client'

import { useState, useEffect, useRef } from 'react'
import { getPPVsForYear, getPPVForDate, getPPVForMonth, PPVEvent } from '@/lib/ppv-data'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa']
const YEARS  = [2022, 2023, 2024, 2025, 2026]

function isFriday(date: Date) { return date.getDay() === 5 }

// Returns all Fridays in a given year/month
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

// Returns last Friday of a month
function getLastFriday(year: number, month: number): Date {
  const fridays = getFridaysInMonth(year, month)
  return fridays[fridays.length - 1]
}

function toDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

interface CalendarCellProps {
  date: Date | null
  year: number
  ppvMap: Record<string, PPVEvent>
  today: Date
}

function CalendarCell({ date, year, ppvMap, today }: CalendarCellProps) {
  const ref = useRef<HTMLDivElement>(null)

  if (!date) {
    return <div style={{ aspectRatio: '1', minHeight: 36 }} />
  }

  const dateStr    = toDateStr(date)
  const isPast     = date < today && toDateStr(date) !== toDateStr(today)
  const isToday    = toDateStr(date) === toDateStr(today)
  const isFri      = isFriday(date)
  const ppv        = ppvMap[dateStr]
  const lastFri    = isFri ? toDateStr(getLastFriday(year, date.getMonth())) === dateStr : false

  const bgColor = ppv ? ppv.color : undefined
  const hasPPV  = !!ppv && lastFri

  return (
    <div
      className={hasPPV ? 'has-tooltip' : ''}
      ref={ref}
      style={{
        aspectRatio: '1',
        minHeight: 36,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        backgroundColor: hasPPV ? bgColor : undefined,
        borderBottom: isFri && !hasPPV ? '2px solid var(--purple)' : undefined,
        outline: isToday ? '2px solid var(--purple-hot)' : undefined,
        outlineOffset: -2,
        opacity: isPast && !hasPPV ? 0.38 : 1,
        transition: 'transform 0.15s',
        cursor: (isFri || hasPPV) ? 'none' : 'default',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-meta)',
          fontSize: '0.62rem',
          fontWeight: isToday ? 700 : 400,
          color: hasPPV ? '#fff' : isFri ? 'var(--purple-hot)' : 'var(--text-dim)',
          letterSpacing: '0.05em',
          lineHeight: 1,
        }}
      >
        {date.getDate()}
      </span>
      {isFri && !hasPPV && (
        <span
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: '0.42rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: 'var(--purple-hot)',
            marginTop: '1px',
          }}
        >
          DAW
        </span>
      )}
      {hasPPV && (
        <span
          style={{
            fontFamily: 'var(--font-meta)',
            fontSize: '0.4rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#fff',
            marginTop: '1px',
            textAlign: 'center',
          }}
        >
          {ppv.abbr}
        </span>
      )}
      {hasPPV && (
        <div className="tooltip">
          {ppv.name} · {new Date(ppv.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      )}
    </div>
  )
}

function MonthGrid({ year, month, ppvMap, today }: { year: number; month: number; ppvMap: Record<string, PPVEvent>; today: Date }) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const ppv = getPPVForMonth(year, month)

  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      {/* Month header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.1rem',
            color: 'var(--text-strong)',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          }}
        >
          {MONTHS[month]}
        </span>
        {ppv && (
          <span
            style={{
              fontFamily: 'var(--font-meta)',
              fontSize: '0.58rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              padding: '0.25rem 0.6rem',
              background: ppv.color,
              color: '#fff',
            }}
          >
            {ppv.name}
          </span>
        )}
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
        {DAYS.map((d) => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              padding: '0.3rem 0',
              fontFamily: 'var(--font-meta)',
              fontSize: '0.55rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: d === 'Fr' ? 'var(--purple-hot)' : 'var(--text-dim)',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((date, i) => (
          <CalendarCell key={i} date={date} year={year} ppvMap={ppvMap} today={today} />
        ))}
      </div>
    </div>
  )
}

export default function ScheduleClient({ initialYear }: { initialYear: number }) {
  const [year, setYear] = useState(initialYear)
  const today = new Date()
  today.setHours(0,0,0,0)

  const ppvList = getPPVsForYear(year)

  // Build a date-indexed map for fast lookup
  const ppvMap: Record<string, PPVEvent> = {}
  ppvList.forEach((p) => { ppvMap[p.date] = p })

  // Generate upcoming shows (next 8 Fridays from today across any year)
  const upcomingShows: { date: Date; ppv: PPVEvent | null }[] = []
  const cursor = new Date(today)
  // advance to next Friday
  while (cursor.getDay() !== 5) cursor.setDate(cursor.getDate() + 1)
  for (let i = 0; i < 8; i++) {
    const ds = toDateStr(cursor)
    const ppvForDate = getPPVForDate(ds, cursor.getFullYear())
    upcomingShows.push({ date: new Date(cursor), ppv: ppvForDate })
    cursor.setDate(cursor.getDate() + 7)
  }

  const weekShows  = ppvList.filter((p) => !p.abbr).length // all are PPVs in our data
  const ppvCount   = ppvList.length

  return (
    <div>
      {/* Page header */}
      <div className="section-sm" style={{ borderTop: 'none', paddingBottom: '1.5rem' }}>
        <p className="section-label">DAW Warehouse LIVE</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 className="section-title">Show Schedule</h1>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end', textAlign: 'right' }}>
            <div>
              <div
                style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--purple-hot)', lineHeight: 1 }}
              >
                {52}
              </div>
              <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>
                Weekly Shows
              </div>
            </div>
            <div>
              <div
                style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--gold)', lineHeight: 1 }}
              >
                {ppvCount}
              </div>
              <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>
                PPV Events
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Year tabs */}
      <div style={{ padding: '0 3rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-3)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
          {[...YEARS].reverse().map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.3rem',
                color: year === y ? 'white' : 'var(--text-dim)',
                background: 'transparent',
                border: 'none',
                borderBottom: year === y ? '2px solid var(--purple-hot)' : '2px solid transparent',
                paddingBottom: '0.4rem',
                cursor: 'none',
                transition: 'all 0.15s',
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* PPV Legend bar */}
      {ppvList.length > 0 && (
        <div
          style={{
            padding: '0 3rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.2rem', textTransform: 'uppercase', marginRight: '1rem' }}>
            PPV EVENTS
          </span>
          {ppvList.map((ppv) => (
            <span
              key={ppv.name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontFamily: 'var(--font-display)',
                fontSize: '0.65rem',
                letterSpacing: '0.05em',
                padding: '0.25rem 0.6rem',
                border: `1px solid ${ppv.color}`,
                color: ppv.color,
                textTransform: 'uppercase'
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: ppv.color,
                  display: 'inline-block',
                }}
              />
              {ppv.name}
            </span>
          ))}
        </div>
      )}

      {/* Main grid + upcoming sidebar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: 0,
          borderTop: '1px solid var(--border)',
        }}
      >
        {/* 12-month calendar */}
        <div
          style={{
            padding: '2rem 3rem',
            borderRight: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem',
            }}
          >
            {MONTHS.map((_, monthIdx) => (
              <MonthGrid
                key={monthIdx}
                year={year}
                month={monthIdx}
                ppvMap={ppvMap}
                today={today}
              />
            ))}
          </div>
        </div>

        {/* Upcoming shows sidebar */}
        <div style={{ padding: '2rem' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              color: 'var(--text-strong)',
              textTransform: 'uppercase',
              marginBottom: '1.25rem',
            }}
          >
            Upcoming
          </h2>

          {upcomingShows.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
              No upcoming shows scheduled.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {upcomingShows.map(({ date, ppv }, i) => (
                <div
                  key={i}
                  className={`show-row${ppv ? ' ppv' : ''}`}
                  style={ppv ? { borderLeftColor: ppv.color } : {}}
                >
                  {ppv && (
                    <span
                      style={{
                        fontFamily: 'var(--font-meta)',
                        fontSize: '0.55rem',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        padding: '0.2rem 0.5rem',
                        background: ppv.color,
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      PPV
                    </span>
                  )}
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.95rem',
                        color: 'var(--text-strong)',
                        textTransform: 'uppercase',
                        lineHeight: 1.1,
                      }}
                    >
                      {ppv ? ppv.name : `DAW Weekly`}
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-meta)',
                        fontSize: '0.6rem',
                        color: 'var(--text-dim)',
                        letterSpacing: '0.1em',
                        marginTop: '0.15rem',
                      }}
                    >
                      {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PPV History header */}
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              color: 'var(--text-strong)',
              textTransform: 'uppercase',
              margin: '2rem 0 1rem',
            }}
          >
            {year} PPVs
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {ppvList.map((ppv) => (
              <div
                key={ppv.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderLeft: `3px solid ${ppv.color}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.7rem', color: 'var(--text-strong)', fontWeight: 700, letterSpacing: '0.08em' }}>
                    {ppv.name}
                  </p>
                  <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.08em', marginTop: '0.1rem' }}>
                    {new Date(ppv.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: ppv.color,
                    flexShrink: 0,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
