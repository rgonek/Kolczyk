# Publishing Kolczyk

This repository is prepared for the [Herdr mod directory](https://herdr.dev/mods/).
Publishing requires making the GitHub repository public; preparing these files
does not publish the mod.

## Directory package

Keep these files together at the repository root:

```text
README.md
RECIPE.md
preview.png
LICENSE
NOTICE
mods/kolczyk/
scripts/
docs/
```

There must be no root `layouts/` folder. Kolczyk installs into an existing
personal layout; it does not ship a replacement layout. No keybinding snippet
is required.

## GitHub presentation

Suggested description:

> Native space icons for Herdr: project favicons, icon libraries, emoji, monograms and images.

Topics: `herdr-mod`, `herdr`, `gpui`, `customization`, `icons`, `windows`.
The `herdr-mod` topic is required for directory discovery.

Use `preview.png` as the repository social preview. It is a presentation of a
real native picker screenshot, with editorial text beside it. The uncomposed
screenshots are in `docs/images/`. Regenerate the presentation image with:

```powershell
powershell.exe -NoProfile -File scripts/create-preview.ps1
```

## Before publishing

1. Run `npm test` and `powershell.exe -NoProfile -File scripts/check.ps1`.
2. Review the README, recipe, licenses and screenshots. Keep `.tmp/` and local
   Herdr state out of Git; the screenshots contain only the picker.
3. Commit the prepared files and push the intended branch to GitHub.
4. With the owner's explicit approval, make the repository public and apply the
   description and topics above. Check that the default branch contains the
   package, rather than only a feature branch.
5. Open the public repository without signing in and check the README image and
   installation instructions.

Herdr says public repositories with the topic appear under Community within
an hour. Community images are screened separately; directory and image visibility
must be checked after publication. Herdr does not review community mods.

## Updating the screenshots

Capture the running native picker with `herdr-app shot`. Crop tightly around
the dialog before placing screenshots in `docs/images/`; exclude terminals,
project paths and unrelated spaces. Use a draft appearance and cancel afterward
so presentation work does not change the user's saved icon. Keep the screenshot
and README aligned with the shipped behavior.
