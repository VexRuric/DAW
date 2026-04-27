// DAW Warehouse LIVE — PPV Calendar Data
// 2025 is fully populated. 2022–2024 are stubbed until confirmed dates are provided.

export interface PPVEvent {
  name: string
  abbr: string          // Short label for calendar cell (≤4 chars)
  color: string         // Hex — unique per PPV, no two share a hue
  month: number         // 0-indexed (0 = January)
  date: string          // YYYY-MM-DD of the PPV Friday
}

export type PPVYear = Record<string, PPVEvent>

// 2025 — All 12 PPVs confirmed by Daware
// Each is the last Friday of its respective month
export const PPV_2025: PPVYear = {
  'Lord of the Ring': {
    name: 'Lord of the Ring',
    abbr: 'LOTR',
    color: '#a855f7',   // violet-purple
    month: 0,
    date: '2025-01-31',
  },
  'Banned Portal': {
    name: 'Banned Portal',
    abbr: 'BP',
    color: '#ef4444',   // red
    month: 1,
    date: '2025-02-28',
  },
  'No Escape': {
    name: 'No Escape',
    abbr: 'NE',
    color: '#14b8a6',   // teal
    month: 2,
    date: '2025-03-28',
  },
  'Last Kingdom': {
    name: 'Last Kingdom',
    abbr: 'LK',
    color: '#f59e0b',   // amber
    month: 3,
    date: '2025-04-25',
  },
  'Resurrection': {
    name: 'Resurrection',
    abbr: 'RES',
    color: '#22c55e',   // green
    month: 4,
    date: '2025-05-30',
  },
  'Monarch Madness': {
    name: 'Monarch Madness',
    abbr: 'MM',
    color: '#eab308',   // yellow-gold
    month: 5,
    date: '2025-06-27',
  },
  'Bloodlust': {
    name: 'Bloodlust',
    abbr: 'BL',
    color: '#be123c',   // crimson
    month: 6,
    date: '2025-07-25',
  },
  'Up the Ante': {
    name: 'Up the Ante',
    abbr: 'UTA',
    color: '#3b82f6',   // sky blue
    month: 7,
    date: '2025-08-29',
  },
  'Beach Bash': {
    name: 'Beach Bash',
    abbr: 'BB',
    color: '#fb923c',   // orange
    month: 8,
    date: '2025-09-26',
  },
  'Fright Night': {
    name: 'Fright Night',
    abbr: 'FN',
    color: '#7c3aed',   // deep purple / halloween
    month: 9,
    date: '2025-10-31',
  },
  'Extinction': {
    name: 'Extinction',
    abbr: 'EXT',
    color: '#6b7280',   // dark gray
    month: 10,
    date: '2025-11-28',
  },
  'Jingle Bash': {
    name: 'Jingle Bash',
    abbr: 'JB',
    color: '#16a34a',   // christmas green
    month: 11,
    date: '2025-12-26',
  },
}

// 2024 — Real dates from DAW Show Breakdown
export const PPV_2024: PPVYear = {
  'Banned Portal 2024':    { name: 'Banned Portal',    abbr: 'BP',   color: '#ef4444', month: 0, date: '2024-01-26' },
  'No Escape 2024':        { name: 'No Escape',        abbr: 'NE',   color: '#14b8a6', month: 1, date: '2024-02-23' },
  'Last Kingdom 2024':     { name: 'Last Kingdom',     abbr: 'LK',   color: '#f59e0b', month: 3, date: '2024-04-26' },
  'Resurrection 2024':     { name: 'Resurrection',     abbr: 'RES',  color: '#22c55e', month: 4, date: '2024-05-31' },
  'Bloodlust 2024':        { name: 'Bloodlust',        abbr: 'BL',   color: '#be123c', month: 5, date: '2024-06-28' },
  'Up the Ante 2024':      { name: 'Up the Ante',      abbr: 'UTA',  color: '#3b82f6', month: 6, date: '2024-07-26' },
  'Monarch Madness 2024':  { name: 'Monarch Madness',  abbr: 'MM',   color: '#eab308', month: 7, date: '2024-08-30' },
  'Beach Bash 2024':       { name: 'Beach Bash',       abbr: 'BB',   color: '#fb923c', month: 8, date: '2024-09-27' },
  'Fright Night 2024':     { name: 'Fright Night',     abbr: 'FN',   color: '#7c3aed', month: 9, date: '2024-10-25' },
  'Extinction 2024':       { name: 'Extinction',       abbr: 'EXT',  color: '#6b7280', month: 10, date: '2024-11-29' },
  'Jingle Bash 2024':      { name: 'Jingle Bash',      abbr: 'JB',   color: '#16a34a', month: 11, date: '2024-12-27' },
}

// 2023 — Stubbed (update with real dates)
export const PPV_2023: PPVYear = {
  'Lord of the Ring 2023': { name: 'Lord of the Ring', abbr: 'LOTR', color: '#a855f7', month: 0, date: '2023-01-27' },
  'Banned Portal 2023':    { name: 'Banned Portal',    abbr: 'BP',   color: '#ef4444', month: 1, date: '2023-02-24' },
  'No Escape 2023':        { name: 'No Escape',        abbr: 'NE',   color: '#14b8a6', month: 2, date: '2023-03-31' },
  'Monarchy 2023':         { name: 'Monarchy',         abbr: 'MON',  color: '#f59e0b', month: 3, date: '2023-04-28' },
  'Resurrection 2023':     { name: 'Resurrection',     abbr: 'RES',  color: '#22c55e', month: 4, date: '2023-05-26' },
  'Bloodlust 2023':        { name: 'Bloodlust',        abbr: 'BL',   color: '#be123c', month: 5, date: '2023-06-30' },
  'Last Kingdom 2023':     { name: 'Last Kingdom',     abbr: 'LK',   color: '#eab308', month: 6, date: '2023-07-28' },
  'Up the Ante 2023':      { name: 'Up the Ante',      abbr: 'UTA',  color: '#3b82f6', month: 7, date: '2023-08-25' },
  'Beach Bash 2023':       { name: 'Beach Bash',       abbr: 'BB',   color: '#fb923c', month: 8, date: '2023-09-29' },
  'Fright Night 2023':     { name: 'Fright Night',     abbr: 'FN',   color: '#7c3aed', month: 9, date: '2023-10-27' },
  'Extinction 2023':       { name: 'Extinction',       abbr: 'EXT',  color: '#6b7280', month: 10, date: '2023-11-24' },
  'Jingle Bash 2023':      { name: 'Jingle Bash',      abbr: 'JB',   color: '#16a34a', month: 11, date: '2023-12-29' },
}

// 2022 — Stubbed (update with real dates)
export const PPV_2022: PPVYear = {
  'Banned Portal 2022':    { name: 'Banned Portal',    abbr: 'BP',   color: '#ef4444', month: 1, date: '2022-02-25' },
  'No Escape 2022':        { name: 'No Escape',        abbr: 'NE',   color: '#14b8a6', month: 2, date: '2022-03-25' },
  'Resurrection 2022':     { name: 'Resurrection',     abbr: 'RES',  color: '#22c55e', month: 4, date: '2022-04-29' },
  'Bloodlust 2022':        { name: 'Bloodlust',        abbr: 'BL',   color: '#be123c', month: 5, date: '2022-06-24' },
  'Up the Ante 2022':      { name: 'Up the Ante',      abbr: 'UTA',  color: '#3b82f6', month: 7, date: '2022-08-26' },
  'Fright Night 2022':     { name: 'Fright Night',     abbr: 'FN',   color: '#7c3aed', month: 9, date: '2022-10-28' },
  'Jingle Bash 2022':      { name: 'Jingle Bash',      abbr: 'JB',   color: '#16a34a', month: 11, date: '2022-12-30' },
}

// 2026 — Upcoming (stub, update when announced)
export const PPV_2026: PPVYear = {
  'Lord of the Ring 2026': { name: 'Lord of the Ring', abbr: 'LOTR', color: '#a855f7', month: 0, date: '2026-01-30' },
  'Banned Portal 2026':    { name: 'Banned Portal',    abbr: 'BP',   color: '#ef4444', month: 1, date: '2026-02-27' },
  'No Escape 2026':        { name: 'No Escape',        abbr: 'NE',   color: '#14b8a6', month: 2, date: '2026-03-27' },
  'Last Kingdom 2026':     { name: 'Last Kingdom',     abbr: 'LK',   color: '#f59e0b', month: 3, date: '2026-04-24' },
  'Resurrection 2026':     { name: 'Resurrection',     abbr: 'RES',  color: '#22c55e', month: 4, date: '2026-05-29' },
  'Monarch Madness 2026':  { name: 'Monarch Madness',  abbr: 'MM',   color: '#eab308', month: 5, date: '2026-06-26' },
  'Bloodlust 2026':        { name: 'Bloodlust',        abbr: 'BL',   color: '#be123c', month: 6, date: '2026-07-31' },
  'Up the Ante 2026':      { name: 'Up the Ante',      abbr: 'UTA',  color: '#3b82f6', month: 7, date: '2026-08-28' },
  'Beach Bash 2026':       { name: 'Beach Bash',       abbr: 'BB',   color: '#fb923c', month: 8, date: '2026-09-25' },
  'Fright Night 2026':     { name: 'Fright Night',     abbr: 'FN',   color: '#7c3aed', month: 9, date: '2026-10-30' },
  'Extinction 2026':       { name: 'Extinction',       abbr: 'EXT',  color: '#6b7280', month: 10, date: '2026-11-27' },
  'Jingle Bash 2026':      { name: 'Jingle Bash',      abbr: 'JB',   color: '#16a34a', month: 11, date: '2026-12-25' },
}

export const PPV_BY_YEAR: Record<number, PPVYear> = {
  2022: PPV_2022,
  2023: PPV_2023,
  2024: PPV_2024,
  2025: PPV_2025,
  2026: PPV_2026,
}

// Returns the PPV for a given date string (YYYY-MM-DD), or null
export function getPPVForDate(dateStr: string, year: number): PPVEvent | null {
  const ppvs = PPV_BY_YEAR[year]
  if (!ppvs) return null
  return Object.values(ppvs).find((p) => p.date === dateStr) ?? null
}

// Returns all PPVs for a year ordered by month
export function getPPVsForYear(year: number): PPVEvent[] {
  const ppvs = PPV_BY_YEAR[year]
  if (!ppvs) return []
  return Object.values(ppvs).sort((a, b) => a.month - b.month)
}

// Returns the PPV for a given month index (0-based) in a year, or null
export function getPPVForMonth(year: number, month: number): PPVEvent | null {
  const ppvs = PPV_BY_YEAR[year]
  if (!ppvs) return null
  return Object.values(ppvs).find((p) => p.month === month) ?? null
}
