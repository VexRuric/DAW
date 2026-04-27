<?php
/**
 * lib/env-loader.php
 * Load environment variables from .env files
 */

function loadEnv($filePath) {
    if (!file_exists($filePath)) {
        throw new Exception("Env file not found: $filePath");
    }

    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') === false || strpos($line, '#') === 0) {
            continue;
        }

        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);

        // Remove quotes if present
        if ((strpos($value, '"') === 0 && strrpos($value, '"') === strlen($value) - 1) ||
            (strpos($value, "'") === 0 && strrpos($value, "'") === strlen($value) - 1)) {
            $value = substr($value, 1, -1);
        }

        $_ENV[$key] = $value;
    }
}

// Load environment variables
$envFile = __DIR__ . '/../.env.local';
if (file_exists($envFile)) {
    loadEnv($envFile);
}

// Also try to load from Next.js .env.local if main env is incomplete
if (!isset($_ENV['SUPABASE_ANON_KEY'])) {
    $nextEnvFile = __DIR__ . '/../daw-site/.env.local';
    if (file_exists($nextEnvFile)) {
        $content = file_get_contents($nextEnvFile);
        if (preg_match('/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/', $content, $matches)) {
            $_ENV['SUPABASE_ANON_KEY'] = trim($matches[1]);
        }
        if (preg_match('/NEXT_PUBLIC_SUPABASE_URL=(.+)/', $content, $matches)) {
            $_ENV['SUPABASE_URL'] = trim($matches[1]);
        }
    }
}
