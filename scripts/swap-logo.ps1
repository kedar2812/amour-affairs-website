# One-off: swap the old logo.png + text-span lockup for the new single-image logo.
# Nav logos -> black /logo-full.png ; footer logos -> white /logo-full-white.png.
$root = "F:\projects kedar\amour affairs final website"
$dirs = @("about","careers","couple-shoots","disclaimer","faqs","films","premium-albums","privacy-policy","shop","terms-and-conditions","testimonials","weddings")
$files = @()
$files += Join-Path $root "index.html"
$files += Join-Path $root "nav-test.html"
foreach ($d in $dirs) { $files += Join-Path $root "$d\index.html" }

$pattern = '(?s)(<a\b[^>]*class="nav__logo([^"]*)"[^>]*>)\s*<img\b[^>]*class="nav__logo-img"[^>]*/>\s*<span class="logo-amour">.*?</sup>\s*(</a>)'
$rx = [regex]$pattern
$utf8 = New-Object System.Text.UTF8Encoding($false)

foreach ($f in $files) {
  if (-not (Test-Path $f)) { continue }
  $text = [System.IO.File]::ReadAllText($f)
  $count = 0
  $new = $rx.Replace($text, {
    param($m)
    $script:count++
    $extra = $m.Groups[2].Value
    $src = if ($extra -match 'footer') { '/logo-full-white.png' } else { '/logo-full.png' }
    return "$($m.Groups[1].Value)`r`n      <img src=`"$src`" alt=`"Amour Affairs`" class=`"nav__logo-img`" />`r`n    $($m.Groups[3].Value)"
  })
  if ($count -gt 0) {
    [System.IO.File]::WriteAllText($f, $new, $utf8)
    Write-Output "updated ($count): $f"
  } else {
    Write-Output "no match: $f"
  }
}
