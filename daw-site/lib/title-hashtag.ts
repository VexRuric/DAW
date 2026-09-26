// #ANDNEW / #ANDSTILL / #WINNER for match results (home page and shows page).

export type ResultHashtag = 'ANDNEW' | 'ANDSTILL' | 'WINNER'

// Badge colours for result hashtags
export const HASHTAG_BG: Record<ResultHashtag, string> = { ANDNEW: 'var(--accent-red)', ANDSTILL: 'var(--gold)', WINNER: 'var(--purple)' }
export const HASHTAG_FG: Record<ResultHashtag, string> = { ANDNEW: 'var(--text-strong)', ANDSTILL: 'var(--bg-top)', WINNER: 'var(--text-strong)' }

/**
 * Title matches whose result changed hands: a reign was won or lost at that match.
 * Results Entry links every title change to its match, so this covers current data.
 */
export async function buildAndNewIds(supabase: any, matchIds: string[]): Promise<Set<string>> {
  const ids = new Set<string>()
  if (matchIds.length === 0) return ids
  const [{ data: won }, { data: lost }] = await Promise.all([
    supabase.from('title_reigns').select('won_at_match_id').in('won_at_match_id', matchIds),
    supabase.from('title_reigns').select('lost_at_match_id').in('lost_at_match_id', matchIds),
  ])
  for (const r of won ?? []) if (r.won_at_match_id) ids.add(r.won_at_match_id)
  for (const r of lost ?? []) if (r.lost_at_match_id) ids.add(r.lost_at_match_id)
  return ids
}

/**
 * `${titleId}|${holderId}|${won_date}` for every reign (past and current) of the given
 * titles — fallback for older or manually entered reigns that aren't linked to a match.
 */
export async function buildReignStarts(supabase: any, titleIds: string[]): Promise<Set<string>> {
  const starts = new Set<string>()
  if (titleIds.length === 0) return starts
  const { data } = await supabase
    .from('title_reigns')
    .select('title_id, holder_wrestler_id, holder_wrestler_id_2, holder_team_id, won_date')
    .in('title_id', titleIds)
  for (const r of data ?? []) {
    for (const id of [r.holder_wrestler_id, r.holder_wrestler_id_2, r.holder_team_id]) {
      if (id) starts.add(`${r.title_id}|${id}|${r.won_date}`)
    }
  }
  return starts
}

/**
 * A title match is ANDNEW only if the title changed hands at it; otherwise the champion
 * retained (ANDSTILL) and their reign keeps its original won date. Matches need
 * `titles(id)` and `match_participants(wrestler_id, team_id, result)` selected.
 */
export function deriveHashtag(
  match: any,
  andNewIds: Set<string>,
  reignStarts?: Set<string>,
  showDate?: string,
): ResultHashtag {
  if (!match.is_title_match) return 'WINNER'
  if (andNewIds.has(match.id)) return 'ANDNEW'
  const titleId = match.titles?.id
  if (reignStarts && showDate && titleId) {
    for (const p of match.match_participants ?? []) {
      if (p.result !== 'winner') continue
      for (const id of [p.wrestler_id, p.team_id]) {
        if (id && reignStarts.has(`${titleId}|${id}|${showDate}`)) return 'ANDNEW'
      }
    }
  }
  return 'ANDSTILL'
}
