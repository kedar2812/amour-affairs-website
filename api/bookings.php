<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Bookings API
 * ============================================================
 * All endpoints require authentication.
 * GET    /api/bookings.php           — List bookings
 * GET    /api/bookings.php?id=X      — Get single
 * POST   /api/bookings.php           — Create booking
 * PUT    /api/bookings.php?id=X      — Update booking
 * DELETE /api/bookings.php?id=X      — Delete booking
 * GET    /api/bookings.php?action=stats — Dashboard stats
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

handleCORS();
setJSONHeaders();

$method = getMethod();
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = $_GET['action'] ?? '';

switch ($method) {

    case 'GET':
        $auth = requireAuth();
        $db = getDB();

        if ($action === 'stats') {
            // Dashboard aggregate stats
            $stats = [];

            $stmt = $db->query('SELECT COUNT(*) as total FROM bookings');
            $stats['total_bookings'] = (int)$stmt->fetch()['total'];

            $stmt = $db->query("SELECT COUNT(*) as total FROM bookings WHERE status = 'Confirmed'");
            $stats['confirmed'] = (int)$stmt->fetch()['total'];

            $stmt = $db->query("SELECT COUNT(*) as total FROM bookings WHERE status = 'Pending'");
            $stats['pending'] = (int)$stmt->fetch()['total'];

            $stmt = $db->query("SELECT COUNT(*) as total FROM bookings WHERE status = 'Completed'");
            $stats['completed'] = (int)$stmt->fetch()['total'];

            $stmt = $db->query('SELECT COALESCE(SUM(amount), 0) as total FROM bookings');
            $stats['total_revenue'] = (float)$stmt->fetch()['total'];

            $stmt = $db->query('SELECT COALESCE(SUM(payment_paid), 0) as total FROM bookings');
            $stats['collected'] = (float)$stmt->fetch()['total'];

            $stmt = $db->query('SELECT COALESCE(SUM(payment_due), 0) as total FROM bookings');
            $stats['outstanding'] = (float)$stmt->fetch()['total'];

            // Upcoming shoots (next 30 days)
            $stmt = $db->query("SELECT COUNT(*) as total FROM bookings WHERE date_start > NOW() AND date_start < DATE_ADD(NOW(), INTERVAL 30 DAY) AND status IN ('Confirmed', 'Pending')");
            $stats['upcoming_30_days'] = (int)$stmt->fetch()['total'];

            sendJSON(['stats' => $stats]);
        }

        if ($id) {
            $stmt = $db->prepare('SELECT * FROM bookings WHERE id = ?');
            $stmt->execute([$id]);
            $booking = $stmt->fetch();
            if (!$booking) sendError('Booking not found', 404);
            $booking['team_assigned'] = json_decode($booking['team_assigned'] ?? '[]', true);
            $booking['timeline'] = json_decode($booking['timeline'] ?? '{}', true);
            sendJSON($booking);
        }

        // List with optional filters
        $status = $_GET['status'] ?? '';
        $where = [];
        $params = [];

        if ($status) { $where[] = 'status = ?'; $params[] = $status; }

        $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $stmt = $db->prepare("SELECT * FROM bookings {$whereSQL} ORDER BY date_start DESC");
        $stmt->execute($params);
        $bookings = $stmt->fetchAll();

        foreach ($bookings as &$b) {
            $b['team_assigned'] = json_decode($b['team_assigned'] ?? '[]', true);
            $b['timeline'] = json_decode($b['timeline'] ?? '{}', true);
        }
        sendJSON(['bookings' => $bookings, 'total' => count($bookings)]);
        break;


    case 'POST':
        $auth = requireAuth();
        $body = getJSONBody();

        $clientName = sanitize($body['client_name'] ?? '');
        if (empty($clientName)) sendError('Client name is required', 400);

        // Generate booking ref
        $db = getDB();
        $stmt = $db->query('SELECT COALESCE(MAX(id), 1000) + 1 as next_id FROM bookings');
        $nextId = $stmt->fetch()['next_id'];
        $bookingRef = '#BK-' . $nextId;

        $stmt = $db->prepare(
            'INSERT INTO bookings (booking_ref, client_id, client_name, event_type, date_start, date_end, venue, city, package_id, package_name, team_assigned, amount, status, notes, timeline, payment_total, payment_paid, payment_due)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );

        $amount = (float)($body['amount'] ?? 0);
        $paid = (float)($body['payment_paid'] ?? 0);

        $stmt->execute([
            $bookingRef,
            $body['client_id'] ?? null,
            $clientName,
            sanitize($body['event_type'] ?? 'Wedding'),
            $body['date_start'] ?? date('Y-m-d H:i:s'),
            $body['date_end'] ?? date('Y-m-d H:i:s'),
            sanitize($body['venue'] ?? ''),
            sanitize($body['city'] ?? ''),
            $body['package_id'] ?? null,
            sanitize($body['package_name'] ?? ''),
            json_encode($body['team_assigned'] ?? []),
            $amount,
            sanitize($body['status'] ?? 'Pending'),
            sanitize($body['notes'] ?? ''),
            json_encode($body['timeline'] ?? []),
            $amount,
            $paid,
            $amount - $paid
        ]);

        $newId = $db->lastInsertId();
        auditLog('create', 'bookings', $newId, ['ref' => $bookingRef, 'client' => $clientName], $auth['sub']);

        $stmt = $db->prepare('SELECT * FROM bookings WHERE id = ?');
        $stmt->execute([$newId]);
        $booking = $stmt->fetch();
        $booking['team_assigned'] = json_decode($booking['team_assigned'] ?? '[]', true);
        $booking['timeline'] = json_decode($booking['timeline'] ?? '{}', true);
        sendJSON($booking, 201);
        break;


    case 'PUT':
        $auth = requireAuth();
        if (!$id) sendError('Booking ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT id FROM bookings WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) sendError('Booking not found', 404);

        $body = getJSONBody();
        $fields = [];
        $params = [];

        $stringFields = ['client_name', 'event_type', 'venue', 'city', 'package_name', 'status', 'notes'];
        $numericFields = ['client_id', 'package_id', 'amount', 'payment_total', 'payment_paid', 'payment_due'];
        $dateFields = ['date_start', 'date_end'];
        $jsonFields = ['team_assigned', 'timeline'];

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
        $stmt = $db->prepare('UPDATE bookings SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        auditLog('update', 'bookings', $id, $body, $auth['sub']);

        $stmt = $db->prepare('SELECT * FROM bookings WHERE id = ?');
        $stmt->execute([$id]);
        $booking = $stmt->fetch();
        $booking['team_assigned'] = json_decode($booking['team_assigned'] ?? '[]', true);
        $booking['timeline'] = json_decode($booking['timeline'] ?? '{}', true);
        sendJSON($booking);
        break;


    case 'DELETE':
        $auth = requireAuth();
        if (!$id) sendError('Booking ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT id FROM bookings WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) sendError('Booking not found', 404);

        $stmt = $db->prepare('DELETE FROM bookings WHERE id = ?');
        $stmt->execute([$id]);

        auditLog('delete', 'bookings', $id, null, $auth['sub']);
        sendJSON(['message' => 'Booking deleted']);
        break;

    default:
        sendError('Method not allowed', 405);
}
