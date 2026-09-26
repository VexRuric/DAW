// Who holds a title reign, for display. A reign can be held by:
//   - a team (optionally recording the members who won) → shown as the team
//   - one wrestler, or two co-holders (holder_wrestler_id + holder_wrestler_id_2)
// Older tag reigns may also be stored as one row per partner with identical dates;
// mergeTagPartnerRows folds those into a single reign.

import type { CurrentChampion } from './types'

export interface Holder {
  id: string; name: string; render_url: string | null; kind: 'wrestler' | 'team'
  /** Team reigns only: the members recorded as winning the title */
  members?: Holder[]
}

/** Name/render lookup for wrestler ids that weren't embedded in the query (e.g. holder_wrestler_id_2). */
export async function loadWrestlers(supabase: any, ids: (string | null | undefined)[]): Promise<Map<string, Holder>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))]
  const map = new Map<string, Holder>()
  if (unique.length === 0) return map
  const { data } = await supabase.from('wrestlers').select('id, name, render_url').in('id', unique)
  for (const w of data ?? []) map.set(w.id, { id: w.id, name: w.name, render_url: w.render_url ?? null, kind: 'wrestler' })
  return map
}

/**
 * Attach `holders` to each reign. Expects `wrestlers`/`teams` embeds plus the raw
 * `holder_wrestler_id_2` column; partner names come from `partners`.
 */
export function withHolders<T extends Record<string, any>>(reign: T, partners: Map<string, Holder>): T & { holders: Holder[] } {
  const people: Holder[] = []
  if (reign.wrestlers) people.push({ id: reign.wrestlers.id, name: reign.wrestlers.name, render_url: reign.wrestlers.render_url ?? null, kind: 'wrestler' })
  const partner = reign.holder_wrestler_id_2 ? partners.get(reign.holder_wrestler_id_2) : undefined
  if (partner && !people.some(h => h.id === partner.id)) people.push(partner)

  const holders: Holder[] = reign.teams
    ? [{ id: reign.teams.id, name: reign.teams.name, render_url: reign.teams.render_url ?? null, kind: 'team', members: people }]
    : people
  return { ...reign, holders }
}

/** Fold legacy one-row-per-partner tag reigns (same won/lost dates, no team) into one reign. */
export function mergeTagPartnerRows<T extends { won_date: string; lost_date: string | null; holders: Holder[] }>(reigns: T[]): T[] {
  const out: T[] = []
  for (const r of reigns) {
    const isWrestlerReign = r.holders.length > 0 && r.holders.every(h => h.kind === 'wrestler')
    const twin = isWrestlerReign
      ? out.find(o => o.won_date === r.won_date && o.lost_date === r.lost_date && o.holders.every(h => h.kind === 'wrestler') && o.holders.length < 2)
      : undefined
    if (twin) {
      for (const h of r.holders) if (!twin.holders.some(x => x.id === h.id)) twin.holders.push(h)
    } else {
      out.push({ ...r, holders: [...r.holders] })
    }
  }
  return out
}

export function holderNames(holders: Holder[]): string {
  return holders.map(h => h.name).join(' & ')
}

/**
 * current_champions rows → one row per title with a display name covering both
 * co-holders (holder_wrestler_id_2) and legacy one-row-per-partner reigns.
 */
export async function withChampionNames(supabase: any, champs: CurrentChampion[]): Promise<CurrentChampion[]> {
  const partners = await loadWrestlers(supabase, champs.filter(c => !c.holder_team_id).map(c => c.holder_wrestler_id_2))
  const byTitle = new Map<string, CurrentChampion>()
  for (const c of champs) {
    const partner = !c.holder_team_id && c.holder_wrestler_id_2 ? partners.get(c.holder_wrestler_id_2)?.name : undefined
    const name = partner && !c.holder_name.includes(partner) ? `${c.holder_name} & ${partner}` : c.holder_name
    const existing = byTitle.get(c.title_id)
    if (existing) {
      if (!existing.holder_name.includes(c.holder_name)) existing.holder_name = `${existing.holder_name} & ${c.holder_name}`
      existing.holder_wrestler_id_2 ??= c.holder_wrestler_id
    } else {
      byTitle.set(c.title_id, { ...c, holder_name: name })
    }
  }
  return [...byTitle.values()]
}
