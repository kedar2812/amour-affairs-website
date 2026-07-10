<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Guides / Blog API
 * ============================================================
 * GET    /api/guides.php                  — List published (public, no body)
 * GET    /api/guides.php?slug=X           — Single published by slug (public, full)
 * GET    /api/guides.php?all=1            — List all incl. drafts (auth)
 * GET    /api/guides.php?id=X             — Single by id (auth, full)
 * POST   /api/guides.php                  — Create (auth, JSON)
 * POST   /api/guides.php?action=cover&id=X — Set cover image (auth, multipart `photo`)
 * PUT    /api/guides.php?id=X             — Update (auth)
 * DELETE /api/guides.php?id=X             — Delete (auth)
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

/** Build a URL-safe slug from a title. */
function slugify(string $text): string {
    $text = trim($text);
    // Transliterate common accented chars where possible
    if (function_exists('iconv')) {
        $converted = @iconv('UTF-8', 'ASCII//TRANSLIT', $text);
        if ($converted !== false) $text = $converted;
    }
    $text = strtolower($text);
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    $text = trim($text, '-');
    return $text !== '' ? $text : 'guide';
}

/** Ensure the slug is unique in `guides`, ignoring $ignoreId on updates. */
function uniqueGuideSlug(PDO $db, string $base, ?int $ignoreId = null): string {
    $slug = $base;
    $i = 2;
    while (true) {
        $sql = 'SELECT id FROM guides WHERE slug = ?' . ($ignoreId ? ' AND id <> ?' : '');
        $stmt = $db->prepare($sql);
        $stmt->execute($ignoreId ? [$slug, $ignoreId] : [$slug]);
        if (!$stmt->fetch()) return $slug;
        $slug = $base . '-' . $i++;
    }
}

$LIST_COLS = 'id, slug, title, excerpt, category, cover_path, author, read_minutes, is_published, is_featured, sort_order, published_at, created_at, updated_at';

switch ($method) {

    case 'GET':
        $db = getDB();

        // Public: single published guide by slug
        if (isset($_GET['slug'])) {
            $slug = (string)$_GET['slug'];
            $stmt = $db->prepare('SELECT * FROM guides WHERE slug = ? AND is_published = 1');
            $stmt->execute([$slug]);
            $g = $stmt->fetch();
            if (!$g) sendError('Guide not found', 404);
            sendJSON($g);
        }

        // Auth: single by id (full, for editing)
        if ($id) {
            requireAuth();
            $stmt = $db->prepare('SELECT * FROM guides WHERE id = ?');
            $stmt->execute([$id]);
            $g = $stmt->fetch();
            if (!$g) sendError('Guide not found', 404);
            sendJSON($g);
        }

        $all = isset($_GET['all']);
        if ($all) {
            requireAuth();
            $stmt = $db->query("SELECT * FROM guides ORDER BY is_featured DESC, sort_order ASC, COALESCE(published_at, created_at) DESC");
        } else {
            // Public listing — omit the (large) body field
            $stmt = $db->query("SELECT {$LIST_COLS} FROM guides WHERE is_published = 1 ORDER BY is_featured DESC, sort_order ASC, published_at DESC");
        }
        sendJSON(['guides' => $stmt->fetchAll(), 'total' => $stmt->rowCount()]);
        break;


    case 'POST':
        $auth = requireAuth();
        $db = getDB();

        // ─ Set cover image (multipart `photo`) ─
        if ($action === 'cover') {
            if (!$id) sendError('Guide ID is required', 400);
            $stmt = $db->prepare('SELECT cover_path FROM guides WHERE id = ?');
            $stmt->execute([$id]);
            $existing = $stmt->fetch();
            if (!$existing) sendError('Guide not found', 404);

            $cover = processImageUpload('photo', 'guides/');
            if (empty($cover)) sendError('Cover image is required (field: photo)', 400);

            if ($existing['cover_path']) deleteImageFiles($existing['cover_path']);
            $stmt = $db->prepare('UPDATE guides SET cover_path = ? WHERE id = ?');
            $stmt->execute([$cover['file_path'], $id]);

            auditLog('update_cover', 'guides', $id, null, $auth['sub']);
            $stmt = $db->prepare('SELECT * FROM guides WHERE id = ?');
            $stmt->execute([$id]);
            sendJSON($stmt->fetch());
            break;
        }

        $body = getJSONBody();
        $title = sanitize($body['title'] ?? '');
        $content = trim((string)($body['body'] ?? ''));
        if ($title === '' || $content === '') {
            sendError('Title and body are required', 400);
        }

        $slugBase = slugify($body['slug'] ?? $title);
        $slug = uniqueGuideSlug($db, $slugBase);
        $isPublished = (int)($body['is_published'] ?? 0);

        $stmt = $db->prepare(
            'INSERT INTO guides (slug, title, excerpt, body, category, author, read_minutes, meta_title, meta_description, is_published, is_featured, sort_order, published_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $slug,
            $title,
            sanitize($body['excerpt'] ?? ''),
            sanitize($content),
            sanitize($body['category'] ?? 'Wedding Planning'),
            sanitize($body['author'] ?? 'Amour Affairs'),
            max(1, (int)($body['read_minutes'] ?? 5)),
            sanitize($body['meta_title'] ?? ''),
            sanitize($body['meta_description'] ?? ''),
            $isPublished,
            (int)($body['is_featured'] ?? 0),
            (int)($body['sort_order'] ?? 0),
            $isPublished ? date('Y-m-d H:i:s') : null,
        ]);

        $newId = $db->lastInsertId();
        auditLog('create', 'guides', $newId, ['slug' => $slug], $auth['sub']);
        $stmt = $db->prepare('SELECT * FROM guides WHERE id = ?');
        $stmt->execute([$newId]);
        sendJSON($stmt->fetch(), 201);
        break;


    case 'PUT':
        $auth = requireAuth();
        if (!$id) sendError('Guide ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT * FROM guides WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) sendError('Guide not found', 404);

        $body = getJSONBody();
        $fields = [];
        $params = [];

        $stringFields = ['title', 'excerpt', 'body', 'category', 'author', 'meta_title', 'meta_description'];
        foreach ($stringFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = sanitize($body[$f]); }
        }
        $intFields = ['read_minutes', 'is_featured', 'sort_order'];
        foreach ($intFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = (int)$body[$f]; }
        }

        // Slug: regenerate only when explicitly provided
        if (array_key_exists('slug', $body) && trim((string)$body['slug']) !== '') {
            $fields[] = 'slug = ?';
            $params[] = uniqueGuideSlug($db, slugify($body['slug']), $id);
        }

        // Publish toggle — stamp published_at the first time it goes live
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
        $stmt = $db->prepare('UPDATE guides SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        auditLog('update', 'guides', $id, array_keys($body), $auth['sub']);
        $stmt = $db->prepare('SELECT * FROM guides WHERE id = ?');
        $stmt->execute([$id]);
        sendJSON($stmt->fetch());
        break;


    case 'DELETE':
        $auth = requireAuth();
        if (!$id) sendError('Guide ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT cover_path FROM guides WHERE id = ?');
        $stmt->execute([$id]);
        $g = $stmt->fetch();
        if (!$g) sendError('Guide not found', 404);

        if ($g['cover_path']) deleteImageFiles($g['cover_path']);
        $stmt = $db->prepare('DELETE FROM guides WHERE id = ?');
        $stmt->execute([$id]);

        auditLog('delete', 'guides', $id, null, $auth['sub']);
        sendJSON(['message' => 'Guide deleted']);
        break;

    default:
        sendError('Method not allowed', 405);
}
