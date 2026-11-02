# Using Kolczyk

Right-click a space and choose **Change icon…**. You can also open the picker
for the current space from a terminal:

```powershell
herdr-app do kolczyk.icon
```

## Choose an icon

| Mode | What it does |
| --- | --- |
| **Default Herdr** | Restores the original initial on a colored tile, space number in the compact rail, or branch-only worktree marker. Saving clears custom icon, background and adjustment settings for that space. |
| **Automatic** | Requires the optional Node helper. Finds a favicon in the local project, falling back to initials derived from the current space name. |
| **Icons** | Browses 2,292 Lucide, 287 Feather and 6,144 Hugeicons Free Stroke Rounded icons. |
| **Emoji** | Offers quick choices and accepts pasted emoji, including flags and combined sequences. |
| **Monogram** | Accepts one or two letters or numbers. |
| **Image** | Requires the optional Node helper for new imports. Uses a project image, local file path or dropped file. |

In Icons, **Popular** shows a shortlist; **All** opens the complete catalogue.
Search and the **All categories** topic filter work together. Previous / Next
buttons page through the results, with 66 icons per page in 11 columns.

Custom modes support an optional background with preset or arbitrary `#RRGGBB`
colors and circle, square or rounded-square shapes. Lucide icons and monograms
also support a foreground color. **Choose…** opens a visual color picker with a
saturation/value field, hue slider and live preview; HEX input and swatches
remain available.

**Adjust**, beside the main preview, changes the symbol without resizing its
background. Directional arrows move it one sidebar pixel per press, up to ±8.
Size controls range from 50–150% in 5% steps. **Reset** clears the adjustment.
Adjustments are remembered per symbol within each space; larger previews scale
the same offsets. Existing emoji adjustments are preserved.

Changes stay in a live draft until **Save icon**. **Cancel / Esc** discards the
draft. Saved changes appear immediately in the sidebar. Catalogue tiles preview
the chosen background and shape; light symbols without a background receive a
contrasting backing in the catalogue only.

## Keyboard and previews

Icon and emoji grids support Tab, arrow keys, Home/End and Enter. Tiles have
names and hover tooltips. Adjust includes 22px/20px sidebar previews, and the dialog's
height adapts to the mode within the native viewport.

Image rows show the source path. Hover over a row or press **P** to request a
validated thumbnail, with at most 12 thumbnails per dialog. Invalid hidden
fields and obsolete import errors do not block an unrelated valid selection.

## Automatic discovery

Discovery starts from the first terminal's current folder and uses the checkout
root when that folder belongs to a Git repository. The precedence follows
T3code:

1. `iconPath` in `t3.json`.
2. Local icon references in `index.html`, `public/index.html` and common router files.
3. Common `favicon.*`, `public/favicon.*`, `app/icon.*`, `src/app/icon.*`,
   `assets/icon.*`, `assets/logo.*`, `.idea/icon.svg` and `static/favicon.*` paths.

A folder change triggers another lookup. The sidebar refreshes active Automatic
icons at most once a minute; the dialog also offers **Refresh favicon**.
Kolczyk does not download website icons or infer domains from repository names.
Remote spaces support manual choices, but their remote favicons are not fetched.

## Image limits

- Supported inputs: SVG, PNG, ICO, JPEG, GIF, WebP and uncompressed BMP.
  PNG-backed and uncompressed 24/32-bit ICO entries are supported; other ICO
  encodings are rejected. Raster inputs become static PNG.
- Inputs are limited to **2 MiB**; raster dimensions to **4096 × 4096**.
- SVG files must be self-contained, without scripts or external resources.
  References must be local `#fragments`; relative files, remote URLs and embedded
  data are rejected.
- The project image list is capped at 200 files, four subdirectory levels,
  1,200 directories and 12,000 entries. Dependency/build directories, hidden
  directories and links are skipped. Other local images can still be imported
  by path or file drop.

Imported images are copied to `assets/kolczyk/` under the app home with
SHA-256-based names. A manually saved image remains available after its source
is removed.

## Installation details

The installer copies [`mods/kolczyk`](../mods/kolczyk) into the app home's
`mods/kolczyk` directory. It checks the mod and changes the existing `spaces`
block's `content.mod` from `spaces` to `kolczyk` in the selected personal layout.
Menus and dialogs open as overlays; no separate picker block is required.

The default app home is `~/.config/herdr-app`. To use another location:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/install.ps1 -Layout custom -AppHome 'D:\HerdrHome'
```

The installer preserves other layout nodes, refuses to overwrite shipped mods
or an unrelated mod with the same name, and saves backups under
`backups/kolczyk/` in the app home. A failed check restores the previous
installation. Node.js is not required to run the mod.

Kolczyk contains its own sidebar and context menu, based on Herdr spaces
**0.1.11**. New upstream sidebar features do not automatically update this copy.
Stock Herdr commands, `workspace-chrome` SVGs and `worktree` dialogs remain
dependencies. Discovery and import use the [optional Node helper](../mods/kolczyk/node-helper/README.md).
The base mod requires neither Node.js nor PowerShell.

Herdr stores preferences in shared state under `kolczyk.spaces`, keyed by space
ID. Preferences for disconnected machines are retained. Default Herdr keeps a
small mode marker instead of custom icon, background or adjustment data.

## Remove or disable

In your personal `layouts/<name>.json`, change the `spaces` block's `content.mod`
from `kolczyk` to `spaces`, or restore the layout backup from before installation.
Removing preferences or cached images is not required to disable Kolczyk.

## Development checks

Development tests require Node.js 24 and helper dependencies. First run
`npm ci --prefix mods/kolczyk/node-helper`, then run from the repository root:

```powershell
npm test
powershell.exe -NoProfile -File scripts/check.ps1
```

Tests cover the model and picker interactions, asynchronous folder changes,
image discovery/import, reset isolation and failed-install rollback. Native
checks eagerly render the sidebar, menu, all six picker modes and both
additional icon libraries. These checks do not replace visual and interaction
checks in the app. See [verification notes](verification.md) for recorded
evidence and its boundaries.

## Sources and licenses

Kolczyk follows the [T3code picker](https://github.com/pingdotgg/t3code/blob/main/apps/web/src/components/settings/ProjectIconPickerDialog.tsx)
and its [favicon resolver](https://github.com/pingdotgg/t3code/blob/main/apps/server/src/project/ProjectFaviconResolver.ts).

- [Lucide Static 1.66.0](https://www.npmjs.com/package/lucide-static/v/1.66.0)
  uses ISC; see [`LUCIDE-LICENSE`](../mods/kolczyk/LUCIDE-LICENSE).
- Feather 4.29.2 uses MIT; see
  [`FEATHER-LICENSE`](../mods/kolczyk/FEATHER-LICENSE).
- The official Hugeicons Free repository snapshot from 2026-11-02 uses MIT;
  see [`HUGEICONS-LICENSE`](../mods/kolczyk/HUGEICONS-LICENSE).

Categories are bundled snapshots from 2026-11-02: official Lucide metadata with
resolved `$extends` inheritance, and the public Hugeicons index at
`https://hugeicons.com/api/icons`, used by its official MCP server. Feather uses
categories mapped from matching Lucide names, with Other for unmatched icons;
this is not a separate official Feather taxonomy. No metadata is downloaded at
runtime. The development generator is [`scripts/build-metadata.mjs`](../scripts/build-metadata.mjs).
