# Imperialism — Ink and wash static asset pack

Approved static artwork, exported 2026-11-13. 154 PNG/SVG assets.

1. Extract the ZIP completely.
2. Open public/assets/ink-and-wash/index.html in a browser to inspect the assets. It works offline without installation.
3. Open terrain-demo.html in the same folder for connected terrain, shoreline, rail and red attack/green transport arrows.
4. Give Claude CLAUDE_HANDOFF.md and this extracted folder or ZIP.

Copy public/assets/ink-and-wash into the target project's public/assets directory, preserving filenames. This is artwork and standalone preview code; gameplay integration and animations are not included.

manifest.json uses paths relative to its own folder and includes dimensions and SHA-256 hashes. ASSET_INVENTORY.md lists the files. SHA256SUMS.txt verifies the full export. scripts/sync-ink-assets.cjs refreshes image revisions after future edits (Node.js required only for this maintenance utility).
