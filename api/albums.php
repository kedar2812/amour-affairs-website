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
 * GET    /api/albums.php?id=X                  — Single album + photos + sections
 * POST   /api/albums.php                       — Create album, multipart w/ optional `cover` (auth)
 * POST   /api/albums.php?action=photos&id=X    — Add photos, multipart `photos[]` (+ optional section_id) (auth)
 * POST   /api/albums.php?action=cover&id=X     — Replace cover, multipart `cover` (auth)
 * POST   /api/albums.php?action=reorder        — Bulk reorder albums (auth)
 * PUT    /api/albums.php?id=X                  — Update album meta (auth)
 * DELETE /api/albums.php?id=X                  — Delete album + photos + files (auth)
 *
 * Sections — the ritual/segment filters inside a folder (Haldi, Mehendi, …):
 * POST   /api/albums.php?action=sections&id=X          — Create section on album X (auth)
 * PUT    /api/albums.php?action=sections&id=<sectionId>— Rename / toggle / reorder (auth)
 * DELETE /api/albums.php?action=sections&id=<sectionId>— Delete section; its photos
 *                                                        fall back to unsorted, never deleted (auth)
 * POST   /api/albums.php?action=sections_reorder&id=X  — Bulk reorder an album's sections (auth)
 * POST   /api/albums.php?action=assign&id=X            — Move photos into a section
 *                                                        {photo_ids:[], section_id:n|null} (auth)
 *
 * Individual photos are managed through gallery.php
 * (update / delete / reorder by gallery image id).
 *
 * NOTE: must stay PHP 7.3 compatible (live host) — no arrow
 * functions, no str_contains, no PHP 8 syntax.
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/upload.php';

handleCORS();
setJSONHeaders();

const ALBUM_TYPES = ['wedding', 'couple_shoot', 'premium_album'];

/**
 * Normalise a YouTube URL or bare ID down to its 11-char video ID.
 * Returns '' for empty input and null when the value isn't a valid ID/URL,
 * so callers can distinguish "clear the film" from "reject bad input".
 */
function extractAlbumFilmId(string $input): ?string {
    $input = trim($input);
    if ($input === '') return '';

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
        "SELECT id, album_id, section_id, title, caption, file_path, thumbnail_path, width, height, sort_order, is_active
         FROM gallery_images
         WHERE album_id IN ({$placeholders}) {$activeSQL}
         ORDER BY sort_order ASC, id ASC"
    );
    $stmt->execute($albumIds);

    $grouped = [];
    foreach ($stmt->fetchAll() as $photo) {
        $photo['section_id'] = $photo['section_id'] !== null ? (int)$photo['section_id'] : null;
        $grouped[$photo['album_id']][] = $photo;
    }
    return $grouped;
}

/**
 * Sections for a set of albums, grouped by album id.
 * Tolerates the table not existing yet (pre-migration) by returning [] —
 * albums must keep working whether or not sections have been rolled out.
 */
function fetchSectionsByAlbum(PDO $db, array $albumIds, bool $activeOnly): array {
    if (empty($albumIds)) return [];

    $placeholders = implode(',', array_fill(0, count($albumIds), '?'));
    $activeSQL = $activeOnly ? 'AND is_active = 1' : '';

    try {
        $stmt = $db->prepare(
            "SELECT id, album_id, name, sort_order, is_active
             FROM album_sections
             WHERE album_id IN ({$placeholders}) {$activeSQL}
             ORDER BY sort_order ASC, id ASC"
        );
        $stmt->execute($albumIds);
    } catch (PDOException $e) {
        return [];
    }

    $grouped = [];
    foreach ($stmt->fetchAll() as $section) {
        $section['id'] = (int)$section['id'];
        $section['album_id'] = (int)$section['album_id'];
        $grouped[$section['album_id']][] = $section;
    }
    return $grouped;
}

/** Count photos per section so the dashboard chips and website filters agree. */
function withSectionCounts(array $sections, array $photos): array {
    $counts = [];
    foreach ($photos as $photo) {
        if ($photo['section_id'] !== null) {
            $key = $photo['section_id'];
            $counts[$key] = isset($counts[$key]) ? $counts[$key] + 1 : 1;
        }
    }
    foreach ($sections as &$section) {
        $section['photo_count'] = isset($counts[$section['id']]) ? $counts[$section['id']] : 0;
    }
    unset($section);
    return $sections;
}

/** Load a section row, verifying it exists. Sends 404 otherwise. */
function findSection(PDO $db, int $sectionId): array {
    $stmt = $db->prepare('SELECT * FROM album_sections WHERE id = ?');
    $stmt->execute([$sectionId]);
    $section = $stmt->fetch();
    if (!$section) sendError('Section not found', 404);
    return $section;
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
            $sections = fetchSectionsByAlbum($db, [$id], $activeOnly)[$id] ?? [];
            $album = withEffectiveCover($album, $photos);
            $album['photos'] = $photos;
            $album['photo_count'] = count($photos);
            $album['sections'] = withSectionCounts($sections, $photos);
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

        $albumIds = array_column($albums, 'id');
        $photosByAlbum = fetchPhotosByAlbum($db, $albumIds, $activeOnly);
        $sectionsByAlbum = fetchSectionsByAlbum($db, $albumIds, $activeOnly);

        foreach ($albums as &$album) {
            $photos = $photosByAlbum[$album['id']] ?? [];
            $album = withEffectiveCover($album, $photos);
            $album['photo_count'] = count($photos);
            if ($withPhotos) {
                $album['photos'] = $photos;
                // Sections only mean anything alongside the photos they filter.
                $album['sections'] = withSectionCounts($sectionsByAlbum[$album['id']] ?? [], $photos);
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

        // ─ Create a section on an album ─
        if ($action === 'sections') {
            if (!$id) sendError('Album ID is required', 400);
            findAlbum($db, $id);

            $body = getJSONBody();
            $name = sanitize($body['name'] ?? '');
            if ($name === '') sendError('Section name is required', 400);
            if (mb_strlen($name) > 80) sendError('Section name is too long (80 characters max)', 400);

            // Names are the visitor-facing filter labels, so keep them unique
            // per album — two "Haldi" chips would be meaningless.
            $stmt = $db->prepare('SELECT id FROM album_sections WHERE album_id = ? AND name = ?');
            $stmt->execute([$id, $name]);
            if ($stmt->fetch()) sendError('That section already exists in this folder', 409);

            $stmt = $db->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM album_sections WHERE album_id = ?');
            $stmt->execute([$id]);
            $nextOrder = (int)$stmt->fetch()['next_order'];

            $stmt = $db->prepare('INSERT INTO album_sections (album_id, name, sort_order) VALUES (?, ?, ?)');
            $stmt->execute([$id, $name, $nextOrder]);
            $sectionId = (int)$db->lastInsertId();

            auditLog('create_section', 'albums', $id, ['section_id' => $sectionId, 'name' => $name], $auth['sub']);
            sendJSON([
                'id' => $sectionId,
                'album_id' => $id,
                'name' => $name,
                'sort_order' => $nextOrder,
                'is_active' => 1,
                'photo_count' => 0,
            ], 201);
        }

        // ─ Reorder an album's sections ─
        if ($action === 'sections_reorder') {
            if (!$id) sendError('Album ID is required', 400);
            $body = getJSONBody();
            $orders = $body['orders'] ?? [];
            if (empty($orders) || !is_array($orders)) sendError('orders array is required', 400);

            // Scoped to this album so a stray id can't reorder someone else's folder.
            $stmt = $db->prepare('UPDATE album_sections SET sort_order = ? WHERE id = ? AND album_id = ?');
            foreach ($orders as $item) {
                if (isset($item['id'], $item['sort_order'])) {
                    $stmt->execute([(int)$item['sort_order'], (int)$item['id'], $id]);
                }
            }
            auditLog('reorder_sections', 'albums', $id, ['count' => count($orders)], $auth['sub']);
            sendJSON(['message' => 'Section order updated', 'count' => count($orders)]);
        }

        // ─ Move photos into a section (or back to unsorted with section_id null) ─
        if ($action === 'assign') {
            if (!$id) sendError('Album ID is required', 400);
            findAlbum($db, $id);

            $body = getJSONBody();
            $photoIds = $body['photo_ids'] ?? [];
            if (empty($photoIds) || !is_array($photoIds)) sendError('photo_ids array is required', 400);

            $sectionId = null;
            if (array_key_exists('section_id', $body) && $body['section_id'] !== null && $body['section_id'] !== '') {
                $sectionId = (int)$body['section_id'];
                $section = findSection($db, $sectionId);
                // A photo can only join a section of its own album.
                if ((int)$section['album_id'] !== $id) {
                    sendError('That section belongs to a different folder', 400);
                }
            }

            $ids = [];
            foreach ($photoIds as $pid) {
                $pid = (int)$pid;
                if ($pid > 0) $ids[] = $pid;
            }
            if (empty($ids)) sendError('photo_ids must contain at least one valid id', 400);

            // Scoped to this album — the WHERE album_id guard means a photo id
            // from another folder is silently ignored rather than moved.
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $stmt = $db->prepare("UPDATE gallery_images SET section_id = ? WHERE album_id = ? AND id IN ({$placeholders})");
            $stmt->execute(array_merge([$sectionId, $id], $ids));
            $moved = $stmt->rowCount();

            auditLog('assign_section', 'albums', $id, ['section_id' => $sectionId, 'photos' => count($ids)], $auth['sub']);
            sendJSON(['message' => $moved . ' photo(s) moved', 'moved' => $moved, 'section_id' => $sectionId]);
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

            // Uploading while a section is open drops the photos straight into
            // it, so the studio never has to sort a fresh batch by hand.
            $sectionId = null;
            if (isset($_POST['section_id']) && $_POST['section_id'] !== '') {
                $sectionId = (int)$_POST['section_id'];
                $section = findSection($db, $sectionId);
                if ((int)$section['album_id'] !== $id) {
                    sendError('That section belongs to a different folder', 400);
                }
            }

            $stmt = $db->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM gallery_images WHERE album_id = ?');
            $stmt->execute([$id]);
            $nextOrder = (int)$stmt->fetch()['next_order'];

            $insert = $db->prepare(
                'INSERT INTO gallery_images (category, album_id, section_id, title, caption, file_path, thumbnail_path, original_filename, file_size, width, height, sort_order, uploaded_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
                    $sectionId,
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

        // Optional wedding film (YouTube). Accept a URL or a bare ID.
        $filmId = extractAlbumFilmId((string)($_POST['film_youtube_id'] ?? ''));
        if ($filmId === null) {
            sendError('film_youtube_id must be a valid YouTube link or video ID', 400);
        }

        // Optional cover upload
        $coverData = processImageUpload('cover', 'albums/');

        $stmt = $db->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM albums WHERE type = ?');
        $stmt->execute([$type]);
        $nextOrder = (int)$stmt->fetch()['next_order'];

        $stmt = $db->prepare(
            'INSERT INTO albums (type, couple, location, date_label, description, film_youtube_id, cover_path, cover_thumbnail, sort_order, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $type,
            $couple,
            $location,
            $dateLabel,
            $description,
            $filmId !== '' ? $filmId : null,
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

        // ─ Rename / show / hide a section (id here is the SECTION id) ─
        if ($action === 'sections') {
            $section = findSection($db, $id);
            $body = getJSONBody();

            $fields = [];
            $params = [];

            if (array_key_exists('name', $body)) {
                $name = sanitize($body['name']);
                if ($name === '') sendError('Section name cannot be empty', 400);
                if (mb_strlen($name) > 80) sendError('Section name is too long (80 characters max)', 400);

                $stmt = $db->prepare('SELECT id FROM album_sections WHERE album_id = ? AND name = ? AND id <> ?');
                $stmt->execute([$section['album_id'], $name, $id]);
                if ($stmt->fetch()) sendError('That section already exists in this folder', 409);

                $fields[] = 'name = ?';
                $params[] = $name;
            }
            foreach (['sort_order', 'is_active'] as $field) {
                if (array_key_exists($field, $body)) {
                    $fields[] = "{$field} = ?";
                    $params[] = (int)$body[$field];
                }
            }
            if (empty($fields)) sendError('No fields to update', 400);

            $params[] = $id;
            $stmt = $db->prepare('UPDATE album_sections SET ' . implode(', ', $fields) . ' WHERE id = ?');
            $stmt->execute($params);

            auditLog('update_section', 'albums', (int)$section['album_id'], array_merge(['section_id' => $id], $body), $auth['sub']);
            sendJSON(findSection($db, $id));
        }

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

        // Wedding film — normalise URL/ID, allow clearing with an empty string
        if (array_key_exists('film_youtube_id', $body)) {
            $filmId = extractAlbumFilmId((string)$body['film_youtube_id']);
            if ($filmId === null) {
                sendError('film_youtube_id must be a valid YouTube link or video ID', 400);
            }
            $fields[] = 'film_youtube_id = ?';
            $params[] = $filmId !== '' ? $filmId : null;
        }

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

        // ─ Delete a section (id here is the SECTION id) ─
        // Photographs are NEVER deleted with it: the FK is ON DELETE SET NULL,
        // so the section's photos simply return to unsorted and keep showing
        // under the website's "All" filter. Losing a label must not lose work.
        if ($action === 'sections') {
            $section = findSection($db, $id);

            $stmt = $db->prepare('SELECT COUNT(*) FROM gallery_images WHERE section_id = ?');
            $stmt->execute([$id]);
            $released = (int)$stmt->fetchColumn();

            // Explicit, so the behaviour holds even if the FK isn't in place.
            $stmt = $db->prepare('UPDATE gallery_images SET section_id = NULL WHERE section_id = ?');
            $stmt->execute([$id]);

            $stmt = $db->prepare('DELETE FROM album_sections WHERE id = ?');
            $stmt->execute([$id]);

            auditLog('delete_section', 'albums', (int)$section['album_id'], ['section_id' => $id, 'name' => $section['name'], 'released' => $released], $auth['sub']);
            sendJSON([
                'message' => 'Section removed',
                'released' => $released,
            ]);
        }

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
