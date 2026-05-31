<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Database Seed Script
 * ============================================================
 * Run this ONCE after importing database.sql to create the
 * initial admin user with a securely hashed password.
 *
 * Usage: php seed.php
 * Or visit: /api/seed.php?key=YOUR_SEED_KEY (one-time use)
 * ============================================================
 */

require_once __DIR__ . '/config.php';

// Security: one-time seed key (change this, then delete after use)
$SEED_KEY = 'amour_affairs_initial_setup_2026';

// If accessed via web, require seed key
if (php_sapi_name() !== 'cli') {
    $key = $_GET['key'] ?? '';
    if ($key !== $SEED_KEY) {
        http_response_code(403);
        echo json_encode(['error' => 'Invalid seed key']);
        exit;
    }
}

try {
    $db = getDB();

    // Check if admin already exists
    $stmt = $db->prepare('SELECT COUNT(*) as c FROM admin_users WHERE email = ?');
    $stmt->execute(['info@amouraffairs.in']);
    $count = $stmt->fetch()['c'];

    if ($count > 0) {
        echo json_encode(['message' => 'Admin user already exists. Seed skipped.']);
        exit;
    }

    // Seed list
    $usersToSeed = [
        [
            'email' => 'info@amouraffairs.in',
            'password' => 'REMOVED-SECRET',
            'name' => 'Amour Affairs',
            'role' => 'super_admin'
        ],
        [
            'email' => 'test@test.in',
            'password' => 'test123',
            'name' => 'Test User',
            'role' => 'admin'
        ]
    ];

    $seeded = [];
    $stmt = $db->prepare(
        'INSERT INTO admin_users (email, password_hash, name, role, is_active)
         VALUES (?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE name = VALUES(name)'
    );

    foreach ($usersToSeed as $u) {
        $hash = password_hash($u['password'], PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
        $stmt->execute([
            $u['email'],
            $hash,
            $u['name'],
            $u['role']
        ]);
        $seeded[] = $u['email'];
    }

    echo json_encode([
        'message' => 'Seeding completed successfully',
        'seeded_users' => $seeded,
        'note' => 'DELETE THIS FILE after seeding for security!'
    ]);

} catch (PDOException $e) {
    echo json_encode(['error' => 'Seed failed: ' . $e->getMessage()]);
}
