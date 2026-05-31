<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Gallery API
 * ============================================================
 * GET    /api/gallery.php              — List images (public)
 * GET    /api/gallery.php?id=X         — Get single image
 * POST   /api/gallery.php              — Upload image (auth)
 * PUT    /api/gallery.php?id=X         — Update image meta (auth)
 * DELETE /api/gallery.php?id=X         — Delete image (auth)
 * PUT    /api/gallery.php?action=reorder — Bulk reorder (auth)
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

switch ($method) {

    // ── LIST / GET ──
    case 'GET':
        $db = getDB();

        if ($id) {
            $stmt = $db->prepare('SELECT * FROM gallery_images WHERE id = ?');
            $stmt->execute([$id]);
            $image = $stmt->fetch();
            if (!$image) sendError('Image not found', 404);
            sendJSON($image);
        }

        // List with filters
        $category = $_GET['category'] ?? '';
        $featured = isset($_GET['featured']) ? (int)$_GET['featured'] : null;
        $activeOnly = !isset($_GET['all']); // By default only show active

        $where = [];
        $params = [];

        if ($activeOnly) {
            $where[] = 'is_active = 1';
        }
        if ($category) {
            $where[] = 'category = ?';
            $params[] = $category;
        }
        if ($featured !== null) {
            $where[] = 'is_featured = ?';
            $params[] = $featured;
        }

        $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $stmt = $db->prepare("SELECT * FROM gallery_images {$whereSQL} ORDER BY sort_order ASC, created_at DESC");
        $stmt->execute($params);

        sendJSON(['images' => $stmt->fetchAll(), 'total' => $stmt->rowCount()]);
        break;


    // ── CREATE (Upload) ──
    case 'POST':
        $auth = requireAuth();

        if ($action === 'reorder') {
            // Handled via POST with JSON body for reordering
            $body = getJSONBody();
            $orders = $body['orders'] ?? [];
            if (empty($orders) || !is_array($orders)) {
                sendError('orders array is required', 400);
            }
            $db = getDB();
            $stmt = $db->prepare('UPDATE gallery_images SET sort_order = ? WHERE id = ?');
            foreach ($orders as $item) {
                if (isset($item['id'], $item['sort_order'])) {
                    $stmt->execute([(int)$item['sort_order'], (int)$item['id']]);
                }
            }
            auditLog('reorder', 'gallery_images', null, ['count' => count($orders)], $auth['sub']);
            sendJSON(['message' => 'Order updated', 'count' => count($orders)]);
            break;
        }

        // Process image upload
        $imageData = processImageUpload('image', 'gallery/');
        if (empty($imageData)) {
            sendError('Image file is required', 400);
        }

        $category = sanitize($_POST['category'] ?? 'general');
        $title = sanitize($_POST['title'] ?? '');
        $caption = sanitize($_POST['caption'] ?? '');
        $isFeatured = (int)($_POST['is_featured'] ?? 0);

        // Validate category
        $validCategories = ['wedding', 'couple_shoot', 'film', 'premium_album', 'general'];
        if (!in_array($category, $validCategories, true)) {
            $category = 'general';
        }

        $db = getDB();

        // Get next sort order
        $stmt = $db->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM gallery_images WHERE category = ?');
        $stmt->execute([$category]);
        $nextOrder = $stmt->fetch()['next_order'];

        $stmt = $db->prepare(
            'INSERT INTO gallery_images (category, title, caption, file_path, thumbnail_path, original_filename, file_size, width, height, sort_order, is_featured, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $category,
            $title,
            $caption,
            $imageData['file_path'],
            $imageData['thumbnail_path'],
            $imageData['original_name'],
            $imageData['file_size'],
            $imageData['width'],
            $imageData['height'],
            $nextOrder,
            $isFeatured,
            $auth['sub']
        ]);

        $newId = $db->lastInsertId();
        auditLog('create', 'gallery_images', $newId, ['category' => $category], $auth['sub']);

        // Return created image
        $stmt = $db->prepare('SELECT * FROM gallery_images WHERE id = ?');
        $stmt->execute([$newId]);
        sendJSON($stmt->fetch(), 201);
        break;


    // ── UPDATE ──
    case 'PUT':
        $auth = requireAuth();

        if ($action === 'reorder') {
            $body = getJSONBody();
            $orders = $body['orders'] ?? [];
            if (empty($orders)) sendError('orders array is required', 400);

            $db = getDB();
            $stmt = $db->prepare('UPDATE gallery_images SET sort_order = ? WHERE id = ?');
            foreach ($orders as $item) {
                if (isset($item['id'], $item['sort_order'])) {
                    $stmt->execute([(int)$item['sort_order'], (int)$item['id']]);
                }
            }
            auditLog('reorder', 'gallery_images', null, ['count' => count($orders)], $auth['sub']);
            sendJSON(['message' => 'Order updated']);
            break;
        }

        if (!$id) sendError('Image ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT * FROM gallery_images WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) sendError('Image not found', 404);

        $body = getJSONBody();

        $fields = [];
        $params = [];

        $updatable = ['category', 'title', 'caption', 'is_featured', 'is_active', 'sort_order'];
        foreach ($updatable as $field) {
            if (array_key_exists($field, $body)) {
                $fields[] = "{$field} = ?";
                $params[] = is_string($body[$field]) ? sanitize($body[$field]) : $body[$field];
            }
        }

        if (empty($fields)) sendError('No fields to update', 400);

        $params[] = $id;
        $stmt = $db->prepare('UPDATE gallery_images SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);

        auditLog('update', 'gallery_images', $id, $body, $auth['sub']);

        $stmt = $db->prepare('SELECT * FROM gallery_images WHERE id = ?');
        $stmt->execute([$id]);
        sendJSON($stmt->fetch());
        break;


    // ── DELETE ──
    case 'DELETE':
        $auth = requireAuth();
        if (!$id) sendError('Image ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT file_path, thumbnail_path FROM gallery_images WHERE id = ?');
        $stmt->execute([$id]);
        $image = $stmt->fetch();
        if (!$image) sendError('Image not found', 404);

        // Delete files from disk
        deleteImageFiles($image['file_path'], $image['thumbnail_path']);

        // Delete from DB
        $stmt = $db->prepare('DELETE FROM gallery_images WHERE id = ?');
        $stmt->execute([$id]);

        auditLog('delete', 'gallery_images', $id, null, $auth['sub']);
        sendJSON(['message' => 'Image deleted']);
        break;

    default:
        sendError('Method not allowed', 405);
}
