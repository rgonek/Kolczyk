param([string]$AppHome = "$env:USERPROFILE/.config/herdr-app")
$ErrorActionPreference = 'Stop'
$env:HERDR_APP_HOME = [IO.Path]::GetFullPath($AppHome)
$source = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../mods/kolczyk'))
$checks = Join-Path ([IO.Path]::GetTempPath()) ('kolczyk-check-' + [Guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($checks)
# Eagerly render every picker mode: the app's check does not enter nested views.
Copy-Item -Path (Join-Path $source '*.js') -Destination $checks
foreach ($mode in @('herdr', 'auto', 'lucide', 'feather', 'hugeicons', 'emoji', 'monogram', 'image', 'menu', 'sidebar')) {
    if ($mode -in @('menu', 'sidebar')) {
        $file = if ($mode -eq 'menu') { 'menu.js' } else { 'spaces.js' }
        $entry = "export { default } from './$file';"
    } elseif ($mode -in @('feather', 'hugeicons')) {
        $entry = "import Picker from './picker.js'; import { FEATHER, HUGEICONS } from './libraries.js'; export default class Check extends Picker { init(p, cx) { super.init(p, cx); this.draft.kind = 'lucide'; this.draft.library = '$mode'; this.draft.name = " + $(if($mode -eq 'feather'){'FEATHER'}else{'HUGEICONS'}) + "[0]; } }"
    } else {
        $entry = "import Picker from './picker.js'; export default class Check extends Picker { init(p, cx) { super.init(p, cx); this.draft.kind = '$mode'; } }"
    }
    [IO.File]::WriteAllText((Join-Path $checks 'main.js'), $entry, (New-Object Text.UTF8Encoding($false)))
    & herdr-app check $checks | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "Native check failed: $mode. Fixture: $checks" }
    Write-Output "Checked: $mode"
}
Write-Output "All native views passed. Temporary fixtures: $checks"
