<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Packages API
 * ============================================================
 * GET    /api/packages.php          — List packages (public)
 * GET    /api/packages.php?id=X     — Get single package
 * POST   /api/packages.php          — Create package (auth)
 * PUT    /api/packages.php?id=X     — Update package (auth)
 * DELETE /api/packages.php?id=X     — Delete package (auth)
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

handleCORS();
setJSONHeaders();

$method = getMethod();
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {

    case 'GET':
        $db = getDB();
        if ($id) {
            $stmt = $db->prepare('SELECT * FROM packages WHERE id = ?');
            $stmt->execute([$id]);
            $pkg = $stmt->fetch();
            if (!$pkg) sendError('Package not found', 404);
            $pkg['inclusions'] = json_decode($pkg['inclusions'] ?? '[]', true);
            $pkg['addons'] = json_decode($pkg['addons'] ?? '[]', true);
            $pkg['required_roles'] = json_decode($pkg['required_roles'] ?? '[]', true);
            sendJSON($pkg);
        }

        $category = $_GET['category'] ?? '';
        $activeOnly = !isset($_GET['all']);

        $where = [];
        $params = [];
        if ($activeOnly) { $where[] = 'is_active = 1'; }
        if ($category) { $where[] = 'category = ?'; $params[] = $category; }

        $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $stmt = $db->prepare("SELECT * FROM packages {$whereSQL} ORDER BY sort_order ASC, created_at DESC");
        $stmt->execute($params);
        $packages = $stmt->fetchAll();

        // Decode JSON fields
        foreach ($packages as &$pkg) {
            $pkg['inclusions'] = json_decode($pkg['inclusions'] ?? '[]', true);
            $pkg['addons'] = json_decode($pkg['addons'] ?? '[]', true);
            $pkg['required_roles'] = json_decode($pkg['required_roles'] ?? '[]', true);
        }

        sendJSON(['packages' => $packages, 'total' => count($packages)]);
        break;


    case 'POST':
        $auth = requireAuth();
        $body = getJSONBody();

        $name = sanitize($body['name'] ?? '');
        if (empty($name)) sendError('Package name is required', 400);

        $db = getDB();
        $stmt = $db->prepare(
            'INSERT INTO packages (name, category, price, description, inclusions, addons, required_roles, popularity, bookings_count, is_active, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $name,
            sanitize($body['category'] ?? 'Wedding'),
            (float)($body['price'] ?? 0),
            sanitize($body['description'] ?? ''),
            json_encode($body['inclusions'] ?? []),
            json_encode($body['addons'] ?? []),
            json_encode($body['required_roles'] ?? []),
            (int)($body['popularity'] ?? 0),
            (int)($body['bookings_count'] ?? 0),
            (int)($body['is_active'] ?? 1),
            (int)($body['sort_order'] ?? 0)
        ]);

        $newId = $db->lastInsertId();
        auditLog('create', 'packages', $newId, ['name' => $name], $auth['sub']);

        $stmt = $db->prepare('SELECT * FROM packages WHERE id = ?');
        $stmt->execute([$newId]);
        $pkg = $stmt->fetch();
        $pkg['inclusions'] = json_decode($pkg['inclusions'] ?? '[]', true);
        $pkg['addons'] = json_decode($pkg['addons'] ?? '[]', true);
        $pkg['required_roles'] = json_decode($pkg['required_roles'] ?? '[]', true);
        sendJSON($pkg, 201);
        break;


    case 'PUT':
        $auth = requireAuth();
        if (!$id) sendError('Package ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT id FROM packages WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) sendError('Package not found', 404);

        $body = getJSONBody();
        $fields = [];
        $params = [];

        $stringFields = ['name', 'category', 'description'];
        $numericFields = ['price', 'popularity', 'bookings_count', 'sort_order'];
        $boolFields = ['is_active'];
        $jsonFields = ['inclusions', 'addons', 'required_roles'];

        foreach ($stringFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = sanitize($body[$f]); }
        }
        foreach ($numericFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = $body[$f]; }
        }
        foreach ($boolFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = (int)$body[$f]; }
        }
        foreach ($jsonFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = json_encode($body[$f]); }
        }

        if (empty($fields)) sendError('No fields to update', 400);

        $params[] = $id;
        $stmt = $db->prepare('UPDATE packages SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        auditLog('update', 'packages', $id, $body, $auth['sub']);

        $stmt = $db->prepare('SELECT * FROM packages WHERE id = ?');
        $stmt->execute([$id]);
        $pkg = $stmt->fetch();
        $pkg['inclusions'] = json_decode($pkg['inclusions'] ?? '[]', true);
        $pkg['addons'] = json_decode($pkg['addons'] ?? '[]', true);
        $pkg['required_roles'] = json_decode($pkg['required_roles'] ?? '[]', true);
        sendJSON($pkg);
        break;


    case 'DELETE':
        $auth = requireAuth();
        if (!$id) sendError('Package ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT id FROM packages WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) sendError('Package not found', 404);

        $stmt = $db->prepare('DELETE FROM packages WHERE id = ?');
        $stmt->execute([$id]);

        auditLog('delete', 'packages', $id, null, $auth['sub']);
        sendJSON(['message' => 'Package deleted']);
        break;

    default:
        sendError('Method not allowed', 405);
}
