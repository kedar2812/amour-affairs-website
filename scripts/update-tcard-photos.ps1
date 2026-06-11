
# Pool of wedding couple photos from Unsplash (warm, editorial, varied)
$photos = @(
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1604017011826-d3b4c23f8914?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1529636798458-92182e662485?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519657232051-b5d97a92ec49?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470290378698-263fa7ca60ab?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519741347686-c1e0aadf4611?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1509927083803-4bd519298ac4?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&q=80&auto=format&fit=crop"
)

$filePath = "testimonials\index.html"
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Counter for photo rotation
$photoIndex = 0

# Regex to match each tcard-page block and wrap its inner content
# Pattern: match opening of tcard-page div then capture everything up to the next tcard-page or end marker
# We'll use a line-by-line approach: when we see <div class="tcard-page">, inject the photo block
# and wrap the rest in .tcard-page__body, closed before </div>

$lines = $content -split "`n"
$output = [System.Collections.Generic.List[string]]::new()
$inCard = $false
$cardDepth = 0

foreach ($line in $lines) {
    $trimmed = $line.TrimEnd()
    
    if (-not $inCard) {
        if ($trimmed -match '^\s*<div class="tcard-page">') {
            $photo = $photos[$photoIndex % $photos.Length]
            $photoIndex++
            $indent = ($trimmed -replace '<div.*', '')
            # Output opening tag
            $output.Add($trimmed)
            # Inject photo block
            $output.Add("$indent  <div class=""tcard-page__photo"">")
            $output.Add("$indent    <img src=""$photo"" alt=""Couple"" loading=""lazy"" />")
            $output.Add("$indent  </div>")
            # Open body wrapper
            $output.Add("$indent  <div class=""tcard-page__body"">")
            $inCard = $true
            $cardDepth = 1
            continue
        }
        $output.Add($line)
    } else {
        # Track depth to know when outer card div closes
        if ($trimmed -match '<div') { $cardDepth++ }
        if ($trimmed -match '</div>') { $cardDepth-- }
        
        if ($cardDepth -eq 0) {
            # This is the closing </div> of .tcard-page
            # Close the body wrapper first
            $indent = ($trimmed -replace '</div>.*', '')
            $output.Add("$indent  </div>")
            $output.Add($line)
            $inCard = $false
        } else {
            $output.Add($line)
        }
    }
}

[System.IO.File]::WriteAllText($filePath, ($output -join "`n"), [System.Text.Encoding]::UTF8)
Write-Host "Done. $photoIndex cards updated."
