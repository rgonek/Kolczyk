param([string]$Output = (Join-Path $PSScriptRoot '../preview.png'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$background = [Drawing.Image]::FromFile((Join-Path $PSScriptRoot '../docs/images/preview-background.png'))
$shot = [Drawing.Image]::FromFile((Join-Path $PSScriptRoot '../docs/images/picker-emoji.png'))
if ($background.Width -ne 1672 -or $background.Height -ne 941 -or $shot.Width -ne 520 -or $shot.Height -ne 590) {
    throw 'Preview source dimensions changed; update placement after inspecting the images.'
}
$canvas = [Drawing.Bitmap]::new(1672, 941)
$g = [Drawing.Graphics]::FromImage($canvas)
$g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImageUnscaled($background, 0, 0)
$g.DrawImage($shot, [Drawing.Rectangle]::new(845, 111, 666, 755))
$canvas.Save([IO.Path]::GetFullPath($Output), [Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $canvas.Dispose(); $shot.Dispose(); $background.Dispose()
Write-Output ([IO.Path]::GetFullPath($Output))
