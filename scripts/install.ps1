param(
    [string]$AppHome = "$env:USERPROFILE/.config/herdr-app",
    [string]$Layout = 'custom'
)
$ErrorActionPreference = 'Stop'
$source = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../mods/kolczyk'))
$destination = Join-Path $AppHome 'mods/kolczyk'
$layoutPath = Join-Path $AppHome "layouts/$Layout.json"
if (-not [IO.File]::Exists($layoutPath)) { throw "Personal layout does not exist: $layoutPath" }
$tree = Get-Content -Raw -LiteralPath $layoutPath | ConvertFrom-Json
if (-not $tree.cloned_from -and $Layout -in @('main', 'terminals', 'win98')) { throw 'Clone the shipped layout before installing Kolczyk.' }
function Find-Spaces($node) {
    if ($node.id -eq 'spaces') { return $node }
    foreach ($child in $node.children) { $found = Find-Spaces $child; if ($found) { return $found } }
    return $null
}
$block = Find-Spaces $tree
if (-not $block -or $block.content.mod -notin @('spaces', 'kolczyk')) { throw 'Expected a spaces block using spaces or kolczyk; refusing to replace another mod.' }
if (Test-Path -LiteralPath $destination) {
    $existing = Get-Content -Raw -LiteralPath (Join-Path $destination 'mod.json') | ConvertFrom-Json
    $ours = $existing.kolczyk_version
    $untouchedClone = $existing.cloned_from.name -eq 'spaces' -and
        (Get-FileHash -LiteralPath (Join-Path $destination 'main.js')).Hash -eq
        (Get-FileHash -LiteralPath (Join-Path $AppHome 'mods/spaces/main.js')).Hash
    if (-not $ours -and -not $untouchedClone) { throw 'A different mod already owns the kolczyk folder.' }
}
$backup = Join-Path $AppHome ('backups/kolczyk/' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
[void][IO.Directory]::CreateDirectory($backup)
Copy-Item -LiteralPath $layoutPath -Destination (Join-Path $backup "$Layout.json")
if (Test-Path -LiteralPath $destination) { Copy-Item -LiteralPath $destination -Destination (Join-Path $backup 'kolczyk') -Recurse }
try {
    [void][IO.Directory]::CreateDirectory($destination)
    Get-ChildItem -LiteralPath $source -Force | Where-Object { $_.Name -notin @('gpui-kit.d.ts', 'herdr.d.ts', 'jsconfig.json', 'cache') } |
        Copy-Item -Destination $destination -Recurse -Force
    & herdr-app check $destination | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'Mod check failed.' }
    $block.content.mod = 'kolczyk'
    $json = $tree | ConvertTo-Json -Depth 100
    [IO.File]::WriteAllText($layoutPath, $json, (New-Object Text.UTF8Encoding($false)))
} catch {
    $failure = $_
    $resolvedDestination = [IO.Path]::GetFullPath($destination)
    $expectedDestination = [IO.Path]::GetFullPath((Join-Path $AppHome 'mods/kolczyk'))
    $failedDestination = [IO.Path]::GetFullPath((Join-Path $backup 'failed-install'))
    if ($resolvedDestination -ne $expectedDestination -or -not $failedDestination.StartsWith([IO.Path]::GetFullPath($backup) + [IO.Path]::DirectorySeparatorChar)) { throw 'Rollback path validation failed.' }
    if (Test-Path -LiteralPath $destination) { Move-Item -LiteralPath $resolvedDestination -Destination $failedDestination }
    if (Test-Path -LiteralPath (Join-Path $backup 'kolczyk')) { Copy-Item -LiteralPath (Join-Path $backup 'kolczyk') -Destination $destination -Recurse }
    Copy-Item -LiteralPath (Join-Path $backup "$Layout.json") -Destination $layoutPath -Force
    throw "Installation rolled back: $($failure.Exception.Message) Backup: $backup"
}
Write-Output "Kolczyk installed in $Layout. Backup: $backup"
