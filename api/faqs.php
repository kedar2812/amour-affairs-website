<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — FAQs API
 * ============================================================
 * GET    /api/faqs.php                 — List active FAQs (public)
 * GET    /api/faqs.php?all=1            — List all incl. hidden (auth)
 * GET    /api/faqs.php?id=X             — Get single
 * POST   /api/faqs.php                  — Create (auth)
 * POST   /api/faqs.php?action=reorder   — Bulk reorder (auth)
 * PUT    /api/faqs.php?id=X             — Update (auth)
 * DELETE /api/faqs.php?id=X             — Delete (auth)
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

handleCORS();
setJSONHeaders();

$method = getMethod();
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = $_GET['action'] ?? '';

const FAQ_CATEGORIES = ['before', 'during', 'after'];

switch ($method) {

    case 'GET':
        $db = getDB();
        if ($id) {
            $stmt = $db->prepare('SELECT * FROM faqs WHERE id = ?');
            $stmt->execute([$id]);
            $faq = $stmt->fetch();
            if (!$faq) sendError('FAQ not found', 404);
            sendJSON($faq);
        }

        // Public view returns active FAQs only; ?all=1 (auth) returns everything
        $all = isset($_GET['all']);
        if ($all) requireAuth();

        $whereSQL = $all ? '' : 'WHERE is_active = 1';
        $stmt = $db->query("SELECT * FROM faqs {$whereSQL} ORDER BY FIELD(category,'before','during','after'), sort_order ASC, id ASC");
        sendJSON(['faqs' => $stmt->fetchAll(), 'total' => $stmt->rowCount()]);
        break;


    case 'POST':
        $auth = requireAuth();

        // ─ Bulk reorder: [{id, sort_order}, ...] ─
        if ($action === 'reorder') {
            $body = getJSONBody();
            $orders = $body['orders'] ?? [];
            if (!is_array($orders) || empty($orders)) sendError('orders array is required', 400);

            $db = getDB();
            $stmt = $db->prepare('UPDATE faqs SET sort_order = ? WHERE id = ?');
            foreach ($orders as $o) {
                if (isset($o['id'], $o['sort_order'])) {
                    $stmt->execute([(int)$o['sort_order'], (int)$o['id']]);
                }
            }
            auditLog('reorder', 'faqs', null, ['count' => count($orders)], $auth['sub']);
            sendJSON(['message' => 'FAQs reordered']);
            break;
        }

        $body = getJSONBody();
        $question = sanitize($body['question'] ?? '');
        $answer = sanitize($body['answer'] ?? '');
        if (empty($question) || empty($answer)) {
            sendError('Question and answer are required', 400);
        }
        $category = in_array($body['category'] ?? '', FAQ_CATEGORIES, true) ? $body['category'] : 'before';

        $db = getDB();
        $stmt = $db->prepare(
            'INSERT INTO faqs (question, answer, category, is_active, sort_order)
             VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $question,
            $answer,
            $category,
            (int)($body['is_active'] ?? 1),
            (int)($body['sort_order'] ?? 0),
        ]);

        $newId = $db->lastInsertId();
        auditLog('create', 'faqs', $newId, null, $auth['sub']);

        $stmt = $db->prepare('SELECT * FROM faqs WHERE id = ?');
        $stmt->execute([$newId]);
        sendJSON($stmt->fetch(), 201);
        break;


    case 'PUT':
        $auth = requireAuth();
        if (!$id) sendError('FAQ ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT id FROM faqs WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) sendError('FAQ not found', 404);

        $body = getJSONBody();
        $fields = [];
        $params = [];

        $updatable = ['question', 'answer', 'category', 'is_active', 'sort_order'];
        foreach ($updatable as $f) {
            if (array_key_exists($f, $body)) {
                if ($f === 'category' && !in_array($body[$f], FAQ_CATEGORIES, true)) continue;
                $value = is_string($body[$f]) ? sanitize($body[$f]) : $body[$f];
                $fields[] = "{$f} = ?";
                $params[] = $value;
            }
        }
        if (empty($fields)) sendError('No fields to update', 400);

        $params[] = $id;
        $stmt = $db->prepare('UPDATE faqs SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        auditLog('update', 'faqs', $id, $body, $auth['sub']);

        $stmt = $db->prepare('SELECT * FROM faqs WHERE id = ?');
        $stmt->execute([$id]);
        sendJSON($stmt->fetch());
        break;


    case 'DELETE':
        $auth = requireAuth();
        if (!$id) sendError('FAQ ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT id FROM faqs WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) sendError('FAQ not found', 404);

        $stmt = $db->prepare('DELETE FROM faqs WHERE id = ?');
        $stmt->execute([$id]);

        auditLog('delete', 'faqs', $id, null, $auth['sub']);
        sendJSON(['message' => 'FAQ deleted']);
        break;

    default:
        sendError('Method not allowed', 405);
}
