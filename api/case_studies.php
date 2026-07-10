<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Case Studies API
 * ============================================================
 * GET    /api/case_studies.php                  — List published (public, no body)
 * GET    /api/case_studies.php?slug=X           — Single published by slug (public)
 * GET    /api/case_studies.php?all=1            — List all incl. drafts (auth)
 * GET    /api/case_studies.php?id=X             — Single by id (auth)
 * POST   /api/case_studies.php                  — Create (auth, JSON)
 * POST   /api/case_studies.php?action=cover&id=X    — Set cover (auth, multipart `photo`)
 * POST   /api/case_studies.php?action=gallery&id=X  — Add gallery images (auth, multipart `photos[]`)
 * PUT    /api/case_studies.php?id=X             — Update (auth)
 * DELETE /api/case_studies.php?id=X             — Delete (auth)
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/upload.php';

handleCORS();
setJSONHeaders();

$method = getMethod();
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = $_GET['action'] ?? '';

function csSlugify(string $text): string {
    $text = trim($text);
    if (function_exists('iconv')) {
        $converted = @iconv('UTF-8', 'ASCII//TRANSLIT', $text);
        if ($converted !== false) $text = $converted;
    }
    $text = strtolower(preg_replace('/[^a-z0-9]+/', '-', strtolower($text)));
    $text = trim($text, '-');
    return $text !== '' ? $text : 'story';
}

function uniqueCaseSlug(PDO $db, string $base, ?int $ignoreId = null): string {
    $slug = $base; $i = 2;
    while (true) {
        $sql = 'SELECT id FROM case_studies WHERE slug = ?' . ($ignoreId ? ' AND id <> ?' : '');
        $stmt = $db->prepare($sql);
        $stmt->execute($ignoreId ? [$slug, $ignoreId] : [$slug]);
        if (!$stmt->fetch()) return $slug;
        $slug = $base . '-' . $i++;
    }
}

/** Decode the JSON gallery column to an array. */
function decodeGallery($row) {
    if (is_array($row) && isset($row['gallery'])) {
        $row['gallery'] = json_decode($row['gallery'] ?? '[]', true) ?: [];
    }
    return $row;
}

$LIST_COLS = 'id, slug, couple, title, location, event_date, event_type, summary, services, guest_count, cover_path, film_youtube_id, is_published, is_featured, sort_order, published_at, created_at, updated_at';

switch ($method) {

    case 'GET':
        $db = getDB();

        if (isset($_GET['slug'])) {
            $stmt = $db->prepare('SELECT * FROM case_studies WHERE slug = ? AND is_published = 1');
            $stmt->execute([(string)$_GET['slug']]);
            $cs = $stmt->fetch();
            if (!$cs) sendError('Case study not found', 404);
            sendJSON(decodeGallery($cs));
        }

        if ($id) {
            requireAuth();
            $stmt = $db->prepare('SELECT * FROM case_studies WHERE id = ?');
            $stmt->execute([$id]);
            $cs = $stmt->fetch();
            if (!$cs) sendError('Case study not found', 404);
            sendJSON(decodeGallery($cs));
        }

        $all = isset($_GET['all']);
        if ($all) {
            requireAuth();
            $stmt = $db->query("SELECT * FROM case_studies ORDER BY is_featured DESC, sort_order ASC, COALESCE(published_at, created_at) DESC");
            $rows = array_map('decodeGallery', $stmt->fetchAll());
        } else {
            $stmt = $db->query("SELECT {$LIST_COLS} FROM case_studies WHERE is_published = 1 ORDER BY is_featured DESC, sort_order ASC, published_at DESC");
            $rows = $stmt->fetchAll();
        }
        sendJSON(['case_studies' => $rows, 'total' => count($rows)]);
        break;


    case 'POST':
        $auth = requireAuth();
        $db = getDB();

        // ─ Set cover image ─
        if ($action === 'cover') {
            if (!$id) sendError('Case study ID is required', 400);
            $stmt = $db->prepare('SELECT cover_path FROM case_studies WHERE id = ?');
            $stmt->execute([$id]);
            $existing = $stmt->fetch();
            if (!$existing) sendError('Case study not found', 404);

            $cover = processImageUpload('photo', 'case-studies/');
            if (empty($cover)) sendError('Cover image is required (field: photo)', 400);
            if ($existing['cover_path']) deleteImageFiles($existing['cover_path']);

            $stmt = $db->prepare('UPDATE case_studies SET cover_path = ? WHERE id = ?');
            $stmt->execute([$cover['file_path'], $id]);
            auditLog('update_cover', 'case_studies', $id, null, $auth['sub']);

            $stmt = $db->prepare('SELECT * FROM case_studies WHERE id = ?');
            $stmt->execute([$id]);
            sendJSON(decodeGallery($stmt->fetch()));
            break;
        }

        // ─ Add gallery images (multipart photos[]) ─
        if ($action === 'gallery') {
            if (!$id) sendError('Case study ID is required', 400);
            $stmt = $db->prepare('SELECT gallery FROM case_studies WHERE id = ?');
            $stmt->execute([$id]);
            $existing = $stmt->fetch();
            if (!$existing) sendError('Case study not found', 404);

            $files = normalizeUploadedFiles('photos');
            if (empty($files)) sendError('No images uploaded (field: photos[])', 400);

            $gallery = json_decode($existing['gallery'] ?? '[]', true) ?: [];
            foreach ($files as $file) {
                $err = validateImageFile($file);
                if ($err !== null) sendError($err, 400);
                $res = processSingleImageFile($file, 'case-studies/');
                if ($res !== false) $gallery[] = $res['file_path'];
            }

            $stmt = $db->prepare('UPDATE case_studies SET gallery = ? WHERE id = ?');
            $stmt->execute([json_encode($gallery, JSON_UNESCAPED_SLASHES), $id]);
            auditLog('update_gallery', 'case_studies', $id, ['count' => count($files)], $auth['sub']);

            $stmt = $db->prepare('SELECT * FROM case_studies WHERE id = ?');
            $stmt->execute([$id]);
            sendJSON(decodeGallery($stmt->fetch()));
            break;
        }

        $body = getJSONBody();
        $couple = sanitize($body['couple'] ?? '');
        $title = sanitize($body['title'] ?? '');
        $content = trim((string)($body['body'] ?? ''));
        if ($couple === '' || $title === '' || $content === '') {
            sendError('Couple, title and story body are required', 400);
        }

        $slug = uniqueCaseSlug($db, csSlugify($body['slug'] ?? ($couple . '-' . $title)));
        $isPublished = (int)($body['is_published'] ?? 0);

        $stmt = $db->prepare(
            'INSERT INTO case_studies (slug, couple, title, location, event_date, event_type, summary, body, services, guest_count, film_youtube_id, gallery, meta_title, meta_description, is_published, is_featured, sort_order, published_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $slug,
            $couple,
            $title,
            sanitize($body['location'] ?? ''),
            !empty($body['event_date']) ? $body['event_date'] : null,
            sanitize($body['event_type'] ?? 'Wedding'),
            sanitize($body['summary'] ?? ''),
            sanitize($content),
            sanitize($body['services'] ?? ''),
            sanitize($body['guest_count'] ?? ''),
            sanitize($body['film_youtube_id'] ?? ''),
            json_encode([], JSON_UNESCAPED_SLASHES),
            sanitize($body['meta_title'] ?? ''),
            sanitize($body['meta_description'] ?? ''),
            $isPublished,
            (int)($body['is_featured'] ?? 0),
            (int)($body['sort_order'] ?? 0),
            $isPublished ? date('Y-m-d H:i:s') : null,
        ]);

        $newId = $db->lastInsertId();
        auditLog('create', 'case_studies', $newId, ['slug' => $slug], $auth['sub']);
        $stmt = $db->prepare('SELECT * FROM case_studies WHERE id = ?');
        $stmt->execute([$newId]);
        sendJSON(decodeGallery($stmt->fetch()), 201);
        break;


    case 'PUT':
        $auth = requireAuth();
        if (!$id) sendError('Case study ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT * FROM case_studies WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) sendError('Case study not found', 404);

        $body = getJSONBody();
        $fields = [];
        $params = [];

        $stringFields = ['couple', 'title', 'location', 'event_type', 'summary', 'body', 'services', 'guest_count', 'film_youtube_id', 'meta_title', 'meta_description'];
        foreach ($stringFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = sanitize($body[$f]); }
        }
        if (array_key_exists('event_date', $body)) {
            $fields[] = 'event_date = ?';
            $params[] = !empty($body['event_date']) ? $body['event_date'] : null;
        }
        $intFields = ['is_featured', 'sort_order'];
        foreach ($intFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = (int)$body[$f]; }
        }
        // Replace gallery wholesale (e.g. after a reorder / removal in the dashboard)
        if (array_key_exists('gallery', $body) && is_array($body['gallery'])) {
            $fields[] = 'gallery = ?';
            $params[] = json_encode(array_values($body['gallery']), JSON_UNESCAPED_SLASHES);
        }
        if (array_key_exists('slug', $body) && trim((string)$body['slug']) !== '') {
            $fields[] = 'slug = ?';
            $params[] = uniqueCaseSlug($db, csSlugify($body['slug']), $id);
        }
        if (array_key_exists('is_published', $body)) {
            $pub = (int)$body['is_published'];
            $fields[] = 'is_published = ?';
            $params[] = $pub;
            if ($pub && !$existing['published_at']) {
                $fields[] = 'published_at = ?';
                $params[] = date('Y-m-d H:i:s');
            }
        }

        if (empty($fields)) sendError('No fields to update', 400);

        $params[] = $id;
        $stmt = $db->prepare('UPDATE case_studies SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        auditLog('update', 'case_studies', $id, array_keys($body), $auth['sub']);
        $stmt = $db->prepare('SELECT * FROM case_studies WHERE id = ?');
        $stmt->execute([$id]);
        sendJSON(decodeGallery($stmt->fetch()));
        break;


    case 'DELETE':
        $auth = requireAuth();
        if (!$id) sendError('Case study ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT cover_path, gallery FROM case_studies WHERE id = ?');
        $stmt->execute([$id]);
        $cs = $stmt->fetch();
        if (!$cs) sendError('Case study not found', 404);

        if ($cs['cover_path']) deleteImageFiles($cs['cover_path']);
        foreach ((json_decode($cs['gallery'] ?? '[]', true) ?: []) as $path) {
            deleteImageFiles($path);
        }
        $stmt = $db->prepare('DELETE FROM case_studies WHERE id = ?');
        $stmt->execute([$id]);

        auditLog('delete', 'case_studies', $id, null, $auth['sub']);
        sendJSON(['message' => 'Case study deleted']);
        break;

    default:
        sendError('Method not allowed', 405);
}
