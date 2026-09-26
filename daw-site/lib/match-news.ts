// Match result headlines/excerpts and participant helpers shared by the home page
// news grid and the shows page.

import { deriveHashtag } from './title-hashtag'

export type TemplateMap = Record<string, string[]>

export function formatDateLong(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function formatDateShortAbbr(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

export function participantName(p: any): string {
  return p.wrestlers?.name ?? p.teams?.name ?? p.write_in_name ?? 'Unknown'
}

export function participantImage(p: any): string | null {
  return p.wrestlers?.render_url ?? p.teams?.render_url ?? null
}

// Prefer an individual wrestler with a render image over a faction representative (team logo).
// Faction matches produce multiple winners: the faction rep (team_id set, wrestlers=null)
// AND individual members (wrestler_id set). Always show a person, not a logo.
export function winnerForImage(participants: any[]): any | null {
  const winners = (participants ?? []).filter((p: any) => p.result === 'winner')
  return winners.find((p: any) => p.wrestlers?.render_url)
    ?? winners.find((p: any) => p.wrestlers)
    ?? winners[0]
    ?? null
}

// Deterministic pick so same match always shows same variant
function pick<T>(arr: T[], seed: string): T {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return arr[h % arr.length]
}

function fillTemplate(tpl: string, tokens: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => tokens[k] ?? `{${k}}`)
}

/** Active news_templates rows grouped by category. */
export function buildTemplateMap(rows: { category: string; template: string }[] | null): TemplateMap {
  const map: TemplateMap = {}
  for (const row of rows ?? []) (map[row.category] ??= []).push(row.template)
  return map
}

// Used when the admin hasn't added news_templates for a category
const FALLBACK_HEADLINES: TemplateMap = {
  andnew_headline: [
    '{winner} Captures The {title}',
    'New Champion: {winner} Dethrones {loser} For The {title}',
    '{loser} Falls! {winner} Is The New {title} Champion',
    '{winner} Strikes Gold — New {title} Champion',
  ],
  andstill_headline: [
    '{winner} Retains The {title}',
    'And Still! {winner} Defends The {title} Over {loser}',
    '{winner} Keeps The {title} — {loser} Falls Short',
    '{loser} Cannot Dethrone {winner} — Still Your {title} Champion',
  ],
  winner_headline: [
    '{winner} Picks Up The Win Over {loser}',
    '{loser} Meets Their End Against {winner}',
    '{winner} Victorious — {loser} Dethroned',
    '{winner} Remains Dominant — {loser} Left In The Dust',
  ],
}

const FALLBACK_EXCERPTS: TemplateMap = {
  andnew_excerpt: [
    '{winner} captures the {title} in a {match_type}, defeating {loser}.',
    'In a stunning {match_type}, {winner} dethrones {loser} to claim the {title}.',
    '{loser} could not hold on as {winner} emerges from a {match_type} as the new {title} champion.',
    'History is made — {winner} pins {loser} in a {match_type} to win the {title}.',
  ],
  andstill_excerpt: [
    '{winner} successfully defends the {title} against {loser} in a {match_type}.',
    '{loser} came close, but {winner} proves why they are still {title} champion after a {match_type}.',
    'No title change tonight — {winner} survives a {match_type} with {loser} to retain the {title}.',
    '{winner} answers the challenge in a {match_type}, turning back {loser} to remain {title} champion.',
  ],
  winner_excerpt: [
    '{winner} picks up the win over {loser} in a {match_type}.',
    '{loser} cannot handle the pressure as {winner} gets the victory in a {match_type}.',
    'A hard-fought {match_type} ends with {winner} standing tall over {loser}.',
    '{winner} gets it done in a {match_type}, leaving {loser} behind.',
  ],
}

export function buildHeadline(match: any, andNewIds: Set<string>, tplMap: TemplateMap, reignStarts?: Set<string>, showDate?: string): string {
  const effectiveType = match.scheme === 'Promo' ? 'Promo' : match.match_type
  const promoLabel = match.scheme === 'Promo' && match.stipulation ? match.stipulation : effectiveType
  const winner = (match.match_participants ?? []).find((p: any) => p.result === 'winner')
  const promoSubject = match.scheme === 'Promo'
    ? (winner ?? (match.match_participants ?? [])[0] ?? null) : null
  if (!winner) {
    if (promoSubject) return `${participantName(promoSubject)} — ${promoLabel}`
    return promoLabel
  }
  const wName = participantName(winner)
  const losers = (match.match_participants ?? []).filter((p: any) => p.result === 'loser')
  const lName = losers.length === 0 ? ''
    : losers.length <= 3 ? losers.map((p: any) => participantName(p)).join(' & ')
    : losers.slice(0, 2).map((p: any) => participantName(p)).join(', ') + ' & more'
  const hashtag = deriveHashtag(match, andNewIds, reignStarts, showDate)
  const titleName = match.titles?.name ?? 'Title'
  const tokens = { winner: wName, loser: lName || wName, title: titleName, match_type: promoLabel }

  const catKey = hashtag === 'ANDNEW' ? 'andnew_headline' : hashtag === 'ANDSTILL' ? 'andstill_headline' : 'winner_headline'
  const pool = (tplMap[catKey]?.length ? tplMap[catKey] : FALLBACK_HEADLINES[catKey])!
  return fillTemplate(pick(pool, match.id), tokens)
}

export function buildExcerpt(match: any, andNewIds: Set<string>, tplMap: TemplateMap, reignStarts?: Set<string>, showDate?: string): string {
  const winner = (match.match_participants ?? []).find((p: any) => p.result === 'winner')
  const losers = (match.match_participants ?? []).filter((p: any) => p.result === 'loser')
  const wName = winner ? participantName(winner) : ''
  const lStr = losers.map((p: any) => participantName(p)).join(' and ')
  const hashtag = deriveHashtag(match, andNewIds, reignStarts, showDate)
  const titleName = match.titles?.name ?? 'title'
  const effectiveType = match.scheme === 'Promo' ? 'Promo' : match.match_type
  const stip = match.stipulation ? ` ${match.stipulation}` : ''
  const tokens = { winner: wName, loser: lStr || wName, title: titleName, match_type: `${effectiveType}${stip}` }

  const catKey = hashtag === 'ANDNEW' ? 'andnew_excerpt' : hashtag === 'ANDSTILL' ? 'andstill_excerpt' : 'winner_excerpt'
  const pool = (tplMap[catKey]?.length ? tplMap[catKey] : FALLBACK_EXCERPTS[catKey])!
  return fillTemplate(pick(pool, match.id), tokens)
}
