<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — CRM API (client special dates + festivals)
 * ============================================================
 * Powers curated WhatsApp greetings: birthdays, anniversaries,
 * kids' birthdays and festivals. All endpoints require auth.
 *
 * GET    /api/crm.php?action=upcoming&days=30      — occasions due in the next N days
 * GET    /api/crm.php?action=dates&client_id=X     — list a client's special dates
 * POST   /api/crm.php?action=dates                 — add a special date
 * PUT    /api/crm.php?action=dates&id=X            — update a special date
 * DELETE /api/crm.php?action=dates&id=X            — remove a special date
 * GET    /api/crm.php?action=festivals             — list festivals
 * POST   /api/crm.php?action=festivals             — add a festival
 * PUT    /api/crm.php?action=festivals&id=X        — update a festival
 * DELETE /api/crm.php?action=festivals&id=X        — remove a festival
 * GET    /api/crm.php?action=greetings&festival_id=X&year=Y — client ids already greeted
 * POST   /api/crm.php?action=log                   — record that a greeting was sent
 * GET    /api/crm.php?action=templates             — message templates
 * PUT    /api/crm.php?action=templates             — save message templates
 *
 * NOTE: must stay PHP 7.3 compatible (live host) — no arrow
 * functions, no str_contains, no PHP 8 syntax.
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

handleCORS();
setJSONHeaders();

$method = getMethod();
$action = $_GET['action'] ?? '';
$id     = isset($_GET['id']) ? (int)$_GET['id'] : null;

$OCCASIONS = ['birthday', 'anniversary', 'kid_birthday', 'other'];

$TEMPLATE_KEYS = [
    'crm_tpl_birthday',
    'crm_tpl_anniversary',
    'crm_tpl_kid_birthday',
    'crm_tpl_festival',
    'crm_tpl_other',
    // Lead funnel presets (dashboard /leads → Message Presets). An empty
    // value means "use the built-in copy" — the dashboard falls back to it.
    'crm_tpl_lead_welcome',
    'crm_tpl_lead_followup',
    'crm_tpl_lead_closure',
];

/**
 * The occurrence of a month/day in a given year, as a DateTime (midnight IST).
 * Feb 29 birthdays fall back to Feb 28 on non-leap years.
 */
function occurrenceInYear(int $year, int $month, int $day): DateTime {
    if ($month === 2 && $day === 29 && !checkdate(2, 29, $year)) {
        $day = 28;
    }
    return new DateTime(sprintf('%04d-%02d-%02d', $year, $month, $day));
}

/**
 * Next occurrence of a stored DATE on/after $today.
 * Returns [DateTime occurrence, int daysUntil].
 */
function nextOccurrence(string $dateStr, DateTime $today): array {
    $parts = explode('-', $dateStr);
    $month = (int)($parts[1] ?? 1);
    $day   = (int)($parts[2] ?? 1);
    $occ = occurrenceInYear((int)$today->format('Y'), $month, $day);
    if ($occ < $today) {
        $occ = occurrenceInYear((int)$today->format('Y') + 1, $month, $day);
    }
    $days = (int)$today->diff($occ)->format('%a');
    return [$occ, $days];
}

/** Load the crm_* message templates from the settings table. */
function loadTemplates(PDO $db): array {
    $stmt = $db->prepare("SELECT setting_key, setting_value FROM settings WHERE setting_group = 'crm'");
    $stmt->execute();
    $templates = [];
    foreach ($stmt->fetchAll() as $row) {
        $templates[$row['setting_key']] = $row['setting_value'];
    }
    return $templates;
}

switch ($action) {

    // ────────────────────────────────────────────────────────
    // UPCOMING — the feed behind the dashboard card & the bell
    // ────────────────────────────────────────────────────────
    case 'upcoming':
        if ($method !== 'GET') sendError('Method not allowed', 405);
        requireAuth();
        $db = getDB();

        $days = isset($_GET['days']) ? max(1, min(365, (int)$_GET['days'])) : 30;
        $today = new DateTime('today');

        // Client special dates
        $stmt = $db->prepare(
            'SELECT cd.*, c.name AS client_name, c.phone AS client_phone, c.whatsapp AS client_whatsapp
             FROM client_dates cd
             JOIN clients c ON c.id = cd.client_id
             WHERE cd.is_active = 1'
        );
        $stmt->execute();
        $rows = $stmt->fetchAll();

        // Greetings already logged (this year + next, covers Dec→Jan windows)
        $thisYear = (int)$today->format('Y');
        $stmt = $db->prepare(
            'SELECT client_date_id, festival_id, client_id, occasion_year
             FROM crm_greetings WHERE occasion_year IN (?, ?)'
        );
        $stmt->execute([$thisYear, $thisYear + 1]);
        $sentDates = [];      // "clientDateId-year" => true
        $sentFestival = [];   // "festivalId-year"   => count
        foreach ($stmt->fetchAll() as $g) {
            if ($g['client_date_id']) {
                $sentDates[$g['client_date_id'] . '-' . $g['occasion_year']] = true;
            } elseif ($g['festival_id']) {
                $key = $g['festival_id'] . '-' . $g['occasion_year'];
                $sentFestival[$key] = ($sentFestival[$key] ?? 0) + 1;
            }
        }

        $occasions = [];
        foreach ($rows as $row) {
            list($occ, $daysUntil) = nextOccurrence($row['occasion_date'], $today);
            if ($daysUntil > $days) continue;

            $occYear = (int)$occ->format('Y');
            $origYear = (int)substr($row['occasion_date'], 0, 4);
            $years = ((int)$row['year_known'] === 1 && $origYear > 1901) ? $occYear - $origYear : null;

            $occasions[] = [
                'kind'          => 'client_date',
                'id'            => (int)$row['id'],
                'client_id'     => (int)$row['client_id'],
                'client_name'   => $row['client_name'],
                'phone'         => $row['client_whatsapp'] ?: $row['client_phone'],
                'occasion'      => $row['occasion'],
                'label'         => $row['label'],
                'person_name'   => $row['person_name'],
                'occasion_date' => $row['occasion_date'],
                'next_date'     => $occ->format('Y-m-d'),
                'days_until'    => $daysUntil,
                'years'         => $years,
                'occasion_year' => $occYear,
                'sent'          => isset($sentDates[$row['id'] . '-' . $occYear]),
            ];
        }

        // Festivals (recur annually on month/day; movable ones are edited yearly)
        $stmt = $db->prepare('SELECT * FROM festivals WHERE is_active = 1');
        $stmt->execute();
        $festivals = [];
        foreach ($stmt->fetchAll() as $f) {
            list($occ, $daysUntil) = nextOccurrence($f['festival_date'], $today);
            if ($daysUntil > $days) continue;
            $occYear = (int)$occ->format('Y');
            $festivals[] = [
                'kind'          => 'festival',
                'id'            => (int)$f['id'],
                'name'          => $f['name'],
                'emoji'         => $f['emoji'],
                'festival_date' => $f['festival_date'],
                'next_date'     => $occ->format('Y-m-d'),
                'days_until'    => $daysUntil,
                'occasion_year' => $occYear,
                'is_movable'    => (int)$f['is_movable'],
                'message_template' => $f['message_template'],
                'sent_count'    => $sentFestival[$f['id'] . '-' . $occYear] ?? 0,
            ];
        }

        // Soonest first; same-day client dates before festivals
        usort($occasions, function ($a, $b) { return $a['days_until'] - $b['days_until']; });
        usort($festivals, function ($a, $b) { return $a['days_until'] - $b['days_until']; });

        sendJSON([
            'occasions' => $occasions,
            'festivals' => $festivals,
            'templates' => loadTemplates($db),
            'days'      => $days,
        ]);
        break;


    // ────────────────────────────────────────────────────────
    // CLIENT SPECIAL DATES — CRUD
    // ────────────────────────────────────────────────────────
    case 'dates':
        $auth = requireAuth();
        $db = getDB();

        if ($method === 'GET') {
            $clientId = isset($_GET['client_id']) ? (int)$_GET['client_id'] : 0;
            if (!$clientId) sendError('client_id is required', 400);
            $stmt = $db->prepare('SELECT * FROM client_dates WHERE client_id = ? AND is_active = 1 ORDER BY MONTH(occasion_date), DAY(occasion_date)');
            $stmt->execute([$clientId]);
            sendJSON(['dates' => $stmt->fetchAll()]);
        }

        if ($method === 'POST') {
            $body = getJSONBody();
            $clientId = (int)($body['client_id'] ?? 0);
            $occasion = $body['occasion'] ?? 'birthday';
            $date = $body['occasion_date'] ?? '';

            if (!$clientId) sendError('client_id is required', 400);
            if (!in_array($occasion, $OCCASIONS, true)) sendError('Invalid occasion type', 400);
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) sendError('occasion_date must be YYYY-MM-DD', 400);

            $stmt = $db->prepare('SELECT id FROM clients WHERE id = ?');
            $stmt->execute([$clientId]);
            if (!$stmt->fetch()) sendError('Client not found', 404);

            $stmt = $db->prepare(
                'INSERT INTO client_dates (client_id, occasion, label, person_name, occasion_date, year_known, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $clientId,
                $occasion,
                sanitize($body['label'] ?? ''),
                sanitize($body['person_name'] ?? ''),
                $date,
                (int)(!isset($body['year_known']) || $body['year_known'] ? 1 : 0),
                sanitize($body['notes'] ?? ''),
            ]);
            $newId = $db->lastInsertId();
            auditLog('create', 'client_dates', $newId, ['client_id' => $clientId, 'occasion' => $occasion], $auth['sub']);

            $stmt = $db->prepare('SELECT * FROM client_dates WHERE id = ?');
            $stmt->execute([$newId]);
            sendJSON($stmt->fetch(), 201);
        }

        if ($method === 'PUT') {
            if (!$id) sendError('Date ID is required', 400);
            $body = getJSONBody();
            $fields = [];
            $params = [];

            if (array_key_exists('occasion', $body)) {
                if (!in_array($body['occasion'], $OCCASIONS, true)) sendError('Invalid occasion type', 400);
                $fields[] = 'occasion = ?'; $params[] = $body['occasion'];
            }
            if (array_key_exists('occasion_date', $body)) {
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $body['occasion_date'])) sendError('occasion_date must be YYYY-MM-DD', 400);
                $fields[] = 'occasion_date = ?'; $params[] = $body['occasion_date'];
            }
            foreach (['label', 'person_name', 'notes'] as $f) {
                if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = sanitize($body[$f]); }
            }
            foreach (['year_known', 'is_active'] as $f) {
                if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = (int)(bool)$body[$f]; }
            }
            if (empty($fields)) sendError('No fields to update', 400);

            $params[] = $id;
            $stmt = $db->prepare('UPDATE client_dates SET ' . implode(', ', $fields) . ' WHERE id = ?');
            $stmt->execute($params);
            auditLog('update', 'client_dates', $id, $body, $auth['sub']);

            $stmt = $db->prepare('SELECT * FROM client_dates WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) sendError('Date not found', 404);
            sendJSON($row);
        }

        if ($method === 'DELETE') {
            if (!$id) sendError('Date ID is required', 400);
            $stmt = $db->prepare('DELETE FROM client_dates WHERE id = ?');
            $stmt->execute([$id]);
            auditLog('delete', 'client_dates', $id, null, $auth['sub']);
            sendJSON(['message' => 'Date removed']);
        }

        sendError('Method not allowed', 405);
        break;


    // ────────────────────────────────────────────────────────
    // FESTIVALS — CRUD
    // ────────────────────────────────────────────────────────
    case 'festivals':
        $auth = requireAuth();
        $db = getDB();

        if ($method === 'GET') {
            $stmt = $db->prepare('SELECT * FROM festivals ORDER BY MONTH(festival_date), DAY(festival_date)');
            $stmt->execute();
            sendJSON(['festivals' => $stmt->fetchAll()]);
        }

        if ($method === 'POST') {
            $body = getJSONBody();
            $name = sanitize($body['name'] ?? '');
            $date = $body['festival_date'] ?? '';
            if (empty($name)) sendError('Festival name is required', 400);
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) sendError('festival_date must be YYYY-MM-DD', 400);

            $stmt = $db->prepare(
                'INSERT INTO festivals (name, emoji, festival_date, is_movable, message_template, is_active)
                 VALUES (?, ?, ?, ?, ?, 1)'
            );
            $stmt->execute([
                $name,
                sanitize($body['emoji'] ?? ''),
                $date,
                (int)(bool)($body['is_movable'] ?? 0),
                sanitize($body['message_template'] ?? ''),
            ]);
            $newId = $db->lastInsertId();
            auditLog('create', 'festivals', $newId, ['name' => $name], $auth['sub']);

            $stmt = $db->prepare('SELECT * FROM festivals WHERE id = ?');
            $stmt->execute([$newId]);
            sendJSON($stmt->fetch(), 201);
        }

        if ($method === 'PUT') {
            if (!$id) sendError('Festival ID is required', 400);
            $body = getJSONBody();
            $fields = [];
            $params = [];

            if (array_key_exists('festival_date', $body)) {
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $body['festival_date'])) sendError('festival_date must be YYYY-MM-DD', 400);
                $fields[] = 'festival_date = ?'; $params[] = $body['festival_date'];
            }
            foreach (['name', 'emoji', 'message_template'] as $f) {
                if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = sanitize($body[$f]); }
            }
            foreach (['is_movable', 'is_active'] as $f) {
                if (array_key_exists($f, $body)) { $fields[] = "{$f} = ?"; $params[] = (int)(bool)$body[$f]; }
            }
            if (empty($fields)) sendError('No fields to update', 400);

            $params[] = $id;
            $stmt = $db->prepare('UPDATE festivals SET ' . implode(', ', $fields) . ' WHERE id = ?');
            $stmt->execute($params);
            auditLog('update', 'festivals', $id, $body, $auth['sub']);

            $stmt = $db->prepare('SELECT * FROM festivals WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) sendError('Festival not found', 404);
            sendJSON($row);
        }

        if ($method === 'DELETE') {
            if (!$id) sendError('Festival ID is required', 400);
            $stmt = $db->prepare('DELETE FROM festivals WHERE id = ?');
            $stmt->execute([$id]);
            auditLog('delete', 'festivals', $id, null, $auth['sub']);
            sendJSON(['message' => 'Festival removed']);
        }

        sendError('Method not allowed', 405);
        break;


    // ────────────────────────────────────────────────────────
    // GREETINGS — who has already been wished (festival + year)
    // ────────────────────────────────────────────────────────
    case 'greetings':
        if ($method !== 'GET') sendError('Method not allowed', 405);
        requireAuth();
        $db = getDB();

        $festivalId = isset($_GET['festival_id']) ? (int)$_GET['festival_id'] : 0;
        $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
        if (!$festivalId) sendError('festival_id is required', 400);

        $stmt = $db->prepare(
            'SELECT client_id FROM crm_greetings WHERE festival_id = ? AND occasion_year = ? AND client_id IS NOT NULL'
        );
        $stmt->execute([$festivalId, $year]);
        $ids = [];
        foreach ($stmt->fetchAll() as $row) {
            $ids[] = (int)$row['client_id'];
        }
        sendJSON(['client_ids' => $ids, 'year' => $year]);
        break;


    // ────────────────────────────────────────────────────────
    // LOG — record that a greeting was sent (idempotent per year)
    // ────────────────────────────────────────────────────────
    case 'log':
        if ($method !== 'POST') sendError('Method not allowed', 405);
        $auth = requireAuth();
        $db = getDB();
        $body = getJSONBody();

        $clientDateId = isset($body['client_date_id']) ? (int)$body['client_date_id'] : null;
        $festivalId   = isset($body['festival_id']) ? (int)$body['festival_id'] : null;
        $clientId     = isset($body['client_id']) ? (int)$body['client_id'] : null;
        $year         = (int)($body['occasion_year'] ?? date('Y'));

        if (!$clientDateId && !$festivalId) sendError('client_date_id or festival_id is required', 400);
        if ($festivalId && !$clientId) sendError('client_id is required for festival greetings', 400);

        // A client_date greeting derives its client_id from the date row
        if ($clientDateId) {
            $stmt = $db->prepare('SELECT client_id FROM client_dates WHERE id = ?');
            $stmt->execute([$clientDateId]);
            $row = $stmt->fetch();
            if (!$row) sendError('Date not found', 404);
            $clientId = (int)$row['client_id'];

            // Already logged this year → return the existing record silently
            $stmt = $db->prepare('SELECT id FROM crm_greetings WHERE client_date_id = ? AND occasion_year = ?');
            $stmt->execute([$clientDateId, $year]);
            if ($stmt->fetch()) sendJSON(['message' => 'Already logged', 'duplicate' => true]);
        } else {
            $stmt = $db->prepare('SELECT id FROM crm_greetings WHERE festival_id = ? AND client_id = ? AND occasion_year = ?');
            $stmt->execute([$festivalId, $clientId, $year]);
            if ($stmt->fetch()) sendJSON(['message' => 'Already logged', 'duplicate' => true]);
        }

        $stmt = $db->prepare(
            'INSERT INTO crm_greetings (client_id, client_date_id, festival_id, occasion_year, message, sent_by)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $clientId,
            $clientDateId,
            $festivalId,
            $year,
            sanitize($body['message'] ?? ''),
            $auth['sub'],
        ]);
        auditLog('create', 'crm_greetings', (int)$db->lastInsertId(), ['client_id' => $clientId, 'year' => $year], $auth['sub']);
        sendJSON(['message' => 'Greeting logged'], 201);
        break;


    // ────────────────────────────────────────────────────────
    // TEMPLATES — greeting message templates (settings, group 'crm')
    // ────────────────────────────────────────────────────────
    case 'templates':
        $auth = requireAuth();
        $db = getDB();

        if ($method === 'GET') {
            sendJSON(['templates' => loadTemplates($db)]);
        }

        if ($method === 'PUT') {
            $body = getJSONBody();
            $templates = $body['templates'] ?? [];
            if (!is_array($templates) || empty($templates)) sendError('templates object is required', 400);

            $stmt = $db->prepare(
                "INSERT INTO settings (setting_key, setting_value, setting_group) VALUES (?, ?, 'crm')
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
            );
            foreach ($templates as $key => $value) {
                if (!in_array($key, $TEMPLATE_KEYS, true)) continue;
                // Stored raw (like settings.php) — templates are typed by the
                // studio and rendered as plain text into wa.me links only.
                $stmt->execute([$key, (string)$value]);
            }
            auditLog('update', 'settings', null, ['group' => 'crm'], $auth['sub']);
            sendJSON(['templates' => loadTemplates($db)]);
        }

        sendError('Method not allowed', 405);
        break;

    default:
        sendError('Unknown action', 400);
}
