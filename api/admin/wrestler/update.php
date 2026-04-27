<?php
/**
 * api/admin/wrestler/update.php
 * Update wrestler properties
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../../lib/auth.php';
require_once __DIR__ . '/../../lib/admin-queries.php';

// Verify authentication
$user = requireAuth(['admin'], false);
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'PATCH' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

if (empty($input['wrestler_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Wrestler ID is required']);
    exit;
}

$result = updateWrestler($input['wrestler_id'], $input);

if ($result['error']) {
    http_response_code(400);
    echo json_encode(['error' => $result['error']]);
} else {
    echo json_encode([
        'success' => true,
        'message' => 'Wrestler updated successfully'
    ]);
}
