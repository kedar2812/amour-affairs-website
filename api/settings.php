<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Settings API
 * ============================================================
 * GET  /api/settings.php                — Get all settings (public for profile/social)
 * GET  /api/settings.php?group=X        — Get settings by group
 * PUT  /api/settings.php                — Update settings (auth)
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/upload.php';

handleCORS();
setJSONHeaders();

$method = getMethod();

switch ($method) {

    case 'POST':
        // Image upload for settings-backed content (e.g. the About-page
        // founder photo). Stores the file and returns its path so the
        // caller can persist it as a `site_*` setting value via PUT.
        $auth = requireAuth();
        if (($_GET['action'] ?? '') !== 'upload') {
            sendError('Unknown action', 400);
        }
        $photo = processImageUpload('photo', 'site/');
        if (empty($photo)) {
            sendError('No file uploaded', 400);
        }
        sendJSON([
            'file_path'      => $photo['file_path'],
            'thumbnail_path' => $photo['thumbnail_path'] ?? null,
        ], 201);
        break;

    case 'GET':
        $db = getDB();
        $group = $_GET['group'] ?? '';

        if ($group) {
            $stmt = $db->prepare('SELECT setting_key, setting_value FROM settings WHERE setting_group = ?');
            $stmt->execute([$group]);
        } else {
            $stmt = $db->prepare('SELECT setting_key, setting_value, setting_group FROM settings ORDER BY setting_group, setting_key');
            $stmt->execute();
        }

        $rows = $stmt->fetchAll();
        $settings = [];
        foreach ($rows as $row) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }

        sendJSON(['settings' => $settings]);
        break;


    case 'PUT':
        $auth = requireAuth();
        $body = getJSONBody();

        if (empty($body) || !isset($body['settings'])) {
            sendError('settings object is required', 400);
        }

        $db = getDB();
        $stmt = $db->prepare(
            'INSERT INTO settings (setting_key, setting_value, setting_group)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)'
        );

        $updated = 0;
        foreach ($body['settings'] as $key => $value) {
            $key = sanitize($key);
            $value = sanitize($value);
            // Determine group from key prefix
            $group = 'general';
            if (strpos($key, 'studio_') === 0) $group = 'profile';
            elseif (strpos($key, 'social_') === 0) $group = 'social';
            elseif (strpos($key, 'hero_') === 0) $group = 'hero';
            elseif (strpos($key, 'seo_') === 0) $group = 'seo';
            elseif (strpos($key, 'site_') === 0) $group = 'site_content'; // dashboard-editable page copy

            $stmt->execute([$key, $value, $group]);
            $updated++;
        }

        auditLog('update', 'settings', null, ['count' => $updated], $auth['sub']);
        sendJSON(['message' => 'Settings updated', 'updated' => $updated]);
        break;

    default:
        sendError('Method not allowed', 405);
}
