# Gallery preview

The cover must read on the [Herdr mod list](https://herdr.dev/gallery/?type=mods) at card size. Use Juhas's illustrated cover as the family reference. Keep a large dark serif wordmark and a short subtitle on pale sky. Run the mountain landscape across the entire canvas. Keep the ear-tagged sheep modest in size and fully visible, including its legs and hooves. A slight overlap in front of a screenshot is welcome when it leaves the controls and project names readable.

Show two native Herdr captures. The Spaces sidebar should have open, colored folders with fictional projects, recognizable icons and an indented worktree. The icon dialog should show the selected project, icon options and the color palette. Capture an isolated demo layout or feed sample data to the native view and crop to those panels. Exclude personal paths, terminals and live agent sessions from the exported crops. The current samples use Studio and Infrastructure, with Ledger API selected in both views.

Keep the source layers separate so a UI refresh can reuse the illustration.

- [Full landscape and sheep](images/gallery-landscape.png)
- [Native Spaces sidebar](images/gallery-spaces.png)
- [Native icon dialog](images/gallery-icon-picker.png)

Regenerate the 1586 × 992 cover on Windows with `pwsh -NoProfile -File scripts/create-preview.ps1`. Use `-Output <path>` to make a candidate before replacing the root `preview.png`.

Inspect the full-size cover and a 392px-wide reduction. At card size, the title, folder hierarchy, chosen project and colored icon controls should remain recognizable. Check that the whole sheep is visible and the landscape has a continuous edge. When comparing designs, show the candidates at the same card width before replacing the cover.
