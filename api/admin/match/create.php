<?php
/**
 * api/admin/match/create.php
 * Create a new match
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/admin-queries.php';

// Verify authentication
$user = requireAuth(['admin', 'booker'], false);
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

$errors = [];
if (empty($input['show_id'])) $errors[] = 'Show ID is required';
if (empty($input['match_type'])) $errors[] = 'Match type is required';

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['errors' => $errors]);
    exit;
}

$result = createMatch($input);

if ($result['error']) {
    http_response_code(400);
    echo json_encode(['error' => $result['error']]);
} else {
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'data' => $result['data'],
        'message' => 'Match created successfully'
    ]);
}
