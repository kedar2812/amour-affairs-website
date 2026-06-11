# One-off: turn "logo final.png" into trimmed, alpha-keyed nav logos.
# Outputs public/logo-full.png (black) and public/logo-full-white.png (white).
Add-Type -AssemblyName System.Drawing

$src = "F:\projects kedar\amour affairs final website\logo final.png"
$outDir = "F:\projects kedar\amour affairs final website\public"

$bmp = New-Object System.Drawing.Bitmap $src
$w = $bmp.Width; $h = $bmp.Height
$rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
$data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$stride = $data.Stride
$bytes = New-Object byte[] ($stride * $h)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
$bmp.UnlockBits($data)
$bmp.Dispose()

# Build alpha (content = darkness) and find bounding box of real content.
$minX = $w; $minY = $h; $maxX = -1; $maxY = -1
$alpha = New-Object 'int[]' ($w * $h)
for ($y = 0; $y -lt $h; $y++) {
  $row = $y * $stride
  for ($x = 0; $x -lt $w; $x++) {
    $i = $row + $x * 4
    $b = $bytes[$i]; $g = $bytes[$i+1]; $r = $bytes[$i+2]; $a = $bytes[$i+3]
    # luminance; near-white -> background
    $lum = [int](0.299 * $r + 0.587 * $g + 0.114 * $b)
    $ak = 255 - $lum
    if ($a -lt 255) { $ak = [int]($ak * $a / 255) }  # respect existing transparency
    $idx = $y * $w + $x
    $alpha[$idx] = $ak
    if ($ak -gt 24) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

# small padding around content
$pad = [int]($h * 0.04)
$minX = [Math]::Max(0, $minX - $pad); $minY = [Math]::Max(0, $minY - $pad)
$maxX = [Math]::Min($w - 1, $maxX + $pad); $maxY = [Math]::Min($h - 1, $maxY + $pad)
$cw = $maxX - $minX + 1; $ch = $maxY - $minY + 1
Write-Output "content bbox: x=$minX..$maxX y=$minY..$maxY  -> ${cw}x${ch}"

function Save-Keyed($r, $g, $b, $path) {
  $out = New-Object System.Drawing.Bitmap $cw, $ch, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $orect = New-Object System.Drawing.Rectangle 0, 0, $cw, $ch
  $odata = $out.LockBits($orect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $ostride = $odata.Stride
  $obytes = New-Object byte[] ($ostride * $ch)
  for ($y = 0; $y -lt $ch; $y++) {
    $sy = $y + $minY
    for ($x = 0; $x -lt $cw; $x++) {
      $sx = $x + $minX
      $ak = $alpha[$sy * $w + $sx]
      $o = $y * $ostride + $x * 4
      $obytes[$o]   = $b
      $obytes[$o+1] = $g
      $obytes[$o+2] = $r
      $obytes[$o+3] = [byte]$ak
    }
  }
  [System.Runtime.InteropServices.Marshal]::Copy($obytes, 0, $odata.Scan0, $obytes.Length)
  $out.UnlockBits($odata)
  $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
  Write-Output "saved: $path"
}

Save-Keyed 0   0   0   (Join-Path $outDir "logo-full.png")
Save-Keyed 255 255 255 (Join-Path $outDir "logo-full-white.png")
