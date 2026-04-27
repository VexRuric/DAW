<?php
/**
 * lib/supabase.php
 * Lightweight PHP client for Supabase PostgREST API
 * No external dependencies - uses curl for HTTP requests
 */

require_once __DIR__ . '/env-loader.php';

class SupabaseClient {
    private $url;
    private $anonKey;
    private $serviceKey;
    private $requestTimeout = 10;

    /**
     * Initialize Supabase client
     * @param string $url Supabase project URL
     * @param string $anonKey Public anonymous API key
     * @param string|null $serviceKey Service role key (for admin operations)
     */
    public function __construct($url = null, $anonKey = null, $serviceKey = null) {
        $this->url = $url ?? ($_ENV['SUPABASE_URL'] ?? null);
        $this->anonKey = $anonKey ?? ($_ENV['SUPABASE_ANON_KEY'] ?? null);
        $this->serviceKey = $serviceKey ?? ($_ENV['SUPABASE_SERVICE_KEY'] ?? null);

        if (!$this->url || !$this->anonKey) {
            throw new Exception('Supabase URL and ANON_KEY are required');
        }
    }

    /**
     * Make HTTP request to Supabase API
     */
    private function request($method, $path, $data = null, $useServiceKey = false) {
        $url = rtrim($this->url, '/') . $path;
        $key = $useServiceKey ? $this->serviceKey : $this->anonKey;

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->requestTimeout);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

        // Set headers
        $headers = [
            'Content-Type: application/json',
            'apikey: ' . $key,
            'Authorization: Bearer ' . $key,
        ];

        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        // Set body for POST/PATCH/PUT
        if ($data !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            return [
                'data' => null,
                'error' => ['message' => 'Network error: ' . $curlError]
            ];
        }

        $decoded = json_decode($response, true);

        // Handle errors
        if ($httpCode >= 400) {
            return [
                'data' => null,
                'error' => $decoded ?? ['message' => "HTTP $httpCode"]
            ];
        }

        return [
            'data' => $decoded,
            'error' => null
        ];
    }

    /**
     * Build query string from filters array
     * Example: ['select' => 'id,name', 'order' => 'name.asc', 'limit' => 10]
     */
    private function buildQuery($filters = []) {
        if (empty($filters)) {
            return '';
        }

        $parts = [];
        foreach ($filters as $key => $value) {
            if (is_array($value)) {
                $value = implode(',', $value);
            }
            $parts[] = urlencode($key) . '=' . urlencode($value);
        }

        return '?' . implode('&', $parts);
    }

    /**
     * GET request to fetch data
     * @param string $table Table or view name
     * @param array $filters Query filters (select, order, limit, offset, filter conditions)
     * @param bool $useServiceKey Use service role key for authenticated requests
     * @return array ['data' => [...], 'error' => null] or ['data' => null, 'error' => {...}]
     */
    public function get($table, $filters = [], $useServiceKey = false) {
        $query = $this->buildQuery($filters);
        return $this->request('GET', '/rest/v1/' . $table . $query, null, $useServiceKey);
    }

    /**
     * POST request to create a record
     * @param string $table Table name
     * @param array $data Record data
     * @param bool $useServiceKey Use service role key
     * @return array Result with created record
     */
    public function create($table, $data, $useServiceKey = false) {
        return $this->request('POST', '/rest/v1/' . $table, $data, $useServiceKey);
    }

    /**
     * PATCH request to update records
     * @param string $table Table name
     * @param string $filter Filter condition (e.g., 'id=eq.123')
     * @param array $data Data to update
     * @param bool $useServiceKey Use service role key
     * @return array Result
     */
    public function update($table, $filter, $data, $useServiceKey = false) {
        $query = $this->buildQuery(['filter' => $filter]);
        return $this->request('PATCH', '/rest/v1/' . $table . $query, $data, $useServiceKey);
    }

    /**
     * DELETE request to delete records
     * @param string $table Table name
     * @param string $filter Filter condition (e.g., 'id=eq.123')
     * @param bool $useServiceKey Use service role key
     * @return array Result
     */
    public function delete($table, $filter, $useServiceKey = false) {
        $query = $this->buildQuery(['filter' => $filter]);
        return $this->request('DELETE', '/rest/v1/' . $table . $query, null, $useServiceKey);
    }

    /**
     * Upload a file to Supabase Storage
     * @param string $bucket Bucket name
     * @param string $path File path in bucket
     * @param string|resource $data File data or file resource
     * @param string $mimeType MIME type
     * @param bool $useServiceKey Use service role key
     * @return array Result with public URL
     */
    public function uploadFile($bucket, $path, $data, $mimeType = 'application/octet-stream', $useServiceKey = true) {
        $url = rtrim($this->url, '/') . '/storage/v1/object/' . $bucket . '/' . urlencode($path);
        $key = $useServiceKey ? $this->serviceKey : $this->anonKey;

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->requestTimeout);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');

        $headers = [
            'Content-Type: ' . $mimeType,
            'apikey: ' . $key,
            'Authorization: Bearer ' . $key,
        ];

        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError || $httpCode >= 400) {
            return [
                'data' => null,
                'error' => ['message' => $curlError ?: "HTTP $httpCode"]
            ];
        }

        $decoded = json_decode($response, true);
        $publicUrl = rtrim($this->url, '/') . '/storage/v1/object/public/' . $bucket . '/' . urlencode($path);

        return [
            'data' => ['path' => $path, 'url' => $publicUrl],
            'error' => null
        ];
    }

    /**
     * Get public URL for a file in storage
     */
    public function getPublicUrl($bucket, $path) {
        return rtrim($this->url, '/') . '/storage/v1/object/public/' . $bucket . '/' . urlencode($path);
    }

    /**
     * Test connectivity to Supabase
     */
    public function health() {
        $result = $this->get('');
        return $result['error'] === null;
    }
}

// Create global instance
$supabase = new SupabaseClient();
