# Kolczyk

Latest user follow-up: 11-column grids; connected native button groups; thematic
category browsing; inline field validation; visual color picker; universal Adjust
by the main preview with position and size. Preserve previous emoji offsets.

Follow-up requested 2026-11-02: center and safely fit emoji within backgrounds;
remove redundant mod-name branding; reduce dialog whitespace; preview catalogue
icons on the chosen background so white remains visible; add explicit Popular /
All browsing and Feather / Hugeicons Free packs. Preserve existing saved choices.

Approved scope: a Herdr space icon picker, matching T3code's icon, emoji,
monogram, image and Automatic choices. Automatic discovers the local project's
favicon and falls back to a monogram. Every type supports an optional background
with an independent color and circle, square or rounded-square shape. Lucide
and monograms also have a foreground color. Preview is a draft; Cancel/Escape
must not save. Save persists by machine-qualified space ID.

## Approach

Use one personal mod, `kolczyk`, cloned from the shipped spaces mod. Route its
sidebar, context menu and picker through props. Preserve the shipped space
navigation, worktree grouping, dragging and menu actions. Use a bundled Lucide
catalogue, with popular icons initially and search across the full catalogue.
Store choices in `kolczyk.spaces`; retain unavailable remote space entries.
Keep user choices separate from discovered favicon cache and current folders.

Editing shipped files is forbidden by Herdr. A separate panel would not change
the existing sidebar icons, so neither is a useful alternative. Install into
the current personal `custom` layout by replacing only the `spaces` block's mod.

Implementation choices: native GPUI JavaScript; Windows PowerShell helper for
local image discovery/import into Herdr's asset directory; no runtime network
requests. Read only bounded project metadata and known icon locations; never
modify project files. Offer project images, an explicit local path and file
drop. Remote spaces retain all manual choices; local favicon discovery is
unavailable for remote files (show this explicitly rather than opening the
same path on this computer).

## Automatic discovery

Use T3code's precedence: explicit `t3.json` iconPath, icons referenced in known
HTML/router metadata files, then known favicon/icon/logo locations. Resolve
from the live checkout's git root when possible, otherwise its current folder.
Only local filesystem icons: no fetching website URLs or guessing domains from
repository names. Copy valid images into a content-addressed cache so project
file removal cannot break a saved manual image. Refresh automatically on folder
changes and periodically while active; provide an explicit refresh action.

## Validation

Test draft isolation, validation of monograms/emoji/colors, automatic fallback,
candidate precedence and safe paths, image copying, and expanded/compact space
behavior. Run `herdr-app check`, then open the actual picker and inspect a
window screenshot. Preserve the user's existing layout and other mods.

## Sources inspected

- https://github.com/pingdotgg/t3code/blob/main/apps/web/src/components/settings/ProjectIconPickerDialog.tsx
- https://github.com/pingdotgg/t3code/blob/main/apps/web/src/projectIconOptions.ts
- https://github.com/pingdotgg/t3code/blob/main/apps/server/src/project/ProjectFaviconResolver.ts
- https://github.com/pingdotgg/t3code/blob/main/docs/user/project-settings.md
- Installed Herdr 0.1.9 `AGENTS.md`, `herdr.d.ts`, spaces and menu mods.
