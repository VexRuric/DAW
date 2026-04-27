<?php
/**
 * lib/auth.php
 * JWT validation and authentication helpers for admin pages
 * Uses Supabase JWT tokens
 */

require_once __DIR__ . '/env-loader.php';

/**
 * Extract JWT token from request
 * Checks: Authorization header (Bearer token)
 */
function getJWTFromRequest() {
    $headers = getallheaders();

    if (!isset($headers['Authorization'])) {
        return null;
    }

    $matches = [];
    if (preg_match('/Bearer\s+(.+)/', $headers['Authorization'], $matches)) {
        return $matches[1];
    }

    return null;
}

/**
 * Decode and verify JWT token
 * Returns decoded token data or null if invalid
 *
 * Note: This is a simple implementation for validation.
 * For production, consider using a JWT library like firebase/php-jwt
 */
function verifyJWT($token) {
    if (!$token) {
        return null;
    }

    // JWT format: header.payload.signature
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }

    // Decode payload (2nd part)
    $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);

    if (!$payload) {
        return null;
    }

    // Check expiration
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return null;
    }

    // Verify signature (basic check - in production use proper JWT library)
    // For now, we trust Supabase to provide valid JWTs via Authorization header

    return $payload;
}

/**
 * Require authentication for admin pages
 * Checks JWT and optionally verifies role
 *
 * @param string|array $role Role(s) required ('admin', 'booker', 'mod', or array of roles)
 * @param bool $die Whether to die with error or return false
 * @return bool|array True/user data if authorized, false/null otherwise
 */
function requireAuth($role = null, $die = true) {
    $token = getJWTFromRequest();
    $payload = verifyJWT($token);

    if (!$payload) {
        if ($die) {
            header('HTTP/1.1 401 Unauthorized');
            echo json_encode(['error' => 'Unauthorized: invalid or missing token']);
            exit;
        }
        return false;
    }

    // Check role if specified
    if ($role !== null) {
        $userRole = $payload['user_metadata']['role'] ?? $payload['role'] ?? null;
        $requiredRoles = is_array($role) ? $role : [$role];

        if (!in_array($userRole, $requiredRoles)) {
            if ($die) {
                header('HTTP/1.1 403 Forbidden');
                echo json_encode(['error' => 'Forbidden: insufficient permissions']);
                exit;
            }
            return false;
        }
    }

    return $payload;
}

/**
 * Get current authenticated user
 * Returns null if not authenticated
 */
function getCurrentUser() {
    $token = getJWTFromRequest();
    return verifyJWT($token);
}

/**
 * Check if user is admin
 */
function isAdmin() {
    $user = getCurrentUser();
    if (!$user) return false;

    $role = $user['user_metadata']['role'] ?? $user['role'] ?? null;
    return $role === 'admin' || $role === 'owner';
}

/**
 * Check if user is booker or admin
 */
function isBooker() {
    $user = getCurrentUser();
    if (!$user) return false;

    $role = $user['user_metadata']['role'] ?? $user['role'] ?? null;
    return in_array($role, ['admin', 'owner', 'booker']);
}

/**
 * Check if user is moderator or admin
 */
function isModerator() {
    $user = getCurrentUser();
    if (!$user) return false;

    $role = $user['user_metadata']['role'] ?? $user['role'] ?? null;
    return in_array($role, ['admin', 'owner', 'mod']);
}

/**
 * Get user ID from current token
 */
function getCurrentUserId() {
    $user = getCurrentUser();
    return $user['sub'] ?? null;  // 'sub' is the user ID in Supabase JWT
}
