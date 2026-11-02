# Independent review of Kolczyk

Date: 2026-11-02. Scope: the complete current working tree on `feat/kolczyk`, including untracked implementation, tests, installer, asset helper and documentation. This was a clean-context review; no earlier implementation discussion was supplied. No product code was changed.

## Assessment

The core picker is coherent and its normal draft workflow works in the running native app. It preserves the original sidebar structure, uses local assets and merges the selected space into fresh preference state. The current automated suite passes. Three reproducible issues remain: a hidden invalid foreground can block unrelated modes, an obsolete import failure can disable a newer selection, and SVG import does not enforce its self-contained-image promise. None demonstrated loss of an existing saved preference.

Severity: P2 means an ordinary workflow is broken or an explicit asset contract is violated; P3 means a smaller usability issue. Findings below distinguish desktop reproduction from isolated runtime/helper reproduction.

## Verified bugs

### P2 — Invalid symbol color becomes an invisible blocker after changing mode

Locations: `mods/kolczyk/model.js:37`, `model.js:52`, `picker.js:320`, `picker.js:327`.

Desktop reproduction:

1. Open the picker and choose Icons.
2. Replace Symbol color HEX with `qq`.
3. Choose Emoji.

Observed: the foreground field and its validation message disappear, Save icon remains disabled with no explanation, the main preview becomes the automatic monogram, and every emoji tile becomes a question-mark fallback. A valid emoji cannot be saved until the user finds and fixes a field in another mode. Image has the same hidden foreground dependency by source inspection. Validation checks `color` for all custom kinds, while the editor only renders it for Icons, Monogram and Automatic; `appearance()` replaces the entire draft on any validation failure.

Suggested fix: validate only fields needed by the selected appearance, or retain a visible explanation and route back to the invalid field. Render valid parts of an incomplete draft instead of replacing every candidate with Automatic. Add a mode-switch test that starts with an invalid foreground.

Evidence: `D:/temp/kolczyk-hidden-invalid-later.png`. Cancel discarded the draft.

### P2 — A superseded image-import failure poisons a newer valid selection

Locations: `mods/kolczyk/picker.js:93`, `picker.js:94`, `picker.js:146`, `picker.js:307`, `picker.js:327`.

Reproduction in the existing mocked native runtime:

1. Start an Image import and hold its asynchronous result pending.
2. Switch to Emoji, invalidating `importRequest`.
3. Reject the pending import.

Observed result: `{ "kind": "emoji", "error": "old image import failed", "saveDisabled": [true] }`. The successful completion path checks request, current kind and folder, but the catch path unconditionally installs the old error. `render()` treats any error as a Save blocker. Waiting for the operation to finish therefore does not restore saving; selecting another emoji tile also does not clear the error.

Suggested fix: apply the same ownership check to error publication as to result publication, and separate transient import errors from current draft validity. This was verified with `tests/runtime.js` and a deferred rejected `exec`; no new test or product file was added. A slow failed import was not forced in the desktop app.

### P2 — SVG files with relative external dependencies pass import

Locations: `mods/kolczyk/assets.ps1:22`, `assets.ps1:28`, `assets.ps1:47`.

Helper reproduction: import an SVG containing `<image href="./photo.png" width="22" height="22"/>` under an SVG root. The helper returns a successful `assets/kolczyk/<hash>.svg` path and copies the SVG alone. It rejects HTTP/file/protocol-relative href values, but accepts relative external resources. The referenced file is neither embedded nor copied, so the cached asset is not self-contained and can lose its appearance after relocation. The README explicitly promises self-contained SVGs and durable manual images.

Suggested fix: inspect XML attributes and reject non-fragment external references, allowing explicitly supported embedded data only if the renderer supports it. Handle CSS resource references consistently. Prefer structural validation over extending a blacklist of URL prefixes. Verification used a disposable temporary app home; the personal cache was untouched. Actual renderer handling of the broken dependency was not measured, and this finding does not claim script execution or network access.

## Code and design observations — judgment calls

- **Keyboard and accessibility coverage is incomplete.** Icon and emoji tiles, color swatches, project-image rows and the saturation/value field are plain clickable elements without tab stops, accessible names or keyboard selection handlers (`picker.js:126`, `picker.js:162`, `picker.js:197`, `picker.js:279`; `controls.js:47`). Native Button/Radio controls improve the surrounding form, but do not make those custom hit targets keyboard reachable. The local API explicitly supports `tab_index`, roles and `accessibility_label`. Add roving focus and arrow/Enter selection to the grids, named swatches, and a keyboard alternative to the color field. This is source-grounded; a full keyboard-only and screen-reader acceptance pass remains outstanding.
- **Automatic refresh does unnecessary project enumeration.** `spaces.js:210` calls `projectAssets()`, whose Scan also builds up to 200 image candidates (`assets.ps1:101`). An automatic favicon refresh only needs the favicon result. A separate lightweight discovery action would avoid repeating bounded but potentially expensive image-list traversal for every automatic space each minute. No production latency threshold was measured.
- **The render path repeats expensive-looking work.** `spaceAvatar()` reads/copies all panes for each row (`spaces.js:233`), while catalogue rendering repeatedly validates and clones appearance data for each tile. This may be fine at the current scale; profile before adding memoization. Pass one panes snapshot through the sidebar render if measurements justify it.
- **Upgrade ownership is permissive.** `scripts/install.ps1:21` treats any truthy `kolczyk_version` as ownership, then copies over an existing installation without removing obsolete files. Backups and rollback are good safeguards, but manually modified personal copies can be overwritten. Document this update policy and consider a recognizable manifest/checksum before expanding the installer. This is a policy concern, not a demonstrated failed install.
- **Reproducibility of metadata generation could improve.** `scripts/build-metadata.mjs` depends on manually prepared `.tmp` inputs and embeds a fixed snapshot date. Record source commits/hashes and acquisition commands in a reproducible generation manifest. Runtime offline behavior is appropriate.

## UX/UI suggestions

1. **Prioritize discoverability of validation and selection.** Keep the actual error visible when Save is disabled, and distinguish incomplete input from a missing icon. Avoid silently substituting the entire appearance during color editing.
2. **Name catalogue tiles on hover and for assistive technology.** The selected name alone is not enough to distinguish similar glyphs. A tooltip plus an accessible name has high value and small scope.
3. **Preview the real sidebar sizes beside the large preview.** Expanded and compact samples would make ±1 px adjustments and 50–150% scaling easier to judge before saving.
4. **Keep the dialog comfortable on smaller windows.** The 740 px Icons height is fixed (`picker.js:308`); validate a smaller effective viewport and larger app zoom. Cap height against available bounds while retaining a fixed footer. The current 1478 × 1409 capture fits correctly; smaller-window clipping was not established.
5. **Use luminance for catalogue contrast backing.** The current red-channel threshold (`picker.js:169`) is only a rough proxy for brightness. Prefer measured contrast against the actual theme/background and test light cyan, yellow and gray.
6. **Show image thumbnails and the selected file identity.** The current list exposes paths; after import, the generic ready message does not identify the source. Thumbnails would improve confidence but should be lazy/bounded.
7. **Clarify category status.** With a category active, the browsing hint still says All icons or Popular icons. Show category name and result count consistently.

## Optional feature ideas

| Idea | Value | Relative effort |
| --- | --- | --- |
| Recent icons and favorites across libraries | Faster repeat selection from a large catalogue | Small–medium |
| Copy appearance from another space | Consistent project families without repeating colors and adjustments | Medium |
| Lightweight named presets | Reuse a symbol/background/shape combination across spaces | Medium |
| Export/import preferences with bundled image assets | Move a deliberate setup to another computer | Medium–large; requires space identity mapping |
| Opt-in cache cleanup with a dry-run list | Prevent indefinite accumulation of imported and refreshed assets | Medium; account for disconnected-space references |

These are proposals, not missing requirements. Stabilizing the three verified issues and keyboard access has higher priority than expanding the catalogue or adding more adjustment controls.

## Verification performed

- Read the authoritative installed `AGENTS.md`, README, recipe, design specification, source modules, helper, installer, metadata generation and tests; inspected relevant local API declarations. Reviewed generated metadata through its generator and consistency test, without manually scanning thousands of vendored SVGs.
- Confirmed working-tree status: most implementation is untracked; a HEAD diff alone would omit it. Source JavaScript/PowerShell/JSON files present in the installed mod matched repository counterparts by SHA-256 comparison.
- `npm test`: **38 passed, 0 failed**. This includes real temporary-file PowerShell asset checks, model tests, mocked picker interactions and failed-install rollback.
- `powershell.exe -NoProfile -File scripts/check.ps1`: **all 10 native routes passed on the isolated rerun**. An earlier run concurrent with the tests stopped at Hugeicons with QuickJS `interrupted`; the complete standalone rerun passed. Treat that as a transient check robustness observation, not an established Hugeicons defect.
- In the running personal `custom` layout: opened picker via `kolczyk.icon`, inspected normal Emoji/Icons states, reproduced the hidden foreground failure, cancelled, opened the actual space context menu, used Down/Enter to open Change icon, and dismissed the picker with Escape. The original robot icon remained on reopening. `herdr-app status` finished with no overlays and no errors.
- Isolated deferred-import reproduction confirmed the obsolete-error bug. Disposable PowerShell import confirmed relative-resource SVG acceptance.
- No Save was performed in the real application. No preferences, personal layout, shipped mod, repository product code, commit, merge or publication was changed.

## Important limits

Saved persistence, immediate retained-sidebar repaint after Save and restart persistence were covered by source/tests, not independently exercised through a real save in this review. A restart was prohibited and was not attempted. Remote connectivity, actual remote-machine UI, drag reordering, file-drop delivery, very small windows, alternate DPI/theme configurations and screen readers were not exercised end-to-end. Installer success/update/uninstall was read and its failure rollback tested; the personal installation was not replaced. Native eager checks validate descriptions, not complete layout or later async states; mocked tests do not establish native focus or scrolling behavior.
