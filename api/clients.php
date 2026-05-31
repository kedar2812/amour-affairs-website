<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Clients API
 * ============================================================
 * All endpoints require authentication.
 * GET    /api/clients.php           — List clients
 * GET    /api/clients.php?id=X      — Get single
 * POST   /api/clients.php           — Create client
 * PUT    /api/clients.php?id=X      — Update client
 * DELETE /api/clients.php?id=X      — Delete client
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
        $auth = requireAuth();
        $db = getDB();

        if ($id) {
            $stmt = $db->prepare('SELECT * FROM clients WHERE id = ?');
            $stmt->execute([$id]);
            $client = $stmt->fetch();
            if (!$client) sendError('Client not found', 404);
            $client['tags'] = json_decode($client['tags'] ?? '[]', true);
            sendJSON($client);
        }

        $type = $_GET['type'] ?? '';
        $search = $_GET['search'] ?? '';
        $where = [];
        $params = [];

        if ($type) { $where[] = 'type = ?'; $params[] = $type; }
        if ($search) { $where[] = '(name LIKE ? OR email LIKE ? OR phone LIKE ?)'; $s = "%{$search}%"; $params = array_merge($params, [$s, $s, $s]); }

        $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $stmt = $db->prepare("SELECT * FROM clients {$whereSQL} ORDER BY created_at DESC");
        $stmt->execute($params);
        $clients = $stmt->fetchAll();
        foreach ($clients as &$c) {
            $c['tags'] = json_decode($c['tags'] ?? '[]', true);
        }
        sendJSON(['clients' => $clients, 'total' => count($clients)]);
        break;


    case 'POST':
        $auth = requireAuth();
        $body = getJSONBody();

        $name = sanitize($body['name'] ?? '');
        if (empty($name)) sendError('Client name is required', 400);

        $db = getDB();
        $stmt = $db->prepare(
            'INSERT INTO clients (name, phone, email, whatsapp, instagram, city, type, total_bookings, total_spend, last_shoot_date, rating, tags, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $name,
            sanitize($body['phone'] ?? ''),
            sanitize($body['email'] ?? ''),
            sanitize($body['whatsapp'] ?? ''),
            sanitize($body['instagram'] ?? ''),
            sanitize($body['city'] ?? ''),
            sanitize($body['type'] ?? 'Wedding'),
            (int)($body['total_bookings'] ?? 0),
            (float)($body['total_spend'] ?? 0),
            $body['last_shoot_date'] ?? null,
            (float)($body['rating'] ?? 0),
            json_encode($body['tags'] ?? []),
            sanitize($body['notes'] ?? '')
        ]);

        $newId = $db->lastInsertId();
        auditLog('create', 'clients', $newId, ['name' => $name], $auth['sub']);

        $stmt = $db->prepare('SELECT * FROM clients WHERE id = ?');
        $stmt->execute([$newId]);
        $client = $stmt->fetch();
        $client['tags'] = json_decode($client['tags'] ?? '[]', true);
        sendJSON($client, 201);
        break;


    case 'PUT':
        $auth = requireAuth();
        if (!$id) sendError('Client ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT id FROM clients WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) sendError('Client not found', 404);

        $body = getJSONBody();
        $fields = [];
        $params = [];

        $stringFields = ['name', 'phone', 'email', 'whatsapp', 'instagram', 'city', 'type', 'notes'];
        $numericFields = ['total_bookings', 'total_spend', 'rating'];
        $dateFields = ['last_shoot_date'];
        $jsonFields = ['tags'];

        foreach ($stringFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = sanitize($body[$f]); }
        }
        foreach ($numericFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = $body[$f]; }
        }
        foreach ($dateFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = $body[$f]; }
        }
        foreach ($jsonFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = json_encode($body[$f]); }
        }

        if (empty($fields)) sendError('No fields to update', 400);

        $params[] = $id;
        $stmt = $db->prepare('UPDATE clients SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        auditLog('update', 'clients', $id, $body, $auth['sub']);

        $stmt = $db->prepare('SELECT * FROM clients WHERE id = ?');
        $stmt->execute([$id]);
        $client = $stmt->fetch();
        $client['tags'] = json_decode($client['tags'] ?? '[]', true);
        sendJSON($client);
        break;


    case 'DELETE':
        $auth = requireAuth();
        if (!$id) sendError('Client ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT id FROM clients WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) sendError('Client not found', 404);

        $stmt = $db->prepare('DELETE FROM clients WHERE id = ?');
        $stmt->execute([$id]);

        auditLog('delete', 'clients', $id, null, $auth['sub']);
        sendJSON(['message' => 'Client deleted']);
        break;

    default:
        sendError('Method not allowed', 405);
}
