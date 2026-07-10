-- ============================================================
-- AMOUR AFFAIRS — Migrations for an EXISTING database
-- MySQL 5.7+ / MariaDB 10.2+
--
-- Safe to run any number of times: every ALTER is guarded via
-- information_schema (dynamic prepared statement), and every
-- data backfill only touches rows still at their pre-migration
-- default. Run this instead of database.sql when the database
-- already exists; database.sql is for fresh installs only.
-- ============================================================

-- albums.film_youtube_id — film attached to a wedding / couple-shoot folder
SET @stmt := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `albums` ADD COLUMN `film_youtube_id` VARCHAR(20) DEFAULT NULL AFTER `description`',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'albums' AND COLUMN_NAME = 'film_youtube_id'
);
PREPARE migrate_albums_film FROM @stmt;
EXECUTE migrate_albums_film;
DEALLOCATE PREPARE migrate_albums_film;

-- testimonials.show_on_weddings — surface this review in the weddings-page marquee
SET @stmt := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `testimonials` ADD COLUMN `show_on_weddings` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_featured`',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'testimonials' AND COLUMN_NAME = 'show_on_weddings'
);
PREPARE migrate_testi_weddings FROM @stmt;
EXECUTE migrate_testi_weddings;
DEALLOCATE PREPARE migrate_testi_weddings;

-- Track whether show_on_weddings was just created, so its backfill
-- runs exactly once and never overrides later dashboard curation.
SET @weddings_was_added := (@stmt NOT LIKE 'DO 0');

-- Index for the weddings-marquee query (guarded the same way)
SET @stmt := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `testimonials` ADD KEY `idx_weddings` (`show_on_weddings`, `is_active`)',
    'DO 0'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'testimonials' AND INDEX_NAME = 'idx_weddings'
);
PREPARE migrate_testi_idx FROM @stmt;
EXECUTE migrate_testi_idx;
DEALLOCATE PREPARE migrate_testi_idx;

-- Backfill: surface existing reviews in the weddings marquee, but only
-- when the column was created by this run (otherwise the dashboard owns it)
SET @stmt := IF(
  @weddings_was_added,
  'UPDATE `testimonials` SET `show_on_weddings` = 1 WHERE `is_active` = 1',
  'DO 0'
);
PREPARE backfill_weddings FROM @stmt;
EXECUTE backfill_weddings;
DEALLOCATE PREPARE backfill_weddings;

-- testimonials.marquee_row — which testimonials-page marquee row a review
-- sits on (1, 2, 3, ...). 0 = unassigned; scroll direction is derived from
-- row position on the website, never stored.
SET @stmt := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `testimonials` ADD COLUMN `marquee_row` TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER `show_on_weddings`',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'testimonials' AND COLUMN_NAME = 'marquee_row'
);
PREPARE migrate_testi_row FROM @stmt;
EXECUTE migrate_testi_row;
DEALLOCATE PREPARE migrate_testi_row;

-- Backfill: spread unassigned reviews evenly across the three marquee rows.
-- Idempotent (only rows still at 0), so re-runs never reshuffle curated rows.
UPDATE `testimonials` SET `marquee_row` = ((`id` - 1) % 3) + 1 WHERE `marquee_row` = 0;

-- ────────────────────────────────────────────────────────────
-- leads.venue — venue captured from the enhanced website inquiry form
-- ────────────────────────────────────────────────────────────
SET @stmt := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `leads` ADD COLUMN `venue` VARCHAR(255) DEFAULT NULL AFTER `event_date`',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'venue'
);
PREPARE migrate_leads_venue FROM @stmt;
EXECUTE migrate_leads_venue;
DEALLOCATE PREPARE migrate_leads_venue;

-- leads.guest_count — approximate guest count (stored as text to allow ranges)
SET @stmt := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE `leads` ADD COLUMN `guest_count` VARCHAR(50) DEFAULT NULL AFTER `venue`',
    'DO 0'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'guest_count'
);
PREPARE migrate_leads_guests FROM @stmt;
EXECUTE migrate_leads_guests;
DEALLOCATE PREPARE migrate_leads_guests;

-- ────────────────────────────────────────────────────────────
-- New content tables (CREATE TABLE IF NOT EXISTS is idempotent).
-- These power the SEO content systems: FAQs, Guides, Case Studies,
-- Lead Magnets. Safe to run repeatedly.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `faqs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question` VARCHAR(500) NOT NULL,
  `answer` TEXT NOT NULL,
  `category` ENUM('before','during','after') NOT NULL DEFAULT 'before',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_faq_active` (`is_active`, `category`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `guides` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(200) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `excerpt` VARCHAR(500) DEFAULT NULL,
  `body` MEDIUMTEXT NOT NULL,
  `category` VARCHAR(80) NOT NULL DEFAULT 'Wedding Planning',
  `cover_path` VARCHAR(255) DEFAULT NULL,
  `author` VARCHAR(120) NOT NULL DEFAULT 'Amour Affairs',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `case_studies` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(200) NOT NULL,
  `couple` VARCHAR(200) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `location` VARCHAR(200) DEFAULT NULL,
  `event_date` DATE DEFAULT NULL,
  `event_type` VARCHAR(80) NOT NULL DEFAULT 'Wedding',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lead_magnets` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(200) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` VARCHAR(500) DEFAULT NULL,
  `file_path` VARCHAR(255) DEFAULT NULL,
  `cover_path` VARCHAR(255) DEFAULT NULL,
  `button_label` VARCHAR(80) NOT NULL DEFAULT 'Download Free Guide',
  `download_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_magnet_slug` (`slug`),
  KEY `idx_magnet_active` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- Studio Google rating settings — power the LocalBusiness
-- aggregateRating rich snippet, editable from the dashboard.
-- INSERT IGNORE only seeds them when absent, so it never
-- clobbers values the studio has already edited.
-- ────────────────────────────────────────────────────────────
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`, `setting_group`) VALUES
('studio_rating_value', '4.9', 'profile'),
('studio_review_count', '198', 'profile');

-- ────────────────────────────────────────────────────────────
-- Urgency / booking-availability notice (announcement bar + floating
-- badge). All dashboard-editable. INSERT IGNORE never clobbers values
-- the studio has already set.
-- ────────────────────────────────────────────────────────────
INSERT IGNORE INTO `settings` (`setting_key`, `setting_value`, `setting_group`) VALUES
('notice_enabled', '1', 'notice'),
('notice_message', 'Now booking 2026 & 2027 weddings — limited dates remain', 'notice'),
('notice_cta_label', 'Check your date', 'notice'),
('notice_cta_link', '/contact/', 'notice'),
('notice_bar_enabled', '1', 'notice'),
('notice_bar_position', 'top', 'notice'),
('notice_bg_color', '#2A1E16', 'notice'),
('notice_text_color', '#F5EDE2', 'notice'),
('notice_dismissible', '1', 'notice'),
('notice_badge_enabled', '1', 'notice'),
('notice_badge_text', 'Limited 2026 dates', 'notice');

-- ────────────────────────────────────────────────────────────
-- First-party website analytics — one row per page view. No raw
-- IP is stored: visitor_hash is a daily one-way hash so unique
-- visitors can be counted without retaining personal data.
-- CREATE TABLE IF NOT EXISTS is idempotent.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `page_views` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `path` VARCHAR(255) NOT NULL,
  `referrer_host` VARCHAR(255) DEFAULT NULL,
  `source` VARCHAR(120) DEFAULT NULL,
  `device` VARCHAR(16) DEFAULT NULL,
  `browser` VARCHAR(40) DEFAULT NULL,
  `country` VARCHAR(60) DEFAULT NULL,
  `session_id` CHAR(36) DEFAULT NULL,
  `visitor_hash` CHAR(40) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pv_created` (`created_at`),
  KEY `idx_pv_path` (`path`),
  KEY `idx_pv_source` (`source`),
  KEY `idx_pv_visitor` (`visitor_hash`),
  KEY `idx_pv_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
