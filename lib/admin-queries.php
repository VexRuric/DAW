<?php
/**
 * lib/admin-queries.php
 * Write operations for admin panel
 * All queries use SERVICE_KEY (authenticated admin operations)
 */

require_once __DIR__ . '/supabase.php';
require_once __DIR__ . '/auth.php';

/**
 * Create a new show
 */
function createShow($data) {
    global $supabase;

    $validated = [
        'name' => $data['name'] ?? null,
        'show_date' => $data['show_date'] ?? null,
        'show_type' => $data['show_type'] ?? 'weekly',
        'ppv_name' => $data['ppv_name'] ?? null,
        'stream_url' => $data['stream_url'] ?? null,
        'notes' => $data['notes'] ?? null,
    ];

    if (!$validated['name'] || !$validated['show_date']) {
        return ['error' => 'name and show_date are required'];
    }

    $result = $supabase->create('shows', $validated, true);
    return $result;
}

/**
 * Update a show
 */
function updateShow($showId, $data) {
    global $supabase;

    $validated = [];
    if (isset($data['name'])) $validated['name'] = $data['name'];
    if (isset($data['show_date'])) $validated['show_date'] = $data['show_date'];
    if (isset($data['show_type'])) $validated['show_type'] = $data['show_type'];
    if (isset($data['ppv_name'])) $validated['ppv_name'] = $data['ppv_name'];
    if (isset($data['stream_url'])) $validated['stream_url'] = $data['stream_url'];
    if (isset($data['notes'])) $validated['notes'] = $data['notes'];

    if (empty($validated)) {
        return ['error' => 'No fields to update'];
    }

    $result = $supabase->update('shows', 'id=eq.' . $showId, $validated, true);
    return $result;
}

/**
 * Create a new match
 */
function createMatch($data) {
    global $supabase;

    $validated = [
        'show_id' => $data['show_id'] ?? null,
        'match_number' => $data['match_number'] ?? 1,
        'match_type' => $data['match_type'] ?? 'Single',
        'stipulation' => $data['stipulation'] ?? null,
        'is_title_match' => $data['is_title_match'] ?? false,
        'title_id' => $data['title_id'] ?? null,
        'defeat_type' => $data['defeat_type'] ?? null,
        'rating' => $data['rating'] ?? null,
        'is_draw' => $data['is_draw'] ?? false,
        'notes' => $data['notes'] ?? null,
    ];

    if (!$validated['show_id']) {
        return ['error' => 'show_id is required'];
    }

    $result = $supabase->create('matches', $validated, true);
    return $result;
}

/**
 * Update a match
 */
function updateMatch($matchId, $data) {
    global $supabase;

    $validated = [];
    if (isset($data['match_type'])) $validated['match_type'] = $data['match_type'];
    if (isset($data['stipulation'])) $validated['stipulation'] = $data['stipulation'];
    if (isset($data['is_title_match'])) $validated['is_title_match'] = $data['is_title_match'];
    if (isset($data['title_id'])) $validated['title_id'] = $data['title_id'];
    if (isset($data['defeat_type'])) $validated['defeat_type'] = $data['defeat_type'];
    if (isset($data['rating'])) $validated['rating'] = $data['rating'];
    if (isset($data['is_draw'])) $validated['is_draw'] = $data['is_draw'];
    if (isset($data['notes'])) $validated['notes'] = $data['notes'];

    if (empty($validated)) {
        return ['error' => 'No fields to update'];
    }

    $result = $supabase->update('matches', 'id=eq.' . $matchId, $validated, true);
    return $result;
}

/**
 * Delete a match
 */
function deleteMatch($matchId) {
    global $supabase;
    return $supabase->delete('matches', 'id=eq.' . $matchId, true);
}

/**
 * Add participant to a match
 */
function addMatchParticipant($matchId, $wrestlerId = null, $teamId = null, $result = 'loser') {
    global $supabase;

    if (!$wrestlerId && !$teamId) {
        return ['error' => 'Either wrestler_id or team_id is required'];
    }

    $data = [
        'match_id' => $matchId,
        'wrestler_id' => $wrestlerId,
        'team_id' => $teamId,
        'result' => $result,
    ];

    return $supabase->create('match_participants', $data, true);
}

/**
 * Update match participant result
 */
function updateMatchParticipant($participantId, $result) {
    global $supabase;

    return $supabase->update('match_participants', 'id=eq.' . $participantId, ['result' => $result], true);
}

/**
 * Update wrestler properties (injury status, division, role)
 */
function updateWrestler($wrestlerId, $data) {
    global $supabase;

    $validated = [];
    if (isset($data['active'])) $validated['active'] = $data['active'];
    if (isset($data['injured'])) $validated['injured'] = $data['injured'];
    if (isset($data['division'])) $validated['division'] = $data['division'];
    if (isset($data['role'])) $validated['role'] = $data['role'];
    if (isset($data['brand'])) $validated['brand'] = $data['brand'];
    if (isset($data['render_url'])) $validated['render_url'] = $data['render_url'];

    if (empty($validated)) {
        return ['error' => 'No fields to update'];
    }

    return $supabase->update('wrestlers', 'id=eq.' . $wrestlerId, $validated, true);
}

/**
 * Approve a submission
 */
function approveSubmission($submissionId, $adminId) {
    global $supabase;

    return $supabase->update('submissions', 'id=eq.' . $submissionId, [
        'status' => 'approved',
        'reviewed_by' => $adminId,
        'reviewed_at' => date('c'),
    ], true);
}

/**
 * Reject a submission
 */
function rejectSubmission($submissionId, $adminId, $notes = '') {
    global $supabase;

    return $supabase->update('submissions', 'id=eq.' . $submissionId, [
        'status' => 'rejected',
        'reviewed_by' => $adminId,
        'reviewed_at' => date('c'),
        'reviewer_notes' => $notes,
    ], true);
}

/**
 * Create a story note
 */
function createStoryNote($data) {
    global $supabase;

    $validated = [
        'note_type' => $data['note_type'] ?? 'other',
        'title' => $data['title'] ?? null,
        'content' => $data['content'] ?? null,
        'related_wrestler_id' => $data['related_wrestler_id'] ?? null,
        'related_team_id' => $data['related_team_id'] ?? null,
    ];

    return $supabase->create('story_notes', $validated, true);
}

/**
 * Delete a story note
 */
function deleteStoryNote($noteId) {
    global $supabase;
    return $supabase->delete('story_notes', 'id=eq.' . $noteId, true);
}

/**
 * Create a wrestler submission (for admins to create)
 */
function createWrestlerSubmission($data, $userId) {
    global $supabase;

    $validated = [
        'type' => 'new_wrestler',
        'status' => 'pending',
        'submitted_by' => $userId,
        'title' => $data['wrestler_name'] ?? null,
        'data' => json_encode($data),
    ];

    return $supabase->create('submissions', $validated, true);
}

/**
 * Validate submission and create actual wrestler record
 */
function acceptWrestlerSubmission($submissionId) {
    global $supabase;

    // Get the submission
    $subResult = $supabase->get('submissions', [
        'id' => 'eq.' . $submissionId,
        'select' => '*'
    ], true);

    if ($subResult['error'] || empty($subResult['data'])) {
        return ['error' => 'Submission not found'];
    }

    $submission = $subResult['data'][0];
    $data = json_decode($submission['data'], true);

    // Create wrestler from submission data
    $wrestlerData = [
        'name' => $data['wrestling_name'] ?? $data['ringName'] ?? null,
        'gender' => $data['gender'] ?? null,
        'division' => 'Internet', // Default division for new wrestlers
        'role' => $data['alignment'] ?? 'Face',
        'brand' => 'DAW',
        'active' => true,
        'render_url' => $data['imageUrl'] ?? null,
    ];

    $wrestlerResult = $supabase->create('wrestlers', $wrestlerData, true);

    if ($wrestlerResult['error']) {
        return $wrestlerResult;
    }

    // Update submission status
    approveSubmission($submissionId, null);

    return $wrestlerResult;
}

/**
 * Get all pending approvals
 */
function getPendingApprovals() {
    global $supabase;

    $result = $supabase->get('submissions', [
        'status' => 'eq.pending',
        'select' => '*,profiles(twitch_handle)',
        'order' => 'created_at.asc',
    ], true);

    return $result['data'] ?? [];
}

/**
 * Get story notes
 */
function getStoryNotes() {
    global $supabase;

    $result = $supabase->get('story_notes', [
        'select' => '*',
        'order' => 'created_at.desc',
    ], true);

    return $result['data'] ?? [];
}
