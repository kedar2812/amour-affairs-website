<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — API Configuration
 * ============================================================
 * Central configuration for the PHP REST API.
 * All sensitive values should be updated for production.
 * ============================================================
 */

// ── Error Handling (disable display in production) ──
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// ── Timezone ──
date_default_timezone_set('Asia/Kolkata');

// ── Database Configuration ──
define('DB_HOST', 'localhost');
define('DB_NAME', 'amour_affairs_db');
define('DB_USER', 'root');           // Change for production
define('DB_PASS', '');               // Change for production
define('DB_CHARSET', 'utf8mb4');

// ── JWT Configuration ──
// IMPORTANT: Change this to a long random string in production (64+ chars)
define('JWT_SECRET', 'CHANGE_THIS_TO_A_SECURE_RANDOM_STRING_IN_PRODUCTION_64_CHARS_MINIMUM');
define('JWT_ACCESS_EXPIRY', 900);       // 15 minutes
define('JWT_REFRESH_EXPIRY', 604800);   // 7 days

// ── Upload Configuration ──
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('UPLOAD_URL_PREFIX', '/uploads/');
define('MAX_UPLOAD_SIZE', 15 * 1024 * 1024); // 15MB
define('WEBP_QUALITY', 82);
define('THUMBNAIL_MAX_WIDTH', 400);
define('THUMBNAIL_MAX_HEIGHT', 400);
define('ALLOWED_MIME_TYPES', [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]);

// ── Rate Limiting ──
define('RATE_LIMIT_AUTH_MAX', 5);        // Max login attempts
define('RATE_LIMIT_AUTH_WINDOW', 900);   // 15-minute window
define('RATE_LIMIT_API_MAX', 100);       // Max API calls per window
define('RATE_LIMIT_API_WINDOW', 60);     // 1-minute window

// ── CORS Configuration ──
// Add your actual domains here in production
define('ALLOWED_ORIGINS', [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8080', // local: static site served by PHP
    'http://localhost:8081', // local: static dashboard export served by PHP
    'https://www.amouraffairs.in',
    'https://amouraffairs.in',
    'https://admin.amouraffairs.in',
]);

// ── Security ──
define('BCRYPT_COST', 12);
define('CSRF_TOKEN_LENGTH', 32);


/**
 * Get PDO database connection (singleton pattern)
 */
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            DB_HOST, DB_NAME, DB_CHARSET
        );
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_FOUND_ROWS   => true,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log('Database connection failed: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed']);
            exit;
        }
    }
    return $pdo;
}


/**
 * Handle CORS headers
 */
function handleCORS(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origin, ALLOWED_ORIGINS, true)) {
        header("Access-Control-Allow-Origin: {$origin}");
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');

    // Handle preflight
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}


/**
 * Set JSON content type header
 */
function setJSONHeaders(): void {
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
}


/**
 * Get the request method
 */
function getMethod(): string {
    return strtoupper($_SERVER['REQUEST_METHOD']);
}


/**
 * Get parsed JSON body from request
 */
function getJSONBody(): array {
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendError('Invalid JSON body', 400);
    }
    return $data ?? [];
}


/**
 * Send a JSON success response
 */
function sendJSON(mixed $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}


/**
 * Send a JSON error response
 */
function sendError(string $message, int $status = 400): void {
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}


/**
 * Sanitize a string input (trim + strip tags)
 */
function sanitize(mixed $value): string {
    if ($value === null) return '';
    return htmlspecialchars(trim((string)$value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
}


/**
 * Validate email format
 */
function isValidEmail(string $email): bool {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}


/**
 * Get client IP address (handles proxies)
 */
function getClientIP(): string {
    $headers = ['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'];
    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ip = explode(',', $_SERVER[$header])[0];
            $ip = trim($ip);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return '0.0.0.0';
}


/**
 * Log an action to the audit log
 */
function auditLog(string $action, string $entityType, ?int $entityId = null, ?array $details = null, ?int $userId = null): void {
    try {
        $db = getDB();
        $stmt = $db->prepare('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $userId,
            $action,
            $entityType,
            $entityId,
            $details ? json_encode($details) : null,
            getClientIP()
        ]);
    } catch (PDOException $e) {
        error_log('Audit log error: ' . $e->getMessage());
    }
}


/**
 * Create upload directory if it doesn't exist
 */
function ensureUploadDir(string $subdir = ''): string {
    $dir = UPLOAD_DIR . $subdir;
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}
