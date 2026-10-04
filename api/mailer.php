<?php
/**
 * ============================================================
 * AMOUR AFFAIRS — Minimal SMTP mailer
 * ============================================================
 * Sends one multipart (text + HTML) message through an authenticated SMTP
 * relay. Built for Google Workspace (smtp.gmail.com, App Password) because the
 * domain's mail lives there: the host's own mail() is not in the domain's SPF,
 * so anything it sent to Gmail would bounce or land in spam.
 *
 * Configured from api/config.secrets.php:
 *   AA_SMTP_HOST       smtp.gmail.com
 *   AA_SMTP_PORT       587 (STARTTLS) or 465 (implicit TLS)
 *   AA_SMTP_USER       info@amouraffairs.in
 *   AA_SMTP_PASS       16-character Google App Password (spaces optional)
 *   AA_SMTP_FROM       info@amouraffairs.in   (defaults to AA_SMTP_USER)
 *   AA_SMTP_FROM_NAME  Amour Affairs
 *
 * PHP 7.3 compatible (the live host runs 7.3.33): no typed properties,
 * no arrow functions, no str_contains.
 * ============================================================
 */

function smtpConfigured(): bool {
    return (string)getenv('AA_SMTP_HOST') !== ''
        && (string)getenv('AA_SMTP_USER') !== ''
        && (string)getenv('AA_SMTP_PASS') !== '';
}

/** RFC 2047 encode a header value when it carries non-ASCII (e.g. the 🤍 in subjects). */
function smtpEncodeHeader(string $value): string {
    if (preg_match('/[^\x20-\x7E]/', $value)) {
        return '=?UTF-8?B?' . base64_encode($value) . '?=';
    }
    return $value;
}

/**
 * Send an email. Returns true on success; on failure logs the SMTP
 * conversation step that failed and returns false. Never throws.
 */
function sendMail(string $toEmail, string $toName, string $subject, string $textBody, string $htmlBody): bool {
    if (!smtpConfigured()) {
        error_log('AA-MAIL not sent: SMTP is not configured (AA_SMTP_* in config.secrets.php)');
        return false;
    }
    // Header injection guard — addresses and names go straight into headers.
    if (preg_match('/[\r\n]/', $toEmail . $toName . $subject) || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
        error_log('AA-MAIL refused: invalid recipient or header value');
        return false;
    }

    $host     = (string)getenv('AA_SMTP_HOST');
    $port     = (int)(getenv('AA_SMTP_PORT') ?: 587);
    $user     = (string)getenv('AA_SMTP_USER');
    $pass     = str_replace(' ', '', (string)getenv('AA_SMTP_PASS'));
    $from     = (string)(getenv('AA_SMTP_FROM') ?: $user);
    $fromName = (string)(getenv('AA_SMTP_FROM_NAME') ?: 'Amour Affairs');

    $remote = ($port === 465 ? 'ssl://' : 'tcp://') . $host . ':' . $port;
    $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'peer_name' => $host]]);
    $errno = 0; $errstr = '';
    $sock = @stream_socket_client($remote, $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $ctx);
    if (!$sock) {
        error_log("AA-MAIL connect failed to {$remote}: {$errstr} ({$errno})");
        return false;
    }
    stream_set_timeout($sock, 15);

    // Read one (possibly multi-line) SMTP reply; return [code, text].
    $read = function () use ($sock) {
        $text = '';
        while (($line = fgets($sock, 1024)) !== false) {
            $text .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') break;
        }
        return [(int)substr($text, 0, 3), trim($text)];
    };
    $step = function (string $cmd, array $expect, string $label) use ($sock, $read) {
        if ($cmd !== '') fwrite($sock, $cmd . "\r\n");
        list($code, $text) = $read();
        if (!in_array($code, $expect, true)) {
            throw new RuntimeException("{$label}: {$text}");
        }
        return $text;
    };

    $ehloName = preg_replace('/[^a-z0-9.\-]/i', '', (string)($_SERVER['SERVER_NAME'] ?? 'amouraffairs.in')) ?: 'amouraffairs.in';

    try {
        $step('', [220], 'greeting');
        $step('EHLO ' . $ehloName, [250], 'EHLO');
        if ($port !== 465) {
            $step('STARTTLS', [220], 'STARTTLS');
            if (!stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT)) {
                throw new RuntimeException('TLS negotiation failed');
            }
            $step('EHLO ' . $ehloName, [250], 'EHLO after TLS');
        }
        $step('AUTH LOGIN', [334], 'AUTH');
        $step(base64_encode($user), [334], 'AUTH user');
        $step(base64_encode($pass), [235], 'AUTH password');
        $step('MAIL FROM:<' . $from . '>', [250], 'MAIL FROM');
        $step('RCPT TO:<' . $toEmail . '>', [250, 251], 'RCPT TO');
        $step('DATA', [354], 'DATA');

        $boundary = 'aa_' . bin2hex(random_bytes(12));
        $domain = substr(strrchr($from, '@'), 1) ?: 'amouraffairs.in';
        $headers = [
            'Date: ' . date('r'),
            'From: ' . smtpEncodeHeader($fromName) . ' <' . $from . '>',
            'To: ' . ($toName !== '' ? smtpEncodeHeader($toName) . ' ' : '') . '<' . $toEmail . '>',
            'Reply-To: ' . $from,
            'Subject: ' . smtpEncodeHeader($subject),
            'Message-ID: <' . bin2hex(random_bytes(16)) . '@' . $domain . '>',
            'MIME-Version: 1.0',
            'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        ];
        $body = implode("\r\n", $headers) . "\r\n\r\n"
            . '--' . $boundary . "\r\n"
            . "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
            . chunk_split(base64_encode($textBody)) . "\r\n"
            . '--' . $boundary . "\r\n"
            . "Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
            . chunk_split(base64_encode($htmlBody)) . "\r\n"
            . '--' . $boundary . "--\r\n";

        // Base64 parts never start a line with '.', so no dot-stuffing is needed.
        fwrite($sock, $body . "\r\n.\r\n");
        $step('', [250], 'message body');
        // Accepted for delivery. QUIT is a courtesy; its reply doesn't matter.
        fwrite($sock, "QUIT\r\n");
    } catch (Throwable $e) {
        error_log('AA-MAIL failed at ' . $e->getMessage());
        @fclose($sock);
        return false;
    }

    @fclose($sock);
    return true;
}
