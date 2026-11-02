# Optional Node asset helper

The base mod must run with Herdr alone on Windows, Linux and macOS. Only local
Automatic discovery and Image import depend on an explicitly installed optional
Node package. No runtime PowerShell, shell command strings, automatic downloads
or required Node installation. Existing saved icons and manual modes remain usable.

1. Replace the PowerShell asset helper with a Node CLI package under
   `mods/kolczyk/node-helper`, retaining the Scan/Discover/Import JSON contract.
   Use sharp for bounded raster decoding and fast-xml-parser for structural SVG
   validation; provide explicit handling for PNG-backed and common DIB ICO files.
2. Detect unavailable Node/package through the helper contract. Explain the
   optional installation inside Automatic/Image; keep other modes functional.
3. Port filesystem tests to the real Node helper; retain asynchronous ownership
   regression tests and add missing-helper coverage.
4. Document installation with an agent using Herdr files on every platform.
   Keep PowerShell scripts only as optional Windows developer/installation tools.
5. Run tests, eager native checks and installed native acceptance. Linux/macOS
   native acceptance remains pending unless those systems are available.
