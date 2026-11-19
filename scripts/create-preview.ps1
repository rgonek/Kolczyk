param([string]$Output = (Join-Path $PSScriptRoot '../preview.png'))

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$images = Join-Path $PSScriptRoot '../docs/images'
$landscape = [Drawing.Bitmap]::new((Join-Path $images 'gallery-landscape.png'))
$spaces = [Drawing.Bitmap]::new((Join-Path $images 'gallery-spaces.png'))
$picker = [Drawing.Bitmap]::new((Join-Path $images 'gallery-icon-picker.png'))
$canvas = [Drawing.Bitmap]::new(1586, 992)
$graphics = [Drawing.Graphics]::FromImage($canvas)
$ink = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#10202a'))
$title = [Drawing.Font]::new('Georgia', 132, [Drawing.FontStyle]::Bold, [Drawing.GraphicsUnit]::Pixel)
$subtitle = [Drawing.Font]::new('Georgia', 47, [Drawing.FontStyle]::Regular, [Drawing.GraphicsUnit]::Pixel)

function New-RoundedPath([Drawing.Rectangle]$Bounds, [int]$Radius) {
    $path = [Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = $Radius * 2
    $path.AddArc($Bounds.Left, $Bounds.Top, $diameter, $diameter, 180, 90)
    $path.AddArc(($Bounds.Right - $diameter), $Bounds.Top, $diameter, $diameter, 270, 90)
    $path.AddArc(($Bounds.Right - $diameter), ($Bounds.Bottom - $diameter), $diameter, $diameter, 0, 90)
    $path.AddArc($Bounds.Left, ($Bounds.Bottom - $diameter), $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function Draw-Screenshot([Drawing.Bitmap]$Image, [int]$X, [int]$Y, [int]$Width) {
    $height = [int][Math]::Round($Image.Height * $Width / $Image.Width)
    $bounds = [Drawing.Rectangle]::new($X, $Y, $Width, $height)
    $path = New-RoundedPath $bounds 20
    $border = [Drawing.Pen]::new([Drawing.Color]::FromArgb(42, 50, 40, 30), 2)
    try {
        foreach ($offset in 11, 7, 3) {
            $shadow = New-RoundedPath ([Drawing.Rectangle]::new(($X + $offset), ($Y + $offset), $Width, $height)) 20
            $brush = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(24, 42, 29, 17))
            try { $graphics.FillPath($brush, $shadow) }
            finally { $brush.Dispose(); $shadow.Dispose() }
        }
        $state = $graphics.Save()
        try {
            $graphics.SetClip($path)
            $graphics.DrawImage($Image, $bounds)
        } finally { $graphics.Restore($state) }
        $graphics.DrawPath($border, $path)
    } finally { $border.Dispose(); $path.Dispose() }
}

try {
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.DrawImage($landscape, [Drawing.Rectangle]::new(0, 0, $canvas.Width, $canvas.Height))
    $graphics.DrawString('Kolczyk', $title, $ink, 44, 31)
    $graphics.DrawString('Folders & icons for Herdr', $subtitle, $ink, 64, 184)
    Draw-Screenshot $spaces 416 348 490
    Draw-Screenshot $picker 925 148 583
    $canvas.Save([IO.Path]::GetFullPath($Output), [Drawing.Imaging.ImageFormat]::Png)
} finally {
    $subtitle.Dispose()
    $title.Dispose()
    $ink.Dispose()
    $graphics.Dispose()
    $canvas.Dispose()
    $picker.Dispose()
    $spaces.Dispose()
    $landscape.Dispose()
}
