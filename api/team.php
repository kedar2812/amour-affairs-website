<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Team Members API
 * ============================================================
 * GET    /api/team.php          — List team (public)
 * GET    /api/team.php?id=X     — Get member
 * POST   /api/team.php          — Create member (auth)
 * PUT    /api/team.php?id=X     — Update member (auth)
 * DELETE /api/team.php?id=X     — Delete member (auth)
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/upload.php';

handleCORS();
setJSONHeaders();

$method = getMethod();
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {

    case 'GET':
        $db = getDB();
        if ($id) {
            $stmt = $db->prepare('SELECT * FROM team_members WHERE id = ?');
            $stmt->execute([$id]);
            $member = $stmt->fetch();
            if (!$member) sendError('Team member not found', 404);
            $member['skills'] = json_decode($member['skills'] ?? '[]', true);
            $member['equipment'] = json_decode($member['equipment'] ?? '[]', true);
            sendJSON($member);
        }

        $activeOnly = !isset($_GET['all']);
        $where = $activeOnly ? 'WHERE is_active = 1' : '';
        $stmt = $db->prepare("SELECT * FROM team_members {$where} ORDER BY sort_order ASC, created_at ASC");
        $stmt->execute();
        $members = $stmt->fetchAll();
        foreach ($members as &$m) {
            $m['skills'] = json_decode($m['skills'] ?? '[]', true);
            $m['equipment'] = json_decode($m['equipment'] ?? '[]', true);
        }
        sendJSON(['team' => $members, 'total' => count($members)]);
        break;


    case 'POST':
        $auth = requireAuth();

        // Handle multipart form data for photo upload
        $photoData = processImageUpload('photo', 'team/');

        $name = sanitize($_POST['name'] ?? '');
        if (empty($name)) sendError('Name is required', 400);

        $db = getDB();
        $stmt = $db->prepare(
            'INSERT INTO team_members (name, role, status, current_assignment, phone, email, avatar_initials, photo_path, bio, skills, equipment, rating, on_time_delivery_rate, month_earnings, upcoming_shoots_count, join_date, is_active, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $name,
            sanitize($_POST['role'] ?? ''),
            sanitize($_POST['status'] ?? 'Available'),
            sanitize($_POST['current_assignment'] ?? ''),
            sanitize($_POST['phone'] ?? ''),
            sanitize($_POST['email'] ?? ''),
            sanitize($_POST['avatar_initials'] ?? strtoupper(substr($name, 0, 2))),
            $photoData['file_path'] ?? null,
            sanitize($_POST['bio'] ?? ''),
            $_POST['skills'] ?? '[]',
            $_POST['equipment'] ?? '[]',
            (float)($_POST['rating'] ?? 0),
            (int)($_POST['on_time_delivery_rate'] ?? 0),
            (float)($_POST['month_earnings'] ?? 0),
            (int)($_POST['upcoming_shoots_count'] ?? 0),
            $_POST['join_date'] ?? null,
            (int)($_POST['is_active'] ?? 1),
            (int)($_POST['sort_order'] ?? 0)
        ]);

        $newId = $db->lastInsertId();
        auditLog('create', 'team_members', $newId, ['name' => $name], $auth['sub']);

        $stmt = $db->prepare('SELECT * FROM team_members WHERE id = ?');
        $stmt->execute([$newId]);
        $member = $stmt->fetch();
        $member['skills'] = json_decode($member['skills'] ?? '[]', true);
        $member['equipment'] = json_decode($member['equipment'] ?? '[]', true);
        sendJSON($member, 201);
        break;


    case 'PUT':
        $auth = requireAuth();
        if (!$id) sendError('Member ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT * FROM team_members WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) sendError('Team member not found', 404);

        $body = getJSONBody();
        $fields = [];
        $params = [];

        $stringFields = ['name', 'role', 'status', 'current_assignment', 'phone', 'email', 'avatar_initials', 'bio', 'join_date'];
        $numericFields = ['rating', 'on_time_delivery_rate', 'month_earnings', 'upcoming_shoots_count', 'sort_order'];
        $boolFields = ['is_active'];
        $jsonFields = ['skills', 'equipment'];

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
        $stmt = $db->prepare('UPDATE team_members SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        auditLog('update', 'team_members', $id, $body, $auth['sub']);

        $stmt = $db->prepare('SELECT * FROM team_members WHERE id = ?');
        $stmt->execute([$id]);
        $member = $stmt->fetch();
        $member['skills'] = json_decode($member['skills'] ?? '[]', true);
        $member['equipment'] = json_decode($member['equipment'] ?? '[]', true);
        sendJSON($member);
        break;


    case 'DELETE':
        $auth = requireAuth();
        if (!$id) sendError('Member ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT photo_path FROM team_members WHERE id = ?');
        $stmt->execute([$id]);
        $member = $stmt->fetch();
        if (!$member) sendError('Team member not found', 404);

        if ($member['photo_path']) {
            deleteImageFiles($member['photo_path']);
        }

        $stmt = $db->prepare('DELETE FROM team_members WHERE id = ?');
        $stmt->execute([$id]);

        auditLog('delete', 'team_members', $id, null, $auth['sub']);
        sendJSON(['message' => 'Team member deleted']);
        break;

    default:
        sendError('Method not allowed', 405);
}
