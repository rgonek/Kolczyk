param([string]$Output = (Join-Path $PSScriptRoot '../preview.png'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$canvas = New-Object Drawing.Bitmap(1200, 800)
$g = [Drawing.Graphics]::FromImage($canvas)
$g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear([Drawing.ColorTranslator]::FromHtml('#f6f5f0'))
function Brush($hex) { New-Object Drawing.SolidBrush([Drawing.ColorTranslator]::FromHtml($hex)) }
function Label($text, $size, $x, $y, $color = '#182723', $bold = $false) {
    $style = if ($bold) { [Drawing.FontStyle]::Bold } else { [Drawing.FontStyle]::Regular }
    $font = New-Object Drawing.Font('Segoe UI', $size, $style, [Drawing.GraphicsUnit]::Pixel)
    $brush = Brush $color
    $g.DrawString($text, $font, $brush, $x, $y)
    $font.Dispose(); $brush.Dispose()
}
$accent = Brush '#ffcc15'
$g.FillEllipse($accent, 1030, -160, 360, 360)
$g.FillRectangle($accent, 64, 64, 38, 5)
Label 'A NATIVE HERDR MOD' 15 64 89 '#53675e' $true
Label 'Kolczyk' 84 57 126 '#182723' $true
Label "Give every space`na familiar face." 39 62 246 '#182723' $true
Label "A little identity for every project`nin your flock." 23 64 362 '#53675e'
Label '01' 16 64 470 '#66776e' $true
Label 'Project favicons. Your own images.' 21 104 466
Label '02' 16 64 522 '#66776e' $true
Label 'Three icon libraries. Emoji. Initials.' 21 104 518
Label '03' 16 64 574 '#66776e' $true
Label 'Colors, shapes and the perfect fit.' 21 104 570
Label 'Native GPUI. Offline icons. Made for Herdr.' 16 64 717 '#53675e'
$shot = [Drawing.Bitmap]::FromFile((Join-Path $PSScriptRoot '../docs/images/picker-emoji.png'))
$shadow = Brush '#e1e3d9'
$g.FillRectangle($shadow, 640, 110, 528, 598)
$g.DrawImageUnscaled($shot, 632, 102)
Label 'The real picker, captured in Herdr.' 14 632 717 '#53675e'
$canvas.Save([IO.Path]::GetFullPath($Output), [Drawing.Imaging.ImageFormat]::Png)
$shot.Dispose(); $accent.Dispose(); $shadow.Dispose(); $g.Dispose(); $canvas.Dispose()
Write-Output ([IO.Path]::GetFullPath($Output))
