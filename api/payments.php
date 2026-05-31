<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Payments API (Invoices + Transactions)
 * ============================================================
 * All endpoints require authentication.
 *
 * Invoices:
 *   GET    /api/payments.php?type=invoices           — List invoices
 *   GET    /api/payments.php?type=invoices&id=X      — Get single
 *   POST   /api/payments.php?type=invoices           — Create
 *   PUT    /api/payments.php?type=invoices&id=X      — Update
 *   DELETE /api/payments.php?type=invoices&id=X      — Delete
 *
 * Transactions:
 *   GET    /api/payments.php?type=transactions       — List
 *   POST   /api/payments.php?type=transactions       — Create
 *   DELETE /api/payments.php?type=transactions&id=X  — Delete
 *
 * Stats:
 *   GET    /api/payments.php?type=stats              — Payment stats
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

handleCORS();
setJSONHeaders();

$auth = requireAuth();
$method = getMethod();
$type = $_GET['type'] ?? 'invoices';
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$db = getDB();

// ── STATS ──
if ($type === 'stats' && $method === 'GET') {
    $stats = [];

    $stmt = $db->query('SELECT COALESCE(SUM(amount), 0) as total, COALESCE(SUM(amount_paid), 0) as paid FROM invoices');
    $row = $stmt->fetch();
    $stats['total_invoiced'] = (float)$row['total'];
    $stats['total_collected'] = (float)$row['paid'];
    $stats['total_outstanding'] = $stats['total_invoiced'] - $stats['total_collected'];

    $stmt = $db->query("SELECT COUNT(*) as c FROM invoices WHERE status = 'Overdue'");
    $stats['overdue_count'] = (int)$stmt->fetch()['c'];

    $stmt = $db->query("SELECT COUNT(*) as c FROM invoices WHERE status = 'Pending'");
    $stats['pending_count'] = (int)$stmt->fetch()['c'];

    // Monthly revenue (last 12 months)
    $stmt = $db->query(
        "SELECT DATE_FORMAT(date, '%Y-%m') as month, COALESCE(SUM(amount), 0) as total
         FROM transactions
         WHERE date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
         GROUP BY DATE_FORMAT(date, '%Y-%m')
         ORDER BY month ASC"
    );
    $stats['monthly_revenue'] = $stmt->fetchAll();

    sendJSON(['stats' => $stats]);
}


// ── INVOICES ──
if ($type === 'invoices') {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $db->prepare('SELECT * FROM invoices WHERE id = ?');
                $stmt->execute([$id]);
                $inv = $stmt->fetch();
                if (!$inv) sendError('Invoice not found', 404);
                $inv['items'] = json_decode($inv['items'] ?? '[]', true);
                sendJSON($inv);
            }

            $status = $_GET['status'] ?? '';
            $where = [];
            $params = [];
            if ($status) { $where[] = 'status = ?'; $params[] = $status; }

            $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';
            $stmt = $db->prepare("SELECT * FROM invoices {$whereSQL} ORDER BY issue_date DESC");
            $stmt->execute($params);
            $invoices = $stmt->fetchAll();
            foreach ($invoices as &$inv) {
                $inv['items'] = json_decode($inv['items'] ?? '[]', true);
            }
            sendJSON(['invoices' => $invoices, 'total' => count($invoices)]);
            break;

        case 'POST':
            $body = getJSONBody();
            $clientName = sanitize($body['client_name'] ?? '');
            if (empty($clientName)) sendError('Client name is required', 400);

            $stmt = $db->query('SELECT COALESCE(MAX(id), 2000) + 1 as next_id FROM invoices');
            $nextId = $stmt->fetch()['next_id'];
            $invRef = '#INV-' . $nextId;

            $stmt = $db->prepare(
                'INSERT INTO invoices (invoice_ref, client_id, client_name, booking_id, booking_ref, issue_date, due_date, amount, amount_paid, status, items)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $invRef,
                $body['client_id'] ?? null,
                $clientName,
                $body['booking_id'] ?? null,
                sanitize($body['booking_ref'] ?? ''),
                $body['issue_date'] ?? date('Y-m-d'),
                $body['due_date'] ?? date('Y-m-d', strtotime('+30 days')),
                (float)($body['amount'] ?? 0),
                (float)($body['amount_paid'] ?? 0),
                sanitize($body['status'] ?? 'Pending'),
                json_encode($body['items'] ?? [])
            ]);

            $newId = $db->lastInsertId();
            auditLog('create', 'invoices', $newId, ['ref' => $invRef], $auth['sub']);

            $stmt = $db->prepare('SELECT * FROM invoices WHERE id = ?');
            $stmt->execute([$newId]);
            $inv = $stmt->fetch();
            $inv['items'] = json_decode($inv['items'] ?? '[]', true);
            sendJSON($inv, 201);
            break;

        case 'PUT':
            if (!$id) sendError('Invoice ID is required', 400);
            $stmt = $db->prepare('SELECT id FROM invoices WHERE id = ?');
            $stmt->execute([$id]);
            if (!$stmt->fetch()) sendError('Invoice not found', 404);

            $body = getJSONBody();
            $fields = [];
            $params = [];

            $stringFields = ['client_name', 'booking_ref', 'status'];
            $numericFields = ['client_id', 'booking_id', 'amount', 'amount_paid'];
            $dateFields = ['issue_date', 'due_date'];
            $jsonFields = ['items'];

            foreach ($stringFields as $f) { if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = sanitize($body[$f]); } }
            foreach ($numericFields as $f) { if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = $body[$f]; } }
            foreach ($dateFields as $f) { if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = $body[$f]; } }
            foreach ($jsonFields as $f) { if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = json_encode($body[$f]); } }

            if (empty($fields)) sendError('No fields to update', 400);

            $params[] = $id;
            $stmt = $db->prepare('UPDATE invoices SET ' . implode(', ', $fields) . ' WHERE id = ?');
            $stmt->execute($params);

            auditLog('update', 'invoices', $id, $body, $auth['sub']);

            $stmt = $db->prepare('SELECT * FROM invoices WHERE id = ?');
            $stmt->execute([$id]);
            $inv = $stmt->fetch();
            $inv['items'] = json_decode($inv['items'] ?? '[]', true);
            sendJSON($inv);
            break;

        case 'DELETE':
            if (!$id) sendError('Invoice ID is required', 400);
            $stmt = $db->prepare('SELECT id FROM invoices WHERE id = ?');
            $stmt->execute([$id]);
            if (!$stmt->fetch()) sendError('Invoice not found', 404);

            $stmt = $db->prepare('DELETE FROM invoices WHERE id = ?');
            $stmt->execute([$id]);
            auditLog('delete', 'invoices', $id, null, $auth['sub']);
            sendJSON(['message' => 'Invoice deleted']);
            break;

        default:
            sendError('Method not allowed', 405);
    }
}


// ── TRANSACTIONS ──
elseif ($type === 'transactions') {
    switch ($method) {
        case 'GET':
            $stmt = $db->prepare('SELECT * FROM transactions ORDER BY date DESC');
            $stmt->execute();
            sendJSON(['transactions' => $stmt->fetchAll(), 'total' => $stmt->rowCount()]);
            break;

        case 'POST':
            $body = getJSONBody();
            $clientName = sanitize($body['client_name'] ?? '');
            if (empty($clientName)) sendError('Client name is required', 400);

            $stmt = $db->query('SELECT COALESCE(MAX(id), 900) + 1 as next_id FROM transactions');
            $nextId = $stmt->fetch()['next_id'];
            $txnRef = 'TXN-' . $nextId;

            $stmt = $db->prepare(
                'INSERT INTO transactions (transaction_ref, date, client_id, client_name, booking_id, booking_ref, method, amount, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $txnRef,
                $body['date'] ?? date('Y-m-d H:i:s'),
                $body['client_id'] ?? null,
                $clientName,
                $body['booking_id'] ?? null,
                sanitize($body['booking_ref'] ?? ''),
                sanitize($body['method'] ?? 'UPI'),
                (float)($body['amount'] ?? 0),
                sanitize($body['notes'] ?? '')
            ]);

            $newId = $db->lastInsertId();
            auditLog('create', 'transactions', $newId, ['ref' => $txnRef, 'amount' => $body['amount'] ?? 0], $auth['sub']);

            $stmt = $db->prepare('SELECT * FROM transactions WHERE id = ?');
            $stmt->execute([$newId]);
            sendJSON($stmt->fetch(), 201);
            break;

        case 'DELETE':
            if (!$id) sendError('Transaction ID is required', 400);
            $stmt = $db->prepare('SELECT id FROM transactions WHERE id = ?');
            $stmt->execute([$id]);
            if (!$stmt->fetch()) sendError('Transaction not found', 404);

            $stmt = $db->prepare('DELETE FROM transactions WHERE id = ?');
            $stmt->execute([$id]);
            auditLog('delete', 'transactions', $id, null, $auth['sub']);
            sendJSON(['message' => 'Transaction deleted']);
            break;

        default:
            sendError('Method not allowed', 405);
    }
}

else {
    sendError('Invalid type. Use: invoices, transactions, stats', 400);
}
