<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Clients API
 * ============================================================
 * All endpoints require authentication.
 * GET    /api/clients.php                      — List clients
 * GET    /api/clients.php?id=X                 — Get single
 * GET    /api/clients.php?id=X&action=impact   — What a delete would touch
 * POST   /api/clients.php                      — Create client
 * PUT    /api/clients.php?id=X                 — Update client
 * DELETE /api/clients.php?id=X&mode=keep|all   — Delete client
 *
 * Delete modes:
 *   keep (default) — removes the client record only. Bookings, invoices and
 *                    transactions stay in the books with client_id detached;
 *                    each carries its own client_name, so history stays
 *                    readable. This is what the FKs already do (SET NULL).
 *   all            — also permanently deletes that client's bookings,
 *                    invoices and transactions.
 * Either way the CRM special dates and greeting log go with the client —
 * those FKs are ON DELETE CASCADE and mean nothing without the client.
 *
 * NOTE: must stay PHP 7.3 compatible (live host) — no arrow functions,
 * no str_contains, no PHP 8 syntax.
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

handleCORS();
setJSONHeaders();

$method = getMethod();
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = isset($_GET['action']) ? $_GET['action'] : '';

/**
 * Single-value query that tolerates a missing table — the CRM tables only
 * exist once migrations.sql has been run, and a delete must not 500 there.
 */
function clientScalar(PDO $db, $sql, array $params) {
    try {
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch(PDO::FETCH_NUM);
        return $row ? $row[0] : 0;
    } catch (PDOException $e) {
        return 0;
    }
}

switch ($method) {

    case 'GET':
        $auth = requireAuth();
        $db = getDB();

        if ($id) {
            $stmt = $db->prepare('SELECT * FROM clients WHERE id = ?');
            $stmt->execute([$id]);
            $client = $stmt->fetch();
            if (!$client) sendError('Client not found', 404);

            // What a delete would touch — drives the confirmation dialog so the
            // studio sees exactly what is at stake before choosing a mode.
            if ($action === 'impact') {
                sendJSON([
                    'client_id'      => $id,
                    'name'           => $client['name'],
                    'bookings'       => (int)clientScalar($db, 'SELECT COUNT(*) FROM bookings WHERE client_id = ?', [$id]),
                    'invoices'       => (int)clientScalar($db, 'SELECT COUNT(*) FROM invoices WHERE client_id = ?', [$id]),
                    'transactions'   => (int)clientScalar($db, 'SELECT COUNT(*) FROM transactions WHERE client_id = ?', [$id]),
                    'payments_total' => (float)clientScalar($db, 'SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE client_id = ?', [$id]),
                    'special_dates'  => (int)clientScalar($db, 'SELECT COUNT(*) FROM client_dates WHERE client_id = ?', [$id]),
                    'greetings'      => (int)clientScalar($db, 'SELECT COUNT(*) FROM crm_greetings WHERE client_id = ?', [$id]),
                ]);
            }

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

        $mode = isset($_GET['mode']) ? $_GET['mode'] : 'keep';
        if (!in_array($mode, ['keep', 'all'], true)) sendError('Unknown delete mode', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT id, name FROM clients WHERE id = ?');
        $stmt->execute([$id]);
        $client = $stmt->fetch();
        if (!$client) sendError('Client not found', 404);

        $removed = ['bookings' => 0, 'invoices' => 0, 'transactions' => 0];

        $db->beginTransaction();
        try {
            if ($mode === 'all') {
                // Money rows first, then the bookings they hang off. Rows reached
                // only through a booking are caught too, in case client_id drifted.
                $stmt = $db->prepare('DELETE FROM transactions WHERE client_id = ? OR booking_id IN (SELECT id FROM bookings WHERE client_id = ?)');
                $stmt->execute([$id, $id]);
                $removed['transactions'] = $stmt->rowCount();

                $stmt = $db->prepare('DELETE FROM invoices WHERE client_id = ? OR booking_id IN (SELECT id FROM bookings WHERE client_id = ?)');
                $stmt->execute([$id, $id]);
                $removed['invoices'] = $stmt->rowCount();

                $stmt = $db->prepare('DELETE FROM bookings WHERE client_id = ?');
                $stmt->execute([$id]);
                $removed['bookings'] = $stmt->rowCount();
            } else {
                // Detach the history explicitly rather than leaning on the FK's
                // ON DELETE SET NULL — the rows keep their own client_name, so
                // the books still read correctly without the client record.
                foreach (['bookings', 'invoices', 'transactions'] as $table) {
                    $stmt = $db->prepare("UPDATE {$table} SET client_id = NULL WHERE client_id = ?");
                    $stmt->execute([$id]);
                }
            }

            $stmt = $db->prepare('DELETE FROM clients WHERE id = ?');
            $stmt->execute([$id]);
            $db->commit();
        } catch (Exception $e) {
            if ($db->inTransaction()) $db->rollBack();
            sendError('Could not delete this client. Nothing was changed.', 500);
        }

        auditLog('delete', 'clients', $id, ['mode' => $mode, 'name' => $client['name'], 'removed' => $removed], $auth['sub']);
        sendJSON([
            'message' => $mode === 'all' ? 'Client and all their records deleted' : 'Client deleted, records kept',
            'mode'    => $mode,
            'removed' => $removed,
        ]);
        break;

    default:
        sendError('Method not allowed', 405);
}
