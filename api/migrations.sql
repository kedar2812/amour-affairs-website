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

COMMIT;
