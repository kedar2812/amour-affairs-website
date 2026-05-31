<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Leads API
 * ============================================================
 * All endpoints require authentication.
 * GET    /api/leads.php           — List leads
 * GET    /api/leads.php?id=X      — Get single
 * POST   /api/leads.php           — Create lead
 * PUT    /api/leads.php?id=X      — Update lead
 * DELETE /api/leads.php?id=X      — Delete lead
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
            $stmt = $db->prepare('SELECT * FROM leads WHERE id = ?');
            $stmt->execute([$id]);
            $lead = $stmt->fetch();
            if (!$lead) sendError('Lead not found', 404);
            $lead['notes'] = json_decode($lead['notes'] ?? '[]', true);
            sendJSON($lead);
        }

        $stage = $_GET['stage'] ?? '';
        $source = $_GET['source'] ?? '';
        $where = [];
        $params = [];

        if ($stage) { $where[] = 'stage = ?'; $params[] = $stage; }
        if ($source) { $where[] = 'source = ?'; $params[] = $source; }

        $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $stmt = $db->prepare("SELECT * FROM leads {$whereSQL} ORDER BY created_at DESC");
        $stmt->execute($params);
        $leads = $stmt->fetchAll();
        foreach ($leads as &$l) {
            $l['notes'] = json_decode($l['notes'] ?? '[]', true);
        }
        sendJSON(['leads' => $leads, 'total' => count($leads)]);
        break;


    case 'POST':
        $auth = requireAuth();
        $body = getJSONBody();

        $clientName = sanitize($body['client_name'] ?? '');
        if (empty($clientName)) sendError('Client name is required', 400);

        $db = getDB();
        $stmt = $db->query('SELECT COALESCE(MAX(id), 800) + 1 as next_id FROM leads');
        $nextId = $stmt->fetch()['next_id'];
        $leadRef = '#LD-' . $nextId;

        $stmt = $db->prepare(
            'INSERT INTO leads (lead_ref, client_name, phone, email, instagram, event_type, event_date, budget_range, source, stage, assigned_to, last_activity, moved_to_stage_at, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)'
        );
        $stmt->execute([
            $leadRef,
            $clientName,
            sanitize($body['phone'] ?? ''),
            sanitize($body['email'] ?? ''),
            sanitize($body['instagram'] ?? ''),
            sanitize($body['event_type'] ?? 'Wedding'),
            $body['event_date'] ?? null,
            sanitize($body['budget_range'] ?? ''),
            sanitize($body['source'] ?? 'Website'),
            sanitize($body['stage'] ?? 'New Inquiry'),
            $body['assigned_to'] ?? null,
            json_encode($body['notes'] ?? [])
        ]);

        $newId = $db->lastInsertId();
        auditLog('create', 'leads', $newId, ['ref' => $leadRef], $auth['sub']);

        $stmt = $db->prepare('SELECT * FROM leads WHERE id = ?');
        $stmt->execute([$newId]);
        $lead = $stmt->fetch();
        $lead['notes'] = json_decode($lead['notes'] ?? '[]', true);
        sendJSON($lead, 201);
        break;


    case 'PUT':
        $auth = requireAuth();
        if (!$id) sendError('Lead ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT * FROM leads WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) sendError('Lead not found', 404);

        $body = getJSONBody();
        $fields = [];
        $params = [];

        $stringFields = ['client_name', 'phone', 'email', 'instagram', 'event_type', 'budget_range', 'source', 'stage'];
        $dateFields = ['event_date', 'last_activity', 'moved_to_stage_at'];
        $numericFields = ['assigned_to'];
        $jsonFields = ['notes'];

        foreach ($stringFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = sanitize($body[$f]); }
        }
        foreach ($dateFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = $body[$f]; }
        }
        foreach ($numericFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = $body[$f]; }
        }
        foreach ($jsonFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = json_encode($body[$f]); }
        }

        // Auto-set moved_to_stage_at when stage changes
        if (array_key_exists('stage', $body) && $body['stage'] !== $existing['stage']) {
            $fields[] = 'moved_to_stage_at = NOW()';
        }

        // Always update last_activity on any change
        $fields[] = 'last_activity = NOW()';

        if (empty($fields)) sendError('No fields to update', 400);

        $params[] = $id;
        $stmt = $db->prepare('UPDATE leads SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        auditLog('update', 'leads', $id, $body, $auth['sub']);

        $stmt = $db->prepare('SELECT * FROM leads WHERE id = ?');
        $stmt->execute([$id]);
        $lead = $stmt->fetch();
        $lead['notes'] = json_decode($lead['notes'] ?? '[]', true);
        sendJSON($lead);
        break;


    case 'DELETE':
        $auth = requireAuth();
        if (!$id) sendError('Lead ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT id FROM leads WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) sendError('Lead not found', 404);

        $stmt = $db->prepare('DELETE FROM leads WHERE id = ?');
        $stmt->execute([$id]);

        auditLog('delete', 'leads', $id, null, $auth['sub']);
        sendJSON(['message' => 'Lead deleted']);
        break;

    default:
        sendError('Method not allowed', 405);
}
