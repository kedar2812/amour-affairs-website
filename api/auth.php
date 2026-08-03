<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Authentication Endpoint
 * ============================================================
 * POST /api/auth.php?action=login    — Login
 * POST /api/auth.php?action=refresh  — Refresh token
 * POST /api/auth.php?action=logout   — Logout
 * GET  /api/auth.php?action=me       — Get current user
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

handleCORS();
setJSONHeaders();

$action = $_GET['action'] ?? '';

switch ($action) {

    // ─────────────────────────────────────
    // LOGIN
    // ─────────────────────────────────────
    case 'login':
        if (getMethod() !== 'POST') sendError('Method not allowed', 405);

        // Rate limit: 5 attempts per 15 minutes
        checkRateLimit('auth_login', RATE_LIMIT_AUTH_MAX, RATE_LIMIT_AUTH_WINDOW);

        $body = getJSONBody();
        $email = trim($body['email'] ?? '');
        $password = $body['password'] ?? '';

        if (empty($email) || empty($password)) {
            sendError('Email and password are required', 400);
        }

        if (!isValidEmail($email)) {
            sendError('Invalid email format', 400);
        }

        $db = getDB();

        // Check if account is locked
        $stmt = $db->prepare('SELECT id, email, name, role, password_hash, is_active, login_attempts, locked_until FROM admin_users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            // Constant-time comparison to prevent timing attacks
            password_verify($password, '$2y$12$dummyhashforsecuritypurposes000000000000000000000000');
            sendError('Invalid email or password', 401);
        }

        if (!$user['is_active']) {
            sendError('Account is disabled. Contact the administrator.', 403);
        }

        // Check lock
        if ($user['locked_until'] && strtotime($user['locked_until']) > time()) {
            $remaining = ceil((strtotime($user['locked_until']) - time()) / 60);
            sendError("Account temporarily locked. Try again in {$remaining} minutes.", 423);
        }

        // Verify password
        if (!password_verify($password, $user['password_hash'])) {
            // Increment login attempts
            $attempts = $user['login_attempts'] + 1;
            $lockUntil = null;

            if ($attempts >= 5) {
                // Lock for 15 minutes after 5 failed attempts
                $lockUntil = date('Y-m-d H:i:s', time() + 900);
            }

            $stmt = $db->prepare('UPDATE admin_users SET login_attempts = ?, locked_until = ? WHERE id = ?');
            $stmt->execute([$attempts, $lockUntil, $user['id']]);

            auditLog('login_failed', 'admin_users', $user['id'], ['attempts' => $attempts]);
            sendError('Invalid email or password', 401);
        }

        // Successful login — reset attempts
        $stmt = $db->prepare('UPDATE admin_users SET login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?');
        $stmt->execute([$user['id']]);

        // Reset rate limit
        resetRateLimit('auth_login');

        // Generate tokens
        $accessToken = createAccessToken($user['id'], $user['email'], $user['role']);
        $refreshToken = createRefreshToken($user['id']);

        auditLog('login_success', 'admin_users', $user['id']);

        sendJSON([
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'name' => $user['name'],
                'role' => $user['role'],
            ],
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'expires_in' => JWT_ACCESS_EXPIRY,
        ]);
        break;


    // ─────────────────────────────────────
    // REFRESH TOKEN
    // ─────────────────────────────────────
    case 'refresh':
        if (getMethod() !== 'POST') sendError('Method not allowed', 405);

        $body = getJSONBody();
        $refreshToken = $body['refresh_token'] ?? '';

        if (empty($refreshToken)) {
            sendError('Refresh token is required', 400);
        }

        $userId = validateRefreshToken($refreshToken);
        if (!$userId) {
            sendError('Invalid or expired refresh token', 401);
        }

        // Get user data
        $db = getDB();
        $stmt = $db->prepare('SELECT id, email, name, role, is_active FROM admin_users WHERE id = ?');
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user || !$user['is_active']) {
            sendError('Account disabled or not found', 401);
        }

        // Issue new token pair
        $accessToken = createAccessToken($user['id'], $user['email'], $user['role']);
        $newRefreshToken = createRefreshToken($user['id']);

        sendJSON([
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'name' => $user['name'],
                'role' => $user['role'],
            ],
            'access_token' => $accessToken,
            'refresh_token' => $newRefreshToken,
            'expires_in' => JWT_ACCESS_EXPIRY,
        ]);
        break;


    // ─────────────────────────────────────
    // LOGOUT
    // ─────────────────────────────────────
    case 'logout':
        if (getMethod() !== 'POST') sendError('Method not allowed', 405);

        $payload = requireAuth();
        revokeAllTokens($payload['sub']);
        auditLog('logout', 'admin_users', $payload['sub']);
        sendJSON(['message' => 'Logged out successfully']);
        break;


    // ─────────────────────────────────────
    // GET CURRENT USER
    // ─────────────────────────────────────
    case 'me':
        if (getMethod() !== 'GET') sendError('Method not allowed', 405);

        $payload = requireAuth();
        $db = getDB();
        $stmt = $db->prepare('SELECT id, email, name, role, last_login, created_at FROM admin_users WHERE id = ?');
        $stmt->execute([$payload['sub']]);
        $user = $stmt->fetch();

        if (!$user) sendError('User not found', 404);

        sendJSON(['user' => $user]);
        break;


    // ─────────────────────────────────────
    // CHANGE PASSWORD  (authenticated user changes their own password)
    // ─────────────────────────────────────
    case 'change-password':
        if (getMethod() !== 'POST') sendError('Method not allowed', 405);

        $payload = requireAuth();

        // Throttle guessing of the current password even for a logged-in session.
        checkRateLimit('change_password_' . $payload['sub'], 10, 900);

        $body = getJSONBody();
        $current = (string)($body['current_password'] ?? '');
        $new     = (string)($body['new_password'] ?? '');

        if ($current === '' || $new === '') {
            sendError('Current and new password are required', 400);
        }
        if (strlen($new) < 8) {
            sendError('New password must be at least 8 characters', 400);
        }
        if (strlen($new) > 200) {
            sendError('New password is too long', 400);
        }

        $db = getDB();
        $stmt = $db->prepare('SELECT id, password_hash FROM admin_users WHERE id = ?');
        $stmt->execute([$payload['sub']]);
        $user = $stmt->fetch();
        if (!$user) sendError('User not found', 404);

        if (!password_verify($current, $user['password_hash'])) {
            auditLog('password_change_failed', 'admin_users', $user['id']);
            sendError('Current password is incorrect', 401);
        }
        if (password_verify($new, $user['password_hash'])) {
            sendError('New password must be different from your current one', 400);
        }

        $hash = password_hash($new, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = $db->prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?');
        $stmt->execute([$hash, $user['id']]);

        auditLog('password_changed', 'admin_users', $user['id']);
        sendJSON(['message' => 'Password updated successfully']);
        break;


    default:
        sendError('Invalid action. Use: login, refresh, logout, me, change-password', 400);
}
