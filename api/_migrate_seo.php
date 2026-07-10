<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — One-time SEO migration runner
 * ============================================================
 * Idempotent. Adds leads.venue / leads.guest_count and creates
 * the faqs / guides / case_studies / lead_magnets tables.
 *
 * Run ONCE over HTTPS with the token, then DELETE this file:
 *   https://amouraffairs.in/api/_migrate_seo.php?token=THE_TOKEN
 *
 * Uses config.php → getDB(), so it picks up the server's real DB
 * credentials from api/config.secrets.php. Safe to re-run.
 * ============================================================
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

// Simple shared-secret guard so the endpoint can't be triggered casually.
$TOKEN = 'aa-seo-migrate-2026-9f3a1c8b7e';
if (($_GET['token'] ?? '') !== $TOKEN) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$db = getDB();
$actions = [];

function columnExists(PDO $db, string $table, string $col): bool {
    $stmt = $db->prepare(
        'SELECT COUNT(*) AS c FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->execute([$table, $col]);
    $row = $stmt->fetch();
    return (int)$row['c'] > 0;
}

try {
    // ── leads.venue ──
    if (!columnExists($db, 'leads', 'venue')) {
        $db->exec('ALTER TABLE `leads` ADD COLUMN `venue` VARCHAR(255) DEFAULT NULL AFTER `event_date`');
        $actions[] = 'Added column leads.venue';
    } else {
        $actions[] = 'leads.venue already present';
    }

    // ── leads.guest_count ──
    if (!columnExists($db, 'leads', 'guest_count')) {
        $db->exec('ALTER TABLE `leads` ADD COLUMN `guest_count` VARCHAR(50) DEFAULT NULL AFTER `venue`');
        $actions[] = 'Added column leads.guest_count';
    } else {
        $actions[] = 'leads.guest_count already present';
    }

    // ── faqs ──
    $db->exec(
        'CREATE TABLE IF NOT EXISTS `faqs` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          `question` VARCHAR(500) NOT NULL,
          `answer` TEXT NOT NULL,
          `category` ENUM(\'before\',\'during\',\'after\') NOT NULL DEFAULT \'before\',
          `is_active` TINYINT(1) NOT NULL DEFAULT 1,
          `sort_order` INT NOT NULL DEFAULT 0,
          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          KEY `idx_faq_active` (`is_active`, `category`, `sort_order`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $actions[] = 'Ensured table faqs';

    // ── guides ──
    $db->exec(
        'CREATE TABLE IF NOT EXISTS `guides` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          `slug` VARCHAR(200) NOT NULL,
          `title` VARCHAR(255) NOT NULL,
          `excerpt` VARCHAR(500) DEFAULT NULL,
          `body` MEDIUMTEXT NOT NULL,
          `category` VARCHAR(80) NOT NULL DEFAULT \'Wedding Planning\',
          `cover_path` VARCHAR(255) DEFAULT NULL,
          `author` VARCHAR(120) NOT NULL DEFAULT \'Amour Affairs\',
          `read_minutes` INT UNSIGNED NOT NULL DEFAULT 5,
          `meta_title` VARCHAR(255) DEFAULT NULL,
          `meta_description` VARCHAR(320) DEFAULT NULL,
          `is_published` TINYINT(1) NOT NULL DEFAULT 0,
          `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
          `sort_order` INT NOT NULL DEFAULT 0,
          `published_at` DATETIME DEFAULT NULL,
          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          UNIQUE KEY `uk_guide_slug` (`slug`),
          KEY `idx_guide_pub` (`is_published`, `sort_order`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $actions[] = 'Ensured table guides';

    // ── case_studies ──
    $db->exec(
        'CREATE TABLE IF NOT EXISTS `case_studies` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          `slug` VARCHAR(200) NOT NULL,
          `couple` VARCHAR(200) NOT NULL,
          `title` VARCHAR(255) NOT NULL,
          `location` VARCHAR(200) DEFAULT NULL,
          `event_date` DATE DEFAULT NULL,
          `event_type` VARCHAR(80) NOT NULL DEFAULT \'Wedding\',
          `summary` VARCHAR(500) DEFAULT NULL,
          `body` MEDIUMTEXT NOT NULL,
          `services` VARCHAR(300) DEFAULT NULL,
          `guest_count` VARCHAR(50) DEFAULT NULL,
          `cover_path` VARCHAR(255) DEFAULT NULL,
          `gallery` JSON DEFAULT NULL,
          `film_youtube_id` VARCHAR(20) DEFAULT NULL,
          `meta_title` VARCHAR(255) DEFAULT NULL,
          `meta_description` VARCHAR(320) DEFAULT NULL,
          `is_published` TINYINT(1) NOT NULL DEFAULT 0,
          `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
          `sort_order` INT NOT NULL DEFAULT 0,
          `published_at` DATETIME DEFAULT NULL,
          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          UNIQUE KEY `uk_case_slug` (`slug`),
          KEY `idx_case_pub` (`is_published`, `sort_order`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $actions[] = 'Ensured table case_studies';

    // ── lead_magnets ──
    $db->exec(
        'CREATE TABLE IF NOT EXISTS `lead_magnets` (
          `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
          `slug` VARCHAR(200) NOT NULL,
          `title` VARCHAR(255) NOT NULL,
          `description` VARCHAR(500) DEFAULT NULL,
          `file_path` VARCHAR(255) DEFAULT NULL,
          `cover_path` VARCHAR(255) DEFAULT NULL,
          `button_label` VARCHAR(80) NOT NULL DEFAULT \'Download Free Guide\',
          `download_count` INT UNSIGNED NOT NULL DEFAULT 0,
          `is_active` TINYINT(1) NOT NULL DEFAULT 1,
          `sort_order` INT NOT NULL DEFAULT 0,
          `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`),
          UNIQUE KEY `uk_magnet_slug` (`slug`),
          KEY `idx_magnet_active` (`is_active`, `sort_order`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $actions[] = 'Ensured table lead_magnets';

    echo json_encode([
        'ok' => true,
        'actions' => $actions,
        'note' => 'Migration complete. DELETE this file from the server now (api/_migrate_seo.php).',
    ], JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
        'actions_done' => $actions,
    ], JSON_PRETTY_PRINT);
}
