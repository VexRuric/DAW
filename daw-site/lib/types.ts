// ============================================================
// DAW Warehouse LIVE — Shared database types
// Generated from schema.sql — update if schema changes
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type WrestlerStatus = 'pending' | 'hired' | 'retired' | 'released' | 'rejected'

export interface Wrestler {
  id: string
  name: string
  gender: string | null
  brand: string | null
  division: string | null
  role: string | null
  gimmick: string | null
  disposition: number | null
  country: string | null
  twitch_handle: string | null
  render_url: string | null
  active: boolean
  injured: boolean
  debut_date: string | null
  bio: string | null
  status: WrestlerStatus
  submitted_by: string | null
  created_at: string
  updated_at: string
}

export type TeamStatus = 'pending' | 'hired' | 'retired' | 'released' | 'rejected'

export interface Team {
  id: string
  name: string
  brand: string | null
  division: string | null
  role: string | null
  gender: string | null
  disposition: number | null
  render_url: string | null
  active: boolean
  injured: boolean
  formed_date: string | null
  bio: string | null
  status: TeamStatus
  submitted_by: string | null
  created_at: string
  updated_at: string
}

export interface Title {
  id: string
  name: string
  category: string // 'Singles' | 'Tag' | 'MitB'
  gender: string | null
  active: boolean
  display_order: number
  description: string | null
  image_url: string | null
  created_at: string
}

export type ShowStatus = 'draft' | 'committed' | 'completed'

export interface Show {
  id: string
  name: string
  show_date: string
  show_type: string // 'weekly' | 'ppv' | 'special'
  ppv_name: string | null
  stream_url: string | null
  notes: string | null
  status: ShowStatus
  created_at: string
}

export interface Match {
  id: string
  show_id: string
  match_number: number
  match_type: string
  stipulation: string | null
  is_title_match: boolean
  title_id: string | null
  is_mitb: boolean
  mitb_cashin: boolean
  defeat_type: string | null
  rating: number | null
  is_draw: boolean
  notes: string | null
  created_at: string
}

export interface MatchParticipant {
  id: string
  match_id: string
  wrestler_id: string | null
  team_id: string | null
  write_in_name: string | null
  result: string // 'winner' | 'loser' | 'draw' | 'eliminated'
  elimination_order: number | null
}

export interface TitleReign {
  id: string
  title_id: string
  holder_wrestler_id: string | null
  holder_team_id: string | null
  won_at_match_id: string | null
  lost_at_match_id: string | null
  won_date: string
  lost_date: string | null
  reign_number: number | null
  notes: string | null
  created_at: string
}

// View types

export interface WrestlerRecord {
  id: string
  name: string
  wins: number
  losses: number
  draws: number
  total_matches: number
  win_pct: number | null
  avg_rating: number | null
}

export interface CurrentChampion {
  title_id: string
  title_name: string
  category: string
  holder_name: string
  holder_wrestler_id: string | null
  holder_team_id: string | null
  won_date: string
  days_held: number
}

// Composite types for page data

export interface MatchWithShow extends Match {
  shows: Show
}

export interface MatchWithParticipants extends Match {
  match_participants: (MatchParticipant & {
    wrestlers: Wrestler | null
    teams: Team | null
  })[]
  shows?: Show
  titles?: Title | null
}

export interface WrestlerWithRecord extends Wrestler {
  record?: WrestlerRecord
  current_title?: string | null
}

// ============================================================
// Phase 2 types
// ============================================================

export type StoryNoteType = 'feud' | 'story' | 'angle' | 'general'
export type StoryNotePriority = 'low' | 'normal' | 'high'

export interface StoryNote {
  id: string
  note_type: StoryNoteType
  title: string
  body: string
  wrestler_ids: string[]
  team_ids: string[]
  show_id: string | null
  priority: StoryNotePriority
  resolved: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// Roster view types — only 'hired' | 'retired' rows (enforced by DB views)
export type RosterWrestler = Wrestler
export type RosterTeam = Team

// Pending creation — union used in the admin approvals panel
export interface PendingWrestler extends Wrestler {
  status: 'pending'
  profiles?: { display_name: string | null; twitch_handle: string | null }
}

export interface PendingTeam extends Team {
  status: 'pending'
  profiles?: { display_name: string | null; twitch_handle: string | null }
}
