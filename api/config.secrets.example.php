<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Server Secrets (TEMPLATE)
 * ============================================================
 * COPY this file to  api/config.secrets.php  on the server and fill in
 * the real values. config.secrets.php is gitignored and must NEVER be
 * committed. config.php loads it automatically before reading these via
 * getenv(), so no real OS environment variables are required.
 *
 * Generate a strong JWT secret (64+ chars), e.g. on any machine:
 *   php -r "echo bin2hex(random_bytes(48));"
 * ============================================================
 */

// 64+ random characters. If this is wrong/unset the API refuses to run on a live host.
putenv('AA_JWT_SECRET=PASTE_A_64_CHAR_RANDOM_STRING_HERE');

// MySQL credentials from the StackCP "MySQL Databases" panel.
putenv('AA_DB_HOST=localhost');
putenv('AA_DB_NAME=your_db_name');
putenv('AA_DB_USER=your_db_user');
putenv('AA_DB_PASS=your_db_password');

// Outgoing email (lead-magnet checklist). Google Workspace SMTP with an App
// Password for info@amouraffairs.in (Google Account → Security → 2-Step
// Verification → App passwords). Leave unset and emails are simply skipped.
putenv('AA_SMTP_HOST=smtp.gmail.com');
putenv('AA_SMTP_PORT=587');
putenv('AA_SMTP_USER=info@amouraffairs.in');
putenv('AA_SMTP_PASS=PASTE_16_CHAR_APP_PASSWORD');
putenv('AA_SMTP_FROM=info@amouraffairs.in');
putenv('AA_SMTP_FROM_NAME=Amour Affairs');
