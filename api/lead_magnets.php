<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Lead Magnets API
 * ============================================================
 * GET    /api/lead_magnets.php                 — List active (public, no file path)
 * GET    /api/lead_magnets.php?all=1           — List all incl. file + stats (auth)
 * GET    /api/lead_magnets.php?id=X            — Single (auth)
 * POST   /api/lead_magnets.php                 — Create (auth, JSON)
 * POST   /api/lead_magnets.php?action=file&id=X    — Upload PDF (auth, multipart `file`)
 * POST   /api/lead_magnets.php?action=cover&id=X   — Cover image (auth, multipart `photo`)
 * POST   /api/lead_magnets.php?action=download&id=X — Gated download (PUBLIC: captures a lead)
 * PUT    /api/lead_magnets.php?id=X            — Update (auth)
 * DELETE /api/lead_magnets.php?id=X            — Delete (auth)
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

function lmSlugify(string $text): string {
    $text = trim($text);
    if (function_exists('iconv')) {
        $c = @iconv('UTF-8', 'ASCII//TRANSLIT', $text);
        if ($c !== false) $text = $c;
    }
    $text = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($text)), '-');
    return $text !== '' ? $text : 'guide';
}

function uniqueMagnetSlug(PDO $db, string $base, ?int $ignoreId = null): string {
    $slug = $base; $i = 2;
    while (true) {
        $sql = 'SELECT id FROM lead_magnets WHERE slug = ?' . ($ignoreId ? ' AND id <> ?' : '');
        $stmt = $db->prepare($sql);
        $stmt->execute($ignoreId ? [$slug, $ignoreId] : [$slug]);
        if (!$stmt->fetch()) return $slug;
        $slug = $base . '-' . $i++;
    }
}

/**
 * Public gated download — captures the visitor as a lead, then returns the
 * file URL. Rate-limited + honeypot, mirroring the website inquiry endpoint.
 */
function handleDownload(int $magnetId): void {
    checkRateLimit('lead_magnet_download', 10, 600);

    $body = getJSONBody();

    // Honeypot
    if (!empty($body['website'])) {
        sendJSON(['message' => 'Thank you!'], 200);
    }

    $name = sanitize($body['client_name'] ?? $body['name'] ?? '');
    $email = trim((string)($body['email'] ?? ''));
    $phone = sanitize($body['phone'] ?? '');

    // Name + phone are required so the studio can always call the lead back;
    // email is optional but must be valid when provided.
    if (mb_strlen($name) < 2 || mb_strlen($name) > 200) {
        sendError('Please enter your name', 400);
    }
    if ($phone === '' || !preg_match('/^[0-9+\-\s().]{7,20}$/', $phone)) {
        sendError('Please enter a valid phone number', 400);
    }
    if ($email !== '' && (!isValidEmail($email) || mb_strlen($email) > 255)) {
        sendError('Please enter a valid email address', 400);
    }

    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM lead_magnets WHERE id = ? AND is_active = 1');
    $stmt->execute([$magnetId]);
    $magnet = $stmt->fetch();
    if (!$magnet || empty($magnet['file_path'])) {
        sendError('This download is not available right now.', 404);
    }

    // Record the visitor in the leads pipeline
    $note = [[
        'content' => 'Downloaded free guide: ' . html_entity_decode($magnet['title'], ENT_QUOTES | ENT_HTML5, 'UTF-8'),
        'author'  => 'Lead Magnet',
        'date'    => date('Y-m-d H:i:s'),
    ]];

    $stmt = $db->prepare(
        'INSERT INTO leads (lead_ref, client_name, phone, email, event_type, source, stage, last_activity, moved_to_stage_at, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)'
    );
    $stmt->execute([
        'tmp-' . bin2hex(random_bytes(8)),
        $name,
        $phone,
        sanitize($email),
        'Wedding',
        'Website',
        'New Inquiry',
        json_encode($note, JSON_UNESCAPED_UNICODE),
    ]);
    $newId = (int)$db->lastInsertId();
    $leadRef = '#LD-' . (800 + $newId);
    $db->prepare('UPDATE leads SET lead_ref = ? WHERE id = ?')->execute([$leadRef, $newId]);

    // Bump the download counter
    $db->prepare('UPDATE lead_magnets SET download_count = download_count + 1 WHERE id = ?')->execute([$magnetId]);

    auditLog('download', 'lead_magnets', $magnetId, ['lead' => $leadRef], null);

    sendJSON([
        'message'   => 'Thank you! Your guide is ready.',
        'file_url'  => $magnet['file_path'],
        'file_name' => html_entity_decode($magnet['title'], ENT_QUOTES | ENT_HTML5, 'UTF-8') . '.pdf',
    ], 201);
}

switch ($method) {

    case 'GET':
        $db = getDB();

        if ($id) {
            requireAuth();
            $stmt = $db->prepare('SELECT * FROM lead_magnets WHERE id = ?');
            $stmt->execute([$id]);
            $m = $stmt->fetch();
            if (!$m) sendError('Lead magnet not found', 404);
            sendJSON($m);
        }

        $all = isset($_GET['all']);
        if ($all) {
            requireAuth();
            $stmt = $db->query('SELECT * FROM lead_magnets ORDER BY sort_order ASC, id DESC');
            sendJSON(['lead_magnets' => $stmt->fetchAll(), 'total' => $stmt->rowCount()]);
        }

        // Public listing — only active magnets that actually have a file, and
        // never expose the raw file path (downloads go through the gated action)
        $stmt = $db->query(
            "SELECT id, slug, title, description, cover_path, button_label, sort_order
             FROM lead_magnets WHERE is_active = 1 AND file_path IS NOT NULL AND file_path <> ''
             ORDER BY sort_order ASC, id DESC"
        );
        sendJSON(['lead_magnets' => $stmt->fetchAll(), 'total' => $stmt->rowCount()]);
        break;


    case 'POST':
        // Public gated download
        if ($action === 'download') {
            if (!$id) sendError('Lead magnet ID is required', 400);
            handleDownload($id);
            break;
        }

        $auth = requireAuth();
        $db = getDB();

        // Upload the PDF document
        if ($action === 'file') {
            if (!$id) sendError('Lead magnet ID is required', 400);
            $stmt = $db->prepare('SELECT file_path FROM lead_magnets WHERE id = ?');
            $stmt->execute([$id]);
            $existing = $stmt->fetch();
            if (!$existing) sendError('Lead magnet not found', 404);

            $doc = processDocumentUpload('file', 'lead-magnets/');
            if (empty($doc)) sendError('PDF file is required (field: file)', 400);
            if ($existing['file_path']) deleteStoredFile($existing['file_path']);

            $db->prepare('UPDATE lead_magnets SET file_path = ? WHERE id = ?')->execute([$doc['file_path'], $id]);
            auditLog('upload_file', 'lead_magnets', $id, null, $auth['sub']);

            $stmt = $db->prepare('SELECT * FROM lead_magnets WHERE id = ?');
            $stmt->execute([$id]);
            sendJSON($stmt->fetch());
            break;
        }

        // Upload cover image
        if ($action === 'cover') {
            if (!$id) sendError('Lead magnet ID is required', 400);
            $stmt = $db->prepare('SELECT cover_path FROM lead_magnets WHERE id = ?');
            $stmt->execute([$id]);
            $existing = $stmt->fetch();
            if (!$existing) sendError('Lead magnet not found', 404);

            $cover = processImageUpload('photo', 'lead-magnets/');
            if (empty($cover)) sendError('Cover image is required (field: photo)', 400);
            if ($existing['cover_path']) deleteImageFiles($existing['cover_path']);

            $db->prepare('UPDATE lead_magnets SET cover_path = ? WHERE id = ?')->execute([$cover['file_path'], $id]);
            auditLog('update_cover', 'lead_magnets', $id, null, $auth['sub']);

            $stmt = $db->prepare('SELECT * FROM lead_magnets WHERE id = ?');
            $stmt->execute([$id]);
            sendJSON($stmt->fetch());
            break;
        }

        $body = getJSONBody();
        $title = sanitize($body['title'] ?? '');
        if ($title === '') sendError('Title is required', 400);

        $slug = uniqueMagnetSlug($db, lmSlugify($body['slug'] ?? $title));
        $stmt = $db->prepare(
            'INSERT INTO lead_magnets (slug, title, description, button_label, is_active, sort_order)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $slug,
            $title,
            sanitize($body['description'] ?? ''),
            sanitize($body['button_label'] ?? 'Download Free Guide'),
            (int)($body['is_active'] ?? 1),
            (int)($body['sort_order'] ?? 0),
        ]);

        $newId = $db->lastInsertId();
        auditLog('create', 'lead_magnets', $newId, ['slug' => $slug], $auth['sub']);
        $stmt = $db->prepare('SELECT * FROM lead_magnets WHERE id = ?');
        $stmt->execute([$newId]);
        sendJSON($stmt->fetch(), 201);
        break;


    case 'PUT':
        $auth = requireAuth();
        if (!$id) sendError('Lead magnet ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT id FROM lead_magnets WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) sendError('Lead magnet not found', 404);

        $body = getJSONBody();
        $fields = [];
        $params = [];

        $stringFields = ['title', 'description', 'button_label'];
        foreach ($stringFields as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = sanitize($body[$f]); }
        }
        foreach (['is_active', 'sort_order'] as $f) {
            if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = (int)$body[$f]; }
        }
        if (array_key_exists('slug', $body) && trim((string)$body['slug']) !== '') {
            $fields[] = 'slug = ?';
            $params[] = uniqueMagnetSlug($db, lmSlugify($body['slug']), $id);
        }
        if (empty($fields)) sendError('No fields to update', 400);

        $params[] = $id;
        $db->prepare('UPDATE lead_magnets SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        auditLog('update', 'lead_magnets', $id, array_keys($body), $auth['sub']);

        $stmt = $db->prepare('SELECT * FROM lead_magnets WHERE id = ?');
        $stmt->execute([$id]);
        sendJSON($stmt->fetch());
        break;


    case 'DELETE':
        $auth = requireAuth();
        if (!$id) sendError('Lead magnet ID is required', 400);

        $db = getDB();
        $stmt = $db->prepare('SELECT file_path, cover_path FROM lead_magnets WHERE id = ?');
        $stmt->execute([$id]);
        $m = $stmt->fetch();
        if (!$m) sendError('Lead magnet not found', 404);

        if ($m['file_path']) deleteStoredFile($m['file_path']);
        if ($m['cover_path']) deleteImageFiles($m['cover_path']);
        $db->prepare('DELETE FROM lead_magnets WHERE id = ?')->execute([$id]);

        auditLog('delete', 'lead_magnets', $id, null, $auth['sub']);
        sendJSON(['message' => 'Lead magnet deleted']);
        break;

    default:
        sendError('Method not allowed', 405);
}
