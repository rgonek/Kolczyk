# Kolczyk folders and icons implementation plan

> Use superpowers:executing-plans for inline execution or superpowers:subagent-driven-development for delegated execution.

**Goal** Add opt-in folders, live worktree icon inheritance, and reusable icon styles with a theme-aware palette.

**Architecture** Keep folder membership and editor preferences in Kolczyk's shared state. Resolve icon inheritance using the same parent relationship as the sidebar. Resolve named swatches at render time.

**Tech stack** Herdr shared state, GPUI native views, JavaScript, Node test runner.

**Spec** [Kolczyk folders and icons](../specs/2026-11-19-kolczyk-folders-and-icons-design.md).

## Global constraints

- Zero folders on first launch. Preserve the active layout and use existing native components.
- Preserve existing explicit icon preferences and literal HEX values.
- Maintain checkout and worktree grouping under machine sections.

## Review focus

- Moving a main space with several worktrees keeps the complete group together.
- A missing main checkout leaves the worktree usable and preserves its explicit preference.
- Saving from an open overlay merges the latest shared state.
- Hiding the folder button leaves both the header menu and context-menu creation accessible.
- Custom HEX and named swatches stay distinct across theme changes.

## 1. Resolve worktree appearance

- [ ] Add regressions in `tests/ui.test.js` for initial inheritance, parent edits, a worktree override, clearing the override and parent disappearance.
- [ ] Add `parentSpaceId` to sidebar rows in `mods/kolczyk/spaces.js`, using the existing repository grouping. Route both sidebar variants and picker entry points through the same parent lookup.
- [ ] In `mods/kolczyk/picker.js`, use the effective appearance as the inherited worktree draft and expose Use parent icon. Remove the worktree override when the user explicitly restores inheritance. Write overrides against the latest shared state.
- [ ] Run `node --test tests/ui.test.js tests/model.test.js`.

## 2. Persist and render folders

- [ ] Cover empty state, creating with and without membership, machine scoping, moving a main space with worktrees, folding, deleting and hiding then restoring the header button in the sidebar tests.
- [ ] Add `mods/kolczyk/folders.js` with `groupRows(rows, folders, membership, machine)` returning ordered folder groups and ungrouped rows. Look up membership by the parent space ID for a worktree.
- [ ] Add persisted folder records, membership and the default-enabled header button setting in `spaces.js`. Render foldable headers, route row context menus to the folder chooser and make existing folder headers accept space drops.
- [ ] Add modal routing in `main.js` for folder creation and assignment. Support renaming, removal and icon editing from the folder context menu. Keep Show New Folder button on the Spaces header context menu.
- [ ] Run `node --test tests/ui.test.js`.

## 3. Reuse styles and improve the palette

- [ ] Cover swatch rendering across themes, preservation of existing HEX values and saved per-space style, and fallback defaults when switching from space X to unsaved space Y.
- [ ] Add named swatches and theme resolution in `color.js`. Allow a stored swatch identifier or literal HEX in the model and resolve at the avatar and preview boundaries.
- [ ] In `picker.js`, store last-used symbol color, background and shape after a successful save. Apply them only when opening an unconfigured space. Reuse the color controls for folders and default the folder picker to folder glyphs.
- [ ] Run `node --test tests/color.test.js tests/model.test.js tests/ui.test.js`.

## 4. Verify in Herdr

- [ ] Run `npm test`, `herdr-app check mods/kolczyk` and `git diff --check`.
- [ ] Exercise both folder creation routes, the header setting, removal, drag and drop, inherited and overridden icons, saved style defaults, and swatch readability in light and dark themes in the running app.
