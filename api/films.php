<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Films API
 * ============================================================
 * YouTube films shown on the Films page. Films flagged
 * is_featured are eligible for the "Now Showing" random pool;
 * every active film appears in the gallery grid.
 *
 * GET    /api/films.php                 — List films (public)
 *        ?featured=1   only the featured pool
 *        ?all=1        include hidden films (dashboard)
 * GET    /api/films.php?id=X            — Single film
 * POST   /api/films.php                 — Create film (auth, JSON)
 * POST   /api/films.php?action=reorder  — Bulk reorder (auth)
 * PUT    /api/films.php?id=X            — Update film (auth, JSON)
 * DELETE /api/films.php?id=X            — Delete film (auth)
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

handleCORS();
setJSONHeaders();

$method = getMethod();
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = $_GET['action'] ?? '';

/**
 * Extract a YouTube video ID from a raw ID or any common URL form
 * (watch?v=, youtu.be/, /embed/, /shorts/). Returns null if invalid.
 */
function extractYouTubeId(string $input): ?string {
    $input = trim($input);

    // Already a bare 11-character video ID
    if (preg_match('/^[A-Za-z0-9_-]{11}$/', $input)) {
        return $input;
    }

    $patterns = [
        '/[?&]v=([A-Za-z0-9_-]{11})/',
        '/youtu\.be\/([A-Za-z0-9_-]{11})/',
        '/youtube\.com\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/',
    ];
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $input, $matches)) {
            return $matches[1];
        }
    }

    return null;
}

/**
 * Fetch a film row or send 404
 */
function findFilm(PDO $db, int $id): array {
    $stmt = $db->prepare('SELECT * FROM films WHERE id = ?');
    $stmt->execute([$id]);
    $film = $stmt->fetch();
    if (!$film) sendError('Film not found', 404);
    return $film;
}

switch ($method) {

    // ── LIST / GET ──
    case 'GET':
        $db = getDB();

        if ($id) {
            sendJSON(findFilm($db, $id));
        }

        $featured = isset($_GET['featured']) ? (int)$_GET['featured'] : null;
        $activeOnly = !isset($_GET['all']); // By default only show active

        $where = [];
        $params = [];

        if ($activeOnly) {
            $where[] = 'is_active = 1';
        }
        if ($featured !== null) {
            $where[] = 'is_featured = ?';
            $params[] = $featured;
        }

        $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $stmt = $db->prepare("SELECT * FROM films {$whereSQL} ORDER BY sort_order ASC, created_at DESC");
        $stmt->execute($params);

        sendJSON(['films' => $stmt->fetchAll(), 'total' => $stmt->rowCount()]);
        break;


    // ── CREATE / REORDER ──
    case 'POST':
        $auth = requireAuth();
        $db = getDB();

        if ($action === 'reorder') {
            $body = getJSONBody();
            $orders = $body['orders'] ?? [];
            if (empty($orders) || !is_array($orders)) {
                sendError('orders array is required', 400);
            }
            $stmt = $db->prepare('UPDATE films SET sort_order = ? WHERE id = ?');
            foreach ($orders as $item) {
                if (isset($item['id'], $item['sort_order'])) {
                    $stmt->execute([(int)$item['sort_order'], (int)$item['id']]);
                }
            }
            auditLog('reorder', 'films', null, ['count' => count($orders)], $auth['sub']);
            sendJSON(['message' => 'Order updated', 'count' => count($orders)]);
            break;
        }

        $body = getJSONBody();

        $youtubeId = extractYouTubeId((string)($body['youtube_id'] ?? ''));
        if ($youtubeId === null) {
            sendError('A valid YouTube video ID or URL is required', 400);
        }

        $title = sanitize($body['title'] ?? '');
        if ($title === '') {
            sendError('title is required', 400);
        }

        $caption = sanitize($body['caption'] ?? '');
        $isFeatured = (int)!empty($body['is_featured']);

        $stmt = $db->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM films');
        $stmt->execute();
        $nextOrder = (int)$stmt->fetch()['next_order'];

        try {
            $stmt = $db->prepare(
                'INSERT INTO films (youtube_id, title, caption, is_featured, sort_order)
                 VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([$youtubeId, $title, $caption, $isFeatured, $nextOrder]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                sendError('This video is already in the film library', 409);
            }
            throw $e;
        }

        $newId = (int)$db->lastInsertId();
        auditLog('create', 'films', $newId, ['youtube_id' => $youtubeId, 'title' => $title], $auth['sub']);

        sendJSON(findFilm($db, $newId), 201);
        break;


    // ── UPDATE ──
    case 'PUT':
        $auth = requireAuth();
        if (!$id) sendError('Film ID is required', 400);

        $db = getDB();
        findFilm($db, $id);

        $body = getJSONBody();

        $fields = [];
        $params = [];

        if (array_key_exists('youtube_id', $body)) {
            $youtubeId = extractYouTubeId((string)$body['youtube_id']);
            if ($youtubeId === null) {
                sendError('A valid YouTube video ID or URL is required', 400);
            }
            $fields[] = 'youtube_id = ?';
            $params[] = $youtubeId;
        }
        if (array_key_exists('title', $body)) {
            $title = sanitize($body['title']);
            if ($title === '') sendError('title cannot be empty', 400);
            $fields[] = 'title = ?';
            $params[] = $title;
        }

        $updatable = ['caption', 'is_featured', 'is_active', 'sort_order'];
        foreach ($updatable as $field) {
            if (array_key_exists($field, $body)) {
                $fields[] = "{$field} = ?";
                $params[] = is_string($body[$field]) ? sanitize($body[$field]) : $body[$field];
            }
        }

        if (empty($fields)) sendError('No fields to update', 400);

        $params[] = $id;
        try {
            $stmt = $db->prepare('UPDATE films SET ' . implode(', ', $fields) . ' WHERE id = ?');
            $stmt->execute($params);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                sendError('This video is already in the film library', 409);
            }
            throw $e;
        }

        auditLog('update', 'films', $id, $body, $auth['sub']);
        sendJSON(findFilm($db, $id));
        break;


    // ── DELETE ──
    case 'DELETE':
        $auth = requireAuth();
        if (!$id) sendError('Film ID is required', 400);

        $db = getDB();
        $film = findFilm($db, $id);

        $stmt = $db->prepare('DELETE FROM films WHERE id = ?');
        $stmt->execute([$id]);

        auditLog('delete', 'films', $id, ['title' => $film['title']], $auth['sub']);
        sendJSON(['message' => 'Film deleted']);
        break;

    default:
        sendError('Method not allowed', 405);
}
