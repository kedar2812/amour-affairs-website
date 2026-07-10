<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Pageview ingest (first-party analytics)
 * ============================================================
 * POST /api/track.php   — record one page view (public, no auth)
 *
 * Privacy: NO raw IP or personal data is stored. `visitor_hash`
 * is a daily one-way hash (date + IP + UA + secret) so unique
 * visitors can be counted for that day and never re-identified.
 * Responds 204 fast; failures are swallowed so the site is never
 * affected by analytics.
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

handleCORS();

if (getMethod() !== 'POST') {
    http_response_code(405);
    exit;
}

// Ignore obvious bots/crawlers — keeps the numbers about real people.
$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
if ($ua === '' || preg_match('/bot|crawl|spider|slurp|bing|google|baidu|yandex|duckduck|facebookexternal|embedly|preview|monitor|lighthouse|headless|curl|wget|python|axios|node-fetch/i', $ua)) {
    http_response_code(204);
    exit;
}

// Parse the beacon body ourselves: cap the size and stay silent on garbage
// (getJSONBody() would emit a 400 JSON error — a beacon must never do that).
$raw = file_get_contents('php://input', false, null, 0, 4096);
$body = $raw ? json_decode($raw, true) : null;
if (!is_array($body)) { http_response_code(204); exit; }

/* ── Normalise the path ── */
$path = (string)($body['path'] ?? '');
$path = parse_url($path, PHP_URL_PATH) ?: $path;   // strip any query/hash
if ($path === '' || $path[0] !== '/') $path = '/' . ltrim($path, '/');
$path = substr($path, 0, 255);

/* ── Referrer → host + traffic source ── */
$ref = (string)($body['referrer'] ?? '');
$refHost = $ref ? strtolower((string)parse_url($ref, PHP_URL_HOST)) : '';
$selfHost = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
$internal = $refHost !== '' && (substr($refHost, -15) === 'amouraffairs.in' || $refHost === $selfHost);

$utmSource = trim((string)($body['utm_source'] ?? ''));

$mapSource = static function (string $host): string {
    $h = preg_replace('/^www\./', '', $host);
    $known = [
        'google'    => 'Google',
        'instagram' => 'Instagram',
        'l.instagram' => 'Instagram',
        'facebook'  => 'Facebook',
        'fb'        => 'Facebook',
        'youtube'   => 'YouTube',
        'youtu.be'  => 'YouTube',
        'bing'      => 'Bing',
        'pinterest' => 'Pinterest',
        'wa.me'     => 'WhatsApp',
        'whatsapp'  => 'WhatsApp',
        't.co'      => 'Twitter/X',
        'twitter'   => 'Twitter/X',
        'x.com'     => 'Twitter/X',
        'linkedin'  => 'LinkedIn',
    ];
    foreach ($known as $needle => $label) {
        if (strpos($h, $needle) !== false) return $label;
    }
    return $h !== '' ? $h : 'Other';
};

if ($utmSource !== '') {
    $source = substr($utmSource, 0, 120);
} elseif ($internal || $refHost === '') {
    $source = 'Direct';
} else {
    $source = substr($mapSource($refHost), 0, 120);
}
$refHostStore = $internal ? null : ($refHost !== '' ? substr($refHost, 0, 255) : null);

/* ── Device + browser from the UA ── */
$device = preg_match('/iPad|Tablet|PlayBook|Silk/i', $ua) ? 'tablet'
        : (preg_match('/Mobi|Android|iPhone|iPod|Windows Phone/i', $ua) ? 'mobile' : 'desktop');

$browser = 'Other';
foreach ([
    'Edg' => 'Edge', 'OPR' => 'Opera', 'Opera' => 'Opera',
    'Firefox' => 'Firefox', 'SamsungBrowser' => 'Samsung',
    'Chrome' => 'Chrome', 'CriOS' => 'Chrome',
    'Safari' => 'Safari',
] as $needle => $label) {
    if (strpos($ua, $needle) !== false) { $browser = $label; break; }
}

/* ── Country from a CDN/host geo header if present (else Unknown) ── */
$country = $_SERVER['HTTP_CF_IPCOUNTRY']
    ?? $_SERVER['GEOIP_COUNTRY_NAME']
    ?? $_SERVER['GEOIP_COUNTRY_CODE']
    ?? null;
$country = $country ? substr((string)$country, 0, 60) : null;

/* ── Session id (client) + daily visitor hash (no PII retained) ── */
$session = (string)($body['session_id'] ?? '');
$session = preg_match('/^[a-z0-9-]{8,36}$/i', $session) ? $session : null;

$salt = defined('JWT_SECRET') ? JWT_SECRET : 'aa-analytics';
$visitorHash = sha1(date('Y-m-d') . '|' . getClientIP() . '|' . $ua . '|' . $salt);

/* ── Store (best-effort) ── */
try {
    $db = getDB();

    // Guard against refresh spam / replayed beacons: skip if this visitor
    // already logged this path in the last 10s, or has an absurd number of
    // views today (a real person browsing a 20-page site never gets close).
    $guard = $db->prepare(
        'SELECT COUNT(*) AS day_total,
                SUM(path = ? AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)) AS recent_dup
         FROM page_views
         WHERE visitor_hash = ? AND created_at >= CURDATE()'
    );
    $guard->execute([$path, $visitorHash]);
    $g = $guard->fetch();
    if ((int)($g['day_total'] ?? 0) >= 500 || (int)($g['recent_dup'] ?? 0) > 0) {
        http_response_code(204);
        exit;
    }

    $stmt = $db->prepare(
        'INSERT INTO page_views
           (path, referrer_host, source, device, browser, country, session_id, visitor_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$path, $refHostStore, $source, $device, $browser, $country, $session, $visitorHash]);
} catch (Throwable $e) {
    // analytics must never break the site — swallow
}

http_response_code(204);
