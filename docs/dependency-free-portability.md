# Dependency-free portability investigation

This records the investigation preceding the optional-helper design. The
implemented decision is now: the base mod needs only Herdr; Automatic and Image
use an explicitly installed optional Node package. PowerShell is no longer a
runtime requirement. See [the helper guide](../mods/kolczyk/node-helper/README.md).

## Verified host limitation

Herdr exposes `fs/promises`, `path`, `buffer`, `crypto` and `zlib` in its native
JavaScript runtime. These are built-ins; importing them does not require Node.js.
However, its filesystem policy grants read access only under the user's home
and write access under the app directory. The policy is shared by mods and
native checks and is hard-coded, rather than configured by `mod.json`.

Source: [Herdr src/mods.rs, capabilities and install_policy](https://github.com/herdrdev/herdr-app/blob/master/src/mods.rs).

A temporary native mod attempted to read this repository's README from a Windows
project drive outside the home directory. The running app rejected the read:
`is outside every granted read root; add its directory to capabilities.fs.read in the manifest`.
The generic error's manifest suggestion does not apply to Herdr's hard-coded
mod policy. The temporary probe was closed and removed from installed mods.

`herdr.readTextFile` offers text reads, not binary image reads or directory
enumeration. It cannot substitute for the helper's full contract.

## Host support needed for a fully dependency-free asset implementation

To preserve existing functionality for arbitrary project folders, Herdr needs
an explicit supported way to read project directories and binary files outside
the home directory, while retaining bounded filesystem access. Options include
granting access to local space folders or exposing host-managed project asset
discovery/import APIs. Image validation should retain byte/dimension limits,
self-contained SVG checks and protection against symlink escapes.

After that support exists, port discovery and import to built-in JavaScript,
preserve offline behavior and content-addressed caching, replace the required
PowerShell installer with agent-guided layout integration, and run native
acceptance on all three operating systems. ICO conversion and supported image
formats also need explicit native acceptance; simply copying bytes is not
equivalent to the current validated raster conversion.

Do not claim dependency-free portability until the outside-home project case,
manual image import and actual native rendering pass. Do not silently restrict
discovery to the home directory to make the claim.
