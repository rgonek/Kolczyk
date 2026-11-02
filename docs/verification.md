# Kolczyk verification — 2026-11-02

Implemented on branch `feat/kolczyk`.

## Automated evidence

- `npm test`: 20 tests passed (model, picker interactions, async folder/import
  races, favicon precedence and safe paths, PNG/ICO conversion, transactional
  installer rollback).
- `powershell.exe -NoProfile -File scripts/check.ps1`: native checks passed
  for Automatic, Lucide, emoji, monogram, image, menu and sidebar as eager views.
- `git diff --check`: no whitespace errors.
- Independent read-only review found two P2 issues (stale Automatic initials
  and folder changes while the picker is open). Both were reproduced in failing
  tests and fixed; the reviewer verified the fixes and reported no blocker.
  An additional import-completion race was also reproduced and fixed.

## Running application

- Installed `kolczyk` in the existing personal `custom` layout, replacing only
  the spaces block's mod. Existing agents-icons, tabs-icons and other layout
  nodes were preserved. Original layout backup:
  `~/.config/herdr-app/backups/kolczyk/20261102-093833-273/custom.json`.
- Opened the actual dialog; inspected screenshots of Automatic, Lucide, emoji,
  image and the native context menu. All 2292 Lucide assets are local.
- Used native clicks to Save a sheep emoji with an arbitrary `#2563eb`
  circular background. Reopened and checked persisted `shared.json` values.
- Selected a different emoji, pressed Cancel and confirmed the saved sheep
  remained unchanged. Right-click showed Change icon with stock menu actions.
- Imported a local SVG into the actual Image mode and saw the rocket rendered
  over the same circular background. Discarded that draft. Native testing
  exposed that caches inside a mod folder trigger hot reload; cache now lives
  under `assets/kolczyk/`, outside `mods/`. Repeated import retained the draft.
- `herdr-app status`: no app errors after native testing.
- `preview.png` is a crop of the actual dialog screenshot.

## Boundaries

Windows/local favicon discovery and local image import only. Manual choices
work for remote spaces; remote image discovery is explicitly unavailable.
Reopening and on-disk persistence were verified; a full application restart was
not performed. No push or publication was performed.

## User screenshot follow-up

- Corrected emoji sizing/baseline with explicit pixel line height and safe margins.
- Removed redundant mod branding; dialog height now adapts by mode (480–740px).
- Catalogue tiles share the actual background/shape preview; white icons remain
  visible. Added Popular / All browsing and pages without requiring a search.
- Added licensed offline Feather (287) and Hugeicons Free (6144) alongside Lucide.
  Existing choices default to Lucide when their saved record has no library field.
- Added three regression tests (23 tests total). Native eager checks now cover
  nine views, including both new libraries. Inspected running-app screenshots
  of the compact emoji dialog and Hugeicons All with white icons on blue tiles.
- Independent follow-up review: no blocker, 23/23 tests passed.

## Emoji adjustment follow-up

- Added Adjust native Popover with directional arrows, live X/Y and Reset,
  clamped to ±8 sidebar pixels. Larger avatars scale the same correction.
- Offsets are stored per emoji per space and deep-cloned into drafts.
- Two new regression tests cover scaling, glyph isolation, draft isolation,
  validation, move/reset and Save/Cancel (25 total tests).
- Native clicks opened Adjust and pressed right/down: both the dialog and
  popover updated to X: 1, Y: 1 with live preview. The test draft was discarded.
- Independent focused review: no blocker, 19/19 model/UI tests passed.

## Controls, category and color follow-up

- Connected native Button/RadioGroup choices, 11 columns / 66 icons per page.
- Universal Adjust beside the main preview: XY and scale 50–150%, background
  unchanged. Legacy emoji offsets remain readable; maps are cloned into drafts.
- Inline monogram/emoji/color validation instead of a detached red footer.
- Bundled categories from Lucide metadata and official Hugeicons public index;
  resolved Lucide `$extends:` inheritance, mapped Feather names and retained
  Other for unmatched names. No runtime metadata requests.
- Visual HSV picker: native gradient paths plus native hue Slider, with HEX and
  presets retained. Actual clicks changed the draft color to green `#43ad3c`.
- Native category click selected Arrows and rendered three pages of matching
  icons. Native Adjust plus changed a Lucide symbol to 105%, with its background
  unchanged. Test drafts were discarded.
- Latest verification: 34 tests total and all nine native views. Focused tests
  cover metadata coverage/inheritance, HSV math, category/search composition,
  transform limits, draft isolation and inline validation.
- A new independent review could not run because the reviewer hit the account
  usage limit. This follow-up was reviewed in-session and verified as above.

## Image mode clipping fix

Reproduced the partially hidden Shape row in the running Image dialog. The
body could scroll to it but was too short initially. Image now reserves 440px,
plus 24px for the imported-image status. Header, image list, Shape and footer
cannot shrink. Native checks passed for all nine views; 17 picker interaction
tests passed. This was a layout-only change; the full suite was not rerun.

## Default Herdr reset

Added an explicit Default Herdr choice, distinct from Automatic. Save replaces
only the chosen space's preferences with `{kind: "herdr"}`, removing the icon,
background and adjustment payload. Rendering matches the shipped spaces mod:
18px single-initial tile using `space.colors`, compact number, and branch-only
worktree marker. Picker controls for custom backgrounds/adjustments are hidden.
Cancel preserves previous settings. Verification: 37 tests and ten native views
passed, including reset isolation, invalid-custom-state recovery and stock markers.

## Immediate sidebar refresh

Reproduced stale icons with a regression test modeling GPUI's retained child
cache. The root now renders Spaces directly instead of returning a cached child;
picker/menu overlays keep their existing retained views. A shared-state update
therefore rebuilds the sidebar immediately, without timers or a global refresh.
The regression failed before the change and passed afterward. Full verification:
38 tests, ten native view checks and an installed root check passed. Native Save
changed the sidebar from robot to sheep with the pointer left at Save, outside
the sidebar. The original robot preference was restored after testing.

## Independent review follow-up fixes

Resolved all three P2 findings: mode-specific foreground validation with partial
draft preview recovery; request/folder ownership for both import results and
failures; structural self-contained SVG validation, including CSS references.

UX changes: named keyboard-operable grids/swatches/image rows, hover labels,
keyboard hue/saturation/brightness controls, real sidebar-size samples, native
viewport height cap, luminance-based contrast backing, lazy validated thumbnails
and source identity, and category-aware result labels. Thumbnail imports are
bounded to twelve per dialog. Automatic sidebar discovery uses a lightweight
Discover helper action instead of enumerating image candidates.

Integrated verification: 52 tests passed, all ten native routes passed, installed
root check passed and app status had no errors. The running dialog screenshot
confirmed the new size samples and normal controls. Full screen-reader and
alternate-DPI acceptance were not performed. No optional feature proposals were
implemented. Layout integration remains a single spaces-block replacement.

## Publication preparation

The canonical source now lives at `mods/kolczyk`, beside root `RECIPE.md` and
`preview.png`, matching the Herdr directory package convention. Installation,
checks, tests and metadata generation use the new source path.

After the move, all 52 tests and ten native view checks passed. Local Markdown
links in eight documents and the required package structure were checked.
The presentation image and cropped screenshots were visually inspected; they
contain real native UI without terminal content. Marketing drafts were discarded.
README, usage and publication instructions are in English. Apache 2.0 licensing,
Herdr attribution and the three bundled icon licenses are included.

The GitHub repository remained private during preparation. No push, visibility
change or directory listing was performed. Public installation and directory
discovery still require verification after publication.

## Dialog scrolling follow-up

Moved sidebar-size samples into Adjust so they no longer occupy a row in the
main form. Increased the monogram content allowance and sized icon browsing
for its visible rows and pagination, while retaining the native viewport cap.
Form sections do not shrink inside the scroll container. At the current window
size, native monogram and emoji forms show colors and shapes without scrolling;
Adjust displays both samples. Small windows retain scrolling and a fixed footer.
All 52 tests, ten native routes and the installed root check passed. Publication
screenshots were refreshed and the visual-test drafts were canceled.

## Optional Node asset helper

Removed the runtime PowerShell helper. The native UI has no external runtime
requirement; only Automatic discovery and new Image imports use an explicitly
installed Node 22+ package. The package includes sharp, fast-xml-parser and
bmp-js with a lockfile. Missing Node or package dependencies leave manual modes
available and show setup instructions. Existing imported images still render.

Verification: 56 tests passed, including the real Node CLI, PNG/DIB ICO and BMP
conversion, traversal/symlink rejection, oversized files, SVG references,
missing package exit 78, and missing-Node picker behavior. All ten eager native
routes and the installed root check passed. npm audit reported no known
vulnerabilities for the helper dependencies at the time of this check.

A temporary native acceptance mod exercised the actual Herdr exec bridge:
without installed dependencies it returned available=false; after installation
it discovered a project favicon outside the home directory, imported it and
rendered the cached SVG. The acceptance overlay was closed and its mod removed.
The installed Kolczyk now includes the optional helper package for local use.
Linux/macOS native acceptance has not been performed. PowerShell scripts remain
optional Windows installation/development tools, not runtime requirements.
