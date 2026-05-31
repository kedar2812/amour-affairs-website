-- ============================================================
-- AMOUR AFFAIRS — Complete Database Schema
-- MySQL 5.7+ / MariaDB 10.3+
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+05:30";

-- ────────────────────────────────────────────────────────────
-- 1. ADMIN USERS (Authentication)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `role` ENUM('super_admin','admin','editor') NOT NULL DEFAULT 'admin',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login` DATETIME DEFAULT NULL,
  `login_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `locked_until` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default admin user (password: REMOVED-SECRET — will be hashed by seed script)
-- INSERT handled by api/seed.php

-- ────────────────────────────────────────────────────────────
-- 2. REFRESH TOKENS (Secure Token Rotation)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `token_hash` VARCHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_token` (`token_hash`),
  KEY `idx_expires` (`expires_at`),
  CONSTRAINT `fk_refresh_user` FOREIGN KEY (`user_id`) REFERENCES `admin_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 3. GALLERY IMAGES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `gallery_images` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category` ENUM('wedding','couple_shoot','film','premium_album','general') NOT NULL,
  `title` VARCHAR(255) DEFAULT NULL,
  `caption` VARCHAR(500) DEFAULT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `thumbnail_path` VARCHAR(500) DEFAULT NULL,
  `original_filename` VARCHAR(255) DEFAULT NULL,
  `file_size` INT UNSIGNED DEFAULT NULL,
  `width` SMALLINT UNSIGNED DEFAULT NULL,
  `height` SMALLINT UNSIGNED DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `uploaded_by` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`, `is_active`, `sort_order`),
  KEY `idx_featured` (`is_featured`, `is_active`),
  CONSTRAINT `fk_gallery_user` FOREIGN KEY (`uploaded_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 4. PACKAGES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `packages` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(50) NOT NULL DEFAULT 'Wedding',
  `price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `description` TEXT DEFAULT NULL,
  `inclusions` JSON DEFAULT NULL,
  `addons` JSON DEFAULT NULL,
  `required_roles` JSON DEFAULT NULL,
  `popularity` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `bookings_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`, `is_active`),
  KEY `idx_active` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 5. TEAM MEMBERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `team_members` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `role` VARCHAR(100) NOT NULL,
  `status` ENUM('Available','On Shoot','Editing','On Leave') NOT NULL DEFAULT 'Available',
  `current_assignment` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `avatar_initials` VARCHAR(5) DEFAULT NULL,
  `photo_path` VARCHAR(500) DEFAULT NULL,
  `bio` TEXT DEFAULT NULL,
  `skills` JSON DEFAULT NULL,
  `equipment` JSON DEFAULT NULL,
  `rating` DECIMAL(2,1) NOT NULL DEFAULT 0.0,
  `on_time_delivery_rate` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `month_earnings` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `upcoming_shoots_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `join_date` DATE DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_active` (`is_active`, `sort_order`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 6. TESTIMONIALS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `testimonials` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_name` VARCHAR(150) NOT NULL,
  `event_type` VARCHAR(50) DEFAULT 'Wedding',
  `event_date` DATE DEFAULT NULL,
  `review_text` TEXT NOT NULL,
  `rating` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `photo_path` VARCHAR(500) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_active` (`is_active`, `sort_order`),
  KEY `idx_featured` (`is_featured`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 7. SETTINGS (Key-Value Store)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT DEFAULT NULL,
  `setting_group` VARCHAR(50) NOT NULL DEFAULT 'general',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_key` (`setting_key`),
  KEY `idx_group` (`setting_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default settings
INSERT INTO `settings` (`setting_key`, `setting_value`, `setting_group`) VALUES
('studio_name', 'Amour Affairs', 'profile'),
('studio_tagline', 'Photography Studio', 'profile'),
('studio_email', 'info@amouraffairs.in', 'profile'),
('studio_phone', '+91 9921000052', 'profile'),
('studio_whatsapp', '919921000052', 'profile'),
('studio_address', 'Rowshni Bungalow, 5, Finance Road, Opp. Ministry of Defence, Agarkar Nagar, Pune, Maharashtra — 411001, India', 'profile'),
('social_instagram', 'https://www.instagram.com/amouraffairs/', 'social'),
('social_facebook', 'https://www.facebook.com/memoriesbyamouraffairs/', 'social'),
('social_youtube', 'https://www.youtube.com/channel/UCYGQScVZ25nK3Ti-O-Xuo4g', 'social'),
('social_pinterest', 'https://in.pinterest.com/amouraffairs/', 'social'),
('social_vimeo', 'https://vimeo.com/amouraffairs', 'social'),
('hero_stat_weddings', '500+', 'hero'),
('hero_stat_years', '15+', 'hero'),
('hero_stat_couples', '1000+', 'hero'),
('hero_headline', 'Beyond the moment, we capture the eternal.', 'hero'),
('hero_description', 'Pune''s most celebrated wedding photographers and filmmakers. We immortalize every stolen glance, every teardrop of joy — crafting cinematic love stories that endure a lifetime.', 'hero');

-- ────────────────────────────────────────────────────────────
-- 8. CLIENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clients` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `whatsapp` VARCHAR(30) DEFAULT NULL,
  `instagram` VARCHAR(255) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `type` ENUM('Wedding','Corporate','Individual') NOT NULL DEFAULT 'Wedding',
  `total_bookings` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_spend` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `last_shoot_date` DATE DEFAULT NULL,
  `rating` DECIMAL(2,1) NOT NULL DEFAULT 0.0,
  `tags` JSON DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_name` (`name`(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 9. BOOKINGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_ref` VARCHAR(20) NOT NULL,
  `client_id` INT UNSIGNED DEFAULT NULL,
  `client_name` VARCHAR(200) NOT NULL,
  `event_type` VARCHAR(50) NOT NULL DEFAULT 'Wedding',
  `date_start` DATETIME NOT NULL,
  `date_end` DATETIME NOT NULL,
  `venue` VARCHAR(255) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `package_id` INT UNSIGNED DEFAULT NULL,
  `package_name` VARCHAR(150) DEFAULT NULL,
  `team_assigned` JSON DEFAULT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('Pending','Confirmed','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  `notes` TEXT DEFAULT NULL,
  `timeline` JSON DEFAULT NULL,
  `payment_total` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_due` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ref` (`booking_ref`),
  KEY `idx_client` (`client_id`),
  KEY `idx_status` (`status`),
  KEY `idx_date` (`date_start`),
  CONSTRAINT `fk_booking_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_booking_package` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 10. LEADS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `leads` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `lead_ref` VARCHAR(20) NOT NULL,
  `client_name` VARCHAR(200) NOT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `instagram` VARCHAR(255) DEFAULT NULL,
  `event_type` VARCHAR(50) NOT NULL DEFAULT 'Wedding',
  `event_date` DATE DEFAULT NULL,
  `budget_range` VARCHAR(100) DEFAULT NULL,
  `source` ENUM('Instagram','WhatsApp','Google','Referral','Website','Other') NOT NULL DEFAULT 'Website',
  `stage` ENUM('New Inquiry','Contacted','Consultation Scheduled','Proposal Sent','Won','Lost') NOT NULL DEFAULT 'New Inquiry',
  `assigned_to` INT UNSIGNED DEFAULT NULL,
  `last_activity` DATETIME DEFAULT NULL,
  `moved_to_stage_at` DATETIME DEFAULT NULL,
  `notes` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ref` (`lead_ref`),
  KEY `idx_stage` (`stage`),
  KEY `idx_source` (`source`),
  KEY `idx_assigned` (`assigned_to`),
  CONSTRAINT `fk_lead_team` FOREIGN KEY (`assigned_to`) REFERENCES `team_members` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 11. INVOICES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `invoice_ref` VARCHAR(20) NOT NULL,
  `client_id` INT UNSIGNED DEFAULT NULL,
  `client_name` VARCHAR(200) NOT NULL,
  `booking_id` INT UNSIGNED DEFAULT NULL,
  `booking_ref` VARCHAR(20) DEFAULT NULL,
  `issue_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('Paid','Partially Paid','Pending','Overdue') NOT NULL DEFAULT 'Pending',
  `items` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ref` (`invoice_ref`),
  KEY `idx_client` (`client_id`),
  KEY `idx_booking` (`booking_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `fk_invoice_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoice_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 12. TRANSACTIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `transaction_ref` VARCHAR(20) NOT NULL,
  `date` DATETIME NOT NULL,
  `client_id` INT UNSIGNED DEFAULT NULL,
  `client_name` VARCHAR(200) NOT NULL,
  `booking_id` INT UNSIGNED DEFAULT NULL,
  `booking_ref` VARCHAR(20) DEFAULT NULL,
  `method` ENUM('UPI','Bank Transfer','Cash','Card') NOT NULL DEFAULT 'UPI',
  `amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ref` (`transaction_ref`),
  KEY `idx_client` (`client_id`),
  KEY `idx_booking` (`booking_id`),
  KEY `idx_date` (`date`),
  CONSTRAINT `fk_txn_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_txn_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 13. RATE LIMITING (Brute force protection)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `rate_limits` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ip_address` VARCHAR(45) NOT NULL,
  `endpoint` VARCHAR(100) NOT NULL,
  `attempts` INT UNSIGNED NOT NULL DEFAULT 1,
  `window_start` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ip_endpoint` (`ip_address`, `endpoint`, `window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ────────────────────────────────────────────────────────────
-- 14. AUDIT LOG (Track all admin actions)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `action` VARCHAR(50) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT UNSIGNED DEFAULT NULL,
  `details` JSON DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_entity` (`entity_type`, `entity_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
