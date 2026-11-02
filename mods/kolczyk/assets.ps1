param(
    [Parameter(Mandatory)][ValidateSet('Scan', 'Discover', 'Import')][string]$Action,
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][string]$AppHome
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Drawing
# Assets must live OUTSIDE mods/: writing there hot-reloads the picker mid-import.
$cache = Join-Path $AppHome 'assets/kolczyk'
[void][System.IO.Directory]::CreateDirectory($cache)
$extensions = @('.svg', '.png', '.ico', '.jpg', '.jpeg', '.gif', '.webp', '.bmp')

function Assert-LocalCss([string]$Value) {
    # Normalize CSS comments/escapes before checking references, including style blocks.
    $css = [regex]::Replace($Value, '(?s)/\*.*?\*/', '')
    $css = [regex]::Replace($css, '\\([0-9a-fA-F]{1,6})(?:\r\n|[ \t\r\n\f])?|\\([^\r\n\f])', {
        param($match)
        if ($match.Groups[1].Success) {
            $code = [Convert]::ToInt32($match.Groups[1].Value, 16)
            if ($code -eq 0 -or $code -gt 0x10ffff -or ($code -ge 0xd800 -and $code -le 0xdfff)) { return [string][char]0xfffd }
            return [char]::ConvertFromUtf32($code)
        }
        return $match.Groups[2].Value
    })
    if ($css -match '(?i)@import\b|\blocal\s*\(') { throw 'SVG must be self-contained: external CSS resources are not supported.' }
    # Permit only local fragment paint/filter references. Data URLs are intentionally
    # unsupported until their rendering and nested dependencies have been verified.
    $remaining = [regex]::Replace($css, '(?i)\burl\s*\(\s*(?:"#[^"\s()]+"|''#[^''\s()]+''|#[^\s()"'']+)\s*\)', '')
    if ($remaining -match '(?i)\burl\s*\(') { throw 'SVG must be self-contained: use local fragment references only.' }
}

function Assert-SelfContainedSvg([Xml.XmlDocument]$Document) {
    foreach ($node in $Document.SelectNodes('//processing-instruction()')) { throw 'SVG processing instructions are not supported.' }
    foreach ($element in $Document.SelectNodes('//*')) {
        if ($element.LocalName -in @('script', 'foreignObject')) { throw 'SVG must contain no scripts or foreign objects.' }
        if ($element.LocalName -eq 'style') { Assert-LocalCss $element.InnerText }
        foreach ($attribute in $element.Attributes) {
            if ($attribute.NamespaceURI -eq 'http://www.w3.org/2000/xmlns/') { continue }
            if ($attribute.LocalName -in @('href', 'src') -and $attribute.Value.Trim() -notmatch '^#[^\s]+$') { throw 'SVG must be self-contained: use local fragment references only.' }
            if ($attribute.LocalName -eq 'base' -and $attribute.NamespaceURI -eq 'http://www.w3.org/XML/1998/namespace') { throw 'SVG must not change its resource base.' }
            if ($attribute.LocalName -match '^on' -or ($attribute.LocalName -eq 'attributeName' -and $attribute.Value -match '(?i)(?:^|:)(?:href|src|base)$')) { throw 'SVG must contain no scripts or changing resource references.' }
            Assert-LocalCss $attribute.Value
        }
    }
}

function Import-Icon([string]$Source) {
    $item = Get-Item -LiteralPath $Source -ErrorAction Stop
    if ($item.PSIsContainer -or $item.Length -gt 2MB -or $item.Length -eq 0) { throw 'Choose an image smaller than 2 MiB.' }
    $ext = $item.Extension.ToLowerInvariant()
    if ($extensions -notcontains $ext) { throw 'Supported images: SVG, PNG, ICO, JPEG, GIF, BMP (WebP if Windows can decode it).' }
    $bytes = [IO.File]::ReadAllBytes($item.FullName)
    if ($ext -eq '.svg') {
        $text = [Text.Encoding]::UTF8.GetString($bytes)
        $settings = New-Object System.Xml.XmlReaderSettings
        $settings.DtdProcessing = [System.Xml.DtdProcessing]::Prohibit
        $reader = [Xml.XmlReader]::Create((New-Object IO.StringReader($text)), $settings)
        try { $doc = New-Object Xml.XmlDocument; $doc.XmlResolver = $null; $doc.Load($reader) } finally { $reader.Dispose() }
        if ($doc.DocumentElement.LocalName -ne 'svg') { throw 'Invalid SVG image.' }
        Assert-SelfContainedSvg $doc
        $outExt = '.svg'
    } else {
        $stream = New-Object IO.MemoryStream(,$bytes)
        $img = $null; $output = $null
        try {
            $img = [Drawing.Image]::FromStream($stream, $true, $true)
            if ($img.Width -gt 4096 -or $img.Height -gt 4096) { throw 'Image dimensions must be at most 4096 x 4096.' }
            $output = New-Object IO.MemoryStream
            $img.Save($output, [Drawing.Imaging.ImageFormat]::Png)
            $bytes = $output.ToArray()
        } finally { if ($output) { $output.Dispose() }; if ($img) { $img.Dispose() }; $stream.Dispose() }
        $outExt = '.png'
    }
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $hash = ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }
    $name = $hash + $outExt
    $dest = Join-Path $cache $name
    if (-not [IO.File]::Exists($dest)) {
        $tempFile = Join-Path $cache ([Guid]::NewGuid().ToString() + '.tmp')
        try { [IO.File]::WriteAllBytes($tempFile, $bytes); [IO.File]::Move($tempFile, $dest) }
        catch { if (-not [IO.File]::Exists($dest)) { throw } }
        finally { if ([IO.File]::Exists($tempFile)) { [IO.File]::Delete($tempFile) } }
    }
    return "assets/kolczyk/$name"
}

try {
    if ($Action -eq 'Import') {
        @{ path = Import-Icon $Path } | ConvertTo-Json -Compress
        exit 0
    }
    $rootItem = Get-Item -LiteralPath $Path
    if (-not $rootItem.PSIsContainer) { throw 'Project folder is unavailable.' }
    $root = $rootItem.FullName.TrimEnd('\', '/')
    $prefix = $root + [IO.Path]::DirectorySeparatorChar
    function Project-Path([string]$Relative) {
        if ([string]::IsNullOrWhiteSpace($Relative) -or $Relative -match '^[a-zA-Z][a-zA-Z0-9+.-]*:|^[/\\]{2}') { return $null }
        $clean = ($Relative -split '[?#]', 2)[0].TrimStart('/', '\')
        try { $full = [IO.Path]::GetFullPath((Join-Path $root $clean)) } catch { return $null }
        if (-not $full.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { return $null }
        # Never follow project symlinks/junctions out of the intended checkout.
        $part = $full
        while ($part.Length -gt $root.Length) {
            if ((Test-Path -LiteralPath $part) -and ((Get-Item -LiteralPath $part -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { return $null }
            $part = [IO.Path]::GetDirectoryName($part)
        }
        return $full
    }
    function Read-Small([string]$Relative) {
        $full = Project-Path $Relative
        if ($full -and [IO.File]::Exists($full) -and (Get-Item -LiteralPath $full).Length -le 1MB) { return [IO.File]::ReadAllText($full) }
        return $null
    }
    $candidates = New-Object 'Collections.Generic.List[string]'
    $config = Read-Small 't3.json'
    if ($config) { try { $icon = ($config | ConvertFrom-Json).iconPath; if ($icon -is [string]) { $candidates.Add($icon) } } catch {} }
    foreach ($source in @('index.html', 'public/index.html', 'app/routes/__root.tsx', 'src/routes/__root.tsx', 'app/root.tsx')) {
        $text = Read-Small $source
        if (-not $text) { continue }
        $href = $null
        foreach ($match in [regex]::Matches($text, '(?is)<link\b[^>]*>')) {
            if ($match.Value -match '(?i)\brel\s*=\s*["''](?:icon|shortcut icon)["'']' -and $match.Value -match '(?i)\bhref\s*=\s*["'']([^"'']+)') { $href = $Matches[1]; break }
        }
        if (-not $href -and $text -match '(?is)rel\s*:\s*["''](?:icon|shortcut icon)["''][^}]*?href\s*:\s*["'']([^"'']+)') { $href = $Matches[1] }
        if ($href -and $href -notmatch '^[a-zA-Z][a-zA-Z0-9+.-]*:|^//') { $clean = $href.TrimStart('/'); $candidates.Add("public/$clean"); $candidates.Add($clean) }
    }
    foreach ($candidate in @('favicon.svg', 'favicon.ico', 'favicon.png', 'public/favicon.svg', 'public/favicon.ico', 'public/favicon.png', 'app/favicon.ico', 'app/favicon.png', 'app/icon.svg', 'app/icon.png', 'app/icon.ico', 'src/favicon.ico', 'src/favicon.svg', 'src/app/favicon.ico', 'src/app/icon.svg', 'src/app/icon.png', 'assets/icon.svg', 'assets/icon.png', 'assets/logo.svg', 'assets/logo.png', '.idea/icon.svg', 'static/favicon.svg', 'static/favicon.ico', 'static/favicon.png')) { $candidates.Add($candidate) }
    $automatic = $null; $sourcePath = $null
    foreach ($candidate in $candidates) {
        $full = Project-Path $candidate
        if ($full -and [IO.File]::Exists($full)) { try { $automatic = Import-Icon $full; $sourcePath = $candidate; break } catch {} }
    }
    if ($Action -eq 'Discover') {
        @{ automatic = $automatic; source = $sourcePath; files = @(); limited = $false } | ConvertTo-Json -Depth 5 -Compress
        exit 0
    }
    # Bounded breadth-first listing, excluding generated/dependency directories.
    $files = New-Object 'Collections.Generic.List[object]'
    $queue = New-Object 'Collections.Generic.Queue[object]'
    $queue.Enqueue(@{ path = $root; depth = 0 })
    $visited = 0; $entries = 0
    while ($queue.Count -gt 0 -and $files.Count -lt 200 -and $visited -lt 1200 -and $entries -lt 12000) {
        $entry = $queue.Dequeue(); $visited++
        try { foreach ($itemPath in [IO.Directory]::EnumerateFileSystemEntries($entry.path)) {
            $entries++; if ($entries -ge 12000) { break }
            try { $item = Get-Item -LiteralPath $itemPath -ErrorAction Stop } catch { continue }
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
            if ($item.PSIsContainer) {
                if ($entry.depth -lt 4 -and $queue.Count -lt 1200 -and $item.Name -notmatch '^(\.|node_modules$|target$|dist$|build$|bin$|obj$|vendor$|coverage$)') { $queue.Enqueue(@{path = $item.FullName; depth = $entry.depth + 1}) }
            } elseif ($extensions -contains $item.Extension.ToLowerInvariant() -and $item.Length -le 2MB) {
                $files.Add(@{ relative = $item.FullName.Substring($prefix.Length).Replace('\', '/'); path = $item.FullName })
                if ($files.Count -ge 200) { break }
            }
        } } catch { continue }
    }
    @{ automatic = $automatic; source = $sourcePath; files = @($files.ToArray()); limited = ($files.Count -ge 200 -or $visited -ge 1200 -or $entries -ge 12000) } | ConvertTo-Json -Depth 5 -Compress
} catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }
