<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Website analytics (first-party)
 * ============================================================
 * GET /api/analytics.php?range=30d   — aggregated traffic (auth)
 *   range: 7d | 30d | 90d | 12m | all   (default 30d)
 *
 * Reads the page_views table and returns totals, a gap-filled
 * time series, top pages, traffic sources, device + country
 * splits — everything the dashboard's Website Traffic view needs.
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

handleCORS();
setJSONHeaders();

if (getMethod() !== 'GET') {
    sendError('Method not allowed', 405);
}

requireAuth();

$range = $_GET['range'] ?? '30d';

// Map the range to a number of days + the bucket granularity.
$ranges = [
    '7d'  => ['days' => 7,    'unit' => 'day'],
    '30d' => ['days' => 30,   'unit' => 'day'],
    '90d' => ['days' => 90,   'unit' => 'day'],
    '12m' => ['days' => 365,  'unit' => 'month'],
    'all' => ['days' => 3650, 'unit' => 'month'],
];
$cfg = isset($ranges[$range]) ? $ranges[$range] : $ranges['30d'];
$days = $cfg['days'];
$monthly = $cfg['unit'] === 'month';

$db = getDB();

// Shared WHERE — everything since the cutoff.
$since = "created_at >= DATE_SUB(NOW(), INTERVAL {$days} DAY)";

/* ── Totals ── */
$totals = $db->query(
    "SELECT COUNT(*) AS views,
            COUNT(DISTINCT visitor_hash) AS visitors,
            COUNT(DISTINCT session_id) AS sessions
     FROM page_views WHERE {$since}"
)->fetch();

/* ── Previous period totals (for trend deltas; meaningless for 'all') ── */
$prev = null;
if ($range !== 'all') {
    $prevDays = $days * 2;
    $prev = $db->query(
        "SELECT COUNT(*) AS views,
                COUNT(DISTINCT visitor_hash) AS visitors,
                COUNT(DISTINCT session_id) AS sessions
         FROM page_views
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL {$prevDays} DAY)
           AND created_at < DATE_SUB(NOW(), INTERVAL {$days} DAY)"
    )->fetch();
}

/* ── Time series (gap-filled in PHP so the chart is continuous) ── */
if ($monthly) {
    $rows = $db->query(
        "SELECT DATE_FORMAT(created_at, '%Y-%m') AS bucket,
                COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS visitors
         FROM page_views WHERE {$since}
         GROUP BY bucket"
    )->fetchAll();
    $byBucket = [];
    foreach ($rows as $r) $byBucket[$r['bucket']] = $r;

    // Start at the later of the range cutoff and the earliest stored view, so
    // 'all' never emits years of empty months before any data existed.
    $minRow = $db->query('SELECT MIN(created_at) AS m FROM page_views')->fetch();
    $earliest = !empty($minRow['m']) ? new DateTime($minRow['m']) : new DateTime();
    $cutoff = (new DateTime())->modify("-{$days} days");
    $start = ($earliest > $cutoff ? $earliest : $cutoff)->modify('first day of this month');
    $cursor = new DateTime('first day of this month');

    $series = [];
    for ($d = clone $start; $d <= $cursor; $d->modify('+1 month')) {
        $key = $d->format('Y-m');
        $series[] = [
            'date'     => $key,
            'label'    => $d->format('M Y'),
            'views'    => isset($byBucket[$key]) ? (int)$byBucket[$key]['views'] : 0,
            'visitors' => isset($byBucket[$key]) ? (int)$byBucket[$key]['visitors'] : 0,
        ];
    }
} else {
    $rows = $db->query(
        "SELECT DATE(created_at) AS bucket,
                COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS visitors
         FROM page_views WHERE {$since}
         GROUP BY bucket"
    )->fetchAll();
    $byBucket = [];
    foreach ($rows as $r) $byBucket[$r['bucket']] = $r;

    $series = [];
    $start = (new DateTime())->modify('-' . ($days - 1) . ' days');
    $end = new DateTime();
    for ($d = clone $start; $d <= $end; $d->modify('+1 day')) {
        $key = $d->format('Y-m-d');
        $series[] = [
            'date'     => $key,
            'label'    => $d->format('d M'),
            'views'    => isset($byBucket[$key]) ? (int)$byBucket[$key]['views'] : 0,
            'visitors' => isset($byBucket[$key]) ? (int)$byBucket[$key]['visitors'] : 0,
        ];
    }
}

/* ── Top pages ── */
$topPages = $db->query(
    "SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS visitors
     FROM page_views WHERE {$since}
     GROUP BY path ORDER BY views DESC LIMIT 12"
)->fetchAll();

/* ── Traffic sources ── */
$sources = $db->query(
    "SELECT COALESCE(NULLIF(source, ''), 'Direct') AS source, COUNT(*) AS views
     FROM page_views WHERE {$since}
     GROUP BY source ORDER BY views DESC LIMIT 8"
)->fetchAll();

/* ── Device split ── */
$devices = $db->query(
    "SELECT COALESCE(NULLIF(device, ''), 'unknown') AS device, COUNT(*) AS views
     FROM page_views WHERE {$since}
     GROUP BY device ORDER BY views DESC"
)->fetchAll();

/* ── Browser split ── */
$browsers = $db->query(
    "SELECT COALESCE(NULLIF(browser, ''), 'Other') AS browser, COUNT(*) AS views
     FROM page_views WHERE {$since}
     GROUP BY browser ORDER BY views DESC LIMIT 8"
)->fetchAll();

/* ── Engagement: single-page sessions → bounce rate ── */
$bounceRow = $db->query(
    "SELECT COUNT(*) AS bounced FROM (
        SELECT session_id FROM page_views
        WHERE {$since} AND session_id IS NOT NULL AND session_id <> ''
        GROUP BY session_id HAVING COUNT(*) = 1
     ) b"
)->fetch();

/* ── Top countries (only if any geo data exists) ── */
$countries = $db->query(
    "SELECT country, COUNT(*) AS views
     FROM page_views WHERE {$since} AND country IS NOT NULL AND country <> ''
     GROUP BY country ORDER BY views DESC LIMIT 6"
)->fetchAll();

$sessions = (int)($totals['sessions'] ?? 0);
$views    = (int)($totals['views'] ?? 0);
$bounced  = (int)($bounceRow['bounced'] ?? 0);

sendJSON([
    'range'  => $range,
    'totals' => [
        'views'    => $views,
        'visitors' => (int)($totals['visitors'] ?? 0),
        'sessions' => $sessions,
    ],
    'prev_totals' => $prev ? [
        'views'    => (int)($prev['views'] ?? 0),
        'visitors' => (int)($prev['visitors'] ?? 0),
        'sessions' => (int)($prev['sessions'] ?? 0),
    ] : null,
    'engagement' => [
        'bounce_rate'       => $sessions > 0 ? round($bounced / $sessions * 100) : null,
        'pages_per_session' => $sessions > 0 ? round($views / $sessions, 1) : null,
    ],
    'series'    => $series,
    'top_pages' => array_map(static function ($r) {
        return ['path' => $r['path'], 'views' => (int)$r['views'], 'visitors' => (int)$r['visitors']];
    }, $topPages),
    'sources'   => array_map(static function ($r) {
        return ['source' => $r['source'], 'views' => (int)$r['views']];
    }, $sources),
    'devices'   => array_map(static function ($r) {
        return ['device' => $r['device'], 'views' => (int)$r['views']];
    }, $devices),
    'browsers'  => array_map(static function ($r) {
        return ['browser' => $r['browser'], 'views' => (int)$r['views']];
    }, $browsers),
    'countries' => array_map(static function ($r) {
        return ['country' => $r['country'], 'views' => (int)$r['views']];
    }, $countries),
]);
