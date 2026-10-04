<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Pune Wedding Photography Checklist (lead magnet)
 * ============================================================
 * POST /api/checklist.php   (PUBLIC — rate-limited + honeypot)
 *   { first_name, email, wedding_date?, page?, website (honeypot) }
 *
 * 1. Files the couple as a lead in the CRM (source "Website (Checklist)",
 *    wedding date → event_date) through the same retry/spool path as the
 *    enquiry form, so a database blip never loses them.
 * 2. Emails them the download link from info@amouraffairs.in (SMTP, see
 *    mailer.php).
 * 3. Returns the download URL so the thank-you screen can offer it at once,
 *    whether or not the email went out.
 * ============================================================
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';
require_once __DIR__ . '/inquiry-store.php';
require_once __DIR__ . '/mailer.php';

handleCORS();
setJSONHeaders();

const CHECKLIST_PDF_URL = 'https://www.amouraffairs.in/downloads/Amour-Affairs-Pune-Wedding-Photography-Checklist.pdf';
const CHECKLIST_WEDDINGS_URL = 'https://www.amouraffairs.in/weddings/?utm_source=checklist_email&utm_medium=email&utm_campaign=pune_checklist';
const CHECKLIST_SITE_URL = 'https://www.amouraffairs.in/?utm_source=checklist_email&utm_medium=email&utm_campaign=pune_checklist';

if (getMethod() !== 'POST') {
    sendError('Method not allowed', 405);
}

checkRateLimit('checklist_download', 8, 600);

$body = getJSONBody();
$thanks = 'Thank you! Your Pune Wedding Photography Checklist is on its way.';

// Honeypot — pretend success, store and send nothing.
if (!empty($body['website'])) {
    sendJSON(['message' => $thanks, 'download_url' => null, 'emailed' => false], 201);
}

$firstName   = trim((string)($body['first_name'] ?? ''));
$email       = trim((string)($body['email'] ?? ''));
$weddingDate = trim((string)($body['wedding_date'] ?? ''));

if (mb_strlen($firstName) < 2 || mb_strlen($firstName) > 100 || preg_match('/[\r\n<>]/', $firstName)) {
    sendError('Please enter your first name', 400);
}
if (!isValidEmail($email) || mb_strlen($email) > 255) {
    sendError('Please enter a valid email address', 400);
}
if ($weddingDate !== '') {
    $parsed = DateTime::createFromFormat('Y-m-d', $weddingDate);
    if (!$parsed || $parsed->format('Y-m-d') !== $weddingDate) {
        sendError('Please enter a valid wedding date', 400);
    }
}

$notes = [[
    'content' => 'Requested the free Pune Wedding Photography Checklist (lead magnet)',
    'author'  => 'Lead Magnet',
    'date'    => date('Y-m-d H:i:s'),
]];
$page = trim((string)($body['page'] ?? ''));
if ($page !== '' && mb_strlen($page) <= 160 && preg_match('#^/[a-zA-Z0-9/_\-]*$#', $page)) {
    $notes[] = [
        'content' => 'Checklist requested from ' . $page,
        'author'  => 'Lead Magnet',
        'date'    => date('Y-m-d H:i:s'),
    ];
}

$lead = [
    'client_name'  => sanitize($firstName),
    'phone'        => '',
    'email'        => sanitize($email),
    'event_type'   => 'Wedding',
    'event_date'   => $weddingDate !== '' ? $weddingDate : null,
    'venue'        => null,
    'guest_count'  => null,
    'budget_range' => null,
    'source'       => 'Website (Checklist)',
    'notes'        => $notes,
];

try {
    persistInquiry($lead);
} catch (Throwable $e) {
    error_log('AA-CHECKLIST database write failed: ' . $e->getMessage() . ' | ' . json_encode([
        'name' => $firstName, 'email' => $email,
    ], JSON_UNESCAPED_UNICODE));
    if (!spoolInquiry($lead)) {
        // Could not hold the lead anywhere. Still give the couple their
        // checklist: they asked for a PDF, and refusing it helps nobody.
        error_log('AA-CHECKLIST lead lost (spool failed too): ' . $email);
    }
}

$emailed = sendMail($email, $firstName, checklistSubject(), checklistText($firstName), checklistHtml($firstName));

sendJSON([
    'message'      => $thanks,
    'download_url' => CHECKLIST_PDF_URL,
    'emailed'      => $emailed,
], 201);


// ── Email content ────────────────────────────────────────────

function checklistSubject(): string {
    return 'Your Pune Wedding Photography Checklist 🤍';
}

function checklistText(string $firstName): string {
    return "Hi {$firstName},\r\n\r\n"
        . "Thank you for downloading The Ultimate Pune Wedding Photography Checklist.\r\n\r\n"
        . "We hope it helps you plan your wedding photography and make sure you don't miss the moments that matter most.\r\n\r\n"
        . "Download your checklist here:\r\n" . CHECKLIST_PDF_URL . "\r\n\r\n"
        . "Planning your wedding in Pune? If you'd like to discuss your photography and cinematography requirements, feel free to get in touch with the Amour Affairs team.\r\n\r\n"
        . "Explore our wedding photography:\r\n" . CHECKLIST_WEDDINGS_URL . "\r\n\r\n"
        . "Best,\r\nAmour Affairs\r\nWedding Photography & Cinematography\r\nPune\r\n";
}

function checklistHtml(string $firstName): string {
    $name = htmlspecialchars($firstName, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $pdf  = htmlspecialchars(CHECKLIST_PDF_URL, ENT_QUOTES, 'UTF-8');
    $wed  = htmlspecialchars(CHECKLIST_WEDDINGS_URL, ENT_QUOTES, 'UTF-8');
    $site = htmlspecialchars(CHECKLIST_SITE_URL, ENT_QUOTES, 'UTF-8');
    $logo = 'https://www.amouraffairs.in/logo-full.png';

    return <<<HTML
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Pune Wedding Photography Checklist</title></head>
<body style="margin:0;padding:0;background:#F5EDE2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5EDE2;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;">
      <tr><td align="center" style="padding:32px 32px 8px;">
        <a href="{$site}"><img src="{$logo}" alt="Amour Affairs" width="170" style="display:block;width:170px;height:auto;border:0;"></a>
      </td></tr>
      <tr><td style="padding:16px 36px 8px;font-family:Georgia,'Times New Roman',serif;color:#3D2010;">
        <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#9E7A4E;">Your free checklist</p>
        <h1 style="margin:0 0 20px;font-weight:normal;font-size:26px;line-height:1.25;">The Ultimate Pune <em style="color:#9E7A4E;">Wedding Photography Checklist</em></h1>
      </td></tr>
      <tr><td style="padding:0 36px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#3D2010;">
        <p style="margin:0 0 16px;">Hi {$name},</p>
        <p style="margin:0 0 16px;">Thank you for downloading <strong>The Ultimate Pune Wedding Photography Checklist</strong>.</p>
        <p style="margin:0 0 24px;">We hope it helps you plan your wedding photography and make sure you don&rsquo;t miss the moments that matter most.</p>
        <p style="margin:0 0 8px;font-weight:bold;">Download your checklist here:</p>
      </td></tr>
      <tr><td align="center" style="padding:8px 36px 28px;">
        <a href="{$pdf}" style="display:inline-block;padding:14px 30px;border-radius:40px;background:#C19A57;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;text-decoration:none;">Download the Checklist</a>
        <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7A6A5A;word-break:break-all;">Or copy this link: <a href="{$pdf}" style="color:#9E7A4E;">{$pdf}</a></p>
      </td></tr>
      <tr><td style="padding:0 36px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#3D2010;">
        <p style="margin:0 0 16px;">Planning your wedding in Pune? If you&rsquo;d like to discuss your photography and cinematography requirements, feel free to get in touch with the Amour Affairs team.</p>
        <p style="margin:0 0 24px;">Explore our wedding photography:<br><a href="{$wed}" style="color:#9E7A4E;">Amour Affairs Wedding Photography</a></p>
        <p style="margin:0 0 4px;">Best,</p>
        <p style="margin:0 0 32px;"><strong>Amour Affairs</strong><br><span style="color:#7A6A5A;">Wedding Photography &amp; Cinematography<br>Pune</span></p>
      </td></tr>
      <tr><td style="padding:18px 36px;border-top:1px solid #EFE6D8;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#7A6A5A;text-align:center;">
        +91 99210 00052 &middot; <a href="mailto:info@amouraffairs.in" style="color:#7A6A5A;">info@amouraffairs.in</a> &middot; <a href="{$site}" style="color:#7A6A5A;">amouraffairs.in</a><br>
        You received this because you requested the checklist on amouraffairs.in. Reply to this email if you&rsquo;d like us to remove your details.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>
HTML;
}
