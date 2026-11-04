param([string]$Output = (Join-Path $PSScriptRoot '../preview.png'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$background = [Drawing.Image]::FromFile((Join-Path $PSScriptRoot '../docs/images/preview-background.png'))
$picker = [Drawing.Image]::FromFile((Join-Path $PSScriptRoot '../docs/images/picker-emoji.png'))
$spaces = [Drawing.Image]::FromFile((Join-Path $PSScriptRoot '../docs/images/spaces-custom.png'))
$canvas = [Drawing.Bitmap]::new(1672, 941)
$g = [Drawing.Graphics]::FromImage($canvas)
$g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
function Draw-Window([Drawing.Image]$Image, [int]$X, [int]$Y, [int]$Width) {
    $height = [int][Math]::Round($Image.Height * $Width / $Image.Width)
    $shadow = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(35, 20, 25, 25))
    $chrome = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#f1ece3'))
    $border = [Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#c1b9ac'))
    $g.FillRectangle($shadow, $X + 6, $Y + 8, $Width, $height + 34)
    $g.FillRectangle($chrome, $X, $Y, $Width, 34)
    for ($i = 0; $i -lt 3; $i++) {
        $dot = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml(@('#ff6057','#ffbd2e','#28c840')[$i]))
        $g.FillEllipse($dot, $X + 15 + 22 * $i, $Y + 11, 12, 12)
        $dot.Dispose()
    }
    $g.DrawImage($Image, [Drawing.Rectangle]::new($X, $Y + 34, $Width, $height))
    $g.DrawRectangle($border, $X, $Y, $Width, $height + 34)
    $border.Dispose(); $chrome.Dispose(); $shadow.Dispose()
}
try {
    $g.DrawImage($background, [Drawing.Rectangle]::new(0, 0, 1672, 941))
    Draw-Window $picker 910 66 672
    Draw-Window $spaces 590 550 300
    $canvas.Save([IO.Path]::GetFullPath($Output), [Drawing.Imaging.ImageFormat]::Png)
} finally {
    $g.Dispose(); $canvas.Dispose(); $spaces.Dispose(); $picker.Dispose(); $background.Dispose()
}
Write-Output ([IO.Path]::GetFullPath($Output))
