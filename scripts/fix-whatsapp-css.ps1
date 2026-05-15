$root = 'f:\projects kedar\amour affairs final website'

$css = @'

    .floating-whatsapp{position:fixed;bottom:30px;left:30px;width:60px;height:60px;background:linear-gradient(135deg,#C9A97C 0%,#9E7A4E 100%);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(158,122,78,.35),inset 0 2px 4px rgba(255,255,255,.2);z-index:9999;text-decoration:none;transition:transform .4s cubic-bezier(.175,.885,.32,1.275),box-shadow .4s ease}
    .floating-whatsapp:hover{transform:scale(1.08) translateY(-6px);box-shadow:0 16px 32px rgba(158,122,78,.45),inset 0 2px 6px rgba(255,255,255,.3);color:#fff;opacity:1}
    .floating-whatsapp:active{transform:scale(.95)}
    .floating-whatsapp svg{fill:currentColor;filter:drop-shadow(0 2px 4px rgba(0,0,0,.1))}
    .floating-whatsapp::after{content:'';position:absolute;top:-2px;left:-2px;right:-2px;bottom:-2px;border-radius:50%;border:1px solid rgba(255,255,255,.2);pointer-events:none}
    .floating-whatsapp::before{content:'';position:absolute;top:0;left:0;width:100%;height:100%;border-radius:50%;background-color:#C9A97C;z-index:-1;opacity:.5;animation:wa-pulse 2.5s infinite}
    @keyframes wa-pulse{0%{transform:scale(1);opacity:.5}70%{transform:scale(1.4);opacity:0}100%{transform:scale(1.4);opacity:0}}
    @media(max-width:768px){.floating-whatsapp{bottom:20px;left:20px;width:54px;height:54px}.floating-whatsapp svg{width:28px;height:28px}}
  
'@

$pages = @(
    'terms-and-conditions\index.html',
    'privacy-policy\index.html',
    'disclaimer\index.html',
    'faqs\index.html',
    'careers\index.html',
    'shop\index.html'
)

foreach ($rel in $pages) {
    $path = Join-Path $root $rel
    if (-not (Test-Path $path)) {
        Write-Host "SKIP: $rel"
        continue
    }
    $txt = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    if ($txt.Contains('wa-pulse')) {
        Write-Host "ALREADY: $rel"
        continue
    }
    $marker = '</style>'
    $idx = $txt.IndexOf($marker)
    if ($idx -lt 0) {
        Write-Host "NO STYLE: $rel"
        continue
    }
    $out = $txt.Substring(0, $idx) + $css + $marker + $txt.Substring($idx + $marker.Length)
    [System.IO.File]::WriteAllText($path, $out, [System.Text.Encoding]::UTF8)
    Write-Host "UPDATED: $rel"
}

Write-Host 'Done.'
