# Kolczyk folders and icons

## Spaces sidebar

Kolczyk starts with zero folders. A folder button beside New Space creates an empty folder. The space context menu offers Move to folder, with existing folders and an option to create a folder and move the space in one action. A space can also be dragged onto an existing folder. Clicking its header toggles it open or closed.

The folder context menu supports renaming, changing its icon and color, and removing the folder. Removing a folder returns its spaces to the ungrouped list. Start with a single level of folders within each machine's section. Keep the current repository and worktree rows together when their parent space moves. Persist membership, appearance and folding across restarts. The folder icon picker opens on folder variants and defaults to the plain folder glyph.

The Spaces header menu has a persistent Show New Folder button setting, enabled by default. Turning it off hides the header button. The header menu remains available to turn it back on, and Move to folder stays available on space rows.

## Worktree icons

Use the parent space that owns the worktree row in the current sidebar. A worktree without its own icon resolves the parent's effective appearance whenever rendered. A different appearance saved explicitly for a worktree takes precedence on future renders, including after parent edits. Use parent icon clears the override. Preserve existing explicit worktree preferences on upgrade. A worktree with no available parent falls back to its own automatic appearance.

## Editor and colors

Remember the last saved symbol color, background and shape as defaults for an unconfigured space. An existing space opens with its saved appearance and an inheriting worktree opens with its effective parent appearance. Cancel leaves saved preferences intact.

Store palette selections by identity so each swatch can resolve to a suitable shade in the active theme. Keep existing saved HEX values and manually entered HEX values literal. Evaluate palette contrast on light and dark sidebar surfaces and verify the picker preview and folder tile in both themes.

## Approaches

Space Groups makes folder creation and assignment available from the space context menu. Crest adds a visible folder button by New Space. Use both entry points, as agreed, so users can discover creation and group a particular space in one flow. Use manual membership. Automatic grouping by repository owner would populate folders on first use, and grouping by path would make membership follow checkout locations.

Verify fresh installation, folder creation and removal, worktree inheritance and overrides, retained editor defaults, and switching themes with the same palette selection. Run the repository tests and Herdr's native mod check and exercise the flows in the running app.
