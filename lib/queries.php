<?php
/**
 * lib/queries.php
 * High-level data fetching functions for public pages
 * All queries use ANON_KEY (read-only, public data only)
 */

require_once __DIR__ . '/supabase.php';

/**
 * Get all active wrestlers with optional filters
 */
function getWrestlers($filters = []) {
    global $supabase;

    $query = [
        'select' => '*',
        'order' => 'name.asc'
    ];

    // Add filters if provided
    if (!empty($filters['active'])) {
        $query['active'] = 'eq.' . ($filters['active'] ? 'true' : 'false');
    }
    if (!empty($filters['division'])) {
        $query['division'] = 'eq.' . $filters['division'];
    }
    if (!empty($filters['limit'])) {
        $query['limit'] = $filters['limit'];
    }
    if (!empty($filters['offset'])) {
        $query['offset'] = $filters['offset'];
    }

    $result = $supabase->get('wrestlers', $query);
    return $result['data'] ?? [];
}

/**
 * Get a single wrestler with their record stats
 */
function getWrestlerWithRecord($wrestlerId) {
    global $supabase;

    $result = $supabase->get('wrestlers', [
        'id' => 'eq.' . $wrestlerId,
        'select' => '*'
    ]);

    $wrestler = $result['data'][0] ?? null;
    if (!$wrestler) {
        return null;
    }

    // Get record stats from view
    $recordResult = $supabase->get('wrestler_records', [
        'wrestler_id' => 'eq.' . $wrestlerId,
        'select' => '*'
    ]);

    $record = $recordResult['data'][0] ?? null;

    return [
        'wrestler' => $wrestler,
        'record' => $record
    ];
}

/**
 * Get wrestlers by division
 */
function getWrestlersByDivision($division) {
    return getWrestlers(['division' => $division]);
}

/**
 * Get current champions (from view)
 */
function getCurrentChampions() {
    global $supabase;

    $result = $supabase->get('current_champions', [
        'select' => '*',
        'order' => 'display_order.asc'
    ]);

    return $result['data'] ?? [];
}

/**
 * Get all shows, optionally filtered by year
 */
function getShows($year = null) {
    global $supabase;

    $query = [
        'select' => '*',
        'order' => 'show_date.desc'
    ];

    if ($year) {
        $query['show_date'] = 'gte.' . $year . '-01-01,lt.' . ($year + 1) . '-01-01';
    }

    $result = $supabase->get('shows', $query);
    return $result['data'] ?? [];
}

/**
 * Get upcoming shows
 */
function getUpcomingShows($days = 30) {
    global $supabase;

    $today = date('Y-m-d');
    $future = date('Y-m-d', strtotime("+$days days"));

    $result = $supabase->get('shows', [
        'select' => '*',
        'show_date' => 'gte.' . $today . ',lte.' . $future,
        'order' => 'show_date.asc',
        'limit' => 10
    ]);

    return $result['data'] ?? [];
}

/**
 * Get next show (soonest upcoming)
 */
function getNextShow() {
    global $supabase;

    $today = date('Y-m-d');

    $result = $supabase->get('shows', [
        'select' => '*',
        'show_date' => 'gte.' . $today,
        'order' => 'show_date.asc',
        'limit' => 1
    ]);

    return $result['data'][0] ?? null;
}

/**
 * Get matches for a specific show
 */
function getMatchesForShow($showId) {
    global $supabase;

    $result = $supabase->get('matches', [
        'select' => '*,match_participants(wrestler_id,team_id,result)',
        'show_id' => 'eq.' . $showId,
        'order' => 'match_number.asc'
    ]);

    return $result['data'] ?? [];
}

/**
 * Get a single match with participants
 */
function getMatchWithParticipants($matchId) {
    global $supabase;

    $result = $supabase->get('matches', [
        'id' => 'eq.' . $matchId,
        'select' => '*,match_participants(*)'
    ]);

    return $result['data'][0] ?? null;
}

/**
 * Get recent matches (last N matches)
 */
function getRecentMatches($limit = 5) {
    global $supabase;

    $result = $supabase->get('matches', [
        'select' => '*,shows(name,show_date),match_participants(wrestler_id,team_id,result,wrestlers(name),teams(name))',
        'order' => 'shows.show_date.desc',
        'limit' => $limit
    ]);

    return $result['data'] ?? [];
}

/**
 * Get all titles
 */
function getTitles() {
    global $supabase;

    $result = $supabase->get('titles', [
        'select' => '*',
        'active' => 'eq.true',
        'order' => 'display_order.asc'
    ]);

    return $result['data'] ?? [];
}

/**
 * Get a single title with history
 */
function getTitleWithHistory($titleId) {
    global $supabase;

    $titleResult = $supabase->get('titles', [
        'id' => 'eq.' . $titleId,
        'select' => '*'
    ]);

    $title = $titleResult['data'][0] ?? null;
    if (!$title) {
        return null;
    }

    // Get reigns
    $reignsResult = $supabase->get('title_reigns', [
        'title_id' => 'eq.' . $titleId,
        'select' => '*,wrestlers(name),shows(name,show_date)',
        'order' => 'reign_start.desc'
    ]);

    return [
        'title' => $title,
        'reigns' => $reignsResult['data'] ?? []
    ];
}

/**
 * Get all teams
 */
function getTeams($filters = []) {
    global $supabase;

    $query = [
        'select' => '*',
        'order' => 'name.asc'
    ];

    if (!empty($filters['active'])) {
        $query['active'] = 'eq.' . ($filters['active'] ? 'true' : 'false');
    }

    $result = $supabase->get('teams', $query);
    return $result['data'] ?? [];
}

/**
 * Get team with current members
 */
function getTeamWithMembers($teamId) {
    global $supabase;

    $teamResult = $supabase->get('teams', [
        'id' => 'eq.' . $teamId,
        'select' => '*'
    ]);

    $team = $teamResult['data'][0] ?? null;
    if (!$team) {
        return null;
    }

    // Get current members
    $membersResult = $supabase->get('team_memberships', [
        'team_id' => 'eq.' . $teamId,
        'end_date' => 'is.null',
        'select' => '*,wrestlers(name,role,render_url)',
        'order' => 'start_date.asc'
    ]);

    return [
        'team' => $team,
        'members' => $membersResult['data'] ?? []
    ];
}

/**
 * Get submissions (for admin approval page)
 */
function getSubmissions($status = null, $type = null) {
    global $supabase;

    $query = [
        'select' => '*,profiles(twitch_handle)',
        'order' => 'created_at.desc'
    ];

    if ($status) {
        $query['status'] = 'eq.' . $status;
    }
    if ($type) {
        $query['type'] = 'eq.' . $type;
    }

    $result = $supabase->get('submissions', $query);
    return $result['data'] ?? [];
}

/**
 * Get submissions for a specific user
 */
function getUserSubmissions($userId) {
    global $supabase;

    $result = $supabase->get('submissions', [
        'submitted_by' => 'eq.' . $userId,
        'select' => '*',
        'order' => 'created_at.desc'
    ]);

    return $result['data'] ?? [];
}

/**
 * Search wrestlers by name
 */
function searchWrestlers($query) {
    global $supabase;

    // Supabase full-text search - use 'ilike' for case-insensitive search
    $query = '%' . $query . '%';

    $result = $supabase->get('wrestlers', [
        'select' => '*',
        'name' => 'ilike.' . $query,
        'active' => 'eq.true',
        'order' => 'name.asc',
        'limit' => 20
    ]);

    return $result['data'] ?? [];
}

/**
 * Get wrestler record stats (from view)
 */
function getWrestlerRecord($wrestlerId) {
    global $supabase;

    $result = $supabase->get('wrestler_records', [
        'wrestler_id' => 'eq.' . $wrestlerId,
        'select' => '*'
    ]);

    return $result['data'][0] ?? null;
}

/**
 * Get all wrestler records (for sorting/stats)
 */
function getAllWrestlerRecords() {
    global $supabase;

    $result = $supabase->get('wrestler_records', [
        'select' => '*',
        'order' => 'wins.desc'
    ]);

    return $result['data'] ?? [];
}

/**
 * Get matches by wrestler
 */
function getWrestlerMatches($wrestlerId, $limit = 20) {
    global $supabase;

    // Get matches where wrestler participated
    $result = $supabase->get('match_participants', [
        'wrestler_id' => 'eq.' . $wrestlerId,
        'select' => '*,matches(match_type,shows(name,show_date),match_participants(wrestler_id,team_id,result,wrestlers(name),teams(name)))',
        'order' => 'matches.shows.show_date.desc',
        'limit' => $limit
    ]);

    return $result['data'] ?? [];
}
