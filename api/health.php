<?php
/**
 * api/health.php
 * Health check endpoint - test Supabase connectivity
 */

require_once __DIR__ . '/../lib/supabase.php';

header('Content-Type: application/json');

try {
    // Try a simple query
    $result = $supabase->get('wrestlers', ['limit' => 1]);

    if ($result['error']) {
        http_response_code(503);
        echo json_encode([
            'status' => 'error',
            'error' => $result['error']['message'] ?? 'Unknown error'
        ]);
    } else {
        echo json_encode([
            'status' => 'ok',
            'message' => 'Supabase connection OK',
            'timestamp' => date('c')
        ]);
    }
} catch (Exception $e) {
    http_response_code(503);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
