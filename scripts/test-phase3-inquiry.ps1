# ============================================================
# Phase 3 test — public website inquiry endpoint
# (leads.php?action=inquiry): validation, honeypot, forced
# fields, rate limiting, dashboard visibility.
# ============================================================
$ErrorActionPreference = "Stop"
$API = "http://localhost:8080/api"
$MB = "C:\Program Files\MariaDB 12.3\bin\mariadb.exe"
$pass = 0; $fail = 0
$results = New-Object System.Collections.ArrayList

function Check($name, $condition, $detail = "") {
    if ($condition) { $script:pass++; [void]$results.Add("PASS  $name") }
    else { $script:fail++; [void]$results.Add("FAIL  $name  $detail") }
}

$jsonFile = "$env:TEMP\aa_inq.json"
function Inquire($body) {
    [IO.File]::WriteAllText($jsonFile, $body)
    curl.exe -s -X POST "$API/leads.php?action=inquiry" -H "Content-Type: application/json" -d "@$jsonFile"
}
function InquireCode($body) {
    [IO.File]::WriteAllText($jsonFile, $body)
    curl.exe -s -o NUL -w "%{http_code}" -X POST "$API/leads.php?action=inquiry" -H "Content-Type: application/json" -d "@$jsonFile"
}
function ResetRateLimit() {
    & $MB -u root amour_affairs_db -e "DELETE FROM rate_limits WHERE endpoint = 'lead_inquiry';"
}
function LeadCount() {
    [int](& $MB -u root amour_affairs_db -N -e "SELECT COUNT(*) FROM leads;")
}

# Clean slate
& $MB -u root amour_affairs_db -e "DELETE FROM leads;" | Out-Null
ResetRateLimit

# ── 1. Valid inquiry (phone only, with date + message + override attempt) ──
$res = Inquire '{"client_name":"Riya Sharma","phone":"+91 98765 43210","event_type":"Pre-Wedding","event_date":"2026-12-18","message":"We are planning a destination wedding in Udaipur for around 200 guests.","source":"Instagram","stage":"Won","assigned_to":42}' | ConvertFrom-Json
Check "inquiry: valid submission -> 201 with lead_ref" ($res.lead_ref -like "#LD-*") ($res | ConvertTo-Json -Compress)

$row = & $MB -u root amour_affairs_db -N -e "SELECT source, stage, assigned_to, event_type, notes FROM leads ORDER BY id DESC LIMIT 1;"
Check "inquiry: source/stage forced server-side (override ignored)" ($row -match "Website" -and $row -match "New Inquiry" -and $row -match "NULL") $row
Check "inquiry: message stored as Website Form note" ($row -match "Website Form" -and $row -match "Udaipur") $row
Check "inquiry: whitelisted event type stored" ($row -match "Pre-Wedding") $row

# ── 2. Email-only contact is accepted ──
$res2 = Inquire '{"client_name":"Aman Verma","email":"aman@example.com"}' | ConvertFrom-Json
Check "inquiry: email-only contact accepted" ($res2.lead_ref -like "#LD-*") ($res2 | ConvertTo-Json -Compress)

# ── 3. Honeypot: pretends success, stores nothing ──
$before = LeadCount
$hp = Inquire '{"client_name":"Bot Bot","phone":"1234567890","website":"http://spam.example"}' | ConvertFrom-Json
$after = LeadCount
Check "inquiry: honeypot returns fake success" ($hp.message -like "Thank you*" -and $null -eq $hp.lead_ref) ($hp | ConvertTo-Json -Compress)
Check "inquiry: honeypot stores nothing" ($after -eq $before) "before=$before after=$after"

# ── 4. Validation rejections ──
ResetRateLimit
Check "inquiry: missing name -> 400"        ((InquireCode '{"phone":"1234567890"}') -eq "400")
Check "inquiry: 1-char name -> 400"         ((InquireCode '{"client_name":"A","phone":"1234567890"}') -eq "400")
Check "inquiry: no contact method -> 400"   ((InquireCode '{"client_name":"No Contact"}') -eq "400")
Check "inquiry: invalid email -> 400"       ((InquireCode '{"client_name":"Bad Email","email":"not-an-email"}') -eq "400")
ResetRateLimit
Check "inquiry: invalid phone -> 400"       ((InquireCode '{"client_name":"Bad Phone","phone":"call me maybe"}') -eq "400")
Check "inquiry: invalid date -> 400"        ((InquireCode '{"client_name":"Bad Date","phone":"1234567890","event_date":"18-12-2026"}') -eq "400")
$longMsg = '{"client_name":"Long Msg","phone":"1234567890","message":"' + ("x" * 2100) + '"}'
Check "inquiry: oversized message -> 400"   ((InquireCode $longMsg) -eq "400")

# unknown event type falls back to Wedding (not an error)
ResetRateLimit
Inquire '{"client_name":"Odd Type","phone":"1234567890","event_type":"Birthday<script>"}' | Out-Null
$typeRow = & $MB -u root amour_affairs_db -N -e "SELECT event_type FROM leads ORDER BY id DESC LIMIT 1;"
Check "inquiry: unknown event type falls back to Wedding" ($typeRow.Trim() -eq "Wedding") $typeRow

# ── 5. Rate limiting: 5 allowed per window, 6th -> 429 ──
ResetRateLimit
$codes = @()
for ($i = 1; $i -le 6; $i++) {
    $codes += InquireCode ('{"client_name":"Rate Test ' + $i + '","phone":"1234567890"}')
}
Check "inquiry: first 5 in window accepted" (($codes[0..4] | Where-Object { $_ -eq "201" }).Count -eq 5) ($codes -join ",")
Check "inquiry: 6th in window -> 429" ($codes[5] -eq "429") ($codes -join ",")

# ── 6. Dashboard sees the leads (auth GET) ──
[IO.File]::WriteAllText($jsonFile, '{"email":"test@test.in","password":"test123"}')
$login = curl.exe -s -X POST "$API/auth.php?action=login" -H "Content-Type: application/json" -d "@$jsonFile" | ConvertFrom-Json
$leads = curl.exe -s -H "Authorization: Bearer $($login.access_token)" "$API/leads.php?source=Website" | ConvertFrom-Json
$riya = @($leads.leads | Where-Object { $_.client_name -eq "Riya Sharma" })[0]
Check "dashboard: website leads listed via auth GET" ($leads.total -ge 2) "total=$($leads.total)"
Check "dashboard: notes decode to array with form message" ($riya.notes[0].author -eq "Website Form") ($riya.notes | ConvertTo-Json -Compress)

# unauthenticated GET must stay locked
$getCode = curl.exe -s -o NUL -w "%{http_code}" "$API/leads.php"
Check "security: lead list without auth -> 401" ($getCode -eq "401") "got $getCode"

# ── Cleanup ──
& $MB -u root amour_affairs_db -e "DELETE FROM leads; DELETE FROM rate_limits;" | Out-Null

""
$results | ForEach-Object { $_ }
""
"RESULT: $pass passed, $fail failed"
if ($fail -gt 0) { exit 1 }
