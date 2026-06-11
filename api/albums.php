<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Albums API
 * ============================================================
 * Albums power the Weddings, Couple Shoots and Premium Albums
 * archive pages. Each album holds meta (couple, location, …),
 * a cover image, and photos stored in gallery_images with
 * album_id set.
 *
 * GET    /api/albums.php                       — List albums (public)
 *        ?type=wedding|couple_shoot|premium_album
 *        ?all=1            include hidden albums (dashboard)
 *        ?with_photos=1    embed each album's photos (website)
 * GET    /api/albums.php?id=X                  — Single album + photos
 * POST   /api/albums.php                       — Create album, multipart w/ optional `cover` (auth)
 * POST   /api/albums.php?action=photos&id=X    — Add photos, multipart `photos[]` (auth)
 * POST   /api/albums.php?action=cover&id=X     — Replace cover, multipart `cover` (auth)
 * POST   /api/albums.php?action=reorder        — Bulk reorder albums (auth)
 * PUT    /api/albums.php?id=X                  — Update album meta (auth)
 * DELETE /api/albums.php?id=X                  — Delete album + photos + files (auth)
 *
 * Individual photos are managed through gallery.php
 * (update / delete / reorder by gallery image id).
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/upload.php';

handleCORS();
setJSONHeaders();

const ALBUM_TYPES = ['wedding', 'couple_shoot', 'premium_album'];

$method = getMethod();
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$action = $_GET['action'] ?? '';

/**
 * Fetch an album row or send 404
 */
function findAlbum(PDO $db, int $id): array {
    $stmt = $db->prepare('SELECT * FROM albums WHERE id = ?');
    $stmt->execute([$id]);
    $album = $stmt->fetch();
    if (!$album) sendError('Album not found', 404);
    return $album;
}

/**
 * Fetch photos for a set of album ids, grouped by album id
 */
function fetchPhotosByAlbum(PDO $db, array $albumIds, bool $activeOnly): array {
    if (empty($albumIds)) return [];

    $placeholders = implode(',', array_fill(0, count($albumIds), '?'));
    $activeSQL = $activeOnly ? 'AND is_active = 1' : '';

    $stmt = $db->prepare(
        "SELECT id, album_id, title, caption, file_path, thumbnail_path, width, height, sort_order, is_active
         FROM gallery_images
         WHERE album_id IN ({$placeholders}) {$activeSQL}
         ORDER BY sort_order ASC, id ASC"
    );
    $stmt->execute($albumIds);

    $grouped = [];
    foreach ($stmt->fetchAll() as $photo) {
        $grouped[$photo['album_id']][] = $photo;
    }
    return $grouped;
}

/**
 * Attach computed cover fields — falls back to the first photo
 * when no dedicated cover was uploaded.
 */
function withEffectiveCover(array $album, array $photos): array {
    $first = $photos[0] ?? null;
    $album['cover'] = $album['cover_path'] ?: ($first['file_path'] ?? null);
    $album['cover_thumb'] = $album['cover_thumbnail'] ?: ($first['thumbnail_path'] ?? null);
    return $album;
}

switch ($method) {

    // ── LIST / GET ──
    case 'GET':
        $db = getDB();
        $activeOnly = !isset($_GET['all']); // By default only show active

        if ($id) {
            $album = findAlbum($db, $id);
            if ($activeOnly && !$album['is_active']) sendError('Album not found', 404);

            $photos = fetchPhotosByAlbum($db, [$id], $activeOnly)[$id] ?? [];
            $album = withEffectiveCover($album, $photos);
            $album['photos'] = $photos;
            $album['photo_count'] = count($photos);
            sendJSON($album);
        }

        $type = $_GET['type'] ?? '';
        $withPhotos = isset($_GET['with_photos']);

        $where = [];
        $params = [];

        if ($activeOnly) {
            $where[] = 'is_active = 1';
        }
        if ($type) {
            if (!in_array($type, ALBUM_TYPES, true)) {
                sendError('Invalid album type', 400);
            }
            $where[] = 'type = ?';
            $params[] = $type;
        }

        $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $stmt = $db->prepare("SELECT * FROM albums {$whereSQL} ORDER BY sort_order ASC, created_at DESC");
        $stmt->execute($params);
        $albums = $stmt->fetchAll();

        $photosByAlbum = fetchPhotosByAlbum($db, array_column($albums, 'id'), $activeOnly);

        foreach ($albums as &$album) {
            $photos = $photosByAlbum[$album['id']] ?? [];
            $album = withEffectiveCover($album, $photos);
            $album['photo_count'] = count($photos);
            if ($withPhotos) {
                $album['photos'] = $photos;
            }
        }
        unset($album);

        sendJSON(['albums' => $albums, 'total' => count($albums)]);
        break;


    // ── CREATE / ADD PHOTOS / REPLACE COVER / REORDER ──
    case 'POST':
        $auth = requireAuth();
        $db = getDB();

        // ─ Bulk reorder ─
        if ($action === 'reorder') {
            $body = getJSONBody();
            $orders = $body['orders'] ?? [];
            if (empty($orders) || !is_array($orders)) {
                sendError('orders array is required', 400);
            }
            $stmt = $db->prepare('UPDATE albums SET sort_order = ? WHERE id = ?');
            foreach ($orders as $item) {
                if (isset($item['id'], $item['sort_order'])) {
                    $stmt->execute([(int)$item['sort_order'], (int)$item['id']]);
                }
            }
            auditLog('reorder', 'albums', null, ['count' => count($orders)], $auth['sub']);
            sendJSON(['message' => 'Order updated', 'count' => count($orders)]);
            break;
        }

        // ─ Add photos to an album (batch upload) ─
        if ($action === 'photos') {
            if (!$id) sendError('Album ID is required', 400);
            $album = findAlbum($db, $id);

            $files = normalizeUploadedFiles('photos');
            if (empty($files)) {
                sendError('At least one photo is required (field: photos[])', 400);
            }

            // Validate everything before touching disk or DB
            foreach ($files as $file) {
                $error = validateImageFile($file);
                if ($error !== null) {
                    sendError("\"{$file['name']}\": {$error}", 400);
                }
            }

            // Album photos share the gallery category of their album type
            $category = $album['type'];

            $stmt = $db->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM gallery_images WHERE album_id = ?');
            $stmt->execute([$id]);
            $nextOrder = (int)$stmt->fetch()['next_order'];

            $insert = $db->prepare(
                'INSERT INTO gallery_images (category, album_id, title, caption, file_path, thumbnail_path, original_filename, file_size, width, height, sort_order, uploaded_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );

            $created = [];
            foreach ($files as $i => $file) {
                $imageData = processSingleImageFile($file, 'albums/');
                if ($imageData === false) {
                    // Earlier files in the batch are already saved — report partial success
                    sendError(
                        "Failed to process \"{$file['name']}\". "
                        . count($created) . ' of ' . count($files) . ' photos were uploaded — please retry the rest.',
                        500
                    );
                }
                $insert->execute([
                    $category,
                    $id,
                    '',
                    '',
                    $imageData['file_path'],
                    $imageData['thumbnail_path'],
                    $imageData['original_name'],
                    $imageData['file_size'],
                    $imageData['width'],
                    $imageData['height'],
                    $nextOrder + $i,
                    $auth['sub'],
                ]);
                $created[] = (int)$db->lastInsertId();
            }

            auditLog('add_photos', 'albums', $id, ['count' => count($created)], $auth['sub']);

            $photos = fetchPhotosByAlbum($db, [$id], false)[$id] ?? [];
            sendJSON(['message' => count($created) . ' photo(s) added', 'photos' => $photos], 201);
            break;
        }

        // ─ Replace cover image ─
        if ($action === 'cover') {
            if (!$id) sendError('Album ID is required', 400);
            $album = findAlbum($db, $id);

            $imageData = processImageUpload('cover', 'albums/');
            if (empty($imageData)) {
                sendError('Cover image file is required (field: cover)', 400);
            }

            // Remove the previous cover files
            if ($album['cover_path']) {
                deleteImageFiles($album['cover_path'], $album['cover_thumbnail']);
            }

            $stmt = $db->prepare('UPDATE albums SET cover_path = ?, cover_thumbnail = ? WHERE id = ?');
            $stmt->execute([$imageData['file_path'], $imageData['thumbnail_path'], $id]);

            auditLog('update_cover', 'albums', $id, null, $auth['sub']);
            sendJSON(findAlbum($db, $id));
            break;
        }

        // ─ Create album ─
        $type = sanitize($_POST['type'] ?? '');
        $couple = sanitize($_POST['couple'] ?? '');

        if (!in_array($type, ALBUM_TYPES, true)) {
            sendError('type must be one of: ' . implode(', ', ALBUM_TYPES), 400);
        }
        if ($couple === '') {
            sendError('couple (album title) is required', 400);
        }

        $location = sanitize($_POST['location'] ?? '');
        $dateLabel = sanitize($_POST['date_label'] ?? '');
        $description = sanitize($_POST['description'] ?? '');

        // Optional cover upload
        $coverData = processImageUpload('cover', 'albums/');

        $stmt = $db->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM albums WHERE type = ?');
        $stmt->execute([$type]);
        $nextOrder = (int)$stmt->fetch()['next_order'];

        $stmt = $db->prepare(
            'INSERT INTO albums (type, couple, location, date_label, description, cover_path, cover_thumbnail, sort_order, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $type,
            $couple,
            $location,
            $dateLabel,
            $description,
            $coverData['file_path'] ?? null,
            $coverData['thumbnail_path'] ?? null,
            $nextOrder,
            $auth['sub'],
        ]);

        $newId = (int)$db->lastInsertId();
        auditLog('create', 'albums', $newId, ['type' => $type, 'couple' => $couple], $auth['sub']);

        $album = findAlbum($db, $newId);
        $album = withEffectiveCover($album, []);
        $album['photos'] = [];
        $album['photo_count'] = 0;
        sendJSON($album, 201);
        break;


    // ── UPDATE META ──
    case 'PUT':
        $auth = requireAuth();
        if (!$id) sendError('Album ID is required', 400);

        $db = getDB();
        findAlbum($db, $id);

        $body = getJSONBody();

        if (isset($body['type']) && !in_array($body['type'], ALBUM_TYPES, true)) {
            sendError('type must be one of: ' . implode(', ', ALBUM_TYPES), 400);
        }
        if (array_key_exists('couple', $body) && trim((string)$body['couple']) === '') {
            sendError('couple (album title) cannot be empty', 400);
        }

        $fields = [];
        $params = [];

        $updatable = ['type', 'couple', 'location', 'date_label', 'description', 'sort_order', 'is_active'];
        foreach ($updatable as $field) {
            if (array_key_exists($field, $body)) {
                $fields[] = "{$field} = ?";
                $params[] = is_string($body[$field]) ? sanitize($body[$field]) : $body[$field];
            }
        }

        if (empty($fields)) sendError('No fields to update', 400);

        // Keep photo categories in sync when the album type changes
        $params[] = $id;
        $stmt = $db->prepare('UPDATE albums SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        if (isset($body['type'])) {
            $stmt = $db->prepare('UPDATE gallery_images SET category = ? WHERE album_id = ?');
            $stmt->execute([$body['type'], $id]);
        }

        auditLog('update', 'albums', $id, $body, $auth['sub']);

        $album = findAlbum($db, $id);
        $photos = fetchPhotosByAlbum($db, [$id], false)[$id] ?? [];
        $album = withEffectiveCover($album, $photos);
        $album['photo_count'] = count($photos);
        sendJSON($album);
        break;


    // ── DELETE ──
    case 'DELETE':
        $auth = requireAuth();
        if (!$id) sendError('Album ID is required', 400);

        $db = getDB();
        $album = findAlbum($db, $id);

        // Collect every file owned by this album before removing rows
        $stmt = $db->prepare('SELECT file_path, thumbnail_path FROM gallery_images WHERE album_id = ?');
        $stmt->execute([$id]);
        $photoFiles = $stmt->fetchAll();

        $db->beginTransaction();
        try {
            $stmt = $db->prepare('DELETE FROM gallery_images WHERE album_id = ?');
            $stmt->execute([$id]);
            $stmt = $db->prepare('DELETE FROM albums WHERE id = ?');
            $stmt->execute([$id]);
            $db->commit();
        } catch (PDOException $e) {
            $db->rollBack();
            error_log('Album delete failed: ' . $e->getMessage());
            sendError('Failed to delete album', 500);
        }

        // DB is consistent — now clean up files
        foreach ($photoFiles as $photo) {
            deleteImageFiles($photo['file_path'], $photo['thumbnail_path']);
        }
        if ($album['cover_path']) {
            deleteImageFiles($album['cover_path'], $album['cover_thumbnail']);
        }

        auditLog('delete', 'albums', $id, ['couple' => $album['couple'], 'photos' => count($photoFiles)], $auth['sub']);
        sendJSON(['message' => 'Album deleted']);
        break;

    default:
        sendError('Method not allowed', 405);
}
