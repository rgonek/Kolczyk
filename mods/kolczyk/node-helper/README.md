# Optional Kolczyk asset helper

This package enables local **Automatic** favicon discovery and **Image** import.
The base Herdr mod does not require it. It runs as a separate Node process,
outside Herdr's home-directory-only filesystem sandbox.

## Setup

Install Node.js 22 or newer, with `node` on Herdr's PATH. In this folder in the
**installed mod** (`~/.config/herdr-app/mods/kolczyk/node-helper`, or the equivalent
under your custom Herdr app home), run:

```sh
npm ci --omit=dev
```

Close the picker while installing. Reopen it or choose **Check again** afterward.
If Node was installed while Herdr was running, restart Herdr so it picks up PATH.
Installing only Node is insufficient; this package's dependencies must be present.
Do not copy `node_modules` between operating systems or CPU architectures:
sharp installs the matching native decoder. Install on each target machine.

The runtime helper performs no network requests. npm requires network access
during setup. There is no automatic installation or download from inside the mod.

## Without the helper

- Icons, Emoji, Monogram, Default Herdr, colors, backgrounds and Adjust work.
- Automatic/Image display setup instructions. Automatic cannot be newly saved
  while the helper is unavailable. Existing Automatic icons fall back to initials.
- Already imported image files still display; importing new files needs the helper.

## Contract and limits

```text
node main.mjs Scan|Discover|Import <project-or-file-path> <herdr-app-home>
```

Returns one JSON object on stdout. Errors go to stderr; exit 78 means missing
helper dependencies. Discovery is local-only, bounded, and rejects project
symlinks and path traversal. Import accepts at most 2 MiB, validates SVG structure
and local-only references, decodes raster inputs with dimension limits, and
writes content-addressed assets outside `mods/`.

ICO support includes PNG entries and uncompressed 24/32-bit DIB entries.
Indexed/compressed DIB entries are skipped or rejected. Unsupported automatic
candidates are skipped in favor of later candidates, then initials.

Dependencies retain their own licenses: sharp (Apache-2.0, with its bundled
native library notices), fast-xml-parser (MIT), and bmp-js (MIT). npm includes
their license files in the installed packages. They are optional dependencies
of this helper, not required dependencies of the native Herdr UI.
