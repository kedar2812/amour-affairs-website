# ============================================================
# Phase 1 API end-to-end test — albums.php + films.php
# Requires: MariaDB running, php -S localhost:8080 serving repo root
# JSON bodies go through temp files (-d @file) — PowerShell 5.1
# mangles quoted JSON args containing spaces.
# ============================================================
$ErrorActionPreference = "Stop"
$API = "http://localhost:8080/api"
$pass = 0; $fail = 0
$results = New-Object System.Collections.ArrayList

function Check($name, $condition, $detail = "") {
    if ($condition) { $script:pass++; [void]$results.Add("PASS  $name") }
    else { $script:fail++; [void]$results.Add("FAIL  $name  $detail") }
}

$jsonFile = "$env:TEMP\aa_body.json"
function Send-Json($method, $url, $body, $auth = $true) {
    [IO.File]::WriteAllText($jsonFile, $body)
    if ($auth) { curl.exe -s -X $method $url -H $script:tok -H "Content-Type: application/json" -d "@$jsonFile" }
    else { curl.exe -s -X $method $url -H "Content-Type: application/json" -d "@$jsonFile" }
}
function Send-JsonCode($method, $url, $body, $auth = $true) {
    [IO.File]::WriteAllText($jsonFile, $body)
    if ($auth) { curl.exe -s -o NUL -w "%{http_code}" -X $method $url -H $script:tok -H "Content-Type: application/json" -d "@$jsonFile" }
    else { curl.exe -s -o NUL -w "%{http_code}" -X $method $url -H "Content-Type: application/json" -d "@$jsonFile" }
}

# ── Test images ──
Add-Type -AssemblyName System.Drawing
function New-TestImage($path, $color, $w = 800, $h = 600) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::$color)
    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $bmp.Dispose()
}
$img1 = "$env:TEMP\aa_test_cover.jpg";  New-TestImage $img1 "Coral"
$img2 = "$env:TEMP\aa_test_p1.jpg";     New-TestImage $img2 "Teal" 1200 800
$img3 = "$env:TEMP\aa_test_p2.jpg";     New-TestImage $img3 "Goldenrod" 900 1200
$fake = "$env:TEMP\aa_test_fake.jpg";   Set-Content $fake "this is not an image" -Encoding ascii

# ── 1. Login ──
$login = Send-Json "POST" "$API/auth.php?action=login" '{"email":"test@test.in","password":"test123"}' $false | ConvertFrom-Json
Check "auth: login returns access token" ($null -ne $login.access_token) ($login | ConvertTo-Json -Compress)
$tok = "Authorization: Bearer $($login.access_token)"

# ── 2. Films: public list (seeded) ──
$films = curl.exe -s "$API/films.php" | ConvertFrom-Json
Check "films: public list returns 11 seeded films" ($films.total -eq 11) "got $($films.total)"

$featured = curl.exe -s "$API/films.php?featured=1" | ConvertFrom-Json
Check "films: featured pool has 6 films" ($featured.total -eq 6) "got $($featured.total)"

# ── 3. Films: create from full YouTube URL (ID extraction) ──
$newFilm = Send-Json "POST" "$API/films.php" '{"youtube_id":"https://www.youtube.com/watch?v=dQw4w9WgXcQ","title":"Test Couple","caption":"Test Film","is_featured":1}' | ConvertFrom-Json
Check "films: create extracts ID from URL" ($newFilm.youtube_id -eq "dQw4w9WgXcQ") ($newFilm | ConvertTo-Json -Compress)

# unauthenticated create must be rejected
$noAuth = Send-JsonCode "POST" "$API/films.php" '{"youtube_id":"abcdefghijk","title":"X"}' $false
Check "films: create without auth -> 401" ($noAuth -eq "401") "got $noAuth"

# duplicate must be rejected with 409
$dupCode = Send-JsonCode "POST" "$API/films.php" '{"youtube_id":"dQw4w9WgXcQ","title":"Dup"}'
Check "films: duplicate video -> 409" ($dupCode -eq "409") "got $dupCode"

# invalid ID rejected
$badCode = Send-JsonCode "POST" "$API/films.php" '{"youtube_id":"not a video","title":"X"}'
Check "films: invalid youtube id -> 400" ($badCode -eq "400") "got $badCode"

# update + hide
$upd = Send-Json "PUT" "$API/films.php?id=$($newFilm.id)" '{"is_active":0,"caption":"Hidden now"}' | ConvertFrom-Json
Check "films: update caption + hide" ($upd.is_active -eq 0 -and $upd.caption -eq "Hidden now") ($upd | ConvertTo-Json -Compress)

$publicAfterHide = curl.exe -s "$API/films.php" | ConvertFrom-Json
Check "films: hidden film not in public list" ($publicAfterHide.total -eq 11) "got $($publicAfterHide.total)"

# reorder
$reorderFilms = Send-Json "POST" "$API/films.php?action=reorder" ('{"orders":[{"id":' + $newFilm.id + ',"sort_order":99}]}') | ConvertFrom-Json
Check "films: reorder" ($reorderFilms.message -eq "Order updated") ($reorderFilms | ConvertTo-Json -Compress)

# delete
$del = curl.exe -s -X DELETE "$API/films.php?id=$($newFilm.id)" -H $tok | ConvertFrom-Json
Check "films: delete" ($del.message -eq "Film deleted") ($del | ConvertTo-Json -Compress)

# ── 4. Albums: create with cover ──
$album = curl.exe -s -X POST "$API/albums.php" -H $tok -F "type=wedding" -F "couple=Test & Couple" -F "location=Pune" -F "date_label=June 2026" -F "description=A test wedding album" -F "cover=@$img1" | ConvertFrom-Json
Check "albums: create with cover upload" ($album.id -gt 0 -and $album.cover_path -like "/uploads/albums/*") ($album | ConvertTo-Json -Compress)
$albumId = $album.id

# validation: bad type
$badType = curl.exe -s -o NUL -w "%{http_code}" -X POST "$API/albums.php" -H $tok -F "type=banquet" -F "couple=X"
Check "albums: invalid type -> 400" ($badType -eq "400") "got $badType"

# validation: missing title
$noTitle = curl.exe -s -o NUL -w "%{http_code}" -X POST "$API/albums.php" -H $tok -F "type=wedding" -F "couple="
Check "albums: missing title -> 400" ($noTitle -eq "400") "got $noTitle"

# ── 5. Albums: batch photo upload ──
$photosRes = curl.exe -s -X POST "$API/albums.php?action=photos&id=$albumId" -H $tok -F "photos[]=@$img2" -F "photos[]=@$img3" | ConvertFrom-Json
Check "albums: batch upload 2 photos" (@($photosRes.photos).Count -eq 2) ($photosRes | ConvertTo-Json -Compress)

# fake image must be rejected before anything is stored
$fakeCode = curl.exe -s -o NUL -w "%{http_code}" -X POST "$API/albums.php?action=photos&id=$albumId" -H $tok -F "photos[]=@$fake"
Check "albums: non-image file -> 400" ($fakeCode -eq "400") "got $fakeCode"

# WebP conversion happened on disk
$webpCount = (Get-ChildItem "F:\projects kedar\amour affairs final website\uploads\albums" -Filter "*.webp").Count
Check "albums: files stored as WebP (+thumbnails)" ($webpCount -eq 6) "got $webpCount files"  # cover + 2 photos, each with thumb

# ── 6. Albums: single GET with photos, effective cover ──
$got = curl.exe -s "$API/albums.php?id=$albumId&all=1" | ConvertFrom-Json
Check "albums: get returns photos + count" ($got.photo_count -eq 2 -and @($got.photos).Count -eq 2) ($got.photo_count)
Check "albums: effective cover uses uploaded cover" ($got.cover -eq $got.cover_path) "cover=$($got.cover)"

# ── 7. Albums: website list shape ──
$webList = curl.exe -s "$API/albums.php?type=wedding&with_photos=1" | ConvertFrom-Json
$first = @($webList.albums | Where-Object { $_.id -eq $albumId })[0]
Check "albums: public with_photos list embeds photos" (@($first.photos).Count -eq 2) "albums: $($webList.total)"

# ── 8. Photo reorder via gallery.php (shared path) ──
$p1 = $got.photos[0].id; $p2 = $got.photos[1].id
Send-Json "POST" "$API/gallery.php?action=reorder" ('{"orders":[{"id":' + $p2 + ',"sort_order":1},{"id":' + $p1 + ',"sort_order":2}]}') | Out-Null
$afterReorder = curl.exe -s "$API/albums.php?id=$albumId&all=1" | ConvertFrom-Json
Check "albums: photo reorder respected" ($afterReorder.photos[0].id -eq $p2) "first photo now $($afterReorder.photos[0].id)"

# ── 9. Hide album -> public list excludes it, dashboard still sees it ──
Send-Json "PUT" "$API/albums.php?id=$albumId" '{"is_active":0}' | Out-Null
$publicList = curl.exe -s "$API/albums.php?type=wedding" | ConvertFrom-Json
$dashList = curl.exe -s -H $tok "$API/albums.php?type=wedding&all=1" | ConvertFrom-Json
Check "albums: hidden album excluded from public list" (@($publicList.albums | Where-Object { $_.id -eq $albumId }).Count -eq 0) "public total $($publicList.total)"
Check "albums: hidden album visible with all=1" (@($dashList.albums | Where-Object { $_.id -eq $albumId }).Count -eq 1) "dash total $($dashList.total)"
$hiddenGet = curl.exe -s "$API/albums.php?id=$albumId&all=1" | ConvertFrom-Json
Check "albums: dashboard get(id, all=1) opens hidden album" ($hiddenGet.id -eq $albumId) ($hiddenGet | ConvertTo-Json -Compress).Substring(0, 120)

# ── 10. Delete album -> rows + files cleaned up ──
$delAlbum = curl.exe -s -X DELETE "$API/albums.php?id=$albumId" -H $tok | ConvertFrom-Json
$filesLeft = (Get-ChildItem "F:\projects kedar\amour affairs final website\uploads\albums" -Filter "*.webp" -ErrorAction SilentlyContinue).Count
$mb = "C:\Program Files\MariaDB 12.3\bin\mariadb.exe"
$rowsLeft = (& $mb -u root amour_affairs_db -N -e "SELECT COUNT(*) FROM gallery_images WHERE album_id = $albumId; SELECT COUNT(*) FROM albums WHERE id = $albumId;") -join ","
Check "albums: delete removes album" ($delAlbum.message -eq "Album deleted") ($delAlbum | ConvertTo-Json -Compress)
Check "albums: delete cleans up all files on disk" ($filesLeft -eq 0) "files left: $filesLeft"
Check "albums: delete removes photo + album rows" ($rowsLeft -eq "0,0") "rows left: $rowsLeft"

# ── 11. Audit log captured the session ──
$auditCount = & $mb -u root amour_affairs_db -N -e "SELECT COUNT(*) FROM audit_log WHERE entity_type IN ('albums','films');"
Check "audit: album/film actions logged" ([int]$auditCount -ge 8) "got $auditCount"

# ── Summary ──
""
$results | ForEach-Object { $_ }
""
"RESULT: $pass passed, $fail failed"
if ($fail -gt 0) { exit 1 }
