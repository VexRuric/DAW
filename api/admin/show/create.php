<?php
/**
 * api/admin/show/create.php
 * Create a new show
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

// Check method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get JSON body
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

// Validate required fields
$errors = [];
if (empty($input['name'])) $errors[] = 'Show name is required';
if (empty($input['show_date'])) $errors[] = 'Show date is required';

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['errors' => $errors]);
    exit;
}

// Create show
$result = createShow($input);

if ($result['error']) {
    http_response_code(400);
    echo json_encode(['error' => $result['error']]);
} else {
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'data' => $result['data'],
        'message' => 'Show created successfully'
    ]);
}
